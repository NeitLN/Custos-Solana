# Tinh chỉnh hero Custos — điểm nhấn chữ ký

## Thay đổi

- Tiêu đề có nét đậm rõ hơn và điểm nhấn riêng: chữ “sắp ký” màu xanh đậm trên mảng xanh sáng, góc cắt lấy từ ngôn ngữ hình học của logo. Mảng nền nghiêng nhẹ, chữ giữ thẳng để dễ đọc.
- Kicker dùng biểu tượng khiên; mô tả có khoảng cách và độ đậm thấp hơn tiêu đề.
- Nút demo chuyển thành dạng bo tròn với mũi tên trong một vòng tròn riêng. Ghi chú Devnet đi cùng nút để giữ rõ phạm vi thử nghiệm.
- Liên kết A/B có minh họa hai phiếu và câu dẫn “Cùng số dư. Khác quyền kiểm soát.”; mở đúng phần trải nghiệm hiện có bằng chuột hoặc bàn phím.
- Bố trí riêng cho VI/EN và mobile. Giữ nguyên tên truy cập của h1, nội dung dữ liệu mẫu, nút dừng chuyển động và chế độ giảm chuyển động.

## Xác minh phiên bản này

- TypeScript: đạt.
- Các kiểm tra landing và h1: 17/17 đạt.
- Chromium trên dev server: 320, 390, 768, 1024, 1440 px × VI/EN; không tràn ngang trang.
- Axe: không phát hiện vi phạm trong bốn trạng thái desktop/mobile × VI/EN được kiểm tra.
- Không ghi nhận lỗi JavaScript; font tải thành công; chuyển động và nút dừng hoạt động.
- Đã xem ảnh render desktop và mobile.

Production build chưa được xác minh lại. Lượt trước, build bị giới hạn sandbox và yêu cầu quyền chạy ngoài sandbox bị bộ duyệt tự động từ chối do refresh token đăng nhập bị thu hồi. Không coi kiểm tra dev server là bằng chứng production build thành công.

## Bằng chứng

- [Riêng nội dung hero](./hero-story.png)
- [Toàn hero desktop](./hero.png)
- [Mobile](./mobile.png)
- [Kết quả kiểm tra](./results.json)

Chạy lại kiểm tra với dev server đang hoạt động:

```powershell
python -X utf8 scripts/kiem-trinh-duyet/verify-typography.py http://localhost:53579/ hero-focus
```
