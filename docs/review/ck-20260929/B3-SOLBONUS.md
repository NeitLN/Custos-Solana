# B3 — SolBonus độc lập trên wallet-adapter

Ngày kiểm: 29/09/2026. Thực hiện theo yêu cầu chủ dự án, ROADMAP-SAU-MENTOR B3 và ADR-0004.

## Kết quả

- SolBonus: https://solbonus-custos.vercel.app/tan-cong/
- Popup ví: https://custos-solana.vercel.app/ket-noi.html
- Hai **origin HTTPS khác nhau**, hiện là hai alias cùng deployment Vercel. Cách ly origin
  do trình duyệt thực hiện; không tuyên bố là hai hạ tầng độc lập. Không cần commit/push để deploy.
- Deployment cuối: `dpl_7nrLtRtrLuZf6SirRniAZ2rbPTAi`, trạng thái READY;
  `custos-solana-d06pv33be-style-hub.vercel.app`. Đã gán lại cả alias ví và SolBonus.
- `rg -n "demo-wallet" apps/trang-tan-cong/src`: **0 kết quả**.
- Import Custos duy nhất: `registerCustosWallet` từ connector. DApp không gọi `inspect`,
  không nhận session manifest, không gửi `expectedAction` hay trạng thái bảo vệ.

SolBonus đọc `getTokenAccountsByOwner`, kiểm dữ liệu mint và giao dịch tạo phiên thành công
do ví cố định ký, rồi đọc lại source/target/mint trước khi dựng yêu cầu. Giới hạn 5 phiên
hợp lệ mỗi lượt và 20 signature/mint; thiếu lịch sử thì không nhận diện bừa từ decimals.

Bản điều kiện ẩn: TransferChecked `balance / 2` (chia nguyên) rồi SetAuthority AccountOwner.
Bản lành: self-transfer 0 lamport, chỉ phí mạng. Cùng giao diện, adapter, popup và cách gửi.
Ví xác minh bytes trong luồng sẵn có B1/B2; dApp cũng so message và xác minh chữ ký trước gửi.

Chữ ký lưu trước `sendRawTransaction`, `maxRetries: 0`; lỗi RPC giữ trạng thái chưa rõ,
reload cùng tab tiếp tục tra cứu. Hết hạn phải quan sát finalized height rồi đọc lại
signature status trước khi kết luận không thấy giao dịch.

## Bằng chứng đã đo

- `npm run typecheck`: đạt.
- `npm test`: **1341 pass, 0 fail, 0 skipped**.
- 16 ca B3: giao dịch, provenance, số dư/quyền đổi, ký/huỷ/bytes bị tráo, trạng thái
  signature, guard nguồn và quét bí mật. Đã thấy test đỏ trước sửa parser RPC và expiry race.
- Build cả hai ứng dụng: đạt. Chromium mở bundle production: không lỗi JavaScript.
- Scanner cả hai bundle: không thấy khoá; Vercel build nay quét cả output đã ghép.
- Chromium thật localhost 5189 → 5188: đọc được 5 phiên; bản điều kiện ẩn `danger`,
  huỷ → 0 send. Bản lành `safe`, ký → đúng 1 send từ dApp → confirmed.
- Chromium thật HTTPS SolBonus → ví: cùng kết quả; không lỗi JS, đóng popup làm adapter
  ngắt kết nối. 390px không tràn ngang; axe **0 vi phạm**.
- Chữ ký bản lành HTTPS:
  [47mVVpPE…B59y4np](https://explorer.solana.com/tx/47mVVpPEtoM3Ap3pMX7bH87B4yUoqBRhHbRhu9CbVtViFt3L8maGyE5J8bJ186JfL9CKH81MnYWdpTWqPB59y4np?cluster=devnet).
- Log/ảnh thô cục bộ: `build/b3-browser/report.json`, `build/b3-browser-final/report.json`,
  `build/b3-production/report.json`, `build/b3-tests-final.log` (build được gitignore).
- Bản lưu để review: [HTTPS ký/gửi bản lành](B3-HTTPS-SEND.json),
  [HTTPS bản deploy cuối](B3-HTTPS-FINAL.json). Lượt cuối không gửi thêm giao dịch;
  cả hai chế độ vẫn được ví kiểm. Probe tiêm trạng thái RPC chưa rõ đã chứng minh
  pending giữ qua reload + kết nối lại, nút gửi và công tắc chế độ vẫn khoá.
  Phần tiêm lỗi được ghi riêng, không gọi là giao dịch đang chờ trên chain thật.

Ở ca nguy hiểm đo được: 499 → 249,5 DEMO và chủ tài khoản Bạn → actor,
reason `SPL_SET_AUTHORITY__ACCOUNT_OWNER`, coverage 2/2. Đây là kết quả mô phỏng;
probe bấm chặn nên không phát sinh thay đổi token thật.

## Review và sửa phụ trợ

Review độc lập phát hiện một P2: status null đọc trước height có thể cũ khi height trả về.
Đã thêm test tái hiện và đọc status lần hai sau mốc hết hạn; lỗi RPC vẫn giữ khoá gửi.

Wallet-adapter kéo thư viện QR/mobile vào bundle. Scanner cũ nhầm bảng sửa lỗi QR là
keypair và nhầm query Google Fonts là mật khẩu. Sửa bằng hash chính xác của hai dãy QR
công khai (không bỏ qua file/thư viện), xét credential chỉ trong authority của URL,
và quét mọi dãy số. Test chứng minh dãy 64 byte khác nằm sau bảng QR vẫn bị bắt.

Nút trên ví đổi thành **Mở SolBonus độc lập**, không gọi offerDapp hoặc xuất manifest.
Các kịch bản nội bộ ví giữ nguyên để đối chứng. Xoá LiveAttack và cache blockhash cũ
không còn được dùng; cập nhật hai guard vốn bắt buộc SolBonus dùng chung builder của ví.

## Giới hạn và bàn giao B5

- Chưa chạy toàn bộ ma trận B5/T5 trên HTTPS: RPC bị cắt, người dùng chờ hết blockhash,
  bypass feature, replay, batch, và vẫn ký bản điều kiện ẩn kèm biên nhận. Không đánh dấu B5 DONE.
- Chưa có khoá phối hợp nhiều tab dApp; không thử đồng thời cùng một phiên.
- Public RPC có thể rate-limit; màn hình báo lỗi, không tự chọn `safe` hay gửi thay thế.
- Build Vercel READY còn in diagnostic TS2688 từ khâu transpile API có sẵn;
  typecheck cục bộ đạt và hai giao diện được kiểm thực tế. Không tính lượt này là kiểm lại API AI.
- File khoá chỉ nạp trong input popup ví; không đọc vào dApp, không đổi ví mặc định.
- Không commit, không push. Hướng dẫn chạy lại: `apps/trang-tan-cong/README.md` và
  `apps/trang-tan-cong/tools/probe-solbonus.py`. Probe handoff cũ không còn đúng với B3.
