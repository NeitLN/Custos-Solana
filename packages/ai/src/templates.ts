import type { Facts } from "@custos-solana/core";
import { REASON, dinhDangSo, tinhSolNguoiDung } from "@custos-solana/core";
import type { Locale } from "@custos-solana/types";

/**
 * CÂU MẪU CỨNG — bản dự phòng khi mô hình hỏng, quá hạn, hoặc mất mạng.
 *
 * Viết tay TRƯỚC khi động vào prompt (docs/DAC-TA-L3.md mục 8): nó buộc phải nghĩ rõ
 * cần nói gì trước khi để mô hình nói hộ, và nó là thứ duy nhất còn chạy khi
 * mọi thứ khác hỏng.
 *
 * Nguyên tắc viết (docs/DAC-TA-L3.md mục 1):
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

    // Khác câu trên ở một điểm người dùng cảm nhận được: ở đó ta còn nêu được
    // "một chương trình", ở đây ta không xác định nổi lệnh đó đến từ đâu. Nói
    // đúng mức đó, không nói hơn — và không doạ.
    case REASON.CHUONG_TRINH_KHONG_RO:
      return (
        "Có một lệnh ghi vào tài khoản của bạn mà chúng tôi không xác định được " +
        "nó đến từ chương trình nào."
      );

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
      // Dùng CHUNG phép tính với luật 13 — nếu không, câu chữ sẽ nói một con số
      // còn engine gắn cờ theo một con số khác. Với wrapped SOL thì `solDelta`
      // của ví chỉ thấy tiền phí, nên tính riêng ở đây là ra 0 và mất luôn câu.
      const { roi } = tinhSolNguoiDung(facts);
      const phi = facts.phiUocTinh ?? 0n;
      const di = roi - phi;
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
      const m = facts.mintKhongDoc?.length ?? 0;
      if (n === 0 && m === 0) return null;
      // Nói về GIỚI HẠN CỦA CHÚNG TÔI, không cáo buộc giao dịch. Người dùng cần
      // biết bảng chênh lệch phía trên có thể chưa kể hết chuyện.
      const cau: string[] = [];
      if (n > 0) {
        cau.push(`Giao dịch này chạm tới ${n} tài khoản mà chúng tôi không đọc được trạng thái sau khi ký, nên bảng thay đổi bên trên có thể còn thiếu.`);
      }
      if (m > 0) {
        cau.push(`Chúng tôi không đọc được thông tin của ${m} loại token trong giao dịch này, nên số lượng đang hiện ở đơn vị gốc và các cảnh báo về token đó (đóng băng, phát hành thêm) có thể còn thiếu.`);
      }
      return cau.join(" ");
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
 * Bản tiếng Anh của `cauCho` (`locale: "en"`). Cùng điều kiện, cùng dữ liệu, cùng
 * nguyên tắc viết: hậu quả trước cơ chế, chắc thì "will", là năng lực thì "can",
 * không biết thì nói thẳng. Số viết theo kiểu en-US.
 *
 * Giữ song song với `cauCho`: mỗi nhánh ở đây ứng đúng một nhánh ở trên. Có test so
 * rằng mã nào sinh câu tiếng Việt thì cũng sinh câu tiếng Anh.
 */
function cauChoEn(ma: string, facts: Facts): string | null {
  const cuaToi = facts.tokenAccounts.filter((t) => t.ownerBefore === facts.signer);
  const so = (raw: bigint, dec: number) => dinhDangSo(raw, dec, "en");

  switch (ma) {
    case REASON.SET_AUTHORITY_ACCOUNT_OWNER: {
      const t = cuaToi.find((x) => x.ownerAfter !== null && x.ownerAfter !== facts.signer);
      if (!t) return null;
      return `Your ${rutGon(t.mint)} account will change owner to wallet ${rutGon(t.ownerAfter!)}. You will no longer control it.`;
    }

    case REASON.SET_AUTHORITY_CLOSE_OR_FREEZE: {
      const t = cuaToi.find((x) => x.closeAuthorityAfter && x.closeAuthorityAfter !== facts.signer);
      if (!t) return null;
      return `Wallet ${rutGon(t.closeAuthorityAfter!)} will get the right to close your ${rutGon(t.mint)} account.`;
    }

    case REASON.APPROVE_DELEGATE_LON: {
      const t = cuaToi.find((x) => x.delegateAfter && x.delegateAfter !== facts.signer);
      if (!t) return null;
      return `Wallet ${rutGon(t.delegateAfter!)} will be allowed to withdraw ${so(t.delegatedAmountAfter, decimalsCua(facts, t.mint))} ${rutGon(t.mint)} from you, at any time, even months from now.`;
    }

    case REASON.SYSTEM_ASSIGN_DOI_OWNER: {
      const a = facts.accounts.find(
        (x) =>
          x.programOwnerBefore !== null &&
          x.programOwnerAfter !== null &&
          x.programOwnerBefore !== x.programOwnerAfter,
      );
      if (!a) return null;
      return `One of your accounts will come under the control of program ${rutGon(a.programOwnerAfter!)}.`;
    }

    case REASON.MINT_AUTHORITY_CHUA_THU_HOI: {
      const m = facts.mints.find((x) => x.mintAuthority !== null);
      if (!m) return null;
      return `The issuer of ${rutGon(m.address)} can still mint unlimited amounts of this token.`;
    }

    case REASON.TOKEN2022_PERMANENT_DELEGATE: {
      const m = facts.mints.find((x) => x.permanentDelegate !== null);
      if (!m) return null;
      return `The issuer of ${rutGon(m.address)} holds a permanent right to withdraw this token from any wallet. This is a legitimate feature, but you should know.`;
    }

    case REASON.PROGRAM_CHUA_XAC_MINH:
      return "The transaction calls a program we have not verified. We do not know what it does.";

    case REASON.CHUONG_TRINH_KHONG_RO:
      return "An instruction writes to your account, and we could not determine which program it comes from.";

    case REASON.OUTFLOW_KHONG_KHOP: {
      const theoMint = new Map<string, bigint>();
      for (const t of facts.tokenAccounts) {
        if (t.ownerBefore !== facts.signer && t.ownerAfter !== facts.signer) continue;
        theoMint.set(t.mint, (theoMint.get(t.mint) ?? 0n) + (t.amountAfter - t.amountBefore));
      }
      const ra = [...theoMint.entries()].filter(([, d]) => d < 0n);
      if (ra.length === 0) return null;
      const ten = ra.map(([mint, d]) => `${so(-d, decimalsCua(facts, mint))} ${rutGon(mint)}`);
      return `${ten.join(" and ")} will leave your wallet, and nothing in this transaction comes back to you.`;
    }

    case REASON.VI_NHAN_MOI_TAO: {
      const moi = Object.entries(facts.tuoiViNhan).find(([, tuoi]) => tuoi !== null && tuoi < 24);
      if (!moi) return null;
      const [vi, tuoi] = moi;
      return `Receiving wallet ${rutGon(vi)} was created only ${(tuoi as number).toFixed(1)} hours ago. A brand-new wallet receiving most of your assets is a familiar pattern in scams.`;
    }

    case REASON.TRANSFER_NGOAI_HANH_DONG_CHINH: {
      const t = cuaToi.find((x) => x.amountAfter < x.amountBefore);
      if (!t) return null;
      return `Besides what you intend to do, the transaction also moves ${so(t.amountBefore - t.amountAfter, decimalsCua(facts, t.mint))} ${rutGon(t.mint)} out of your wallet.`;
    }

    case REASON.TOKEN2022_TRANSFER_HOOK: {
      const m = facts.mints.find((x) => x.transferHookProgramId !== null);
      if (!m) return null;
      return `Every time ${rutGon(m.address)} is transferred, another program runs along with it. This is a legitimate feature, but we have not read that program.`;
    }

    case REASON.FREEZE_AUTHORITY_CON_HIEU_LUC: {
      const m = facts.mints.find((x) => x.freezeAuthority !== null && x.freezeAuthority !== facts.signer);
      if (!m) return null;
      return `The issuer of ${rutGon(m.address)} can freeze your account so you cannot transfer this token. Many major tokens work this way — this is a legitimate feature.`;
    }

    case REASON.PERMANENT_DELEGATE_RA_TAY: {
      const m = facts.mints.find(
        (x) =>
          x.permanentDelegate !== null &&
          facts.instructions.some((ix) => ix.decoded?.authority === x.permanentDelegate),
      );
      if (!m) return null;
      return `The issuer of ${rutGon(m.address)} is itself taking this token out of your account using its permanent withdrawal right. It does not need your consent, and you cannot revoke that right.`;
    }

    case REASON.SOL_ROI_VI: {
      const { roi } = tinhSolNguoiDung(facts);
      const phi = facts.phiUocTinh ?? 0n;
      const di = roi - phi;
      if (di <= 0n) return null;
      return `${so(di, 9)} SOL will leave your wallet — most of the SOL you have. This does not include the network fee.`;
    }

    case REASON.NGUOI_DUNG_KHONG_RO: {
      const n = facts.nguoiKy?.length ?? 0;
      if (n <= 1) return null;
      return `This transaction needs ${n} signatures, and the wallet has not said which address is yours. We are checking against the fee-paying wallet, so we may be looking at the wrong wallet.`;
    }

    case REASON.TRANG_THAI_DO_KHUYET: {
      const n = facts.accountKhongDoDuoc?.length ?? 0;
      const m = facts.mintKhongDoc?.length ?? 0;
      if (n === 0 && m === 0) return null;
      const cau: string[] = [];
      if (n > 0) {
        cau.push(`This transaction touches ${n} ${n === 1 ? "account" : "accounts"} whose post-signing state we could not read, so the changes table above may be incomplete.`);
      }
      if (m > 0) {
        cau.push(`We could not read the details of ${m} ${m === 1 ? "token" : "tokens"} in this transaction, so amounts are shown in base units and warnings about that token (freezing, extra minting) may be missing.`);
      }
      return cau.join(" ");
    }

    case REASON.MO_PHONG_HONG:
      return "We could not simulate this transaction, so we do not know what it will do to your wallet.";

    case REASON.ALT_KHONG_GIAI_DUOC:
      return "The transaction uses an address lookup table we could not read, so the list of recipients may be incomplete.";

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
export function dienGiaiMau(facts: Facts, reasonCodes: string[], locale: Locale = "vi"): string {
  const cau: string[] = [];
  const sinh = locale === "en" ? cauChoEn : cauCho;
  for (const ma of reasonCodes) {
    const c = sinh(ma, facts);
    if (c && !cau.includes(c)) cau.push(c);
  }

  if (locale === "en" && cau.length === 0) {
    // Cùng ba nhánh, cùng mức trung thực với bản tiếng Việt: không bao giờ nói "an toàn".
    if (!facts.simulationOk) {
      return "We could not simulate this transaction, so we do not know what it will do.";
    }
    if (facts.coverage.analyzed < facts.coverage.total) {
      return "We could not fully read this transaction.";
    }
    return "No signs found among the checks we can run.";
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
