# Bàn giao demo giao dịch thật Custos

## Cập nhật ví mặc định theo chủ dự án

- Địa chỉ mới: `AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`, cấu hình tại `scripts/demo-wallet-config.ts`, faucet https://faucet.solana.com/.
- Đã đối chiếu keypair local `.devnet/vi-demo.json`: khớp. RPC Devnet ghi 0 lamport lúc kiểm. Không in/commit khoá; không thay manifest on-chain bằng cách sửa nhãn địa chỉ.
- Ví mẫu không sinh ví ngẫu nhiên mặc định nữa. Chọn keypair tại máy để mở quyền ký; không lưu key vào localStorage hoặc upload server. Reload giữ địa chỉ, cần mở keypair lại.
- Script dùng ví mặc định sẽ dừng khi thiếu/sai keypair. Các fixture/replay cũ chưa được dựng lại; không lấy địa chỉ mới thay vào bằng chứng cũ.
- `default-wallet-check.log`: **1063/1063 pass**. Build pass; scanner không thấy khoá trong 24 file. `default-wallet/browser.json`: mở keypair khớp, reload giữ địa chỉ và bỏ quyền ký; desktop/mobile axe pass, không tràn ngang; 0 request gửi/airdrop. Chưa chạy lại các giao dịch on-chain bằng ví mới vì chưa có SOL tại lần kiểm tra.

**Bản hiện tại đã tích hợp vào Ví mẫu (`index.html`) theo yêu cầu làm rõ của chủ dự án.** Đã bỏ HTML/entry `thuc-chien.html` và mục điều hướng “Giao dịch thật”. Hướng dẫn vận hành: [CHAY-DEMO-GIAO-DICH-THAT.md](../../CHAY-DEMO-GIAO-DICH-THAT.md).

## Nghiệm thu bản tích hợp Ví mẫu

- Trang gốc mặc định là **Ví của bạn**: thẻ tài khoản/số dư, gửi 10 DEMO, nhận SOL, công tắc Custos, ứng dụng nhận quà, xác nhận ký, hoạt động trong tab và receipt thật.
- Giữ thiết kế Ví mẫu và component cảnh báo `CanhBao`. Phòng phân tích nằm trong cùng App để giữ bộ kịch bản cũ; ví không bị tạo lại khi đổi tab. URL mock và yêu cầu `#tx` vẫn vào đường phân tích.
- Giữ khả năng dùng diễn giải qua máy chủ AI khi có cấu hình, cùng nhãn nguồn và đường lui tất định. Lượt nghiệm thu local này dùng tất định; không tuyên bố đã kiểm AI live.
- `wallet-execution/browser.json`: **passed: true**, 5 browser send requests gồm 2 setup + 3 thực thi. Chuyển bình thường khi bật Custos, huỷ sau cảnh báo, ký tấn công khi tắt Custos, tạo phiên mới và chuyển bình thường khi tắt đều đạt. Việc chuyển qua Phòng phân tích rồi quay lại giữ đúng địa chỉ/số dư.
- Giao dịch attack trong Ví mẫu: [Explorer Devnet](https://explorer.solana.com/tx/2rbbN3uYaYZxyaXFbKzbYgXsnseKZkYaUUZyvrEvAewsqWnvbKXo9fqXw7P3XsopMLWUDwK6Zz2BnmHTUN4triX4?cluster=devnet), slot **503892555**. Metadata nguồn **490 → 245 DEMO**, chủ mới **ASoJCDwH5Wd7CSKCBWJdqHzaRGUUWoAeDfkJDBJ7A6er**, khớp dự báo.
- `wallet-receipt/browser.json`: chỉ đọc receipt cũ, **0 write request**, desktop 1440/mobile 375 không tràn ngang, 0 axe, 0 console; bảng nhận focus bằng bàn phím. Receipt cũ có nhãn riêng và không được ghi thành hoạt động của ví mới.
- `wallet-check.log`: **1060/1060 tests pass**, typecheck pass. Lần chạy sandbox có 4 bài CLI con lỗi môi trường; chạy lại ngoài sandbox đạt toàn bộ.
- Bản tích hợp chỉ thêm 0,03 SOL Devnet cấp phí cho ví tạm. Số trước đó trong báo cáo bên dưới thuộc các lượt chạy cũ.
- Ảnh `wallet-execution/02-protected.png` chụp giữa hiệu ứng xuất hiện của cảnh báo, nên màu nhạt hơn trạng thái cuối. Probe đã được chỉnh chờ animation trước khi chụp các lượt sau; không dùng ảnh đó để kết luận về độ tương phản cuối.

## Bằng chứng bản đầu trước khi tích hợp (giữ để truy vết)

## Điều đã chạy và quan sát được

| Ca thử | Kết quả thực tế | Bằng chứng |
|---|---|---|
| Tạo phiên riêng | Mint mới, hai tài khoản token mới, 500 DEMO; thu hồi quyền phát hành | `run-02/browser.json`, ảnh `01-normal.png` |
| Custos bật, chuyển bình thường | Nguồn 500 → 490 DEMO, confirmed; dự báo khớp metadata | Receipt đầu trong `run-02/browser.json` |
| Custos bật, giao dịch có hậu quả ẩn | Cảnh báo chuyển token và đổi chủ; người dùng huỷ; không phát sinh request gửi cho thao tác huỷ | Check cancellation và `run-02/02-protected.png` |
| Custos tắt, người dùng đồng ý ký | Nguồn 490 → 245 DEMO, đổi chủ thật; số token còn lại không biến mất nhưng ví cũ mất quyền điều khiển | Receipt attack và `run-02/03-executed.png` |
| Tạo phiên khác, Custos tắt, chuyển bình thường | Phiên mới 500 → 490 DEMO, confirmed | Receipt cuối trong `run-02/browser.json` |
| Tải lại trang, tra cứu receipt đã lưu | Đọc được metadata và chủ hiện tại; không ký/gửi lại | `final-receipt/browser.json` |

Giao dịch đổi chủ đã kiểm chứng: [Solana Explorer — Devnet](https://explorer.solana.com/tx/4mCyh8LVT5jF3ZSjxHMrScVwWJ73bsXuFbv7pTZNohVdmyDfuLNmfM3d8RsneSAeZDQXtfB1Hniat1bbzqh45BiC?cluster=devnet), slot **503885190**. Dữ liệu nguồn là metadata giao dịch; owner đọc riêng ở slot sau xác nhận. Không suy số dư thực tế từ số dự báo.

Lượt `run-02` ghi 5 request gửi của browser: hai lần chuẩn bị phiên và ba lần thực thi. Chuyển SOL thử nghiệm từ helper Node là bước cấp phí riêng. Hai lượt chạy đã cấp tổng 0,06 SOL Devnet cho hai ví tạm; không dùng mainnet hoặc sửa hiện trường token dùng chung.

## Kiểm tra phần mềm

- `npm run check`: **1059/1059 pass**, không skip; log tại `check.log`.
- Typecheck và production build sau sửa UI cuối: pass.
- `node scripts/soi-ro-ri-khoa.mjs apps/demo-wallet/dist`: không thấy khoá riêng trong **30 file** build.
- Chromium desktop 1440 px và mobile 375 px: không tràn ngang; bảng cuộn nhận focus bàn phím; **0 lỗi axe trên trạng thái đã render xong**, 0 lỗi console. Ảnh tại `final-receipt/receipt-1440.png` và `receipt-375.png`.
- Probe cuối có chặn `sendTransaction`/`requestAirdrop`: **0 yêu cầu ghi** trong phép thử khôi phục bằng chứng.
- Kiểm tra có trọng tâm đã phát hiện race khi tra receipt và mất thông tin phiên lúc xác nhận timeout; đã sửa cùng regression tests. Đây không phải audit bảo mật toàn diện.

## Lỗi đã gặp, không xoá bằng chứng thất bại

1. Lượt đầu ở thư mục này tạo phiên/chuyển token thành công nhưng bước tiếp bị RPC công cộng trả 429. Đã thêm retry có giới hạn cho request đọc, không tự retry transport của send/airdrop.
2. `run-02/browser.json` vẫn giữ `passed: false`: các luồng on-chain đã đạt, nhưng axe phát hiện bảng cuộn chưa focus được. Đã thêm vùng có nhãn và `tabIndex`; `final-receipt/browser.json` xác nhận sau sửa.
3. Probe đọc lại ban đầu đo tương phản giữa animation xuất hiện (opacity đang tăng). Probe hiện đợi animation hữu hạn kết thúc rồi kiểm tra, không vô hiệu hoá rule axe.
4. Build trong sandbox gặp giới hạn đọc thư mục cha của esbuild. Chạy lại qua quyền thực thi mở rộng đã thành công; không sửa cấu hình ứng dụng để che lỗi môi trường.

## Ranh giới cần nói đúng khi trình bày

- Đây là **ví thử nghiệm ký giao dịch Devnet thật**, không phải tích hợp extension ví người dùng. Khoá chỉ ở bộ nhớ tab; tải lại sẽ mất quyền ký phiên cũ.
- SDK Custos vẫn chỉ đọc/mô phỏng. Ví tích hợp mới thực thi quyết định ký hoặc huỷ. Bật Custos không có nghĩa SDK có quyền cưỡng chế toàn bộ hệ sinh thái.
- Tắt bảo vệ vẫn xin đồng ý ký. Custos có thể chạy riêng để đo dự báo; kết quả không là điều kiện cho phép ký của nhánh đối chứng.
- Bản này dùng **diễn giải tất định**, không tuyên bố là AI live.
- Mẫu tấn công chứa cả Transfer và SetAuthority. Hai hậu quả phải tách riêng; việc đổi chủ không được mô tả thành rút hết token.
- Chỉ có hai loại giao dịch tự dựng trong bản nâng cấp này. Chưa phải thước đo phát hiện tấn công tổng quát, chưa chứng minh mọi RPC/thiết bị/trình duyệt đều hoạt động.
- SOL/token thử nghiệm còn trong phiên đã đóng có thể không lấy lại được vì khoá không được lưu. Faucet và RPC công cộng vẫn có quota; nên chuẩn bị phiên trước khi diễn.
- Chưa commit, push hoặc deploy bản nâng cấp này.
