# Custos — giao diện cinematic đã triển khai

## Những gì đã thay đổi

- Hero chuyển sang nền xanh rừng tối, ánh sáng mềm và canvas với quỹ đạo, điểm sáng chuyển động.
- Tiêu đề xuất hiện từng từ, vẫn giữ nguyên câu hoàn chỉnh cho screen reader.
- Phiếu giao dịch có chiều sâu: bóng mềm, đường sáng, phản hồi nghiêng nhẹ theo con trỏ trên desktop.
- Hậu cảnh có parallax khi cuộn; thanh mảnh ở đầu trang biểu thị tiến độ đọc.
- Thêm đoạn chuyển cảnh giữa so sánh A/B và quy trình: chữ chạy ngang, logo nổi, vòng quỹ đạo xoay và điểm chuyển động.
- Các bước quy trình xuất hiện lần lượt; khung code mở bằng hiệu ứng quét; liên kết và nút có phản hồi hover.
- Header tối và CTA xanh nhạt đồng bộ với bộ logo Custos mới.
- Có nút **Dừng chuyển động / Bật chuyển động**, dịch đầy đủ VI/EN.

## Chuyển động và hiệu năng

- Canvas giới hạn nhịp vẽ khoảng 30fps, DPR tối đa 1.5 desktop và 1 trên mobile; số điểm mobile giảm một nửa.
- Canvas ngừng vẽ khi hero ra khỏi viewport hoặc tab bị ẩn.
- Pointer tilt chỉ bật với con trỏ chính xác; không yêu cầu thao tác hover trên điện thoại.
- Hiệu ứng dùng CSS và Web Animations API; không thêm dependency animation, không tải video nền bên ngoài.
- Dữ liệu A/B và nội dung cảnh báo không thay đổi theo animation. Canvas chỉ là hình ảnh trang trí.
- `prefers-reduced-motion` được theo dõi cả khi trang đang mở: tắt chuyển động, giữ nội dung. Người dùng cũng có thể dừng chủ động bằng nút trên trang.

## Kết quả kiểm tra

- Production build thành công bằng `npm run build -w @custos-solana/demo-wallet`.
- Typecheck đạt; 17/17 test landing và heading đạt.
- Chromium xác nhận canvas thực sự chuyển động qua so sánh hai khung hình; pause dừng canvas/CSS/JS; resume hoạt động.
- Xác nhận canvas ngừng vẽ ngoài viewport và thay đổi tùy chọn reduced motion khi đang mở trang được áp dụng.
- 10 cấu hình VI/EN ở 320, 390, 768, 1024, 1440px không tràn ngang.
- Ba trạng thái được quét axe (desktop dừng chuyển động, menu mobile EN, dữ kiện B VI) không có violation được phát hiện.
- Menu bằng bàn phím, trả focus khi Escape và dữ kiện A/B vẫn hoạt động. Không có pageerror trong lượt kiểm tra.

Các kiểm tra thực hiện trên Chromium tự động; chưa đo FPS trên điện thoại vật lý. Không coi nhịp vẽ cấu hình là bằng chứng đảm bảo FPS thực tế trên mọi thiết bị.

## Xem kết quả

- [Video kiểm tra cinematic](cinematic-demo.webm)
- [Hero](hero.png)
- [Đoạn chuyển cảnh](bridge.png)
- [Phần developer](developer.png)
- [Trang đầy đủ](full-page.png)
- [Kết quả kiểm tra máy đọc được](results.json)

## Mã nguồn

- `apps/demo-wallet/src/landing/CinematicScene.tsx`: canvas, nội dung VI/EN và đoạn chuyển cảnh.
- `apps/demo-wallet/src/landing/cinematic.css`: giao diện và keyframes.
- `apps/demo-wallet/src/landing/useSectionMotion.ts`: choreography, observer, pointer tilt và parallax.
- `LandingPage.tsx`: điều khiển pause/reduced motion; `Hero.tsx`: tiêu đề và tích hợp scene.
- `scripts/kiem-trinh-duyet/verify-cinematic.py`: kiểm tra và quay video.

Chạy `npm run vi`, rồi mở `http://localhost:5188/gioi-thieu.html`.
Để chạy kiểm tra trình duyệt, mở production preview ở cổng 5198 và chạy
`python -X utf8 scripts/kiem-trinh-duyet/verify-cinematic.py`.
