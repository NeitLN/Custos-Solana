# ADR-0002 · Dấu vết chẩn đoán là trường TUỲ CHỌN, không phải entrypoint riêng

**Trạng thái:** đã quyết và đã thực thi
**Ngày:** 14/09/2026 · **Vai:** Solana, SDK/Perf, Security
**Việc TB-X01 của [`ROADMAP-TECHNICAL-CUSTOS.md`](../../ROADMAP-TECHNICAL-CUSTOS.md)**

---

## 1 · Vấn đề

Thẻ X01 hỏi một câu hẹp: *một cảnh báo có đi ngược về được dữ kiện đã đo không?*

Rà mã hiện có cho ra hai chỗ đứt:

| Chỗ đứt | Hiện trạng trước X01 |
|---|---|
| Trong `RuleHit` | chỉ có `{ruleId, level, reasonCode, detail}` — mọi dữ kiện cụ thể (địa chỉ, mint, index) **chỉ tồn tại trong `detail`, một chuỗi tiếng Việt** |
| Ở ranh giới `inspect()` | kết quả không mang `hits`, nên ngoài SDK không ai thấy `ruleId` |

Và chỗ đứt thứ nhất đã gây lỗi thật **hai lần**, cùng một hình dạng — `diff.ts` nối
cảnh báo với dòng bảng bằng `hits.some(h => h.detail.includes(địa_chỉ))`:

- **luật 13** nói về SOL của người dùng, không nhắc địa chỉ tài khoản nào ⇒ dòng wSOL
  không bao giờ đỏ. Vá riêng bằng `h.ruleId === 13`.
- **luật 11** cộng theo `mint` nên `detail` nhúng mint, còn bảng dò **địa chỉ token
  account** ⇒ trên `R11-pos`, hai token rời ví sạch (500000000 → 0 và 300000000 → 0),
  verdict Vàng với `OUTFLOW_KHONG_KHOP`, mà **cả hai dòng số dư vẫn tô `info`**.

Vá theo từng luật thì luật thứ ba mắc lại sẽ không ai thấy.

---

## 2 · Quyết định

**Hai thay đổi, cả hai đều là trường tuỳ chọn.**

1. `RuleHit.bangChung?: BangChung[]` — dữ kiện luật đã dựa vào, dưới dạng **ID ổn
   định** (`{loai, khoa}`, khoá là base58). `diff.ts` nối theo đó thay vì dò chuỗi.
2. `InspectResult.chanDoan?: ChanDoan` — bật bằng `InspectOptions.chanDoan: true`,
   **mặc định tắt**.

### Vì sao trường tuỳ chọn, không phải entrypoint riêng

Thẻ cho phép cả hai: *"Giữ `inspect()` hiện có; dùng entrypoint/wrapper diagnostic tuỳ
chọn nếu cần."* Chọn trường tuỳ chọn vì ba lý do đo được:

| | Trường tuỳ chọn (đã chọn) | Entrypoint riêng `inspectChanDoan()` |
|---|---|---|
| Bề mặt API | 0 hàm mới | +1 hàm phải tài liệu hoá, test, giữ tương thích |
| Nguy cơ lệch | không có — cùng một đường mã | hai đường có thể trôi khác nhau, và bản 0.1.0 đã hỏng đúng vì thêm entry point |
| Tiền lệ trong repo | `loiKhaiLech?`, `truocDayDu?`, `nguoiDung?` | không có |

`packages/core/README.md` đã ghi một bài học cùng loại: thêm entry point là thêm đúng
bề mặt đã làm hỏng bản 0.1.0.

### Vì sao mặc định TẮT

`chanDoan` mang địa chỉ đầy đủ của mọi tài khoản liên quan. Thẻ đòi *"tách raw
diagnostics nhạy cảm khỏi phần hiển thị/export mặc định"*. Consumer nào cần thì xin.

---

## 3 · Tương thích — đo, không hứa

| Kiểm | Kết quả |
|---|---|
| `validateInspectResult` với kết quả **không** có `chanDoan` | `[]` — hợp lệ |
| `validateInspectResult` với kết quả **có** `chanDoan` | `[]` — hợp lệ |
| Consumer nào đếm số trường của `InspectResult`? | **không có** — grep toàn repo |
| 16 chỗ trả `RuleHit` phải sửa? | **không** — `bangChung` tuỳ chọn, 12 luật chưa khai vẫn chạy qua đường lui |
| Bộ test | **740 pass, 0 fail** |

**Đường lui giữ lại có chủ ý.** 12/14 luật chưa khai `bangChung`; `diff.ts` vẫn dùng
`detail.includes(...)` cho **riêng** chúng (`h.bangChung === undefined`). Bỏ hẳn đường
lui sẽ làm mọi dòng mất màu ngay — đổi một lỗi im lặng thành một lỗi to hơn.

---

## 4 · Impact bundle — số thật

Đo trên `apps/demo-wallet`, cùng cấu hình, build liên tiếp:

| | Trước X01 | Sau X01 | Chênh |
|---|---|---|---|
| `coHan-*.js` | 352.482 byte | **353.254 byte** | **+772 byte · +0,22 %** |
| gzip | 107,31 kB | **107,47 kB** | +0,16 kB |

Phần lớn 772 byte đó là **dòng hiển thị trong `packages/ai/src/mucKyThuat.ts`**, không
phải bản thân chẩn đoán: `ChanDoan` khai trong `packages/types` là **type-only** (0
byte runtime), và nhánh dựng trong `inspect.ts` là 19 dòng.

Consumer không bật `chanDoan` vẫn trả giá 772 byte đó. Chấp nhận được ở mức này; nếu
sau này nó lớn lên thì tách `mucKyThuat` thành subpath là bước tiếp theo, không phải
tách `inspect()`.

---

## 5 · Nghiệm thu — đo bằng số, không bằng lời

Thẻ đòi: *"tắt diagnostics không đổi verdict và không tăng RPC"*. Cả hai đo trên
`R11-pos` qua fixture replay, đếm **từng method** chứ không chỉ tổng:

```
TẮT : level=warning · ["MINT_AUTHORITY_CHUA_THU_HOI","OUTFLOW_KHONG_KHOP"] · RPC=6
BẬT : level=warning · ["MINT_AUTHORITY_CHUA_THU_HOI","OUTFLOW_KHONG_KHOP"] · RPC=6

verdict giống nhau     : true
diff  giống nhau       : true
số lượt RPC giống nhau : true
  {"getFeeForMessage":1,"getMultipleAccountsInfo":3,"simulateTransaction":1,"getSignaturesForAddress":1}
```

Đếm từng method là có chủ ý: một bản gọi thêm `getMultipleAccountsInfo` rồi bớt
`getSignaturesForAddress` sẽ giữ nguyên tổng và qua được một phép đếm thô.

Guard `chanDoanX01.test.ts` — 9 bài, **mutation 5 hướng đều đỏ**: bỏ cờ bật · làm tròn
`thieuBangChung` về 0 · nhét text tiếng Việt vào `khoa` · trace mang mã không thuộc
lượt · xoá `phienBan` khỏi schema.

---

## 6 · Điều ADR này KHÔNG làm

- **Không xây trình debugger tổng quát.** Thẻ nói rõ *"Không cần xây trình debugger
  tổng quát"*. Đây là một trường tuỳ chọn mang đúng thứ L2 đã biết.
- **Không gắn `bangChung` cho cả 14 luật.** Mới 2/14 (luật 11 và 13) — đúng hai luật
  đã gây lỗi. `chanDoan.thieuBangChung` đếm ra phần còn lại thay vì giấu, và
  `mucKyThuat` in *"chưa có bằng chứng truy vết chi tiết"* thay vì suy diễn.
- **Không đổi `level`.** L2 vẫn là nơi duy nhất sinh verdict. Bật hay tắt chẩn đoán
  không đổi một bit nào của kết luận — có bài kiểm riêng cho điều đó.
- **Không xuất dữ liệu nhạy cảm ngoài phạm vi.** `chanDoan` chỉ chứa những gì đã có
  trong `Facts` của chính lượt đó: mã lý do, số hiệu luật, địa chỉ liên quan, coverage.
  Không khoá API, không giao dịch đã ký.
