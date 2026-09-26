# Chạy Ví mẫu Custos với hậu quả Devnet thật

## Mở sản phẩm

Ở gốc repo chạy `npm run vi`, mở `http://localhost:5188/`.
Muốn dApp ở cửa sổ riêng, chạy thêm `npm run tan-cong` trong terminal khác.

Ví nhóm: `AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`.
Cấu hình ở `scripts/demo-wallet-config.ts`; keypair ở `.devnet/vi-demo.json`.
Không chia sẻ/đưa keypair vào repo, build hoặc server.

1. Nhận SOL Devnet từ [Solana Faucet](https://faucet.solana.com/).
2. Chọn keypair qua input mở quyền ký. File chỉ đọc trong tab, không lưu vào localStorage.
3. Nếu có bản lưu, **Khôi phục phiên đã lưu**, rồi chọn lại keypair để ký.
4. Nếu chưa có phiên, **Ký tạo phiên thử nghiệm**; cần ít nhất 0,012 SOL Devnet.
   Transaction tạo mint, ba token account, phát hành 500 DEMO, thu hồi mint authority
   và cấp 0,001 SOL Devnet cho actor trả phí bước sau.
5. Kiểm số dư, mint/account và signature tạo phiên trong phần cài đặt.

Đây là SOL/token thử nghiệm không có giá trị tiền thật. Không dùng Mainnet.

## Câu chuyện trình diễn chính

### Gửi bình thường

Bấm **Gửi DEMO**, nhập `12,5`, để trống đích để dùng tài khoản nhận của phiên.
**Kiểm tra giao dịch gửi** → xem Custos → đồng ý ký → gửi Devnet.
Kiểm nguồn 500 → 487,5; đích 0 → 12,5; phí SOL riêng.
Đích tuỳ chọn phải là **SPL Token account cùng mint**, không phải địa chỉ ví thông thường.
Số lượng tối đa sáu chữ số thập phân; không dùng dấu phân nhóm hoặc số mũ.

### Nghe cảnh báo

Giữ Custos bật → **Nhận quà tặng** → đọc cảnh báo → **Chặn & huỷ giao dịch**.
Yêu cầu này không được gửi, không có signature giả. Huỷ không tạo một transaction on-chain.

### Bỏ qua cảnh báo — điểm nhấn bắt buộc

Giữ Custos **bật**, mở lại **Nhận quà tặng** → **Vẫn ký — tôi hiểu rủi ro**.
Tích xác nhận chủ động bỏ qua → **Bỏ qua cảnh báo và gửi**.
Chờ confirmed và metadata. Nếu đang có 487,5 DEMO thì nguồn còn 243,75;
đích tăng 243,75; owner nguồn đổi; **khả dụng của chủ ví ở nguồn bằng 0**.

243,75 DEMO còn lại vẫn ở nguồn, không phải đã chuyển hết. Đây là mất quyền kiểm soát.
Receipt giữ level đỏ, mode bật và decision `override`. Mở Explorer/tải JSON để đối chiếu.
Confirmed nghĩa là transaction đã chạy, không có nghĩa giao dịch có lợi.

### Đối chứng khi tắt Custos

Chủ động **Ký tạo phiên mới** vì nguồn cũ đã đổi chủ, rồi tắt công tắc và nhận quà/ký.
Đây là phiên và transaction khác, không hoàn tác/phát lại signature cũ.
Tắt Custos vẫn cần consent; inspect chỉ đo dự báo đối chiếu, không làm cổng ký.
Khi thời lượng ngắn, giữ ba đoạn đầu.

## Các tình huống về quyền

Mở **Khám phá các tình huống về quyền**. Mỗi bước là một transaction riêng.

| Thao tác | Điều phải thể hiện |
|---|---|
| Trao quyền kiểm soát | Chỉ SetAuthority: token 500 → 500 nhưng owner cũ không sử dụng được |
| Cấp quyền sử dụng token | Nhập 30, ký Approve: chưa chuyển token, allowance 30 |
| Ứng dụng sử dụng quyền | Nhập 12, xác nhận bước ứng dụng: actor tự ký/trả phí, chủ ví không ký Tx2; allowance còn 18 |
| Thu hồi quyền | Owner ký Revoke; delegate null, allowance 0; bước ứng dụng tiếp theo bị từ chối |
| Gửi kèm chuyển thêm | Nhập 2: thực chuyển 2 + 1 DEMO; khoản thêm không phải phí mạng |
| Trao quyền đóng | Chỉ close authority đổi; tài khoản còn token chưa đóng được |
| Ứng dụng đóng tài khoản rỗng | Gửi hết DEMO trước; actor ký close, nhận rent SOL, receipt ghi dữ kiện SOL và phí |

**Không hứa mọi ca đều đỏ.** Trong lượt đo, Approve giới hạn, delegate spend, Revoke,
hai transfer thuần có thể ở mức Bình thường. Code không ép verdict theo tên tình huống.
Bình thường không phải cam kết an toàn; xem giới hạn trong báo cáo.

Actor key chỉ ở tab tạo phiên. Reload không lưu bí mật; muốn dùng actor, giữ tab gốc
hoặc tạo phiên mới. Khôi phục phiên cũ vẫn đọc số dư/lịch sử và dùng owner khi mở keypair được.

## Bàn giao dApp

Tạo phiên → **Mở dApp của phiên này** → cho phép popup → **Yêu cầu nhận quà** tại dApp
→ quay lại ví → huỷ hoặc ký. Trang dApp không ký, chỉ nhận dữ kiện công khai và gửi
message về ví. Origin/cửa sổ/nonce/bytes phải khớp phiên đang kết nối.
DApp nhận phản hồi huỷ/đã gửi/confirmed/lỗi/chưa rõ từ ví.

Luồng `#tx=...` cũ vẫn là Phòng phân tích trên fixture cũ; không ký ngầm bằng tài khoản
phiên mới. Giao thức dApp mới giới hạn mẫu nhận quà, không phải wallet adapter tổng quát.

## Khách tự thử

**Tự thử bằng ví khách riêng** mở `?guest=1`, tạo keypair riêng trong bộ nhớ tab.
Khách tự nạp SOL Devnet; không dùng quỹ hoặc keypair của nhóm.
**Tải keypair ví khách về máy** là xuất khoá có chủ đích; không chia sẻ file đó.
URL giữ public key khi reload; phải nhập lại keypair đã tải để ký.
Không lưu file trước khi đóng tab thì không thể tái tạo khoá từ địa chỉ.
Mặc định vẫn là ví nhóm; chưa tích hợp Phantom/Solflare.

## Phục hồi và lỗi

- Manifest/history chỉ chứa dữ kiện công khai. Restore xác minh setup, mint và đích từ chain.
- Không tin confirmed trong cache: **Tra cứu lại** mới đọc bằng chứng Devnet.
- Prediction/decision cũ trong cache không được chứng thực. Muốn mang bản đối chiếu đầy đủ
  đi trình bày, tải JSON ngay từ tab tạo giao dịch.
- Chưa rõ sau gửi: **Tra cứu lại**; setup chưa rõ: **Tra cứu tạo phiên — không gửi lại**.
- Finalized vượt hạn + RPC không tìm thấy signature trong lịch sử: bỏ khoá chờ với nhãn
  hết hạn/chưa quan sát; không khẳng định tuyệt đối chưa từng chạy. Kiểm Explorer/số dư trước yêu cầu mới.
- Bản lưu có pending không được bỏ bằng nút xoá bản lưu. Không tự resubmit.
- Tab khác đổi phiên: tab cũ bị chặn; tải lại/khôi phục. Cần Web Locks trên HTTPS hoặc localhost.
  Đây không phải khoá toàn mạng/giữa thiết bị.
- RPC 429: chờ và thử bước đọc; không bấm dồn send. Khi mạng hỏng, dùng receipt/video cũ
  với nhãn phát lại, không giữ nhãn live.

## AI và kiểm thử

L2 quyết level; AI chỉ diễn giải. Timeout/output bị SDK từ chối ghi nhãn dự phòng.
Build được kiểm trong lượt này dùng tất định, không phải bằng chứng gọi model thật.

[Báo cáo và bằng chứng](review/live-devnet/BAO-CAO-CHAN-THAT.md).

```powershell
npm run check
npm run build -w @custos-solana/demo-wallet
npm run build -w @custos-solana/trang-tan-cong
node scripts/soi-ro-ri-khoa.mjs apps/demo-wallet/dist
npm run preview -w @custos-solana/demo-wallet -- --host 127.0.0.1 --port 5192 --strictPort
```

Preview ví: `http://127.0.0.1:5192/Custos-Solana/`.
Sau build ví, copy `apps/trang-tan-cong/dist` thành `apps/demo-wallet/dist/tan-cong`
nếu cần preview dApp cùng origin. Không copy keypair vào dist.

Các probe sau gửi Devnet thật bằng ví nhóm, cần nạp SOL trước, không faucet tự động:

```powershell
python apps/demo-wallet/tools/probe-realistic-wallet.py --allow-devnet-send --out docs/review/live-devnet/realistic-wallet-latest
python apps/demo-wallet/tools/probe-live-handoff.py --allow-devnet-send
```

Chỉ đọc, chặn send/faucet: `python apps/demo-wallet/tools/probe-session-recovery.py`.
Probe này dùng receipt công khai run4 và fault fixture để kiểm cache, không tạo timeout thật.
Video `.webm` trong `session-recovery/video/` là recording QA, không phải video pitch đã dựng.
