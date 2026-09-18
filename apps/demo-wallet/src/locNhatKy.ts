/**
 * Quy tắc che dữ liệu nhạy cảm — ĐÃ CHUYỂN LÊN CORE (CU-11).
 *
 * Vì sao chuyển: receipt xuất từ SDK và từ CLI cũng phải che đúng những thứ này,
 * và hai bộ quy tắc song song thì vá một bên, bên kia vẫn hở. Đó chính là lớp lỗi
 * vừa tìm ra ở số test đông cứng: một danh sách gõ tay không ai đồng bộ.
 *
 * File này giữ lại làm đường vào cũ để không phải sửa chéo mọi nơi gọi trong ví.
 * Nguồn sự thật nằm ở `packages/core/src/che-nhay-cam.ts`.
 */
export { locDongNhatKy } from "@custos-solana/core";
