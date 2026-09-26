/** Khoá localStorage bản cũ từng dùng để lưu một ví tự sinh. Chỉ còn để DỌN. */
const KHOA_LUU = "custos.vi-demo";

/**
 * PHÒNG PHÂN TÍCH KHÔNG KÝ — review 26/09, mục 3.5.
 *
 * Trước đây phòng phân tích ký bằng khoá trong `VITE_DEMO_SECRET` (`.env.development.local`),
 * còn màn thực thi ký bằng file keypair người dùng chọn. Hai cơ chế cho cùng một ví demo
 * là hai bề mặt rò khoá và hai hành vi khác nhau cho cùng một nút "Ký"; chính
 * `scripts/demo-wallet-config.ts` ghi "không bao giờ đặt khoá riêng vào VITE_*". Và đường
 * ký qua biến môi trường là đường đã làm hỏng hiện trường Devnet ngày 25/09: bấm "Vẫn ký"
 * trên bản dev là gửi thật.
 *
 * Nay chỉ còn MỘT cách ký: màn thực thi ("Ví của bạn"), mở quyền bằng file khoá của đúng ví
 * demo cố định (`live/session.ts`, `unlock()`). Mã gửi của phòng phân tích đã gỡ khỏi
 * `App.tsx`; các bảo vệ của nó (khoá gửi lặp, neo kết quả, kết quả quá cũ) nằm ở
 * `live/session.ts` và `live/policy.ts`.
 *
 * File này chỉ còn một việc: dọn ví tự sinh mà các bản cũ đã ghi vào localStorage của người
 * xem. Chỉ ngừng ghi thì không lấy nó đi.
 */
export function donKhoaCu(): void {
  try {
    localStorage.removeItem(KHOA_LUU);
  } catch {
    /* trình duyệt chặn storage thì cũng chẳng có gì để dọn */
  }
}
