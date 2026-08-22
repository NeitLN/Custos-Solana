# Giao thức phỏng vấn người dùng — bản đi hỏi người thật

**Công cụ:** https://neitln.github.io/Custos-Solana/phong-van.html
**Mẫu cần:** 12 người · **6 chưa từng dùng crypto** · **6 đã dùng dưới 12 tháng**
**Hạn:** 31/08/2026 · **Ai làm:** cả 4 người, mỗi người 3 cuộc

---

## 0 · Nguồn gốc tài liệu này — đọc trước

Bộ câu hỏi và khung mã hoá dưới đây lấy từ một **kịch bản mô phỏng do AI sinh**
(`phong-van-gia-lap-custos.md`). Chính file đó ghi rõ ở dòng đầu:

> *"Toàn bộ nội dung trong file này là dữ liệu mô phỏng do AI tạo... **không phải**
> lời khai của người tham gia hoặc doanh nghiệp thật. Không đưa các con số, câu
> trích dẫn hay phản hồi dưới đây vào báo cáo, hồ sơ dự thi hoặc bài thuyết trình
> như bằng chứng nghiên cứu thực tế."*

**Cái lấy được từ đó: bộ câu hỏi, khung mã hoá, mẫu xin phép.** Đó là thiết kế
nghiên cứu, và nó tốt.

**Cái KHÔNG lấy: mọi con số và mọi câu trích.** *"7/12 hiểu đúng"*, *"1 dApp đồng ý
pilot"* — chưa xảy ra. Đưa lên slide thì câu hỏi đầu tiên (*"các em tuyển 12 người
này ở đâu?"*) làm sập không chỉ slide đó mà **toàn bộ phần bằng chứng còn lại**, kể
cả những số đội đã đo thật như 0 cáo buộc sai trên mainnet.

> Thêm một lý do nữa, độc lập với chuyện thật giả: **kịch bản đó mô tả một màn hình
> không còn tồn tại.** Nó nói về "coverage 46%", "5 SOL rời ví", và chữ "authority"
> trên giao diện. Màn hình hôm nay ghi *"Đã đọc hiểu 2 trên 3 lệnh"*, giao dịch demo
> là chuyển token chứ không phải 5 SOL, và không có chữ "authority" nào. Kể cả nếu
> nó là dữ liệu thật, nó cũng là dữ liệu về một sản phẩm khác.

---

## 1 · Tuyển người

| Nhóm | Số người | Tiêu chí |
|---|---:|---|
| Chưa từng dùng crypto | 6 | Chưa từng tự thực hiện một giao dịch blockchain nào |
| Dùng dưới 12 tháng | 6 | Có ví, đã tự ký giao dịch, nhưng chưa quá 12 tháng |

**Không hỏi dev Web3.** Họ biết trước rồi — con số đẹp mà vô nghĩa, và giám khảo sẽ
hỏi đúng chỗ đó.

Gán mã **P01–P12**. Không ghi tên, không ghi số điện thoại, không ghi bất cứ thứ gì
nhận dạng được vào repo.

---

## 2 · Mẫu xin phép — đọc nguyên văn trước khi bắt đầu

> Chào bạn, cảm ơn bạn đã dành thời gian. Bọn mình đang kiểm tra cách một sản phẩm
> giải thích giao dịch blockchain trước khi người dùng ký. **Đây không phải bài kiểm
> tra kiến thức của bạn; bọn mình đang kiểm tra sản phẩm.** Bạn cứ nói thành tiếng
> điều bạn đang nghĩ. Bọn mình xin ghi lại câu trả lời dưới mã ẩn danh và không lưu
> thông tin nhận dạng. Bạn có đồng ý tiếp tục không?

Câu *"bọn mình đang kiểm tra sản phẩm, không kiểm tra bạn"* là câu quan trọng nhất
trong đoạn này. Không có nó, người ta đoán câu trả lời họ nghĩ là "đúng", và phép đo
hỏng.

---

## 3 · Hai câu hỏi chính — hỏi TÁCH NHAU, đúng thứ tự

Mở `phong-van.html`, chiếu màn hình, **không nói gì thêm**.

**Câu 1 — đo mức hiểu:**
> *"Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?"*

Chép **nguyên văn** lời họ nói. Kể cả khi sai, kể cả khi lan man.

**Câu 2 — đo hành vi, hỏi SAU khi đã chép xong câu 1:**
> *"Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?"*

> ⚠️ **Không hỏi hai câu cùng lúc.** Câu *"bạn sẽ ký hay huỷ"* tự nó đã mách rằng có
> gì đó đáng huỷ, và câu trả lời cho câu 1 hỏng theo.

### Câu phụ, hỏi nếu còn thời gian

3. Thông tin nào trên màn hình giúp bạn ra quyết định nhiều nhất?
4. Có chỗ nào khó hiểu hoặc khiến bạn hiểu nhầm không?
5. Bạn muốn thay đổi điều gì để dễ dùng hơn?

Ba câu này **không tính vào con số**. Chúng là nguồn ý tưởng sửa giao diện — ghi vào
ô ghi chú.

---

## 4 · Khung chấm — chốt TRƯỚC khi hỏi người đầu tiên

### Mức hiểu hậu quả

| Mức | Khi nào |
|---|---|
| **ĐÚNG** | Nêu được **mất tiền** HOẶC **mất quyền kiểm soát** |
| **MỘT PHẦN** | Nêu được một vế, hoặc chỉ nói *"chắc có gì đó nguy hiểm"* mà không nói được là gì |
| **SAI** | Hiểu ngược, hoặc nói chuyện không liên quan |

### Quyết định

`HUỶ` · `KIỂM TRA THÊM rồi mới quyết` · `VẪN KÝ`

**Hai trục này độc lập, và đó là chủ đích.** Một người chấm ĐÚNG mà vẫn bấm ký thì
sản phẩm đã thất bại — dù ô "hiểu" đẹp. Đo mỗi mức hiểu là đo nửa câu chuyện, và là
nửa dễ đẹp hơn.

---

## 5 · Bốn cách tự phá hỏng phép đo

| Đừng | Vì sao |
|---|---|
| Giải thích trước khi hỏi | Đang đo trí nhớ của họ về lời bạn, không đo sản phẩm |
| Hỏi *"bạn thấy dễ hiểu không?"* | Ai cũng trả lời "dễ hiểu" cho vui lòng |
| Chấm trước rồi mới chép lại | Chép theo cái nhãn mình vừa gắn, không còn là nguyên văn |
| Bỏ người trả lời sai | Gian lận, và là thứ dễ bị hỏi lộ nhất |

Trang `phong-van.html` chặn sẵn hai cái cuối: nút chấm chỉ mở **sau khi** đã ghi
nguyên văn, và **không có nút xoá** từng mục. Hai cái đầu phụ thuộc vào bạn.

---

## 6 · Con số nào được nói trên sân khấu

```
ĐÚNG / TỔNG          — ví dụ "8/12 nêu được hậu quả"
VẪN KÝ / TỔNG        — ví dụ "2/12 vẫn ký dù đã thấy cảnh báo"
```

**"MỘT PHẦN" không được gộp vào "ĐÚNG".** Gộp một lần là mất độ tin của mọi con số
khác trong bài.

**Nếu có người hiểu đúng mà vẫn ký — đó là phát hiện quan trọng nhất của cả đợt.**
Đừng giấu. Nói ra nó chứng minh đội đo thật và đọc được kết quả xấu; giấu nó đi thì
mất cả hai. Một câu như *"2 trong 12 người hiểu đúng hậu quả nhưng vẫn nói sẽ ký —
chúng em còn phải làm nhiều"* mạnh hơn một con số tròn trịa.

---

## 7 · Ghi kết quả

Xong 12 người → bấm **Sao chép toàn bộ (JSON)** trên trang → dán vào
`data/seed/phong-van.json` → commit.

Dữ liệu nằm trong `localStorage` của máy người phỏng vấn, không gửi đi đâu, không có
backend. Nghĩa là **mỗi người phỏng vấn giữ phần của mình** — gom bốn file JSON lại
khi xong.

> Nếu bốn người dùng bốn máy, nhớ gộp thủ công. Trang không đồng bộ giữa các máy, và
> cố ý không làm thế: thêm backend nghĩa là thêm một chỗ lộ dữ liệu người tham gia.
