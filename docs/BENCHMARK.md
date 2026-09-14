# Benchmark phát hiện — và phạm vi không kiểm được

**Việc D02 của [`ROADMAP-CLAUDE.md`](../ROADMAP-CLAUDE.md).**

Trang này trả lời một câu hỏi mà bảng số liệu không trả lời được:

> **Custos phát hiện đúng được bao nhiêu phần trăm?**

Câu trả lời trung thực là: **chưa đo được, và trang này giải thích vì sao — cùng với
những thứ đã đo được thay cho nó.**

Đọc kèm [`SEED-DATASET.md`](../SEED-DATASET.md) (quy cách từng mẫu) và
[`BANG-CLAIM.md`](BANG-CLAIM.md) (mọi claim → nguồn → phạm vi).

---

## 1 · Vì sao KHÔNG có confusion matrix

D02 nói rõ: *"Báo confusion matrix chỉ trên tập có nhãn chuẩn **độc lập với
verdict**."* Custos hiện không có tập nào như vậy.

| Corpus | Nhãn từ đâu | Độc lập với verdict? |
|---|---|---|
| **38 mẫu seed** | đội tự gắn, cùng lúc viết luật | ❌ **không** — cùng người, cùng tuần |
| **Cohort 20 giao dịch mainnet** | không có nhãn nào | ❌ không có ground truth |
| **20 giao dịch ngẫu nhiên** (`do-bao-nham`) | không có nhãn nào | ❌ không có ground truth |

Con số precision/recall tính trên bộ seed sẽ là **vòng tròn**: nhãn kỳ vọng
(`kyVong`) và luật được viết bởi cùng một người, cùng một tuần, tham chiếu lẫn nhau.
Một bộ luật viết ra để làm xanh chính bộ nhãn của nó thì đạt 100 % — và con số 100 %
đó không nói gì về giao dịch thật.

**Cái bộ seed thật sự làm được** là hồi quy: nếu ai sửa luật 7 mà làm luật 3 im
tiếng, một trong 38 bài kiểm đỏ ngay. Đó là giá trị thật, và nó không phải accuracy.

> ⚠️ **`coverage` KHÔNG phải `accuracy`.** Coverage là tỉ lệ lệnh **đọc hiểu được**.
> Một giao dịch coverage 100 % vẫn có thể bị gắn cờ sai. Hai đại lượng khác nhau,
> và gọi lẫn là cách nhanh nhất tự khen mình một điều chưa đo.

### Cần gì để có confusion matrix thật

1. Một tập giao dịch mainnet được **người ngoài đội** gắn nhãn lành/độc, không nhìn
   đầu ra của Custos.
2. Hoặc một tập độc đã được xác nhận độc lập — báo cáo scam công khai, dữ liệu từ
   một bên bảo mật, giao dịch đã có nạn nhân xác nhận.
3. Cỡ mẫu đủ để một con số phần trăm có nghĩa. Với 20 mẫu, một mẫu sai lệch 5 điểm.

Không cái nào có sẵn, và cả ba đều cần **người**, không cần code. Ghi vào
[`docs/roadmap/TIEN-DO.md`](roadmap/TIEN-DO.md) như một ô còn trống chứ không lấp
bằng một con số trông giống.

---

## 2 · Tập giữ lại — nói thẳng là KHÔNG CÓ

D02 yêu cầu *"thiết kế tập giữ lại **trước khi** tuning"*. Bộ 38 mẫu hiện tại **không
có** tập giữ lại, và không thể có bằng cách cắt ra bây giờ.

Lý do: cả 38 mẫu đều được viết **cùng lúc hoặc sau** luật mà chúng kiểm. Cắt 8 mẫu ra
gọi là "holdout" lúc này là đặt tên mới cho dữ liệu đã dùng để phát triển — một tập
giữ lại mà mô hình đã thấy thì không phải tập giữ lại, chỉ là một cái nhãn.

**Cách làm đúng cho mẫu MỚI**, kể từ đây:

| Bước | Quy tắc |
|---|---|
| 1 | Mẫu mới vào `data/seed/giu-lai/`, **không** vào `index.json` |
| 2 | Không ai đọc kết quả trên tập đó khi đang sửa luật |
| 3 | Chạy tập giữ lại **một lần**, khi chốt bản — và ghi kết quả dù nó xấu |
| 4 | Đã nhìn kết quả rồi thì mẫu đó **hết là** giữ lại; chuyển sang `index.json` |

Bước 4 là bước hay bị bỏ. Một tập giữ lại chạy nhiều lần trong lúc tuning chính là
tập huấn luyện, chỉ chậm hơn.

---

## 3 · Ba corpus, ba phạm vi khác nhau

Trộn ba thứ này là cách dễ nhất nói sai về chính mình.

### 3.1 · Bộ seed — 38 mẫu

| | |
|---|---|
| **Thành phần** | 21 dương · 17 âm · 14 luật, mỗi luật một cặp dương/đối chứng |
| **Nguồn gốc** | 28 `synthetic-devnet` (đội tự dựng) · 10 `real-mainnet` |
| **Dùng để** | hồi quy luật — luật bật đúng ca, **im đúng ca đối chứng** |
| **KHÔNG dùng để** | tính tỉ lệ đúng/sai, tỉ lệ báo nhầm, hay bất kỳ phần trăm nào |

Ca **đối chứng gần giống** là phần đáng giá nhất của bộ này: mỗi luật có một ca chỉ
khác điều kiện quyết định. Ví dụ luật `SPL_SET_AUTHORITY__ACCOUNT_OWNER` có ca dương
(đổi chủ sang ví lạ) và ca âm (`khongCoMa` — cùng hình dạng nhưng không thoả điều
kiện). Thiếu ca âm thì một luật bật-mọi-lúc cũng qua được bài kiểm.

### 3.1b · Ba TẦNG bằng chứng — và chúng không thay thế nhau

**Việc TB-B01.** Manifest ở [`data/benchmark/manifest.json`](../data/benchmark/manifest.json),
sinh bởi `npm run manifest-benchmark`.

Một mẫu nằm trong bộ seed **không** có nghĩa mọi phép kiểm đều chạy được cho nó. Ba
tầng dưới đây chứng minh ba điều khác nhau, và trộn chúng là cách nói quá dễ nhất:

| Tầng | Chạy gì | Chứng minh | Đủ điều kiện | **Đã chạy** |
|---|---|---|---|---|
| `l2-facts` | L2 trên Facts **đã đóng băng** | luật **không hồi quy** | 38/38 | **38/38** |
| `l1-replay` | dựng lại tx từ base64 → đường L1 sản xuất | **L1 bóc tách đúng** | 29/38 | **19/29** |
| `devnet-live` | chạy thật trên Devnet (TB-B07) | hành vi runtime | 19/38 | **0** — chưa chạy |

**Hai cột cuối là hai chuyện khác nhau, và gộp chúng là cách nói quá dễ nhất ở
trang này.** *Đủ điều kiện* = mẫu có đủ dữ liệu để tầng đó chạy được. *Đã chạy* =
tầng đó thật sự đã chạy trên mẫu và cho kết quả. Một mẫu đủ điều kiện mà chưa chạy
thì **chưa chứng minh gì cả** — và trước TB-B02, cột bên phải chưa hề tồn tại ở
trang này.

**Vì sao 38 → 29:** chín mẫu (`R01-neg`, `R02-neg`, `R04-neg`, `R08-neg`, `R12-neg`,
`R13-pos/neg`, `R14-pos/neg`) **không có file giao dịch** — chúng là ca đối chứng
dựng bằng cách sửa Facts trực tiếp, để cô lập đúng một điều kiện của luật. Chúng kiểm
ranh giới L2 rất tốt và **không** nói được gì về L1.

**Vì sao 29 → 19:** mười mẫu `real-mainnet` không chạy lại được trên Devnet — account
của chúng không tồn tại ở đó.

#### Tầng `l1-replay` — đã chạy 19/29. Việc TB-B02.

Runner offline: `npm run replay-rpc`. Nó đọc fixture RPC đã ghi ở
[`data/benchmark/rpc/`](../data/benchmark/rpc) và chạy qua **`extractFacts` sản
xuất**, không qua một bản sao dựng riêng — một replay đi đường riêng chỉ chứng minh
đường riêng đó đúng.

**Vì sao 29 → 19 lần nữa, và lần này là một từ chối cố ý.** Mười mẫu `real-mainnet`
**chưa có fixture**. `capture-rpc.ts` không cho ghi fixture cho mẫu mainnet bằng
endpoint devnet: ALT và account của chúng không tồn tại ở đó, nên fixture sinh ra sẽ
ghi **một sự thật của devnet** rồi dán nhãn mẫu mainnet. Replay từ nó vẫn tái lập
được — tái lập đúng một kết quả sai. Đó là kiểu hỏng tệ nhất của một benchmark: nó
xanh, nó ổn định, và nó nói dối. Mười mẫu đó chờ một endpoint mainnet, không chờ
thêm code.

Kết quả 19 mẫu đã chạy: **19/19 đạt · 0 hỏng**, mỗi mẫu đo hai tính chất —

| Tính chất | Nghĩa | Kết quả |
|---|---|---|
| **Tất định** | cùng fixture, hai lượt chạy giống nhau từng bit | 19/19 |
| **Nhạy fixture** | đổi một dữ kiện trong fixture ⇒ Facts đổi theo | 19/19 |

Tính chất thứ hai là thứ phân biệt một replay thật với một replay trả kết quả dựng
sẵn — thiếu nó thì một adapter bỏ qua hoàn toàn dữ liệu vẫn xanh và vẫn tất định.

**Vì sao KHÔNG so với Facts đóng băng.** Bản đầu của runner so Facts replay với
`data/seed/facts/<id>.json` và được **18/19 lệch**. Không cái nào là lỗi của replay:
decoder đã tốt lên sau 21/08 (thêm `authority`, `coverage.analyzed` 1 → 2), số dư ví
devnet đã đổi vì airdrop, và bản đóng băng thiếu 5 trường schema mới. Bản đóng băng
là **ảnh chụp L1 của ngày 21/08, không phải ground truth** — bắt L1 hôm nay khớp nó
là bắt sản phẩm đứng yên, và sẽ đỏ đúng lúc decoder tốt lên. Độ lệch vẫn được in ra
mỗi lượt chạy, nhưng để **báo cáo**, không làm runner đỏ.

> **Replay KHÔNG phải một lần thực thi SVM mới.** `simulateTransaction` trong fixture
> là kết quả một lần chạy SVM **trong quá khứ, trên máy khác**. Tầng này chứng minh
> L1 bóc tách đúng thứ RPC trả về; nó không nói Solana hôm nay sẽ xử lý giao dịch đó
> như vậy. Muốn điều đó thì phải chạy thật — TB-B07, tức cột *Đã chạy* của
> `devnet-live`, hiện là **0**.

**Giới hạn còn lại của tầng này:** fixture **thừa** chưa bị phát hiện. Adapter đếm
được bản ghi nào đã dùng (`daDung()`), nhưng runner chưa đối chiếu, nên một fixture
ghi dư bản ghi sẽ không làm gì đỏ. Điều này không ảnh hưởng tính đúng của 19 mẫu đã
chạy — ghi ở đây để không ai đọc *"19/19 đạt"* thành *"fixture đã được kiểm toàn
diện"*.

> **Điều tầng `l2-facts` KHÔNG chứng minh:** rằng L1 đã giải mã đúng. Ở tầng này Facts
> là **đầu vào**, không phải đầu ra. Giữ Facts synthetic để hồi quy là hợp lệ; ghi nó
> thành *"bằng chứng L1 giải mã đúng"* thì không.

Mỗi mẫu trong manifest mang **hash nội dung** (`git hash-object`, ổn định qua CRLF/LF)
và **giới hạn của chính nó**. Manifest **không gọi engine Custos** — kỳ vọng chép
nguyên từ `index.json`, nơi người gán nhãn viết tay khi dựng mẫu. Một oracle tự sinh
kỳ vọng bằng engine đang kiểm thì mọi bài xanh vĩnh viễn, kể cả khi engine sai.

### 3.2 · Cohort — 20 giao dịch mainnet, **cố định**

Danh sách chữ ký ghi ở `data/seed/cohort-audit.json` và **tái sử dụng mọi lần chạy**.
Đó là điểm của nó: `do-bao-nham.ts` bốc mẫu ngẫu nhiên mỗi lần, nên so trước/sau bằng
hai lượt chạy là so hai mẻ khác nhau — đã suýt làm đội công bố một cải thiện không có
thật.

Số **đã công bố** neo ở **25/08/2026**: 9/20 mẫu mô phỏng được · coverage 82 % · 0
cáo buộc · 7 gắn cờ · chạm tài sản 13/20.

### 3.3 · 20 giao dịch ngẫu nhiên — `do-bao-nham.ts`

Bốc lại mỗi lần chạy, nên **không so sánh được giữa hai lượt**. Dùng để phát hiện
hình dạng giao dịch chưa gặp, không dùng để báo cải thiện.

Tên file dễ gây hiểu nhầm: nó **không** đo tỉ lệ báo nhầm — muốn đo được thì phải
biết mẫu nào thật sự lành, mà ta không biết.

---

## 4 · Đo lại cohort 08/09/2026 — cohort đang rụng, và rụng nhanh

Chạy lại trên **đúng 20 chữ ký cũ**, chế độ `--khong-ghi` để không đụng số đã công bố:

```bash
CUSTOS_OFFLINE_MAINNET_RESEARCH=1 node --experimental-strip-types \
  scripts/do-cohort.ts "kiểm D02" 20 --khong-ghi
```

| | 25/08/2026 | 08/09/2026 |
|---|---|---|
| Mô phỏng được | **9 / 20** | **4 / 20** |
| Coverage trung bình | 82 % | 79 % |
| Chạm tài sản đọc hiểu được | 13/20 | 4/8 |
| Verdict Đỏ / Vàng / Xanh | 0 / 7 / 2 | 0 / 4 / 0 |
| Mã CÁO BUỘC | 0 | 0 |

**Con số quan trọng nhất không nằm trong bảng trên.** Nó là phân loại lý do bỏ mẫu:

| Nhóm | Số | |
|---|---|---|
| **Hạ tầng** — ngoài tầm Custos | **16** | 0 không lấy được tx · 16 mô phỏng hỏng |
| **Sản phẩm** — mã của đội ném | **0** | |

Và trong 16 mẫu mô phỏng hỏng, năm nguyên nhân hàng đầu (14/16 mẫu):

```
 6x  failed to simulate transaction: invalid transaction:
     Transaction loads an address table account that doesn't exist
 3x  {"InstructionError":[3,{"Custom":3007}]}
 2x  AccountNotFound
 2x  {"InstructionError":[2,{"Custom":6004}]}
 1x  {"InstructionError":[3,{"Custom":6008}]}
```

Tất cả đều là **trạng thái chuỗi đã đi qua**: Address Lookup Table đã đóng, tài khoản
đã đóng, chương trình từ chối khi mô phỏng lại. **Không mẫu nào** hỏng vì 429 — client
đã tự thử lại thành công — và **không mẫu nào** hỏng vì mã của Custos.

### Vì sao KHÔNG cập nhật số đã công bố thành 4/20

Cohort neo ở 25/08 là một quyết định, không phải sơ suất. Con số 25/08 là phép đo
đúng của **corpus đó tại thời điểm đó**, và nó là điểm so sánh duy nhất đội có. Ghi
đè nó bằng 4/20 là mất luôn khả năng đo suy giảm.

Nên: **giữ 25/08 làm số công bố** (nó đã luôn đi kèm ngày), và ghi 08/09 ở đây làm
bằng chứng suy giảm. Cả hai đều thật, và chúng nói hai chuyện khác nhau.

### Điều này nói gì về sản phẩm

Không nói gì xấu về khả năng phát hiện — 0/20 mẫu làm mã của đội ném.

Nó nói một điều về **phương pháp đo**: một cohort mainnet neo theo chữ ký sẽ tự phân
hủy. Trong hai tuần nó mất hơn nửa số mẫu còn mô phỏng được. Với hạn 19/09, cohort này
gần như chắc chắn còn ít mẫu hơn nữa vào ngày nộp.

Không được im lặng thu nhỏ mẫu số. Nếu ngày nộp chỉ còn 2/20 mẫu, con số phải viết là
**2/20**, kèm lý do — chứ không viết coverage trên 2 mẫu rồi gọi nó là kết quả cohort.

---

## 5 · Mẫu bị loại — ghi hết, không lọc

`data/seed/cohort-ket-qua.json` nay ghi **từng chữ ký** bị bỏ kèm lý do
(`boQuaTheoLyDo` và `daBo`), thay vì một con số `boQua` duy nhất.

Bản trước gộp ba chuyện vào một biến đếm, và nhánh `catch` nuốt trọn lỗi:

```ts
if (!tx)             { boQua++; continue; }   // RPC không còn giữ giao dịch
if (!f.simulationOk) { boQua++; continue; }   // mô phỏng hỏng
} catch              { boQua++; }             // MÃ CỦA ĐỘI NÉM
```

Dòng thứ ba là chỗ nguy hiểm: một bug trong `extractFacts` ném với vài hình dạng giao
dịch sẽ được đếm là "bỏ qua", **không phân biệt được** với việc RPC cắt dữ liệu. Đó
đúng là "KHÔNG KIỂM ĐƯỢC" che mất "PHÁT HIỆN SAI" — thứ D02 nói phải tách.

Nay lỗi bóc tách in thẳng ra màn hình kèm chữ ký, và dòng `· SẢN PHẨM : N` luôn hiện
**kể cả khi N = 0** — im lặng khi bằng 0 là để một con số quan trọng biến mất đúng lúc
nó chuyển từ 0 sang 1.

---

## 6 · Tái lập

```bash
npm run check                       # 38 mẫu seed, hồi quy từng mẫu, offline
npm run manifest-benchmark          # sinh lại manifest + hash + phân tầng

# cohort — chạm mainnet, phải khai báo ý định
CUSTOS_OFFLINE_MAINNET_RESEARCH=1 node --experimental-strip-types \
  scripts/do-cohort.ts "nhãn" 20 --khong-ghi     # in, không ghi đè số công bố
```

Bỏ `--khong-ghi` thì nó ghi đè `cohort-ket-qua.json`, và `npm run so-lieu` sẽ rải số
mới vào README, `CLAUDE.md`, deck. **Đừng làm vậy trừ khi đang cố ý neo lại cohort** —
và nếu neo lại thì phải ghi ngày mới ở mọi chỗ, không được để lẫn số của hai mẻ.

---

## 7 · Điều trang này KHÔNG nói

- Không nói Custos phát hiện đúng bao nhiêu phần trăm. **Chưa đo được** — mục 1.
- Không nói 38 mẫu seed chứng minh độ chính xác. Chúng chứng minh **không hồi quy**.
- Không nói "0 cáo buộc" là "0 báo nhầm". Chưa có ground truth thì chưa có tỉ lệ.
- Không nói cohort 4/20 là sản phẩm kém đi. Nó là corpus cũ đi, và trang này tách rõ
  hai chuyện đó.
- Không nói bộ seed đã đủ. 28/38 mẫu là `synthetic-devnet` — đội tự dựng đầu vào để
  kích hoạt luật của chính đội. Điều đó hợp lệ để kiểm luật, và **không** thay được
  dữ liệu độc lập.
- Không nói tập kiểm tính chất (mục 8) là accuracy hay thẩm định độc lập. Nó đo
  **độ đáp ứng tính chất** trên 19/38 mẫu, và một trong ba tính chất còn **chưa
  chứng minh được** là nó bắt được lỗi.

---

## 8 · Tập kiểm TÍNH CHẤT — và vì sao nó không phải accuracy

**Việc TB-B05.** Chạy lại: `npm run danh-gia-b05` (offline). Biên bản máy:
[`data/benchmark/danh-gia-b05.json`](../data/benchmark/danh-gia-b05.json).

Mục 1 và 2 nói vì sao trang này **không** có confusion matrix và **không** có tập giữ
lại. Mục này trả lời câu còn lại: *nếu chưa đo được độ chính xác, thì đo được cái gì?*

Đáp: **độ đáp ứng tính chất** — những bất biến suy từ tài liệu RPC của Solana, kiểm
trên 19 mẫu chạy được qua đường L1 sản xuất.

### 8.1 · Nguồn của tính chất — và vì sao KHÔNG dùng đặc tả nội bộ

Thẻ đòi *"expected properties theo đặc tả/nguồn **độc lập với verdict**"*. Đặc tả nội
bộ không đạt điều kiện đó, và lịch sử git nói thẳng:

| | commit | thời điểm |
|---|---|---|
| `DAC-TA-CORE.md` | `63959f3` | 21/08 **21:55:31** |
| engine L2 | `42c33d0` | 21/08 **21:57:03** |

**92 giây**, cùng người, cùng phiên. Dùng nó làm nguồn kỳ vọng rồi gọi là độc lập sẽ
lặp đúng lỗi vòng tròn mà mục 1 đã tự cảnh báo.

Nguồn dùng ở đây là [tài liệu `simulateTransaction` của
Solana](https://solana.com/docs/rpc/http/simulatetransaction) — tồn tại trước dự án,
không ai trong đội viết.

### 8.2 · Ba tính chất, và **chỉ hai** được chứng minh

| | Tính chất | Áp dụng | Đạt | Đã chứng minh bắt được lỗi? |
|---|---|---|---|---|
| **P1** | mô phỏng hỏng ⇒ KHÔNG có trạng thái sau | 4/19 | **4/4** | gỡ vế `!v.err` ⇒ tụt còn **1/4** |
| **P2** | không đo được ⇒ phải ghi vào `accountKhongDoDuoc` | 4/19 | **4/4** | tắt nhánh ghi khuyết ⇒ tụt còn **0/4** |
| **P3** | ALT không giải được ⇒ verdict không bao giờ `safe` | 1/19 | 1/1 | **CHƯA** |

**Cột cuối là cột quan trọng nhất, và P3 không có nó.**

Một tính chất "1/1 đạt" mà không chứng minh được là nó *bắt* được lỗi thì chưa phải
tính chất — nó là một phép đếm. Mẫu duy nhất kích hoạt P3 (`R10-pos`) cũng có
`simulationOk: false`, nên fail-safe 1 đã nâng verdict lên `warning` trước khi lớp ALT
kịp làm gì. Tắt fail-safe 3 hay tắt luật 10 đều không kéo P3 xuống được.

Đây **cùng hình dạng** với phát hiện FS3 ở [mục 3 của
`MUTATION-B04.md`](bao-mat/MUTATION-B04.md): hai lớp chồng nhau, không tách được bằng
dữ liệu hiện có. Muốn tách cần một mẫu **ALT hỏng mà mô phỏng THÀNH CÔNG** — bộ 19
fixture không có, và dựng nó cần Devnet.

Ghi P3 vào bảng với ô trống, chứ không bỏ nó đi: bỏ đi thì bảng trông hoàn hảo và mất
luôn thông tin rằng còn một tính chất chưa kiểm được.

### 8.3 · 19 mẫu KHÔNG đánh giá được — nhóm riêng, không trộn vào mẫu số

Nghiệm thu thẻ đòi *"số không đánh giá được và lý do"*. 19/38 mẫu không chạy được ở
tầng này, chia hai nhóm:

| Số | Lý do |
|---|---|
| **10** | mẫu `real-mainnet` — `capture-rpc.ts` từ chối ghi fixture bằng endpoint devnet vì ALT/account không tồn tại ở đó |
| **9** | không có file giao dịch — ca đối chứng dựng bằng cách sửa Facts trực tiếp |

19 + 19 = 38. Trộn hai nhóm này vào mẫu số là cách một tập đánh giá tự thu nhỏ mà
người đọc vẫn thấy tỉ lệ đẹp.

### 8.4 · Ba điều mục này KHÔNG nói

- **Không phải accuracy.** Đây là độ đáp ứng tính chất trên tập kiểm của đội. Thẻ nói
  rõ: *"Nếu chỉ có synthetic properties, báo độ đáp ứng trên tập kiểm này; không công
  bố accuracy thị trường."*
- **Không phải thẩm định bảo mật độc lập.** Đội tự dựng cả mẫu lẫn tính chất. Gọi nó
  là *independent security validation* là sai sự thật — thẻ cấm đích danh.
- **Không có tập giữ lại.** `data/seed/giu-lai/` vẫn trống, và mục 2 nói vì sao. Không
  mẫu nào trong 38 mẫu cũ được đổi tên thành held-out — thẻ cấm điều đó, và
  `giuLai.test.ts` canh.

### 8.5 · Không phân loại TP/FP/TN/FN

Thẻ cho phép phân loại *"chỉ khi nhãn và bài toán nhị phân có nghĩa"*. Ở đây không:
một mẫu có thể vừa đạt tính chất này vừa sai tính chất kia, và "dương tính" không có
nghĩa xác định. Ép vào bốn ô sẽ sinh ra một con số nghe như accuracy — đúng thứ mục 1
đã từ chối công bố.
