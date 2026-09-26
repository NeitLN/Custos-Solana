# @custos-solana/core — thay đổi

## 0.2.0 — 26/09/2026

Kết quả `inspect()` có thể **khác** 0.1.x ở những giao dịch dưới đây. Hợp đồng `InspectResult`
không đổi (không thêm, bớt hay đổi kiểu trường bắt buộc).

**Hành vi — nghiêm hơn**
- Luật 3 bắt cả việc **nâng hạn mức của CÙNG người được uỷ quyền** (ví dụ Approve lại từ 1 lên
  u64::MAX), không chỉ việc đổi người. Facts thêm `delegatedAmountBefore` (tuỳ chọn).
- **Mint không đọc được** (RPC trả `null`, dữ liệu hỏng, lượt đọc lỗi) ⇒ `warning` với
  `TRANG_THAI_DO_KHUYET`, thay vì im lặng và có thể ra `safe`. Bảng chênh lệch hiện số ở
  "đơn vị gốc" và bỏ `soLieu` khi chưa biết `decimals`. Facts thêm `mintKhongDoc` (tuỳ chọn).
- Mô phỏng trả mảng `accounts` **thiếu vị trí** ⇒ vị trí đó là "chưa đo", không còn bị đọc
  thành tài khoản về 0.
- Interpreter (L3) nhận **bản sao** Facts, mã lý do và options — không sửa được kết quả L2
  qua tham chiếu.
- `expectedAction`: lời khai tiếng Anh được so với từ vựng tiếng Việt của L3 theo bảng một
  chiều (`transfer`, `receive`, `approve`). DApp khai `transfer` cho một lệnh chuyển thật
  không còn bị ghi `loiKhaiLech`. `airdrop` vẫn so nguyên văn.

**API mới:** `cungLoaiHanhDong(khai, nhanDien)`, `quyenRutMoRong(tokenAccountFact)`.

**CLI:** lỗi tham số (`--receipt` sai) báo mã 3 ngay, trước mọi lời gọi mạng; thoát bằng
`exitCode` để mã thoát không bị Node trên Windows làm hỏng khi còn kết nối đang đóng.

**Hiệu năng:** đọc mint và PDA metadata trong một lời gọi (bớt một lượt RPC mỗi lần kiểm).
