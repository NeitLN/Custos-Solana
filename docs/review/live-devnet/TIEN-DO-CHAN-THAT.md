# Triển khai đặc tả demo chân thật

Nguồn: `docs/DAC-TA-DEMO-CUSTOS-CHAN-THAT.md`.

- [x] P0: decision/override, form gửi, receipt nguồn/đích và quyền sử dụng.
- [x] P0: manifest công khai, recovery, lịch sử, nhãn nguồn AI.
- [x] P1: registry, đổi chủ, approve/delegate/revoke và chuyển thêm.
- [x] P2: quyền đóng tài khoản, ví khách cục bộ và chuyển động theo dữ kiện.
- [x] Kiểm thử unit/integration, build, browser và Devnet; báo cáo đúng giới hạn.
- [ ] Wallet adapter extension, browser ngoài Chromium và video pitch: chưa thực hiện.

Quyết định triển khai: tiếp tục tại workspace hiện có vì phần thực thi nền đang
chưa commit; không chuyển sang bản HEAD thiếu các thay đổi này. Không commit/push.
Giữ nguyên SDK/types/luật; mọi bổ sung nằm ở consumer ví/dApp.
Prediction quyền lấy từ Facts qua Interpreter, không phân tích label tiếng Việt.
Quyền theo dõi đọc sau transaction được ghi rõ slot, không coi là snapshot lịch sử.

UI giữ bảng màu xanh rừng/kem và font hiện có. Điểm nhấn là bảng hậu quả thực tế,
thẻ quyền sử dụng và timeline do trạng thái thật điều khiển; không thêm animation giả.

Kết quả chi tiết: [BAO-CAO-CHAN-THAT.md](BAO-CAO-CHAN-THAT.md).
Suite cuối: 1080/1080; run4 có 12 receipt nghiệp vụ confirmed (16 sends gồm setup).
Vá sau review: recovery setup hết hạn, CAS giữa tab, cấm discard pending,
giải phóng lock khi subscriber lỗi; có regression test và browser fault fixture.
