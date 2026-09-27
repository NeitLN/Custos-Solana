# Chạy thử Custos và ưu tiên nâng cấp chung kết

Ngày kiểm: 27/09/2026. HEAD `964363a2232c681852cce30b77fe0a5b6b22913b` cộng working tree có thay đổi sẵn. Mục tiêu: kiểm sản phẩm hiện tại để lập roadmap Technical, không sửa implementation trong lượt này.

**Kết luận:** nền test và các bản vá trước đang qua; rủi ro trình diễn lớn nhất quan sát được là RPC đọc tài khoản không hoàn tất, trong khi balance/lịch sử vẫn trả lời. Cần ưu tiên vận hành live, replay theo kịch bản và đường xem bằng chứng. Luồng override/thực thi/quyền đã có, không nên xây lại.

Roadmap triển khai: [ROADMAP-CUSTOS-CHUNG-KET.md](../../roadmap/ROADMAP-CUSTOS-CHUNG-KET.md).

## Phạm vi và giới hạn

- Build review từ source, `envFile:false`, không đọc keypair hoặc `.env`. Giữ entry của ví/landing/Inspector/số liệu/phỏng vấn; build cả dApp đạo cụ. Base cục bộ `/` và `/tan-cong/`.
- Đây là build review riêng; không phải kiểm deployment công khai, không chứng minh cấu hình AI trên deployment, không kiểm đường base GitHub Pages. Attack build review không áp dụng manualChunks của cấu hình release; số chunk trong log không dùng làm benchmark release.
- Chromium headless, viewport desktop 1440 và mobile 390 ở các bề mặt ghi trong script; không phải thiết bị mobile thật. Quét ban đầu dùng reduced motion. Chưa kiểm screen reader, Firefox/WebKit hoặc performance animation.
- Chỉ đọc Devnet; chặn RPC ghi trong browser harness. Không nạp keypair, không ký, không gửi, không faucet. Vì vậy **không có receipt thực thi mới** trong lượt này.
- Lần browser đầu bị `ERR_NETWORK_ACCESS_DENIED`; sau khi được phép chạy ngoài hạn chế mạng, đã đọc được balance/lịch sử và tiếp tục kiểm. Không gộp lỗi môi trường đầu tiên với kết quả endpoint ở lượt sau.

## Kiểm tra đã chạy

| Phép kiểm | Kết quả | Artifact |
|---|---|---|
| `npm run check` | Typecheck qua; **1.136 test qua, 0 fail, 0 skip** | [check.log](bang-chung/check.log) |
| Sáu regression của báo cáo trước | **6 qua, 0 fail** | [regression.log](bang-chung/regression.log) |
| `npm run replay-rpc` | **29/29**, 0 hỏng, 0 thiếu fixture | [replay.log](bang-chung/replay.log) |
| Build hai ứng dụng trong thư mục review | Qua; có cảnh báo kích thước chunk | [build.log](bang-chung/build.log), [script](bang-chung/build.mjs) |
| Quét bundle bằng scanner của repo | Không thấy private key trong **27 file scanner kiểm** | [secret-scan.log](bang-chung/secret-scan.log) |
| 9 bề mặt/trạng thái UI ban đầu | Không lỗi JS, không overflow; 1 finding axe `region` ở banner mock | [browser.json](bang-chung/browser.json), [script](bang-chung/browser.py) |
| 6 trạng thái tương tác | Mở ví khoá, 3 ca live, thẻ mock, Inspector input sai | [flows.json](bang-chung/flows.json), [script](bang-chung/flows.py) |
| Probe riêng bốn phương thức RPC | Hai trả HTTP 200; hai quá hạn 8 giây | [rpc-read.json](bang-chung/rpc-read.json), [script](bang-chung/rpc-read-probe.mjs) |
| Script mô phỏng 9 kịch bản | **Không hoàn tất**, chỉ in endpoint và ví rồi chờ; đã dừng tiến trình | [devnet-simulation.log](bang-chung/devnet-simulation.log) |

Replay có 12 mẫu ghép lô account theo địa chỉ từ response đã ghi. Cả 29 mẫu lệch Facts đóng băng cũ được script báo riêng; số “qua” là theo kiểm replay hiện hành, không phải khớp tuyệt đối mọi field với snapshot cũ. Replay không thực thi SVM mới, không phải 29 giao dịch đã gửi.

## Điều thấy trên sản phẩm

### 1. Phòng phân tích đã mở mặc định, người mới không cần khoá

[Ảnh desktop](bang-chung/wallet.png), [mobile](bang-chung/wallet-mobile.png). Chín nút tình huống dùng được ở màn vào. Lỗi ngõ cụt không có keypair trong báo cáo trước không còn đúng với màn mặc định này. Tab Ví của bạn vẫn yêu cầu đúng keypair khi ký — đúng ranh giới hiện hành.

### 2. Live chỉ sống một phần

Trong lượt browser có mạng, ba ca `Nhận thưởng nhưng token rời ví`, `Giao dịch lành tính — đối chứng`, `Không rõ đang bảo vệ ai` đều hiện quá hạn 12 giây. [Ảnh lỗi](bang-chung/live-danger.png), [log trạng thái](bang-chung/flows.json).

Probe độc lập cùng endpoint công cộng:

- `getLatestBlockhash`: 316 ms, HTTP 200.
- `getBalance` của ví cố định: 300 ms, HTTP 200.
- `getAccountInfo` và `getMultipleAccounts`: đều 8.003 ms rồi timeout theo hạn của probe.

Lượt browser đã đọc được 500 token thử nghiệm và lịch sử. UI không nói an toàn khi phân tích thất bại, có Thử lại và đường mở mock. Không đủ dữ kiện quy lỗi SDK hay kết luận RPC toàn cầu hỏng. Cần health check account/simulation, fallback vận hành trên build đích và provenance nguồn. Cơ chế fallback đã có trong mã, nhưng cấu hình danh sách dự phòng chỉ dùng khi DEV.

### 3. Mock có nhãn đúng nhưng không cùng câu chuyện

[Ảnh mock](bang-chung/mock-result.png). Chọn nhận thưởng mà thẻ mock nhận diện swap SOL → USDC, số và quyền từ dữ liệu mẫu cố định. Không phải phát hiện mới của engine. Nhãn mock giúp tránh giả live nhưng đường lui này chưa phù hợp để giám khảo tự kiểm cùng tình huống. Replay theo ID sẽ hữu ích hơn.

Banner mock ngoài landmark tạo một finding axe moderate. Các trang ban đầu khác không có axe violation ở trạng thái đã quét; không suy thành toàn app hoàn toàn accessible.

### 4. Inspector chặn đầu vào sai

Nhập `not-valid-base64!!` → báo chuỗi không phải base64. [Ảnh](bang-chung/inspector-invalid.png). Chưa chạy một input hợp lệ tới kết quả thành công trong Inspector ở lượt này.

### 5. Giao diện đủ cơ sở để hoàn thiện luồng

[Landing](bang-chung/landing.png) đã có cặp cùng lượng chuyển, khác quyền. [Trang đạo cụ](bang-chung/attack.png) ghi rõ là giả. Không cần đầu tư một vòng thay theme lớn. Nên giảm chín lựa chọn ngang cấp, sửa từ vựng test cho người mới, nối kịch bản với evidence và ưu tiên đọc cảnh báo trên máy chiếu.

Chưa thử hoàn tất dApp handoff trong lượt này; trạng thái khoá và giao diện đạo cụ không chứng minh handoff hoặc broadcast thành công.

## Những phần chỉ đối chiếu code/tài liệu

- `live/Receipt.tsx` đã có dự báo/ghi nhận/khớp/khác/chưa đủ dữ liệu, decision override và liên kết Explorer.
- `live/scenarios.ts` đã có chín thao tác, gồm cấp quyền, actor dùng quyền, revoke và đóng account rỗng. Không đề xuất chúng như tính năng chưa tồn tại.
- `scripts/rpcDuPhong.ts` đã có retry/fallback đọc; hướng nâng cấp là mức vận hành, provenance và kiểm trạng thái từng attempt.
- `WalletExecution.tsx` build review báo tất định vì không nạp env. Chưa chạy model thật, không kết luận AI bị hỏng.
- Báo cáo live cũ có thực thi và receipt nhưng thuộc phiên bản trước; một số mô tả như ví khách đã lỗi thời. Không lấy nó làm nghiệm thu hiện tại.
- Không thực hiện security audit độc lập toàn repo, clean install mới hoặc đo latency tổng thể trong lượt này. 1.136 unit test không thay các kiểm tra đó.

## Cách chạy lại

Từ repo, đọc script trước khi chạy. Không có lệnh nào dưới đây gửi giao dịch:

```powershell
npm run check
node --test docs/review/phan-bien-da-vai-20260926/bang-chung/regression.test.mjs
npm run replay-rpc
node docs/review/chung-ket-20260927/bang-chung/build.mjs
python -m http.server 5198 --bind 127.0.0.1 --directory docs/review/chung-ket-20260927/bang-chung/site
# Terminal khác; cần cho phép kết nối Devnet nếu môi trường đang chặn mạng:
python docs/review/chung-ket-20260927/bang-chung/browser.py
python docs/review/chung-ket-20260927/bang-chung/flows.py
node docs/review/chung-ket-20260927/bang-chung/rpc-read-probe.mjs
```

Các script browser/probe ghi đè artifact cùng tên. Muốn giữ bản đo này, sao chép script sang thư mục lượt đo mới và sửa `out` trước khi chạy. Bản build review không cần giữ trong git; scripts/logs/JSON/ảnh mới là bằng chứng cần bàn giao.
