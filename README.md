# Custos

> Custos phát hiện những hậu quả **không thuộc về hành động chính** của một giao dịch Solana, và giải thích bằng tiếng Việt trước khi người dùng ký.

Transaction-intelligence SDK cho ví và dApp Solana.
Dự thi **UniHackfest 2026** — track Best Product & Business, chủ đề AI × Web3.
Vòng loại cấp trường 05/09/2026 tại Đại học Văn Lang.

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

## Chạy thử tại máy

```bash
npm install
npm run check      # typecheck + 249 test
npm run vi         # ví mẫu        → localhost:5188
npm run tan-cong   # trang lừa đảo → localhost:5189
```

Hiện trường devnet (mint, tài khoản token, ví nạn nhân) đã dựng sẵn trong
`apps/demo-wallet/public/hien-truong.json` — chỉ chứa địa chỉ công khai.
Muốn dựng lại của riêng bạn: `npm run hien-truong` (cần một ví devnet có SOL).

## Tài liệu

- **[CUSTOS.md](CUSTOS.md)** — mô tả sản phẩm đầy đủ. Nguồn quyết định duy nhất
- **[NGHIEN-CUU-21-08.md](NGHIEN-CUU-21-08.md)** — khử rủi ro trước build: giao dịch devnet, bẫy phiên bản SDK, kiểm chứng đối thủ
- **[SEED-DATASET.md](SEED-DATASET.md)** — bộ kiểm thử: 25 mẫu phải thu thập, định dạng, quy tắc đo false positive
- **[docs/docs/PHIEU-PHONG-VAN.md](docs/docs/PHIEU-PHONG-VAN.md)** — kịch bản đo mức độ hiểu của người dùng thật
- **[docs/bao-mat/](docs/bao-mat/)** — audit bảo mật, roadmap khắc phục, báo cáo, đánh giá mô hình
- **[PITCH-VA-PHAN-BIEN.md](PITCH-VA-PHAN-BIEN.md)** — pitch 4 phút và 9 câu phản biện
- **[DAC-TA-CORE.md](DAC-TA-CORE.md)** — đặc tả kỹ thuật Custos Core: L1/L2/L3, 12 luật, lịch làm của vai A
- **[DAC-TA-L3.md](DAC-TA-L3.md)** — đặc tả L3 và chữ tiếng Việt: từ vựng, câu mẫu dự phòng, prompt
- **[packages/core/README.md](packages/core/README.md)** — **tài liệu tích hợp SDK** dành cho ví và dApp
- **[CLAUDE.md](CLAUDE.md)** — bối cảnh cho Claude Code, và các quyết định thiết kế đã khoá
- **[docs/cuoc-thi/](docs/cuoc-thi/)** — thể lệ và lịch chính thức của Ban Tổ chức

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
| Test | **249**, chạy trong `npm run check` |
| Mẫu trong bộ dữ liệu | **29** — mỗi luật có một ca nguy hiểm và một ca lành tính trông giống nó |
| Giao dịch **bị gắn cờ** trên 9 giao dịch SPL mainnet lấy ngẫu nhiên | **0** |
| Coverage trung bình trên giao dịch mainnet thật | **82 %** · cohort **neo lại 25/08** |

> Số cập nhật theo lần đo gần nhất tại **[/so-lieu.html](https://neitln.github.io/Custos-Solana/so-lieu.html)** — mỗi con số kèm cách đo và ngày đo.
> *"Bị gắn cờ"* chứ không phải *"báo nhầm"*: chúng tôi chưa kiểm chứng từng giao dịch trong cohort là lành, nên chưa có ground truth để nói tỉ lệ false positive.

### Phụ thuộc có lỗ hổng đã biết

`npm audit` ngày 25/08: **8 lỗ hổng — 5 moderate, 3 high**, nằm trong nhánh
`@solana/web3.js` v1 (`bigint-buffer`, `jayson`, `uuid`).

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
mới đọc hiểu được **39 %**, thấp hơn mức chung. Phần Custos chưa đọc hiểu chính
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
