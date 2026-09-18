# Custos — typography và hình ảnh chuyển động

## Thiết kế đã triển khai

- Đổi font tiêu đề landing từ Manrope sang Be Vietnam Pro tự lưu trong dự án. Tiêu đề hero kết hợp nét 400 và 700, tăng kích thước, bố trí dòng riêng cho tiếng Việt và tiếng Anh. Cụm nhấn màu xanh có nét đánh dấu mảnh phía dưới.
- Cân lại typography các tiêu đề mục; giữ phần mô tả nhẹ hơn để phân cấp với nội dung chính. Các chữ có dấu tiếng Việt dùng đúng font đã tải, không phụ thuộc dịch vụ font bên ngoài lúc mở trang.
- Thêm hình Custos dạng khối nổi bằng SVG, dùng đúng đường nét biểu tượng hiện có, kết hợp ánh sáng, quỹ đạo và đường tín hiệu. Hình minh họa chuyển động nhẹ phía trên phiếu giao dịch, không biểu thị một lượt kiểm tra trực tiếp hay kết quả mới.
- Thiết kế lại dải thông tin thành bốn liên kết có minh họa riêng: môi trường Devnet → demo, SDK → phần tích hợp, Inspector → trang kiểm giao dịch, bằng chứng → phần dữ kiện.
- Các liên kết có trạng thái hover và focus; điện thoại hiển thị thành lưới hai cột.
- Chuyển động mới dùng chung nút dừng hiệu ứng và thiết lập giảm chuyển động của hệ điều hành.

## Kiểm tra thực tế

- `npm run typecheck`: đạt.
- Hai bộ kiểm tra `landing.test.ts` và `moiTrangCoH1.test.ts`: 17/17 đạt.
- `git diff --check`: đạt, chỉ có thông báo chuyển đổi LF/CRLF.
- Chromium trên dev server: 10 cấu hình, gồm 320/390/768/1024/1440 px × VI/EN; không phát hiện tràn ngang toàn trang.
- Font tiếng Việt tải thành công; tên truy cập của h1 được giữ đầy đủ.
- SVG có chuyển động, nút dừng ngừng các animation; chế độ giảm chuyển động hoạt động.
- Link demo/Inspector có đường dẫn đúng; phím Enter mở đúng anchor SDK và bằng chứng.
- Axe WCAG 2 A/AA và 2.1 AA: không phát hiện vi phạm trong bốn trạng thái desktop/mobile × VI/EN đã kiểm tra.
- Không ghi nhận lỗi JavaScript trong lượt chạy trình duyệt.

Đây là kiểm tra Chromium với viewport giả lập, chưa phải kiểm tra thiết bị vật lý hoặc chứng nhận accessibility toàn diện.

## Bước còn bị chặn

Production build chưa được xác minh cho phiên bản này. Vite build trong sandbox bị từ chối truy cập thư mục; yêu cầu chạy build ngoài sandbox bị bộ duyệt tự động từ chối vì refresh token của phiên đăng nhập đã bị thu hồi. Cần đăng nhập lại môi trường rồi chạy:

```powershell
npm run build -w @custos-solana/demo-wallet
```

Việc tải font mới cũng bị cùng cơ chế từ chối. Phiên bản này chủ động dùng font tiếng Việt đã có trong dự án; không có liên kết font bên ngoài mới.

## Bằng chứng và cách kiểm lại

- [Hero desktop](./hero.png)
- [Hero mobile](./mobile.png)
- [Dải liên kết desktop](./destinations.png)
- [Dải liên kết mobile](./destinations-mobile.png)
- [Kết quả trình duyệt](./results.json)

```powershell
python -X utf8 scripts/kiem-trinh-duyet/verify-typography.py http://localhost:53579/
```

Script cũng nhận base URL của production preview. Các kết quả trong thư mục này được ghi từ dev server, không phải production build mới.

Các tệp triển khai: `Hero.tsx`, `InspectionArtwork.tsx`, `cinematic.css` trong `apps/demo-wallet/src/landing/`. Không sửa logic phân tích giao dịch hoặc dữ liệu mẫu.
