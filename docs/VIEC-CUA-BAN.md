# Việc của đội — những thứ Claude không làm thay được

Cập nhật **30/08/2026**. Còn **5 ngày** tới mốc kỷ luật tự đặt 04/09, 6 ngày tới giờ thi.

Mỗi việc dưới đây đều là thứ **chỉ người thật làm được**: nói chuyện với người thật,
quay màn hình thật, đứng nói thật. Xếp theo **điểm đổi được**, không theo độ dễ.

---

## Bảng tổng — in ra dán lên tường

| # | Việc | Ai | Thời gian | Hạn | Đổi được |
|---|---|---|---|---|---|
| 1 | Nộp form BTC | 1 người | 15 phút | **Càng sớm càng tốt** | Bắt buộc, thiếu là không được xếp lịch |
| 2 | Phỏng vấn **3 người** — phiếu ở `docs/PHIEU-PHONG-VAN.md` | cả 4 | 15 phút | 03/09 | ~+0,4 |
| 3 | Nhắn ví/dApp hỏi định giá | 1 người | 1 tối | 31/08 | ~7 điểm |
| 4 | RPC key riêng | 1 người | 10 phút | Trước 04/09 | Chống demo chết |
| 5 | Quay video 60–90 giây | 2 người | 2 tiếng | 03/09 | Bắt buộc nộp |
| 6 | Dựng slide từ nội dung Claude soạn | 1 người | 3 tiếng | 02/09 | ~11 điểm |
| 7 | Tập pitch 5 lần | Cả 4 | 2 tiếng | 04/09 | Nằm trong #6 |
| 8 | Commit mỗi ngày | Cả 4 | 5 phút/ngày | Hàng ngày | Thể lệ yêu cầu |

> **Vì sao #2, #3, #6 đáng nhiều điểm hơn code:** rubric track Best Product & Business
> chia 25 % bài toán thị trường · 30 % demo · 25 % mô hình kinh doanh · 20 % trình bày.
> Phần code chỉ nằm trong 30 %, và nó đã ~95 %. Ba việc kia đang ở 25–50 %.

---

## 1 · Nộp form BTC — làm ngay tối nay

**Link:** form "UniHackfest 2026 × VLU — Project Idea & Progress Submission"

Nội dung điền đã soạn sẵn ở đoạn chat trước (bản tiếng Anh). Copy thẳng vào.

**Chỉ còn thiếu 3 thứ bạn phải tự điền:**

- Tên 3 thành viên còn lại (ô *Team Members*)
- Email đại diện (ô *Email* thứ hai)
- Xác nhận lại các ô chọn:

| Ô | Chọn |
|---|---|
| Competition Track | **Best Product & Business** |
| Product Theme | **AI × Web3** |
| Current Progress | **Working demo / Devnet deployment** |
| What would you like mentors to give feedback on | **Business Model** |

**Demo / Repository / Design Link** — dán cả ba dòng:

```
Demo: https://neitln.github.io/Custos-Solana/
Trang lừa đảo giả: https://neitln.github.io/Custos-Solana/tan-cong/
Repo: https://github.com/NeitLN/Custos-Solana
```

---

## 2 · Phỏng vấn người dùng

**Trạng thái 25/08: mở lại ở quy mô nhỏ.** Mốc dùng được là **3 người**, không cần 5.

| Cần gì | Ở đâu |
|---|---|
| Phiếu cầm theo lúc hỏi | `docs/PHIEU-PHONG-VAN.md` |
| Biên bản trống để điền | `docs/BIEN-BAN-PHONG-VAN.md` |
| Vì sao làm như vậy | `docs/GIAO-THUC-PHONG-VAN.md` — đọc một lần |
| Trang đo | https://neitln.github.io/Custos-Solana/phong-van.html |
| Nếu cuối cùng không kịp | `docs/ket-qua-phong-van.md` — câu trả lời sân khấu đã soạn |

Con số công bố: **ĐÚNG / TỔNG** và **VẪN KÝ / TỔNG**. "MỘT PHẦN" không gộp vào "ĐÚNG".

---

## 3 · Nhắn ví/dApp hỏi định giá

`CUSTOS.md` mục 08 tự nhận định giá là **giả thuyết chưa validate**. Đây là 25 % rubric.

### Nhắn cho ai

| Ưu tiên | Đối tượng | Vì sao |
|---|---|---|
| **1** | **Privy** (privy.io) | Nền tảng ví nhúng, **có hỗ trợ Solana**, đúng nhóm khách hàng ③ trong `CUSTOS.md` mục 02 |
| 2 | Ví/dApp Solana có người dùng Việt | Khách hàng nhóm ① và ② |
| 3 | Cộng đồng Superteam Vietnam | Nơi tập trung dev Solana Việt |

Cần **3–5 câu trả lời**, không cần nhiều.

### Tin nhắn mẫu

> Chào anh/chị, bên em đang làm **Custos** — SDK kiểm tra giao dịch Solana trước khi
> người dùng ký, giải thích hậu quả bằng tiếng Việt.
>
> Demo devnet: https://neitln.github.io/Custos-Solana/
>
> Em **không chào bán**, chỉ xin 5 phút hỏi 3 câu để hiểu thị trường:
>
> 1. Ví/dApp bên mình hiện xử lý thế nào khi người dùng sắp ký một giao dịch lạ?
> 2. Nếu có một lớp kiểm tra cắm vào bằng một dòng code, bên mình quan tâm nhất
>    điều gì — độ chính xác, độ trễ, hay giá?
> 3. Với dịch vụ như vậy, mức giá nào bên mình thấy hợp lý để bắt đầu thử?

**Ghi nguyên văn câu trả lời.** Ba câu trả lời thật đổi mục 08 từ "giả thuyết" thành
"có dữ liệu".

### Neo giá đã tra sẵn, dùng khi họ hỏi ngược

Nếu họ hỏi *"bên em định bán bao nhiêu?"* — đừng bịa số. Nói:

> "Bên em chưa chốt giá, đang đi hỏi để biết. Tham chiếu thì Helius và QuickNode —
> hạ tầng Solana bên mình chắc đang dùng — đều đặt tầng trả tiền đầu tiên ở
> **$49 một tháng**."

---

## 4 · RPC key riêng — chống demo chết trên sân khấu

Demo đang dùng endpoint công khai `api.mainnet-beta.solana.com` và
`api.devnet.solana.com`. Trong lúc build, Claude bị chặn tốc độ (`429 Too Many
Requests`) **hàng chục lần**.

**Nếu nó chặn đúng lúc bạn đang demo, demo đứng hình.**

> **Đo ngày 31/08 (8 lượt, endpoint công cộng devnet):** median **973ms** (~1 giây,
> rất nhanh), nhưng **p95 9,2 giây** — vì MỘT lượt dính `429` rồi backoff
> 0,5→1→2→4s. Độ trễ 18-20s mà người xem thấy KHÔNG phải Custos chậm; là endpoint
> công cộng chặn tốc độ. RPC riêng bỏ hẳn cái đuôi này — median giữ ~1s, không còn
> spike. Đây là lý do việc này đáng làm, kèm số cụ thể để nói trên sân khấu.

### Lấy key — 10 phút

1. Đăng ký tài khoản miễn phí tại **helius.dev** (gói Free có sẵn, không cần thẻ)
2. Tạo API key cho **Solana Devnet** — demo chạy devnet
3. Lấy URL dạng `https://devnet.helius-rpc.com/?api-key=...`

> Gói trả tiền đầu tiên là **$49/tháng — 10 triệu credit**. Bạn **không cần trả tiền**
> cho buổi thi; gói Free đã hơn đủ. Con số $49 xuất hiện ở đây vì nó là **neo giá**
> dùng khi nhắn ví/dApp (mục 3) và trong `docs/DON-VI-KINH-TE.md`.

### Đặt vào đâu — ⚠️ ĐỌC KỸ, chỗ này có một cái bẫy thật

Khoá Helius nằm **trong chính URL**. Nghĩa là bất kỳ chỗ nào ghi URL đó ra file là
công khai khoá. Có đúng **một** chỗ đúng:

```
apps/demo-wallet/.env.development.local
```

Nội dung một dòng:

```
VITE_RPC=https://devnet.helius-rpc.com/?api-key=...
```

Rồi chạy ví mẫu **trên máy bạn** lúc demo:

```
npm run vi
```

### Ba chỗ KHÔNG được đặt

| Chỗ | Chuyện gì xảy ra |
|---|---|
| `.env.local` | Vite nạp file này ở **mọi** chế độ, kể cả `build` → khoá bị nhúng vào JS đẩy lên GitHub Pages |
| `$env:CUSTOS_RPC` rồi chạy `npm run hien-truong` | Biến đó **từng** bị ghi thẳng vào `apps/demo-wallet/public/hien-truong.json` — file được commit và deploy công khai |
| Dán thẳng vào code | Khỏi bàn |

> **Hướng dẫn cũ ở chính mục này bảo đặt `$env:CUSTOS_RPC`.** Đó là hàng thứ hai
> trong bảng trên — làm đúng lời khuyên cũ là rò khoá. Đã sửa cả hướng dẫn lẫn code
> ngày 30/08.

### Ba lớp chặn đã dựng sẵn trong repo

Bạn không phải nhớ những điều trên — code đã tự chặn:

| Lớp | Ở đâu | Chặn gì |
|---|---|---|
| 1 | `scripts/dung-hien-truong.ts` | Lọc phần query khỏi URL trước khi ghi bản công khai. Bản đầy đủ chỉ nằm ở `.devnet/` (đã gitignore) |
| 2 | `apps/demo-wallet/src/hienTruong.ts` — `chonRpc()` | `VITE_RPC` chỉ đọc ở chế độ dev. Đã thử: đặt key vào `.env.production.local` rồi build → **không** lọt vào `dist/` |
| 3 | `scripts/soi-ro-ri-khoa.mjs` | Bắt `api-key=` trong URL, `sk-ant-…`, và URL có mật khẩu. Chạy trong CI trước mỗi lần deploy, và **không in giá trị khoá ra log** |

**Bản deploy công khai vẫn dùng endpoint công cộng, cố ý.** Người lạ xem demo không
nên tiêu hạn mức của đội. Key này để **máy bạn** dùng lúc demo.

## 5 · Quay video demo 60–90 giây

Thể lệ: *"quay màn hình thao tác live, **không dùng mockup dàn dựng**"*.

### Kịch bản (Claude sẽ soạn chi tiết cùng deck, đây là khung)

| Giây | Cảnh |
|---|---|
| 0–10 | Mở trang lừa đảo giả, bấm "Nhận thưởng ngay" |
| 10–25 | Ví mở ra, Custos chạy — quay cả lúc chờ, **đừng cắt** |
| 25–50 | Màn cảnh báo: đọc to câu mức Ngắn, chỉ vào bảng chênh lệch |
| 50–70 | Chỉ vào dòng "Đã đọc hiểu 2 trên 3 lệnh" — đây là trục khác biệt |
| 70–90 | Bấm "Huỷ giao dịch" |

### Lưu ý kỹ thuật

- **Không tua nhanh, không cắt đoạn chờ.** Giám khảo cần thấy nó chạy thật.
- Quay ở độ phân giải đọc được chữ trên máy chiếu.
- Có tiếng nói giải thích, hoặc phụ đề tiếng Việt.
- **Quay ít nhất 2 lần**, giữ bản dự phòng.

---

## 6 · Slide và tập pitch

Claude soạn **nội dung** 8–10 slide. Bạn dựng slide và tập.

### Một chỗ Claude không điền được

Slide *"người dùng có hiểu không"* sẽ để trống `__/12`. **Chỉ dữ liệu phỏng vấn thật
mới điền được.** Đó là lý do việc #2 phải xong trước 31/08.

### Tập 5 lần, có người đóng vai giám khảo

`PITCH-VA-PHAN-BIEN.md` có sẵn **9 câu hỏi khó kèm câu trả lời**. Bắt một bạn đọc
câu hỏi, người pitch trả lời trong 20 giây.

Bốn câu chắc chắn bị hỏi:

1. *"Phantom đã có rồi mà?"*
2. *"AI ở đây có gì hơn template?"*
3. *"Mẫu an toàn của các bạn lấy từ đâu?"*
4. *"Ai trả tiền, và bao nhiêu?"*

Và đọc kỹ mục **"Những câu không được nói"** trong file đó.

---

## 7 · Commit mỗi ngày

Thể lệ: *"repo public có lịch sử commit thể hiện quá trình build thật"*.

Hiện có 8 commit ngày 21/08, 5 commit ngày 22/08. **Từ giờ mỗi ngày ít nhất một
commit**, kể cả commit nhỏ như thêm kết quả phỏng vấn.

**Đừng sửa ngày commit cũ** — đó là dựng bằng chứng giả, và git log lộ ngay.

---

## Lịch 5 ngày còn lại

| Ngày | Việc | Ai |
|---|---|---|
| **30/08 tối** | #4 lấy RPC key — **thêm một dòng** `VITE_RPC=` vào `apps/demo-wallet/.env.development.local` đã có sẵn. **Đừng tạo file mới**, `VITE_DEMO_SECRET` đang nằm trong đó | 1 người, 10 phút |
| **31/08** | #5 **quay video** — chọn **Bản A** (ký thật). Khoá ký đã có, hiện trường còn 500 token. Quay ít nhất 2 lần, chạy lại `npm run hien-truong` sau mỗi lần | 2 người |
| 01–02/09 | #6 dựng slide từ `docs/nop-bai/CUSTOS-PITCH.pptx` | 1 người |
| 02/09 | Dựng lại hiện trường + kiểm số dư lần cuối, đo lại cohort | Claude |
| 03/09 | #7 tập pitch 5 lần, có người đóng vai giám khảo | Cả 4 |
| **04/09** | **NỘP HỒ SƠ** — đóng băng code | Cả 4 |
| 05/09 | 08:00 thi. Chỉ kiểm thiết bị, **không sửa code** | Cả 4 |

> **#2 phỏng vấn và #3 hỏi giá không nằm trong lịch này** vì đội đã nói không làm được.
> Chúng vẫn là hai ô trống lớn nhất của bài — câu trả lời cho sân khấu đã soạn ở
> `docs/ket-qua-phong-van.md`. Nếu bất ngờ có 30 phút rảnh, **3 người bạn cùng phòng
> trong một buổi tối** là đủ để lấp ô thứ nhất.

---

## Nếu chỉ làm được một việc

**Nhắn 12 người hẹn phỏng vấn.** Phỏng vấn ăn thời gian lịch, không nén được vào
ngày cuối. Mọi việc khác đều dồn được, việc này thì không.
