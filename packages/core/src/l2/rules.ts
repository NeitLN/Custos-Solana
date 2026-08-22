import type { Level } from "@custos/types";
import type { Facts } from "../facts.ts";
import { REASON, VERIFIED_PROGRAMS, NGUONG_SOL_PHAN_TRAM } from "../constants.ts";
import { tinhSolNguoiDung, tinhTienDatCoc } from "../sol.ts";

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
    const hits: RuleHit[] = [];

    for (const m of f.mints) {
      if (m.permanentDelegate === null || !lienQuan.has(m.address)) continue;

      // Sự tồn tại của quyền: luôn Vàng, luôn giọng thông tin.
      hits.push({
        ruleId: 4,
        level: "warning",
        reasonCode: REASON.TOKEN2022_PERMANENT_DELEGATE,
        detail: `Token ${m.address} có quyền rút vĩnh viễn thuộc ${m.permanentDelegate}`,
      });

      // CHÍNH quyền đó ra tay: chuyện khác hẳn. Người giữ token không bấm gì để
      // trao quyền này, không thu hồi được, và cũng không nhận được gì lại.
      //
      // Điều kiện là `authority` của lệnh phải ĐÚNG BẰNG permanent delegate.
      // `authority` vắng mặt nghĩa là chưa bóc được — và khi đó luật GIỮ NGUYÊN
      // mức Vàng thay vì đoán. Đây là chính sách đã chốt, không phải thiếu sót.
      const raTay = f.instructions.some(
        (ix) =>
          ix.decoded !== null &&
          ix.decoded.authority !== undefined &&
          ix.decoded.authority === m.permanentDelegate,
      );
      // Không tính khi chính người dùng lại là permanent delegate của mint mình giữ.
      if (!raTay || m.permanentDelegate === f.signer) continue;

      hits.push({
        ruleId: 4,
        level: "danger",
        reasonCode: REASON.PERMANENT_DELEGATE_RA_TAY,
        detail:
          `${m.permanentDelegate} dùng quyền rút vĩnh viễn của token ${m.address} ` +
          `để tự thực hiện lệnh trong giao dịch này`,
      });
    }
    return hits;
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

/**
 * Luật 5 — token có Transfer Hook mà đội chưa đọc hiểu chương trình hook đó.
 *
 * Transfer Hook là NĂNG LỰC HỢP LỆ của Token-2022: nó cho phép mint chạy thêm
 * logic mỗi lần chuyển — dùng cho danh sách tuân thủ, phí bản quyền, giới hạn
 * chuyển nhượng. Sự tồn tại của nó không phải tội, nên luật này ở mức Vàng và
 * mang giọng THÔNG TIN.
 *
 * Điều đáng nói với người dùng không phải "có hook", mà là "có hook và chúng
 * tôi không biết nó làm gì". Nếu chương trình hook nằm trong danh sách đã xác
 * minh thì đội đọc hiểu được nó, và không có gì để cảnh báo — đó chính là ca
 * âm tính R05-neg.
 *
 * Đo trên 10 giao dịch mainnet: 0 mẫu có transfer hook. Luật này không góp phần
 * nào vào mệt mỏi cảnh báo trên lưu lượng thật.
 */
export const luat5: Rule = {
  id: 5,
  ten: "Token có transfer hook chưa kiểm chứng",
  danhGia(f) {
    const lienQuan = new Set(f.tokenAccounts.map((t) => t.mint));
    return f.mints
      .filter((m) => m.transferHookProgramId !== null && lienQuan.has(m.address))
      .filter((m) => !VERIFIED_PROGRAMS.has(m.transferHookProgramId as string))
      .map((m) => ({
        ruleId: 5,
        level: "warning" as const,
        reasonCode: REASON.TOKEN2022_TRANSFER_HOOK,
        detail:
          `Mỗi lần chuyển ${m.address} sẽ chạy thêm chương trình ` +
          `${m.transferHookProgramId}, và chúng tôi chưa đọc hiểu được nó`,
      }));
  },
};

/**
 * Luật 7 — người phát hành vẫn đóng băng được tài khoản của bạn.
 *
 * ĐÂY LÀ LUẬT DỄ DÙNG SAI NHẤT trong cả mười hai. USDC có freeze authority.
 * Phần lớn stablecoin nghiêm túc đều có, vì quy định buộc họ phải đóng băng
 * được tài sản bị đánh cắp. Gắn cờ báo động cho nó là gắn cờ cho gần như mọi
 * stablecoin trên Solana — đúng kiểu sai mà luật 4 và PROGRAM_CHUA_XAC_MINH đã
 * mắc và phải sửa sau khi đo thật.
 *
 * Nên luật này LUÔN Vàng, luôn giọng thông tin, và câu chữ nói về NĂNG LỰC của
 * token chứ không nói về giao dịch đang chờ ký. Người dùng xứng đáng được biết
 * tài sản mình giữ có thể bị đóng băng; họ không xứng đáng bị doạ vì điều đó.
 *
 * Bỏ qua khi chính người ký giữ quyền đó — mình đóng băng được tài khoản mình
 * thì không có gì để cảnh báo, cùng logic với luật 2 và luật 3.
 */
export const luat7: Rule = {
  id: 7,
  ten: "Token có thể bị đóng băng bởi người phát hành",
  danhGia(f) {
    const lienQuan = new Set(f.tokenAccounts.map((t) => t.mint));
    return f.mints
      .filter((m) => m.freezeAuthority !== null && lienQuan.has(m.address))
      .filter((m) => m.freezeAuthority !== f.signer)
      .map((m) => ({
        ruleId: 7,
        level: "warning" as const,
        reasonCode: REASON.FREEZE_AUTHORITY_CON_HIEU_LUC,
        detail: `${m.freezeAuthority} có thể đóng băng tài khoản ${m.address} của bạn`,
      }));
  },
};

/**
 * Luật 10 — có Address Lookup Table không giải được.
 *
 * ALT là kỹ thuật hợp lệ và phổ biến: 7 trên 10 giao dịch mainnet trong bộ dữ
 * liệu có dùng ALT, và cả 7 đều lành. Nên luật này KHÔNG gắn cờ việc dùng ALT.
 * Nó chỉ gắn cờ khi ta KHÔNG GIẢI ĐƯỢC bảng — vì khi đó danh sách tài khoản
 * còn thiếu, và bảng chênh lệch có thể đang bỏ sót thứ gì đó. Đây là lời thú
 * nhận về giới hạn của Custos, không phải cáo buộc nhắm vào giao dịch.
 *
 * ĐÃ CỐ Ý BỎ nhánh thứ hai của đặc tả — "ALT trỏ tới program hoặc account chưa
 * xác minh". Hai lý do, cả hai đo được:
 *   1. Nó trùng với luật 9, vốn đã bắt chương trình chưa xác minh có chạm tài
 *      sản người ký. Địa chỉ đến từ ALT hay đến từ danh sách account tĩnh không
 *      làm thay đổi mức nguy hiểm.
 *   2. Nó sẽ kích hoạt trên 7/10 giao dịch mainnet, nơi ALT hoàn toàn bình
 *      thường. Đúng công thức tạo mệt mỏi cảnh báo.
 * Ghi lại ở đây để không ai thêm lại nhánh đó mà tưởng là bỏ sót.
 *
 * Fail-safe 3 trong `evaluate.ts` cũng đẩy verdict lên Vàng cho đúng tình huống
 * này, nhưng KHÔNG kèm mã lý do — nghĩa là giao diện hiện cảnh báo mà không nói
 * được vì sao. Luật này lấp đúng chỗ đó.
 */
export const luat10: Rule = {
  id: 10,
  ten: "Bảng tra địa chỉ không giải được",
  danhGia(f) {
    return f.lookupTables
      .filter((t) => !t.resolved)
      .map((t) => ({
        ruleId: 10,
        level: "warning" as const,
        reasonCode: REASON.ALT_KHONG_GIAI_DUOC,
        detail:
          `Không đọc được bảng tra địa chỉ ${t.address}, nên danh sách tài khoản ` +
          `của giao dịch có thể còn thiếu`,
      }));
  },
};

/**
 * Luật 13 — phần lớn SOL rời ví người được bảo vệ.
 *
 * Mười hai luật đầu đều đọc tài khoản token hoặc chủ sở hữu account. KHÔNG luật
 * nào đọc `solDelta`. Hệ quả: một giao dịch chỉ rút SOL ra verdict `safe`, mã lý
 * do rỗng, và khoản mất hiện ra dưới nhãn "Phí mạng". SOL là tài sản phổ biến
 * nhất trên mạng này. Xem SECURITY-AUDIT.md — F1.
 *
 * Mức VÀNG, không phải Đỏ. Một giao dịch gửi SOL hợp lệ trông y hệt: số dư giảm,
 * không nhận lại gì. Đây đúng là cái bẫy luật 11 đã sập một lần rồi. Chỉ lên Đỏ
 * khi trùng với một luật Đỏ khác, và việc đó do `danhGia` lo.
 *
 * Ngưỡng theo TỈ LỆ số dư, không theo con số tuyệt đối: đội không có dữ liệu giá
 * để biết bao nhiêu SOL là "nhiều", và một ngưỡng cứng sẽ vừa bỏ lọt ví lớn vừa
 * kêu oan ví nhỏ.
 *
 * Phí mạng bị trừ ra trước khi tính. `phiUocTinh` là CẬN DƯỚI nên phần dư có thể
 * còn lẫn chút phí ưu tiên — ngưỡng 50 % làm sai số đó không bao giờ đủ để kích
 * hoạt cảnh báo.
 */
export const luat13: Rule = {
  id: 13,
  ten: "Phần lớn SOL rời ví",
  danhGia(f) {
    // Tính trên TỔNG SOL người dùng kiểm soát — lamport trong ví CỘNG wrapped SOL.
    // Chỉ đọc `solDelta[signer]` thì vừa bỏ lọt (đóng tài khoản wSOL cho ví lạ)
    // vừa kêu oan (bọc SOL để swap). Xem sol.ts.
    const { truoc, roi } = tinhSolNguoiDung(f);
    if (roi <= 0n) return []; // không mất gì, hoặc nhận thêm

    // Trừ cả phí lẫn tiền đặt cọc: cả hai đều không phải "mất tiền". Đặt cọc
    // chỉ được trừ khi tài khoản mới THUỘC VỀ người dùng — xem tinhTienDatCoc.
    const khongPhaiMat = (f.phiUocTinh ?? 0n) + tinhTienDatCoc(f);
    if (roi <= khongPhaiMat) return [];

    const chuyenDi = roi - khongPhaiMat;
    if (truoc <= 0n) return [];
    if ((chuyenDi * 100n) / truoc < NGUONG_SOL_PHAN_TRAM) return [];

    // NGƯỜI DÙNG CÓ NHẬN LẠI GÌ KHÔNG?
    //
    // Trả tiền mua một món hàng thì không phải nạn nhân. Ca bắt được khi đo
    // cohort 23/08: ví 0,025 SOL tiêu 0,016 (63 %) và nhận về 7.453 token — một
    // lệnh mua bình thường của ví nhỏ, bị luật này gắn cờ oan.
    //
    // Luật 11 đã học đúng bài này từ trước và kiểm `coNhanLai`. Luật 13 thiếu vế
    // đó. Gắn cờ mọi lệnh mua là cách nhanh nhất để người dùng học được cách bỏ
    // qua cảnh báo — và một sản phẩm bảo mật chết vì mệt mỏi cảnh báo cũng nhanh
    // như chết vì bỏ lọt.
    //
    // Đánh đổi phải nói rõ: kẻ tấn công đưa lại một token vô giá trị thì cũng
    // làm tắt được luật này. Custos KHÔNG có dữ liệu giá nên không phân biệt
    // được token thật với token rác. Đây là cùng một khoảng hở luật 11 đã chấp
    // nhận, và ghi trong tài liệu tích hợp.
    const coNhanLai = f.tokenAccounts.some(
      (t) => t.ownerAfter === f.signer && t.amountAfter > t.amountBefore,
    );
    if (coNhanLai) return [];

    return [{
      ruleId: 13,
      level: "warning" as const,
      reasonCode: REASON.SOL_ROI_VI,
      detail: `${chuyenDi} lamport rời khỏi tay bạn, trên tổng số ${truoc} đang có (đã tính cả wrapped SOL)`,
    }];
  },
};

/**
 * Luật 14 — không biết đang bảo vệ ai.
 *
 * `signer` mặc định là `staticAccountKeys[0]`, tức NGƯỜI TRẢ PHÍ. Trong giao dịch
 * được tài trợ phí — mô hình hợp lệ, và cũng là cách kẻ tấn công dựng được — người
 * trả phí không phải người dùng, nên mọi luật đều đang nhắm vào ví của bên kia.
 *
 * Chỉ ví mới biết địa chỉ nào là của người dùng. Nó nói ra qua
 * `InspectOptions.nguoiDung`. Không nói mà giao dịch có nhiều hơn một người ký
 * thì Custos phải thừa nhận là mình không chắc, thay vì im lặng bảo vệ nhầm ví.
 *
 * Đây là giới hạn phạm vi phân tích, không phải cáo buộc — nên mã nằm trong
 * `MA_THONG_TIN` và giọng giao diện là thông tin.
 */
export const luat14: Rule = {
  id: 14,
  ten: "Không rõ đang bảo vệ ai",
  danhGia(f) {
    const ky = f.nguoiKy ?? [];
    if (f.nguoiDungDuocChiDinh || ky.length <= 1) return [];
    return [{
      ruleId: 14,
      level: "warning" as const,
      reasonCode: REASON.NGUOI_DUNG_KHONG_RO,
      detail:
        `Giao dịch cần ${ky.length} chữ ký và ví không cho biết địa chỉ nào là của bạn. ` +
        `Custos đang phân tích theo ${f.signer}`,
    }];
  },
};

/** Mười bốn luật: bốn Đỏ và mười Vàng.
 *
 *  Luật 13 và 14 sinh ra từ audit bảo mật ngày 21/08 — mười hai luật đầu không
 *  bao phủ native SOL, và cũng không kiểm xem Custos có đang bảo vệ đúng người
 *  hay không. Xem docs/bao-mat/SECURITY-AUDIT.md. */
export const LUAT: Rule[] = [
  luat1, luat2, luat3, luat12,
  luat4, luat5, luat6, luat7, luat8, luat9, luat10, luat11, luat13, luat14,
];

