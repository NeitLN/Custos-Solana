# Ngân sách RPC, thời hạn và huỷ chờ

**Việc TB-C05 của [`docs/roadmap/ROADMAP-TECHNICAL-CUSTOS.md`](roadmap/ROADMAP-TECHNICAL-CUSTOS.md).**
Soạn 12/09/2026.

Thẻ yêu cầu *"kiểm các deadline hiện có TRƯỚC khi thêm"*. Đã kiểm, và kết luận là
phần lớn đã có — trang này lập bảng những gì tồn tại, sửa một rò rỉ đo được, và ghi
rõ phần **không** làm được.

---

## 1 · Từng chặng RPC của một lượt `inspect()`

Sáu chặng, và điều quan trọng nhất là **chặng nào hỏng thì hỏng cả lượt, chặng nào có
đường lui riêng**.

| # | Chặng | Bắt buộc? | Lỗi thì sao | Nguồn |
|---|---|---|---|---|
| 1 | `getLatestBlockhash` | có (do consumer gọi) | không dựng được giao dịch | ví/dApp |
| 2 | `getMultipleAccountsInfo` — trạng thái **TRƯỚC** | **có** | cả lượt thất bại | [`l1/fetch.ts:50`](../packages/core/src/l1/fetch.ts) |
| 3 | `simulateTransaction` — trạng thái **SAU** | **có** | `coverage.analyzed = 0`, **không bao giờ** `safe` | [`l1/fetch.ts:194`](../packages/core/src/l1/fetch.ts) |
| 4 | `getAddressLookupTable` | có, nếu tx dùng ALT | không giải được ALT ⇒ không bao giờ `safe` | [`l1/fetch.ts:127`](../packages/core/src/l1/fetch.ts) |
| 5 | `getFeeForMessage` | **không** | `try/catch` → `null` ⇒ nhãn *"Ước tính phí mạng"* | [`l1/fetch.ts:114`](../packages/core/src/l1/fetch.ts) |
| 6 | `getSignaturesForAddress` — tuổi ví | **không** | `try/catch` → `null` ⇒ bỏ phần làm giàu | [`l1/fetch.ts:36`](../packages/core/src/l1/fetch.ts) |
| 7 | mint metadata (ký hiệu token) | **không** | ký hiệu `null` ⇒ hiển thị địa chỉ rút gọn | [`l1/ten-token.ts:133`](../packages/core/src/l1/ten-token.ts) |

**Ba chặng làm giàu (5, 6, 7) đã có đường lui riêng** — đúng yêu cầu *"dữ liệu làm
giàu thất bại có đường lui riêng"*. Chúng **không** nâng mức cảnh báo: thiếu tuổi ví
hay thiếu ký hiệu token không phải bằng chứng về rủi ro, và một luật *"không biết gì
cũng đỏ"* là cách nhanh nhất tạo false positive (bất biến 4).

**Hai chặng bắt buộc (2, 3) cố ý KHÔNG có đường lui.** Không đọc được trạng thái thì
không có gì để so — và fail-safe nói: thiếu dữ liệu cần thiết ⇒ `warning`, không bao
giờ `safe`.

Số đo thực tế: **6,5 lượt gọi RPC** trung vị (dải 4–9) trên cohort 20 giao dịch —
[`DON-VI-KINH-TE.md`](DON-VI-KINH-TE.md) mục 1.

## 2 · Thời hạn — hai hàm, hai nơi, và vì sao không gộp

| Hàm | Ai dùng | Hạn | Dọn timer |
|---|---|---|---|
| [`coHan`](../scripts/coHan.ts) | ví bọc `inspect()`, trang tấn công bọc blockhash | 12.000 ms (đặt ở `App.tsx`) | ✅ `.finally(clearTimeout)` từ đầu |
| [`coHanChung` / `moHan`](../scripts/coHan.ts) | một lượt kiểm nhiều chặng | **ngân sách chung**, chặng chia nhau | ✅ |
| [`boiThoiHan`](../packages/ai/src/index.ts) | lớp L3 | 4.000 ms mặc định | ✅ **vừa sửa** — xem mục 3 |

**`moHan` giải một lỗi thật đã đo được:** `coHan(viec, 12_000)` gọi hai lần nối tiếp
là **hai** ngân sách 12 giây riêng — người dùng chờ tới 24 giây trong khi thẻ lỗi vẫn
ghi *"sau 12 giây"*. Người dùng chờ **một** việc, nên ngân sách thuộc về việc đó.
7 bài kiểm ở `apps/demo-wallet/test/coHan.test.ts`.

## 3 · Một rò rỉ đã sửa — `boiThoiHan` không dọn timer

**Đo được, không phải giả định.** `Promise.race` thắng ở nhánh mô hình thì nhánh
`setTimeout` vẫn sống hết `msToiDa`: Promise bị bỏ **không huỷ được** timer bên trong
nó.

```
probe-timer-c05.ts, TRƯỚC khi sửa:
  ok   C05-1  `coHan` dọn timer              Timeout 0 → 0
  SAI  C05-2  `boiThoiHan` dọn timer         Timeout 0 → 1
  SAI  C05-3  10 lượt không để lại 10 timer  Timeout 1 → 11  (thêm ĐÚNG 10)
```

Đo bằng `process.getActiveResourcesInfo()`, không suy từ thời gian chạy.

**Hậu quả:** rác tích dần trong app chạy suốt buổi demo; và với Node, timer giữ event
loop sống nên một tiến trình CLI **không thoát được** tới khi cái cuối hết hạn.

**Bản sửa:** `finally { clearTimeout(dongHo) }`. Sau sửa: **3/3 đạt**. Guard
`packages/ai/test/boiThoiHanC05.test.ts` — **đã kiểm phủ định**: tháo `clearTimeout`
ra thì bài đỏ.

## 4 · Retry — ai retry, và có nhân đôi không

**Lõi Custos không có retry nào.** Đã tìm: không `retry`, `maxRetries`, `thuLai` hay
`attempt` nào trong `packages/core/src/`. Nên yêu cầu *"không nhân retry ở cả SDK và
wrapper"* **tự thoả ở lõi** — không phải vì đội đã xử lý, mà vì tầng đó không retry.

**Nhưng lớp AI thì có, và nó ngầm:** `anthropic.ts` dựng client bằng
`new Anthropic({ apiKey })`, và SDK chính thức mặc định `maxRetries = 2` — một
`messages.create` có thể thành **ba** lượt HTTP khi gặp 429 hoặc 5xx.

Artifact `data/eval/ai-ket-qua.json` ghi thẳng `sdkMaxRetriesMacDinh: 2` và
`datMaxRetriesTuongMinh: false` để con số chi phí không giả định mỗi lần kiểm là đúng
một lượt gọi. Chi tiết: [`DON-VI-KINH-TE.md`](DON-VI-KINH-TE.md) mục 3.

**Đã làm ở TB-P02:** adapter truyền `maxRetries` **tường minh**
(`RETRY_MAC_DINH = 2`, xuất từ `anthropic.ts`) thay vì thừa hưởng im lặng. Giá trị
**không đổi** — thứ đổi là nó thành một trần khai báo được, và `eval-ai.ts` đọc thẳng
hằng đó nên artifact không còn khai một đằng mã chạy một nẻo.

> **Không hạ nó xuống.** `maxRetries: 0` làm con số chi phí đẹp hơn ngay, và làm sản
> phẩm kém chịu lỗi hơn đúng lúc nhà cung cấp trả 429. `toiUuP02.test.ts` canh cả hai
> chiều: phải tường minh, và phải còn bằng 2.

## 5 · Huỷ chờ — điều KHÔNG làm được, nói trước

**Ngừng chờ ≠ huỷ request.** `coHan` và `boiThoiHan` đều chỉ ngừng **chờ**; lời gọi
RPC vẫn đang bay, vẫn tốn lượt gọi, và phản hồi của nó vẫn sẽ về (rồi bị bỏ). Nguyên
văn trong `coHan.ts` từ đầu: *"KHÔNG huỷ việc đang chạy. Promise không huỷ được, nên
hàm này chỉ ngừng CHỜ."*

| | Trạng thái |
|---|---|
| Dọn timer khi ngừng chờ | ✅ cả hai hàm |
| Bỏ qua kết quả về muộn | ✅ — `Promise.race` đã bỏ, và ở giao diện có thêm ID lượt (TB-C03) |
| Truyền `AbortSignal` xuống transport | ❌ **chưa làm** |

**Vì sao chưa — đã tra `index.d.ts` của gói đang cài, không nói theo trí nhớ:**

`@solana/web3.js@1.98.4` **có** `AbortSignal`, nhưng đúng ở hai chỗ Custos không
dùng:

| Nơi có `abortSignal` | Custos có dùng? |
|---|---|
| `BaseTransactionConfirmationStrategy` (`index.d.ts:1889`) | ❌ — chờ xác nhận thuộc consumer, xem `apps/demo-wallet/src/gui.ts` |
| `sendAndConfirmTransaction` (`index.d.ts:4017`) | ❌ — Custos không gửi giao dịch |

Các chặng Custos **thật sự** gọi — `simulateTransaction`,
`getMultipleAccountsInfo`, `getAddressLookupTable`, `getFeeForMessage`,
`getSignaturesForAddress` — **không** nhận `AbortSignal`.

> Bản đầu của đoạn này viết *"web3.js v1 không nhận `AbortSignal`"*. Sai: `grep` ra
> hai chỗ có. Kết luận cuối không đổi, nhưng lý do phải đúng — một phát biểu sai về
> thư viện sẽ bị bác ngay trong ba giây trước mặt giám khảo, và lúc đó cả trang mất
> uy tín chứ không chỉ một dòng.

Truyền được thì phải bọc `fetch` riêng qua `fetchMiddleware` hoặc thay transport — một
thay đổi chạm public surface, và thẻ C05 nói rõ *"ưu tiên wrapper/adapter tương thích
API hiện tại; thay public options phải có ADR và consumer test"*. Chưa có ADR nên chưa
làm.

**Hệ quả cần biết cho phần chi phí:** một lượt kiểm bị người dùng bỏ giữa chừng
**vẫn** tốn đủ số lượt gọi RPC của nó.

## 6 · Ca nghiệm thu — đã kiểm và chưa kiểm

| Ca | Trạng thái |
|---|---|
| RPC không bao giờ trả | ✅ `coHan` 7 bài · `boiThoiHan` bài "quá hạn ⇒ lui về câu tất định" |
| RPC ném lỗi (429/5xx) | ✅ `do-khuyet.test.ts` (RPC 503) · `moHinh.test.ts` (429) |
| JSON sai cấu trúc | ✅ bộ chắn L3 13/13 bẫy, gồm "trả rác không phải JSON" và "JSON rỗng" |
| Hết ngân sách trước chặng tiếp | ✅ `coHan.test.ts` — "hết ngân sách thì bỏ cuộc ngay" |
| Timer không tích luỹ | ✅ mục 3, đo bằng handle count |
| Người dùng huỷ giữa chừng | ⚠️ ngừng chờ được, **không** huỷ được request — mục 5 |
| Subscription không tích luỹ | ⚠️ **không áp dụng**: lõi không mở subscription nào. `confirmTransaction` của web3.js có dùng WebSocket nhưng nó thuộc consumer, không thuộc SDK |
| Đo trên mạng công cộng | ❌ **cố ý không** — thẻ nói *"không lấy mạng công cộng làm test tất định"*. Mọi bài trên đều dùng stub trong tiến trình |

---

## 7 · Tối ưu TB-P02 — cái gì đổi, cái gì cố ý giữ nguyên

### 7.1 · Xếp hạng bottleneck theo tác động người dùng

Đo trên 30 lượt bấm thật (`data/hieu-nang/do-tre.json`) và 19 fixture RPC:

| Nguồn | Đóng góp đo được | Tối ưu được? |
|---|---|---|
| **Retry của RPC công cộng** | 11/30 lượt gọi >7 lần RPC, trung vị **2875 ms** so với **852 ms** — chênh **3,4×**, Pearson **r = 0,84** | ❌ **ngoài tay đội** — đó là hạ tầng công cộng |
| Một vòng RTT thừa | ~**53 ms** (đo devnet, n=7, trung vị) | ✅ đã cắt — mục 7.2 |
| Tải trang | FCP **112 ms** nguội, 84 ms ấm | đã nhỏ, không đụng |

**Bottleneck lớn nhất nằm ngoài tầm với.** Nói ra vì nó quyết định phần còn lại: mọi
thứ đội tối ưu được cộng lại vẫn nhỏ hơn dao động của một endpoint công cộng.

### 7.2 · Đã đổi — dùng lại dữ liệu đã trả tiền để lấy

`fetch.ts` đọc tài khoản mint của những mint **không** nằm trong `allKeys` bằng một
lượt RPC riêng, lấy `decimals`, rồi **vứt `AccountInfo` đi**. Phần ký hiệu token ngay
dưới dựng `duLieuMint` bằng `allKeys.findIndex(...)` — mà theo đúng định nghĩa của
`thieu` thì chúng không có trong `allKeys`, nên `findIndex` **luôn** trả `-1`.

Đo trên fixture: **14/14** mẫu cho `0/1` (và `0/2`) mint thiếu nằm trong `allKeys`.
Con đường Token-2022 — *"metadata nằm ngay trong tài khoản mint, không tốn lượt gọi
nào"* — chưa bao giờ chạy được cho đúng nhóm mint repo vừa bỏ một lượt RPC ra đọc.

| | Trước | Sau |
|---|---|---|
| Lượt PDA Metaplex cho mint thiếu | **12/12** mẫu, luôn luôn | **0** |
| Tổng lượt RPC trên 19 fixture | 93 | **81** (−12,9 %) |
| Trung bình mỗi lượt kiểm | 4,89 | **4,26** |

**Lợi ích kép, và vế thứ hai quan trọng hơn:** mint Token-2022 hiếm khi có PDA
Metaplex, nên đường cũ thường trả ký hiệu `null` và bảng chênh lệch hiện `Agsm…Lf4Z`
thay vì tên token. Nay đọc được ngay trong tài khoản mint.

**Chi phí:** một `Map` giữ thêm tối đa vài `AccountInfo` trong một lượt kiểm. Không
phải cache — nó sống đúng trong phạm vi một lần gọi `inspect()` và chết cùng nó.

**Thời gian:** ~53 ms mỗi lượt có nhánh đó, tức **6,2 %** của một lượt không retry
(852 ms) và **3,9 %** của trung vị chung (1351 ms). Nhỏ so với retry, nhưng nó là
phần đội **kiểm soát được**.

### 7.3 · Đã cân nhắc và CỐ Ý KHÔNG làm

| Ý | Vì sao không |
|---|---|
| **Cache balances / authority / verdict** | Thẻ cấm bằng đúng chữ. Một verdict cache lại là một verdict nói về giao dịch khác |
| **Gộp `getMultipleAccountsInfo` #1 với #2** | Không gộp được: #2 chỉ biết hỏi gì **sau** khi #1 và `simulateTransaction` trả về |
| **`disableRetryOnRateLimit`** | Sai hướng — nó làm sản phẩm kém chịu lỗi để đổi lấy số đo đẹp hơn |
| **Lazy-load `@solana/web3.js`** (346 KB) | Ví và trang phỏng vấn đều gọi `inspect()` thật, nên lazy chỉ **dời** chi phí. Trang số liệu đã không kéo nó — tách chunk vốn đúng sẵn |
| **Hạ `MAX_VI_TRA` / `HAN_LAM_GIAU_MS`** | Ba chặng làm giàu đã có `Promise.all` + hạn 2500 ms riêng; chúng không nằm trên đường găng |
| **`AbortSignal` xuống transport** | Mục 5 — cần ADR và consumer test, chưa có |

### 7.4 · Không hồi quy — đo, không hứa

| | Trước | Sau |
|---|---|---|
| Replay 19 fixture | 19/29 đạt · 0 hỏng | **19/29 đạt · 0 hỏng** |
| `so-baseline` verdict | lệch kỳ vọng người gán **0/5** ca | **0/5** |
| Bộ test | xanh | xanh |
