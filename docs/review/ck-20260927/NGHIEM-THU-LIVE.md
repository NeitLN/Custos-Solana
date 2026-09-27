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
| S07 · trao quyền đóng → chuyển hết → đóng | **một phần**: trao quyền đóng ✓ (hai phiên); chuyển hết + đóng CHƯA chạy | `59ELRpRK…Tz7CjRsT`; lượt 2 (bản build có sửa Codex lần 2): `43bLSz4S…hg3ii2`, receipt số dư/quyền đóng **khớp** (`live-ck05-F-luot2`) |
| AC17 · reload khôi phục không ký/gửi lại | **CHƯA chạy** | — |
| AC21 · axe + tràn ngang 1440/375 trên màn thực thi | **CHƯA chạy** trong lượt live này | — |

**Chưa đạt, nói thẳng:** S07 (đóng tài khoản), AC17, AC21 — các lượt tới được chúng đều dừng ở chặng
chuẩn bị (chỉ đọc) vì RPC Devnet quá hạn khi đọc tài khoản. Không có giao dịch nào ở trạng thái chưa rõ;
không gửi lại giao dịch nào.

Lượt `live-ck05-F-luot2` (27/09 ~22h): trước khi chạy, cả ba endpoint trả `getAccountInfo` < 1 s; giữa lượt
Devnet quá hạn trở lại — 10 lượt chuẩn bị (chỉ đọc) hỏng, 6 ở bước chuyển hết. Hai lần gửi (tạo phiên, trao
quyền đóng), không lần gửi nào ở trạng thái chưa rõ. Số dư ví sau lượt: 9.836932 SOL.

**Lỗi thật lộ ra trong lúc nghiệm thu, đã sửa kèm test đỏ trước:** lượt kiểm của phiên live không có hạn;
lỗi RPC hiện JSON gốc; genesis gặp 429 loại endpoint dự phòng cả phiên; công tắc bảo vệ đổi bất đồng bộ
(probe). Ghi chú kết luận sớm ở lượt 1–4 ("chặn theo IP") đã được chứng minh SAI — hai mạng khác nhau cùng
thấy api.devnet treo đọc account.
