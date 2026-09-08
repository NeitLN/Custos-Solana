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
