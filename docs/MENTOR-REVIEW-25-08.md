# Mentor review — 25/08/2026

**Người review:** đóng vai mentor UniHackFest · **Trạng thái repo:** `e39d7cf` · 249 test · 42 commit / 5 ngày
**Khác gì bản chấm 23/08:** bản kia chấm bạn như **giám khảo** — điểm tại một thời điểm.
Bản này nhìn như **mentor** — quỹ đạo, và cái gì sẽ thật sự xảy ra trong phòng thi.

---

## 0 · Một con số tôi phải nói trước

Tôi đếm tài liệu trong repo các em:

```
docs/review/PRODUCT-REVIEW.md          474 dòng
docs/CHAM-DIEM-GIA-DINH.md             386 dòng
docs/ROADMAP-BUILD.md                  350 dòng
docs/ROADMAP-DIEM-SO.md                245 dòng
docs/KE-HOACH-11-NGAY-CUOI.md          238 dòng
docs/review/IMPROVEMENT-ROADMAP.md     199 dòng
───────────────────────────────────────────────
TỔNG tài liệu tự phân tích           1.892 dòng

Số người ngoài đội đã được hỏi              0
Số ví/dApp đã được nhắn                     0
```

**Gần hai nghìn dòng tự soi mình, và chưa một câu hỏi nào gửi ra ngoài.**

Tôi không nói mấy tài liệu đó vô ích — chúng tìm ra hai lỗi thật, tôi sẽ nói ở mục 2. Nhưng
đây là hình mẫu tôi gặp ở gần như mọi đội kỹ thuật giỏi: **họ lặp lại việc họ giỏi.**

Các em giỏi đo lường, giỏi tự phản biện, giỏi viết tài liệu. Nên khi thấy khoảng trống, phản
xạ là **viết thêm một bản phân tích về khoảng trống đó**. Nhưng khoảng trống ở tiêu chí 25 %
*"bài toán thị trường và người dùng"* không lấp được bằng chữ. Nó chỉ lấp được bằng người.

Nói thẳng: **nếu từ giờ tới 05/09 các em viết thêm một file .md nào nữa mà chưa nói chuyện
với một người ngoài đội, thì file đó đang thay thế cho việc cần làm chứ không phải chuẩn bị
cho nó.** Kể cả file này.

---

## 1 · Điểm đã dịch — nhưng dịch sai chỗ

Chấm lại theo rubric Track *Best Product & Business*, so với 23/08:

| Tiêu chí | Trọng số | 23/08 | **Hôm nay** | Dịch |
|---|---:|---:|---:|:--:|
| Bài toán thị trường & người dùng | 25 % | 6,5 | **6,5** | — |
| Giải pháp, demo, trải nghiệm | 30 % | 8,5 | **9,0** | ▲ 0,5 |
| Mô hình kinh doanh & GTM | 25 % | 5,5 | **6,0** | ▲ 0,5 |
| Trình bày & phản biện | 20 % | 7,0 | **7,5** | ▲ 0,5 |
| **Tổng có trọng số** | | **6,95** | **7,33** | ▲ 0,38 |

Hai ngày làm việc rất chăm chỉ đổi được **+0,38 điểm**. Vì sao ít vậy?

**Vì gần như toàn bộ công sức rơi vào ô các em đã gần trần.** Ô *demo* từ 8,5 lên 9,0 — chỉ
còn 1,0 điểm nữa là kịch. Trong khi ô *bài toán thị trường* đứng yên ở 6,5 với **3,5 điểm
đang bỏ trống**, và nó nặng ngang ô kinh doanh.

Đây là bẫy kinh điển: **tối ưu chỗ dễ đo được, tránh chỗ khó chịu.** Coverage, test, đóng gói
SDK — đều đo được, đều cho phản hồi ngay, đều nằm trong tầm kiểm soát. Gọi cho người lạ thì
không.

> **Ô kinh doanh chỉ +0,5 dù các em vá được vấn đề đóng gói SDK.** Vì đóng gói được chỉ *tháo
> chặn* cho outreach, chứ chưa phải outreach. Giờ có tarball để gửi — mà chưa gửi cho ai.

---

## 2 · Thứ các em làm rất tốt, và chưa biết cách bán

Hai ngày qua, hệ thống đo của chính các em bắt được **hai lỗi thật trong sản phẩm của mình**:

**Một — cảnh báo không có mã lý do.** `evaluate.ts` tự viết ra nguyên tắc *"cảnh báo không có
mã là cảnh báo bên tích hợp không phân loại được"*, rồi vi phạm nó ngay dưới mười dòng. Sống
qua 242 test.

**Hai — báo Đỏ cho mọi lệnh mở gói wSOL.** Neo lại cohort thì lòi ra một giao dịch DeFi bình
thường bị gắn Đỏ. Đóng tài khoản token luôn trả nó về System Program — luật 12 thấy "đổi
chương trình sở hữu" và kêu. Nghĩa là Custos đang cáo buộc oan **gần như mọi giao dịch DeFi
có dùng SOL trên mainnet**.

### Vì sao tôi coi đây là tài sản, không phải vết nhơ

Hầu hết đội hackathon **không có cơ chế nào để phát hiện ra lỗi loại này**. Họ demo một ca
đẹp, không đo trên lưu lượng thật, và không bao giờ biết sản phẩm mình kêu oan. Các em **có**
cơ chế đó, và nó hoạt động — 10 ngày trước hạn.

Nhưng đọc `PITCH-VA-PHAN-BIEN.md` thì không thấy câu chuyện này ở đâu cả.

**Đề xuất — đưa nó vào bài nói, thay cho một câu số liệu khô:**

> *"Mười ngày trước hôm nay, hệ thống đo của bọn em bắt chính sản phẩm bọn em báo Đỏ cho một
> giao dịch DeFi hoàn toàn bình thường — mở gói wSOL. Bọn em vá trong buổi chiều, và viết
> test để nó không tái phát. Bọn em kể chuyện này vì đó là thứ phân biệt một sản phẩm bảo mật
> **đo được** với một sản phẩm bảo mật **nghe có vẻ đúng**."*

Câu đó mạnh hơn *"0 giao dịch bị gắn cờ"* rất nhiều. Con số 0 thì đội nào cũng đọc được; câu
chuyện tự bắt lỗi mình thì không đội nào bịa được. Và nó chặn trước câu hỏi *"làm sao biết
các em không kêu oan?"* — vì các em vừa kể một lần đã kêu oan.

> ⚠️ Ràng buộc: chỉ kể được nếu số liệu công bố là **sau khi vá**. Đừng kể chuyện này rồi đọc
> con số cũ.

---

## 3 · Ba điều mentor biết mà tài liệu các em chưa tính tới

### 3.1 · Hội đồng có người của quỹ — họ nghe "traction" theo nghĩa rất thấp

Thể lệ ghi hội đồng chung kết dự kiến có **MEXC Ventures** và **Solana Foundation**. Người
làm quỹ ngồi chấm sinh viên **không** kỳ vọng doanh thu hay LOI. Ngưỡng của họ thấp hơn các
em tưởng rất nhiều:

| Cái họ muốn nghe | Ngưỡng thật ở hackathon sinh viên |
|---|---|
| "Bọn em đã nói chuyện với người dùng" | **5 người** là đủ để không bị coi là chưa làm |
| "Bọn em đã hỏi khách hàng" | **3 câu trả lời**, kể cả 3 câu từ chối |
| "Có ai muốn thử chưa" | **1 người nói 'gửi tôi xem'** đã là tín hiệu |

Các em đang ở **0/0/0**. Không phải vì khó — mà vì chưa ai bấm gửi. Hai buổi tối là xong cả ba.

### 3.2 · "Chưa có" nói ra đúng cách lại ghi điểm

Slide 9 của các em có dòng tự nhận chỗ còn thiếu. Giữ nó. Nhưng có cách nói tốt hơn cách hiện tại:

| Đừng nói | Nói |
|---|---|
| "Bọn em chưa phỏng vấn người dùng" | "Bọn em hỏi **5 người**, **3** nêu đúng hậu quả, **1 người hiểu đúng mà vẫn nói sẽ ký** — đó là chỗ bọn em còn phải làm" |

Vế sau mạnh hơn vế trước **rất nhiều**, và khoảng cách giữa hai vế là **một buổi tối**.

Con số xấu mà thật, kèm nhận định sắc, đánh bại con số đẹp mà không kiểm chứng được — và
đánh bại xa hơn nữa cái "chưa có".

### 3.3 · Đường Solana grant là câu trả lời cho một câu hỏi chắc chắn bị hỏi

*"Sau cuộc thi các em làm gì?"* — gần như luôn được hỏi ở vòng cuối, và tài liệu các em chưa
có câu trả lời.

Custos đúng dạng Solana Foundation tài trợ: **hạ tầng cho hệ sinh thái**, không phải app tiêu
dùng, không phát token, không cần vốn lớn. Nên câu trả lời có sẵn:

> *"Custos là hạ tầng, không phải app — nên đường đi tự nhiên là grant của Solana Foundation
> chứ không phải gọi vốn. Bọn em cần ba thứ trước khi nộp: một ví thật tích hợp, số liệu trên
> lưu lượng thật, và audit. Cái thứ hai bọn em đã có."*

Nên thêm vào `CUSTOS.md` mục 08. **Một đoạn, không phải một chương** — đừng để nó thành cái cớ
viết thêm 200 dòng nữa.

---

## 4 · Chỗ tôi nghĩ các em đang sai hướng

### 4.1 · "Cần ví thật chứ không phải demo"

Đã ghi ở `KE-HOACH-11-NGAY-CUOI.md` mục 0b, và phân tích ở đó đúng. Tôi chỉ thêm góc mentor:

**Ý tưởng này đến từ cảm giác "demo thì không nghiêm túc" — và cảm giác đó sai ở track này.**
Thể lệ đòi *"link demo live hoặc devnet truy cập được"*. Các em **vượt** yêu cầu đó rồi. Cái
thiếu không phải độ thật của ví; là **độ thật của bằng chứng có người muốn dùng**.

Xây một cái ví sẽ tiêu hết 11 ngày để cải thiện ô các em đã 9,0/10, trong khi ô 6,5/10 vẫn
nguyên. Đó là chính cái bẫy ở mục 1, chỉ ở quy mô lớn hơn.

### 4.2 · Ba vòng review là đủ rồi

Các em đã có: bản chấm giám khảo, bản review 12 vai, và bản này. **Dừng.** Vòng thứ tư sẽ tìm
được ít hơn vòng thứ ba, và mỗi vòng tốn một buổi.

Từ giờ, quy tắc: **không viết tài liệu mới nào trừ khi nó ghi lại dữ liệu từ người thật.**

### 4.3 · Giao dịch demo 3 lệnh — quyết đi, đừng treo thêm

Nút thắt này treo từ 23/08 và đang chặn video, tức chặn một **hạng mục bắt buộc**.

Góc mentor: **chọn A (giữ 3 lệnh) và đi tiếp.** Lý do — coverage 2/3 vẫn kể được đúng câu
chuyện *"nó tự khai phần chưa hiểu"*, và 2/3 nghe **thành thật** hơn 10/11. Một giao dịch đơn
giản mà thật đánh bại một giao dịch phức tạp mà có mùi dàn dựng. Nếu giám khảo hỏi *"sao chỉ
3 lệnh?"* thì câu trả lời có sẵn và tốt: *"đây là ca tối giản để nhìn rõ cơ chế; số liệu
mainnet ở trang số liệu mới là bằng chứng quy mô."*

Tiết kiệm được 2 giờ của vai B, và tháo chặn video ngay hôm nay.

---

> ### Cập nhật 25/08 — đội quyết KHÔNG phỏng vấn, KHÔNG outreach
>
> Không đủ thời gian và điều kiện. Quyết định có ý thức, đã ghi ở
> `docs/ket-qua-phong-van.md` kèm câu trả lời cho sân khấu.
>
> **Trần mới ≈ 7,7** thay vì 8,3. Hai ô 25 % đứng nguyên; toàn bộ phần còn lại dồn vào
> **demo (30 %)** và **trình bày (20 %)** — nơi đội mạnh nhất. Mục 5 dưới đây giữ
> nguyên để đối chiếu, nhưng hai dòng đầu đã gạch.

## 5 · Việc phải làm, xếp theo điểm đổi được

| # | Việc | Ai | Thời gian | Đổi |
|---|---|---|---|---:|
| ~~1~~ | ~~Hỏi 5 người thật~~ — **đội đã quyết KHÔNG làm 25/08**, không đủ thời gian | — | — | — |
| ~~2~~ | ~~Nhắn 10 ví/dApp~~ — bỏ cùng lý do | — | — | — |
| 3 | Chốt A cho giao dịch demo → **quay video** | B + 2 người | 2 giờ | *bắt buộc* |
| 4 | Đưa **chuyện tự bắt lỗi wSOL** vào pitch | 1 người | 30 phút | **+0,3** |
| 5 | Thêm đoạn **Solana grant** vào `CUSTOS.md` §08 | 1 người | 20 phút | **+0,2** |
| 6 | RPC key riêng · tập pitch 5 lượt · tag release | — | — | *chống sập* |

Mục 1 và 2 cộng lại **+0,9** — nhiều hơn toàn bộ hai ngày kỹ thuật vừa rồi gấp đôi. Và chúng
tốn **hai buổi tối**, không cần viết một dòng code nào.

### Nhắn ai — cụ thể, đừng để phải nghĩ

| Kênh | Cách vào |
|---|---|
| **Superteam Vietnam** | Discord/Telegram — nơi tập trung dev Solana Việt. Đăng một bài xin 5 phút phản hồi SDK |
| **Privy** (privy.io) | Ví nhúng, có hỗ trợ Solana — đúng nhóm khách hàng ③ |
| Ví/dApp Solana có người dùng Việt | Nhắn thẳng Twitter/Telegram của đội |

Tin nhắn mẫu đã soạn sẵn ở `docs/VIEC-CUA-BAN.md` mục 3. **Không cần viết lại. Gửi đi.**

---

## 6 · Ngày thi — ba rủi ro cụ thể

| Rủi ro | Cách chặn |
|---|---|
| **Demo chết vì RPC** | Cắm RPC key riêng. Endpoint công khai đã chặn `429` hàng chục lần khi build |
| **Hiện trường devnet đã tiêu** | Mỗi lần tập có ký thật là bản công khai hỏng **âm thầm** — trang vẫn trả 200, chỉ số dư về 0. Trước khi lên sân khấu: dựng lại, push, **đọc số dư thật** |
| **Đọc số không khớp màn hình** | Con số trên slide sinh từ `so-lieu.json`. Nếu neo lại cohort thì **sinh lại deck**, đừng đọc số cũ |

Riêng cái thứ hai đã xảy ra thật một lần: demo công khai đứng ở ví rỗng suốt mấy ngày mà
không ai biết, vì kiểm "trang trả 200" không bắt được.

---

## 7 · Nói thẳng về cơ hội

**Sản phẩm của các em tốt hơn phần lớn đội tôi từng gặp ở vòng trường.** Nó chạy thật, đo
thật, tự bắt lỗi mình, và tài liệu trung thực đến mức khắt khe. Phần kỹ thuật gần như không
còn gì để chê.

Nhưng ở track *Best Product & Business*, **50 % số điểm hỏi một câu duy nhất: có ai ngoài đội
các em quan tâm chưa?** Và câu trả lời hôm nay là **chưa ai được hỏi**.

Đó không phải điểm yếu về năng lực. Nó là điểm yếu về **thói quen**: đội này giải quyết vấn
đề bằng cách nghĩ kỹ hơn, trong khi vấn đề còn lại chỉ giải được bằng cách bấm nút gửi.

Chênh lệch giữa **7,33** và khoảng **8,3** không nằm ở dòng code nào. Nó nằm ở hai buổi tối
làm việc mà không ai trong đội thấy thoải mái.

**Tối nay hỏi ba người. Mai nhắn năm đội.** Đó là toàn bộ lời khuyên của tôi.

---

*Bản này viết ngày 25/08/2026, trên trạng thái repo `e39d7cf` — 249 test, cohort neo lại
25/08, 82 % coverage trên 9 mẫu, 0 giao dịch bị gắn cờ.*
