# Đơn vị kinh tế — chi phí một lượt kiểm tra

**Đo ngày 23/08/2026** · commit `9e5e0f3` · script [`do-chi-phi.ts`](../scripts/do-chi-phi.ts) và [`do-token-mo-hinh.ts`](../scripts/do-token-mo-hinh.ts)

Trang này tồn tại vì một câu hỏi mà giám khảo track *Best Product & Business* chắc
chắn hỏi và đội chưa trả lời được: **"Một lượt kiểm tra tốn của các em bao nhiêu?"**

Mọi con số dưới đây **đo được** hoặc **tra được từ trang giá công khai có link**.
Ô nào chưa đo thì ghi *chưa đo* — không điền số đoán.

---

## 1 · Chi phí RPC — đo trên 20 giao dịch mainnet thật

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

## 2 · Một phát hiện từ chính phép đo

`getSignaturesForAddress` xuất hiện tới **3 lượt** ở đuôi phân bố. Nó đến từ
[`traTuoiVi()`](../packages/core/src/l1/fetch.ts) — tra tuổi ví nhận để nuôi luật
"ví mới tạo", gọi với `limit: 1000`.

**Nhiều khả năng đây là lượt gọi nặng nhất trong cả danh sách** — bốn phương thức
kia đọc một hoặc một nhúm tài khoản, cái này quét lịch sử chữ ký của một địa chỉ.

> **Chưa xác nhận, và phải xác nhận trước khi kết luận:** đội chưa tra bảng trọng số
> credit của Helius. Câu trên là suy đoán từ bản chất phép tính, không phải số liệu.
> Tra bảng là việc 20 phút — làm trước khi đưa vào bất kỳ slide nào.

Nếu đúng thì **một tính năng làm giàu dữ liệu đang chiếm phần lớn chi phí biên** của
sản phẩm, trong khi nó chỉ phục vụ một luật.

**Không tự sửa** — đây là quyết định sản phẩm, không phải lỗi. Ba lựa chọn:

| Cách | Được | Mất |
|---|---|---|
| Giữ nguyên | Luật "ví mới" chạy đủ | Chi phí biên cao nhất, không biết cao bao nhiêu cho tới khi tra bảng credit |
| Hạ `limit` 1000 → 100 | Rẻ hơn nhiều | Ví già hơn 100 giao dịch vẫn nhận ra được; chỉ mất độ chính xác của **tuổi**, mà luật chỉ cần biết "mới hay không" |
| Đệm kết quả theo địa chỉ | Rẻ nhất khi có lưu lượng thật | Thêm trạng thái; tuổi ví thay đổi chậm nên đệm 24 giờ gần như không mất gì |

> Đội đã chặn đúng hai chỗ quan trọng: tối đa 3 ví tra (`MAX_VI_TRA`) và thời hạn
> 2,5 giây (`HAN_LAM_GIAU_MS`). Chặn số lượt thì có; chặn **độ nặng mỗi lượt** thì chưa.

---

## 3 · Chi phí mô hình ngôn ngữ

| | |
|---|---|
| Kích thước payload | trung vị **1.354 ký tự**, cao nhất 2.050 |
| Token vào | **chưa đo** — cần `ANTHROPIC_API_KEY` |
| Token ra | **chưa đo** — nhưng **chặn cứng ở 400** (`maxTokens` trong `anthropic.ts`) |

Ký tự **không phải** token, và tiếng Việt có dấu tách token tệ hơn tiếng Anh khá
nhiều — nên không quy đổi. Đo thật mất một lượt chạy có khoá:

```
node --experimental-strip-types scripts/do-token-mo-hinh.ts 6
```

Script đi qua **đúng đường sản xuất** (`dienGiaiBangMoHinh` tự dựng payload) và lấy
số token từ trường `usage` do nhà cung cấp trả về, không tự đếm.

**Một điều đã chắc chắn mà không cần khoá:** đầu ra **bị chặn ở 400 token** trong
code. Chi phí mô hình mỗi lượt kiểm tra có **trần cứng**, không phải đại lượng có
thể trôi. Đây là câu trả lời tốt cho câu hỏi *"chi phí AI của các em có kiểm soát được không?"*.

---

## 4 · Quy ra tiền — và vì sao kết luận đứng vững dù chưa biết chính xác

Helius bán **$5 / triệu credit** ([bảng giá](https://www.helius.dev/pricing)), tầng
trả tiền đầu tiên **$49/tháng**. QuickNode cũng đặt tầng đầu ở **$49/tháng**
([bảng giá](https://www.quicknode.com/pricing)).

**Không tự chế trọng số credit.** Mỗi phương thức có hạng riêng trong bảng của nhà
cung cấp, và bịa ra rồi đưa lên sân khấu là đúng loại số liệu mà thể lệ phạt. Nhưng
kết luận **không phụ thuộc** vào việc biết chính xác trọng số — vì nó đứng vững trên
cả một dải rộng:

| Giả định trọng số | Chi phí RPC / lượt kiểm tra | $49 mua được bao nhiêu lượt |
|---|---:|---:|
| 1 credit mỗi lượt gọi | ~$0,000033 | ~1,5 triệu |
| 10 credit mỗi lượt gọi | ~$0,00033 | ~150 nghìn |
| 50 credit mỗi lượt gọi | ~$0,0016 | ~30 nghìn |

*(6,5 lượt gọi × trọng số × $5/triệu credit. Trọng số thật phải tra bảng Helius trước khi lên slide.)*

**Kết luận đứng vững trên cả ba dòng:** chi phí RPC của một lượt kiểm tra nằm ở
**hàng phần nghìn đến phần trăm nghìn đô la**. Một ví xử lý 30 nghìn lượt ký mỗi
tháng — đã là ví có quy mô thật — vẫn nằm trong tầm chi phí hạ tầng mà chính họ
đang trả cho RPC hôm nay.

**Câu nói được trên sân khấu:**

> *"Chi phí biên một lượt kiểm tra nhỏ hơn chi phí RPC mà chính ví đó đang trả để
> gửi giao dịch đi. Chúng em đo trên 20 giao dịch mainnet thật: trung vị 6,5 lượt
> gọi RPC, cao nhất 9. Phần AI có trần cứng 400 token đầu ra."*

**Câu KHÔNG được nói:** một con số biên lợi nhuận cụ thể. Chưa tra bảng credit, chưa
đo token, và **chưa có giá bán của chính Custos** — ba ô trống thì không ra được một
tỉ lệ. Nói *"biên gộp 90 %"* hôm nay là bịa.

---

## 5 · Còn thiếu gì để trang này hoàn chỉnh

| Ô | Cách lấp | Mất bao lâu |
|---|---|---|
| Trọng số credit từng phương thức | Tra bảng Helius, ghi lại ngày tra | 20 phút |
| Token vào/ra thật | Chạy `do-token-mo-hinh.ts` với khoá | 5 phút |
| Giá bán của Custos | Cần hỏi ví/dApp — `docs/VIEC-CUA-BAN.md` mục 3 | 1 buổi tối |

Hai ô đầu lấp xong là ra được **chi phí biên đầy đủ**. Ô thứ ba mới ra được **biên
lợi nhuận**, và nó không lấp được bằng code — phải có người đi hỏi.

---

## 6 · Cách đo lại

```
node --experimental-strip-types scripts/do-chi-phi.ts          # phần RPC
node --experimental-strip-types scripts/do-token-mo-hinh.ts 6  # phần mô hình, cần khoá
```

Kết quả ghi vào `data/seed/chi-phi.json` và `data/seed/chi-phi-mo-hinh.json`.
Cohort cố định, nên đo lại sau khi sửa code là so được trực tiếp — cùng kỷ luật đã
ghi ở `SEED-DATASET.md` mục 0b3.
