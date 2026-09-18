# Custos — hoàn thiện giao diện toàn bộ website

Ngày kiểm tra: 19/09/2026. Chỉnh trực tiếp mã nguồn; kiểm tra bằng Chromium trên các Vite dev server đang chạy. Đây không phải báo cáo kiểm chứng bản production.

## Những thay đổi của lượt này

### Ngôn ngữ thiết kế chung

- Dùng font Be Vietnam Pro được phục vụ cục bộ cho toàn bộ công cụ Custos. Tách khai báo font thành `product-fonts.css` để ví mẫu, Inspector, số liệu và phỏng vấn dùng cùng một nguồn.
- Đồng bộ điều hướng Giới thiệu → Ví mẫu → Inspector → Số liệu. Trang hiện tại được đánh dấu bằng nền xanh đậm và `aria-current="page"`; các đường dẫn theo `BASE_URL` của ứng dụng.
- Nền sáng hơi xanh, chữ xanh đậm, điểm nhấn olive; giữ các màu cảnh báo theo ý nghĩa riêng của kết quả phân tích.
- Tăng cỡ chữ nhỏ trên landing, ví mẫu và trang attack. Giữ hiệu ứng cinematic hiện có, nút dừng chuyển động và hỗ trợ giảm chuyển động của hệ điều hành.

### Ví mẫu

- Tiêu đề lớn hơn, mô tả và chú thích dễ đọc hơn; phân cấp rõ giữa ví, lựa chọn tình huống và kết quả.
- Điều hướng mới có trạng thái đang ở Ví mẫu.
- Bố cục riêng cho màn hình rộng nhưng thấp. Ở 1366×768, hai lựa chọn tình huống xuất hiện đầy đủ ngay trong khung nhìn đầu tiên.
- Không thay đổi việc ký, xác nhận, điều kiện bảo vệ hay dữ liệu kết quả.

### Inspector

- Bố cục hai cột trên desktop: dữ liệu đầu vào và kết quả phân tích. Mobile chuyển thành một cột.
- Tiêu đề mới, đánh số hai vùng chức năng, minh hoạ Custos ở trạng thái chưa kiểm tra và danh sách những thông tin cần đọc trong kết quả.
- Trạng thái đang mô phỏng hiển thị rõ, nút kiểm tra bị vô hiệu trong lúc chạy, nút huỷ tiếp tục hoạt động.
- Sau kết quả, lỗi hoặc huỷ, focus chuyển tới vùng kết quả; nếu vùng này ngoài khung nhìn, trang cuộn tới nó. Không chuyển focus khi đang gõ dữ liệu.
- Lời giải thích việc gửi dữ liệu tới RPC vẫn nằm trước ô nhập. Các thông tin về ví được bảo vệ, phần chưa đọc hiểu, biên lai chia sẻ và việc Inspector không ký vẫn được giữ lại.

### Số liệu

- Trình bày theo dạng hồ sơ kiểm chứng, tiêu đề “Có số liệu. Có cả giới hạn.”, ngày cập nhật lấy từ dữ liệu thực.
- Mục lục bằng liên kết thật, tự ẩn mục không có dữ liệu. Các phép đo vẫn đi cùng ngày đo, phương pháp và giới hạn.
- Trên desktop, tiêu đề mục nằm ở cột trái, số liệu và giải thích ở cột phải. Mobile sắp xếp lại theo thứ tự đọc.
- Trạng thái đang tải và không tải được số liệu giữ nguyên tiêu đề, điều hướng; lỗi có nút tải lại.
- Không sinh thêm số liệu, không cập nhật giả ngày đo, không biến dữ liệu lịch sử thành kết quả kiểm tra mới.

### Phỏng vấn và attack

- Phỏng vấn có cùng font, header và điều hướng; tăng bề rộng vùng đọc và kích thước nhập liệu. Giữ thứ tự câu hỏi, thang chấm và logic lưu trữ.
- Trang attack giữ thương hiệu giả lập SolBonus với tông plum/cam, tăng cỡ chữ chú thích và sửa cách xuống dòng của đồng hồ trên mobile.
- Nhãn trang lừa đảo giả, Devnet, phần thưởng hư cấu và các trạng thái lỗi vẫn hiện rõ.

## Kết quả xác minh

| Kiểm tra | Kết quả của lượt này |
|---|---|
| `npm run typecheck` | Đạt |
| Các bài kiểm tra landing, tiêu đề trang, đầu vào Inspector, dữ liệu phỏng vấn và blockhash | 58/58 đạt |
| `git diff --check` | Không phát hiện lỗi khoảng trắng; Git có cảnh báo LF/CRLF của môi trường Windows |
| Landing VI/EN | 10 trường hợp kích thước, 4 lượt axe, không lỗi JS ghi nhận |
| Ví demo | 12 trường hợp bố cục/trạng thái, 10 lượt axe, không lỗi JS ghi nhận |
| Attack | 6 trường hợp bố cục/trạng thái, 5 lượt axe, không lỗi JS hay lỗi tải asset ghi nhận |
| Inspector, số liệu, phỏng vấn | 17 trường hợp bố cục/trạng thái, 10 lượt axe, không lỗi JS hay lỗi tải asset ghi nhận |
| Ví demo 1366×768 | Nút chọn tình huống nằm trọn trong khung nhìn; thêm 1 lượt axe đạt |
| Inspector mobile 390×844 | Thông báo lỗi nhận focus và nằm trọn trong khung nhìn |

Tổng cộng 30 lượt quét axe không báo vi phạm trong các nhóm WCAG 2 A/AA và WCAG 2.1 AA được bật. Đây là kiểm tra tự động ở các trạng thái đã chạy, không phải chứng nhận toàn bộ khả năng truy cập.

Kiểm tra hành vi gồm:

- Chuyển tới các mục bằng chứng bằng bàn phím.
- Nhập rỗng/base64 không hợp lệ ở Inspector không gọi RPC.
- Chọn tệp đầu vào Inspector, hiện trạng thái chờ và huỷ lượt kiểm.
- Focus kết quả sau lỗi; bài kiểm tra đã thất bại trước khi thêm xử lý focus và đạt sau khi sửa.
- Kết quả ví mẫu safe/warning/danger từ fixture có nhãn mock rõ ràng; huỷ và bật/tắt bảo vệ.
- Attack dựng yêu cầu giao dịch chưa ký, giữ đường dẫn sang ví và phương án mở thủ công; không mở ví hay gửi giao dịch thật.
- Dừng chuyển động landing, liên kết SDK/bằng chứng và hai ngôn ngữ.

## Phạm vi và giới hạn

- RPC ngoài máy được chặn hoặc thay bằng phản hồi lỗi có chủ ý trong kiểm tra giao diện. Không ký, gửi giao dịch hay chạy đánh giá hiệu năng Devnet thật.
- Trang phỏng vấn được kiểm tra bố cục và tình huống RPC không khả dụng; chưa xác minh lại toàn bộ phiên phỏng vấn có kết quả mô phỏng thành công trên Devnet trong lượt này.
- Không thực hiện khảo sát, đo thị trường hay tạo thêm biên bản phỏng vấn.
- `npm run build -w @custos-solana/demo-wallet` không chạy thành công: esbuild báo `Cannot read directory "../../../..": Access is denied` khi nạp cấu hình Vite. Build production vẫn cần xác minh trong môi trường có quyền phù hợp. Typecheck và dev server không thay thế kiểm tra build.
- Chưa deploy. Các thay đổi trước đó trong working tree được giữ nguyên.

## Ảnh và dữ liệu kiểm tra

- [Inspector desktop](soi-desktop.png), [Inspector mobile](soi-390.png), [lỗi Inspector mobile](inspector-error-mobile.png).
- [Trang số liệu desktop](so-lieu-desktop.png), [toàn trang số liệu mobile](so-lieu-390.png).
- [Ví mẫu trên khung trình chiếu 1366×768](demo-1366.png).
- [Landing](landing/hero.png), [ví mẫu](../demo-design/desktop.png), [attack](../attack-design/desktop.png).
- Kết quả máy đọc: `tool-results.json`, `projection-results.json`, `mobile-focus.json`, `landing/results.json`; báo cáo ví và attack nằm ở các thư mục tương ứng.

Mở local: `http://localhost:53579/gioi-thieu.html`, `http://localhost:53579/`, `http://localhost:53579/soi.html`, `http://localhost:53579/so-lieu.html`, `http://localhost:5189/`.
