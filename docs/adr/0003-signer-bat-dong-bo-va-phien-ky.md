# ADR-0003 — Signer bất đồng bộ và phiên ký dùng một lần

**Ngày:** 17/09/2026 · **Trạng thái:** đã quyết, đang thực thi
**Thẻ:** CU-01 (contract), CU-02 (session), CU-19 (adapter ví)
**Nguồn yêu cầu:** `docs/roadmap/UPDATE-CUSTOS.md` mục 4.3

---

## 1 · Vì sao ADR này tồn tại

`kySauKhiKiem()` trong `vi-du-tich-hop/src/ky.js` là **consumer tham chiếu** — thứ
một ví thật sẽ đọc và chép. Bốn lỗ hổng dưới đây đã **tái hiện được** trên bản
trước khi sửa, không phải suy đoán:

```
A · signer trả Promise.reject   -> { daKy: true }   khai đã ký khi ví TỪ CHỐI
B · signer treo mãi             -> { daKy: true }   khai đã ký khi signer CHƯA xong
C · gọi hai lần liên tiếp       -> signer chạy 2 lần  ký hai lần cùng một phiên
D · reject không ai bắt         -> unhandled rejection, SẬP tiến trình
```

Nguyên nhân chung: hàm gọi `signer(...)` rồi `return { daKy: true }` ở dòng ngay
sau, **không await**. Với signer đồng bộ thì đúng; mọi ví thật đều bất đồng bộ.

Lỗi D đáng nói riêng: nó không chỉ trả sai, nó làm **sập tiến trình của consumer**.
Một thư viện bảo mật khiến ví sập khi người dùng bấm "Từ chối" thì tự nó là lỗ hổng
sẵn có.

## 2 · Quyết định

### 2.1. `kySauKhiKiem` trở thành `async`

Trả `Promise<KetQuaKy>`. Chỉ khai `daKy: true` **sau khi promise của signer resolve**.

Đây là **breaking change** với consumer gọi đồng bộ. Chấp nhận, vì:

- giá trị trả về cũ **sai** ở mọi signer bất đồng bộ — giữ tương thích nghĩa là giữ
  một câu trả lời sai;
- consumer duy nhất trong repo là `vi-du-tich-hop` và bộ test của nó, sửa được;
- không im lặng đổi nghĩa trường cũ: `daKy` giữ nguyên nghĩa *"đã ký xong"*, chỉ có
  thời điểm biết được câu trả lời là dời về sau.

Bản đồng bộ **không** được giữ lại dưới tên khác. Một API bảo mật có hai cửa, một
cửa đúng một cửa sai, thì cửa sai sẽ được ai đó dùng.

### 2.2. Ba kết cục, không phải hai

`{ daKy: boolean }` không đủ. Mục 4.3 đòi đích danh: *"Hết hạn chờ signer không
chứng minh ví đã hủy ký"*.

| `ketCuc` | Nghĩa | Được gửi lên chuỗi? |
|---|---|---|
| `da_ky` | signer resolve, message khớp | có |
| `tu_choi` | signer reject — ví nói không | không |
| `chua_ro` | timeout/disconnect — **không biết ví đã ký hay chưa** | không, và không thử lại |

`chua_ro` là trạng thái quan trọng nhất và là thứ bản cũ không có. Một ví mất kết
nối giữa chừng có thể đã ký rồi; gọi đó là "chưa ký" rồi ký lại là tạo ra hai chữ
ký cho cùng một ý định.

`daKy` vẫn còn, bằng `ketCuc === "da_ky"` — consumer cũ đọc trường đó vẫn đúng.

### 2.3. Phiên ký dùng MỘT LẦN

Khoá đặt **đồng bộ, trước await** — nếu đặt sau await thì hai lời gọi liên tiếp đều
lọt qua trước khi khoá kịp bật. Đó chính là lỗi C.

Khoá gắn với `neo` (một object cho một lượt kiểm), không gắn với module: hai giao
dịch khác nhau phải ký được song song.

Đã tiêu thì **không tự mở lại**. Người dùng muốn thử lại thì kiểm lại — lượt kiểm
mới, neo mới. Không có đường nào trong code đặt `daTieu = false`.

### 2.4. Đối chiếu message sau khi signer trả về

Mục 4.3: *"Đối chiếu message trả về sau signer; nếu khác snapshot, không chuyển tiếp
để gửi"*. Signer có thể trả một transaction khác với thứ đưa vào. Nếu bytes khác
snapshot đã kiểm ⇒ `ketCuc: "chua_ro"`, không phải `da_ky`.

### 2.5. Reject muộn không được làm sập ai

Mọi promise của signer đều gắn `.catch(() => {})` ngay khi tạo, kể cả nhánh đã
timeout. Kết quả về muộn bị **bỏ**, không cập nhật gì, không mở lại consent.

## 3 · Những gì ADR này KHÔNG làm

- **Không** thêm quyền gửi giao dịch cho core. `kySauKhiKiem` vẫn chỉ gọi signer do
  ví cung cấp; không có `sendTransaction` ở bất kỳ đâu.
- **Không** tự thử lại khi `chua_ro`. Thử lại là quyết định của ví và người dùng.
- **Không** hứa cưỡng chế được consumer cố tình bỏ qua. Một ví tự gọi thẳng signer
  thì SDK không chặn nổi — tài liệu phải nói ranh giới đó, không giả vờ có nó.
- **Không** đổi `inspect()`, `neoKetQua()`, `khopNeo()`, `quaCu()`. Hợp đồng
  `InspectResult` giữ nguyên; mọi mở rộng của CU-01 đi bằng trường tuỳ chọn.

## 4 · Kiểm chứng

Mỗi lỗ hổng có một bài test tái hiện đúng ca đã ghi ở mục 1, và bài đó phải **đỏ
khi khôi phục mã cũ**. Guard chỉ xanh thì không chứng minh gì.

Đối chứng bắt buộc: signer resolve bình thường vẫn cho `da_ky` — sửa bốn chiều sai
không được biến hàm thành "luôn từ chối", vì như thế cũng xanh hết mọi bài trên.
