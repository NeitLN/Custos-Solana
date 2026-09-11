# Đơn vị kinh tế — chi phí một lượt kiểm tra

**Đo ngày 23/08/2026**, phần mô hình **đo lại 12/09/2026** · commit `9e5e0f3` · script [`do-chi-phi.ts`](../scripts/do-chi-phi.ts) và [`do-token-mo-hinh.ts`](../scripts/do-token-mo-hinh.ts)

Trang này tồn tại vì một câu hỏi mà giám khảo track *Best Product & Business* chắc
chắn hỏi và đội chưa trả lời được: **"Một lượt kiểm tra tốn của các em bao nhiêu?"**

Mọi con số dưới đây **đo được** hoặc **tra được từ trang giá công khai có link**.
Ô nào chưa đo thì ghi *chưa đo* — không điền số đoán.

---

## 1 · Chi phí RPC — đo trên 20 giao dịch công khai đã lưu offline

Đo bằng cách bọc `Connection` trong một Proxy đếm lượt gọi, rồi chạy `inspect()`
trên đúng cohort cố định ở `data/seed/cohort-audit.json` — cùng tập mà `do-cohort.ts`
dùng, nên con số chi phí và con số coverage nói về cùng một mẻ giao dịch.

| Phương thức | Trung vị | Thấp | Cao |
|---|---:|---:|---:|
| `getMultipleAccountsInfo` | 2 | 2 | 2 |
| `simulateTransaction` | 1 | 1 | 1 |
| `getFeeForMessage` | 1 | 1 | 1 |
| `getAddressLookupTable` | 1 | 0 | 3 |
| `getSignaturesForAddress` | 0 | 0 | 3 |
| **Tổng lượt gọi RPC** | **6,5** | **4** | **9** |

*20/20 mẫu đo được, 0 bỏ qua. Số lệnh mỗi giao dịch: trung vị 6, cao nhất 19.*

**Ranh giới đo:** `getTransaction` **không** được tính. Ví đã có giao dịch trong tay
khi dApp đẩy sang — nó không phải chi phí của Custos. Script dùng hai `Connection`
riêng để không thể lẫn.

> **Đọc code bằng mắt cho ra "khoảng 4–6 lượt".** Đo thật cho ra trung vị 6,5 và
> **đỉnh 9**. Chênh lệch nằm ở đuôi phân bố — đúng chỗ mà một ước lượng bằng mắt
> luôn bỏ sót, và đúng chỗ mà chi phí thật sinh ra.

---

## 2 · Một phát hiện từ phép đo, và một giả thuyết đã bị bác bỏ

`getSignaturesForAddress` xuất hiện tới **3 lượt** ở đuôi phân bố. Nó đến từ
[`traTuoiVi()`](../packages/core/src/l1/fetch.ts) — tra tuổi ví nhận để nuôi luật
"ví mới tạo", gọi với `limit: 1000`.

**Giả thuyết đó SAI, và bảng credit đã trả lời.**

Tra `helius.dev/docs/billing/credits` ngày 30/08: *"All RPC calls except those listed
separately"* tốn **1 credit**. `getSignaturesForAddress` nằm nhóm Historical Data và cũng
**1 credit**. Nghĩa là cả năm phương thức Custos dùng đều **cùng giá**.

> Tôi từng viết ở đây rằng *"nhiều khả năng đây là lượt gọi nặng nhất"* và đề xuất ba cách
> giảm tải. Suy đoán đó dựa trên bản chất phép tính — quét lịch sử chữ ký thì nặng hơn đọc
> một tài khoản — nhưng Helius không tính tiền theo cách đó. **Đã tra, đã sai, ghi lại thay
> vì sửa lặng lẽ.**

Hệ quả: **không cần tối ưu `traTuoiVi()` vì lý do chi phí.** Nếu sau này muốn giảm, lý do
phải là độ trễ, không phải tiền.

> Đội đã chặn sẵn hai chỗ: tối đa 3 ví tra (`MAX_VI_TRA`) và thời hạn 2,5 giây
> (`HAN_LAM_GIAU_MS`). Với giá 1 credit mỗi lượt, hai chốt đó là đủ.

---

## 3 · Chi phí mô hình ngôn ngữ

| | |
|---|---|
| Kích thước payload | trung vị **1.354 ký tự**, cao nhất 2.050 |
| Token vào | **760 / lượt** — đo 12/09/2026, 38 mẫu, tổng 28.878 |
| Token ra | **184 / lượt** — tổng 6.994, tức **dưới một nửa** mức mặc định 400 |
| Độ trễ | trung vị **~2,9 s**, cao nhất **4,0–5,0 s** tuỳ lượt |

**Đã đo, không còn BLOCKED_BY_SECRET.** Số lấy từ trường `usage` nhà cung cấp trả
về, ghi ở [`data/eval/ai-ket-qua.json`](../data/eval/ai-ket-qua.json), sinh bởi
`node --experimental-strip-types scripts/eval-ai.ts --that`.

Ký tự **không phải** token: 1.354 ký tự payload ra 760 token vào, tức khoảng 1,8 ký
tự một token — tiếng Việt có dấu tách token tệ hơn tiếng Anh đúng như dự đoán, nên
**không được quy đổi ngược** từ số ký tự sang số token cho một bộ dữ liệu khác.

Một phép đo thứ hai đi qua đúng đường sản xuất:

```
CUSTOS_OFFLINE_MAINNET_RESEARCH=1 \
  node --experimental-strip-types scripts/do-token-mo-hinh.ts 6
```

Script đi qua **đúng đường sản xuất** (`dienGiaiBangMoHinh` tự dựng payload) và lấy
số token từ trường `usage` do nhà cung cấp trả về, không tự đếm.

**Mặc định 400 token đầu ra chưa bao giờ bị chạm tới.** Đo thật: trung bình 184
token ra mỗi lượt, tức mức mặc định ở
[`anthropic.ts`](../packages/ai/src/anthropic.ts) (`tuyChon.maxTokens ?? 400`)
**không phải thứ đang chặn chi phí** — độ dài câu trả lời tự nhiên mới là thứ chặn.
Hạ 400 xuống 200 sẽ không tiết kiệm gì và sẽ cắt cụt những câu dài nhất.

Nói nó là **trần cứng** thì sai hai lần, và bản trước của đoạn này đã sai đúng hai
lần đó:

1. **400 là mặc định, không phải trần.** Bên tích hợp truyền `maxTokens` lớn hơn là
   nó lớn hơn. SDK không ép gì cả.
2. **400 chỉ tính đầu RA.** Token đầu VÀO — prompt hệ thống cộng dữ liệu giao dịch —
   không nằm trong con số đó, và nhà cung cấp tính tiền cả hai.

Câu nói được: *"760 token vào và 184 token ra mỗi lượt, đo trên 38 mẫu"*. Câu KHÔNG
nói được: *"chi phí AI có trần cứng"* — 400 là mặc định, bên tích hợp nâng được, và
nó không tính token đầu vào.

### Thời hạn 4 giây cắt mất 1–2 lượt trong 38 — mỗi lượt chạy

`boiThoiHan` mặc định **4.000 ms**. Bảy lượt đo 12/09 cho độ trễ cao nhất **4.054 ·
4.189 · 4.321 · 4.561 · 4.847 · 4.968 ms** — tức **đuôi phân bố nằm đúng trên vạch**,
không phải dưới nó. Trung vị thì ổn định quanh **2,7–3,0 s**, xa vạch.

Hệ quả, và nó là chi phí thật: lượt bị cắt **vẫn bị tính tiền** (nhà cung cấp đã sinh
xong token) nhưng kết quả bị bỏ, người dùng nhận câu tất định. Trả tiền cho một câu
không ai đọc.

Không hỏng gì — đường lui đúng thiết kế, `level` của L2 không bị đụng. Nhưng
*"lớp AI chạy cho 38/38 mẫu"* là câu **sai**; câu đúng là *"36–37/38, phần còn lại
rơi về câu tất định vì quá hạn"*.

`data/eval/ai-ket-qua.json` ghi thẳng `hanMacDinhMs` và `soLuotVuotHanMacDinh`. Con
số hạn **được đo**, không chép tay: bọc một Interpreter treo vĩnh viễn rồi bấm giờ —
nếu ai đổi 4000 thành số khác, báo cáo tự đổi theo.

### Mô hình đếm sai số lệnh ở những giao dịch đọc hiểu được 0 %

Đây là **phát hiện bất lợi**, ghi lại nguyên vẹn.

Bảy lượt chạy live, mỗi lượt có **1–4 câu** (3 · 3 · 2 · 2 · 4 · 2 · 1) chứa một
con số không suy ra được từ facts. Chúng luôn rơi vào cùng bốn ca — **MN-04 · MN-07 · MN-08 · MN-10** — và luôn
cùng một hình dạng: mô hình nói *"có N lệnh chưa đọc hiểu được"* với N **gần đúng
nhưng không bằng** `total − analyzed` (nói 10 khi là 12, nói 9 khi là 11, nói 4 khi
là 5, nói 7 khi là 8).

| | |
|---|---|
| Tần suất | **1–4 / 38 mỗi lượt** qua 7 lượt, không cố định — cùng một ca lúc dính lúc không |
| Luôn là ca nào | MN-04, MN-07, MN-08, MN-10 — cả bốn đều `analyzed = 0` |
| Hướng sai | **luôn thấp hơn** sự thật, lệch 1–2 đơn vị |

Giả thuyết *"cứ `analyzed = 0` là sai"* **đã bị bác**: MN-01, MN-03 và MN-09 cũng
`analyzed = 0` mà chưa lần nào dính. Khác biệt còn lại là `total` lớn (5–12 so với
3–4), nhưng MN-09 có `total = 10` và vẫn sạch — nên đây là **xu hướng, không phải
quy luật**, và không được phát biểu chắc hơn thế.

**Vì sao nó không thành lỗ hổng sản phẩm:** con số đó nằm trong câu giải thích, không
nằm trong `level` — và `level` do L2 quyết một mình (quyết định thiết kế 1). Sai lệch
1–2 lệnh trong một câu vốn đang nói *"không đọc hiểu được phần lớn giao dịch"* không
đảo ngược thông điệp. Nhưng nó **là** lý do câu chữ của AI không được dùng làm căn cứ
số học, và là lý do bộ đếm này phải tiếp tục chạy mỗi lượt.

### AI thêm được gì so với câu mẫu — câu trả lời KHÔNG có lợi cho lớp AI

Đây là câu hỏi A02 đặt ra (*"kết luận có/không có lợi ích"*), và ba lượt đo đầu
**không trả lời được** vì phép so cũ không thể cho ra kết quả khác.

Phép so cũ đặt mô hình cạnh câu mẫu ở hai thứ: **độ trễ** và **số ca bịa**. Câu mẫu
thắng cả hai **bằng định nghĩa** — nó chạy 0 ms và dựng chữ thẳng từ facts nên không
thể bịa. Một phép so mà một bên không thể thua thì không đo được gì; nó chỉ có thể
kết luận *"AI tệ hơn"*, kể cả trong trường hợp AI đang hữu ích.

Câu hỏi đúng là câu ngược lại: **mô hình có nói được gì mà câu mẫu không nói không?**

| | Mô hình | Câu mẫu | Mẫu số |
|---|---:|---:|---:|
| Ca tự viết, không lặp lại đường lui | **26–31** | — | 38 |
| Chữ thêm so với câu mẫu (trung vị) | **+93 … +120** | — | — |
| **Nêu phần giao dịch chưa đọc hiểu được** | **13** | **14** | 16 |

**Dòng thứ ba là dòng quan trọng nhất, và mô hình thua.** Trên 16 ca có coverage
khuyết, câu mẫu nêu phần chưa đọc hiểu được ở **14 ca**; mô hình nêu ở **13**. Ổn
định qua ba lượt đo, không phải nhiễu.

Ca bị bỏ có tên: **R10-pos**, coverage **0/1**. Mô hình nói *"không thể xác định hành
động chính"* nhưng không nói rằng chính cái lệnh duy nhất đó chưa đọc hiểu được — hai
câu nghe giống nhau, và chỉ câu sau nói cho người dùng biết **vì sao** không xác định
được. Artifact ghi đích danh ca này ở `giaTriTangThem.boQuaCoverage`.

**Kết luận trung thực:** trên đúng thước đo quan trọng nhất với sản phẩm này — có nêu
phần giao dịch không đọc hiểu được hay không — **lớp AI không thêm gì, và thua câu mẫu
một ca.** Thứ nó thêm là khoảng 100 ký tự văn xuôi mỗi ca.

**Điều này KHÔNG có nghĩa nên bỏ lớp AI**, và cũng không có nghĩa nên giữ. Nó có
nghĩa là **chưa ai đo được cái đáng đo**: văn xuôi dễ đọc hơn có làm người dùng hiểu
đúng hơn không. Đó là câu hỏi của usability vòng 2 (B03/H01), không phải của máy —
và chừng nào chưa đo, **không được nói "AI giúp người dùng hiểu hơn"** trên slide hay
trong deck.

**Giới hạn của chính phép đo này:** cả ba số đo **hình dạng**, không đo **chất lượng**.
*"Khác câu mẫu"* gồm cả khác theo hướng tệ hơn, và bộ dò coverage là một regex tiếng
Việt — nó bắt cách diễn đạt đã liệt kê, không bắt mọi cách nói. Rubric chấm bằng người
ở [`AI-EVALUATION.md`](AI-EVALUATION.md).

### Số lượt gọi mỗi lần kiểm tra KHÔNG phải luôn bằng 1

`boiThoiHan` không gọi lại: nó đua với thời hạn 4 giây rồi lui về đường tất định.
Nhưng lớp dưới thì có. `anthropic.ts` dựng client bằng `new Anthropic({ apiKey })`,
và SDK chính thức mặc định `maxRetries = 2` — một `messages.create` có thể thành **ba**
lượt gọi HTTP khi gặp 429 hoặc 5xx.

Hai hệ quả cho phần chi phí, cả hai đều chưa đo được:

· Lượt hỏng vì 429/5xx thường không bị tính token đầu ra, nhưng token đầu vào thì
  tuỳ nhà cung cấp — chưa tra được cho từng ca.
· Một lượt gọi **thành công nhưng về sau hạn 4 giây** vẫn bị tính tiền, trong khi kết
  quả bị bỏ. Đó là chi phí có thật mà người dùng không bao giờ nhìn thấy.

Muốn con số này thành một trần thật thì phải truyền `maxRetries` và `maxTokens` tường
minh khi dựng client. Hiện chưa làm, nên ở đây ghi đúng như vậy thay vì ghi một con số
đẹp hơn sự thật.

---

## 4 · Quy ra tiền — trọng số credit đã tra được

Helius bán **$5 / triệu credit** ([bảng giá](https://www.helius.dev/pricing)), tầng
trả tiền đầu tiên **$49/tháng**. QuickNode cũng đặt tầng đầu ở **$49/tháng**
([bảng giá](https://www.quicknode.com/pricing)).

**Trọng số credit nay đã tra được, nên không còn phải trình bày theo dải.**

| Nguồn | Số liệu | Tra ngày |
|---|---|---|
| [Bảng credit Helius](https://www.helius.dev/docs/billing/credits) | Mọi lời gọi RPC tiêu chuẩn = **1 credit** | 30/08/2026 |
| [Bảng giá Helius](https://www.helius.dev/pricing) | Developer **$49/tháng — 10M credit** · credit thêm **$5/triệu** | 30/08/2026 |

Nhân ra:

| | Credit | Chi phí RPC mỗi lượt kiểm tra |
|---|---:|---:|
| Thấp nhất | 4 | **$0,000020** |
| **Trung vị** | **6,5** | **$0,0000325** |
| Cao nhất | 9 | **$0,000045** |

**Tầng $49/tháng của Helius (10M credit) mua được:**

| | Số lượt `inspect()` |
|---|---:|
| Ở mức trung vị | **≈ 1,54 triệu** |
| Ở mức cao nhất | **≈ 1,11 triệu** |

### Câu nói được trên sân khấu

> *"Chi phí RPC cho một lượt kiểm tra là **ba phần trăm nghìn đô la**. Cùng gói $49 một
> tháng mà một ví đang trả cho hạ tầng RPC của chính họ, Custos chạy được **hơn một triệu
> rưỡi lượt kiểm tra**. Đo trên 20 giao dịch công khai đã lưu offline, trọng số credit tra từ bảng giá
> công khai của Helius."*

**Vẫn KHÔNG nói được:** một tỉ lệ biên lợi nhuận. Ô token mô hình **đã lấp** (760 vào
/ 184 ra), nhưng còn thiếu **giá bán của chính Custos** — và giá bán không lấp được
bằng code, phải có người đi hỏi ví/dApp. Không có nó thì không có tỉ lệ nào cả.

---

## 5 · Còn thiếu gì để trang này hoàn chỉnh

| Ô | Cách lấp | Mất bao lâu |
|---|---|---|
| ~~Trọng số credit từng phương thức~~ | ✅ **xong 30/08** — mọi lời gọi = 1 credit | — |
| ~~Token vào/ra thật~~ | ✅ **xong 12/09** — 760 vào / 184 ra, mục 3 | — |
| Giá bán của Custos | Cần hỏi ví/dApp. Giả thuyết giá + phép thử: [`MO-HINH-DOANH-THU.md`](MO-HINH-DOANH-THU.md) mục 3 | 1 buổi tối |

**Chi phí biên đã đầy đủ.** Ô còn lại là doanh thu, không phải chi phí — và nó không
lấp được bằng code.

---

## 6 · Cách đo lại

```
CUSTOS_OFFLINE_MAINNET_RESEARCH=1 \
  node --experimental-strip-types scripts/do-chi-phi.ts          # phần RPC
CUSTOS_OFFLINE_MAINNET_RESEARCH=1 \
  node --experimental-strip-types scripts/do-token-mo-hinh.ts 6  # phần mô hình, cần khoá

node --experimental-strip-types scripts/eval-ai.ts --that        # token + trễ + vi phạm
```

Khoá đọc từ biến môi trường `ANTHROPIC_API_KEY`. **Không dán khoá vào lệnh, vào file
nào trong repo, hay vào bản demo công khai** — bản demo cố ý không nhúng khoá.

Kết quả ghi vào `data/seed/chi-phi.json` và `data/seed/chi-phi-mo-hinh.json`.
Cohort cố định, nên đo lại sau khi sửa code là so được trực tiếp — cùng kỷ luật đã
ghi ở `SEED-DATASET.md` mục 0b3.
