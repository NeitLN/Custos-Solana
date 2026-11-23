import type { InspectResult, Locale } from "@custos-solana/types";
import { CHU_BANG } from "@custos-solana/core";

/** Câu của màn hậu quả theo ngôn ngữ. Loại dòng dò bằng bảng tiền tố CÙNG ngôn ngữ. */
const CAU_HAU_QUA = {
  vi: {
    chu: (ten: string, sau: string) => `Tài khoản ${ten} không còn thuộc về bạn — chủ mới là ${sau}`,
    rut: (ten: string, sau: string) => `${sau} có quyền rút ${ten} của bạn bất cứ lúc nào`,
    dong: (ten: string, sau: string) => `${sau} có quyền đóng tài khoản ${ten} của bạn`,
    chuongTrinh: (sau: string) => `Một tài khoản của bạn đã chuyển sang quyền điều khiển của ${sau}`,
  },
  en: {
    chu: (ten: string, sau: string) => `The ${ten} account no longer belongs to you — the new owner is ${sau}`,
    rut: (ten: string, sau: string) => `${sau} can withdraw your ${ten} at any time`,
    dong: (ten: string, sau: string) => `${sau} can close your ${ten} account`,
    chuongTrinh: (sau: string) => `One of your accounts has come under the control of ${sau}`,
  },
} as const;

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
 *      `BOI-CANH-DU-AN.md`, áp dụng cho màn này y như cho bảng chênh lệch. Có test.
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
export function dungHauQua(ketQua: InspectResult, locale: Locale = "vi"): HangHauQua[] {
  const ra: HangHauQua[] = [];
  const NHAN = CHU_BANG[locale].nhan;
  const duoi = CHU_BANG[locale].sauKhiKy;
  const duoiTK = CHU_BANG[locale].duoiTaiKhoan;
  const C = CAU_HAU_QUA[locale];
  const tenTuNhan = (label: string, tienTo: string) => {
    let t = label.slice(tienTo.length);
    if (t.endsWith(duoi)) t = t.slice(0, -duoi.length);
    if (duoiTK && t.endsWith(duoiTK)) t = t.slice(0, -duoiTK.length);
    return t.trim();
  };

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
        cau: C.chu(tenTuNhan(d.label, NHAN.CHU_SO_HUU), d.after),
      });
    } else if (d.label.startsWith(NHAN.DUOC_PHEP_RUT)) {
      ra.push({
        loai: "mucKiemSoat",
        cau: C.rut(tenTuNhan(d.label, NHAN.DUOC_PHEP_RUT), d.after),
      });
    } else if (d.label.startsWith(NHAN.QUYEN_DONG)) {
      ra.push({
        loai: "mucKiemSoat",
        cau: C.dong(tenTuNhan(d.label, NHAN.QUYEN_DONG), d.after),
      });
    } else if (d.label.startsWith(NHAN.CHUONG_TRINH)) {
      ra.push({
        loai: "mucKiemSoat",
        cau: C.chuongTrinh(d.after),
      });
    }
  }

  return ra;
}
