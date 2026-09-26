# Bàn giao demo Custos có hậu quả thật

## Đã triển khai

Tại **Ví mẫu hiện tại**, không tạo trang ký riêng. Không đổi SDK/types/engine luật.
Chưa commit, push hoặc deploy.

- Form gửi DEMO tuỳ chọn, đúng base units; kiểm token account đích cùng mint.
- Custos bật + đỏ + huỷ không gửi; bật + đỏ + override vẫn gửi đúng message,
  giữ nguyên verdict, ghi quyết định riêng. Tắt Custos vẫn có consent.
- Hiển thị token nguồn/đích, khả dụng của owner, delegate/allowance/close authority,
  phí riêng và slot đọc. Mất quyền không bị diễn thành chuyển hết token.
- Registry chín thao tác: transfer, attack, owner, approve, delegate-transfer,
  revoke, extra, close-authority, close. Một số là hai bước của cùng tình huống.
- Actor ký/trả phí riêng, không dùng chữ ký owner cho bước dùng quyền.
- Lưu manifest/history công khai; restore xác minh chain, không khôi phục bí mật.
- Web Lock + compare-and-swap cache chặn tab cũ ghi đè pending; không cho bỏ bản lưu chưa rõ.
- dApp bàn giao đúng phiên/message và nhận trạng thái kết quả từ ví.
- Ví khách riêng, xuất keypair có chủ đích; không đổi ví mặc định của nhóm.
- Nhãn nguồn AI phản ánh kết quả trả về/fallback; response muộn không đổi nhãn.
- Motion hậu quả chỉ xuất hiện sau metadata; reduced motion, UI quyền và receipt.

## Bằng chứng

| Phạm vi | Kết quả | Nguồn |
|---|---|---|
| Typecheck + suite | **1.080/1.080 qua**, không skip | `check-chan-that.log` |
| Build ví và dApp | Qua | `build-chan-that.log`, `build-attack-chan-that.log` |
| Quét output | Không thấy khoá riêng trong 27 file mà scanner kiểm | `node scripts/soi-ro-ri-khoa.mjs apps/demo-wallet/dist` |
| Browser Devnet đầy đủ | **12 receipt nghiệp vụ meta.err=null**; 16 lượt gửi gồm 4 setup | [run4](realistic-wallet-run4/browser.json) |
| DApp/huỷ hai chiều + ví khách reload | Qua, chỉ 1 setup; không gửi transaction nghiệp vụ | [handoff](live-handoff/browser.json) |
| Phục hồi và hai tab trên bản cuối | Qua; **0 send/faucet** | [recovery](session-recovery/browser.json) |
| UI | Chromium 1440px/375px, không overflow ngang; axe không báo violation ở trạng thái kiểm | run4 và recovery |

Run4 chứng minh luồng on-chain trước các vá cuối về phục hồi/cache và phản hồi dApp.
Bản cuối được typecheck/test/build lại, kiểm dApp riêng và probe phục hồi chỉ đọc.
Không gọi RPC fixture lỗi trong unit test là giao dịch lỗi đã gửi thật.
Số test không phải độ chính xác phát hiện.

Các lần trước run4 dừng vì probe chưa đợi React render hoặc đọc sai boolean
`details[open]`; đã sửa probe. Các setup đã gửi vẫn tồn tại, không được nói là không
tốn phí. Phép đếm 16 chỉ thuộc run4, không phải tổng mọi giao dịch trong phiên phát triển.

## Hậu quả đã đọc từ Devnet

| Ca | Kết quả | Verdict đo được |
|---|---|---|
| Gửi 12,5 | Nguồn 500 → 487,5; đích 0 → 12,5 | safe |
| Custos bật, đỏ, vẫn ký | Nguồn 487,5 → 243,75; đích 12,5 → 256,25; owner đổi | danger, override |
| Tắt Custos, gửi 3 | Chuyển 3, có consent | safe ở phép đo đối chứng |
| Tắt Custos, nhận quà | Chuyển nửa token và đổi chủ | danger ở phép đo đối chứng |
| Chỉ đổi chủ | 500 → 500; owner đổi, khả dụng owner cũ = 0 | danger |
| Approve 30 | 500 → 500; allowance 30 | safe |
| Delegate chuyển 12 | 500 → 488; actor ký, allowance giảm | safe |
| Revoke | Delegate null, allowance 0; lần chuẩn bị dùng quyền sau bị từ chối | safe |
| Gửi 2 kèm 1 | Nguồn 488 → 485; hai transfer thực thi | safe |
| Trao quyền đóng | Close authority đổi, chưa chuyển token | danger |
| Gửi hết 485 | Số token nguồn về 0, giữ cảnh báo thật của engine | warning |
| Đóng account rỗng | Actor ký; account không còn tồn tại khi đọc lại; rent/phí có metadata | safe |

**Giới hạn phát hiện cần nói rõ:** Approve giới hạn và hai transfer thuần không bị ép đỏ.
Delegate là năng lực hợp lệ. Demo thể hiện quyền/hậu quả nhưng không chứng minh Custos
phát hiện mọi khoản chuyển ngoài kỳ vọng. Muốn cải thiện luật phải có seed/ground truth
riêng, không sửa verdict chỉ để trình diễn hấp dẫn hơn.

Signature điểm nhấn:

- [Bật Custos, bỏ qua đỏ, thực thi](https://explorer.solana.com/tx/4hbwQyd7fQyEMt3Fz7uAfQuzEh6oc72g6AZQ1mrcHd94FJaeSjs3dKab3JFVXbHh31rhdP1aR9FXkhdbCAxEeAJq?cluster=devnet).
- [Chỉ đổi chủ](https://explorer.solana.com/tx/6JmvK997iYpGX64ALekyNqkVsrwfPWtStFZyUEcStaMxRZh9donEx7JAwHRtkpoupZ1RyKojArc3bPRPeMdjT4f?cluster=devnet).
- [Ứng dụng tự ký bằng delegate](https://explorer.solana.com/tx/46M5NHepwdpQBoTH1JdV3TWTnDZR4eGDuW66tis5nLodWKg8uUXZ66UNxEVDLh4FjHBVeTDNGuD55iLndpdVs81u?cluster=devnet).
- [Thu hồi delegate](https://explorer.solana.com/tx/6NdbwvcF5o9ARDELFCiJxat4Rh2rMJFeTAVwx8sTuFtkGn4dMzpdsWxZGHt4KUoFtfqMjvjZZsqTeb2wrbTy6La?cluster=devnet).

Ảnh: [override](realistic-wallet-run4/01-red-override.png),
[revoke](realistic-wallet-run4/02-revoke.png), [close](realistic-wallet-run4/03-close.png),
[mobile bản cuối](session-recovery/restored-375.png), [dApp](live-handoff/dapp.png).

## Lỗi phát hiện và đã sửa trong rà soát

1. Setup không lên chain gây khoá chờ vĩnh viễn: finalized expiry + tra lịch sử,
   không tự gửi lại. Test tái hiện đỏ rồi qua.
2. Tab khác có thể ghi đè pending: CAS cache trong Web Lock; browser fault fixture
   kiểm không ghi đè và không gửi từ controller cũ.
3. Nút bỏ bản lưu có thể xoá pending: chặn khi unresolved/setupPending.
4. Lỗi lưu trữ có thể để controller busy mãi: cập nhật busy nằm trong try/finally;
   test xác minh thao tác sau hoạt động và chưa gửi khi persistence lỗi.
5. Nhãn AI được gán trước request: chỉ gán sau kết quả; timeout/SDK fallback không
   ghi là model. Output giống câu tất định được ghi nhãn bảo thủ.
6. DApp chỉ nhận request một chiều: bổ sung response nonce/window/origin;
   browser chứng minh đường huỷ hai chiều.

## Giới hạn và phần chưa có

- Chưa tích hợp Phantom/Solflare; ví khách dùng signer cục bộ có thể export, không phải
  production key management. Không Mainnet.
- Actor key chỉ tồn tại trong tab tạo phiên; không phục hồi từ public key sau reload.
- Chỉ Chromium được kiểm; chưa có ma trận Firefox/WebKit hoặc extension/mobile wallet.
- Chưa gọi model thật trong lượt này; build kiểm dùng tất định. Unit test fallback không
  chứng minh chất lượng provider/model hay có API key trên môi trường deploy.
- Chưa gửi live transaction thất bại/timeout để đo phí; các nhánh đó dùng RPC fixture.
- Quyền đọc sau receipt có slot riêng, không phải snapshot lịch sử tuyệt đối.
  JSON decision là nhật ký ứng dụng, không phải chứng thư on-chain về sự hiểu biết.
- Restore bỏ prediction/decision từ cache chưa xác thực; tải JSON ở tab gốc nếu cần
  mang bản đối chiếu đầy đủ đi trình bày.
- Video `.webm` ở `session-recovery/video/` là recording QA, có fault fixture; chưa dựng
  video pitch mới, không được trình bày video này như live attack.
- Giao thức dApp giới hạn mẫu nhận quà của phiên, chưa nhận mọi transaction bên thứ ba.
- Khoá tab chỉ cùng origin/trình duyệt, không ngăn thao tác từ thiết bị khác.

## Chạy lại

[Hướng dẫn trình diễn](../../CHAY-DEMO-GIAO-DICH-THAT.md).
Giữ câu chuyện ngắn: gửi bình thường → đỏ/huỷ → **đỏ/vẫn ký khi Custos bật** → Explorer.
Các ca quyền dành cho phần giám khảo hỏi sâu. Không gọi khả năng phân tích là bảo đảm
ngăn mọi mất mát.
