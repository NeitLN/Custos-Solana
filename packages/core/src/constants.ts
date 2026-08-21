/** Chương trình đã xác minh — giữ NGẮN có chủ đích.
 *
 *  "Xác minh" ở đây nghĩa là ĐỘI ĐỌC HIỂU ĐƯỢC nội dung lệnh của nó.
 *  SPL Memo từng nằm trong danh sách này và đó là sai: ta không decode Memo,
 *  nên gọi nó là "đã xác minh" sẽ thổi phồng coverage một cách giả tạo.
 *  Danh sách ngắn làm `coverage` phản ánh đúng sự thật là đội mới decode được chừng đó.
 *  Xem DAC-TA-CORE.md mục 2.4. */
export const VERIFIED_PROGRAMS = new Map<string, string>([
  ["11111111111111111111111111111111", "System"],
  ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "SPL Token"],
  ["TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", "Token-2022"],
  ["ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", "Associated Token Account"],
  ["whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", "Orca Whirlpool"],
]);

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
]);

/** Chỉ toàn thông tin, không có cáo buộc nào về chính giao dịch này. */
export const chiLaThongTin = (ma: readonly string[]): boolean =>
  ma.length > 0 && ma.every((c) => MA_THONG_TIN.has(c));
