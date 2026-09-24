# Bảng finding — lượt triển khai sau rà soát 25/09/2026

Thực hiện theo [`BAO-CAO.md`](BAO-CAO.md) và [`PROMPT-CLAUDE-NANG-CAP-CUSTOS-VONG-QUOC-GIA-2026.md`](../../PROMPT-CLAUDE-NANG-CAP-CUSTOS-VONG-QUOC-GIA-2026.md).
Baseline: HEAD `0c1b96d`, cây bẩn lúc bắt đầu: `package.json` (script `mau-inspector`), `AGENTS.md`,
tài liệu Codex vừa thêm, `scripts/ky-thuat/mau-cho-inspector.ts`. **Chưa commit/push** — chủ nhóm tự làm.

Môi trường đo: Windows 11 · Node 24.12.0 · npm 11.6.2 · Chromium 149.0.7827.55 · Playwright 1.61.0 ·
axe-core 4.13.0 · RPC Devnet công cộng `api.devnet.solana.com` · dev server `localhost:5188/5189`.

**Trạng thái:** PASS = đã chạy và đạt · FAIL · BLOCKED = chặn bởi môi trường/quyền · CHƯA KIỂM.

---

## Tóm tắt trước / sau

| Kiểm tra | Trước (HEAD `0c1b96d`) | Sau (cây làm việc 25/09) |
|---|---|---|
| `npm run check` | 1004/1004 | **1042/1042** (17 test mới + 4 guard chế độ AI + 1 ngân sách lời gọi + 4 adapter replay + 6 L3 cấp quyền + 4 lời khai + 2 câu tóm tắt) |
| Ca đối chứng Approve trên ví | Bình thường **kèm** "Custos đề nghị kiểm tra thủ công" | **Bình thường, không đề nghị** — nhận diện `cấp quyền rút · USDC-demo → CRZa…picz` (F-13) |
| dApp khai `transfer` cho lệnh chuyển thật | bị ghi `loiKhaiLech` + đề nghị kiểm tra | **khớp** — không ghi lệch; `airdrop`/`swap`/`approve` vẫn lệch (F-15) |
| `npm run replay-rpc` | 19/29 | **19/29** — tụt còn 7/29 sau khi gộp lời gọi mint + PDA, đã khôi phục (F-11) |
| Trang tấn công → ví, desktop ×2 + mobile ×2 | 0/1 — `Chưa đọc hiểu hết`, Transfer 500 000 000 > số dư 490 000 000 | **4/4 PASS** — Nguy hiểm, `490,0 → 245,0`, chênh lệch **khớp** Transfer 245 000 000 giải mã từ URL |
| Ca lỗi: hiện trường đã đổi chủ | không có đường xử lý | **PASS** — không mở ví, thông điệp "hiện trường chưa sẵn sàng" |
| Ca lỗi: RPC mất mạng | — | **PASS** — không mở ví, thông điệp mạng (không nhầm thành hiện trường) |
| Màn phỏng vấn | `Chưa đọc hiểu hết · 0 trên 3 lệnh` | **PASS** — Nguy hiểm · 2 trên 3 lệnh |
| `thu-tich-hop:devnet` (ví dụ tích hợp) | **FAIL** — "giả danh airdrop" ra `hỏi` thay vì `chặn` | **8/8 PASS** |
| Mô phỏng Devnet 9 kịch bản | `thieu-du-lieu` hỏng mô phỏng (`AccountNotFound`) | **9/9**, 0 lỗi, 0 lệch; `thieu-du-lieu` chỉ còn `NGUOI_DUNG_KHONG_RO` |
| Probe trình duyệt + axe (`soi-trinh-duyet.py`) | 40/45 (báo cáo Codex) | **45/45** |
| Request `/api/dien-giai` trên dev | 1 lượt, 404, lỗi console | **0 request**, 0 lỗi console, nhãn "tất định" |
| Số dư on-chain nguồn trước/sau mọi probe | — | `490000000` / `490000000`, chữ ký mới nhất không đổi (`51EVtxcZ…`) — **không gửi gì** |

Artifact: [`ban-giao-tan-cong.json`](ban-giao-tan-cong.json) · [`ban-giao-tan-cong-TRUOC-SUA.json`](ban-giao-tan-cong-TRUOC-SUA.json) ·
[`khong-hoi-quy.json`](khong-hoi-quy.json) · [`phong-van-TRUOC-SUA.json`](phong-van-TRUOC-SUA.json) ·
`data/a11y/ket-qua.json` · `data/tich-hop/ket-qua.json` (đo trên cây bẩn — xem F-10).

---

## Các finding

### F-01 · P0 · Trang tấn công bàn giao giao dịch không thể thực thi — **ĐÃ TÁI HIỆN · ĐÃ SỬA**

| | |
|---|---|
| Tái hiện | Mở `localhost:5189`, bấm "Nhận 1.000 SOLB" |
| Quan sát | Ví hiện "Chưa đọc hiểu hết · 0/3". `simulateTransaction`: `InstructionError [1, Custom 1]`, log `insufficient funds` |
| Kỳ vọng | Nguy hiểm, mã `SPL_SET_AUTHORITY__ACCOUNT_OWNER`, số dư giảm khớp Transfer thật |
| Nguyên nhân | `apps/trang-tan-cong/src/App.tsx` dựng Transfer = `ht.soLuong` (500 000 000, số lúc dựng hiện trường); số dư thật 490 000 000. Bản vá 19/09 "chia đôi số cấu hình" chỉ tới được `kichBan.ts` |
| Owner | B |
| Cách sửa | `scripts/hienTruongSong.ts` — một hàm dựng chung `dungTxTanCongSong` cho cả ba luồng; `docNguonSong` đọc số dư + chủ + mint **từ chuỗi** lúc chạy; lượng = một nửa số dư sống (biên cho số dư trôi giữa hai lần lấy sẵn). Trang tấn công lấy sẵn trạng thái + **preflight** đúng giao dịch sẽ bàn giao; hiện trường hỏng ⇒ không mở ví, nói rõ đó là trạng thái demo |
| Test | `apps/demo-wallet/test/hienTruongSong.test.ts` (12) + 4 test mới trong `kichBan.test.ts`. **5 đột biến, cả 5 đỏ đúng chỗ** — gồm đưa trang tấn công về lại đọc `ht.soLuong` |
| Nghiệm thu | `python scripts/kiem-trinh-duyet/soi-ban-giao-tan-cong.py` — **CỔNG ĐẠT**; cùng probe trên mã cũ **FAIL** (`transfer=500000000`, không Nguy hiểm) — tức cổng không rỗng |

> Ghi nhận quy trình: lượt 19/09, khi được yêu cầu "mở trang attack", probe của Claude chỉ kiểm
> tab ví có mở kèm `#tx=`, không kiểm kết quả trong ví — và báo "toàn bộ luồng hoạt động". Cổng
> mới kiểm quan hệ giao dịch–chênh lệch–verdict chính vì lẽ đó.

### F-02 · P1 · Màn phỏng vấn cùng lỗi — **ĐÃ TÁI HIỆN TRÊN UI · ĐÃ SỬA**

Tái hiện `phong-van.html`: "Chưa đọc hiểu hết · 0 trên 3 lệnh" ([bằng chứng](phong-van-TRUOC-SUA.json)).
Hậu quả nặng hơn demo: một buổi phỏng vấn lúc này đo mức hiểu trên một thẻ **không có hậu quả nào**.
Sửa: `PhongVan.tsx` dùng `docNguonSong` + `dungTxTanCongSong`; hiện trường hỏng ⇒ dừng ở thẻ lỗi, không thu
dữ liệu rác. Sau: Nguy hiểm · 2 trên 3 lệnh. Owner B (màn hình), D (buổi phỏng vấn).

### F-03 · P1 · Kịch bản "Không rõ đang bảo vệ ai" không bao giờ bật luật 14 trên UI — **MỚI · ĐÃ TÁI HIỆN · ĐÃ SỬA**

Không có trong báo cáo Codex; phát hiện khi đọc lại mã. Hai lỗi chồng nhau:

1. Người trả phí là ví kẻ tấn công, **0 SOL** ⇒ `simulateTransaction` trả `AccountNotFound`. Tài liệu
   19/09 giải thích sai là "cần hai chữ ký" — mô phỏng chạy `sigVerify:false`, không cần chữ ký. Đã
   đính chính trong [`PHONG-KICH-BAN-VA-AI-THAT.md`](../../PHONG-KICH-BAN-VA-AI-THAT.md).
2. Ví luôn khai `nguoiDung: ht.nanNhan` ⇒ luật 14 không thể bật; script Devnet bỏ `nguoiDung` nên
   script "qua" trong khi UI hiện cảnh báo vì mô phỏng hỏng.

Sửa: người trả phí là ví có SOL, chữ ký thứ hai là người uỷ quyền trên tài khoản của chính họ; cờ
`khongKhaiNguoiDung` trong sổ kịch bản — ví, script mô phỏng và script chụp bằng chứng cùng đọc.
Sau: Devnet chỉ còn `NGUOI_DUNG_KHONG_RO`; UI "Cần xem kỹ", không `MO_PHONG_HONG`. Owner B (kịch bản), C nên xem câu chữ.

### F-04 · P1 · Ví dụ tích hợp live Devnet FAIL cùng gốc — **MỚI · ĐÃ TÁI HIỆN · ĐÃ SỬA**

`npm run thu-tich-hop:devnet`: "giao dịch giả danh airdrop bị CHẶN" → FAIL, quyết định `hoi`.
`vi-du-tich-hop/src/chay.js` chuyển `BigInt(HT.soLuong)`. Ví dụ chạy ngoài monorepo nên đọc số dư như một
dApp thật (`getTokenAccountBalance`) ngay trước khi dựng, rút toàn bộ số dư sống. Sau: **8/8 PASS**.

### F-05 · P1 · Dò AI bắn 404 trên host không có hàm server — **ĐÃ TÁI HIỆN · ĐÃ SỬA (dev) · CHƯA KIỂM (Vercel mới)**

Cờ build `VITE_CO_API_AI` (cờ, **không** phải khoá) — chỉ `vercel.json` đặt. Không có cờ ⇒ ví không dò,
nhãn "Diễn giải: tất định — bản này không kết nối máy chủ AI" hiện **trước** khi ai bấm gì. Đo trên dev:
0 request `/api`, 0 lỗi console. Guard: `apps/demo-wallet/test/cheDoAi.test.ts` (đỏ khi bỏ cờ).
**Chưa kiểm trên Vercel** với build mới — cần deploy, mà lượt này không có uỷ quyền deploy. Owner B/C.

### F-06 · P2 · Probe trình duyệt đòi số cố định `500 → 0` — **ĐÃ SỬA**

`soi-trinh-duyet.py` nay kiểm "số dư còn đúng một nửa" (quan hệ), kiểm liên thông đầy đủ ở
`soi-ban-giao-tan-cong.py`. Kết quả 45/45.

### F-07 · P2 · `SoLieu.tsx` khẳng định nội dung thẻ "không đổi — vẫn 500 → 0" — **ĐÃ SỬA**

Câu mô tả bản phỏng vấn 01–04/09 nhưng khẳng định cả về bản hiện tại. Nay tách: lúc đó 500 → 0; bản
đang chạy giữ mức, dòng đổi chủ, độ phủ nhưng số dư khác.

### F-08 · P2 · `npm audit` 5 high — **GIỮ NGUYÊN, CÓ XỬ TRÍ**

Mọi bản vá đề xuất là **hạ major** (`@solana/spl-token@0.1.8`, `pptxgenjs@2.2.0`) — không áp dụng.
Runtime: `spl-token → buffer-layout-utils → bigint-buffer`. Chỉ tooling: `pptxgenjs → image-size`.
Xử trí đã ghi ở `docs/PHU-THUOC.md`. Không đưa "0 lỗ hổng" vào deck.

### F-09 · P0 hồ sơ · Lịch và track — **ĐÃ KHÉP 25/09**

**Cập nhật:** chủ dự án xác nhận track **Best Technical Build**, đội đã vào **chung kết 10/10/2026**. Thể lệ 21/07
ghi chung kết 26/09 tại SIHUB — coi là lịch cũ. Hình thức chung kết theo thể lệ (pitch 5 phút + Q&A 3 phút,
Expo booth) **chưa xác nhận** còn áp dụng. Guard `adrTechnical.test.ts` chuyển sang bất biến mới: track phải
kèm nguồn xác nhận và giữ dòng lịch sử — đã thử đột biến, đỏ đúng chỗ. Ghi chép gốc bên dưới giữ nguyên.

**Ghi chép gốc (trước xác nhận):**

Claude đọc lại Learning Hub ngày 25/09 và trích nguyên văn: vòng loại toàn quốc Product & Business **02/10**,
Technical Build **03/10**, chung kết **10/10**; mentor 28/09 **không** có trên trang. Nguồn lịch trung tâm
`docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md` đã cập nhật, giữ phần lịch sử. **Hạn chính ghi 02/10** vì form
24/08 là Product & Business và chưa có bằng chứng đã đổi. Owner: chủ nhóm/D hỏi BTC.

### F-10 · Cổng phát hành — **BLOCKED (chờ chủ nhóm)**

`kiem-san-pham`: 9/11 đạt sau khi đồng bộ số; còn **Cây làm việc sạch** và **Lượt live đo trên cây sạch**.
`nop-bai-strict`: 5/13 chưa đạt — cây sạch, câu lịch hỏi BTC, release tag, release notes sinh lại sau
commit, bằng chứng tích hợp trên cây sạch. **Không ô nào là lỗi sản phẩm.** Trình tự đóng: commit →
`npm run release-notes` → `npm run thu-tich-hop:devnet` → gắn tag → `npm run nop-bai-strict`.

### F-11 · P1 · Replay tụt 19/29 → 7/29 do chính lượt tối ưu RPC — **ĐÃ TÁI HIỆN · ĐÃ SỬA** · 10 mẫu mainnet vẫn thiếu

**Hồi quy do lượt này gây ra.** Gộp lượt đọc mint và lượt đọc PDA metadata thành một `getMultipleAccountsInfo`
(`fetch.ts`, xem `docs/HIEU-NANG.md` §2b) đổi cách chia lô. Khoá fixture băm theo cả danh sách địa chỉ, nên 12
fixture ghi 21/08 đồng loạt báo thiếu. Tái hiện: chạy replay với `fetch.ts`/`ten-token.ts` của HEAD ⇒ 19/29; với
cây làm việc ⇒ 7/29. `npm test` không bắt được vì không bài nào replay fixture qua `extractFacts` hiện tại.

**Sửa ở adapter, không capture lại.** Capture lại phải đọc Devnet hôm nay — thay dữ liệu lịch sử bằng dữ liệu
khác chỉ vì đổi cách gọi. `replay-rpc.ts` giờ ghép lô mới **theo địa chỉ** từ các lô đã ghi, với hai ranh
giới: địa chỉ có hai giá trị khác nhau trong fixture ⇒ ném (không chọn bừa); địa chỉ chưa từng ghi ⇒ ném
(không trả `null`, vì `null` nghĩa là account không tồn tại). Runner in số mẫu có lượt ghép.

**Bằng chứng tương đương:** Facts của **19/19** fixture giống hệt từng byte giữa mã cũ (khớp nguyên lô, 0 lượt
ghép) và mã mới (12 lượt ghép). `danh-gia-b05` cho kết quả không đổi. Bốn test mới trong `replayRpc.test.ts`;
đột biến "tắt ghép" làm 2 bài đỏ, đột biến "bỏ kiểm mơ hồ" làm 1 bài đỏ.

**Còn lại:** 10 mẫu `MN-01…10` chưa bao giờ có fixture — mẫu mainnet, `capture-rpc.ts` từ chối ghi bằng
endpoint devnet, và lượt này không chạm mainnet. Các ca trình diễn chạy live Devnet (F-01), không dựa vào
replay. Owner A/D.

### F-12 · P1 · Video demo dự phòng lệch bản đang chạy — **CHƯA LÀM · cần quyết**

`docs/nop-bai/video/CUSTOS-DEMO.mp4` quay trên bản cũ (bảng 500 → 0). Bản hiện tại cho 490 → 245. BTC
chiếu video khi sự cố — video nói số khác màn hình là vấn đề trung thực. Cần quay lại trên đúng build. Owner D.

### F-13 · P1 · L3 gắn cờ mọi Approve, kể cả ca đối chứng — **ĐÃ TÁI HIỆN · ĐÃ SỬA**

Ca "Cấp quyền rút vừa đủ — đối chứng" nằm trong kịch bản demo 60–90 giây. Trước khi sửa, thẻ hiện
**Bình thường** ngay trên dòng **"Custos đề nghị kiểm tra thủ công"**, và câu "Giao dịch cấp quyền rút cho
ví khác". Nguyên nhân: hành động chính chỉ suy từ dòng tiền; Approve không có dòng tiền ⇒ `hanhDong = null`
⇒ mọi delegate mới bị xếp vào "hậu quả lệch" ⇒ `aiAdvisory`. L3 gắn cờ **sự tồn tại** của Approve — trái
quyết định đã khoá số 6, và làm ca đối chứng mất nghĩa ở lớp diễn giải.

Sửa (`packages/ai/src/nhanDien.ts`): giao dịch **chỉ** cấp quyền rút — không dòng tiền, mọi hậu quả là cấp
quyền, đúng một ví nhận, đúng một mint — thì cấp quyền **là** hành động chính (`type: "cấp quyền rút"`), không
phải lệch. Kèm chuyển tiền, kèm đổi chủ, hay cấp cho hai ví ⇒ giữ nguyên hành vi cũ. `level` không đổi: mô
phỏng Devnet 9/9, 0 lệch.

Đo trên ví (Devnet thật, sau sửa): vừa đủ ⇒ *Bình thường*, không đề nghị, nhận diện `cấp quyền rút ·
USDC-demo → CRZa…picz`, bảng `không ai → CRZa…picz — tới 245,0`. Vượt số dư ⇒ *Nguy hiểm*, nhận diện như trên,
câu mẫu của `SPL_APPROVE_DELEGATE_LON` giờ **hiện** (trước bị bỏ vì phần "lệch" đã nhắc delegate). Sáu test
mới; ba đỏ trên mã cũ. Đột biến "tắt nhánh" ⇒ 3 đỏ; "bỏ điều kiện một ví" ⇒ 1 đỏ.

Chạm vai C (L3). Chủ dự án giao làm ngày 25/09.

### F-15 · P1 · Lời khai của dApp bị so với từ vựng khác ngôn ngữ — **MỚI · ĐÃ TÁI HIỆN · ĐÃ SỬA**

Tìm ra khi sửa F-13. `inspect.ts` so `expectedAction.type !== detectedPrimaryAction.type` nguyên văn. L3 thật
trả `"chuyển token"`; dApp khai `"transfer"`. Hệ quả: **mọi dApp trung thực khai `transfer` bị ghi
`loiKhaiLech` và bật đề nghị kiểm tra** — chiều sai mà quy tắc bất đối xứng cấm. Ví dụ tích hợp ngoài
monorepo khai `{ type: "transfer" }` cho ca "chuyển 0,01 SOL" — theo mã, lời khai đó gặp nhận diện `chuyển SOL`
và bị ghi lệch (suy từ mã, không đo riêng lượt cũ: `ket-qua.json` không lưu `loiKhaiLech`). Nó vẫn PASS vì
chính sách ở đó chỉ đọc `level`. Test cũ không bắt được: chúng giả lập L3 trả `"transfer"` — chuỗi L3 thật không
bao giờ trả.

Sửa: `cungLoaiHanhDong(khai, nhanDien)` với bảng **một chiều** `transfer → chuyển token | chuyển SOL`,
`receive → nhận token`, `approve → cấp quyền rút`; chữ khác so nguyên văn như cũ. `airdrop` cố ý **không** vào
bảng — đó là lời khai của trang tấn công. Khớp vẫn không hạ verdict, không tắt cảnh báo nào. Xuất từ
`@custos-solana/core`; README SDK có bảng từ vựng. Bốn test chạy L3 thật, không mock; một đỏ trên mã cũ. Đột
biến "so chuỗi thô" ⇒ 1 đỏ; "thêm `airdrop` vào bảng" ⇒ 2 đỏ; "`in` thay `Object.hasOwn`" ⇒ 1 đỏ (khoá
`constructor` lọt thành khớp). Cổng tấn công → ví 4/4, tích hợp tất định 14/14, Devnet 8/8 sau sửa.

Chạm vai A (core). Nên báo chủ vai A.

### F-16 · P2 · Câu tóm tắt ca cấp quyền rút đọc vấp — **ĐÃ SỬA**

Thẻ ca vượt số dư hiện *"CRZa…picz — tới 981,0 sẽ được quyền rút USDC-demo của bạn…"*: `tomTat()` ghép nguyên
ô `after` của bảng (`"<ví> — tới <hạn mức>"`) vào câu, con số treo giữa địa chỉ và động từ. Nay tách ví và hạn
mức: *"Ví CRZa…picz sẽ được phép rút tới 1.001,0 USDC-demo của bạn, bất cứ lúc nào."* — đúng câu mẫu
`docs/DAC-TA-L3.md`. Bảng không có hạn mức thì câu không nói số. Hai test mới, đỏ trên mã cũ; đo lại trên ví.

### Sự cố hiện trường 25/09 ~03:03 (giờ VN) — **ĐÃ DỰNG LẠI**

Trong lúc xem thử trên bản dev, hai thẻ bị bấm **"Vẫn ký"**: `2GRok2EP…` (thẻ "Nhận thưởng nhưng token rời
ví": memo + Transfer 10 token) và `5oFLUUFM…` (thẻ "Đổi chủ tài khoản token": `setAuthority`). Bản dev có khoá
Devnet trong `apps/demo-wallet/.env.development.local`, nên hai giao dịch được gửi thật. Tài khoản nguồn đổi
chủ, ví báo đúng *"Hiện trường demo trên Devnet chưa sẵn sàng"*. Đã chạy `npm run hien-truong`: mint mới
`GgtiQF7G…`, tài khoản nguồn `7qqDtuVs…`, số dư 500. Các số `490 → 245` ở trên đo TRƯỚC khi dựng lại; nay là
`500 → 250`. Cổng tấn công → ví chạy lại sau khi dựng: 4/4.

Bài học vận hành: trước buổi trình diễn, chỉ chạy **bản build công khai** (không có khoá), hoặc chạy
`npm run hien-truong` ngay trước giờ.

### F-14 · P2 · `AGENTS.md` không nằm trong script đồng bộ số — **ĐÃ SỬA**

`npm run so-lieu` sửa `CLAUDE.md` nhưng bỏ qua `AGENTS.md` (bản sao cho Codex). Đã thêm vào
`scripts/dong-bo-so-tai-lieu.mjs` — cùng một luật cho cả hai tệp; lượt đồng bộ kế tiếp đổi `AGENTS.md`
1025 → 1030.
