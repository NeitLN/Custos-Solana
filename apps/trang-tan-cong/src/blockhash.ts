/**
 * TUỔI CỦA BLOCKHASH LẤY SẴN.
 *
 * Trang lấy blockhash trước để lúc bấm không còn `await` nào trước `window.open` —
 * nếu có, trình duyệt coi đó là popup không do người dùng mở và chặn.
 *
 * Nhưng "lấy sẵn" đẻ ra một rủi ro khác: blockhash Solana chỉ sống khoảng 150 slot
 * (~60–90 giây). Và `setInterval` KHÔNG cứu được — trình duyệt bóp timer của tab
 * chạy nền xuống còn một lần mỗi phút, đôi khi thưa hơn. Mở trang rồi chuyển sang
 * tab khác nói chuyện vài phút, quay lại bấm, thì thứ trong tay là một blockhash
 * đã chết: ví nhận giao dịch và Devnet từ chối.
 *
 * Nên phải hỏi TUỔI, không hỏi "đã lấy chưa".
 */

/**
 * 45 giây — dưới hạn sống thật (~60–90 s) một quãng đủ rộng để giao dịch còn kịp
 * đi hết đường từ lúc bấm tới lúc ví gửi. Sát hạn quá thì tiết kiệm được một lần
 * gọi mạng và đổi lấy nguy cơ hỏng giữa buổi demo — đánh đổi sai.
 */
export const TUOI_TOI_DA_MS = 45_000;

/** Blockhash lấy lúc `luc` có còn dùng được tại `bayGio` không. */
export function conDungDuoc(luc: number, bayGio: number = Date.now()): boolean {
  const tuoi = bayGio - luc;
  // Tuổi âm nghĩa là đồng hồ máy vừa bị chỉnh lùi. Không tin cache trong trường hợp
  // đó: lấy lại một lần tốn vài trăm mili giây, còn dùng nhầm thì hỏng cả demo.
  return tuoi >= 0 && tuoi < TUOI_TOI_DA_MS;
}
