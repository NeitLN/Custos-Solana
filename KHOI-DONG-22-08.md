# Custos — Gói khởi động Ngày 1 · 22/08/2026

> Tài liệu này **không thay thế** `KE-HOACH-15-NGAY.md`. Nó lấp bốn chỗ kế hoạch để trống mà ngày 22/8 cần đến ngay: câu hỏi cho BTC, tin nhắn gửi ví/dApp, quy trình spike devnet, và cấu trúc thư mục cho 4 người.
>
> Phần code vẫn **chưa được phép chạy**. Cần lệnh `DUYỆT KẾ HOẠCH – BẮT ĐẦU BUILD`.

---

## 0 · Việc gấp nhất, xếp theo giờ

| Giờ 22/8 | Ai | Việc | Nếu bỏ lỡ |
|---|---|---|---|
| **Sáng, tại Training Session 2** | **D** | Hỏi BTC 5 câu ở mục 1 | Không có cơ hội hỏi trực tiếp nào khác trước 5/9. Hỏi qua form/email mất 2–3 ngày, mà toàn bộ lịch đang **giả định** hạn nộp là 3/9 |
| Trong ngày | **D** | Gửi tin nhắn mục 2 cho 3–5 ví/dApp | Kinh doanh chiếm 25% rubric, hiện có **0** xác thực. Gửi muộn = không kịp nhận trả lời trước khi làm deck |
| Trong ngày | **B** | Bắt đầu spike mục 3 | Cổng 24/8. Không chốt được giao dịch demo thì không có demo |
| Trong ngày | **cả đội** | Chốt cấu trúc mục 4, `git init`, commit đầu tiên | Bốn người vibe code không có ranh giới thư mục sẽ giẫm chân nhau từ ngày 2 |

---

## 1 · Năm câu hỏi cho BTC — D hỏi sáng 22/8

Hỏi theo thứ tự này. Câu 1 và 2 là bắt buộc; ba câu còn lại hỏi nếu còn thời gian.

**1. Hạn nộp hồ sơ vòng loại cấp trường 5/9 là ngày nào, mấy giờ, và nộp qua kênh nào?**
Cần con số chính xác, không phải "trước ngày thi". Hỏi rõ: form đăng ký online, email, hay nộp trực tiếp? *Ghi lại nguyên văn câu trả lời.*

**2. Hồ sơ gồm đúng những gì?**
Đối chiếu với danh sách đội đang giả định: link demo chạy được · repo public · pitch deck · video 60–90s. Hỏi thêm:
- Deck nộp định dạng nào — PDF hay PPTX? Giới hạn bao nhiêu slide?
- Video có giới hạn dung lượng, độ phân giải, hay phải upload lên nền tảng nào cụ thể không?
- Có cần **tài liệu mô tả sản phẩm** riêng không? *(File lịch của BTC có nhắc mục này, Thể lệ thì không — cần làm rõ.)*

**3. Rubric chấm chính thức của track Best Product & Business là bản nào?**
Thể lệ ghi 4 tiêu chí theo track. Trang `docs.unihackfest.vn` lại có một bản khác: capstone 100 điểm, 9 tiêu chí, có mục "Education/Community Impact". **Hai bản này mâu thuẫn.** Hỏi bản nào áp dụng cho vòng trường 5/9.

**4. Điều kiện kỹ thuật phòng J.5.3?**
7 phút/đội, có live demo. Cần biết: đội dùng máy của mình hay máy BTC? Có wifi trong phòng không, hay phải tự phát 4G? Cổng màn hình là HDMI hay USB-C? Có được cắm thử trước giờ thi không?

**5. Đăng ký đội chốt khi nào?**
Đội 4 người. Danh sách thành viên còn sửa được đến lúc nào? Có giới hạn số người được lên trình bày không?

> **Sau khi hỏi xong:** D ghi câu trả lời vào mục 6 ngay trong ngày, không để trong đầu. Nếu hạn nộp **sớm hơn 3/9**, toàn bộ lịch trong `KE-HOACH-15-NGAY.md` phải lùi lại — và cả đội cần biết trong ngày 22/8, không phải ngày 30/8.

---

## 2 · Tin nhắn gửi ví và dApp — D gửi trong ngày 22/8

### Nguyên tắc

Một câu hỏi, không kèm deck, không kèm link, không xin lịch họp. Mục tiêu là **một chữ "có"** hoặc **một lý do từ chối** — cả hai đều là dữ liệu dùng được trên sân khấu. Xin họp ngay ở tin đầu là cách chắc chắn nhất để không ai trả lời.

### Bản tiếng Việt — Telegram / X DM / Discord

> Chào anh/chị, em là sinh viên đang xây một SDK phân tích giao dịch Solana: nó mô phỏng giao dịch trước khi người dùng ký, chỉ ra những hậu quả **không thuộc về hành động chính** (ví dụ: giao dịch tên là swap nhưng kèm đổi quyền sở hữu tài khoản token), và giải thích bằng **tiếng Việt**.
>
> Em muốn hỏi đúng một câu: nếu có một SDK như vậy, đội mình có thử tích hợp không ạ? Em không xin họp — chỉ cần "có / không / chưa cần" là em biết mình đang đi đúng hướng hay không.

### Bản tiếng Anh — cho đội quốc tế

> Hi, I'm a student building a transaction-intelligence SDK for Solana wallets. It simulates a transaction before signing and surfaces the consequences that **don't belong to the transaction's primary action** — e.g. a tx presented as a swap that also reassigns ownership of your token account — explained in **Vietnamese** for VN users.
>
> One question only: would your team try integrating something like that? Not asking for a call — a "yes / no / not now" already tells me a lot.

### Gửi cho ai — danh sách gợi ý, D tự bổ sung

| Nhóm | Ví dụ | Kênh |
|---|---|---|
| Ví Solana có người dùng VN/ĐNÁ | Coin98 và các ví local khác | X DM, Telegram support, email BD |
| dApp Solana do người Việt xây | Dự án trong Superteam Vietnam | Telegram Superteam VN |
| Nền tảng embedded wallet | Privy, Dynamic, Turnkey, Para | Discord kênh dev |
| Cộng đồng | Superteam Vietnam, Solana Vietnam | Đăng công khai một lần, kèm đúng câu hỏi đó |

**Ghi lại mọi phản hồi** — kể cả "không" — vào mục 6. Trên sân khấu, *"chúng em hỏi 5 đội, 2 trả lời, 1 nói sẽ thử"* mạnh hơn nhiều so với im lặng, và trung thực hơn nhiều so với "thị trường rất tiềm năng".

---

## 3 · Spike giao dịch devnet — B, 22–23/8, chốt trước 24/8

### Câu hỏi cần trả lời

**Dựng được một giao dịch devnet duy nhất chứa cả ba thứ sau không?**

1. Các instruction của một **hành động chính hợp lệ**
2. Một `Transfer` chuyển 500 token sang ví lạ
3. Một `SetAuthority` đổi `AccountOwner` tài khoản token của người ký

Phần 2 và 3 gần như chắc chắn làm được. **Rủi ro nằm hết ở phần 1.**

### Điều cần nhận ra sớm để đỡ mất một ngày

Custos **không cần thanh khoản thật**. Đội tự tạo mint SPL của chính mình trên devnet và tự mint 500 token vào ví demo — gọi nó là USDC-demo, gắn nhãn rõ trên giao diện. Bảng chênh lệch vẫn trung thực vì token đó có thật và giao dịch thật sự chuyển nó.

Cái duy nhất không tự tạo được là **route swap qua một pool có thật**. Đó là thứ cần spike.

### Thứ tự làm

| # | Bước | Kết quả cần có |
|---|---|---|
| 1 | Tạo burner keypair devnet, xin SOL từ faucet | Có SOL trả phí. **Đây là rào cản thật, đã cắn ngày 21/8** — xem bảng bên dưới |
| 2 | Tạo mint SPL riêng, mint 500 token vào ví demo | Tài khoản token có số dư thật, xem được trên Explorer |
| 3 | Dựng tx chỉ gồm `Transfer` + `SetAuthority`, ký, kiểm tra trên Explorer | **Đây là xương sống demo. Bước này chạy được là demo đã sống** |
| 4 | `setWhirlpoolsConfig('solanaDevnet')` + `createSplashPool` với hai mint ở bước 2 | Pool tồn tại trên devnet |
| 5 | Mở position, cấp thanh khoản vào pool | Pool có thanh khoản |
| 6 | `swapInstructions(...)` — lấy mảng instruction, **không gửi đi** | Có swap-leg để ghép |
| 7 | Ghép instructions bước 6 + `Transfer` + `SetAuthority` thành một tx | Giao dịch demo đầy đủ theo `CUSTOS.md` mục 07 |
| 8 | **Thêm một instruction gọi program ngoài danh sách đã xác minh** (ví dụ SPL Memo với payload nhị phân) | Coverage ra **10/11** một cách thật — xem `PITCH-VA-PHAN-BIEN.md` mục 1 |

> **Đã tra cứu trước, xem `NGHIEN-CUU-21-08.md` mục 1.** Không cần đi tìm pool có sẵn — Orca cho tạo pool riêng trên devnet với token của chính mình, và `swapInstructions` trả về *instructions* nên ghép được vào giao dịch chung. **Jupiter đã loại: chỉ chạy mainnet.**
>
> ⚠️ SDK Orca dùng **Web3.js v2 (`@solana/kit`)**, không tương thích v1.x. Giữ v2 **bên trong module dựng giao dịch của B**, xuất ra tx đã serialize — đừng để phiên bản lan sang Custos Core của A.

### ⚠️ Lấy SOL devnet — bốn đường, đã thử thật ngày 21/8

| Đường | Kết quả | Ghi chú |
|---|---|---|
| `requestAirdrop` qua RPC công khai | ❌ **429** | Rate limit theo IP. Thử 3 lần, 3 mức 2/1/0.5 SOL, đều chặn |
| `faucet.solana.com` | ⚠️ **2 lượt / 8 giờ** | Theo tài khoản GitHub. Dùng hết là phải chờ. **Trang ghi rõ AI agent không được dùng** — người thật bấm thì hợp lệ |
| `devnet-pow` | ✅ **Đường dành cho tự động hoá** | Faucet proof-of-work, **không rate limit**. Cần Rust (đã có). Chính trang faucet chỉ định đường này cho AI agent |
| `solana-test-validator` | ✅ **SOL không giới hạn** | Validator chạy cục bộ. Cần Solana CLI (chưa cài). **Là lối thoát nếu devnet giở chứng đúng hôm demo** |

```bash
cargo install devnet-pow
devnet-pow mine -d 3 --reward 0.02 --no-infer -t 5000000000
```

> **Bài học vận hành:** nạp SOL một lần vào **ví cố định** (`.devnet/vi-demo.json`), đừng sinh ví mới mỗi lần chạy. Bản đầu của Demo Wallet sinh ví mới mỗi lần tải trang — nạp xong reload là mất trắng, mà kế hoạch demo lại yêu cầu "ví nạp sẵn".

---

### Tiêu chí quyết định — cổng 24/8

| Kết quả spike | Hành động |
|---|---|
| Bước 4 có route chạy được | Giữ nguyên kịch bản: hành động chính = **hoán đổi SOL sang USDC** |
| Bước 4 không có route, hoặc đã mất hơn một ngày | **Đổi hành động chính** sang thứ chắc chắn chạy trên devnet: *"gửi 10 USDC-demo cho bạn"* hoặc *"mint một NFT"*. Câu chuyện **không đổi một chữ nào** — vẫn là "hành động chính là X, giao dịch còn làm thêm Y và Z không phục vụ X" |
| Bước 3 không chạy được | Dừng mọi việc khác cho tới khi xong. Đây là điều kiện sống còn của demo |

> **Không được làm:** giả lập swap bằng hai lệnh `Transfer` rồi gọi nó là swap trên sân khấu. Thể lệ BTC ghi rõ trình bày sai về mức độ hoàn thiện bị trừ điểm hoặc loại. Đổi hành động chính là quyết định hợp lệ; nói dối về nó thì không.

---

## 4 · Cấu trúc thư mục và ranh giới sở hữu

Kế hoạch yêu cầu *"mỗi người một thư mục, không sửa chéo"* nhưng chưa đặt tên thư mục nào. Đây là bản đề xuất — chốt trước khi ai đó tạo file đầu tiên.

```
Hackathon/
├─ packages/
│  ├─ types/            # HỢP ĐỒNG — InspectResult. Xem quy tắc bên dưới
│  ├─ core/             # A · L1 bóc tách + L2 tám luật + đóng gói SDK
│  └─ ai/               # C · L3: hành động chính, diễn giải, aiAdvisory, chữ tiếng Việt
├─ apps/
│  ├─ demo-wallet/      # B · Demo Wallet — Devnet Only
│  └─ fake-attack/      # B · trang tấn công giả
├─ scripts/             # B · dựng giao dịch devnet, tạo mint, airdrop
├─ data/
│  └─ seed/             # D · 25 mẫu gắn nhãn — cũng chính là bộ test của A
├─ docs/
│  ├─ cuoc-thi/         # tài liệu BTC (đã có)
│  └─ pitch/            # D · deck, kịch bản video, kịch bản pitch 4 phút
└─ CUSTOS.md · KE-HOACH-15-NGAY.md · KHOI-DONG-22-08.md · CLAUDE.md · README.md
```

### Quy tắc sở hữu

| Thư mục | Chủ | Ai được sửa |
|---|---|---|
| `packages/types/` | **Hợp đồng chung** | **Không ai sửa một mình.** Đổi kiểu này phải có đồng ý của cả 4 người. A giữ bút |
| `packages/core/` | A | Chỉ A |
| `packages/ai/` | C | Chỉ C |
| `apps/`, `scripts/` | B | Chỉ B |
| `data/seed/` | D | D thêm mẫu; A được **đọc** để chạy test, không sửa nhãn |
| `docs/pitch/` | D | Chỉ D |

`packages/types/` chỉ chứa **một file duy nhất**, nội dung đúng bằng khối `InspectResult` trong `CLAUDE.md`. Đóng băng ngày 22/8. Đây là lý do B dựng được toàn bộ giao diện bằng dữ liệu giả từ ngày đầu mà không phải chờ A hay C.

*(Tên `types` là kiểu dữ liệu TypeScript — không liên quan gì đến smart contract. Custos không có smart contract.)*

### Công cụ

- **npm workspaces** — có sẵn trong Node 24, không cài thêm gì. Không dùng Turborepo/Nx cho 15 ngày
- `apps/demo-wallet` và `apps/fake-attack`: Vite + React 19 + Tailwind v4, giống PawPass
- ⚠️ **Bẫy đã biết:** phải đặt `css: { postcss: {} }` trong `vite.config.ts`, nếu không Vite leo lên thư mục cha và bắt nhầm `postcss.config.mjs` của repo UniPilot-AI

### Lệnh `git init` — chuẩn bị sẵn, chưa chạy

`Downloads/Hackathon` hiện **vẫn nằm trong repo cha** ở `C:/Users/Viet Tien`. Kiểm chứng:

```bash
cd "c:/Users/Viet Tien/Downloads/Hackathon"
git rev-parse --show-toplevel      # đang trả về: C:/Users/Viet Tien  ← sai
```

Chuỗi lệnh cần chạy khi có lệnh build *(người dùng tự chạy phần commit)*:

```bash
cd "c:/Users/Viet Tien/Downloads/Hackathon"
git init
git rev-parse --show-toplevel      # phải trả về .../Downloads/Hackathon
git add .
git status                          # kiểm tra detail_program.pdf KHÔNG có trong danh sách
git commit -m "chore: khởi tạo repo Custos — tài liệu sản phẩm và kế hoạch 15 ngày"
```

Sau đó tạo repo public trên GitHub và push. **Xác minh một lần nữa rằng `docs/cuoc-thi/detail_program.pdf` (76MB) không bị đẩy lên** — `.gitignore` đã loại nó, nhưng kiểm tra bằng `git status` vẫn rẻ hơn nhiều so với việc gỡ nó khỏi lịch sử git sau này.

> Repo cha sẽ nhìn thấy `Downloads/Hackathon` như một repo lồng. Không ảnh hưởng gì đến Custos. Nếu muốn cho gọn, thêm `Downloads/Hackathon/` vào `.gitignore` của repo cha.

---

## 5 · Bảng việc ngày 22/8

| Ai | Việc trong ngày | Xong nghĩa là |
|---|---|---|
| **Cả đội** | Chốt cấu trúc mục 4 · `git init` · tạo repo public · đóng băng `packages/types/` · commit đầu tiên | Bốn người clone được và biết mình sửa thư mục nào |
| **A** | Dựng khung `packages/core`, viết signature `inspect()` trả về dữ liệu cứng đúng kiểu | C và B gọi được hàm thật, dù kết quả còn là giả |
| **B** | Spike mục 3, bước 1–3 | Có link Explorer của một giao dịch devnet chứa `Transfer` + `SetAuthority` |
| **C** | Đọc `CUSTOS.md` mục 03–04 · thử prompt nhận diện hành động chính trên 2–3 giao dịch mẫu | Biết prompt có ra kết quả ổn định hay không |
| **D** | Hỏi BTC mục 1 · gửi tin nhắn mục 2 · ghi kết quả vào mục 6 | Đội biết hạn nộp thật, và có ít nhất 3 tin nhắn đã gửi đi |

**Cuối ngày, mỗi người một commit.** BTC yêu cầu lịch sử commit thể hiện quá trình build thật.

---

## 6 · Nhật ký — điền trong ngày 22/8

### Câu trả lời của BTC

| Câu hỏi | Trả lời | Ai hỏi, lúc nào |
|---|---|---|
| Hạn nộp chính xác + kênh nộp | *(chưa có)* | |
| Hồ sơ gồm những gì, định dạng deck/video | *(chưa có)* | |
| Rubric nào là chính thức | *(chưa có)* | |
| Điều kiện kỹ thuật phòng J.5.3 | *(chưa có)* | |
| Hạn chốt danh sách đội | *(chưa có)* | |

> **Nếu hạn nộp sớm hơn 03/09:** báo cả đội ngay trong ngày và lùi toàn bộ mốc trong `KE-HOACH-15-NGAY.md`.

### Phản hồi từ ví / dApp

| Đội | Kênh | Ngày gửi | Trả lời |
|---|---|---|---|
| **Too Hard** | *(chưa ghi kênh)* | 21/08 | **CÓ, có điều kiện** |

**Phản hồi nguyên văn (21/08):**

> "Có — bên mình sẵn sàng thử tích hợp trên Devnet nếu SDK có tài liệu và demo hoạt động. Đây là đồng ý thử nghiệm, chưa phải cam kết đưa vào production."

**Đọc cho đúng — ba điều phản hồi này KHÔNG nói:**

1. Không phải cam kết đưa vào production. Chính họ nói rõ, và ta phải nhắc lại nguyên văn điều đó trên sân khấu.
2. Không phải khách hàng trả tiền. Đây là **đồng ý thử**, không phải hợp đồng.
3. Đội trả lời: **Too Hard**. Còn thiếu **kênh liên hệ** (Telegram / X / Discord / email) — giám khảo hỏi "liên hệ qua đâu" mà ấp úng thì phản hồi mất giá trị.

**Hai điều kiện họ đặt ra — giờ là yêu cầu bắt buộc, không còn là "nên có":**

| Điều kiện | Trạng thái |
|---|---|
| Demo hoạt động | ✅ có — devnet, link Explorer verify được |
| **Tài liệu tích hợp SDK** | ✅ đã viết: `packages/core/README.md` |

**Cách nói trên sân khấu (đúng mức, không phóng đại):**

> *"Chúng em nhắn N đội. Một đội trả lời sẵn sàng thử tích hợp trên devnet, với điều kiện có tài liệu và demo chạy được. Họ nói rõ đây chưa phải cam kết production."*

Không được rút gọn thành *"đã có ví đồng ý tích hợp"* — bỏ mất chữ "thử" và chữ "chưa phải production" là trình bày sai mức hoàn thiện, đúng thứ Thể lệ trừ điểm.

### Kết luận spike devnet

| Mốc | Kết quả |
|---|---|
| Bước 3 — `Transfer` + `SetAuthority` chạy được? | *(chưa có)* |
| Bước 4 — có route swap devnet? | *(chưa có)* |
| **Hành động chính chốt ngày 24/8** | *(chưa có)* |

### Việc thứ tư — xem sản phẩm đối thủ

Mở Phantom hoặc một sản phẩm của Blowfish, xem output thật của họ. Nếu họ đã làm gần với "hậu quả lệch hành động chính" thì phải biết **trước** khi lên sân khấu nói đó là khoảng trống.

| Sản phẩm | Họ hiển thị gì | Ai xem |
|---|---|---|
| | | |

---

## Vẫn đang chờ lệnh

Gói này là phần chuẩn bị không phải code. Để bắt đầu viết code, gửi:

`DUYỆT KẾ HOẠCH – BẮT ĐẦU BUILD`
