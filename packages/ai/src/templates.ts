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

    case REASON.OUTFLOW_KHONG_KHOP: {
      // Cộng theo từng loại token: khoản nào rời ví mà giao dịch không trả lại gì.
      const theoMint = new Map<string, bigint>();
      for (const t of facts.tokenAccounts) {
        if (t.ownerBefore !== facts.signer && t.ownerAfter !== facts.signer) continue;
        theoMint.set(t.mint, (theoMint.get(t.mint) ?? 0n) + (t.amountAfter - t.amountBefore));
      }
      const ra = [...theoMint.entries()].filter(([, d]) => d < 0n);
      if (ra.length === 0) return null;
      const ten = ra.map(([mint, d]) => `${dinhDangSo(-d, decimalsCua(facts, mint))} ${rutGon(mint)}`);
      return `${ten.join(" và ")} sẽ rời khỏi ví bạn, và giao dịch này không có phần nào trả lại.`;
    }

    case REASON.VI_NHAN_MOI_TAO: {
      const moi = Object.entries(facts.tuoiViNhan).find(([, tuoi]) => tuoi !== null && tuoi < 24);
      if (!moi) return null;
      const [vi, tuoi] = moi;
      return `Ví nhận ${rutGon(vi)} vừa được tạo cách đây ${(tuoi as number).toFixed(1)} giờ. Ví mới tinh nhận phần lớn tài sản là hình dạng quen thuộc của một vụ lừa.`;
    }

    case REASON.TRANSFER_NGOAI_HANH_DONG_CHINH: {
      const t = cuaToi.find((x) => x.amountAfter < x.amountBefore);
      if (!t) return null;
      const so = dinhDangSo(t.amountBefore - t.amountAfter, decimalsCua(facts, t.mint));
      return `Ngoài việc bạn định làm, giao dịch còn chuyển ${so} ${rutGon(t.mint)} ra khỏi ví bạn.`;
    }

    case REASON.TOKEN2022_TRANSFER_HOOK: {
      const m = facts.mints.find((x) => x.transferHookProgramId !== null);
      if (!m) return null;
      return `Mỗi lần ${rutGon(m.address)} được chuyển đi, một chương trình khác sẽ chạy theo. Đây là tính năng hợp lệ, nhưng chúng tôi chưa đọc hiểu chương trình đó.`;
    }

    case REASON.FREEZE_AUTHORITY_CON_HIEU_LUC: {
      const m = facts.mints.find((x) => x.freezeAuthority !== null && x.freezeAuthority !== facts.signer);
      if (!m) return null;
      // Cố ý nói rõ "nhiều token lớn cũng vậy". Nếu không, người dùng sẽ hiểu
      // đây là dấu hiệu lừa đảo và bỏ luôn một token hoàn toàn bình thường —
      // USDC có freeze authority. Cảnh báo doạ người là cảnh báo bị tắt.
      return `Bên phát hành ${rutGon(m.address)} có quyền đóng băng tài khoản của bạn, khiến bạn không chuyển được token này. Nhiều token lớn cũng vậy — đây là tính năng hợp lệ.`;
    }

    case REASON.PERMANENT_DELEGATE_RA_TAY: {
      const m = facts.mints.find(
        (x) =>
          x.permanentDelegate !== null &&
          facts.instructions.some((ix) => ix.decoded?.authority === x.permanentDelegate),
      );
      if (!m) return null;
      // Khác hẳn câu của TOKEN2022_PERMANENT_DELEGATE: chỗ kia nói token CÓ
      // quyền đó, chỗ này nói quyền đó ĐANG được dùng ngay trong giao dịch.
      return `Bên phát hành ${rutGon(m.address)} đang tự tay lấy token này ra khỏi tài khoản của bạn bằng quyền rút vĩnh viễn. Bạn không cần đồng ý và cũng không thu hồi được quyền đó.`;
    }

    case REASON.SOL_ROI_VI: {
      const d = facts.solDelta[facts.signer];
      if (d === undefined || d >= 0n) return null;
      const phi = facts.phiUocTinh ?? 0n;
      const di = -d - phi;
      if (di <= 0n) return null;
      return `${dinhDangSo(di, 9)} SOL sẽ rời khỏi ví bạn — phần lớn số SOL bạn đang có. Số này chưa tính phí mạng.`;
    }

    case REASON.NGUOI_DUNG_KHONG_RO: {
      const n = facts.nguoiKy?.length ?? 0;
      if (n <= 1) return null;
      // Không doạ. Đây là giới hạn của Custos, và người dùng có quyền biết.
      return `Giao dịch này cần ${n} chữ ký, và ví chưa cho biết địa chỉ nào là của bạn. Chúng tôi đang kiểm theo ví trả phí, nên có thể đang xem nhầm ví.`;
    }

    case REASON.TRANG_THAI_DO_KHUYET: {
      const n = facts.accountKhongDoDuoc?.length ?? 0;
      if (n === 0) return null;
      // Nói về GIỚI HẠN CỦA CHÚNG TÔI, không cáo buộc giao dịch. Người dùng cần
      // biết bảng chênh lệch phía trên có thể chưa kể hết chuyện.
      return `Giao dịch này chạm tới ${n} tài khoản mà chúng tôi không đọc được trạng thái sau khi ký, nên bảng thay đổi bên trên có thể còn thiếu.`;
    }

    case REASON.MO_PHONG_HONG:
      return "Chúng tôi không chạy thử được giao dịch này, nên không biết nó sẽ làm gì với ví của bạn.";

    case REASON.ALT_KHONG_GIAI_DUOC:
      return "Giao dịch dùng một bảng địa chỉ mà chúng tôi không đọc được, nên danh sách bên nhận có thể còn thiếu.";

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
