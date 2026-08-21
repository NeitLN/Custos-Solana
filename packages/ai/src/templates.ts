import type { Facts } from "@custos/core";
import { REASON, dinhDangSo } from "@custos/core";

/**
 * CÂU MẪU CỨNG — bản dự phòng khi mô hình hỏng, quá hạn, hoặc mất mạng.
 *
 * Viết tay TRƯỚC khi động vào prompt (DAC-TA-L3.md mục 8): nó buộc phải nghĩ rõ
 * cần nói gì trước khi để mô hình nói hộ, và nó là thứ duy nhất còn chạy khi
 * mọi thứ khác hỏng.
 *
 * Nguyên tắc viết (DAC-TA-L3.md mục 1):
 *   - gọi tên HẬU QUẢ, không gọi tên cơ chế
 *   - số tiền đứng đầu câu
 *   - chắc thì nói "sẽ", là năng lực thì nói "có quyền", không biết thì nói thẳng
 *   - không dấu chấm than, không khuyên mua bán
 */

const rutGon = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

function decimalsCua(facts: Facts, mint: string): number {
  return facts.mints.find((m) => m.address === mint)?.decimals ?? 0;
}

/** Sinh câu cho một mã lý do. Trả về null nếu không dựng được câu có dữ liệu thật. */
function cauCho(ma: string, facts: Facts): string | null {
  const cuaToi = facts.tokenAccounts.filter((t) => t.ownerBefore === facts.signer);

  switch (ma) {
    case REASON.SET_AUTHORITY_ACCOUNT_OWNER: {
      const t = cuaToi.find((x) => x.ownerAfter !== null && x.ownerAfter !== facts.signer);
      if (!t) return null;
      return `Tài khoản ${rutGon(t.mint)} của bạn sẽ đổi chủ sang ví ${rutGon(t.ownerAfter!)}. Bạn sẽ không điều khiển được nó nữa.`;
    }

    case REASON.SET_AUTHORITY_CLOSE_OR_FREEZE: {
      const t = cuaToi.find((x) => x.closeAuthorityAfter && x.closeAuthorityAfter !== facts.signer);
      if (!t) return null;
      return `Ví ${rutGon(t.closeAuthorityAfter!)} sẽ được quyền đóng tài khoản ${rutGon(t.mint)} của bạn.`;
    }

    case REASON.APPROVE_DELEGATE_LON: {
      const t = cuaToi.find((x) => x.delegateAfter && x.delegateAfter !== facts.signer);
      if (!t) return null;
      const so = dinhDangSo(t.delegatedAmountAfter, decimalsCua(facts, t.mint));
      return `Ví ${rutGon(t.delegateAfter!)} sẽ được phép rút ${so} ${rutGon(t.mint)} của bạn, bất cứ lúc nào, kể cả nhiều tháng sau.`;
    }

    case REASON.SYSTEM_ASSIGN_DOI_OWNER: {
      const a = facts.accounts.find(
        (x) =>
          x.programOwnerBefore !== null &&
          x.programOwnerAfter !== null &&
          x.programOwnerBefore !== x.programOwnerAfter,
      );
      if (!a) return null;
      return `Một tài khoản của bạn sẽ chuyển sang thuộc quyền điều khiển của chương trình ${rutGon(a.programOwnerAfter!)}.`;
    }

    case REASON.MINT_AUTHORITY_CHUA_THU_HOI: {
      const m = facts.mints.find((x) => x.mintAuthority !== null);
      if (!m) return null;
      return `Người phát hành ${rutGon(m.address)} vẫn có thể tạo thêm token này không giới hạn.`;
    }

    case REASON.TOKEN2022_PERMANENT_DELEGATE: {
      const m = facts.mints.find((x) => x.permanentDelegate !== null);
      if (!m) return null;
      return `Bên phát hành ${rutGon(m.address)} giữ quyền rút token này khỏi ví bất kỳ, vĩnh viễn. Đây là tính năng hợp lệ, nhưng bạn nên biết.`;
    }

    case REASON.PROGRAM_CHUA_XAC_MINH:
      return "Giao dịch gọi một chương trình chúng tôi chưa xác minh. Chúng tôi không biết nó làm gì.";

    default:
      return null;
  }
}

/**
 * Ghép các câu mẫu thành một đoạn giải thích.
 *
 * KHÔNG chứa dòng "đã đọc hiểu N trên M lệnh" — dòng đó do giao diện sinh ra
 * trực tiếp từ `result.coverage`, để mô hình không bao giờ viết lại được nó.
 */
export function dienGiaiMau(facts: Facts, reasonCodes: string[]): string {
  const cau: string[] = [];
  for (const ma of reasonCodes) {
    const c = cauCho(ma, facts);
    if (c && !cau.includes(c)) cau.push(c);
  }

  if (cau.length === 0) {
    if (!facts.simulationOk) {
      return "Chúng tôi không chạy thử được giao dịch này, nên không biết nó sẽ làm gì.";
    }
    if (facts.coverage.analyzed < facts.coverage.total) {
      return "Chúng tôi chưa đọc hiểu hết giao dịch này.";
    }
    return "Không tìm thấy dấu hiệu nào trong danh sách chúng tôi kiểm tra được.";
  }

  return cau.join(" ");
}
