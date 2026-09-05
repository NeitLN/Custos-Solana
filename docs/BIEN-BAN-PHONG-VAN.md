# Biên bản phỏng vấn

Chép **nguyên văn** lời họ nói — câu cụt, *"em không biết"*, chửi thề, giữ hết.
Không ghi tên, email, số điện thoại. Chỉ mã P01–P20.

Điền xong: `node scripts/doc-bien-ban.mjs --ghi`

## Nguồn gốc

| | |
|---|---|
| Ngày phỏng vấn | **29/08 và 30/08/2026** |
| Ai phỏng vấn | **Võ Việt Tiến** — một người hỏi cả 20 |
| Cách hỏi | **tin nhắn** và **video call** |
| Ghi bằng gì | ghi lại bằng note trong lúc hỏi |
| Có xin phép trước | **Có** — nói rõ là *tham gia nghiên cứu để lấy số liệu* |
| Phạm vi consent | **số liệu tổng hợp**, KHÔNG bao gồm công bố tuổi chính xác và nghề cụ thể |
| Màn hình đã chiếu | `/phong-van.html` ở trạng thái repo ngày 29–30/08 (trước `b90aad8`) |

### Vì sao tuổi ở đây là NHÓM, không phải số chính xác

Người tham gia được nói là **tham gia nghiên cứu để lấy số liệu**. Đó là consent cho
việc câu trả lời của họ thành con số — không phải cho việc tuổi chính xác và nghề cụ
thể của họ nằm trên một repo công khai mà git không quên.

Đo được trước khi sửa: **8/20** bản ghi mang đồng thời tuổi chính xác, nghề rất cụ
thể (*"sinh viên năm nhất Kinh tế"*, *"QA Engineer"*) và câu nói nguyên văn. Trong
vòng quen biết của chính người phỏng vấn, tổ hợp đó đủ để bạn cùng lớp nhận ra người.

Nay tuổi là nhóm (18–19, 20–22, 23–25) và nghề là nhóm rộng. **Câu trả lời nguyên văn
giữ nguyên** — chúng là phản ứng với màn hình, không chứa thông tin cá nhân nào; đã
soi và xác nhận. Giữ chúng là giữ đường kiểm chứng cho con số 13/20.

**Không tỉ lệ nào đổi.** Kiểm bằng `npm run soi-rieng-tu`.

### Bốn giới hạn của phép đo này — nói ra trước khi bị hỏi

**1 · Màn hình đã đổi sau khi phỏng vấn.** Hôm 29–30/08 tấm cảnh báo là **nền tối**
(`bg-slate-900/60`) đặt trên trang tối — nhất quán, không có lỗi tương phản. Nó được
thiết kế lại sang nền sáng ngày **01/09** (`5713f46`) và trang phỏng vấn được đưa về
cùng hệ nền sáng ngày **04/09** (`a6e58ba`).

Nội dung không đổi: vẫn mức *Nguy hiểm*, vẫn bảng `500 → 0`, vẫn dòng đổi chủ tài
khoản, vẫn *"đã đọc hiểu 2 trên 3 lệnh"*. Nhưng **hình thức thì khác**, nên con số
dưới đây đo trên một bản giao diện cũ hơn bản đang demo. Đừng nói *"đo trên đúng màn
hình các anh chị vừa xem"*.

**2 · Hỏi qua tin nhắn thì không quan sát được, và người trả lời có thời gian.**
Giao thức gốc là chiếu màn hình rồi im lặng, đo cả thời gian đọc và chỗ họ dừng lâu.
Qua tin nhắn thì không có dữ liệu đó, và người trả lời có thể tra cứu hoặc hỏi người
khác trước khi nhắn lại. Phần qua **video call** gần giao thức hơn.

**3 · Biên bản không ghi ai hỏi qua tin nhắn, ai qua video call.** Không suy đoán
ngược được, nên không tách được hai nhóm để so.

**4 · Một người hỏi cả 20.** Không có trôi thang chấm giữa nhiều người hỏi — đó là
điểm mạnh. Nhưng cũng không có ai chấm chéo để bắt lỗi thiên lệch của chính người
hỏi — đó là điểm yếu, và nó chưa được khử.

> Câu trả lời qua tin nhắn thường tròn trịa hơn lời nói. Điều đó giải thích vì sao
> hầu như không có câu nào cụt hay lấp lửng trong biên bản này — **không phải vì đã
> sửa lại lời họ**, mà vì phần lớn là chữ họ tự gõ.

---

### P01 — 18–19 tuổi · sinh viên · chưa từng dùng crypto

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Em nhìn dòng 500 xuống 0 thì chắc là mất hết 500 USDC-demo trong ví. Với cái dòng đổi chủ nữa thì hình như tài khoản đó không còn do em giữ luôn.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Em huỷ liền. Nó để với ghi không nên ký, mà tiền còn về 0 nữa thì em không dám thử.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | HUỶ |

---

### P02 — 18–19 tuổi · sinh viên · biết Bitcoin qua mạng xã hội, chưa có ví

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Chắc có chuyện nguy hiểm với ví, kiểu bị hack hay gì đó. Em không hiểu `đổi chủ tài khoản token` là đổi cái gì.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Em cần kiểm tra thêm. Em sẽ hỏi người biết crypto hoặc tìm xem cái ví `CRZa...` đó là ai rồi mới quyết.

| Mức hiểu | Sẽ bấm |
|---|---|
| MỘT PHẦN | KIỂM TRA THÊM |

---

### P03 — 20–22 tuổi · sinh viên · từng mua crypto trên sàn tập trung, chưa dùng ví tự quản thường xuyên

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> 500 USDC-demo bị chuyển sạch, rồi quyền sở hữu tài khoản chứa đồng đó sang địa chỉ khác. Nghĩa là vừa mất số dư vừa mất quyền kiểm soát tài khoản token.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Huỷ. Một giao dịch bình thường không cần lấy hết tiền rồi đổi luôn chủ tài khoản của mình.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | HUỶ |

---

### P04 — 20–22 tuổi · người chơi game · thường bấm nhận quà trong game, chưa từng dùng ví Solana

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Em tưởng ký là xác nhận để nhận 1.000 SOLB. Cái 500 về 0 chắc là số token bên kia gửi hết cho em hay reset số hiển thị thôi.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Em vẫn ký thử, tại đang nhận quà mà. Với lại có chữ demo nên chắc không sao.

| Mức hiểu | Sẽ bấm |
|---|---|
| SAI | VẪN KÝ |

---

### P05 — 20–22 tuổi · sinh viên · từng cài Phantom để nhận NFT nhưng chỉ dùng một lần

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Hình như nó đang chuyển một đống nào đó ra ngoài và có thêm quyền gì bị đổi. Em chưa chắc USDC-demo về 0 là tiền mất thật hay chỉ là bước đổi token.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Kiểm tra thêm. Em sẽ quay lại trang trước xem mình đang bấm nhận gì, chứ màn này không giống cái em định làm.

| Mức hiểu | Sẽ bấm |
|---|---|
| MỘT PHẦN | KIỂM TRA THÊM |

---

### P06 — 20–22 tuổi · sinh viên · dùng Phantom khoảng một năm, từng swap token

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Nó chuyển toàn bộ 500 USDC-demo đi và set authority của token account sang ví `CRZa…picz`. Ký xong là mình không còn quyền điều khiển account đó nữa.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Huỷ giao dịch. Việc nhận airdrop không có lý do gì phải đổi owner token account của mình.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | HUỶ |

---

### P07 — 23–25 tuổi · freelancer · dùng DeFi/NFT khoảng hai năm, quen ký nhiều loại giao dịch

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Nếu phần mô phỏng đúng thì 500 USDC-demo đi hết và token account bị chuyển quyền sở hữu. Tệ nhất là sau đó mình không lấy lại được quyền trên account đó.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Tôi vẫn ký nếu đây đúng là ví phụ và token test không có giá trị. Tôi đang thử luồng demo nên chấp nhận mất số đó.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | VẪN KÝ |

---

### P08 — 23–25 tuổi · nhân viên văn phòng · chỉ mua crypto trên sàn, chưa từng kết nối dApp

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Cột trước sau khá rõ, 500 còn 0 nghĩa là mất hết số USDC-demo đó. Còn đổi chủ thì chắc tài khoản này cũng bị người khác nắm.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Huỷ. Tôi không hiểu hết kỹ thuật nhưng chỉ riêng số dư về 0 là đủ để không ký rồi.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | HUỶ |

---

### P09 — 23–25 tuổi · kỹ sư phần mềm · hiểu kiểm thử phần mềm nhưng mới tìm hiểu blockchain

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Ví sẽ mất 500 USDC-demo và quyền sở hữu tài khoản token chuyển sang địa chỉ rút gọn đang hiện. Vì chỉ phân tích được 2 trên 3 phần nên có thể còn hậu quả khác chưa thấy.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Huỷ. Cả hậu quả đã biết lẫn phần chưa xác minh đều vượt quá mức tôi chấp nhận.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | HUỶ |

---

### P10 — 26+ tuổi · kỹ sư phần mềm · dùng Solana khoảng ba năm

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Giao dịch drain 500 USDC-demo và đổi owner của associated token account sang attacker. Phí mạng không đáng kể; rủi ro chính là asset outflow và mất authority.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Huỷ ngay. SetAuthority không thuộc hành động nhận thưởng và một program còn chưa được xác minh.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | HUỶ |

---

### P11 — 26+ tuổi · nhân viên văn phòng · thỉnh thoảng dùng ví để chuyển USDT/USDC

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> 500 USDC-demo sẽ bị chuyển khỏi ví, sau đó tài khoản chứa token thuộc về địa chỉ `CRZa…picz`, nên tôi không quản lý được nữa.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Tôi cần kiểm tra thêm địa chỉ đầy đủ và trang nào tạo giao dịch. Nếu không chứng minh được đây là thao tác tôi chủ động yêu cầu thì tôi huỷ.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | KIỂM TRA THÊM |

---

### P12 — 26+ tuổi · giao dịch crypto trên sàn khoảng bốn năm · ít dùng ví tự quản

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Nó báo rủi ro cao và hình như có một chương trình lạ. Tôi hiểu là giao dịch không an toàn, nhưng chưa rõ nó chỉ chuyển token hay có thể lấy các tài sản khác.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Kiểm tra thêm bằng explorer và xem contract trước. Tôi không ký chỉ dựa trên lời hứa nhận thưởng.

| Mức hiểu | Sẽ bấm |
|---|---|
| MỘT PHẦN | KIỂM TRA THÊM |

---

### P13 — 26+ tuổi · chủ hộ kinh doanh · chưa từng sử dụng crypto, quen xác nhận giao dịch ngân hàng

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Tôi thấy phí có `0,000005 SOL`, chắc ký thì chỉ trừ đúng phí đó. Dòng 500 về 0 có thể là số tiền đã dùng để đăng ký nhận quà.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Vẫn ký, vì phí nhìn rất nhỏ và tôi nghĩ đây là bước xác nhận giống OTP ngân hàng.

| Mức hiểu | Sẽ bấm |
|---|---|
| SAI | VẪN KÝ |

---

### P14 — 26+ tuổi · kỹ sư phần mềm · hiểu bảo mật cơ bản, mới tạo ví Solana

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Toàn bộ USDC-demo bị rút và quyền sở hữu token account bị gán cho một ví khác. Sau khi ký thì mình không thể tự thu hồi bằng mật khẩu như tài khoản web bình thường.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Huỷ. Đây là thay đổi quyền sở hữu, không phải một lệnh nhận token.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | HUỶ |

---

### P15 — 26+ tuổi · nhân viên văn phòng · hiểu nghiệp vụ tài chính nhưng chưa dùng ví tự quản

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Có dấu hiệu tiền hoặc quyền trên ví đang bị chuyển cho bên khác. Tôi chưa hiểu tài khoản token khác với tài khoản ví như thế nào nên chưa kết luận được phạm vi ảnh hưởng.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Cần kiểm tra thêm với nguồn chính thức. Cảnh báo nói còn một chương trình chưa xác minh nên tôi chưa thể chấp thuận.

| Mức hiểu | Sẽ bấm |
|---|---|
| MỘT PHẦN | KIỂM TRA THÊM |

---

### P16 — 26+ tuổi · nhân viên văn phòng · lần đầu nhìn thấy cửa sổ ký giao dịch blockchain

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Tôi không biết chính xác, nhưng màu đỏ với câu không nên ký cho thấy có thể bị mất gì đó trong ví.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Tôi huỷ. Khi không hiểu mà ứng dụng đã cảnh báo nguy hiểm thì dừng là an toàn nhất.

| Mức hiểu | Sẽ bấm |
|---|---|
| MỘT PHẦN | HUỶ |

---

### P17 — 26+ tuổi · kỹ sư phần mềm · có kiến thức blockchain, từng audit giao dịch đơn giản

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Số dư token giảm từ 500 xuống 0 và account owner đổi sang `CRZa…picz`. Chữ ký sẽ cho phép hai thay đổi đó được thực thi; không có cơ chế hoàn tác sau khi giao dịch lên chuỗi.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Huỷ giao dịch. Kết quả mô phỏng đã đủ chứng minh hành động thực tế không khớp mục đích nhận thưởng.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | HUỶ |

---

### P18 — 26+ tuổi · chủ hộ kinh doanh · dùng ví crypto khoảng sáu tháng để nhận thanh toán

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Tôi sẽ mất 500 USDC-demo và người giữ địa chỉ kia có quyền trên tài khoản token của tôi. Nói ngắn gọn là tiền đi và quyền kiểm soát cũng đi.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Huỷ. Tôi chỉ ký khi số tiền đi và địa chỉ nhận đúng với lệnh tôi vừa tạo.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | HUỶ |

---

### P19 — 20–22 tuổi · thường săn airdrop · dùng nhiều ví phụ và chấp nhận rủi ro cao

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Nó lấy sạch 500 USDC-demo rồi chuyển owner token account cho ví kia. Em hiểu ký xong là không lấy lại được.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Em vẫn ký trên ví phụ này vì token là để demo, còn em muốn xem có nhận được 1.000 SOLB không. Ví chính thì em không ký.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | VẪN KÝ |

---

### P20 — 26+ tuổi · giảng viên · có kinh nghiệm đánh giá hệ thống thông tin

**Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?**

> Theo bảng trước và sau, toàn bộ 500 đơn vị token sẽ ra khỏi ví và một chủ thể khác tiếp quản tài khoản token. Tôi cũng lưu ý hệ thống chưa phân tích được một phần ba nội dung giao dịch.

**Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?**

> Tôi cần kiểm tra thêm nguồn giao dịch và phần chưa xác minh. Với thông tin hiện tại, tôi sẽ không ký cho đến khi hai điểm đó được giải thích.

| Mức hiểu | Sẽ bấm |
|---|---|
| ĐÚNG | KIỂM TRA THÊM |

---

## Cách điền hai dòng chấm

Xoá bớt lựa chọn thừa, **để lại đúng một** mỗi ô. Còn nguyên `ĐÚNG / MỘT PHẦN / SAI`
nghĩa là chưa chấm, và script sẽ bỏ qua người đó.

| Mức hiểu | Khi nào |
|---|---|
| **ĐÚNG** | Nêu được **mất tiền** HOẶC **mất quyền kiểm soát** — chỉ cần một trong hai |
| **MỘT PHẦN** | Nêu được một vế, hoặc chỉ nói *"chắc có gì đó nguy hiểm"* |
| **SAI** | Hiểu ngược, hoặc nói chuyện không liên quan |

*"Nó lấy hết tiền của em"* là **ĐÚNG** — không đòi họ nói đúng thuật ngữ.

Hai cột **độc lập**. Người chấm ĐÚNG mà vẫn nói sẽ ký thì sản phẩm đã thất bại — đó là
phát hiện đáng giá nhất của cả đợt, giữ nguyên, đừng sửa.
