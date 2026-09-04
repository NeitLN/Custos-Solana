import { coHan } from "../../../scripts/coHan.ts";

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

/**
 * HẠN CHO MỘT LƯỢT LẤY BLOCKHASH — 9 giây.
 *
 * Vì sao phải có: bản trước gọi `getLatestBlockhash()` ở nhánh nguội mà KHÔNG có
 * hạn nào. Devnet nhận kết nối rồi im lặng thì lời hứa treo tới lúc tầng mạng tự
 * bỏ cuộc — khoảng 30 giây. Suốt 30 giây đó vòng quay quay, và `urlLui` chưa được
 * đặt nên ngay cả đường lui "Mở ví thủ công" cũng chưa hiện. Người trình bày đứng
 * chết trước giám khảo, không có gì để bấm.
 *
 * 9 giây: đủ cho Devnet chậm ở hội trường, đủ ngắn để còn kịp nói "để tôi thử lại".
 */
export const HAN_LAY_BLOCKHASH_MS = 9_000;

export type CacheBlockhash = { ma: string; luc: number } | null;

/**
 * Trả blockhash dùng được, ưu tiên cache còn hạn.
 *
 * Tách khỏi component để test được tất định: nhánh nguội, nhánh treo và nhánh lỗi
 * đều là những đường KHÔNG bao giờ chạy trong lúc mọi thứ đang tốt, nên nếu chỉ
 * kiểm bằng tay thì chúng chỉ được chạy lần đầu vào đúng hôm hỏng.
 */
export async function layBlockhash(
  layMoi: () => Promise<{ blockhash: string }>,
  cache: CacheBlockhash,
  bayGio: number = Date.now(),
  hanMs: number = HAN_LAY_BLOCKHASH_MS,
): Promise<{ ma: string; tuCache: boolean }> {
  if (cache && conDungDuoc(cache.luc, bayGio)) return { ma: cache.ma, tuCache: true };
  const { blockhash } = await coHan(layMoi(), hanMs);
  return { ma: blockhash, tuCache: false };
}
