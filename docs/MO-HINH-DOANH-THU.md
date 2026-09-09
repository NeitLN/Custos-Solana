# Mô hình doanh thu — ai trả, trả cho gì, và điều kiện nó sai

**Việc B04 của [`ROADMAP-CLAUDE.md`](../ROADMAP-CLAUDE.md).**

> **Trang này là GIẢ THUYẾT, không phải mô hình đã kiểm chứng.**
> **0 cuộc trò chuyện với người mua.** Mỗi con số dưới đây có nhãn nguồn hoặc nhãn
> giả định, và mỗi giả định có một phép thử cụ thể. Không được gọi đây là "đã
> validate kinh doanh" — xem [`BANG-CLAIM.md`](BANG-CLAIM.md).

Đọc kèm [`DON-VI-KINH-TE.md`](DON-VI-KINH-TE.md) (chi phí một lượt) và
[`QUY-MO-THI-TRUONG.md`](QUY-MO-THI-TRUONG.md) (TAM/SAM/SOM bottom-up).

---

## 0 · Giấy phép MIT quyết định mô hình, không phải ngược lại

`@custos-solana/core`, `ai`, `types` đều **MIT**, đã publish công khai lên npm.

Điều đó khoá một cửa và mở một cửa:

- **Không bán được bản thân SDK.** Ai cũng `npm i` được, fork được, dùng vĩnh viễn
  không trả gì. Mọi mô hình kiểu "bản Pro có thêm tính năng trong SDK" đều bị fork
  vô hiệu hoá trong một buổi chiều.
- **Nên thứ bán được phải là thứ KHÔNG copy được cùng repo.** Có ba thứ như vậy:
  luật được cập nhật liên tục, người chịu trách nhiệm, và cam kết vận hành.

Đây không phải chọn lựa khôn khéo — nó là hệ quả bắt buộc của một quyết định đã có.
Nói ngược lại trên sân khấu là tự tạo một câu hỏi không trả lời được.

---

## 1 · Chi phí biên gần bằng không, nên đây KHÔNG phải mô hình bán compute

Đo được: **$0,0000325** RPC cho một lượt `inspect()` (trung vị 6,5 credit).

Cùng gói **$49/tháng** mà một ví đang trả cho RPC của chính họ chạy được **≈1,54
triệu** lượt kiểm tra. Nghĩa là nếu bán theo lượt gọi, Custos sẽ cạnh tranh với con
số gần bằng không — và thua, vì khách tự chạy được.

**Chi phí thật của Custos là người**, không phải máy:

| Khoản | Đơn vị | Loại |
|---|---|---|
| Viết và cập nhật luật khi Solana đổi | giờ/tháng | **chi phí chính** |
| Viết decoder cho chương trình mới | giờ/chương trình | chi phí chính |
| Trả lời tích hợp, sửa lỗi cho đối tác | giờ/đối tác | chi phí chính |
| RPC | $0,0000325/lượt | ≈ 0 |
| Mô hình ngôn ngữ | **chưa đo được** — cần khoá | ? |

Cột "loại" là toàn bộ lập luận: **giá phải neo vào giờ người, không vào lượt gọi.**

---

## 2 · Cái gì miễn phí, cái gì trả tiền

| | Miễn phí (MIT) | Trả tiền |
|---|---|---|
| SDK, 14 luật, lớp neo AI | ✅ mãi mãi | |
| Tự host, tự sửa, fork | ✅ | |
| Ví dụ tích hợp, [bộ pilot tự làm](PILOT-TU-LAM.md) | ✅ | |
| **Luật mới khi Solana đổi**, trong vòng N ngày | | ✅ |
| **Decoder cho chương trình riêng** của đối tác | | ✅ |
| **Hỗ trợ tích hợp** có người trả lời | | ✅ |
| **Cam kết vận hành** (SLA) nếu chạy hosted | | ✅ |

Ranh giới: **thứ chạy trên máy khách thì miễn phí; thứ cần một người của Custos còn
làm việc thì trả tiền.**

Một câu kiểm nhanh cho mọi tính năng mới: *"cái này có bị fork lấy mất không?"* Nếu
có, nó thuộc cột trái. Đừng cố chuyển nó sang cột phải.

---

## 3 · Ba gói giả thuyết — mỗi con số kèm phép thử

**Cả ba mức giá dưới đây là GIẢ ĐỊNH.** Neo duy nhất có thật là Helius/QuickNode đặt
tầng trả tiền đầu tiên ở **$49/tháng** — điều đó chứng minh người mua **quen trả tiền
hạ tầng theo tháng**, và **không** chứng minh gì về giá của Custos.

| Gói | Giá/tháng | Cho ai | Loại | Phép thử |
|---|---:|---|---|---|
| **Cộng đồng** | $0 | tự host, tự chịu | — | không cần thử |
| **Đội nhỏ** | **$49** | dApp/ví nhỏ, cần luật được cập nhật | **giả định** | câu 6 của [B01](PHONG-VAN-NGUOI-MUA.md): *"nếu thử một tuần, tiêu chí pass/fail của bạn là gì"* → hỏi tiếp *"$49/tháng cho luật được cập nhật có nằm trong ngân sách nào của bạn không"* |
| **Có cam kết** | **$300–800** | ví có người dùng thật, cần SLA + decoder riêng | **giả định**, dải rộng vì không có dữ liệu | hỏi *"ai duyệt chi"* trước, hỏi giá sau — nếu họ không có ngân sách security thì con số nào cũng vô nghĩa |

### Dải $300–800 rộng vì đội thật sự không biết

Nó không phải khoảng tin cậy. Nó là khoảng **chưa đo**, và ghi rộng để không ai đọc
nhầm thành một ước lượng có căn cứ. Một cuộc trò chuyện với người mua thu hẹp nó hơn
mọi lần tính lại bảng này.

### Biến giá đã nằm trong mô hình thị trường

`acvThangUsd` trong [`scripts/do-thi-truong.ts`](../scripts/do-thi-truong.ts) chạy dải
**$20 → $100**, khai `GIA_DINH`, và có test canh không biến nào thiếu căn cứ. Trang
này **không** dựng bảng thứ hai — sửa giá thì sửa ở đó, không sửa ở đây.

---

## 4 · Ai trả tiền, và tiền ra từ túi nào

Câu "ai trả" có hai nửa, và bỏ nửa sau là lý do nhiều pitch chết ở vòng Q&A.

| | |
|---|---|
| **Ai dùng** | lập trình viên tích hợp SDK vào ví |
| **Ai duyệt chi** | **chưa biết** — đây là câu 5 trong [B01](PHONG-VAN-NGUOI-MUA.md) |
| **Ngân sách nào** | security? infra? product? — **chưa biết**, và ba cái này duyệt khác nhau |

Với đội 5–15 người, người dùng và người duyệt thường là một. Với ví có backing, chúng
tách ra và chu kỳ mua dài hơn nhiều. **Đội chưa biết mình đang bán cho loại nào** —
đó là điều buyer interview trả lời đầu tiên, không phải giá.

---

## 5 · Kênh có khách đầu tiên

Xếp theo **khả năng có người trả lời**, không theo độ oai — cùng thứ tự với
[`PHONG-VAN-NGUOI-MUA.md`](PHONG-VAN-NGUOI-MUA.md) mục 1:

1. **Đội hackathon Solana đang build** — dễ trả lời nhất, cùng hoàn cảnh
2. **Superteam Vietnam** — cùng múi giờ, cùng tiếng, cùng cộng đồng
3. **dApp tiêu dùng có người dùng Việt/SEA**
4. Nhà cung cấp ví embedded
5. Ví lớn — **chỉ để học yêu cầu enterprise**, không đặt mục tiêu bán

Kênh 1–2 là nơi khách đầu tiên có thể tới. Kênh 5 gần như chắc chắn không, và đưa nó
lên slide như một cơ hội gần là tự tạo một câu hỏi khó.

---

## 6 · Điều kiện mô hình này KHÔNG khả thi

Mục quan trọng nhất của trang. Một mô hình không nói được nó sai khi nào thì không
kiểm được, và không kiểm được thì nó là một câu chuyện.

**Bỏ mô hình trả tiền nếu:**

| Điều kiện | Vì sao nó giết mô hình |
|---|---|
| ≥ 8 đội nói *"chúng tôi tự cập nhật luật được"* | thứ duy nhất bán được không có giá trị |
| Không đội nào có **ngân sách security** — đều xin từ ngân sách product theo dự án | không có dòng tiền định kỳ để bán vào |
| Ví lớn mở nguồn lớp tương đương, miễn phí | cột phải bị copy, và họ có phân phối |
| Solana đổi ít tới mức luật không cần cập nhật | "luật được cập nhật" hết là giá trị |
| Đội không tiếp cận nổi **30 đội/năm** | ràng buộc là tiếp cận, không phải thị trường — xem [`QUY-MO-THI-TRUONG.md`](QUY-MO-THI-TRUONG.md) mục 4 |

**Nếu ba điều đầu xảy ra:** Custos vẫn là một dự án mã nguồn mở có ích và một bằng
chứng kỹ thuật tốt. Nó **không** là một doanh nghiệp, và nói vậy sớm rẻ hơn nhiều so
với nói muộn.

---

## 7 · Điều trang này KHÔNG nói

- Không nói ai sẽ trả tiền. **0 người mua đã được hỏi.**
- Không nói $49 hay $300–800 là giá đúng. Cả hai là giả định, mỗi cái kèm phép thử.
- Không nói biên lợi nhuận. Cần ba ô: chi phí RPC (✅ có), token mô hình (❌ cần khoá),
  giá bán (❌ cần hỏi khách). Hai ô trống thì không có tỉ lệ nào.
- Không đổi SOM để ra số đẹp hơn. SOM gốc **1,8 đội ≈ $1 058/năm** giữ nguyên, kể cả
  khi nó nhỏ.
