# Đơn vị kinh tế — chi phí một lượt kiểm tra

**Đo ngày 23/08/2026** · commit `9e5e0f3` · script [`do-chi-phi.ts`](../scripts/do-chi-phi.ts) và [`do-token-mo-hinh.ts`](../scripts/do-token-mo-hinh.ts)

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

**Vẫn KHÔNG nói được:** một tỉ lệ biên lợi nhuận. Còn thiếu hai ô — token mô hình (cần
khoá) và **giá bán của chính Custos** (cần hỏi khách hàng). Ba ô mới ra được một tỉ lệ.

---

## 5 · Còn thiếu gì để trang này hoàn chỉnh

| Ô | Cách lấp | Mất bao lâu |
|---|---|---|
| ~~Trọng số credit từng phương thức~~ | ✅ **xong 30/08** — mọi lời gọi = 1 credit | — |
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
