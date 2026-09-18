# Thiết kế lại trang attack / SolBonus

## Thiết kế

- Bố cục desktop hai cột: câu chuyện và minh họa hộp quà bên trái; phiếu nhận thưởng bên phải. Điện thoại chuyển thành một cột.
- Bảng màu riêng cho dApp giả: nền xám tím sáng, chữ tím than, điểm nhấn cam đất. Font Be Vietnam Pro tự lưu, đủ dấu tiếng Việt.
- Vẽ mới minh họa hộp quà bằng SVG, có chuyển động xuất hiện ngắn; không lặp chuyển động trang trí. Thiết lập giảm chuyển động được tôn trọng.
- Phiếu nhận thưởng có số SOLB, địa chỉ ví trong kịch bản, đồng hồ đếm ngược và nút mở yêu cầu trong ví. Phần thưởng được ghi rõ là hư cấu.
- Các mục điều hướng trở thành liên kết anchor hoạt động. Bổ sung FAQ mở bằng chuột và bàn phím.
- Phần đối chiếu “Giao diện nói nhận quà. Giao dịch làm điều khác.” giúp người xem hiểu giá trị kiểm tra của Custos.
- Nhãn mô phỏng Devnet vẫn hiện ở đầu trang; thay chữ chạy bằng dòng tĩnh có thể xuống dòng trên điện thoại. Số lượt nhận và tuyên bố kiểm toán được đặt trong khu vực có nhãn chi tiết hư cấu.
- Giữ nguyên cơ chế dựng giao dịch, kiểm tuổi blockhash, mở ví với `noopener`, liên kết mở thủ công và xử lý lỗi RPC.

## Kiểm tra đã thực hiện

- TypeScript: đạt.
- Unit test blockhash: 10/10 đạt.
- Chromium trên dev server: 320, 390, 768, 1024, 1440 px; không phát hiện tràn ngang trang. Kiểm thêm trạng thái thiếu cấu hình trên mobile.
- Axe: không phát hiện vi phạm trong 5 trạng thái sau khi sửa độ tương phản chữ SOLB.
- Không ghi nhận lỗi JavaScript hoặc asset tải lỗi.
- Đồng hồ có cập nhật.
- Phím Enter trên nút nhận thưởng tạo URL bàn giao sang ví; giao dịch có vùng chữ ký rỗng. Kiểm tra tham số `noopener` và URL liên kết mở thủ công khớp URL bàn giao.
- Điều hướng và FAQ hoạt động bằng bàn phím.
- RPC lỗi hiển thị nút thử lại và liên kết dữ liệu mẫu có nhãn. Thiếu hiện trường thì nút nhận thưởng bị vô hiệu hóa.

**Phạm vi:** script chặn RPC và dùng phản hồi kiểm thử, đồng thời chặn `window.open` để chỉ kiểm tra URL. Không mở ví để ký, không phát giao dịch, không kiểm chứng Devnet trực tiếp trong lượt này. Ảnh minh họa được chụp bằng viewport giả lập; chưa kiểm trên thiết bị vật lý.

## Build chưa được xác minh

Đã chạy `npm run build -w @custos-solana/trang-tan-cong`, nhưng esbuild bị sandbox từ chối đọc thư mục khi nạp `vite.config.ts`. Việc cấp quyền chạy ngoài sandbox ở các lượt trước bị bộ duyệt tự động từ chối vì phiên đăng nhập bị thu hồi. Cần khôi phục đăng nhập môi trường rồi chạy lại production build. Dev server và các kiểm tra trình duyệt ở trên không thay cho bước này.

## Tệp chính

- `apps/trang-tan-cong/src/App.tsx`
- `apps/trang-tan-cong/src/RewardArtwork.tsx`
- `apps/trang-tan-cong/src/attack-design.css`
- `apps/trang-tan-cong/src/fonts.css`
- `apps/trang-tan-cong/src/main.tsx`
- `apps/trang-tan-cong/index.html`
- `scripts/kiem-trinh-duyet/verify-attack-design.py`

## Bằng chứng

- [Desktop](./desktop.png)
- [Toàn trang desktop](./ready-1440.png)
- [Mobile](./ready-390.png)
- [Lỗi RPC có chủ đích](./rpc-error.png)
- [Thiếu cấu hình](./missing-mobile.png)
- [Kết quả kiểm tra](./results.json)

Chạy lại khi dev server attack ở cổng 5189:

```powershell
python -X utf8 scripts/kiem-trinh-duyet/verify-attack-design.py
```
