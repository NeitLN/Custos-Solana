# Thiết kế lại trang demo Custos

## Giao diện đã triển khai

- Header có tên Custos Demo, mô tả ví mẫu tích hợp SDK và các đường dẫn Giới thiệu, Inspector, Số liệu. Inspector vẫn truy cập được trên điện thoại.
- Phần mở đầu “Một giao dịch. Nhìn rõ trước khi ký.” giải thích hành động tiếp theo. Chỉ dẫn ba bước phản ánh trạng thái chọn tình huống, đang phân tích và đọc kết quả.
- Bố cục desktop: thẻ ví bên trái, vùng phân tích rộng hơn bên phải. Mobile chuyển thành một cột.
- Thẻ ví màu xanh đậm, số dư xanh nhạt, nút sao chép có tương phản rõ. Số dư vẫn lấy từ dữ liệu thật; khi không đọc được, hiển thị dấu gạch ngang.
- Hai tình huống có vùng bấm lớn và biểu tượng riêng. Công tắc Custos giữ nguyên hành vi, có focus bàn phím và trạng thái tắt riêng.
- Màn chờ phân tích có SVG Custos cùng hai phiếu giao dịch; hình minh họa tĩnh không giả lập kết quả hay trạng thái đang quét.
- Thay số liệu ví dụ trên màn chờ bằng các nhãn “Trước → Sau”, “Lý do cảnh báo”, “Phạm vi đã đọc”, tránh gây nhầm với kết quả của giao dịch hiện tại.
- Font Be Vietnam Pro tự lưu trong dự án, hỗ trợ đầy đủ tiếng Việt. Stylesheet mới chỉ áp dụng cho trang demo.
- Giữ nguyên logic phân tích, điều kiện ký, màu và nội dung các mức cảnh báo. Không thực hiện ký hoặc gửi giao dịch trong quá trình kiểm tra.

## Xác minh

- TypeScript: đạt.
- Kiểm tra landing và h1: 17/17 đạt.
- Chromium trên dev server: 5 kích thước trạng thái nghỉ (320/390/768/1024/1440 px), ba mức cảnh báo trên desktop/mobile và một trạng thái lỗi RPC; không tràn ngang trang trong 12 cấu hình này.
- Axe: không phát hiện vi phạm ở 10 trạng thái được kiểm tra.
- Không ghi nhận lỗi JavaScript.
- Kết quả xuất hiện nhận focus, bước hiện tại chuyển sang “Đọc kết quả”. Huỷ có thông báo và trả bước hiện tại về chọn tình huống.
- Công tắc điều khiển được bằng bàn phím.
- Phân biệt được đang tải cấu hình, chưa dựng hiện trường và cấu hình hỏng.
- Đã xem ảnh render desktop/mobile, bao gồm trạng thái nguy hiểm.

Các mức safe/warning/danger dùng fixture qua query `mock`, có nhãn mock rõ trên trang. Script chặn RPC bên ngoài và trả lỗi có chủ đích để kiểm tra giao diện khi không kết nối được; không chứng minh kết nối Devnet thực tế hoặc độ đúng của engine trong lượt này. Các kiểm tra trình duyệt dùng viewport giả lập, không thay cho kiểm tra thiết bị vật lý.

## Build còn bị chặn

Lệnh `npm run build -w @custos-solana/demo-wallet` đã được chạy nhưng không hoàn tất: esbuild báo không có quyền đọc thư mục khi nạp `vite.config.ts`. Lượt yêu cầu chạy ngoài sandbox trước đó bị bộ duyệt tự động từ chối vì refresh token phiên đăng nhập đã bị thu hồi. Cần khôi phục đăng nhập môi trường trước khi xác minh production build. Không coi dev server chạy được là build production đã đạt.

## Tệp chính

- `apps/demo-wallet/src/App.tsx`
- `apps/demo-wallet/src/DemoScanArtwork.tsx`
- `apps/demo-wallet/src/demo-design.css`
- `apps/demo-wallet/src/main.tsx`
- `scripts/kiem-trinh-duyet/verify-demo-design.py`

## Ảnh và kết quả

- [Desktop](./desktop.png)
- [Mobile](./idle-390.png)
- [Cảnh báo nguy hiểm — mock](./danger-1440.png)
- [Lỗi RPC có chủ đích](./rpc-error.png)
- [Kết quả kiểm tra](./results.json)

Chạy lại với dev server đang hoạt động:

```powershell
python -X utf8 scripts/kiem-trinh-duyet/verify-demo-design.py http://localhost:53579/
```
