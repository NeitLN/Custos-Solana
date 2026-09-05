# Pitch 4 phút và phản biện 2 phút

**4 phút pitch + demo · 2 phút Q&A · 1 phút chuyển tiếp** — đúng định dạng Vòng Loại
Online Toàn Quốc trong thể lệ BTC. Vòng của hạn 19/09 CHƯA xác nhận dùng định dạng
này; kiểm `docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md` trước khi tập theo đồng hồ.
Rubric: *trình bày và phản biện* chiếm **20%**, *giải pháp và demo* chiếm **30%** — nửa số điểm nằm ở sáu phút này.

---

## 0 · Trục câu chuyện đã đổi — đọc trước khi tập

Nghiên cứu ngày 21/8 (`NGHIEN-CUU-21-08.md`) phát hiện Phantom đã dùng Blowfish, **đã cảnh báo `setAuthority` bất thường**, và Blowfish có luật bắt *"deceptive instructions that hide asset transfers"*. Nghĩa là câu chuyện cũ — *"chúng tôi phát hiện được thứ họ không phát hiện"* — **không đứng vững**.

**Đừng đánh nhau ở chỗ đối thủ mạnh. Đánh vào đường nối.**

| | Cũ — bỏ đi | Mới |
|---|---|---|
| Luận điểm | "Ví lớn chỉ hiện chênh lệch số dư" | "Mô phỏng giao dịch là kỹ thuật đã có. **Vấn đề là lúc mô phỏng không hiểu hết**" |
| Chỗ đứng | Cạnh tranh phát hiện | Cạnh tranh ở **hợp đồng coverage**: Custos luôn trả ra phần nó chưa đọc hiểu, và hiển thị phần đó |
| Bằng chứng | Không có | Ca Coinspect: Blowfish bỏ lọt `assign`, ví chỉ hiện vế hợp lệ |
| Thể hiện trên màn hình | Không có gì | Dòng **"đã đọc hiểu N trên M lệnh"** — đọc đúng số đang hiện, xem mục 1 |

Cấu trúc mới nhượng bộ ngay câu phản đối hiển nhiên, rồi biến nó thành bàn đạp. Đây cũng là cách an toàn nhất về liêm chính: không nói sai một chữ nào về đối thủ.

### Bổ sung 23/08 — nói cùng sự thật đó bằng ngôn ngữ track này

Trục *"mô phỏng không hiểu hết"* **đúng và sắc**, nhưng nó là nhận định của kỹ sư.
Hội đồng track *Best Product & Business* gồm người làm quỹ và người làm sản phẩm.
Với họ, câu đó cần một lớp dịch — **không đổi nội dung, chỉ đổi cách phát âm**:

| Đang nói (ngôn ngữ kỹ sư) | Nói ở track này |
|---|---|
| "Mô phỏng giao dịch không hiểu hết" | "Custos biến **phần nó chưa hiểu** thành một tín hiệu hiển thị ngay lúc ký, và giữ phán quyết ở mức thận trọng" |
| "Coverage 2/3 lệnh" | "Nó tự khai nó chưa hiểu một phần — và **đó là lý do bạn tin được 10 phần kia**" |
| "Engine luật 14 luật xác định" | "Máy quyết định cảnh báo, không phải AI. AI sai thì cảnh báo vẫn đúng" |
| "0 giao dịch bị gắn mã cáo buộc trên 9/20 giao dịch công khai lưu offline" | "Nó không tri hô bừa. Một sản phẩm kêu oan là sản phẩm người dùng học được cách bỏ qua — nhưng cohort này chưa gán nhãn ground truth, nên đây chưa phải tỉ lệ báo nhầm" |

**Câu một hơi thở, dùng ở giây 40:**

> *"Ví nào cũng có lúc không hiểu giao dịch bạn sắp ký. Custos cho bạn thấy đúng
> phần nó chưa hiểu, ngay trước khi bạn bấm."*

### Cập nhật 22/08 — Blowfish đã bị Phantom mua và đóng dịch vụ

Tra ngày 22/08: Phantom đã mua Blowfish, và thông báo mua lại ghi rõ *"the current
service has been sunset"*. `blowfish.xyz` giờ là trang hết hạn tên miền.

**Trên sân khấu, nói ở thì quá khứ:** *"Blowfish — công ty Phantom đã mua lại năm
2024 —"*, đừng nói *"Blowfish đang cung cấp"*. Một giám khảo theo mảng này biết
chuyện đó, và nói sai thì mất uy tín ngay câu đầu.

**Nó cũng cho một luận điểm mạnh mà đội chưa có:** ví lớn nhất Solana **bỏ tiền
mua** đúng năng lực Custos đang làm. Đó là market validation do người khác trả tiền
chứng minh, không phải lập luận đội tự nghĩ.

Câu để dành cho phần mô hình kinh doanh:

> *"Chúng em không cần chứng minh thị trường này có tồn tại. Phantom mua đứt Blowfish
> rồi đóng dịch vụ bán rời của nó — ví lớn nhất Solana trả tiền cho đúng năng lực này.
> Thị trường có thật, và có một chỗ trống."*

> ⚠️ **KHÔNG nói "mọi ví khác không mua được nữa"** — Blockaid vẫn bán cho ví khác,
> nói vậy là sai và tự mâu thuẫn với slide đối thủ. Blowfish chứng minh thị trường
> có thật, không chứng minh hết đối thủ.

Và chuẩn bị sẵn cho câu hỏi ngược: *"Phantom có rồi, sao còn cần các em?"* — trả lời
ở mục 9 bên dưới.

---

## ⚠️ 1 · Một chỗ hở giữa câu chuyện và thiết kế demo — ĐÃ VÁ MỘT NỬA

Giao dịch demo hiện thiết kế là: **swap-legs + `Transfer` + `SetAuthority`**. Cả ba đều decode được.

Nghĩa là coverage sẽ ra **11/11**, và **dòng "đã phân tích 10/11" sẽ không bao giờ xuất hiện.** Nhưng chính dòng đó mới là trục khác biệt mới. Câu chuyện nói một đằng, demo chiếu một nẻo.

**Cách sửa, rẻ và trung thực:** thêm vào giao dịch tấn công **một instruction gọi program nằm ngoài danh sách đã xác minh**. Danh sách xác minh của đội chỉ gồm System, SPL Token, Token-2022, ATA, Orca Whirlpool, ComputeBudget — nên chỉ cần một lệnh tới SPL Memo với payload nhị phân là coverage tụt xuống 10/11 một cách thật.

Điều này còn **đúng với thực tế**: drainer thật thường gói hành vi độc hại trong program riêng của chúng, và program đó tất nhiên chưa ai xác minh.

**Không cần Rust, không cần deploy gì.** Vai B thêm một instruction vào script dựng giao dịch.

> Nếu không sửa: đến ngày tập pitch mới phát hiện câu chốt không có gì trên màn hình đỡ lưng.

### Cập nhật 23/08 — vá được vế quan trọng, vế còn lại thành một quyết định

**Đã vá:** lệnh Memo có thật trong giao dịch tấn công (`scripts/tan-cong.ts`), nên
coverage **thật sự khuyết**, không phải 11/11. Dòng coverage có chỗ dựa.

**Chưa vá:** giao dịch chỉ có **3 lệnh**, không phải 11. Coverage thật đo được là
**2/3**. Các lệnh swap mô tả trong `CUSTOS.md` mục 07 chưa được dựng.

> **KHÔNG ĐƯỢC NÓI "10/11" NỮA.** Con số đó đã bị gỡ khỏi toàn bộ tài liệu. Trên sân
> khấu **đọc đúng con số đang hiện trên màn hình**, dù nó là bao nhiêu. Nói một số
> mà màn hình chiếu một số khác là đúng cái thể lệ gọi là trình bày sai về dữ liệu —
> và giám khảo đang nhìn thẳng vào màn hình lúc bạn nói.

Vai B quyết có dựng thêm các lệnh swap hay không; bảng được-mất ở `CUSTOS.md` mục 07.

---

## 2 · Cấu trúc 4 phút

| Thời lượng | Nội dung | Ghi chú diễn đạt |
|---|---|---|
| **0:00–0:25** | **Bài toán.** Người mới ký giao dịch mà không hiểu mình vừa ký gì. Ví hiển thị base58 và tên instruction tiếng Anh | Không thuật ngữ. Không nói "Web3". Một câu mẹ bạn hiểu được |
| **0:25–0:40** | **Nhượng bộ trước.** "Ví lớn đã có mô phỏng giao dịch. Phantom cảnh báo `setAuthority`. Chúng tôi không cạnh tranh ở đó." | Nói sớm, nói thẳng. Giám khảo đang nghĩ câu này — lấy nó ra khỏi đầu họ trước |
| **0:40–0:55** | **Đường nối.** "Vấn đề là lúc mô phỏng **không hiểu hết**. Coinspect công bố một ca mô phỏng bỏ lọt instruction đổi quyền sở hữu — ví chỉ hiện vế hợp lệ và im lặng về phần còn lại." | Đây là bản lề. Nói chậm |
| **0:55–2:15** | **Demo.** Nhịp 1 mất tiền → nhịp 2 được cứu, **cùng một giao dịch** | Chỉ tay vào dòng coverage: *"nó nói luôn phần nó chưa hiểu"* |
| **2:15–2:25** | **Một SDK call** trên màn hình | 5–7 giây. Nói: *"Một SDK call để thêm lớp này vào ví hoặc dApp"* |
| **2:25–3:10** | **Sản phẩm, khách hàng, và tiền.** SDK cho ví và dApp; người dùng cuối miễn phí. **Mở bằng câu Phantom mua Blowfish rồi đóng dịch vụ bán rời.** Rồi chi phí biên đo được và ba tầng giá | ⚠️ **Đã nới từ 35 giây lên 45.** Ô này chiếm 25% điểm mà bản cũ chỉ cho nó 35 giây, lại chia với phần AI. Cắt 15 giây ở đoạn nhượng bộ và 15 giây ở đoạn AI để bù |
| **3:10–3:30** | **Giới hạn của AI.** Verdict do engine luật quyết, AI không được xác nhận an toàn | Rút còn 20 giây. Giữ **nguyên văn** câu "AI không được xác nhận an toàn" — đó là câu ghi điểm; phần giải thích AI gộp instruction thì bỏ, để dành cho Q&A câu 2 |
| **3:30–4:00** | **Con số thật.** Bao nhiêu luật, bao nhiêu mẫu test, và **0 giao dịch bị gắn mã cáo buộc** trên cohort công khai lưu offline — kèm mẫu số. Bước tiếp theo | Đọc đúng số, không làm tròn lên. ⚠️ **Không gọi con số đó là "false positive"**: cohort chưa gán nhãn ground truth. Và **không nói "mainnet"** — cohort là dữ liệu lưu offline để kiểm engine, còn demo chạy trên Devnet |

**Bốn câu phải thuộc lòng nguyên văn:**

1. *"Ví lớn đã có mô phỏng giao dịch. Chúng tôi không cạnh tranh ở đó."*
2. *"Ví nào cũng có lúc không hiểu giao dịch bạn sắp ký. Custos biến phần chưa hiểu đó
   thành một con số trả về cho ví và hiện lên cho người dùng."* (Nói việc Custos LÀM.
   Đừng chuyển thành câu hỏi tu từ về việc ví khác có làm hay không — đội không đo được.)
3. *"Custos không bao giờ nói an toàn khi nó chưa chắc."*
4. *"Phantom mua đứt Blowfish rồi đóng dịch vụ bán rời của nó — thị trường này ví lớn nhất Solana đã trả tiền chứng minh."* (KHÔNG thêm "không ai mua được nữa" — Blockaid vẫn còn.)

---

## 3 · Năm câu hỏi khó — trả lời trong 20 giây

### 1. "Phantom đã có rồi mà?"

> "Có, và họ làm tốt — **Phantom mua đứt Blowfish năm 2024** để có năng lực đó.
> Chúng tôi không cạnh tranh ở chỗ Phantom mạnh.
> Chỗ khác là khi mô phỏng **không** hiểu hết giao dịch. Coinspect từng công bố một ca mô phỏng bỏ lọt instruction `assign` — ví chỉ hiện vế hợp lệ, im lặng về phần còn lại. Custos luôn nói ra phần nó chưa hiểu, và không bao giờ nói 'an toàn' khi chưa chắc.
> Và Phantom làm điều đó **cho người dùng Phantom, bằng tiếng Anh.** Custos đóng gói
> năng lực kiểm tra thành **SDK** để một ví hoặc dApp nhỏ tự cắm vào được — mã nguồn
> mở, tất định, tiếng Việt, và công khai phần chưa đọc hiểu. Chúng em không tuyên bố
> là giải pháp duy nhất."

⚠️ **Phải nói thêm nếu bị hỏi tiếp:** lỗi cụ thể đó **đã được vá**. Luận điểm là về **cấu trúc** — ví cần phương án dự phòng khi mô phỏng thất bại — không phải cáo buộc Phantom đang có lỗ hổng. Nói sai chỗ này là mất điểm liêm chính.

⚠️ **Nói ở thì quá khứ:** *"Blowfish — công ty Phantom đã mua"*, không nói *"Blowfish đang cung cấp"*. Dịch vụ đó đã đóng, `blowfish.xyz` giờ là tên miền hết hạn.

### 2. "AI ở đây có gì hơn template?"

> "Template chạy được với những mẫu chúng tôi đã biết. Nhưng một giao dịch Solana thật có 8–15 instruction, nhiều program, có cái chưa có IDL — số tổ hợp là vô hạn, số template thì không.
> AI làm hai việc template không làm được: gộp 11 instruction thành một câu về hành động chính, và mô tả hậu quả đo được ngay cả khi không gọi tên được program. Nhưng AI không quyết định verdict."

### 3. "AI có tham gia quyết định verdict không?"

> "Không. Trường `level` chỉ do engine luật tạo ra, AI không chạm vào. AI có trường riêng là `aiAdvisory`, và nó chỉ được yêu cầu người dùng kiểm tra thủ công — không được xác nhận an toàn, không được kết luận nguy hiểm.
> Nếu phần AI hỏng hoàn toàn, người dùng vẫn thấy verdict, bảng chênh lệch và mã lý do."

### 4. "Sao không dùng database cho nhanh?"

> "Chúng tôi **có** dùng database. Custos không ghi gì lên chain — nó là lớp đọc và mô phỏng, không có smart contract.
> Blockchain ở đây là **đối tượng** của sản phẩm chứ không phải nơi lưu trữ: không có `simulateTransaction`, không có SPL Token và Token-2022 để decode, thì không có sản phẩm nào cả."

### 5. "Ai trả tiền, và bao nhiêu?"

> "Ví và dApp, không phải người dùng cuối — người dùng cuối không bao giờ trả tiền cho bảo mật.
> Ba tầng: developer miễn phí có hạn mức, startup trả theo lượt kiểm tra, enterprise thuê bao kèm SLA. Cùng cơ chế các nhà cung cấp RPC Solana đang dùng nên khách đã quen.
> **Neo giá thì có thật:** Helius và QuickNode — hạ tầng chính những khách hàng này đang trả tiền — đều đặt tầng trả tiền đầu tiên ở **$49 một tháng**. Đó là mức thị trường đã quen.
> Nhưng **chúng tôi chưa hỏi được ví nào**, nên chưa có con số của riêng mình, và chưa có cam kết nào."

> Câu cuối là câu **cố ý** nói ra. Thừa nhận trước thì mất một chút; để giám khảo moi ra thì mất nhiều hơn.
>
> Phân biệt cho rõ khi bị hỏi vặn: **$49 là giá của người khác, không phải giá của Custos.** Nó chỉ chứng minh khách hàng mục tiêu đã quen trả tiền hạ tầng theo tháng, ở tầm đó. Nói nó là "định giá đã validate" là nói sai.

---

## 4 · Bốn câu hỏi mới — phát sinh từ chính tài liệu của đội

### 6. "Mẫu an toàn của các bạn lấy từ đâu?"

> "Tập âm là giao dịch **công khai có thật**, lấy từ Explorer rồi **lưu offline** để kiểm engine — swap Jupiter, stake, mua NFT. Mẫu nguy hiểm thì đội tự dựng trên devnet, và chúng em **không** gộp hai loại đó vào một con số.
>
> Nhưng nói thẳng: cohort ấy **chưa gán nhãn ground truth**, nên con số 0 cáo buộc là một QUAN SÁT, không phải tỉ lệ báo nhầm. Muốn nói tỉ lệ báo nhầm thì phải có nhãn đúng/sai cho từng giao dịch — chúng em chưa gán, nên chưa nói."

### 7. "Nếu Phantom làm tiếng Việt thì các bạn còn gì?"

> "Tiếng Việt là lợi thế khởi động, không phải moat — chúng tôi không giả vờ ngược lại. Thứ tích luỹ được là tập giao dịch đã gắn nhãn, độ phủ của engine luật, và dữ liệu đo xem người Việt có thật sự hiểu cảnh báo không.
> Ngày hôm nay chúng tôi chỉ chứng minh được là đã **bắt đầu** tích luỹ, chưa phải đã có."

### 8. "Cái instruction thứ 11 không hiểu được là gì?"

> "Một program không nằm trong danh sách chúng tôi đã xác minh. Chúng tôi không đoán nó làm gì — đó chính là điểm. Chúng tôi báo là chưa hiểu, hạ verdict xuống mức thận trọng, và để người dùng quyết định."

### 9. "Sao không có smart contract? Vậy có phải Web3 không?"

> "Là lựa chọn có chủ đích. Custos không giữ tài sản, không có smart contract, nên không có bề mặt tấn công on-chain nào. Một lớp bảo mật mà bản thân nó thành mục tiêu tấn công thì hỏng.
> Chúng tôi từng thiết kế một registry on-chain có đặt cọc và đã **bỏ** — nó làm sản phẩm phức tạp hơn mà không giải quyết bài toán chính."

---

## 4a · Câu chuyện mạnh nhất đội đang có mà chưa dùng

Ngày 25/08, hệ thống đo của chính đội bắt được **sản phẩm của mình cáo buộc oan**:

```
Ke3aksXuxC75Zs6dYPA1HykM…
transfer SOL → syncNative → add_liquidity (Meteora DLMM) → closeAccount
Custos gắn: ĐỎ
```

Đó là một giao dịch DeFi hoàn toàn bình thường có **mở gói wSOL**. Đóng tài khoản
token luôn trả nó về System Program — luật 12 thấy "đổi chương trình sở hữu" và kêu.
Nghĩa là Custos đang báo Đỏ cho **gần như mọi giao dịch DeFi có dùng SOL trên mainnet**.

Đã vá trong buổi chiều, có test riêng cho ba ca tấn công để không nới nhầm.

### Vì sao đây là tài sản chứ không phải vết nhơ

**Hầu hết đội hackathon không có cơ chế nào phát hiện được lỗi loại này.** Họ demo một
ca đẹp, không đo trên lưu lượng thật, và không bao giờ biết sản phẩm mình kêu oan.

**Nói ở phần con số thật, 3:30–3:55:**

> *"Mười ngày trước hôm nay, phép đo của bọn em bắt chính sản phẩm bọn em báo Đỏ cho
> một giao dịch DeFi bình thường — chỉ vì nó mở gói wSOL. Bọn em vá trong buổi chiều
> và viết test để nó không tái phát.*
>
> *Bọn em kể chuyện này vì đó là thứ phân biệt một sản phẩm bảo mật **đo được** với
> một sản phẩm bảo mật **nghe có vẻ đúng**."*

Câu này mạnh hơn *"0 giao dịch bị gắn mã cáo buộc"* rất nhiều:

| | |
|---|---|
| Con số 0 | Đội nào cũng đọc được, và không ai kiểm chứng được tại chỗ |
| Chuyện tự bắt lỗi mình | **Không đội nào bịa được**, và nó chặn trước câu *"làm sao biết các em không kêu oan?"* — vì bạn vừa kể một lần đã kêu oan |

⚠️ Chỉ kể được nếu số công bố là số **sau khi vá**. Đừng kể chuyện này rồi đọc số cũ.

---

## 4b · Ba câu bổ sung 23/08 — sinh từ bản chấm thử

### 10. ⭐ "Vì sao một ví lớn mua của các em, thay vì tự làm trong hai tuần?"

**Đây là câu quyết định của track này, và chín câu trên KHÔNG có nó.** Câu 1
(*"Phantom có rồi mà?"*) hỏi về **đối thủ**; câu này hỏi về **lý do đội tồn tại với
tư cách một công ty**. Trả lời được thì mở khoá cả ô mô hình kinh doanh.

> "Mô phỏng thì họ tự làm được trong hai tuần. Ba thứ còn lại thì không:
>
> **Một — tập luật đã hiệu chỉnh.** Chúng em đo trên giao dịch công khai có thật (lưu
> offline) để đưa số cáo buộc về 0. Bản đầu của **chính chúng em** kêu oan những lệnh mua bình
> thường — ví nhỏ tiêu 63% số SOL để mua token thì bị gắn cờ. Ai tự làm cũng sẽ đi
> lại đúng đoạn đường đó.
>
> **Hai — kỷ luật không bao giờ nói 'an toàn'.** Đó là quyết định sản phẩm, không phải
> dòng code. Một đội tự làm trong sprint sẽ để AI phán 'giao dịch này an toàn', và
> ngày nó sai là ngày ví mất khách.
>
> **Ba — dữ liệu người Việt có thật sự hiểu cảnh báo không.** Cái đó chỉ đo được bằng
> cách ngồi với người Việt."

⚠️ **Vế ba chỉ được nói SAU KHI đã phỏng vấn xong.** Trước đó thì bỏ vế đó đi, giữ
hai vế đầu — cả hai đều có bằng chứng trong repo.

### 10b. "Sao không dùng Blockaid?"

Câu này hay đi kèm câu Blowfish, và trả lời sai là mất uy tín ngay.

> "Blockaid là bên cung cấp thật và họ làm tốt — chúng em **không** nói họ thiếu gì.
> Khác biệt của chúng em không nằm ở việc phát hiện giỏi hơn, mà ở ba chỗ khác:
> **tiếng Việt cho người mới**, **nói ra phần chưa đọc hiểu được**, và **SDK cắm thẳng
> vào ví Việt Nam**.
>
> Còn một điều thật hơn: chúng em **chưa đo được** Blockaid trên cùng bộ mẫu, nên sẽ không
> tuyên bố hơn kém. Cái chúng em đo được là của chính mình, và số đó công khai."

⚠️ **Không nói** Blockaid bỏ lọt gì, không so tỉ lệ phát hiện. Chưa đo thì không so.

### 11. "Coverage của các bạn chỉ chừng đó. Của Phantom là bao nhiêu?"

**Đừng trả lời bằng số.** Không đo được của họ, và đoán là vi phạm liêm chính. Trả
lời bằng **cấu trúc**:

> "Chúng em không đo được của họ, và sẽ không đoán. Trong tài liệu công khai và các
> bản dựng chúng em kiểm được, **chưa tìm thấy** một trường coverage ở mức từng lệnh
> tương đương — nhưng chúng em không suy rộng sang mọi ví hay mọi phiên bản.
>
> Điều chúng em **đo được** là về chính Custos: nó luôn trả `coverage.analyzed/total`
> và luôn hiển thị con số đó. Khác biệt chúng em nhận là ở chỗ **coverage nằm trong
> hợp đồng của SDK**, không phải ở chỗ hiểu nhiều hơn ai."

### 12. "Custos báo vàng, người dùng vẫn ký và mất tiền. Ai chịu trách nhiệm?"

Câu gài. Trả lời sai là hứa điều không giữ được.

> "Custos không nhận trách nhiệm thay người dùng, và cũng không được phép — đó chính
> là lý do nó **không bao giờ nói 'an toàn'**. Nó không phải một lời bảo đảm, nó là
> một lớp thông tin: nói ra hậu quả đo được, và nói ra phần chưa đo được. Một sản
> phẩm bảo mật hứa 'ký cái này an toàn' là sản phẩm sẽ nói dối vào đúng ngày quan
> trọng nhất."

### 13. "README ghi devnet-only, nhưng số liệu lại đo trên mainnet?"

Một giám khảo kỹ tính sẽ bắt đúng chỗ này. Cả hai đều đúng, nhưng phải nói rõ:

> "Runtime và demo của Custos **chỉ chạy trên Devnet**. Để kiểm engine, đội dùng một
> cohort giao dịch công khai lịch sử đã **lưu offline** — đo trên giao dịch tự dựng
> thì con số không nói lên gì.
>
> Trong 20 giao dịch của cohort, 9 còn mô phỏng được: **0 mã cáo buộc, 7 cảnh báo,
> 2 bình thường**. Cohort chưa có ground truth độc lập, nên đây **không phải** phép đo
> false positive, precision hay recall — nó là một quan sát."

### 14. "331 test chứng minh Custos chính xác chứ?" — ĐỪNG gật

Cái bẫy tự khen. 331 test chứng minh **code có kỷ luật**, KHÔNG chứng minh precision/
recall. Gộp hai thứ là mất liêm chính. Tách rõ **bốn loại bằng chứng, đo bốn thứ khác
nhau**:

| Loại | Đo cái gì | KHÔNG đo cái gì |
|---|---|---|
| **Unit/integration (331)** | Code chạy đúng đặc tả | Không đo độ chính xác trên đời thật |
| **Tấn công tổng hợp** | Luật ĐÃ BIẾT có bắt được ca dựng sẵn | Không đo ca chưa nghĩ tới |
| **Cohort giao dịch công khai lưu offline (9 mô phỏng được)** | Thăm dò — Custos xử lý giao dịch thật ra sao | **Không có ground truth**, nên KHÔNG phải precision/recall/tỉ lệ báo nhầm |
| **User test (nếu có)** | Người thật có hiểu cảnh báo không | Không đo thị trường |

> Câu nói được: *"Chúng em có bốn loại bằng chứng cho bốn câu hỏi khác nhau. 331 test
> cho code, tấn công tổng hợp cho luật đã biết, cohort công khai lưu offline là thăm dò **chưa gán
> nhãn** nên chưa phải số accuracy, và user test cho mức độ hiểu. Chúng em không gộp
> chúng lại thành một con số đẹp."*

Câu này TỰ NÓ ăn điểm liêm chính — nó cho thấy đội biết chính xác mỗi con số chứng
minh được gì và không chứng minh được gì.

---

## 5 · Những câu **không được nói**

Thể lệ BTC: *trình bày sai về tính năng, dữ liệu hoặc mức hoàn thiện bị trừ điểm hoặc loại.*

| Không nói | Nói thay bằng |
|---|---|
| "Ví lớn chỉ hiển thị chênh lệch số dư" | "Ví lớn đã có mô phỏng. Chúng tôi khác ở chỗ nói ra phần chưa hiểu" |
| "Phantom có lỗ hổng này" | "Đã từng có một ca được công bố và đã được vá. Vấn đề là cấu trúc" |
| "Chúng tôi phát hiện được scam" | "Engine luật phát hiện các hậu quả xác định trong danh sách 14 luật" |
| "Dataset của chúng tôi là lợi thế cạnh tranh" | "Đây là bộ kiểm thử. Moat là thứ tích luỹ sau này" |
| "Nhiều ví quan tâm" (khi chưa có ai trả lời) | "Chúng tôi đã liên hệ N đội, hiện có M phản hồi" |
| Làm tròn số mẫu hoặc số luật lên | Đọc đúng con số đang có |

---

## 6 · Khi demo hỏng trên sân khấu

1. **Không sửa live.** Nói ngay: *"Phần demo gặp sự cố, tôi mô tả bằng video dự phòng"* — BTC chiếu video và đội **không mất lượt**.
2. Video 60–90 giây đã nộp trước, có sẵn trong tay BTC.
3. Người pitch tiếp tục nói trong lúc video chạy — đừng đứng im.
4. Đã chuẩn bị: ví nạp sẵn, RPC riêng, giao dịch fixture dựng sẵn không phụ thuộc mạng.

---


### 15. "14 luật có đủ để bảo vệ người dùng không?"

**Không, và Custos không tuyên bố như vậy.**

14 luật phủ một nhóm hậu quả **có tên cụ thể**: đổi chủ tài khoản, cấp quyền rút,
đổi chương trình điều khiển, SOL rời ví, các cơ chế Token-2022. Chúng *không* hiểu
ngữ nghĩa của chương trình DEX.

Điều làm sản phẩm này dùng được không phải là con số 14, mà là việc phần **chưa**
hiểu được hiển thị ra chứ không bị im lặng bỏ qua: *"đã đọc hiểu 2 trên 3 lệnh"*.
Một lớp bảo vệ giấu giới hạn của mình còn nguy hiểm hơn không có lớp nào — vì
người dùng sẽ tin nó ở đúng chỗ nó mù.

> Câu chốt: *"14 luật bắt được nhóm hậu quả chúng em định nghĩa được. Phần còn lại
> Custos nói thẳng là chưa đọc hiểu, và giữ phán quyết ở mức thận trọng."*

---

### 16. "82 % coverage có phải là 82 % chính xác không?" — ĐỪNG gật

**Không. Hai đại lượng khác nhau, và gộp chúng là sai nặng nhất trong cả bài.**

| | Đo cái gì | Cần gì để đo |
|---|---|---|
| **Coverage 82 %** | tỉ lệ lệnh Custos **đọc hiểu được** | chỉ cần chạy engine |
| **Độ chính xác** | tỉ lệ phán quyết **đúng** | cần ground truth cho từng giao dịch |

Cohort chưa gán nhãn ground truth, nên đội **không có** con số chính xác và không
công bố con số nào như vậy. Hai chiều đều xảy ra được: coverage cao mà luật sai thì vẫn ra phán quyết sai;
coverage thấp mà luật đúng thì vẫn gắn cờ đúng chỗ.

> Câu chốt: *"82 % là phần Custos đọc hiểu được, không phải phần nó đoán đúng.
> Muốn nói độ chính xác thì phải có nhãn đúng/sai cho từng giao dịch — chúng em
> chưa gán, nên chưa nói."*

---

### 17. "Tại sao 11 trên 20 giao dịch không còn mô phỏng được?"

`simulateTransaction` chạy trên **trạng thái chuỗi hiện tại**, không phải trạng thái
lúc giao dịch xảy ra. Giao dịch lịch sử tham chiếu tới tài khoản đã đóng, số dư đã
đổi, blockhash đã hết hạn — càng cũ càng dễ hỏng. Đây là tính chất của cách đo, không
phải code kém đi.

Điều đáng nói là **script đếm và báo số bỏ qua** thay vì lặng lẽ thu nhỏ mẫu số. Nếu
giấu, coverage sẽ trông như đang cải thiện trong khi thật ra chỉ còn lại những mẫu dễ.

> Câu chốt: *"Mẫu rụng vì mô phỏng chạy trên trạng thái chuỗi hôm nay. Chúng em báo
> 9/20 chứ không âm thầm báo 100 % của 9."*

---

### 18. "Có dữ liệu người dùng thật chưa?"

**Rồi — 20 người, ngày 29–30/08/2026.**

> *"Chúng em hỏi 20 người, chiếu đúng màn hình cảnh báo rồi hỏi hai câu tách nhau.
> **13/20 nêu được hậu quả** — mất tiền hoặc mất quyền kiểm soát. 5 người hiểu
> một phần, 2 người hiểu sai.*
>
> *Và **4/20 vẫn ký** dù đã thấy cảnh báo. Nhưng 2 trong số đó **hiểu đúng** hậu quả
> rồi vẫn ký có ý thức, vì họ dùng ví phụ và token demo không có giá trị. Chỉ
> **2 người ký vì đọc nhầm màn hình** — và đó mới là chỗ sản phẩm thất bại."*

**Ba điều phải nói kèm, đừng bỏ điều nào:**

1. **"Một phần" KHÔNG gộp vào "đúng".** Gộp một lần là mất độ tin của mọi con số khác.
2. **Đo trên bản giao diện ngày 29–30/08.** Tấm cảnh báo đã được thiết kế lại sau đó
   (01/09 và 04/09). Nội dung không đổi, hình thức thì đổi — **đừng nói *"đo trên
   đúng màn hình các anh chị vừa xem"***.
3. **Một người hỏi cả 20, qua tin nhắn và video call.** Không trôi thang chấm giữa
   nhiều người hỏi, nhưng cũng **không có ai chấm chéo**. Qua tin nhắn thì không quan
   sát được thời gian đọc, và người trả lời có thời gian tra cứu.

**Hai phát hiện đáng nói hơn con số:**

- Cả 2 người ký nhầm đều **neo vào một chi tiết trấn an**, không phải vì thiếu cảnh
  báo: một người bám dòng phí *"0,000005 SOL, chắc chỉ trừ đúng phí đó"*, một người
  bám chữ *"demo"*. Cảnh báo hiện đủ; thứ kéo họ đi là chi tiết nhỏ bên cạnh.
- Người **hiểu đúng mà vẫn ký** không phải lỗi sản phẩm — họ nói rõ đang dùng ví phụ.
  Giữ nguyên con số đó thay vì giấu; nó chứng minh đội đọc được cả kết quả xấu.

Biên bản đầy đủ, đã ẩn danh: `docs/BIEN-BAN-PHONG-VAN.md`. Số đếm bằng
`scripts/kiem-phong-van.ts`, không đếm tay.

> ⚠️ File ví dụ `data/seed/phong-van.example.json` mang cờ `laViDu` và script **từ
> chối** in con số sân khấu cho nó. Đừng đọc số minh hoạ.

---

### 19. "SDK đã ai tích hợp từ ngoài chưa?"

Phân biệt hai câu hỏi khác nhau, và trả lời cả hai:

| Câu hỏi | Trả lời |
|---|---|
| Gói **cài được** từ ngoài monorepo chưa? | **Rồi, có kiểm tự động.** `npm run thu-goi` cài tarball vào một project trống ngoài repo và chạy bằng `node` trần từ JavaScript thuần. Chạy trong CI mỗi lần đẩy code |
| Đã có **ví bên thứ ba** nào tích hợp chưa? | **Chưa.** Đó là bước tiếp theo, không phải thứ đã xong |

Gói nằm trên npm: `@custos-solana/core`, `@custos-solana/ai`, `@custos-solana/types`.
Bản `0.1.0` **hỏng** (`main` trỏ vào TypeScript nguồn) — đã deprecate; dùng `0.1.1`
trở lên. Đội nói ra chuyện đó thay vì lờ đi.

---

### 20. "Cây phụ thuộc của các em có lỗ hổng không?"

**Có, và số đó nằm ngay trong README.**

`npm audit` cho 9 lỗ hổng (3 high, 6 moderate) tính tới ngày đo gần nhất, tất cả
trong nhánh `@solana/web3.js` v1 — `bigint-buffer`, `jayson`, `stream-json`, `uuid`.

Dứt điểm cần lên web3.js v2, một breaking change lớn, và đội **chọn không** làm
trước hạn thi. Đó là đánh đổi có ý thức, nói ra được.

Con số này đo bằng `scripts/do-lo-hong.mjs`, lưu kèm ngày, và **có test canh** để
README không trôi khỏi phép đo. Nó tăng theo thời gian khi có CVE mới, nên phải đo
lại trước buổi thi.

> Câu chốt: *"Có. Một sản phẩm bảo mật giấu cây phụ thuộc của chính nó thì không
> đáng tin hơn cái nó đang cảnh báo — nên chúng em in số đó ra."*

---

## 7 · Lịch tập

| Ngày | Việc |
|---|---|
| **1/9** | Chạy thử lần đầu, bấm giờ. Chấp nhận vỡ thời lượng |
| **2/9** | Sau buổi đọc code chéo — mỗi người tập trả lời 3 câu ngẫu nhiên trong 9 câu ở trên |
| **4/9** | **Ít nhất 5 lượt.** Một người đóng vai giám khảo khó tính, hỏi liên tiếp không nương tay |

**Tiêu chí đạt:** 4 phút không tràn, và cả bốn người trả lời được **câu 1, câu 3 và câu 10** mà không cần nhìn giấy.

> Câu 10 là câu build-vs-buy. Ở track này nó quan trọng ngang câu 1 — và nó là câu
> duy nhất trong danh sách mà **không ai trong đội từng tập trả lời** trước 23/08.
