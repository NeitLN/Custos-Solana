/** Chương trình đã xác minh — giữ NGẮN có chủ đích.
 *
 *  "Xác minh" ở đây nghĩa là ĐỘI ĐỌC HIỂU ĐƯỢC nội dung lệnh của nó.
 *  SPL Memo từng nằm trong danh sách này và đó là sai: ta không decode Memo,
 *  nên gọi nó là "đã xác minh" sẽ thổi phồng coverage một cách giả tạo.
 *  Danh sách ngắn làm `coverage` phản ánh đúng sự thật là đội mới decode được chừng đó.
 *  Xem DAC-TA-CORE.md mục 2.4. */
import { BANG_IDL } from "./l1/bang-idl.ts";

export const VERIFIED_PROGRAMS = new Map<string, string>([
  ["11111111111111111111111111111111", "System"],
  ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "SPL Token"],
  ["TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", "Token-2022"],
  ["ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", "Associated Token Account"],
  ["whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", "Orca Whirlpool"],
  // ComputeBudget: bốn lệnh, đội decode được cả bốn, và không lệnh nào nhận
  // account nào nên không lệnh nào đụng được tài sản người ký. Thêm vào đây là
  // trung thực theo đúng định nghĩa "đội đọc hiểu được nội dung lệnh của nó" —
  // khác hẳn với việc thêm một chương trình DEX chưa viết decoder.
  ["ComputeBudget111111111111111111111111111111", "Compute Budget"],
  // Chương trình Anchor có IDL công bố NGAY TRÊN CHUỖI. Danh sách sinh từ chính
  // bảng IDL nên hai chỗ không lệch nhau được: thêm chương trình vào danh sách
  // xác minh mà không có decoder là điều `l1.test.ts` chặn lại.
  //
  // Nhãn cố ý KHÔNG gọi tên thương hiệu. Đội đọc được TẬP LỆNH của chúng từ IDL;
  // đội không kiểm toán chúng, và cũng không xác minh được ai sở hữu địa chỉ nào.
  ...[...BANG_IDL.keys()].map(
    (p) => [p, `Anchor ${p.slice(0, 6)}… (IDL trên chuỗi)`] as [string, string],
  ),
]);

/**
 * Ngưỡng "phần lớn số SOL" — phần trăm số dư trước khi ký.
 *
 * Đặt ở đây vì cả luật 13 (l2/rules.ts) lẫn bảng chênh lệch (diff.ts) đều dùng,
 * và hai chỗ đó không được lệch nhau: giao diện tô đỏ một dòng mà engine không
 * gắn cờ thì người dùng không hiểu chuyện gì đang xảy ra.
 *
 * Theo TỈ LỆ chứ không theo con số tuyệt đối — đội không có dữ liệu giá để biết
 * bao nhiêu SOL là "nhiều", và ngưỡng cứng thì vừa bỏ lọt ví lớn vừa kêu oan ví nhỏ.
 */
export const NGUONG_SOL_PHAN_TRAM = 50n;

export const REASON = {
  SET_AUTHORITY_ACCOUNT_OWNER: "SPL_SET_AUTHORITY__ACCOUNT_OWNER",
  SET_AUTHORITY_CLOSE_OR_FREEZE: "SPL_SET_AUTHORITY__CLOSE_OR_FREEZE",
  APPROVE_DELEGATE_LON: "SPL_APPROVE_DELEGATE_LON",
  SYSTEM_ASSIGN_DOI_OWNER: "SYSTEM_ASSIGN_DOI_OWNER",
  OUTFLOW_KHONG_KHOP: "OUTFLOW_KHONG_KHOP",
  TOKEN2022_PERMANENT_DELEGATE: "TOKEN2022_PERMANENT_DELEGATE",
  MINT_AUTHORITY_CHUA_THU_HOI: "MINT_AUTHORITY_CHUA_THU_HOI",
  PROGRAM_CHUA_XAC_MINH: "PROGRAM_CHUA_XAC_MINH",
  VI_NHAN_MOI_TAO: "VI_NHAN_MOI_TAO",
  TRANSFER_NGOAI_HANH_DONG_CHINH: "SPL_TRANSFER_NGOAI_HANH_DONG_CHINH",
  TOKEN2022_TRANSFER_HOOK: "TOKEN2022_TRANSFER_HOOK",
  FREEZE_AUTHORITY_CON_HIEU_LUC: "FREEZE_AUTHORITY_CON_HIEU_LUC",
  ALT_KHONG_GIAI_DUOC: "ALT_KHONG_GIAI_DUOC",
  TRANG_THAI_DO_KHUYET: "TRANG_THAI_DO_KHUYET",
  MO_PHONG_HONG: "MO_PHONG_HONG",
  SOL_ROI_VI: "SOL_ROI_VI",
  PERMANENT_DELEGATE_RA_TAY: "TOKEN2022_PERMANENT_DELEGATE_RA_TAY",
  NGUOI_DUNG_KHONG_RO: "NGUOI_DUNG_KHONG_RO",
} as const;

/**
 * MÃ LÝ DO MANG TÍNH THÔNG TIN — không phải cáo buộc.
 *
 * Phân biệt THUỘC TÍNH và HÀNH VI:
 *
 *   thuộc tính — "token này có đặc điểm X", "chúng tôi chưa đọc hiểu Y".
 *                Đúng, đáng biết, nhưng KHÔNG nói giao dịch đang làm gì bạn.
 *   hành vi    — "giao dịch này chuyển tiền của bạn đi", "gửi cho ví mới tạo".
 *                Nói về chính giao dịch đang chờ ký.
 *
 * Đo trên mainnet: PROGRAM_CHUA_XAC_MINH kích hoạt 11/12 giao dịch — vì các
 * chương trình DEX thật sự có ghi vào tài khoản người dùng và đội chưa viết
 * decoder cho chúng. Điều đó ĐÚNG, nhưng báo động cho nó thì Custos kêu ở mọi
 * giao dịch, và người dùng sẽ học được cách bỏ qua cảnh báo.
 *
 * `level` KHÔNG đổi vì danh sách này — fail-safe giữ nguyên. Nó chỉ quyết định
 * GIỌNG của giao diện: thông tin hay báo động.
 */
export const MA_THONG_TIN: ReadonlySet<string> = new Set([
  REASON.PROGRAM_CHUA_XAC_MINH,
  REASON.MINT_AUTHORITY_CHUA_THU_HOI,
  REASON.TOKEN2022_PERMANENT_DELEGATE,
  // Ba mã dưới đây thuộc luật 5, 7, 10 — cả ba đều là THUỘC TÍNH.
  //
  // Freeze authority đặc biệt dễ bị dùng sai: USDC có freeze authority, và
  // phần lớn stablecoin nghiêm túc đều có, vì quy định bắt buộc phải đóng băng
  // được tài sản bị đánh cắp. Nói "token này đóng băng được" là đúng; nói
  // "giao dịch này đang đóng băng tiền của bạn" là bịa.
  REASON.TOKEN2022_TRANSFER_HOOK,
  REASON.FREEZE_AUTHORITY_CON_HIEU_LUC,
  REASON.ALT_KHONG_GIAI_DUOC,
  // Hai mã dưới là lời thú nhận về giới hạn phép đo của chính Custos, không
  // phải cáo buộc nhắm vào giao dịch. Giọng phải là thông tin.
  REASON.TRANG_THAI_DO_KHUYET,
  REASON.MO_PHONG_HONG,
  // `NGUOI_DUNG_KHONG_RO` là giới hạn phạm vi phân tích, không phải cáo buộc.
  // `SOL_ROI_VI` thì NGƯỢC LẠI — nó nói về chính giao dịch đang chờ ký, nên
  // cố ý KHÔNG nằm trong danh sách này.
  REASON.NGUOI_DUNG_KHONG_RO,
]);

/** Chỉ toàn thông tin, không có cáo buộc nào về chính giao dịch này. */
export const chiLaThongTin = (ma: readonly string[]): boolean =>
  ma.length > 0 && ma.every((c) => MA_THONG_TIN.has(c));
