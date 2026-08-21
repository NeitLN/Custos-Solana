# Đặc tả L3 — diễn giải và toàn bộ chữ tiếng Việt

**Chủ sở hữu: vai C** (`packages/ai`) · vai A đọc mục 2 · vai D đọc mục 6

Đây là lớp người dùng thật sự nhìn thấy. Engine luật có đúng đến mấy mà câu chữ không ai hiểu thì sản phẩm vẫn thất bại — đúng nghĩa đen, vì mục đích duy nhất của nó là làm người dùng hiểu kịp trước khi bấm ký.

---

## 1 · Bốn nguyên tắc viết

### 1.1 Gọi tên hậu quả, không gọi tên cơ chế

| ❌ Không viết | ✅ Viết |
|---|---|
| "Giao dịch gọi `SetAuthority` với `authorityType = AccountOwner`" | "Tài khoản USDC của bạn sẽ đổi chủ. Bạn không rút được nữa" |
| "Cấp `delegate` với `delegatedAmount` là `u64::MAX`" | "Ví này sẽ được phép rút USDC của bạn, không giới hạn, bất cứ lúc nào" |
| "Mint có `freezeAuthority` chưa `null`" | "Người phát hành token này có thể khoá tài khoản của bạn bất cứ lúc nào" |

Người dùng không cần biết instruction tên gì. Họ cần biết **sau khi bấm ký thì mất gì**.

### 1.2 Số tiền đứng trước

Người ta đọc con số trước tiên. Đặt nó ở đầu câu.

> ❌ "Quyền sở hữu tài khoản token của bạn sẽ được chuyển, và 500 USDC cũng sẽ bị chuyển đi."
> ✅ "**500 USDC** của bạn sẽ chuyển sang ví lạ, và tài khoản USDC cũng đổi chủ luôn."

### 1.3 Chắc thì nói chắc, không chắc thì nói thẳng là không biết

Đây là lớp mô phỏng — nhiều thứ là **sự thật đo được**, không phải phỏng đoán. Đừng làm nhẹ đi bằng "có thể".

| Tình huống | Cách nói |
|---|---|
| Đo được từ mô phỏng | "Bạn **sẽ** mất 500 USDC" |
| Là năng lực, chưa xảy ra | "Người phát hành **có quyền** đóng băng tài khoản này" |
| Không xác định được | "Chúng tôi **không biết** chương trình này làm gì" |

Câu *"chúng tôi không biết"* là câu **bắt buộc phải có** trong từ vựng của sản phẩm. Nó là trục khác biệt (xem `PITCH-VA-PHAN-BIEN.md` mục 0), không phải điểm yếu.

### 1.4 Không doạ, không kêu gọi

Không dùng dấu chấm than. Không viết "CẢNH BÁO NGUY HIỂM!!!". Verdict màu đỏ đã làm việc đó rồi. Chữ thì bình tĩnh và cụ thể — người đang hoảng sẽ bấm bừa.

Và tuyệt đối không có câu nào mang tính khuyên đầu tư.

---

## 2 · Hợp đồng với L2

```ts
function interpret(facts: Facts, reasonCodes: string[], locale: "vi"): {
  detectedPrimaryAction: { type: string; from?: string; to?: string } | null;
  explanation: string;
  aiAdvisory: "review_required" | null;
}
```

**`level` không có trong kiểu trả về.** Ranh giới được cưỡng chế bằng kiểu dữ liệu chứ không bằng lời dặn — xem `DAC-TA-CORE.md` mục 5.

**L3 không bao giờ nhận giao dịch thô.** Chỉ `Facts` và `reasonCodes`. Mô hình không suy diễn được về thứ nó không được nhìn.

---

## 3 · Prompt

### 3.1 Khung system prompt

```
Bạn viết lời giải thích tiếng Việt cho người Việt mới dùng crypto,
về hậu quả của một giao dịch Solana mà họ SẮP KÝ.

Đầu vào: một đối tượng JSON gồm các dữ kiện đã đo được từ mô phỏng,
và danh sách mã lý do do engine luật sinh ra.

RÀNG BUỘC — vi phạm là lỗi nghiêm trọng:
1. Chỉ được nói về những gì có trong JSON đầu vào.
   Không suy diễn, không bổ sung kiến thức bên ngoài.
2. Không được kết luận giao dịch an toàn hay nguy hiểm.
   Việc đó do engine luật quyết, không phải việc của bạn.
3. Gặp chương trình chưa xác minh: KHÔNG đoán chức năng của nó.
   Chỉ mô tả thay đổi đo được, và nói rõ phần không xác định được.
4. Không chắc hành động chính là gì thì trả về null. Không đoán.
5. Không dùng dấu chấm than. Không khuyên mua bán bất cứ thứ gì.
6. Gọi tên hậu quả, không gọi tên instruction.
7. Số tiền đặt ở đầu câu.

Trả về đúng JSON theo schema, không kèm giải thích nào khác.
```

### 3.2 Schema đầu ra

```jsonc
{
  "detectedPrimaryAction": { "type": "swap", "from": "SOL", "to": "USDC" },  // hoặc null
  "explanation": "…",
  "aiAdvisory": "review_required"   // hoặc null
}
```

### 3.3 Khi nào phát `aiAdvisory`

| Tình huống | `aiAdvisory` |
|---|---|
| Có hậu quả không phục vụ hành động chính được nhận diện | `review_required` |
| `expectedAction` do ví/dApp cung cấp **lệch** với `detectedPrimaryAction` | `review_required` |
| `expectedAction` **khớp** | `null` — **không** tắt cảnh báo nào. dApp độc hại khai đúng được |
| Không nhận diện được hành động chính | `review_required` |
| Mọi thứ bình thường | `null` |

---

## 4 · Từ vựng — chốt một lần, dùng thống nhất

Đây là chỗ dễ vỡ nhất: bốn người cùng viết chữ thì sẽ có bốn cách gọi cho một khái niệm.

| Khái niệm | Dùng | Không dùng |
|---|---|---|
| instruction | **lệnh** *("giao dịch này gồm 11 lệnh")* | "chỉ thị", "instruction" |
| program | **chương trình** | "program", "hợp đồng thông minh" |
| token account | **tài khoản token** | "ví token" |
| `TokenAccount.owner` đổi | **đổi chủ tài khoản token** | "chuyển authority" |
| delegate | **được phép rút** | "uỷ quyền", "delegate" |
| mint authority | **quyền phát hành thêm** | "quyền mint" |
| freeze authority | **quyền khoá tài khoản** | "quyền đóng băng" |
| permanent delegate | **quyền rút vĩnh viễn của bên phát hành** | "PD", "delegate vĩnh viễn" |
| transfer hook | **chương trình kiểm soát việc chuyển token** | "hook" |
| simulate | **chạy thử** | "mô phỏng" *(dùng trong tài liệu được, trên giao diện thì không)* |
| coverage | **đã đọc hiểu N trên M lệnh** | "độ bao phủ", "coverage" |
| swap | **hoán đổi** | *(giữ "swap" cũng được — người dùng crypto Việt quen từ này)* |
| verdict Đỏ / Vàng / Xanh | **Nguy hiểm / Cần xem kỹ / Bình thường** | "an toàn" ⚠️ |

> ⚠️ **Không bao giờ dùng chữ "an toàn" cho verdict Xanh.** Sản phẩm không có thẩm quyền tuyên bố một giao dịch an toàn — nó chỉ nói *không tìm thấy dấu hiệu nào trong danh sách nó biết kiểm tra*. Dùng **"Bình thường"**.
>
> Đây không phải chuyện chữ nghĩa. Nói "an toàn" rồi người dùng mất tiền là một vấn đề trách nhiệm.
>
> **Không đụng vào hợp đồng kiểu dữ liệu.** Giá trị trong code vẫn là `level: "safe" | "warning" | "danger"` — đóng băng như đã chốt. Đây chỉ là **nhãn hiển thị** tiếng Việt tương ứng.

---

## 5 · Câu mẫu cứng — bản dự phòng khi AI hỏng

Khi gọi mô hình lỗi hoặc quá thời gian, hệ thống rơi về các câu này, ghép theo `reasonCodes`. **Verdict không đổi, người dùng vẫn được bảo vệ.**

Vai C viết tay toàn bộ bảng này **trước** khi động vào prompt — vì đây là thứ chạy khi mọi thứ khác hỏng.

| Mã lý do | Câu mẫu |
|---|---|
| `SPL_SET_AUTHORITY__ACCOUNT_OWNER` | "Tài khoản {token} của bạn sẽ đổi chủ sang ví {địa chỉ}. Bạn sẽ không điều khiển được nó nữa." |
| `SPL_SET_AUTHORITY__CLOSE_OR_FREEZE` | "Ví {địa chỉ} sẽ được quyền đóng hoặc khoá tài khoản {token} của bạn." |
| `SPL_APPROVE_DELEGATE_LON` | "Ví {địa chỉ} sẽ được phép rút {số lượng} {token} của bạn, bất cứ lúc nào, kể cả nhiều tháng sau." |
| `SYSTEM_ASSIGN_DOI_OWNER` | "Một tài khoản của bạn sẽ chuyển sang thuộc quyền điều khiển của chương trình {địa chỉ}." |
| `OUTFLOW_KHONG_KHOP` | "{Số lượng} {token} rời khỏi ví bạn mà giao dịch không có phần nào trả lại." |
| `TOKEN2022_PERMANENT_DELEGATE` | "Bên phát hành {token} giữ quyền rút token này khỏi ví bất kỳ, vĩnh viễn. Đây là tính năng hợp lệ, nhưng bạn nên biết." |
| `MINT_AUTHORITY_CHUA_THU_HOI` | "Người phát hành {token} vẫn có thể tạo thêm token này không giới hạn." |
| `PROGRAM_CHUA_XAC_MINH` | "Giao dịch gọi một chương trình chúng tôi chưa xác minh. Chúng tôi không biết nó làm gì." |
| `VI_NHAN_MOI_TAO` | "Ví nhận vừa được tạo cách đây {thời gian}." |

**Câu chữ ký của sản phẩm**, luôn hiện dưới cùng, không bao giờ do AI sinh ra:

> **Đã đọc hiểu {N} trên {M} lệnh.** {Nếu có: "{K} chương trình chưa xác minh."}

Câu này là trục khác biệt. Nó phải cố định, chính xác, và do code sinh — không để mô hình viết lại mỗi lần một kiểu.

---

## 6 · Ba mức diễn đạt

Tính năng "điều chỉnh theo trình độ người dùng" trong `CUSTOS.md` mục 04.

**Ví dụ trên cùng một giao dịch** — swap kèm hai hành động lạ:

**Mức 1 — Ngắn** *(mặc định, hiện ngay)*
> 500 USDC của bạn sẽ chuyển sang ví lạ, và tài khoản USDC cũng đổi chủ luôn.

**Mức 2 — Đủ** *(bấm "Xem chi tiết")*
> Hành động chính được nhận diện: hoán đổi SOL sang USDC.
> Nhưng giao dịch còn làm hai việc không phục vụ việc hoán đổi: chuyển 500 USDC sang ví `9xQe…7Tm2`, và đổi chủ tài khoản USDC của bạn sang chính ví đó. Sau khi ký, bạn không lấy lại được.
> Giao dịch cũng gọi một chương trình chúng tôi chưa xác minh. Chúng tôi không biết nó làm gì.
> Đã đọc hiểu 10 trên 11 lệnh.

**Mức 3 — Kỹ thuật** *(bấm "Chi tiết kỹ thuật")*
> Lệnh #7: `SetAuthority(AccountOwner)` trên ATA `8xR…` → `9xQe…7Tm2`
> Lệnh #9: `Transfer` 500.000000 → `9xQe…7Tm2`
> Lệnh #4: program `MemoSq4…` — chưa xác minh, không decode
> Mã lý do: `SPL_SET_AUTHORITY__ACCOUNT_OWNER`, `SPL_TRANSFER_NGOAI_HANH_DONG_CHINH`, `PROGRAM_CHUA_XAC_MINH`

> **Nếu thiếu thời gian, cắt mức 3 trước, không cắt mức 2.** Mức 2 là mức chứa câu chuyện sản phẩm; mức 3 chỉ để trấn an người có kinh nghiệm.

---

## 7 · Đo xem người ta có hiểu không — vai D

12 cuộc phỏng vấn người dùng trong kế hoạch **không phải để hỏi cảm nhận**. Chúng là bài kiểm tra hiểu, và kết quả là con số đưa lên sân khấu.

**Cách làm — mỗi người 5 phút:**

1. Chiếu màn cảnh báo Mức 1. Không giải thích gì thêm.
2. Hỏi đúng một câu: **"Nếu bạn bấm ký, chuyện gì xảy ra?"**
3. Chấm: **Đúng** (nêu được mất tiền hoặc mất quyền kiểm soát) · **Sai** · **Không chắc**
4. Hỏi tiếp: *"Bạn sẽ bấm gì?"* → Huỷ / Ký / Không biết
5. Ghi lại **nguyên văn** câu họ nói. Câu người dùng tự nói ra thường tốt hơn câu đội tự nghĩ

**Con số công bố:**
> *"12 người được xem màn cảnh báo, không giải thích gì thêm. X người nói đúng chuyện gì sẽ xảy ra."*

Nếu X thấp thì **sửa câu chữ, rồi đo lại** — đó chính là vòng lặp tạo ra dữ liệu ở `CUSTOS.md` mục 09. Và nếu đến ngày 5/9 X vẫn thấp thì **đọc đúng số đó**. Một con số thật kèm câu "chúng tôi đang sửa" đáng tin hơn một con số đẹp không ai kiểm chứng được.

---

## 8 · Thứ tự làm của vai C

| Ngày | Việc | Xong khi |
|---|---|---|
| 22/8 | Chốt bảng từ vựng mục 4. Viết tay toàn bộ câu mẫu mục 5 | Có bản dự phòng chạy được **trước khi** có AI |
| 23/8 | Ghép câu mẫu vào 3 file mock của vai A | Giao diện của B có chữ thật |
| 24–25/8 | Prompt v1, chạy trên `Facts` mẫu, chỉnh tới khi ra JSON đúng schema | Nhận diện được hành động chính |
| 26/8 | `aiAdvisory` + quy tắc bất đối xứng `expectedAction` | Đủ hợp đồng với L2 |
| 27/8 | Đường rơi về câu mẫu khi lỗi/timeout | **Rút mạng thử — sản phẩm vẫn phải chạy** |
| 28/8 | Ba mức diễn đạt | Mức 1 và 2 xong |
| 29–30/8 | Chỉnh chữ theo kết quả phỏng vấn của D | Khoá nội dung |

> Viết câu mẫu **trước** prompt là có chủ đích: nó buộc phải nghĩ rõ cần nói gì trước khi để mô hình nói hộ. Và nó là thứ duy nhất còn chạy khi mọi thứ khác hỏng — kể cả lúc mất mạng giữa buổi demo.
