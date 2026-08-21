# Pitch 4 phút và phản biện 2 phút

**Vòng loại VLU 05/09** · 4 phút pitch + demo · 2 phút Q&A · 1 phút chuyển tiếp
Rubric: *trình bày và phản biện* chiếm **20%**, *giải pháp và demo* chiếm **30%** — nửa số điểm nằm ở sáu phút này.

---

## 0 · Trục câu chuyện đã đổi — đọc trước khi tập

Nghiên cứu ngày 21/8 (`NGHIEN-CUU-21-08.md`) phát hiện Phantom đã dùng Blowfish, **đã cảnh báo `setAuthority` bất thường**, và Blowfish có luật bắt *"deceptive instructions that hide asset transfers"*. Nghĩa là câu chuyện cũ — *"chúng tôi phát hiện được thứ họ không phát hiện"* — **không đứng vững**.

**Đừng đánh nhau ở chỗ đối thủ mạnh. Đánh vào đường nối.**

| | Cũ — bỏ đi | Mới |
|---|---|---|
| Luận điểm | "Ví lớn chỉ hiện chênh lệch số dư" | "Mô phỏng giao dịch là kỹ thuật đã có. **Vấn đề là lúc mô phỏng không hiểu hết**" |
| Chỗ đứng | Cạnh tranh phát hiện | Cạnh tranh ở **sự im lặng**: khi không hiểu, ví hiện tại không nói gì |
| Bằng chứng | Không có | Ca Coinspect: Blowfish bỏ lọt `assign`, ví chỉ hiện vế hợp lệ |
| Thể hiện trên màn hình | Không có gì | Dòng **"đã phân tích 10/11 instruction"** |

Cấu trúc mới nhượng bộ ngay câu phản đối hiển nhiên, rồi biến nó thành bàn đạp. Đây cũng là cách an toàn nhất về liêm chính: không nói sai một chữ nào về đối thủ.

---

## ⚠️ 1 · Một chỗ hở giữa câu chuyện và thiết kế demo — phải sửa trước 24/8

Giao dịch demo hiện thiết kế là: **swap-legs + `Transfer` + `SetAuthority`**. Cả ba đều decode được.

Nghĩa là coverage sẽ ra **11/11**, và **dòng "đã phân tích 10/11" sẽ không bao giờ xuất hiện.** Nhưng chính dòng đó mới là trục khác biệt mới. Câu chuyện nói một đằng, demo chiếu một nẻo.

**Cách sửa, rẻ và trung thực:** thêm vào giao dịch tấn công **một instruction gọi program nằm ngoài danh sách đã xác minh**. Danh sách xác minh của đội chỉ gồm System, SPL Token, Token-2022, ATA, Orca Whirlpool — nên chỉ cần một lệnh tới SPL Memo với payload nhị phân là coverage tụt xuống 10/11 một cách thật.

Điều này còn **đúng với thực tế**: drainer thật thường gói hành vi độc hại trong program riêng của chúng, và program đó tất nhiên chưa ai xác minh.

**Không cần Rust, không cần deploy gì.** Vai B thêm một instruction vào script dựng giao dịch.

> Nếu không sửa: đến ngày tập pitch mới phát hiện câu chốt không có gì trên màn hình đỡ lưng.

---

## 2 · Cấu trúc 4 phút

| Thời lượng | Nội dung | Ghi chú diễn đạt |
|---|---|---|
| **0:00–0:25** | **Bài toán.** Người mới ký giao dịch mà không hiểu mình vừa ký gì. Ví hiển thị base58 và tên instruction tiếng Anh | Không thuật ngữ. Không nói "Web3". Một câu mẹ bạn hiểu được |
| **0:25–0:40** | **Nhượng bộ trước.** "Ví lớn đã có mô phỏng giao dịch. Phantom cảnh báo `setAuthority`. Chúng tôi không cạnh tranh ở đó." | Nói sớm, nói thẳng. Giám khảo đang nghĩ câu này — lấy nó ra khỏi đầu họ trước |
| **0:40–0:55** | **Đường nối.** "Vấn đề là lúc mô phỏng **không hiểu hết**. Coinspect công bố một ca mô phỏng bỏ lọt instruction đổi quyền sở hữu — ví chỉ hiện vế hợp lệ và im lặng về phần còn lại." | Đây là bản lề. Nói chậm |
| **0:55–2:15** | **Demo.** Nhịp 1 mất tiền → nhịp 2 được cứu, **cùng một giao dịch** | Chỉ tay vào dòng coverage: *"nó nói luôn phần nó chưa hiểu"* |
| **2:15–2:25** | **Một SDK call** trên màn hình | 5–7 giây. Nói: *"Một SDK call để thêm lớp này vào ví hoặc dApp"* |
| **2:25–3:00** | **Sản phẩm và khách hàng.** SDK cho ví và dApp. Người dùng cuối miễn phí, ví trả tiền. Nêu phản hồi thật từ ví/dApp nếu có | Nếu có một chữ "có" từ một đội ví — đây là chỗ nói. Nếu không có thì nói "chúng tôi đang liên hệ", đừng phóng đại |
| **3:00–3:30** | **Vì sao AI, và giới hạn của AI.** AI gộp instruction thành hành động chính. Nhưng verdict do engine luật quyết, AI không được xác nhận an toàn | Câu "AI không được xác nhận an toàn" là câu ghi điểm với giám khảo bảo mật |
| **3:30–4:00** | **Con số thật.** Bao nhiêu luật, bao nhiêu mẫu test, false positive đo trên bao nhiêu giao dịch mainnet thật. Bước tiếp theo | Đọc đúng số. Không làm tròn lên |

**Ba câu phải thuộc lòng nguyên văn:**

1. *"Ví lớn đã có mô phỏng giao dịch. Chúng tôi không cạnh tranh ở đó."*
2. *"Vấn đề là lúc mô phỏng không hiểu hết — và ví hiện tại im lặng về phần đó."*
3. *"Custos không bao giờ nói an toàn khi nó chưa chắc."*

---

## 3 · Năm câu hỏi khó — trả lời trong 20 giây

### 1. "Phantom đã có rồi mà?"

> "Có, và họ làm tốt. Phantom dùng Blowfish, đã cảnh báo `setAuthority`. Chúng tôi không cạnh tranh ở chỗ đó.
> Chỗ khác là khi mô phỏng **không** hiểu hết giao dịch. Coinspect từng công bố một ca Blowfish bỏ lọt instruction `assign` — ví chỉ hiện vế hợp lệ, im lặng về phần còn lại. Custos luôn nói ra phần nó chưa hiểu, và không bao giờ nói 'an toàn' khi chưa chắc."

⚠️ **Phải nói thêm nếu bị hỏi tiếp:** lỗi cụ thể đó **đã được vá**. Luận điểm là về **cấu trúc** — ví cần phương án dự phòng khi mô phỏng thất bại — không phải cáo buộc Phantom đang có lỗ hổng. Nói sai chỗ này là mất điểm liêm chính.

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
> Chúng tôi chưa đưa con số vì chưa có dữ liệu, và chưa có cam kết nào từ ví nào."

> Câu cuối là câu **cố ý** nói ra. Thừa nhận trước thì mất một chút; để giám khảo moi ra thì mất nhiều hơn.

---

## 4 · Bốn câu hỏi mới — phát sinh từ chính tài liệu của đội

### 6. "Mẫu an toàn của các bạn lấy từ đâu?"

> "Ít nhất 6 trong 10 mẫu an toàn là giao dịch **mainnet thật** lấy từ Explorer — swap Jupiter, stake, mua NFT. Mẫu nguy hiểm thì có cả loại chúng tôi tự dựng trên devnet, và chúng tôi **không** tính loại đó vào tỉ lệ báo nhầm. Con số báo nhầm chỉ đo trên giao dịch thật."

### 7. "Nếu Phantom làm tiếng Việt thì các bạn còn gì?"

> "Tiếng Việt là lợi thế khởi động, không phải moat — chúng tôi không giả vờ ngược lại. Thứ tích luỹ được là tập giao dịch đã gắn nhãn, độ phủ của engine luật, và dữ liệu đo xem người Việt có thật sự hiểu cảnh báo không.
> Ngày hôm nay chúng tôi chỉ chứng minh được là đã **bắt đầu** tích luỹ, chưa phải đã có."

### 8. "Cái instruction thứ 11 không hiểu được là gì?"

> "Một program không nằm trong danh sách chúng tôi đã xác minh. Chúng tôi không đoán nó làm gì — đó chính là điểm. Chúng tôi báo là chưa hiểu, hạ verdict xuống mức thận trọng, và để người dùng quyết định."

### 9. "Sao không có smart contract? Vậy có phải Web3 không?"

> "Là lựa chọn có chủ đích. Custos không giữ tài sản, không có smart contract, nên không có bề mặt tấn công on-chain nào. Một lớp bảo mật mà bản thân nó thành mục tiêu tấn công thì hỏng.
> Chúng tôi từng thiết kế một registry on-chain có đặt cọc và đã **bỏ** — nó làm sản phẩm phức tạp hơn mà không giải quyết bài toán chính."

---

## 5 · Những câu **không được nói**

Thể lệ BTC: *trình bày sai về tính năng, dữ liệu hoặc mức hoàn thiện bị trừ điểm hoặc loại.*

| Không nói | Nói thay bằng |
|---|---|
| "Ví lớn chỉ hiển thị chênh lệch số dư" | "Ví lớn đã có mô phỏng. Chúng tôi khác ở chỗ nói ra phần chưa hiểu" |
| "Phantom có lỗ hổng này" | "Đã từng có một ca được công bố và đã được vá. Vấn đề là cấu trúc" |
| "Chúng tôi phát hiện được scam" | "Engine luật phát hiện các hậu quả xác định trong danh sách 12 luật" |
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

## 7 · Lịch tập

| Ngày | Việc |
|---|---|
| **1/9** | Chạy thử lần đầu, bấm giờ. Chấp nhận vỡ thời lượng |
| **2/9** | Sau buổi đọc code chéo — mỗi người tập trả lời 3 câu ngẫu nhiên trong 9 câu ở trên |
| **4/9** | **Ít nhất 5 lượt.** Một người đóng vai giám khảo khó tính, hỏi liên tiếp không nương tay |

**Tiêu chí đạt:** 4 phút không tràn, và cả bốn người trả lời được câu 1 và câu 3 mà không cần nhìn giấy.
