import type { Level } from "@custos/types";
import type { Facts } from "../facts.ts";
import { REASON } from "../constants.ts";

export type RuleHit = {
  ruleId: number;
  level: Level;
  reasonCode: string;
  detail: string;
};

export type Rule = {
  id: number;
  ten: string;
  danhGia(facts: Facts): RuleHit[];
};

/**
 * BỐN LUẬT ĐỎ.
 *
 * Cả bốn đều đọc CHÊNH LỆCH TRẠNG THÁI, không đọc instruction — vì kẻ tấn công
 * giấu được instruction (CPI, program riêng, ALT) nhưng không giấu được hậu quả.
 * Xem DAC-TA-CORE.md mục 1.
 *
 * Không có AI ở bất kỳ đâu trong file này.
 */

/** Luật 1 — tài khoản token của người ký đổi chủ. */
export const luat1: Rule = {
  id: 1,
  ten: "Tài khoản token đổi chủ",
  danhGia(f) {
    const hits: RuleHit[] = [];
    for (const t of f.tokenAccounts) {
      if (t.ownerBefore === null || t.ownerAfter === null) continue;
      // Chỉ tính khi tài khoản vốn thuộc về người ký. Tài khoản của người khác
      // đổi chủ thì không phải mất mát của người đang chuẩn bị ký.
      if (t.ownerBefore !== f.signer) continue;
      if (t.ownerBefore === t.ownerAfter) continue;
      hits.push({
        ruleId: 1,
        level: "danger",
        reasonCode: REASON.SET_AUTHORITY_ACCOUNT_OWNER,
        detail: `Tài khoản ${t.address} đổi chủ từ ${t.ownerBefore} sang ${t.ownerAfter}`,
      });
    }
    return hits;
  },
};

/** Luật 2 — quyền đóng tài khoản được trao cho bên thứ ba. */
export const luat2: Rule = {
  id: 2,
  ten: "Trao quyền đóng tài khoản cho bên thứ ba",
  danhGia(f) {
    const hits: RuleHit[] = [];
    for (const t of f.tokenAccounts) {
      if (t.ownerBefore !== f.signer) continue;
      const truoc = t.closeAuthorityBefore;
      const sau = t.closeAuthorityAfter;
      if (sau === null || sau === truoc) continue;
      if (sau === f.signer) continue; // tự giữ quyền của mình thì không sao
      hits.push({
        ruleId: 2,
        level: "danger",
        reasonCode: REASON.SET_AUTHORITY_CLOSE_OR_FREEZE,
        detail: `Quyền đóng tài khoản ${t.address} được trao cho ${sau}`,
      });
    }
    return hits;
  },
};

/**
 * Luật 3 — cấp quyền rút vượt quá số dư đang có.
 *
 * Ngưỡng là "vượt quá số dư hiện tại", không phải một con số cứng.
 * Cấp quyền rút ĐÚNG BẰNG số tiền của giao dịch là hành vi chuẩn của nhiều dApp
 * và KHÔNG được gắn cờ — đó chính là ca âm tính R03-neg trong SEED-DATASET.md.
 * Cấp quyền rút nhiều hơn số mình đang có thì không có lý do chính đáng nào.
 */
export const luat3: Rule = {
  id: 3,
  ten: "Cấp quyền rút vượt số dư",
  danhGia(f) {
    const hits: RuleHit[] = [];
    for (const t of f.tokenAccounts) {
      if (t.ownerBefore !== f.signer) continue;
      const sau = t.delegateAfter;
      if (sau === null || sau === t.delegateBefore) continue;
      if (sau === f.signer) continue;
      if (t.delegatedAmountAfter <= t.amountBefore) continue;
      hits.push({
        ruleId: 3,
        level: "danger",
        reasonCode: REASON.APPROVE_DELEGATE_LON,
        detail:
          `${sau} được phép rút ${t.delegatedAmountAfter} từ ${t.address}, ` +
          `trong khi tài khoản chỉ có ${t.amountBefore}`,
      });
    }
    return hits;
  },
};

/**
 * Luật 12 — account của người ký đổi program sở hữu.
 *
 * Đây là vector `SystemProgram.assign` đã từng qua mặt mô phỏng của Blowfish
 * (xem NGHIEN-CUU-21-08.md mục 2). Nó tác động lên account THƯỜNG chứ không
 * riêng tài khoản token, nên phải đọc từ `facts.accounts`.
 */
export const luat12: Rule = {
  id: 12,
  ten: "Account đổi program sở hữu",
  danhGia(f) {
    const hits: RuleHit[] = [];
    for (const a of f.accounts) {
      if (a.programOwnerBefore === null || a.programOwnerAfter === null) continue;
      if (a.programOwnerBefore === a.programOwnerAfter) continue;
      hits.push({
        ruleId: 12,
        level: "danger",
        reasonCode: REASON.SYSTEM_ASSIGN_DOI_OWNER,
        detail:
          `Account ${a.address} chuyển từ chương trình ${a.programOwnerBefore} ` +
          `sang ${a.programOwnerAfter}`,
      });
    }
    return hits;
  },
};

/** Bốn luật Đỏ. Giữ tên cũ để mã đang dùng không vỡ. */
export const LUAT_DO: Rule[] = [luat1, luat2, luat3, luat12];
/**
 * Luật 4 — token có Permanent Delegate. LUÔN Ở MỨC VÀNG.
 *
 * Permanent delegate là NĂNG LỰC HỢP LỆ của Token-2022, có ca dùng chính đáng.
 * Sự tồn tại của nó là thông tin, không phải tội.
 *
 * BẢN TRƯỚC CÓ NHÁNH NÂNG LÊN ĐỎ và nó SAI. Nhánh đó kích hoạt khi thấy
 * "số dư người ký giảm + có lệnh transfer" — nhưng đó cũng chính xác là hình
 * dạng của một giao dịch CHUYỂN TIỀN HỢP LỆ. Kết quả: mọi lần chuyển một token
 * có permanent delegate đều bị gắn Đỏ. Mẫu R04-pos trong seed dataset bắt được
 * lỗi này.
 *
 * Phân biệt đúng — "chủ tài khoản chuyển" hay "permanent delegate chuyển" — nằm
 * ở tài khoản `authority` của chính lệnh Transfer, mà `Facts` hiện chưa ghi lại.
 * Cho tới khi L1 bóc được trường đó, luật này KHÔNG tuyên bố điều nó không
 * chứng minh được. Cảnh báo đúng vẫn hơn cáo buộc sai.
 */
export const luat4: Rule = {
  id: 4,
  ten: "Token có quyền rút vĩnh viễn",
  danhGia(f) {
    const lienQuan = new Set(f.tokenAccounts.map((t) => t.mint));
    return f.mints
      .filter((m) => m.permanentDelegate !== null && lienQuan.has(m.address))
      .map((m) => ({
        ruleId: 4,
        level: "warning" as const,
        reasonCode: REASON.TOKEN2022_PERMANENT_DELEGATE,
        detail: `Token ${m.address} có quyền rút vĩnh viễn thuộc ${m.permanentDelegate}`,
      }));
  },
};

/** Luật 6 — người phát hành vẫn tạo thêm token được. Thông tin, không phải tội. */
export const luat6: Rule = {
  id: 6,
  ten: "Mint authority chưa thu hồi",
  danhGia(f) {
    const lienQuan = new Set(f.tokenAccounts.map((t) => t.mint));
    return f.mints
      .filter((m) => m.mintAuthority !== null && lienQuan.has(m.address))
      .map((m) => ({
        ruleId: 6,
        level: "warning" as const,
        reasonCode: REASON.MINT_AUTHORITY_CHUA_THU_HOI,
        detail: `${m.address} vẫn có thể được tạo thêm bởi ${m.mintAuthority}`,
      }));
  },
};

/**
 * Luật 9 — giao dịch gọi chương trình đội chưa đọc hiểu được.
 *
 * Chỉ kích hoạt khi chương trình đó CHẠM ĐƯỢC vào tài sản người ký. Chương
 * trình lạ không ghi gì của bạn thì không hại được bạn trong giao dịch này —
 * mô hình tài khoản của Solana bảo đảm điều đó. Đo trên mainnet cho thấy nếu
 * bỏ vế này thì mọi giao dịch đều bị gắn cờ.
 */
export const luat9: Rule = {
  id: 9,
  ten: "Chương trình chưa xác minh chạm tài sản người ký",
  danhGia(f) {
    const la = new Set(
      f.instructions.filter((ix) => ix.decoded === null && ix.chamTaiSanNguoiKy).map((ix) => ix.programId),
    );
    return [...la]
      .filter((p) => p !== "")
      .map((p) => ({
        ruleId: 9,
        level: "warning" as const,
        reasonCode: REASON.PROGRAM_CHUA_XAC_MINH,
        detail: `Chương trình ${p} ghi vào tài khoản của bạn, và chúng tôi chưa đọc hiểu được nó`,
      }));
  },
};

/**
 * Luật 11 — tài sản rời ví mà giao dịch không có phần nào trả lại.
 *
 * Mặc định Vàng, KHÔNG phải Đỏ. Một giao dịch chuyển tiền hợp lệ trông y hệt:
 * số dư người gửi giảm, không nhận lại gì. Đây từng là lỗi thật ở bản v3 của
 * tài liệu — gắn Đỏ cho hành vi bình thường nhất của một ví.
 *
 * Chỉ lên Đỏ khi trùng với một luật Đỏ khác, và việc đó do `danhGia` lo.
 */
export const luat11: Rule = {
  id: 11,
  ten: "Tài sản rời ví không có phần nhận lại",
  danhGia(f) {
    const theoMint = new Map<string, bigint>();
    for (const t of f.tokenAccounts) {
      if (t.ownerBefore !== f.signer && t.ownerAfter !== f.signer) continue;
      theoMint.set(t.mint, (theoMint.get(t.mint) ?? 0n) + (t.amountAfter - t.amountBefore));
    }
    const ra = [...theoMint.entries()].filter(([, d]) => d < 0n);
    const coNhanLai = [...theoMint.values()].some((d) => d > 0n);
    if (ra.length === 0 || coNhanLai) return [];

    // MỘT loại tài sản rời ví là hành vi bình thường nhất của một cái ví: gửi
    // tiền cho ai đó. Bảng chênh lệch ĐÃ hiển thị khoản đó rồi; cảnh báo thêm
    // chỉ là nhiễu, và đo trên mainnet cho thấy nó là cáo buộc sai duy nhất
    // trong 12 mẫu.
    //
    // Rút NHIỀU loại tài sản khác nhau trong một giao dịch thì khác: không có
    // hành động bình thường nào cần làm vậy.
    if (ra.length < 2) return [];

    return ra.map(([mint, d]) => ({
      ruleId: 11,
      level: "warning" as const,
      reasonCode: REASON.OUTFLOW_KHONG_KHOP,
      detail: `${-d} ${mint} rời khỏi ví mà giao dịch không có phần nào trả lại`,
    }));
  },
};

/**
 * Luật 8 — gửi phần lớn tài sản cho một ví vừa mới tạo.
 *
 * Đây là luật DUY NHẤT cần dữ liệu tra cứu thêm (tuổi ví). Vì vậy nó phải chịu
 * được việc không có dữ liệu: `tuoiViNhan[v] === null` nghĩa là không tra được,
 * và khi đó luật ĐƠN GIẢN LÀ KHÔNG KÍCH HOẠT.
 *
 * Không được biến "không tra được" thành cảnh báo — xem DAC-TA-CORE.md mục 3.3.
 * Áp fail-safe cho đường làm giàu dữ liệu thì mọi giao dịch sẽ ra Vàng.
 *
 * Ngưỡng "phần lớn" chọn theo TỈ LỆ chứ không theo con số tuyệt đối, vì đội
 * không có dữ liệu giá để biết bao nhiêu là "nhiều".
 */
const NGUONG_TUOI_GIO = 24;
const NGUONG_TI_LE = 0.5;

export const luat8: Rule = {
  id: 8,
  ten: "Gửi phần lớn tài sản cho ví mới tạo",
  danhGia(f) {
    const hits: RuleHit[] = [];
    for (const t of f.tokenAccounts) {
      const nhan = t.ownerAfter;
      if (!nhan || nhan === f.signer) continue;
      if (t.amountAfter <= t.amountBefore) continue;

      const tuoi = f.tuoiViNhan[nhan];
      if (tuoi === null || tuoi === undefined) continue; // không tra được ⇒ im lặng
      if (tuoi >= NGUONG_TUOI_GIO) continue;

      // Người ký mất bao nhiêu phần trăm số mình đang có của mint này?
      let coTruoc = 0n;
      let matDi = 0n;
      for (const x of f.tokenAccounts) {
        if (x.mint !== t.mint || x.ownerBefore !== f.signer) continue;
        coTruoc += x.amountBefore;
        if (x.amountAfter < x.amountBefore) matDi += x.amountBefore - x.amountAfter;
      }
      if (coTruoc === 0n) continue;
      if (Number(matDi) / Number(coTruoc) < NGUONG_TI_LE) continue;

      hits.push({
        ruleId: 8,
        level: "warning",
        reasonCode: REASON.VI_NHAN_MOI_TAO,
        detail: `Ví nhận ${nhan} vừa được tạo cách đây ${tuoi.toFixed(1)} giờ`,
      });
    }
    return hits;
  },
};

/** Chín luật của bản thi: bốn Đỏ và năm Vàng. */
export const LUAT: Rule[] = [luat1, luat2, luat3, luat12, luat4, luat6, luat8, luat9, luat11];

