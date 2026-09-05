# Custos

> Custos phát hiện những hậu quả **không thuộc về hành động chính** của một giao dịch Solana, và giải thích bằng tiếng Việt trước khi người dùng ký.

Transaction-intelligence SDK cho ví và dApp Solana.
Dự thi **UniHackfest 2026** — track Best Product & Business, chủ đề AI × Web3.
Hạn tiếp theo **19/09/2026** — xem `docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md`.

## Demo chạy được

| Link | Là gì |
|---|---|
| **https://neitln.github.io/Custos-Solana/** | Ví mẫu — bấm một nút để xem Custos chặn giao dịch thật trên devnet |
| **https://neitln.github.io/Custos-Solana/tan-cong/** | Trang "airdrop" giả — đẩy giao dịch sang ví, đúng cách một vụ lừa đảo thật diễn ra |

CI dựng lại hai trang này mỗi lần push vào `main`, sau khi chạy hết bộ test.

**Bản công khai cố ý không nhúng khoá ký.** Người xem chạy được toàn bộ phần phân
tích — mô phỏng giao dịch không cần chữ ký — nhưng không ký được. Vậy nên không ai
phá được hiện trường devnet trước buổi thi, và không có khoá riêng nào nằm trong
một trang web công khai. `scripts/soi-ro-ri-khoa.mjs` chặn deploy nếu có khoá lọt vào bundle.

## Ai mua — và điều đó đã chứng minh tới đâu

**Người mua là ví và dApp, không phải người dùng cuối.** Người dùng cuối là người
thụ hưởng: họ không cài SDK, không trả tiền.

> **ICP:** ví embedded, consumer dApp hoặc ví nhỏ phục vụ người dùng Việt Nam / Đông
> Nam Á, có luồng ký giao dịch nhưng chưa có đội transaction-security riêng.

**Vì sao lúc này:** Phantom đã mua đứt Blowfish năm 2024 và đóng dịch vụ bán rời của
nó — ví lớn nhất Solana đã trả tiền để chứng minh loại sản phẩm này có giá trị. Cái
còn thiếu là một lớp **mã nguồn mở, tất định, tiếng Việt** mà một đội nhỏ tự cắm được.
Chúng tôi không tuyên bố là giải pháp duy nhất.

| Câu hỏi | Trả lời hôm nay |
|---|---|
| SDK cài được từ ngoài repo chưa? | **Rồi** — 14,3 giây từ `npm install` tới kết quả đầu tiên, 29 dòng mã tích hợp |
| Người dùng có hiểu cảnh báo không? | **13/20** nêu được hậu quả — nhưng đo trên bản giao diện ngày 29–30/08, đã thiết kế lại sau đó |
| Đã hỏi người quyết định tích hợp chưa? | **Chưa ai.** Bộ câu hỏi ở [docs/PHONG-VAN-NGUOI-MUA.md](docs/PHONG-VAN-NGUOI-MUA.md) |
| Có ví hoặc dApp bên thứ ba nào đang dùng không? | **Chưa có.** Ví dụ tích hợp là do chính đội dựng |
| Thị trường có đủ lớn không? | Mô hình bottom-up ở [docs/QUY-MO-THI-TRUONG.md](docs/QUY-MO-THI-TRUONG.md) — **7/8 biến là giả định**, và nó cho thấy ràng buộc là *năng lực tiếp cận*, không phải quy mô |

Hai dòng cuối là hai ô trống lớn nhất của bài, và chúng tôi nói ra trước khi bị hỏi.
Ví dụ tích hợp đo được **ma sát tích hợp**; nó không đo được nhu cầu thị trường.

## Tích hợp mất bao lâu

```ts
const ketQua = await inspect({ connection, interpret }, tx, {
  locale: "vi",
  nguoiDung: viNguoiDung.toBase58(),   // lấy từ VÍ, không từ dApp
  expectedAction: { type: "transfer", from: "SOL" },
});
if (ketQua.level !== "safe" || ketQua.aiAdvisory) hienCanhBao(ketQua);
```

Nếu `inspect()` ném lỗi hoặc quá hạn: **CHẶN**, không bao giờ thành "ký được".

| Đo trên Devnet, 04/09/2026 | |
|---|---|
| Cài đặt → kết quả đầu tiên | **14,3 giây** |
| Dòng mã tích hợp | **29** |
| Một lượt kiểm tra | **671 ms** — trung vị 5 lượt |
| Cần khoá riêng hoặc khoá API | **không** — mô phỏng không đòi chữ ký |

dApp mẫu chạy được: [vi-du-tich-hop/](vi-du-tich-hop/) · đo lại bằng `npm run thu-tich-hop`.

## Sản phẩm làm gì

Ví hoặc dApp gọi một hàm trước khi cho người dùng ký:

```ts
const result = await custos.inspect(transaction, { locale: "vi" });
if (result.level !== "safe" || result.aiAdvisory) showWarning(result);
```

Custos mô phỏng giao dịch, đối chiếu với một engine luật xác định, rồi trả về hậu quả đo được kèm giải thích tiếng Việt — cùng con số cho biết đã phân tích được bao nhiêu phần của giao dịch.

**Ba lớp:**

| Lớp | Việc | Loại |
|---|---|---|
| L1 | Mô phỏng và bóc tách thay đổi số dư, quyền sở hữu, delegate | Xác định |
| L2 | Engine luật ra verdict Đỏ / Vàng / Xanh kèm mã lý do | Xác định |
| L3 | Nhận diện hành động chính, chỉ ra hậu quả lệch khỏi nó, diễn giải tiếng Việt | Lõi xác định + mô hình ngôn ngữ tuỳ chọn |

AI không tạo và không sửa verdict. Nó chỉ có thể yêu cầu người dùng kiểm tra thủ công.

Mô hình ngôn ngữ là **tuỳ chọn và do bên tích hợp tự cắm** — Custos không nhúng
SDK của nhà cung cấp nào và không giữ khoá API nào. Không cắm gì thì sản phẩm
vẫn chạy đầy đủ bằng lõi xác định. Bốn ràng buộc lên mô hình (không chạm
`level`, không xác nhận an toàn, không hạ được mức nghi ngờ, không nhận giao
dịch thô) đều có test đối kháng — xem [packages/core/README.md](packages/core/README.md).

## Tình trạng thật — đo được, không ước lượng

| Thứ | Số |
|---|---|
| Luật đã chạy | **14** — 12 theo đặc tả, cộng 2 luật sinh từ audit bảo mật |
| Test | **359**, chạy trong `npm run check` |
| Mẫu trong bộ dữ liệu | **33** — cả 14 luật đều có mẫu kích hoạt; **9 luật** có thêm ca đối chứng gần giống, chỉ khác đúng điều kiện quyết định. Năm luật còn thiếu (1, 2, 4, 8, 12) được kê tên kèm lý do trong `packages/core/test/capLuat.test.ts` |
| Giao dịch **bị cáo buộc** (luật buộc tội) trên 9 giao dịch SPL công khai lưu offline | **0** |
| Coverage trung bình trên cohort công khai lưu offline | **82 %** · cohort **neo lại 25/08** |

> Số cập nhật theo lần đo gần nhất tại **[/so-lieu.html](https://neitln.github.io/Custos-Solana/so-lieu.html)** — mỗi con số kèm cách đo và ngày đo.
> *"Bị cáo buộc"* chứ không phải *"báo nhầm"*: chúng tôi chưa gán nhãn ground truth cho cohort, nên đây KHÔNG phải precision/recall hay tỉ lệ false positive. Cohort là dữ liệu lưu **offline** để kiểm engine — demo chạy hoàn toàn trên **Devnet**.

### Bốn loại bằng chứng, và điều mỗi loại KHÔNG chứng minh

| Bằng chứng | Trả lời được | Không trả lời được |
|---|---|---|
| **359 test** tự động | code giữ đúng bất biến đã khoá | độ chính xác ngoài đời thật |
| **33 mẫu** đã gắn nhãn | luật bật đúng ca, im đúng ca đối chứng | tỉ lệ đúng/sai trên traffic thật |
| **Cohort công khai lưu offline** | engine xử lý giao dịch thật ra sao | precision/recall — cohort chưa có ground truth |
| **20 phỏng vấn người dùng** | người thật có hiểu cảnh báo không | ai chịu trả tiền |
| **Ví dụ tích hợp** | SDK dùng được từ ngoài, mất bao lâu | có bên thứ ba nào chọn dùng |
| **Đánh giá AI** — 6/6 bẫy bị chặn | mô hình không bịa được địa chỉ hay số tiền | chất lượng câu chữ; chưa đo với mô hình thật |

Trang [/so-lieu.html](https://neitln.github.io/Custos-Solana/so-lieu.html) hiện từng con
số kèm cách đo, ngày đo, **và mục "điều đội chưa đo được"**.

### Phụ thuộc có lỗ hổng đã biết

`npm audit` ngày 05/09/2026: **11 lỗ hổng — 5 high · 6 moderate**. Chia hai nhóm,
vì hai nhóm này có hậu quả khác hẳn nhau:

| Nhóm | Lỗ hổng | Có vào sản phẩm không |
|---|---|---|
| Nhánh `@solana/web3.js` v1 | `bigint-buffer`, `jayson`, `stream-json`, `uuid` | **CÓ** — nằm trong đường chạy của SDK |
| Công cụ dựng deck | `pptxgenjs` → `image-size` (2 high) | **KHÔNG** — devDependency, chỉ chạy khi sinh file .pptx |

Con số tăng từ 9 lên 11 là do **đội tự thêm** `pptxgenjs` ngày 05/09, sau khi phát
hiện deck không dựng lại được từ bản clone sạch. Đổi hai lỗ hổng dev lấy một
artifact tái tạo được là đánh đổi có chủ ý — và nói ra ở đây thay vì để con số tự
tăng không ai giải thích.

> Con số này đo bằng `node scripts/do-lo-hong.mjs` và lưu ở `data/seed/lo-hong.json`
> kèm ngày đo. Có test canh: README lệch với file đo là bộ test đỏ. Nó TĂNG theo
> thời gian khi có CVE mới — đọc số cũ trên sân khấu là nói sai về chính mình.

Dứt điểm cần lên web3.js v2 — breaking change lớn, và đội chọn **không** làm trước hạn thi.
Nói ra ở đây thay vì im lặng: một sản phẩm bảo mật giấu cây phụ thuộc của chính nó thì
không đáng tin hơn cái nó đang cảnh báo.

**Coverage 82 % là con số thật và chúng tôi nói ra.** Custos vẫn chưa có decoder
cho các chương trình DEX, nên hơn một nửa một giao dịch DeFi là thứ nó chưa đọc
hiểu. Sản phẩm hiển thị đúng điều đó — *"đã đọc hiểu 2 trên 3 lệnh"* — thay vì
im lặng và để người dùng tưởng là đã kiểm hết.

Con số này từng là **4 %**, rồi 46 %. Nó tăng lên không phải nhờ nới lỏng định nghĩa, mà
nhờ đọc hiểu thêm những thứ đội thật sự hiểu: lệnh `ComputeBudget`, lệnh gọi
lồng nhau (CPI), toàn bộ tập lệnh của các chương trình vốn đã trong danh sách
xác minh, và sáu chương trình Anchor có **IDL công bố ngay trên chuỗi**.

**Coverage dao động mạnh theo mẻ mẫu** — cohort ngày 21/08 cho 53 %, cohort ngày
22/08 cho 69 %. Nên mọi so sánh trước/sau đều đo trong **một lượt trên cùng
cohort**, không phải hai lần chạy khác nhau. Riêng phần decoder sinh từ IDL đóng
góp **+2 điểm** (67 % → 69 %) đo đúng như vậy; so chéo hai cohort thì nó "trông
như" +5, và con số đó sai.

Phần còn thiếu nằm đúng chỗ khó chịu nhất: lệnh **chạm được tài sản của bạn**
mới đọc hiểu được **65 % (13/20)**, thấp hơn mức chung. Phần Custos chưa đọc hiểu chính
là phần đang di chuyển tiền. Bảng chênh lệch vẫn đo được hậu quả của chúng —
nhưng đội không giả vờ là đã hiểu chúng.

Mẫu ngẫu nhiên không bảo đảm cả 20 giao dịch đều lành tính. **Không có Đỏ nghĩa là
không cờ nào bật**, không phải bằng chứng cả 20 cái đều sạch.

Chi tiết cách đo: [SEED-DATASET.md](SEED-DATASET.md) mục 0b.
Giới hạn của SDK khi tích hợp: [packages/core/README.md](packages/core/README.md).

## Ranh giới đã khoá

Bốn điều dưới đây đến từ 5 vòng phản biện, mỗi điều đã sửa một lỗi thật:

1. **AI không tạo và không sửa `level`.** Nó chỉ có trường riêng `aiAdvisory`, và
   giá trị mạnh nhất nó nói được là *"cần kiểm tra thủ công"* — không bao giờ là
   *"an toàn"*, cũng không bao giờ là *"nguy hiểm"*.
2. **Ngữ cảnh do dApp cung cấp chỉ làm Custos thận trọng hơn, không bao giờ dễ dãi hơn.**
   dApp khai đúng hành động không làm giảm verdict và không tắt cảnh báo nào —
   một dApp độc hại thừa sức khai đúng để trông vô hại.
3. **Không đủ dữ liệu ⇒ cảnh báo, không bao giờ là an toàn.**
4. **Token-2022 Permanent Delegate, Transfer Hook, Address Lookup Table đều là
   năng lực hợp lệ của giao thức.** Chỉ gắn cờ khi có hành vi cụ thể trong chính
   giao dịch đang xét. Gắn Đỏ cho sự tồn tại của một tính năng là cách nhanh nhất
   tạo cảnh báo sai.

Custos **không có smart contract và không ghi gì lên chain** — nó là lớp đọc và mô phỏng.

## Chạy thử tại máy

**Cần Node 24.12.x và npm 11.6.2 — đúng bản này.** Không phải "npm 11 nào cũng được":
đo được, `npm@11.9.0` chạy `npm ci` là **hỏng**, vì nó dựng cây phụ thuộc khác cho
peerOptional native của `ws`:

```text
npm error code EUSAGE
npm error Missing: bufferutil@4.1.0 from lock file
npm error Missing: utf-8-validate@6.0.6 from lock file
```

Đội **không** regenerate lockfile trước hạn thi để chiều bản npm mới — đó là thay đổi
cả cây phụ thuộc vào phút chót. Thay vào đó khai đúng bản đã kiểm chứng, và
`engine-strict=true` trong `.npmrc` sẽ dừng ngay với thông báo nói rõ bản cần, thay vì
để bạn lạc vào một lỗi `EUSAGE` không nói gì về nguyên nhân.

Node cũng vậy: mọi script chạy `--experimental-strip-types`, cờ không tồn tại trước
Node 22.6, và bộ công cụ đội chạy cùng CI ghim là **24.12.0** (`.nvmrc`).

```bash
nvm use                  # đọc .nvmrc → 24.12.0
npx npm@11.6.2 ci        # dùng ĐÚNG bản npm đã kiểm chứng, và `ci` chứ không `install`
npx npm@11.6.2 run check # typecheck + 359 test
npm run thu-goi    # gói SDK có dùng được từ ngoài repo không
npm run vi         # ví mẫu        → localhost:5188
npm run tan-cong   # trang lừa đảo → localhost:5189
```

Hiện trường devnet (mint, tài khoản token, ví nạn nhân) đã dựng sẵn trong
`apps/demo-wallet/public/hien-truong.json` — chỉ chứa địa chỉ công khai.
Muốn dựng lại của riêng bạn: `npm run hien-truong` (cần một ví devnet có SOL).

## Tài liệu

- **[CUSTOS.md](CUSTOS.md)** — mô tả sản phẩm đầy đủ. Nguồn quyết định duy nhất
- **[NGHIEN-CUU-21-08.md](NGHIEN-CUU-21-08.md)** — khử rủi ro trước build: giao dịch devnet, bẫy phiên bản SDK, kiểm chứng đối thủ
- **[SEED-DATASET.md](SEED-DATASET.md)** — quy cách bộ kiểm thử: định dạng JSON, nguồn gốc từng mẫu, và **vì sao chưa được gọi kết quả trên tập âm là tỉ lệ false positive**
- **[docs/PHIEU-PHONG-VAN.md](docs/PHIEU-PHONG-VAN.md)** — kịch bản đo mức độ hiểu của người dùng thật
- **[docs/bao-mat/](docs/bao-mat/)** — audit bảo mật, roadmap khắc phục, báo cáo, đánh giá mô hình
- **[PITCH-VA-PHAN-BIEN.md](PITCH-VA-PHAN-BIEN.md)** — pitch 4 phút và 9 câu phản biện
- **[DAC-TA-CORE.md](DAC-TA-CORE.md)** — đặc tả kỹ thuật Custos Core: L1/L2/L3, 14 luật, lịch làm của vai A
- **[DAC-TA-L3.md](DAC-TA-L3.md)** — đặc tả L3 và chữ tiếng Việt: từ vựng, câu mẫu dự phòng, prompt
- **[packages/core/README.md](packages/core/README.md)** — **tài liệu tích hợp SDK** dành cho ví và dApp
- **[CLAUDE.md](CLAUDE.md)** — bối cảnh cho Claude Code, và các quyết định thiết kế đã khoá
- **[docs/cuoc-thi/](docs/cuoc-thi/)** — thể lệ và lịch chính thức của Ban Tổ chức

## In English — 60 seconds

**Custos** is an open-source transaction-intelligence SDK for Solana wallets and dApps.
It simulates a transaction before the user signs, detects consequences that **do not
belong to the transaction's stated main action**, and explains them in Vietnamese.

- A **deterministic rule engine** produces the verdict. The language model only writes
  the explanation — it can never create, raise, or lower a verdict, and it never
  receives the raw transaction.
- **Coverage is part of the contract.** Custos always returns how much of the
  transaction it actually understood, and the UI shows it.
- **Fail closed.** Timeout, RPC failure, or missing data becomes a warning — never "safe".

Measured, not estimated: **359 tests**, **33 labelled samples**, **14 rules**, average
**82 % coverage** on 9 replayable public transactions stored offline. Runtime and demo
are **Devnet-only**.

**Not yet proven:** no third-party wallet or dApp has integrated it, and no buyer
interviews have been run. The integration example in `vi-du-tich-hop/` was built by the
team itself — it measures integration friction, not market demand.

Docs: [packages/core/README.md](packages/core/README.md) · Live demo:
https://neitln.github.io/Custos-Solana/
