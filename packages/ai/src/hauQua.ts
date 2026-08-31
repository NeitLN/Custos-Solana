import type { InspectResult } from "@custos-solana/types";
import { NHAN } from "@custos-solana/core";

/**
 * "NẾU BẠN KÝ MÀ KHÔNG CÓ CUSTOS" — dựng nội dung màn hậu quả.
 *
 * Kịch bản demo có hai nhịp, và sức thuyết phục nằm ở NHỊP 1: ký, rồi thấy số dư
 * về 0. Bản deploy công khai cố ý không nhúng khoá ký, nên người bấm link chỉ xem
 * được nhịp 2 — một cảnh báo về mối nguy họ chưa từng thấy xảy ra.
 *
 * Màn này lấp đúng chỗ đó mà KHÔNG cần khoá: `simulateTransaction` đã trả về trạng
 * thái sau, và toàn bộ dữ liệu để hiện hậu quả đã nằm trong `diff`. Không ký gì,
 * không gửi giao dịch nào, và cũng không dàn dựng gì — đây là hậu quả thật do mô
 * phỏng tính ra.
 *
 * BA RÀNG BUỘC, và cái thứ hai là luật đã khoá:
 *
 *   1. Bên gọi PHẢI dán nhãn "kết quả mô phỏng". Thể lệ BTC: demo dàn dựng sai sự
 *      thật bị trừ điểm hoặc loại.
 *   2. CHỈ hiện những gì `diff` có. Giao dịch chỉ đổi chủ mà không chuyển tiền thì
 *      màn này KHÔNG được hiện 500 → 0 — đúng quyết định đã khoá số 7 trong
 *      `CLAUDE.md`, áp dụng cho màn này y như cho bảng chênh lệch. Có test.
 *   3. Không sinh ra đường ký nào.
 *
 * Vì sao đặt ở `@custos-solana/ai` chứ không trong ví: đây là chữ tiếng Việt cho người
 * dùng cuối — cùng loại với `mucNgan.ts` và `mucKyThuat.ts`, và cùng chủ sở hữu.
 * Đặt trong ví thì bộ test không chạm tới được (`packages/**` mới nằm trong glob).
 */

export type HangHauQua =
  /** Số dư sau khi ký, kèm số trước để đối chiếu. */
  | { loai: "soDu"; ten: string; truoc: string; sau: string }
  /** Mất quyền kiểm soát — không phải mất tiền, và không được nói lẫn. */
  | { loai: "mucKiemSoat"; cau: string };

/** Bỏ đuôi "sau khi ký" để lấy tên token trong nhãn số dư. */
const tenTuNhan = (label: string, tienTo: string) =>
  label.slice(tienTo.length).replace(/ sau khi ký$/, "").trim();

export function dungHauQua(ketQua: InspectResult): HangHauQua[] {
  const ra: HangHauQua[] = [];

  for (const d of ketQua.diff) {
    // Dòng thông tin không phải hậu quả của việc ký. Phí mạng và dòng "chưa đọc
    // được" mà lọt vào đây thì màn hậu quả thành bảng chênh lệch thứ hai.
    if (d.severity === "info") continue;

    if (d.label === NHAN.SO_DU_SOL) {
      ra.push({ loai: "soDu", ten: "SOL", truoc: d.before, sau: d.after });
    } else if (d.label.startsWith(NHAN.SO_DU)) {
      ra.push({ loai: "soDu", ten: tenTuNhan(d.label, NHAN.SO_DU), truoc: d.before, sau: d.after });
    } else if (d.label.startsWith(NHAN.CHU_SO_HUU)) {
      ra.push({
        loai: "mucKiemSoat",
        cau: `Tài khoản ${tenTuNhan(d.label, NHAN.CHU_SO_HUU)} không còn thuộc về bạn — chủ mới là ${d.after}`,
      });
    } else if (d.label.startsWith(NHAN.DUOC_PHEP_RUT)) {
      ra.push({
        loai: "mucKiemSoat",
        cau: `${d.after} có quyền rút ${tenTuNhan(d.label, NHAN.DUOC_PHEP_RUT)} của bạn bất cứ lúc nào`,
      });
    } else if (d.label.startsWith(NHAN.QUYEN_DONG)) {
      ra.push({
        loai: "mucKiemSoat",
        cau: `${d.after} có quyền đóng tài khoản ${tenTuNhan(d.label, NHAN.QUYEN_DONG)} của bạn`,
      });
    } else if (d.label.startsWith(NHAN.CHUONG_TRINH)) {
      ra.push({
        loai: "mucKiemSoat",
        cau: `Một tài khoản của bạn đã chuyển sang quyền điều khiển của ${d.after}`,
      });
    }
  }

  return ra;
}
