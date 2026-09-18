# Logo Custos mới — đã áp dụng và build

Ngày thực hiện: 18/09/2026.

Biểu tượng mới là chữ C dạng vòng kiểm tra mở, kèm điểm hình thoi tại cửa ra.
Dùng SVG gốc, xanh ngọc trên nền sáng và trắng xanh trên nền tối. Wordmark
Manrope 800 được chuyển thành path để mở ở máy khác không cần cài font.

Đã thay logo tại header/footer landing, ví mẫu và Inspector; cập nhật favicon
và Apple touch icon của cả năm entry HTML. Ảnh chia sẻ landing chuyển sang
bộ nhận diện mới. Tài sản mascot cũ được giữ để tham chiếu.

## Sản phẩm bàn giao

- Bộ logo tại `apps/demo-wallet/public/brand/` gồm SVG, PNG trong suốt,
  favicon, Apple icon, ảnh chia sẻ VI/EN và trang xem trước.
- [Bộ logo ZIP](custos-brand-kit.zip).
- [Ảnh tổng quan](brand-sheet.png).
- [Logo trong landing](landing.png).
- [Quy cách và cách tái tạo](../../../apps/demo-wallet/public/brand/README.md).

## Kiểm tra

- `npm run typecheck`: đạt.
- Test landing và heading: 17/17 đạt.
- `npm run build -w @custos-solana/demo-wallet`: thành công, không có cảnh báo
  font. Đầu ra nằm tại `apps/demo-wallet/dist/`.
- Chromium kiểm tra sáu cấu hình trang gồm landing desktop/mobile, ví mẫu,
  Inspector mobile, số liệu và phỏng vấn: logo tải được, favicon SVG và Apple
  icon trả thành công, không có pageerror. Chạy cả dev và production prefix
  `/Custos-Solana/`; xem `dev.json`, `production.json` và `build.txt`.
- Đã xem trực quan biểu tượng ở 16/24/32/64px, bản sáng/tối và ảnh chia sẻ.
- `git diff --check`: đạt.

Thay đổi này chỉ liên quan nhận diện và cách hiển thị logo; không thay đổi
logic phân tích, ký hoặc gửi giao dịch.
