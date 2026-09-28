# Nghiệm thu live CK-05/06/07 — 27/09/2026

Ví demo cố định `AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`. Chỉ SOL Devnet và token thử nghiệm của phiên.
Bản production (`vite build`, base `/Custos-Solana/`) chạy qua `probe-realistic-wallet.py`, khoá nạp từ
`.devnet/vi-demo.json` vào trình duyệt, không in ra. Mọi chữ ký dưới đây xác nhận trên Devnet, `err: null`.
Số dư ví sau nghiệm thu: 9.843494 SOL (đã tiêu 0.085293 SOL từ đầu nghiệm thu).

| Ca | Kết quả | Chữ ký / bằng chứng |
|---|---|---|
| AC03 · Custos bật → chuyển 12,5 DEMO | ✓ receipt: 500 → 487,5 khớp, đích khớp | `5w8U8A4w…wtKZnR` (`live-ck05-luot6`) |
| AC04 · Custos bật → Nguy hiểm → **huỷ** | ✓ số lần gửi không đổi | `live-ck05-luot6` |
| AC05 · Custos bật → **bỏ qua cảnh báo** (tấn công) | ✓ trên chuỗi, ✗ receipt tự động | `5AZWvhgH…sSXfrCv`: nguồn 487,5 → 243,75 (đúng nửa như dự báo), `setAuthority accountOwner` — metadata `live-ck05-luot6/tx-override-metadata.json`. Biên nhận trong trình duyệt quá hạn khi đọc; không gửi lại |
| Custos tắt → chuyển 3 DEMO | ✓ 500 → 497 khớp | `5EVuM7Hz…M4DPmb` (`live-ck05-B`) |
| AC07 · Custos tắt → **huỷ** | ✓ số lần gửi không đổi | `live-ck05-B` |
| AC06 · Custos tắt → tấn công, đồng ý riêng | ✓ trên chuỗi; receipt: số dư **khớp**, quyền **chưa rõ** | `3i5ugJqW…Bm2mxZY`: 497 → 248,5; metadata `live-ck05-B/tx-ac06-metadata.json` có `setAuthority accountOwner` → `HzsR5jpJ…`. Receipt để "chưa rõ" vì chưa quy được lần đọc quyền cho giao dịch này — đúng thiết kế, không nới |
| AC08 · chỉ đổi chủ, không rút token | ✓ số dư 500 → 500, quyền khớp | `4U83X3LN…vTgBwUfi` (`live-ck05-CD`) |
| AC09 · cấp quyền 30 DEMO | ✓ số dư không đổi, hạn mức 30 | `5HgpYhyW…SEWQ3Z4z` |
| AC10 · **actor tự ký** bước dùng quyền | ✓ người ký ≠ ví chủ; 500 → 488 | `4wMxmp7k…YWvbLa2t` |
| AC11 · thu hồi quyền | ✓ delegate trống, hạn mức 0; actor KHÔNG chuẩn bị được lần rút tiếp | `4eYGwfST…qfgNq5i1zt` |
| S06 · xin chuyển 2, thực tế chuyển thêm 1 | ✓ số dư giảm đúng 3 | `M41pnjcj…a2y49YH` (`live-ck05-E-luot2`) |
| S07 · trao quyền đóng → chuyển hết → đóng | ✓ **28/09** (RPC Devnet riêng): trao quyền đóng khớp; chuyển hết 500 → 0 khớp; ứng dụng đóng tài khoản rỗng, tài khoản đã đóng trên chuỗi (biên nhận số dư "chưa rõ" — không còn tài khoản để đọc lại) | `2P1wbNYb…t4cFWw` · `3DTkjg5P…4CuS1SR` · `3EC7RP5Q…9tkprj` (`docs/review/ck-20260928/live-ck05-F-helius-2`) |
| AC17 · reload khôi phục không ký/gửi lại | ✓ **28/09**: số lần gửi không đổi sau khi khôi phục; không còn yêu cầu ký đang chờ | `live-ck05-F-helius-2` |
| AC21 · axe + tràn ngang 1440/375 trên màn thực thi | ✓ **28/09**: axe 0 vi phạm ở 1440 và 375, không tràn ngang | `live-ck05-F-helius-2/browser.json` → `axe` |

**Cập nhật 28/09 — S07, AC17, AC21 đã đạt** (bảng trên). Ghi chú gốc 27/09, giữ để truy vết: *S07 (đóng tài khoản), AC17, AC21 — các lượt tới được chúng đều dừng ở chặng
chuẩn bị (chỉ đọc) vì RPC Devnet quá hạn khi đọc tài khoản. Không có giao dịch nào ở trạng thái chưa rõ;
không gửi lại giao dịch nào.*

Lượt `live-ck05-F-luot2` (27/09 ~22h): trước khi chạy, cả ba endpoint trả `getAccountInfo` < 1 s; giữa lượt
Devnet quá hạn trở lại — 10 lượt chuẩn bị (chỉ đọc) hỏng, 6 ở bước chuyển hết. Hai lần gửi (tạo phiên, trao
quyền đóng), không lần gửi nào ở trạng thái chưa rõ. Số dư ví sau lượt: 9.836932 SOL.

**Lỗi thật lộ ra trong lúc nghiệm thu, đã sửa kèm test đỏ trước:** lượt kiểm của phiên live không có hạn;
lỗi RPC hiện JSON gốc; genesis gặp 429 loại endpoint dự phòng cả phiên; công tắc bảo vệ đổi bất đồng bộ
(probe). Ghi chú kết luận sớm ở lượt 1–4 ("chặn theo IP") đã được chứng minh SAI — hai mạng khác nhau cùng
thấy api.devnet treo đọc account.

## 28/09 — phân đoạn F qua RPC Devnet riêng

Endpoint công cộng treo đọc tài khoản theo đợt (27/09). Chủ dự án đăng ký RPC Devnet riêng (Helius, gói miễn phí);
URL mang khoá chỉ nằm ở `.env.local` (gitignore), chỉ bản DEV đọc (`chonRpcLive`), bản build production quét 53 tệp:
**0** tệp chứa khoá. Genesis kiểm trước: Devnet ✓; đọc tài khoản ~0,3 s.

- `live-ck05-F-helius` (lượt 1): trao quyền đóng `3Mp6Mki4…` và chuyển hết `UNU6qPRd…` đều khớp; dừng ở bước đóng
  vì **probe** thiếu nhãn nút "Đã xem, vẫn ký và gửi" (ca chỉ có đề nghị kiểm tra thủ công) — bước đó CHƯA ký,
  không gửi. Đã sửa selector, không sửa sản phẩm.
- `live-ck05-F-helius-2` (lượt 2): **đạt trọn** S07, AC17, AC21; 4 lần gửi (tạo phiên + 3 giao dịch), 0 lần thử lại RPC.
- Số dư ví sau lượt: **9,823798 SOL**.

Còn chưa đạt trong probe tự động: **AC05** (biên nhận tự động của ca bỏ qua cảnh báo) và **AC06** (quyền "chưa rõ"
theo thiết kế) — cả hai đã đối chiếu thủ công trên chuỗi ở bảng trên.

## 28/09 (tối) — AC05, AC06 tự động; hai tab thật

- `live-ck05-AB-helius` (`probe-realistic-wallet.py --tu A --den B`): AC03, AC04, **AC05** (biên nhận tự
  động: chuyển + đổi chủ, số dư và quyền khớp), giao dịch không bảo vệ, AC07, **AC06** (quyền khớp — lần này
  quy được cho đúng giao dịch). 6 lần gửi, 0 lỗi. ⇒ **13/13 ca của probe đạt tự động.**
  Kỳ vọng AC06 sửa cho đúng thiết kế: quyền không bao giờ "lệch"; "chưa rõ" chỉ hợp lệ khi chủ được đọc ở
  slot muộn hơn và chưa quy được cho giao dịch, và chủ đọc được vẫn phải trùng dự báo.
- `docs/review/ck-20260928/live-hai-tab` (`probe-hai-tab.py`): **12/12** — tab mở trước khi tab kia tạo
  phiên TỰ thấy "Có phiên đã lưu" và nút tạo phiên bị vô hiệu (không gửi); tab cũ định ký bị chặn "Phiên ví
  đã thay đổi ở tab khác" (không gửi); hai tab bấm chuẩn bị cùng lúc ⇒ Web Lock cho đúng một tab, tab kia báo
  "tab khác"; huỷ không gửi gì; 0 pageerror. Giao dịch thật duy nhất của lượt: B chuyển 1 DEMO, khớp số dư.
- Số dư ví sau các lượt: **19,777863 SOL** (chủ dự án nạp thêm 10 SOL ngày 28/09).
