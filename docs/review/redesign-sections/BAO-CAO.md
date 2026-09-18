# Custos — bản redesign giao diện đã triển khai

Ngày kiểm tra: 18/09/2026.

## Kết quả

Đã triển khai trực tiếp giao diện landing, ví mẫu và Inspector. Hướng thiết kế dùng xanh ngọc làm màu hành động, xanh rừng cho phần kỹ thuật, nền sáng hơi xanh và chữ đậm để đọc rõ khi trình chiếu. Trọng tâm của landing là dữ kiện trước/sau giao dịch: cùng số dư nhưng khác quyền kiểm soát.

### Các phần đã thay đổi

| Phần | Thay đổi và mục đích |
| --- | --- |
| Header | Khoảng cách thoáng hơn, nhận diện Custos rõ, CTA chính nổi bật; giữ menu và bộ chọn VI/EN trên mobile. |
| Hero | Tiêu đề lớn, bố cục hai cột; phiếu giao dịch có đầu màu xanh rừng, vùng số dư lớn và vùng đổi chủ màu cảnh báo riêng. |
| Dải thông tin | Bốn thông tin ngắn, nền trắng, chia nhịp với hero và phần so sánh. |
| So sánh A/B | Đánh dấu A/B, tăng kích thước số dư để thấy hai ca giống nhau ở số tiền; tách rõ hàng quyền kiểm soát. Mobile giữ hai tóm tắt xếp dọc. |
| Dữ kiện chi tiết | Vùng bằng chứng có nền riêng; đổi giữa ca A/B vẫn hiển thị đúng nguồn và đúng dữ kiện. |
| Cách hoạt động | Ba bước có icon riêng, số thứ tự lớn và đường chia; mô tả và các giá trị phụ có cấp độ chữ rõ. |
| Developer | Nền xanh rừng, khung code tối hơn, syntax highlighting, bố cục nội dung và code cân bằng. Khối code cuộn được bằng bàn phím. |
| Tài liệu/bằng chứng | Tiêu đề và giới hạn bên trái, danh sách tài liệu bên phải; mỗi đường dẫn có khoảng cách và đường chia rõ. |
| FAQ | Hai cột trên desktop; câu hỏi mở có nền nhấn; giữ hành vi native details. |
| CTA cuối | Nền xanh nhạt, thông điệp lớn, hai hành động rõ ràng. |
| Footer | Nền xanh rừng, nhóm liên kết gọn, nhắc đúng phạm vi bản thử nghiệm. |
| Ví mẫu | Header và thẻ được làm gọn, nền thống nhất, số dư nổi bật, các nút chọn giao dịch rõ hơn; bổ sung liên kết Inspector trên desktop. |
| Inspector | Có điều hướng Custos, phần giới thiệu riêng, khung nhập liệu rõ ràng và khu vực kết quả tách biệt. Viền input đủ đậm, trạng thái lỗi vẫn dễ nhận ra. |

### Chuyển động

- Một số phần xuất hiện nhẹ khi đi vào khung nhìn: dịch chuyển 16px và tăng độ rõ trong 480ms.
- Nút chính có phản hồi hover và mũi tên dịch chuyển nhẹ.
- Nội dung luôn hiện ngay cả khi animation/IntersectionObserver không có.
- Tôn trọng `prefers-reduced-motion`; bộ kiểm tra đã xác nhận không có animation đang chạy khi bật chế độ này.
- Dải phạm vi Devnet của ví đứng yên để đọc được ngay.

### Các sửa lỗi kèm theo

1. **CSS bị ghi đè trong build nhiều entry:** Vite có thể xuất stylesheet nền sau stylesheet mới. Tăng phạm vi selector cho canvas và biến của trang sản phẩm để thứ tự chunk không đưa nền xanh tím cũ trở lại.
2. **Khối code khó dùng bằng bàn phím trên màn hẹp:** bổ sung `tabIndex` và tên accessible theo ngôn ngữ.
3. **Đường dẫn font phụ thuộc vị trí CSS build:** chuyển sang đường dẫn public root; Vite tự xử lý prefix production. Đã xác nhận Manrope và Be Vietnam Pro tải thành công ở cả dev và preview, không còn cảnh báo font khi build.

## Mã nguồn chính

- `apps/demo-wallet/src/landing/presentation.css`: bố cục, typography, màu và responsive của từng section.
- `apps/demo-wallet/src/landing/DesignIcon.tsx`: icon SVG của các bước và phiếu giao dịch.
- `apps/demo-wallet/src/landing/useSectionMotion.ts`: chuyển động theo viewport, cleanup và reduced motion.
- `apps/demo-wallet/src/landing/Hero.tsx`, `ScenarioExplorer.tsx`, `Sections.tsx`: cấu trúc trình bày các section.
- `apps/demo-wallet/src/product-presentation.css`: giao diện ví và Inspector.
- `apps/demo-wallet/src/Inspector.tsx`: điều hướng, khung nhập và vùng kết quả.
- Các entry `landing.tsx`, `main.tsx`, `soi.tsx` nạp stylesheet tương ứng.

Các chỉnh sửa đã có trong workspace trước lượt làm việc này được giữ lại; stylesheet trình bày mới tách riêng để dễ xem xét và điều chỉnh tiếp.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript | `npm run typecheck` đạt. |
| Toàn bộ test | `npm run check`: 968/968 đạt; các test CLI cần truy cập Devnet. |
| Test landing và cấu trúc heading sau thay đổi accessibility | 17/17 đạt. |
| Production build | Thành công; xem `build.txt`. |
| Bố cục trình duyệt | 21 cấu hình trang/ngôn ngữ/kích thước không tràn ngang. Landing VI/EN: 320, 390, 768, 1024, 1440px. Inspector: 320, 390, 768, 1440px. Ví mock ba mức: 390 và 1440px. Menu EN mở: 320px. |
| Accessibility tự động | 11 trạng thái được quét bằng axe-core với WCAG 2 A/AA và 2.1 AA: không phát hiện violation. Đo sau khi hiệu ứng hữu hạn kết thúc. |
| Tương tác landing | Dữ kiện B hiện đúng, chuyển sang A không giữ lại địa chỉ của B; FAQ mở; đổi ngôn ngữ qua menu; Escape đóng menu và trả focus. |
| Inspector | Dữ liệu sai hiển thị lỗi base64, không gửi request RPC. |
| Ví | Các kết quả mock safe/warning/danger hiển thị trên desktop/mobile, có nhãn mock rõ ràng. |
| JavaScript và tài nguyên | Không có pageerror hoặc tài nguyên local trả HTTP lỗi trong lượt kiểm tra tự động. |
| Font dev/production | Hai font landing tải thành công ở cả hai chế độ. |

Lần test đầu trong môi trường hạn chế mạng có bốn lỗi CLI `fetch failed`. Chạy lại với kết nối Devnet: 18/18 test CLI đạt và sau đó toàn bộ 968 test đạt. Không sửa engine/CLI để xử lý hiện tượng môi trường này.

Accessibility tự động không thay thế việc thử bằng screen reader và thiết bị thật. Kiểm tra ví dùng fixture mock để xem UI; chưa dùng lượt này để kiểm chứng lại luồng ký/gửi giao dịch thật. Các trang số liệu và phỏng vấn không nằm trong phần redesign này.

## Ảnh và kết quả có thể xem lại

- [Landing desktop](after/landing.png)
- [Hero](after/hero.png)
- [Landing mobile](after/mobile.png)
- [Ví mẫu](after/wallet.png)
- [Inspector](after/inspector.png)
- [Cảnh báo danger desktop](verification/wallet-danger-1440.png)
- [Inspector mobile](verification/inspector-mobile.png)
- [Kết quả kiểm tra tương tác và accessibility](verification/results.json)
- [Kiểm tra font và bố cục production](after/browser.json)
- [Kiểm tra font và bố cục dev](dev/browser.json)
- [Nhật ký toàn bộ test](check.txt)

Ảnh trước chỉnh sửa nằm trong `before/` để đối chiếu.

## Chạy và kiểm tra lại

Từ thư mục gốc:

```powershell
npm run vi
```

Mở:

- `http://localhost:5188/gioi-thieu.html`
- `http://localhost:5188/?khongkhoa=1`
- `http://localhost:5188/soi.html`

Với production preview:

```powershell
npm run build -w @custos-solana/demo-wallet
npm run preview -w @custos-solana/demo-wallet -- --port 5198
```

Sau đó mở `http://localhost:5198/Custos-Solana/gioi-thieu.html`.

Khi preview đang chạy, kiểm tra UI:

```powershell
python -X utf8 scripts/kiem-trinh-duyet/verify-redesign.py
python -X utf8 scripts/kiem-trinh-duyet/review-redesign.py after
```

Các script ghi báo cáo trong thư mục này. Cần Python Playwright/Chromium đã cài và `axe-core` từ dependencies của repository.
