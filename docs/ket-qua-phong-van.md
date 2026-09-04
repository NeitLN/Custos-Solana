# Nghiên cứu người dùng — ĐANG MỞ LẠI (25/08)

**Trạng thái: đội đã lấy phiếu đi hỏi.** Chưa có kết quả.

> Sáng 25/08 đội quyết định bỏ vì không đủ thời gian; cùng ngày quyết định làm lại ở quy mô
> nhỏ. Phiếu đi hỏi: `docs/PHIEU-PHONG-VAN.md`.
>
> **Mốc tối thiểu dùng được là 3 người.** Không cần đủ 5, và càng không cần 12.

Phần dưới giữ nguyên — nó là phương án nếu cuối cùng vẫn không kịp.

Bộ đồ nghề vẫn nằm trong repo (`/phong-van.html`, `docs/GIAO-THUC-PHONG-VAN.md`,
`scripts/kiem-phong-van.ts`) — dùng được sau cuộc thi.

---

## Ảnh hưởng, nói thẳng

Tiêu chí *"Độ rõ ràng của bài toán thị trường và người dùng mục tiêu"* chiếm **25 %**
rubric. Thiếu bằng chứng người dùng thì ô đó đứng ở khoảng **6,5/10** thay vì 8,5.
Trần tổng của bài thi vì thế còn khoảng **7,7** thay vì 8,3.

Đây là đánh đổi có ý thức, không phải sơ suất. Phần còn lại của bài dồn vào hai ô
**demo (30 %)** và **trình bày (20 %)** — nơi đội đang mạnh nhất.

> Phỏng vấn **không** nằm trong 5 hạng mục nộp bài bắt buộc. Thiếu nó thì mất điểm ở
> một tiêu chí; thiếu video hay form đăng ký thì **hồ sơ có thể bị loại**. Ưu tiên đã
> xếp đúng thứ tự đó.

---

## Câu trả lời trên sân khấu — học thuộc

Câu này **chắc chắn bị hỏi**. Trả lời vòng vo là mất nhiều hơn mất điểm.

> *"Chưa. Bọn em chưa phỏng vấn người dùng nào, và đó là khoảng trống lớn nhất của
> dự án.*
>
> *Bọn em biết nó nằm ở đâu: bộ đo đã dựng sẵn ở `/phong-van.html`, giao thức đã
> viết, chỉ chưa chạy kịp trước hạn.*
>
> *Thứ bọn em có là loại bằng chứng khác — bọn em đo trên **giao dịch mainnet thật**
> chứ không đo trên mẫu tự dựng. Và chính phép đo đó bắt được sản phẩm của bọn em
> báo Đỏ nhầm một giao dịch DeFi bình thường, mười ngày trước hôm nay."*

### Vì sao câu này đứng được

Ba phần, mỗi phần làm một việc:

| Phần | Làm gì |
|---|---|
| *"Chưa"* — nói ngay, không rào trước | Thừa nhận thẳng thì giám khảo thôi đào; vòng vo thì họ đào tiếp |
| *"Bọn em biết nó nằm ở đâu"* | Chuyển từ **thiếu sót** sang **đã nhận diện** — và có công cụ để chứng minh, không phải lời hứa |
| *"Thứ bọn em có là loại bằng chứng khác"* | Đổi trục sang chỗ mạnh: đo trên lưu lượng thật, và **tự bắt lỗi của chính mình** |

**Tuyệt đối không nói:**

| Đừng | Vì sao |
|---|---|
| *"Bọn em có hỏi vài người bạn…"* | Không có biên bản thì không đếm được, và nghe như đang chống chế |
| *"Không kịp vì bận code"* | Biến thiếu sót thành lời than |
| Im lặng rồi chuyển chủ đề | Giám khảo nhận ra ngay, và sẽ hỏi lại |

---

## Không được làm

Không dựng biên bản phỏng vấn từ dữ liệu mô phỏng, role-play, hay trí nhớ không có
ghi chép. Thể lệ: *trình bày sai về dữ liệu bị trừ điểm hoặc loại* — và một con số
bịa kéo theo cả những con số thật xuống cùng.

Repo này đã hai lần nhận dữ liệu phỏng vấn do AI sinh và **từ chối cả hai lần**. Giữ
nguyên như vậy.

---

## Nhập kết quả thật — bốn bước

Trang `/phong-van.html` giữ dữ liệu trong `localStorage` của **chính máy người phỏng
vấn**. Không có backend, không gửi đi đâu. Muốn nó thành con số dùng được thì phải
đưa ra file:

```bash
# 1. Trên máy đã phỏng vấn: bấm "Sao chép toàn bộ (JSON)" ở cuối /phong-van.html
# 2. Dán vào file này (tạo mới nếu chưa có):
#      data/seed/phong-van.json
# 3. Đếm và soi:
node --experimental-strip-types scripts/kiem-phong-van.ts
# 4. Đọc phần cảnh báo, sửa những chỗ nó nêu, chạy lại.
```

Định dạng xem ở `data/seed/phong-van.example.json`. File ví dụ mang cờ
`"laViDu": true`; script **từ chối in con số sân khấu** cho bất kỳ file nào có cờ đó,
nên không thể vô tình lấy số minh hoạ đưa vào deck.

### Bốn quy tắc script sẽ canh giúp

| Quy tắc | Vì sao |
|---|---|
| **Không ghi tên, email, số điện thoại** | File này vào repo công khai, và lịch sử git không gỡ lại được. Dùng mã `P1`, `P2`… Script quét và cảnh báo |
| **Công bố `x/n`, không chỉ phần trăm** | Với n nhỏ, phần trăm làm mẫu số biến mất — "67 %" nghe như đo trên trăm người trong khi thật ra là 2/3 |
| **Không gộp "một phần" vào "đúng"** | Cách dễ nhất để một con số xấu trông đẹp lên, và là điều đầu tiên giám khảo hỏi lại |
| **Giữ nguyên người hiểu đúng mà vẫn ký** | Đó là phát hiện quan trọng nhất của cả đợt, không phải dữ liệu xấu cần giấu |

**Chưa có dữ liệu thì không công bố tỉ lệ nào.** Ghi "chưa đo" — thiếu bằng chứng là
một trạng thái nói ra được; bịa thì không.
