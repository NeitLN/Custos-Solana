# Thử sản phẩm dưới vai giám khảo — 05/10/2026

> Người thử: Claude (đi hành trình **thật trên production** bằng Chromium, trình chặn popup bật, **không
> có file khoá**) và Codex gpt-5.5 (đọc mã nguồn và câu chữ, chỉ đọc). Hai bên đối chiếu với nhau hai
> vòng. Mọi số đo dưới đây lấy từ production `custos-solana.vercel.app` và
> `solbonus-custos.vercel.app`.

## Kết luận một câu

**Sản phẩm chạy đúng, không lỗi trang.** Luồng mạnh nhất (dApp độc hại → ví → Custos → Chặn) hoạt
động mà **không cần khoá**. Nhưng giám khảo khó tự tìm ra luồng đó, và khi tới cửa sổ ký thì dễ tưởng
mình bị kẹt vì thiếu khoá. Vấn đề nằm ở **đường dẫn dắt và câu chữ**, không nằm ở engine.

## Nhập vai giám khảo: hai người chấm độc lập theo rubric Technical Build

Rubric nguyên văn trong thể lệ ([ADR-0001 §2](../../adr/0001-doi-huong-technical-build.md)). Giám khảo 1
là Claude, chấm sau khi tự đi hành trình trên production. Giám khảo 2 là Codex gpt-5.5, chấm sau khi đọc mã
nguồn và nhận số đo live. Mỗi bên chấm **trước khi xem điểm của bên kia**.

| Tiêu chí | Trọng số | GK1 Claude | GK2 Codex | Lý do chung |
|---|---|---|---|---|
| Độ khó và chiều sâu kỹ thuật | 30 % | 8,0 | 8,4 | Pipeline L1 → L2 → L3, chỉ L2 sinh `level`; fail-safe; khớp neo bytes và xác minh ed25519; connector có test đối kháng; 1357 test. Bị trừ: engine luật heuristic, chưa có ground truth ngoài đời |
| Kiến trúc on-chain/off-chain, chất lượng smart contract | 25 % | 5,5 | 6,5 | **Không có smart contract** (quyết định khoá số 5). Phòng thủ hợp lý ("không dựng contract giả"), nhưng rubric ghi đích danh smart contract nên không thể cao |
| Tận dụng Solana stack, composability, hiệu năng | 25 % | 7,5 | 8,0 | Wallet Standard và wallet-adapter thật, `simulateTransaction`, v0/ALT, Token-2022; popup ra cảnh báo dưới 2 s. Bị trừ: ví mẫu chứ không phải Phantom; tin cậy RPC chỉ được quản trị, không triệt tiêu |
| Độ hoàn thiện demo và trình bày | 20 % | 7,0 | 7,2 | Luồng chạy không cần khoá, có bằng chứng ký thật. Bị trừ vì 6 điểm vấp ở mục dưới |
| **Tổng có trọng số** | | **≈ 7,1** | **≈ 7,6** | Hai bên lệch 0,5, chủ yếu ở tiêu chí smart contract |

**Ấn tượng đầu (GK2, nói như trên sân khấu):** *"Tôi thấy một hệ thống kỹ thuật thật, không phải demo
dựng cảnh: dApp gửi bytes, ví kiểm đúng bytes, rồi mới cho người dùng quyết định. Điểm đáng nể là các bạn
biết tự giới hạn: AI không được ra verdict, không có contract giả, không gọi '0 false positive'. Nhưng
trong 5 phút, trải nghiệm vẫn còn vài chỗ làm giám khảo phải tự lần mò đúng luồng mạnh nhất."*

### Sáu câu giám khảo sẽ hỏi, và câu trả lời mạnh phải có gì

| # | Câu hỏi | Câu trả lời mạnh phải có | Bằng chứng trong repo |
|---|---|---|---|
| 1 | Tiêu chí 25 % nói smart contract, không có thì chấm thế nào? | Nói thẳng đây là quyết định thiết kế: mối đe doạ nằm **trước lúc ký**, ở phía ví; dựng contract chỉ để lấp rubric là sai sản phẩm. Kiến trúc on/off-chain thể hiện ở ranh giới ví/dApp, cách ly origin và đối chiếu chain sau khi chạy | ADR-0001 mục rủi ro smart contract; ADR-0004 |
| 2 | Khác gì Lighthouse / Phantom Transaction Validation? | Custos giúp người dùng **hiểu trước khi ký**; Lighthouse **cưỡng chế lúc thực thi**. Giao dịch SolBonus làm đúng điều bản xem trước hiển thị, nên assertion kiểu "khớp preview" chưa chắc cứu được người dùng. Hai lớp bổ trợ nhau | `docs/nghien-cuu/LIGHTHOUSE.md` |
| 3 | Chạy được với Phantom thật không? | **Chưa chứng minh trên Phantom production.** Đã chứng minh ranh giới tích hợp qua Wallet Standard: dApp dùng wallet-adapter thường và không gọi `inspect()` | ADR-0004, `spikeKetNoi.test.ts`, `solbonus.test.ts` |
| 4 | RPC nói dối, hoặc trạng thái đổi giữa lúc mô phỏng và lúc gửi? | Custos không trustless: không kiểm được thì đóng (fail closed); có xác minh genesis; biên nhận phát hiện lệch **sau** khi chạy, trong phạm vi các trường được chấm; Lighthouse có thể bổ trợ TOCTOU | `bao-mat/THREAT-MODEL.md`, `bienNhan.ts` |
| 5 | Có báo nhầm không? | **Chưa đo được** vì chưa có ground truth. Con số hiện có: 0 bị cáo buộc, 7 bị gắn cờ "Cần xem kỹ" | `SEED-DATASET.md` mục 0b3–0b4, `so-lieu.json` |
| 6 | Ai sẽ tích hợp, có bằng chứng adoption chưa? | Có consumer mẫu (31 dòng tích hợp), package có test; **chưa có pilot bên thứ ba, chưa có người mua** | `vi-du-tich-hop/`, D1 trong TIEN-DO |

### Câu bị trừ điểm vì nói quá (không được nói)

- "Có smart contract", "bảo vệ on-chain", "đã tích hợp Lighthouse", "chặn on-chain".
- "Hỗ trợ Phantom" như thể đã chạy trên Phantom production.
- "0 báo nhầm" hoặc "0 giao dịch bị gắn cờ". Câu đúng: **0 bị cáo buộc, 7 bị gắn cờ**.
- "AI quyết định an toàn hay nguy hiểm". Thực tế chỉ L2 sinh `level`.
- "Đã có pilot hay đối tác dùng".
- "1357 test chứng minh độ chính xác ngoài đời". Test chứng minh kỷ luật kỹ thuật, không thay ground truth.
- Số test: biên bản nghiệm thu 04/10 ghi 1354 vì đó là ảnh chụp ở commit `22e04f9`. **Số hiện hành là
  1357**; trên sân khấu nói số hiện hành.

## Những gì chạy tốt (đo được)

| Bước | Kết quả |
|---|---|
| Trang chủ | LCP 340 ms, network-idle 1,1 s khi đã warm. Lần đầu 10 s là do Vercel khởi động nguội |
| SolBonus: Kết nối → "Cho kết nối" | Popup mở được dù trình chặn popup bật |
| "Tìm token DEMO trên Devnet" | 6,8 s, tìm ra 5 phiên DEMO từ chain |
| "Nhận 1.000 SOLB" → cửa sổ ký | 1,4 s ra **Nguy hiểm**: 500 → 250, "Chủ: Bạn → 7oGP…", mã `SPL_SET_AUTHORITY__ACCOUNT_OWNER` |
| "Chặn giao dịch" | SolBonus báo "chưa gửi giao dịch lên Devnet", không có `sendTransaction` |
| Trang Tích hợp: hai nút chạy thử | 0,1–0,2 s: tấn công ⇒ Chặn, lành ⇒ Cho ký |
| Phòng phân tích `/vi`, "Tấn công đầy đủ" | Devnet trực tiếp 3,9–4,4 s; dữ liệu đã ghi 0,2–3,1 s; cả hai ra **Nguy hiểm** |
| Lỗi trang, tràn ngang ở 390px | 0 |

## Vấn đề, theo thứ tự nghiêm trọng (hai bên đã thống nhất)

| # | Mức | Ở đâu | Giám khảo gặp gì | Bằng chứng |
|---|---|---|---|---|
| 1 | **Chặn** | Trang chủ: nút chính "Mở demo Custos" (header và hero) | Vào *Phòng phân tích*, không phải luồng dApp → ví. Dải hành trình có nút SolBonus nằm **dưới màn hình đầu** | `landing/Hero.tsx:42`, `SiteHeader.tsx:88`, `links.ts:29` |
| 2 | **Chặn** | Cửa sổ ký `ket-noi.html` | Thứ nổi bật nhất là nút tối màu "Chọn file khoá (.json)…" kèm "Cần để ký. Chọn .devnet/vi-demo.json". Giám khảo không có file này, nên tưởng demo bị khoá, dù họ **đã** chứng minh được điểm chính bằng nút Chặn | `ket-noi.tsx:191-195`, "Vẫn ký" mờ ở `:254` |
| 3 | **Chặn** (riêng Inspector) | `soi.html` | Đòi base64 của một giao dịch chưa ký. Giám khảo không có, và không có nút "dùng mẫu" | `Inspector.tsx:180, 210, 273` |
| 4 | Khó hiểu | Cửa sổ ký | Token hiện là địa chỉ mint "ECQL…rLoa": "chuyển ECQL…rLoa đi", "Số dư ECQL…rLoa". Câu chuyện "DEMO" bị mất | `ket-noi.tsx:57-66` gọi `inspect` không có `kyHieuToken`; `live/session.ts:731` thì có |
| 5 | Khó hiểu | Phòng phân tích | Ô trống ghi *Chọn "Nhận quà tặng" hoặc "Gửi 10 token"*, nhưng nút lại ghi "Tấn công đầy đủ — …" và "Giao dịch lành tính — đối chứng". Không có lối thoát khi RPC chậm | `App.tsx:1061`, `kichBan.ts:311,332` |
| 6 | Khó hiểu | Tên gọi | Một ví có ba tên: "Ví mẫu" (nav), "Ví demo" (README), "Custos Demo Wallet" (SolBonus); cửa sổ lại ghi "Ví mẫu Custos". Header ghi "Inspector", dòng phụ ghi "Công cụ nhà phát triển" | `ProductNavigation.tsx:8`, `README.md:48`, `trang-tan-cong/src/App.tsx:39`, `ket-noi.tsx:168` |

### Đã cân nhắc rồi bỏ (ghi lại để không ai làm lại)

- **Tối ưu tốc độ trang chủ.** Đo lại khi warm thì LCP chỉ 340 ms. Con số 10 s là khởi động nguội.
- **Đổi mặc định `/vi` sang "Dữ liệu đã ghi".** Chạy Devnet trực tiếp chỉ mất khoảng 4 s và giá trị
  hơn với giám khảo kỹ thuật. Chỉ thêm lối thoát khi RPC chậm.
- **Gắn nhãn DEMO bằng `mintAuthority == ví cố định`.** Sai: đo trên chain, mọi mint DEMO đều có
  `mintAuthority = null` vì quyền mint đã bị thu hồi.
- **Link popup tới `/so-lieu.html#thuc-thi-live`.** Dữ liệu ở đó là lượt CK-05 của luồng cũ, không
  phải lượt SolBonus. Dùng link đó là nói sai nguồn.

## Đường đi 3 phút cho giám khảo (không cần khoá)

1. `https://solbonus-custos.vercel.app/tan-cong/`: **Kết nối ví** → trong popup bấm **Cho kết nối** →
   **Tìm token DEMO trên Devnet** → **Nhận 1.000 SOLB** → đọc **Nguy hiểm** trong popup → **Chặn giao
   dịch** → SolBonus báo chưa gửi gì.
2. `https://custos-solana.vercel.app/tich-hop.html`: bấm hai nút **Chạy kiemTruocKhiKy** để thấy hàm SDK
   thật trả Chặn và ca đối chứng.
3. Lượt **đã ký thật** và đối chiếu chain:
   [`docs/review/ck-20260929/B5-VAN-KY.json`](../ck-20260929/B5-VAN-KY.json). Biên nhận khớp 3/3; trên
   chain số dư 499 → 249,5 DEMO và chủ tài khoản đổi.

## Phương án sửa (thứ tự làm; mọi việc chỉ làm demo rõ hơn hoặc đúng hơn, hợp với giai đoạn đóng băng)

| # | Việc | Chi tiết | File | Công | Rủi ro |
|---|---|---|---|---|---|
| **P0-1** | Nút chính trang chủ dẫn vào luồng dApp → ví | Header và hero: **"Thử như người dùng: SolBonus"** → `LINK.solBonus` (mở tab mới). Nút phụ: "Mở phòng phân tích" → `LINK.viMau`. Có bản EN tương ứng | `Hero.tsx`, `SiteHeader.tsx`, `content.ts` | S | Thấp; guard `nhanC3`, `landing.test` cần cập nhật |
| **P0-2** | Cửa sổ ký nói rõ "không có khoá vẫn thử được" | Khi chưa nạp khoá: bỏ nút tối màu, thay bằng một dòng nhẹ *"Không có file khoá? Bạn vẫn chặn được: bấm **Chặn giao dịch** — SolBonus sẽ không nhận được chữ ký nào. Ký thật cần khoá của đội."* Nút chọn file chuyển thành link nhỏ "Tôi có file khoá của ví demo" | `ket-noi.tsx` | S | Thấp |
| **P0-3** | Link bằng chứng cho lượt đã ký thật | Trong cửa sổ ký và trên trang SolBonus: *"Xem một lượt đã ký thật và đối chiếu trên chain →"* trỏ GitHub `docs/review/ck-20260929/B5-VAN-KY.json` | `ket-noi.tsx`, `trang-tan-cong/src/App.tsx` | S | Thấp |
| **P1-4** | Nhãn token trong cửa sổ ký | **Bước A (S):** thay nhãn mint thô bằng "token (mint ECQL…rLoa)". **Bước B (M, tuỳ thời gian):** trước `inspect`, kiểm bằng chứng DEMO theo đúng 4 điều kiện của `giaoDich.ts:38-66` (decimals 6, supply 500.000.000, không mint/freeze authority, giao dịch tạo phiên do ví cố định ký). Đạt thì `kyHieuToken: {mint: "DEMO"}`. Có timeout ngắn và **không được chặn `inspect`**. Lỗi thì giữ nhãn thô. Không đổi `level` | `ket-noi.tsx` (+ helper trong `ketNoi/`) | S / M | Thấp / vừa (thêm 2–4 lời gọi RPC mỗi mint) |
| **P1-5** | Inspector có giao dịch mẫu | Nút **"Dùng giao dịch mẫu đã ghi"** cạnh "hoặc chọn tệp…". Chạy phát lại kịch bản tấn công (không mạng) và ghi rõ là phát lại | `Inspector.tsx` + fixture có sẵn ở `public/replay/kich-ban.json` | M | Thấp |
| **P1-6** | Phòng phân tích: chữ khớp nút, có lối thoát khi RPC chậm | Ô trống: *"Bấm “Nhận quà tặng — ký để nhận” hoặc “Gửi 10 token cho bạn bè”."* Khi chạy live quá 8 s thì hiện *"RPC đang chậm — thử lại bằng **Dữ liệu đã ghi** (phát lại, không cần mạng)."* | `App.tsx` | S | Thấp |
| **P1-7** | Chuẩn hoá tên | Giao diện dùng **"Ví mẫu Custos"** ở mọi chỗ (README, nav, popup). "Custos Demo Wallet" chỉ là tên adapter trong danh sách ví, kèm chú thích. Header Inspector đổi thành "Công cụ nhà phát triển" | README, `ProductNavigation.tsx`, `ket-noi.tsx`, SolBonus | S | Thấp; nhớ kiểm guard `viDemoCoDinh`, `moiTrangCoH1` |

Sau mỗi việc: chạy `npm run check`. Sau P0: chạy probe SolBonus ở chế độ chặn trên production. Deploy
xong phải gán lại alias SolBonus.

### Việc không phải code (người trong đội làm; Codex ước lượng mức tăng điểm)

| Việc | Ai | Tác động ước lượng |
|---|---|---|
| Đoạn nói 45 giây cho tiêu chí smart contract: vì sao không có contract, kiến trúc on/off-chain nằm ở đâu, Lighthouse bổ trợ ra sao. Không claim "on-chain guard" | D (pitch) | Kiến trúc +0,5 |
| Quay video mới cho luồng Wallet Standard (SolBonus → kết nối → Nguy hiểm → Chặn → 0 gửi → biên nhận B5), làm dự phòng khi RPC trên sân khấu chậm | D | Demo +0,4 |
| Tập trả lời 6 câu hỏi ở trên, đúng các bằng chứng đã dẫn | cả đội | Giữ điểm, tránh bị trừ vì nói quá |

## Phương án tổng hợp và điểm kỳ vọng

| Gói | Gồm | Tác động ước lượng (GK2) | Tổng sau gói |
|---|---|---|---|
| Hiện tại | | | 7,1–7,6 |
| **P0** (code, khoảng nửa ngày) | Nút chính trang chủ → SolBonus · cửa sổ ký nói "không khoá vẫn chặn được" · link lượt ký thật B5 | Demo +0,9 | ≈ 7,3–7,8 |
| **P1** (code, khoảng 1 ngày) | Nhãn token · Inspector có mẫu · chữ Phòng phân tích · chuẩn hoá tên | Demo +0,3 | ≈ 7,4–7,9 |
| **Không phải code** | Đoạn nói về smart contract · video mới | Kiến trúc +0,5, Demo +0,4 | ≈ 7,6–8,1 |

Điểm "Demo" có trần 10, nên các mức cộng dồn ở trên là ước lượng trên, không phải cam kết. Đòn bẩy lớn
nhất **ngoài code** là tiêu chí 25 % smart contract: không sửa được bằng code mà không phá quyết định khoá
số 5, chỉ tăng được bằng cách **trình bày đúng**.

## Đã làm (05/10): bảy việc code, kèm bằng chứng

| # | Việc | Kết quả kiểm |
|---|---|---|
| P0-1 | Nút chính header, hero và menu di động: **"Thử như người dùng"** → SolBonus (tab mới). "Mở phòng phân tích" thành lối phụ, gọi đúng tên | Probe: hero CTA `Thử như người dùng` → `solbonus-custos.vercel.app/tan-cong/`, h1 "Một món quà. Một lần ký?" |
| P0-2 | Cửa sổ ký: mục nạp khoá thu gọn ("Tôi có file khoá của ví demo (đội phát triển)"); khi chưa có khoá, hiện hộp *"Không có file khoá? Bạn vẫn chặn được…"* | Ảnh `06-cua-so-ky-canh-bao.png`. Đội có khoá: nạp xong thì mục khoá biến mất, "Vẫn ký" chỉ bật sau khi tick, 0 gửi khi chặn |
| P0-3 | Link lượt ký thật (Explorer, `LDxqW6…eroQ2`) và biên nhận B5, trong cửa sổ ký và trên SolBonus. Không trỏ trang Số liệu | Như trên |
| P1-4 | Nhãn **DEMO** khi chain chứng minh được (`ketNoi/nhanDemo.ts`: 6 chữ số thập phân, cung 500, không quyền mint hay đóng băng, giao dịch tạo mint do ví cố định ký). Best-effort, tối đa 4 s, không đổi `level` | 9 test (gồm "dApp không giả được nhãn"). Devnet thật: 3/3 mint DEMO được nhận, 1,1–1,5 s. Popup hiện "chuyển DEMO đi", "Số dư DEMO 500 → 250" |
| P1-5 | Inspector: nút **"Dùng giao dịch mẫu đã ghi"** → kiểm bằng phát lại, ghi rõ "không gọi mạng, không ký"; sửa ô base64 thì quay về kiểm live | 4 test. Trình duyệt: Nguy hiểm sau 0,1 s, **0 request RPC** |
| P1-6 | Phòng phân tích: chữ ở ô trống khớp tên nút; báo chậm sau 6 s (trước là 4 s) kèm lối thoát "chọn Dữ liệu đã ghi" | typecheck và test |
| P1-7 | README "Ví demo" → "Ví mẫu Custos"; SolBonus giải thích "Custos Demo Wallet" là tên của Ví mẫu Custos trong danh sách ví | |

`npm run check`: **1370 test pass, 0 fail**. Probe giám khảo trên bản local: 0 lỗi trang.

## Đoạn nói 45 giây cho tiêu chí smart contract (để đội đưa vào pitch)

> "Rubric có mục smart contract, và Custos **không có** smart contract. Đó là quyết định, không phải thiếu sót.
> Rủi ro chúng tôi xử lý xảy ra **trước khi người dùng ký**, ngay trong ví: một dApp xin chữ ký cho giao dịch
> làm nhiều hơn điều nó hứa. Một contract không đọc được giao dịch trước khi nó tồn tại; còn một lớp bảo vệ mà
> tự nó giữ tài sản thì lại trở thành mục tiêu tấn công.
>
> Phần on-chain của Custos nằm ở chỗ khác. Custos mô phỏng chính bytes sắp ký trên Solana, đọc trạng thái
> trước và sau, và sau khi giao dịch chạy thì đối chiếu kết quả trên chain với dự báo. Lượt ký thật của chúng
> tôi khớp 3 trên 3 trường. Lớp cưỡng chế lúc thực thi, kiểu Lighthouse mà Phantom dùng, là lớp **bổ trợ**:
> nó chặn được khi trạng thái đổi giữa lúc xem và lúc chạy, nhưng không giải thích được cho người dùng. Chúng
> tôi chưa tích hợp, và nói rõ vì sao trong tài liệu."

Không được nói thêm: "chặn on-chain", "đã tích hợp Lighthouse", "bảo vệ on-chain".

## Chạy lại lượt thử này

```bash
python scripts/kiem-trinh-duyet/probe-giam-khao.py          # ra build/giam-khao/: ảnh + nhat-ky.json
```

Script đi đúng hành trình giám khảo, không có file khoá, trình chặn popup bật, và **không bao giờ ký hay
gửi** (popup luôn kết thúc bằng "Chặn giao dịch"). Lượt chạy 05/10: 13/13 bước, 0 lỗi trang.
