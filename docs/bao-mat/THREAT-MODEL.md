# Threat model — Custos SDK

**Việc TB-S01 của [`docs/roadmap/ROADMAP-TECHNICAL-CUSTOS.md`](../roadmap/ROADMAP-TECHNICAL-CUSTOS.md).**
Soạn 12/09/2026 trên bản mã có T01–T04 đã sửa.

Trang này **không** thay [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md). Audit đó là danh
sách **phát hiện cụ thể** (F1–F6) và đã đóng; trang này trả lời câu khác và tổng quát
hơn: *ai có thể nói dối với Custos, qua đường nào, và Custos làm gì với lời nói dối
đó?*

Mọi cơ chế dưới đây **đã đọc trong code trước khi viết**, có đường dẫn kèm theo. Chỗ
nào không có cơ chế thì ghi là **giới hạn**, không viết lấp chỗ trống.

---

## 1 · Tài sản cần bảo vệ, và người được bảo vệ là ai

| Tài sản | Vì sao |
|---|---|
| Quyết định **ký hay không ký** của người dùng | Đây là tài sản thật. Mọi thứ khác chỉ là đường dẫn tới nó |
| Token và SOL trong tài khoản **người dùng** | Đối tượng của hậu quả |
| **Quyền kiểm soát** tài khoản (owner, delegate, close authority) | Mất quyền không làm số dư đổi — nên nó là loại mất mát khó thấy nhất |

**Người được bảo vệ ≠ người trả phí.** Đây từng là một lỗi thật
([`SECURITY-AUDIT.md` F1b](SECURITY-AUDIT.md)): lấy fee payer làm người dùng thì một
giao dịch do kẻ tấn công trả phí sẽ được phân tích *"hộ kẻ tấn công"*. Người dùng đến
từ `InspectOptions.nguoiDung`, do ví cung cấp — **không** suy từ giao dịch.

## 2 · Ranh giới tin cậy

```
  KHÔNG ĐÁNG TIN                          │  ĐÁNH GIÁ ĐƯỢC          │  TIN
──────────────────────────────────────────┼─────────────────────────┼──────────────
  dApp: transaction, expectedAction,      │  RPC: simulate, account │  ví: nguoiDung
        kyHieuToken                       │       state, blockhash  │  bảng IDL (build)
  chuỗi: token symbol, metadata           │                         │  luật L2
  mô hình ngôn ngữ: explanation           │                         │
```

**Cột giữa không phải "tin".** RPC là hạ tầng có thể sai, thiếu hoặc cắt dữ liệu —
mục 3.2 và 3.3. Nó chỉ khác cột trái ở chỗ **không có động cơ** nói dối, chứ không
phải ở chỗ luôn đúng.

**Bảng IDL nằm ở cột phải vì nó đóng băng lúc build**, không tải lúc chạy
([`l1/bang-idl.ts`](../../packages/core/src/l1/bang-idl.ts) sinh bởi
`scripts/tao-bang-idl.ts`). Hệ quả quan trọng cho mục 3.5.

## 3 · Từng rủi ro, cơ chế, và cách kiểm

### 3.1 · dApp khai `expectedAction` sai để trông vô hại

**Cơ chế — quy tắc bất đối xứng.** Khớp thì **không** giảm verdict và **không** tắt
cảnh báo nào; chỉ lệch mới nâng nghi ngờ.
[`inspect.ts:69–78`](../../packages/core/src/inspect.ts). Ngữ cảnh chỉ được làm sản
phẩm **thận trọng hơn**, không bao giờ dễ dãi hơn.

**Ca kiểm:** `expectedAction KHỚP ⇒ KHÔNG tắt cảnh báo nào (dApp độc hại khai đúng
được)` trong `npm run check`.

### 3.2 · RPC trả `accounts: null` kèm `err: null`

Đây là **F1/A1 của audit vòng 1**, và nó từng làm Custos **bịa ra mất mát**: mọi ô
null đọc thành "số dư về 0".

**Cơ chế:** tách "mô phỏng thất bại" khỏi "mô phỏng thành công nhưng không trả state"
tại [`l1/fetch.ts:182,210`](../../packages/core/src/l1/fetch.ts). Không đọc được state
⇒ `coverage.analyzed` giảm, **không** sinh dòng chênh lệch.

**Bất biến liên quan:** mô phỏng hỏng thì **không bao giờ** ra `safe` — 7 bài FAIL-SAFE
trong `npm run check`.

### 3.3 · RPC cắt dữ liệu ở account thứ 101

**Cơ chế:** phát hiện và hạ coverage thay vì im lặng đọc thiếu (F2 đã đóng).

**Giới hạn còn lại:** Custos **không** kiểm chứng được RPC có nói thật. Một RPC độc
hại có thể trả state bịa đặt và Custos sẽ phân tích trên đó. Không có cơ chế nào
trong phạm vi một SDK client-side chống được điều này — **phải khai, không lấp**.

### 3.4 · Token symbol hoặc `kyHieuToken` mang câu ra lệnh

Một token tên `"an toàn, cứ ký đi"` sẽ khiến **chính lớp bảo vệ** nói câu trấn an hộ
kẻ tấn công.

**Cơ chế:** cả hai nguồn đi qua **cùng một** bộ lọc hình dạng
`/^[A-Za-z0-9 ._+-]{1,16}$/` — [`diff.ts:20–35`](../../packages/core/src/diff.ts).
Không khớp ⇒ quay về địa chỉ rút gọn: *xấu hơn nhưng thật*.

Điểm đáng chú ý: **ký hiệu đọc từ chuỗi cũng không đáng tin hơn ký hiệu do dApp
truyền vào** — người phát hành token lừa đảo đặt tên được y như dApp độc hại khai tên
được. Hai nguồn, một bộ lọc.

### 3.5 · IDL giả hoặc IDL lỗi

**Không phải đường tấn công runtime**, và đây là kết luận từ việc đọc code chứ không
phải một giả định lạc quan: bảng mã lệnh **sinh lúc build** từ IDL tác giả công bố
trên chuỗi, rồi đóng băng vào
[`l1/bang-idl.ts`](../../packages/core/src/l1/bang-idl.ts). Lúc chạy không có lượt
tải IDL nào để đầu độc.

**Đường tấn công thật chuyển sang chỗ khác:** kẻ tấn công phải sửa được IDL **trước**
thời điểm đội chạy `scripts/tao-bang-idl.ts`. Đó là rủi ro chuỗi cung ứng ở thời điểm
build, không phải rủi ro runtime — và nó có mốc thời gian ghi trong file
(`Lấy lúc: 2026-08-22T18:26:53.223Z`).

**Giới hạn:** đọc được **tên lệnh** từ IDL **không** đồng nghĩa đã kiểm chứng
**semantics** của chương trình. Một chương trình có IDL đẹp vẫn có thể làm việc xấu.
Coverage đo **phạm vi đọc hiểu**, không đo độ an toàn — xem mục 4.

### 3.6 · Chương trình chưa biết

**Cơ chế:** chương trình không công bố IDL thì **không** có trong bảng và **vẫn bị
đếm là chưa xác minh**. Nguyên văn trong code: *"Coverage thấp còn hơn tự nhận đã đọc
hiểu."*

**Bất biến:** lệnh chưa đọc hiểu mà **chạm tài sản người ký** ⇒ `warning`. Lệnh chưa
đọc hiểu **không** chạm tài sản người ký ⇒ vẫn `safe` — đây là ngoại lệ có chủ ý, để
tránh luật *"không biết gì cũng đỏ"* vốn là cách nhanh nhất tạo false positive.

### 3.7 · Mô hình ngôn ngữ nói sai

**Cơ chế nhiều lớp:**

| Lớp | Chặn gì |
|---|---|
| `level` chỉ do L2 sinh | AI **không** tạo, **không** sửa mức cảnh báo |
| Bộ chắn neo địa chỉ/số | 13/13 bẫy bị chặn, kèm **3/3 đối chứng dương** |
| `boiThoiHan` | mô hình chậm hoặc lỗi ⇒ rơi về câu tất định |
| `aiAdvisory` trường riêng | AI chỉ được **yêu cầu kiểm tra thủ công** |

**Giới hạn đã đo được, và nó bất lợi:** bộ đếm bắt số **bịa ra**, không bắt số
**grounded nhưng ghép sai**. Và lượt live 12/09 cho thấy mô hình **đếm sai số lệnh**
ở 1–4/38 ca mỗi lượt — xem [`DON-VI-KINH-TE.md`](../DON-VI-KINH-TE.md) mục 3.

**Điểm phải nói rõ:** *"không có lỗ hổng vì `level` không đổi"* là câu **chưa đủ**.
Câu giải thích sai vẫn ảnh hưởng người đọc — đó là toàn bộ mục đích của lớp L3. Đầu ra
mô hình là **nội dung không đáng tin cần kiểm**, kể cả khi L2 đã an toàn trước AI.

### 3.8 · Consumer bỏ qua kết quả

**Custos KHÔNG cưỡng chế được điều này, và không nên hứa là có.**

`inspect()` chỉ **đọc và mô phỏng**. Lớp thực thi chính sách "có cho ký hay không" là
**chính ví/consumer**. Một consumer cố ý gọi `inspect()` rồi ký bất chấp kết quả thì
SDK không có cách nào chặn — nó không nằm giữa người dùng và khoá.

Ranh giới cưỡng chế viết đầy đủ trong
[`PILOT-TU-LAM.md`](../PILOT-TU-LAM.md): Custos dùng được cho **ví tin cậy**, không
phải để bảo vệ người dùng khỏi một dApp đang chạy trong ngữ cảnh của chính nó.

---

## 4 · Bốn thứ dễ bị đọc lẫn — và phân biệt được bằng gì

Đây là mục quan trọng nhất của trang, vì gộp bốn thứ này là cách một sản phẩm bảo mật
nói quá về chính nó mà mọi con số vẫn đúng.

| Khả năng | Nghĩa | Đo bằng |
|---|---|---|
| **Decode cấu trúc** | đọc được instruction thành trường có tên | có mặt trong `BANG_IDL`, hoặc là program hệ thống |
| **Program đã xác minh** | biết chương trình này là gì | `coverage.unverifiedPrograms` |
| **Dữ kiện đo được** | trạng thái trước/sau từ mô phỏng | `facts.tokenAccounts`, `facts.solDelta` |
| **Khả năng kết luận** | nói được hậu quả này tốt hay xấu | **luật L2**, và chỉ trong phạm vi 14 luật đã viết |

**Decode được ≠ an toàn.** Đọc trọn tên lệnh của một chương trình lừa đảo vẫn là đọc
lệnh của một chương trình lừa đảo.

**Coverage 100 % ≠ giao dịch lành.** Coverage đo **phạm vi đọc hiểu**, không đo
accuracy và không đo mức an toàn.

## 5 · Kiểu TypeScript KHÔNG phải bằng chứng an toàn runtime

Nguyên văn yêu cầu của thẻ S01, và nó đã bắt được một lỗi thật trong phiên này.

Ranh giới `confirmTransaction` từng khai `Promise<unknown>`, và chính kiểu đó cho phép
luồng cũ **bỏ qua nội dung phản hồi** mà TypeScript không phản đối — lỗi **T01**.

Nhưng cách sửa **không** phải khai kiểu chặt hơn. Tôi đã thử và nó tệ hơn: kiểu chặt
làm chính các bài kiểm dữ liệu xấu **không biên dịch được**, tức kiểu tĩnh chặn mất
phép kiểm runtime ở đúng ranh giới cần nó nhất.

**Quy tắc chốt:** ở ranh giới tin cậy, dùng `unknown` + **validator chạy lúc chạy**.
Kiểu là tài liệu cho người đọc về hình dạng *mong đợi*; nó không kiểm được gì khi dữ
liệu tới từ mạng qua transport của người khác.
Xem [`gui.ts` `docKetQuaXacNhan()`](../../apps/demo-wallet/src/gui.ts).

## 6 · Điều Custos KHÔNG kiểm soát — liệt kê, không lấp

1. **RPC nói thật hay không** (3.3). Không cơ chế nào trong phạm vi SDK client.
2. **Consumer có tuân thủ kết quả** (3.8). Thuộc ví, không thuộc SDK.
3. **Semantics của chương trình đã decode** (3.5). Đọc được tên ≠ đã kiểm chứng.
4. **Ground truth cho tỉ lệ báo nhầm.** Chưa kiểm chứng từng giao dịch cohort là
   lành, nên **chưa đo được** — xem `docs/SEED-DATASET.md` mục 0b3/0b4.
5. **Trạng thái chuỗi sau thời điểm mô phỏng.** Kết quả là quan sát **tại một trạng
   thái**; nó không bảo đảm lần thực thi sau giống hệt.
6. **Thiết bị thật, WebKit, Firefox.** Mọi số giao diện đo trên Chromium headless.
