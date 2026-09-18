# Tinh chỉnh hai khu vực giao diện Custos

Ngày kiểm tra: 19/09/2026.

## Thay đổi

### Hành trình từ giao dịch đến quyết định

- Thay dải chữ chạy quá lớn bằng ba chặng có thứ tự: Mô phỏng → Đọc dữ kiện → Bạn quyết định.
- Mỗi chặng có số thứ tự, mô tả ngắn và đường sáng chuyển động nhẹ; nội dung luôn đứng yên để đọc được đầy đủ.
- Desktop hiển thị ba cột; điện thoại chuyển thành một cột.
- Điều chỉnh kích thước tiêu đề, khoảng cách và tương quan với biểu tượng Custos bên dưới.
- Hiệu ứng tuân theo nút dừng chuyển động và thiết lập giảm chuyển động của hệ điều hành.

### Tích hợp SDK

- Thay các hộp và mũi tên rời bằng sơ đồ dọc có đường nối liên tục, biểu tượng và mô tả từng bước.
- Nhấn mạnh bước Custos phân tích bằng logo và nền xanh nhẹ.
- Phân biệt phần phân tích của SDK với việc kiểm tra phiên, sự đồng ý và điều kiện ký do ứng dụng ví quản lý.
- Căn sơ đồ và ví dụ TypeScript thành hai cột; tiêu đề phía trên, ghi chú và liên kết tài liệu phía dưới.
- Trên điện thoại, nội dung xếp theo thứ tự đọc. Khung code có vùng cuộn ngang riêng và có thể nhận focus bằng bàn phím.
- Hoàn thiện câu chữ tiếng Việt và tiếng Anh, bao gồm chú thích trong ví dụ code.

## Xác minh

- TypeScript: đạt.
- Kiểm tra UI bằng Node: 17/17 đạt.
- Production build của `@custos-solana/demo-wallet`: đạt.
- Chromium: 320, 390, 768, 1024 và 1440 px, mỗi kích thước ở cả VI và EN; không phát hiện tràn ngang trang.
- Canvas chuyển động, phản hồi con trỏ, dừng/tiếp tục, dừng khi ra khỏi viewport và thay đổi thiết lập giảm chuyển động: đạt.
- Menu bàn phím và tương tác xem dữ kiện A/B: đạt.
- Axe: không phát hiện vi phạm trong ba trạng thái được kiểm tra. Đây là kiểm tra tự động có giới hạn, không phải chứng nhận khả năng tiếp cận toàn diện.
- Không ghi nhận lỗi trình duyệt trong lượt chạy kiểm tra.

Kiểm tra responsive được thực hiện bằng Chromium với viewport giả lập; chưa kiểm tra trên thiết bị điện thoại vật lý.

## Bằng chứng

- [Kết quả kiểm tra trình duyệt](./results.json)
- [Hành trình ba chặng](./bridge.png)
- [Sơ đồ SDK và ví dụ TypeScript](./developer.png)
- [Toàn trang](./full-page.png)
- [Video tương tác](./cinematic-demo.webm)

## Các tệp triển khai chính

- `apps/demo-wallet/src/landing/CinematicScene.tsx`
- `apps/demo-wallet/src/landing/Sections.tsx`
- `apps/demo-wallet/src/landing/content.ts`
- `apps/demo-wallet/src/landing/cinematic.css`

Chạy lại kiểm tra trình duyệt với script `scripts/kiem-trinh-duyet/verify-cinematic.py polish-sections` khi production preview đang được phục vụ ở cổng 5198.
