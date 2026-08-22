# Chấm thử — vai giám khảo Track *Best Product & Business*

**Ngày chấm:** 23/08/2026 · người chấm: Claude, đóng vai giám khảo khó tính
**Căn cứ:** rubric trong `docs/cuoc-thi/Thể lệ UniHackfest 2026.md`, và **trạng thái repo tại commit `9e5e0f3`**

> Đây là bản chấm giả định, không phải điểm thật. Giá trị của nó nằm ở chỗ chỉ ra
> **giám khảo sẽ hỏi gì mà đội chưa trả lời được** — không nằm ở con số.

---

## 0 · Bảng điểm

| Tiêu chí | Trọng số | Đội tự chấm | **Tôi chấm** | Chênh |
|---|---:|---:|---:|---:|
| Bài toán thị trường & người dùng mục tiêu | 25 % | 9,0 | **6,5** | −2,5 |
| Giải pháp, demo chạy được, trải nghiệm | 30 % | 9,0 | **8,5** | −0,5 |
| Mô hình kinh doanh, doanh thu, GTM | 25 % | 8,0 | **5,5** | −2,5 |
| Trình bày, thuyết phục, phản biện | 20 % | 9,0 | **7,0** | −2,0 |
| **Tổng có trọng số** | | **8,8** | **6,95** | **−1,85** |

**Khoảng cách 1,85 điểm này tự nó là một phát hiện.** `CUSTOS.md` mục 13 đang tự
chấm 8,8. Repo là public. Nếu một mentor hoặc giám khảo đọc con số đó rồi đối chiếu
với những gì đội chứng minh được hôm nay, thì cái mất không phải 1,85 điểm — mà là
**uy tín của mọi con số khác trong tài liệu**, kể cả những con số đội đo rất cẩn thận.

Đây là điều oái oăm nhất: phần còn lại của repo trung thực đến mức khắt khe. Mục 13
là chỗ duy nhất đội để cảm xúc lấn vào. Sửa nó là việc rẻ nhất trong toàn bộ tài liệu này.

---

## 1 · Chẩn đoán một câu

> **Đội đã xây một sản phẩm kỹ thuật xuất sắc, rồi đăng ký thi vào track không chấm chủ yếu phần đó.**

Trong rubric này, **50 % số điểm** nằm ở *bài toán thị trường* (25 %) và *mô hình
kinh doanh* (25 %). Cả hai đều được chứng minh bằng **người**: người dùng đã hỏi,
khách hàng đã nhắn, con số đã tính.

Số người ngoài đội đã chạm vào Custos tính đến hôm nay: **0**.
Số ví/dApp đã được nhắn: **0**.
Số dòng tính chi phí một lượt kiểm tra: **0**.

Trong khi đó: 232 test, 14 luật, 4 lỗ hổng Critical đã tự tìm và tự vá, coverage đo
đi đo lại theo phương pháp có kỷ luật. **Toàn bộ khối lượng đó đổ vào tiêu chí 30 %,
và tiêu chí đó đội đã gần chạm trần.** Mỗi giờ thêm vào engine luật giờ đổi được
rất ít điểm. Mỗi giờ đổ vào hai tiêu chí kia đổi được nhiều gấp bội.

Nếu đội thi **Track 2 — Best Technical Build**, tôi chấm khác hẳn: rubric đó có
*độ khó kỹ thuật* 30 % + *kiến trúc on-chain/off-chain* 25 % + *tận dụng Solana
stack* 25 %. Nhưng track đã đăng ký, và **giám khảo chấm theo đúng rubric của track
đã đăng ký** — thể lệ ghi rõ.

> Không phải lời khuyên đổi track. Quyết định "không có smart contract" (mục 05 của
> `CUSTOS.md`) là quyết định đúng cho sản phẩm nhưng sẽ bị trừ nặng ở tiêu chí
> *kiến trúc on-chain/off-chain* 25 % của Track 2. Ở lại Track 1 là đúng.
> Vấn đề là **phải chơi theo luật của Track 1.**

---

## 2 · Chấm từng tiêu chí

### 2.1 · Bài toán thị trường & người dùng — 6,5/10 · trọng số 25 %

**Được:**

- Nỗi đau hiểu được trong 10 giây, không cần biết crypto. Đây là thứ nhiều đội
  không có và không mua được.
- Tách **người dùng cuối** khỏi **khách hàng trả tiền** ngay từ mục 02 — nhiều đội
  sinh viên nhập nhèm chỗ này và chết ở Q&A.
- Loại sàn tập trung ra khỏi nhóm khách hàng đầu tiên, có lý do. Biết nói *"không
  phải khách của tôi"* là dấu hiệu đội đã nghĩ thật.

**Mất:**

**a) Toàn bộ phần "người dùng mục tiêu" là giả thuyết, không phải quan sát.**

Chân dung *"người Việt mới dùng crypto dưới 12 tháng"* xuất hiện trong tài liệu như
một sự thật. Nhưng chưa ai trong số đó được hỏi. Câu tôi sẽ hỏi ở giây thứ 30 của
Q&A: **"Các em đã cho bao nhiêu người thuộc nhóm đó xem màn hình này?"** — hôm nay
câu trả lời là 0, và mọi thứ nói sau đó đều mất trọng lượng.

Đau ở chỗ: đội **đã** có phương pháp đo đúng (`docs/VIEC-CUA-BAN.md` mục 2 — không
giải thích trước, không hỏi "có dễ hiểu không", không bỏ người trả lời sai). Thiết
kế phép đo tốt hơn phần lớn đội thi. Chỉ là **chưa chạy**.

**b) Bài toán đang được kể bằng ngôn ngữ kỹ thuật.**

Trục khác biệt hiện tại — *"mô phỏng không hiểu hết"* — là một nhận định **đúng và
sắc**, nhưng nó là nhận định của kỹ sư. Giám khảo track này gồm người làm quỹ và
người làm sản phẩm. Với họ, câu đó cần một lớp dịch:

| Đang nói | Nên nói ở track này |
|---|---|
| "Mô phỏng giao dịch không hiểu hết" | "Ví hiện tại **im lặng về phần chúng không hiểu**. Custos là cái duy nhất chịu nói ra" |
| "Coverage 2/3 lệnh" | "Nó tự khai nó chưa hiểu một phần — và đó là lý do bạn tin được phần kia" |

Cùng một sự thật, nhưng vế phải bán được. **Đừng đổi nội dung, đổi cách phát âm.**

**c) Không có một con số thị trường nào.**

Không TAM, không SAM, không số ví Solana, không số người dùng crypto Việt Nam.
Ở track *Business*, một slide thị trường không có số là một slide trống.

> Có một con số công khai rất mạnh mà tài liệu chưa dùng: **Chainalysis Global
> Crypto Adoption Index** — Việt Nam nhiều năm liền đứng nhóm đầu thế giới. Hãy
> **tự tra lại bản mới nhất** trước khi đưa lên slide, và ghi rõ năm. Nếu đúng như
> vậy, đó là số liệu bên thứ ba, miễn phí, và nói đúng cái đội cần nói: thị trường
> này không nhỏ và không phải đội tự nghĩ ra.

---

### 2.2 · Giải pháp, demo, trải nghiệm — 8,5/10 · trọng số 30 %

**Đây là chỗ đội mạnh, và mạnh thật.** Ba thứ tôi tin ngay:

- Demo **chạy trên devnet thật**, có hiện trường thật, không phải mockup.
- Con số báo nhầm đo trên **giao dịch mainnet thật**, và đội **không** gộp mẫu tự
  dựng vào con số đó. Kỷ luật này hiếm.
- Dòng *"đã đọc hiểu N trên M lệnh"* là **ý tưởng sản phẩm tốt nhất trong toàn bộ dự
  án**, và tôi nghĩ đội chưa nhận ra nó tốt đến mức nào. Nó biến điểm yếu (không
  đọc hiểu hết) thành thứ duy nhất tạo được lòng tin. Không đối thủ nào hiển thị
  con số đó. **Đây mới là cái nên đóng khung trên slide, không phải 14 luật.**

**Mất — và ba cái đều sửa được trước 04/09:**

**a) Giám khảo bấm vào link demo công khai thì KHÔNG thấy được nhịp 1.**

Bản deploy cố ý không nhúng khoá ký. Quyết định đó **đúng về bảo mật** và tôi tán
thành. Nhưng hệ quả sản phẩm thì nặng:

> Kịch bản demo (`CUSTOS.md` mục 07) dựa vào **hai nhịp**: nhịp 1 ký và mất tiền,
> nhịp 2 cùng giao dịch đó nhưng được cứu. **Sức thuyết phục nằm ở nhịp 1.**
> Người bấm link công khai chỉ xem được nhịp 2 — tức là xem một cảnh báo về một
> mối nguy họ chưa từng thấy xảy ra.

Ở Final Demo Day có giờ **Expo**, giám khảo tự trải nghiệm, và thể lệ ghi *"điểm
Expo cộng vào tiêu chí sản phẩm tương ứng"*. Một giám khảo tự bấm mà không thấy hậu
quả sẽ chấm thấp hơn hẳn người ngồi xem đội trình diễn.

**Cách sửa, không cần khoá:** thêm chế độ **"Xem chuyện gì xảy ra nếu không có
Custos"** — bấm vào thì hiện trạng thái *sau* của chính giao dịch đó (số dư về 0,
tài khoản đổi chủ), lấy từ **kết quả mô phỏng đã có sẵn** chứ không ký thật. Dữ liệu
đã nằm trong tay: `simulateTransaction` trả đúng trạng thái sau. Không ký, không
khoá, không dàn dựng — vẫn trung thực tuyệt đối, vì đó là hậu quả thật do mô phỏng
tính ra. **Ước 3 giờ, và nó vá đúng chỗ hở lớn nhất của phần 30 %.**

**b) Chưa ai ngoài đội tích hợp thử SDK.**

Điểm bán là *"một SDK call"*. Người duy nhất từng gọi nó là chính đội. Câu hỏi
*"có ai ngoài đội cài thử chưa?"* hiện không có câu trả lời.

**Rẻ và mạnh:** tìm **một** dev Solana ngoài đội (Superteam Vietnam), gọi video 30
phút, để họ tự cài và gọi `inspect()`, **bấm giờ**. Nếu họ chạy được trong 20 phút,
đội có một câu không ai bẻ được: *"Một dev chưa từng thấy repo này tích hợp xong
trong 20 phút, chúng em có ghi hình."* Đó là bằng chứng sản phẩm **và** là traction
đầu tiên. Một buổi tối.

**c) Căng thẳng giữa "devnet only" và "đo trên mainnet".**

`README.md` ghi *"Devnet only, chưa dùng cho mainnet"*, nhưng con số báo nhầm lại đo
trên mainnet. Cả hai đều đúng — đọc mainnet để đo thì được, khuyến nghị dùng thật
thì chưa. Nhưng một giám khảo kỹ tính sẽ bắt đúng chỗ này. **Chuẩn bị sẵn một câu:**
*"Chúng em đọc và mô phỏng mainnet để đo — đó là lý do con số báo nhầm có giá trị.
Nhãn devnet-only là về khuyến nghị triển khai, không phải về giới hạn kỹ thuật."*

---

### 2.3 · Mô hình kinh doanh, doanh thu, GTM — 5,5/10 · trọng số 25 %

**Đây là điểm chết. 25 % số điểm, và là phần yếu nhất.**

**Được:** neo giá Helius/QuickNode $49 là việc làm thật, tra bảng giá công khai chứ
không phỏng đoán — và đội **tự ghi rõ đó không phải validation**. Ba tầng
Developer/Startup/Enterprise hợp lý. Tách rõ ai không bao giờ trả tiền.

**Mất:**

**a) Không có đơn vị kinh tế. Và đội tính được ngay hôm nay, không cần hỏi ai.**

Đây là **khuyến nghị quan trọng nhất trong toàn bộ tài liệu này.**

Một lượt `inspect()` gồm những lượt gọi RPC đếm được — đọc thẳng từ
[`fetch.ts`](packages/core/src/l1/fetch.ts) và [`ten-token.ts`](packages/core/src/l1/ten-token.ts):

```
getAddressLookupTable   × số bảng ALT
getMultipleAccounts     × 1–2   (trạng thái trước + đọc ký hiệu token)
simulateTransaction     × 1
getFeeForMessage        × 1
------------------------------------------
≈ 4–6 lượt gọi RPC, cộng tuỳ chọn 1 lượt gọi mô hình ngôn ngữ
```

Cả ba mảnh giá đều tra được công khai: Helius bán **$5 / triệu credit**; giá token
của mô hình có trên trang giá nhà cung cấp; số token mỗi lượt gọi thì **đội đo được
bằng chính bộ đánh giá đã có** (`scripts/danh-gia-mo-hinh.ts` đã chạy với mô hình thật).

Ra được ba con số này là đủ dựng một slide mà rất ít đội sinh viên có:

> **Chi phí biên một lượt kiểm tra: khoảng $X.
> Bán ở tầng $49/tháng cho N lượt ⇒ biên lợi nhuận gộp Y %.**

**Ước 2–3 giờ. Không phải hỏi ai. Toàn bộ dữ liệu đã nằm trong repo.** Đây là thứ
đưa tiêu chí này từ 5,5 lên khoảng 7,5 — tức **+0,5 điểm tổng**, đắt hơn mọi việc
kỹ thuật còn lại cộng lại.

**b) Luận điểm mạnh nhất về thị trường đang nằm nhầm chỗ.**

*"Phantom mua đứt Blowfish rồi đóng dịch vụ bán rời"* là **market validation do
người khác bỏ tiền chứng minh** — thứ mạnh nhất một đội sinh viên có thể có ở mục
này. Nó đang nằm trong `PITCH-VA-PHAN-BIEN.md` như một mẹo trả lời Q&A.

**Nó phải là câu mở của phần mô hình kinh doanh**, không phải phương án phòng thủ:

> *"Thị trường này không cần chúng em chứng minh. Ví lớn nhất Solana đã bỏ tiền mua
> đúng năng lực này — rồi đóng cửa dịch vụ bán rời. Nghĩa là hôm nay mọi ví và dApp
> khác **không mua được nữa**. Đó là chỗ chúng em đứng."*

Nó vừa chứng minh thị trường có thật, vừa giải thích vì sao có khoảng trống, vừa
chặn trước câu *"Phantom có rồi mà?"*. Ba việc trong một câu 15 giây.

**c) GTM chưa có trình tự.**

Hiện có danh sách nơi tiếp cận (Superteam VN, Privy, ví có người dùng Việt) nhưng
không có **thứ tự và cột mốc**. Giám khảo track này muốn nghe: *khách hàng đầu tiên
là ai, tiếp cận thế nào, mất bao lâu, dấu hiệu nào cho biết đã đúng hướng.*

Ba dòng là đủ:

| Giai đoạn | Ai | Dấu hiệu đúng hướng |
|---|---|---|
| 0–3 tháng | 2–3 ví/dApp Việt qua Superteam VN | 1 đội tích hợp bản miễn phí |
| 3–9 tháng | Nền tảng ví nhúng mở rộng sang ĐNÁ | Hợp đồng trả tiền đầu tiên |
| 9 tháng+ | Ví khu vực ngoài Việt Nam | Doanh thu định kỳ, có SLA |

**d) Chưa có một cuộc trò chuyện nào với khách hàng.** Không LOI, không email, không
tin nhắn Telegram. `docs/VIEC-CUA-BAN.md` mục 3 đã soạn sẵn tin nhắn mẫu. **Gửi đi.**
Kể cả bị từ chối vẫn hơn im lặng: *"Chúng em nhắn 8 đội, 3 trả lời, 1 nói sẽ thử nếu
có bản mainnet"* là traction thật. *"Chúng em đang liên hệ"* thì không là gì cả.

---

### 2.4 · Trình bày, thuyết phục, phản biện — 7,0/10 · trọng số 20 %

**Được — và được nhiều hơn đội tưởng:**

`PITCH-VA-PHAN-BIEN.md` là tài liệu pitch tốt hơn phần lớn đội sinh viên tôi từng
chấm. Mục 5 *"những câu không được nói"* là thứ tôi gần như không bao giờ thấy — nó
cho thấy đội hiểu rằng **nói quá một chữ là mất nhiều hơn được**. Việc sửa
Blowfish sang thì quá khứ sau khi tra lại là đúng loại cẩn thận mà giám khảo mảng
này nhận ra ngay.

**Mất:**

**a) Chưa có slide, chưa có video, chưa tập lần nào.** Đây là 20 % số điểm, và tính
đến 23/08 nó vẫn ở dạng văn bản. Video demo là **hạng mục nộp bắt buộc** — thiếu là
hồ sơ bị loại, không phải trừ điểm.

**b) Thiếu hẳn câu hỏi khó nhất của track này.**

Đội chuẩn bị 9 câu. Không câu nào là câu tôi chắc chắn sẽ hỏi:

> ### **"Vì sao một ví lớn mua của các em, thay vì tự làm trong hai tuần?"**

Đây là câu **build-vs-buy**, và ở track *Business* nó là câu quyết định. Câu
*"Phantom có rồi mà?"* mà đội đã chuẩn bị **không** thay thế được — câu đó hỏi về
đối thủ, câu này hỏi về **lý do tồn tại của đội với tư cách một công ty**.

Trả lời được, gợi ý — và cái hay là **cả ba vế đội đều đã có thật**:

> "Mô phỏng thì họ tự làm được trong hai tuần. Ba thứ còn lại thì không:
>
> **Một — tập luật đã hiệu chỉnh.** Chúng em mất hai tuần và đo trên giao dịch
> mainnet thật để đưa số cáo buộc sai về 0. Bản đầu của chính chúng em kêu oan
> những lệnh mua bình thường. Ai tự làm cũng sẽ đi lại đúng đoạn đường đó.
>
> **Hai — kỷ luật không bao giờ nói 'an toàn'.** Đó là quyết định sản phẩm, không
> phải dòng code. Một đội tự làm trong sprint sẽ để AI phán 'giao dịch này an toàn',
> và ngày nó sai là ngày ví mất khách.
>
> **Ba — người Việt có thật sự hiểu cảnh báo không.** Cái đó chỉ đo được bằng cách
> ngồi với người Việt. Đó là thứ chúng em tích luỹ, và không nằm trong repo."

*(Vế ba chỉ nói được **sau khi** đã phỏng vấn xong. Trước đó thì không được nói.)*

**c) Nhịp 4 phút đang dành quá ít cho phần chiếm 50 % điểm.** Bản hiện tại:
0:00–0:55 bài toán và đường nối · 0:55–2:15 demo · 2:25–4:00 sản phẩm, AI, số liệu.
Tức phần **kinh doanh chỉ có khoảng 35 giây**, và bị chia với phần AI.

Đề xuất chỉnh: cắt 15 giây ở đoạn nhượng bộ (0:25–0:40 — nói gọn hơn, vẫn đủ ý) và
15 giây ở đoạn AI (giữ đúng câu *"AI không được xác nhận an toàn"*, bỏ phần còn
lại), dồn **30 giây đó cho đơn vị kinh tế và GTM**. Đổi 30 giây lấy một phần tư số
điểm là đổi có lời.

---

## 3 · Sáu câu tôi sẽ hỏi trong Q&A — và tình trạng hiện tại

| # | Câu hỏi | Trả lời được chưa | Sửa mất bao lâu |
|---|---|---|---|
| 1 | Các em đã cho bao nhiêu người dùng thật xem màn hình này? | ❌ đang là 0 | 3 buổi tối, cả đội |
| 2 | Một lượt kiểm tra tốn của các em bao nhiêu? Biên lợi nhuận ở $49? | ❌ chưa tính | **2–3 giờ** |
| 3 | Có ai ngoài đội tích hợp thử SDK chưa? | ❌ chưa | 1 buổi tối |
| 4 | Vì sao ví mua của các em thay vì tự làm hai tuần? | ⚠️ có nguyên liệu, chưa thành câu | 30 phút |
| 5 | Coverage 80 % — của Phantom là bao nhiêu? | ⚠️ không đo được, cần câu trả lời cấu trúc | 30 phút |
| 6 | Custos báo vàng, người dùng vẫn ký và mất tiền — ai chịu trách nhiệm? | ⚠️ mục 11 có nền, chưa thành câu | 30 phút |

**Về câu 5** — đừng cố trả lời bằng số, vì không đo được và đoán là vi phạm liêm
chính. Trả lời bằng cấu trúc:

> "Chúng em không đo được của họ, và sẽ không đoán. Điều đo được là: **họ không hiển
> thị con số đó.** Người dùng không có cách nào biết ví vừa hiểu bao nhiêu phần giao
> dịch. Custos luôn nói ra. Khác biệt không phải ở việc hiểu nhiều hơn — mà ở chỗ
> **chịu khai phần mình chưa hiểu.**"

**Về câu 6** — câu này gài. Trả lời sai là hứa điều không giữ được:

> "Custos không nhận trách nhiệm thay người dùng, và cũng không được phép — đó là lý
> do nó **không bao giờ nói 'an toàn'**. Nó không phải một lời bảo đảm, nó là một
> lớp thông tin: nói ra hậu quả đo được, và nói ra phần chưa đo được. Một sản phẩm
> bảo mật hứa 'ký cái này an toàn' là sản phẩm sẽ nói dối vào đúng ngày quan trọng nhất."

---

## 4 · Thứ tự việc cần làm, xếp theo điểm đổi được trên mỗi giờ

| Ưu tiên | Việc | Giờ | Tiêu chí | Ước điểm tổng |
|---|---|---:|---|---:|
| **1** | **Đơn vị kinh tế + biên lợi nhuận**, tính từ code | 2–3 | KD 25 % | **+0,5** |
| **2** | Phỏng vấn 12 người dùng thật | 3 buổi tối | Bài toán 25 % | **+0,6** |
| **3** | Chế độ *"nếu không có Custos"* cho bản demo công khai | 3 | Demo 30 % | **+0,3** |
| **4** | Nhắn 8 ví/dApp — gửi thật, ghi lại phản hồi | 1 buổi tối | KD 25 % | **+0,3** |
| **5** | Câu build-vs-buy + hai câu Q&A còn thiếu | 1 | Phản biện 20 % | **+0,2** |
| **6** | Một dev ngoài đội tích hợp thử, bấm giờ, ghi hình | 1 buổi tối | Demo 30 % | **+0,2** |
| **7** | Sửa mục 13 `CUSTOS.md` về con số trung thực | 0,5 | Liêm chính | *chống mất điểm* |
| **8** | Dịch trục câu chuyện sang ngôn ngữ kinh doanh | 1 | Bài toán + trình bày | **+0,2** |
| — | Video 60–90 giây, slide, tập 5 lượt | — | **Bắt buộc nộp** | *thiếu là loại* |

Làm hết mục 1–8: khoảng **6,95 → 8,2**. Không mục nào đòi viết thêm luật, thêm test,
hay mở rộng decoder.

> **Việc kỹ thuật giờ nên dừng.** Coverage 80 %, 232 test, 0 cáo buộc sai — đưa lên
> 85 % không đổi được điểm nào ở track này. Thời gian còn lại thuộc về hai tiêu chí
> mà đội chưa động tới.

---

## 5 · Điều tôi muốn nói với tư cách giám khảo, ngoài bảng điểm

Phần lớn đội sinh viên tôi chấm mắc lỗi ngược lại với đội này: họ có slide đẹp, có
TAM sáu chữ số, và một sản phẩm không chạy. Đội này có sản phẩm chạy thật, đo thật,
tự tìm ra lỗi của chính mình rồi ghi lại vào commit message — **bao gồm cả những lỗi
không ai bắt được nếu đội không tự khai.** Cái đó không dạy được, và không diễn được.

Nhưng rubric không chấm phẩm chất. Nó chấm bốn ô, và đội đang bỏ trống hai ô rưỡi.

Thứ đứng giữa 6,95 và 8,2 không phải kỹ năng — đội thừa kỹ năng. Nó là **bốn buổi
tối làm những việc không giống lập trình**: gọi điện, hỏi người lạ, cộng vài phép
tính chi phí, và tập nói. Đó là phần khó chịu nhất với một đội kỹ thuật giỏi, và
cũng là phần duy nhất còn lại có giá.

---

## Phụ lục — đã làm gì sau bản chấm này

Cập nhật 23/08, sau khi thực thi. Bảng ở mục 4 là bảng gốc; đây là trạng thái thật.

| # | Việc | Của ai | Trạng thái |
|---|---|---|---|
| 1 | Đơn vị kinh tế tính từ code | Claude | ✅ `docs/DON-VI-KINH-TE.md` — thiếu biên lợi nhuận (cần khoá, bảng credit, giá bán) |
| 2 | Phỏng vấn 12 người | Đội | ⬜ công cụ đã dựng: `/phong-van.html` |
| 3 | Chế độ "nếu không có Custos" | Claude | ✅ |
| 4 | Nhắn 8 ví/dApp | Đội | ⬜ |
| 5 | Câu build-vs-buy + 2 câu Q&A thiếu | Claude | ✅ `PITCH-VA-PHAN-BIEN.md` mục 4b — thành 4 câu |
| 6 | Dev ngoài đội tích hợp thử | Đội | ⬜ |
| 7 | Sửa mục 13 `CUSTOS.md` | Claude | ✅ 8,8 → 6,95, kèm cột trần thấy được |
| 8 | Dịch trục câu chuyện sang ngôn ngữ kinh doanh | Claude | ✅ `PITCH` mục 0, bảng bốn dòng |

**Ngoài bảng, hai việc phát sinh khi thực thi:**

- Trang số liệu công khai `/so-lieu.html` và bộ đo phỏng vấn `/phong-van.html`
- **Một lỗi trình bày nghiêm trọng bị bắt khi kiểm chứng:** mọi tài liệu ghi coverage
  demo là **10/11**; đo thật ra **2/3**. Con số đã bị gỡ khỏi toàn bộ tài liệu, và
  chỗ hở giữa thiết kế với bản dựng ghi thành một quyết định ở `CUSTOS.md` mục 07.

*— Chấm ngày 23/08/2026, tại commit `9e5e0f3`; phụ lục cập nhật cùng ngày*
