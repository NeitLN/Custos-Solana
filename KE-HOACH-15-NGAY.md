# Custos — Kế hoạch thực thi 15 ngày

**22/08 → 05/09/2026** · Đội 4 người, vibe code với Claude Code · Vòng loại VLU 05/09, 08:00, phòng J.5.3

> Tài liệu này là **kế hoạch**, không phải lệnh build. Chưa viết code, chưa cài dependency, chưa tạo ví, chưa gọi faucet, chưa deploy cho tới khi có lệnh `DUYỆT KẾ HOẠCH – BẮT ĐẦU BUILD`.

---

## 0 · Ba việc phải làm trong 48 giờ

Cả ba đều **không phải code**, và cả ba đều có thể làm hỏng kế hoạch nếu để muộn.

| # | Việc | Vì sao gấp | Ai |
|---|---|---|---|
| 1 | **Thử dựng giao dịch tấn công trên devnet.** Kiểm tra xem có route swap nào chạy được trên devnet không | Thanh khoản devnet rất mỏng, các router phổ biến hướng về mainnet. Nếu swap không chạy được thì **đổi hành động chính** sang thứ chắc chắn chạy (gửi USDC cho bạn, mua NFT) — câu chuyện "phát hiện hành động không thuộc hành động chính" không cần swap. Phát hiện điều này ngày 23/8 là điều chỉnh; phát hiện ngày 2/9 là tai nạn | B |
| 2 | **Nhắn 3–5 đội ví/dApp Solana có người dùng Việt.** Một câu: *"Nếu có SDK cảnh báo tiếng Việt trước khi ký, các bạn có thử không?"* | Kinh doanh chiếm **25%** rubric và hiện có **0 xác thực**. Kế hoạch cũ có 20 phỏng vấn người dùng cuối — những người không bao giờ trả tiền — và 0 cuộc với người trả tiền. Chi phí: vài tin nhắn. Một chữ "có" biến giả thuyết thành bằng chứng | D |
| 3 | ~~Hỏi BTC hạn nộp~~ — **ĐÃ CÓ: hạn nộp 05/09**, trùng ngày thi | ✅ xong | D |

**Việc thứ tư, rẻ và nên làm luôn:** mở thử Phantom hoặc một sản phẩm của Blowfish, xem output thật của họ. Cả năm vòng phản biện đều giả định họ chỉ hiển thị chênh lệch số dư. Nếu họ đã làm gần với "lệch hành động chính" thì phải biết trước khi lên sân khấu nói khoảng trống đó.

---

## 1 · Phạm vi đã cắt cho 4 người

Bản `CUSTOS.md` mô tả sản phẩm đầy đủ. Đây là phần **thực sự làm trong 15 ngày**.

| Hạng mục | Trong file | Cắt còn | Lý do |
|---|---|---|---|
| Luật L2 | 11 | **8** | Luật 5, 7, 10 (transfer hook · freeze authority · ALT) chuyển P1. Tám luật có test tốt thuyết phục hơn mười một luật nửa vời |
| Seed dataset | 30–50 | **25** | 12 nguy hiểm · 10 an toàn tương tự · 3 ca không đủ dữ liệu |
| Phỏng vấn người dùng | 20 | **12** | Thời gian chuyển sang 3–5 cuộc với ví/dApp — đúng nhóm trả tiền |
| Dashboard | Có | **Cắt hẳn** | Không xuất hiện trong demo 4 phút. Không làm |
| Demo Wallet | Tối giản | Giữ nguyên | Là thứ chứng minh hình dạng sản phẩm |

**Tám luật giữ lại:**

| # | Luật | Verdict |
|---:|---|---|
| 1 | `SetAuthority` đổi `AccountOwner` của tài khoản token người ký | Đỏ |
| 2 | `SetAuthority` gán `CloseAccount` hoặc `Freeze` cho bên thứ ba | Đỏ |
| 3 | `Approve` delegate hạn mức vượt ngưỡng bất thường | Đỏ |
| 4 | Token-2022 có Permanent Delegate | Vàng — Đỏ khi chính PD đó transfer/burn lên tài khoản người dùng |
| 6 | Mint authority chưa thu hồi | Vàng |
| 8 | Ví nhận tạo dưới 24 giờ và nhận giá trị lớn | Vàng |
| 9 | Program không nằm trong danh sách đã xác minh | Vàng |
| 11 | Outflow không khớp với các leg còn lại của giao dịch | Vàng — Đỏ khi trùng luật Đỏ khác |

*Giữ nguyên số hiệu gốc để đối chiếu với `CUSTOS.md`.*

---

## 2 · Chia việc và giao kèo phối hợp

### Bốn vai

| Vai | Sở hữu | Sản phẩm bàn giao |
|---|---|---|
| **A · Core** | Custos Core: L1 bóc tách + L2 tám luật + đóng gói SDK | `custos.inspect()` chạy được, có bộ test |
| **B · Bề mặt demo** | Demo Wallet · trang tấn công giả · giao dịch devnet · deploy | Demo chạy end-to-end trên link công khai |
| **C · AI và tiếng Việt** | L3: nhận diện hành động chính · diễn giải · `aiAdvisory` · toàn bộ chữ tiếng Việt trong giao diện | Câu giải thích đọc được, không lộ thuật ngữ |
| **D · Bằng chứng và pitch** | Seed dataset · liên hệ ví/dApp · phỏng vấn người dùng · deck · video · nộp hồ sơ | 25 mẫu gắn nhãn, 3–5 phản hồi khách hàng, deck, video 60–90s |

### Giao kèo quan trọng nhất: **đóng băng kiểu dữ liệu ngày đầu tiên**

Bốn người vibe code trên cùng một repo sẽ giẫm chân nhau nếu không có ranh giới. Ranh giới ở đây là **kiểu trả về của `inspect()`** — chốt ngày 22/8, không đổi nữa:

```ts
type InspectResult = {
  level: "safe" | "warning" | "danger";        // CHỈ L2 tạo ra — A sở hữu
  aiAdvisory: "review_required" | null;         // CHỈ L3 tạo ra — C sở hữu
  detectedPrimaryAction: { type: string; from?: string; to?: string } | null;  // C
  diff: Array<{ label: string; before: string; after: string; severity: string }>;  // A
  reasonCodes: string[];                        // A
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };    // A
  explanation: string;                          // C
};
```

Khi kiểu này đã đóng băng: **B dựng giao diện với dữ liệu giả ngay từ ngày 22/8**, không phải chờ A và C xong. Ba người chạy song song thật sự thay vì xếp hàng.

**Ba quy tắc vận hành cho đội vibe code:**

1. **Mỗi người một thư mục, không sửa chéo.** Muốn đổi thứ của người khác thì nhắn, không tự sửa.
2. **Commit mỗi ngày, mỗi người.** BTC yêu cầu *"repo public có lịch sử commit thể hiện quá trình build thật"*. Dồn hết vào hai commit cuối là tự bắn vào chân.
3. **Ngày 02/9 có buổi đọc code chéo.** Mỗi người phải giải thích được phần mình làm trong 2 phút. Code AI viết mà không ai hiểu sẽ chết trong 2 phút Q&A — và Thể lệ ghi rõ sản phẩm phải do đội tự xây.

---

## 3 · Lịch theo ngày

### Giai đoạn A — Khử rủi ro · 22–24/8 (3 ngày)

| Ngày | Việc |
|---|---|
| **22/8** *(sáng có Training Session 2 tại VLU)* | Cả đội: chốt kiểu `InspectResult`, chia thư mục, tạo repo public, commit đầu tiên. **D hỏi BTC hạn nộp.** **B bắt đầu spike giao dịch devnet.** **D gửi tin nhắn đầu tiên cho ví/dApp** |
| **23/8** | **B: kết luận về giao dịch demo** — swap chạy được hay phải đổi hành động chính. A: L1 gọi `simulateTransaction`, lấy được chênh lệch số dư thô. C: thử prompt nhận diện hành động chính trên 2–3 giao dịch mẫu |
| **24/8** | A: decode SPL Token, ra `diff` đúng định dạng. B: khung Demo Wallet hiển thị dữ liệu giả. C: câu giải thích tiếng Việt đầu tiên. D: bắt đầu thu mẫu dataset |

> **Cổng 24/8:** giao dịch demo đã chốt hình dạng. Nếu chưa, **dừng mọi việc khác cho tới khi chốt** — không có giao dịch thì không có demo, không có demo thì không được xếp lịch thi.

### Giai đoạn B — Dựng lõi · 25–30/8 (6 ngày)

| Ngày | A · Core | B · Demo | C · AI | D · Bằng chứng |
|---|---|---|---|---|
| 25/8 | Luật 1, 2, 3 (nhóm Đỏ) | Demo Wallet ký được trên devnet | Nhận diện hành động chính ổn định | 8 mẫu dataset |
| 26/8 | Test cho luật 1–3, mỗi luật 1 ca an toàn | Trang tấn công giả | `aiAdvisory` + quy tắc bất đối xứng `expectedAction` | 14 mẫu · tổng hợp phản hồi ví/dApp |
| 27/8 | Luật 4, 6, 9 | Nối Demo Wallet với Custos Core thật | Trường `coverage` hiển thị đúng | 18 mẫu |
| 28/8 | Luật 8, 11 | Màn cảnh báo theo đúng bản dựng | Chỉnh chữ theo phản hồi phỏng vấn | Bắt đầu 12 phỏng vấn người dùng |
| 29/8 | Chạy toàn bộ dataset, sửa false positive | Deploy link công khai | Ba mức diễn đạt theo trình độ | 25 mẫu xong · nháp deck |
| 30/8 | Khoá engine luật | **Demo chạy end-to-end lần đầu** | Khoá nội dung chữ | Xong phỏng vấn |

> **Cổng 30/8 — mốc cứng nhất:** demo phải chạy hết một lượt, dù xấu. Nếu chưa: **cắt L3 xuống chỉ còn diễn giải cho đúng ba luật Đỏ**, bỏ phần nhận diện hành động chính cho các ca còn lại. Giữ demo sống quan trọng hơn giữ tính năng.

### Giai đoạn C — Hoàn thiện và bằng chứng · 31/8–2/9 (3 ngày)

| Ngày | Việc |
|---|---|
| **31/8** | Đo false positive trên 10 ca an toàn, công bố con số thật dù xấu. Đánh bóng giao diện cảnh báo |
| **1/9** | Deck hoàn chỉnh 8–10 slide. Chạy thử pitch 4 phút lần đầu, bấm giờ |
| **2/9** | **Buổi đọc code chéo.** Quay video 60–90s. Chuẩn bị ví nạp sẵn và RPC riêng |

### Giai đoạn D — Nộp và tập · 3–4/9 (2 ngày)

> ⚠️ **Hạn nộp là 05/09 — TRÙNG NGÀY THI.** Nghĩa là **không có vùng đệm**. Nộp muộn hôm đó thì không kịp sửa gì cả, và Thể lệ ghi rõ hồ sơ trễ thì không được xếp lịch thi.
>
> **Quy tắc tự đặt: coi hạn nộp là hết ngày 04/09.** Nộp sớm một ngày, còn ngày 5/9 chỉ để tập và xử lý sự cố. Đây là kỷ luật tự nguyện, không phải yêu cầu của BTC — nhưng nộp đúng ngày thi là đặt cược vào việc không có gì hỏng vào phút chót.

| Ngày | Việc |
|---|---|
| **3/9** | Hoàn tất mọi hạng mục hồ sơ: link demo · repo public · deck · video |
| **4/9** | **NỘP HỒ SƠ.** Sau đó chạy thử pitch **ít nhất 5 lần**, có người đóng vai giám khảo hỏi 5 câu khó. Chuẩn bị kịch bản khi demo hỏng |
| **5/9** | 08:00 thi. Chỉ tập và kiểm tra thiết bị — không sửa code |

### 5/9 — Thi *(và là hạn nộp cuối cùng nếu chưa nộp)*

Đến sớm, thử máy chiếu và mạng, mở sẵn Explorer và ví nạp tiền. Vào phòng chờ trước 5 phút.

---

## 4 · Bốn đường cắt bỏ

Cắt theo lịch là quyết định. Cắt vào phút chót là tai nạn.

| Mốc | Điều kiện | Cắt gì |
|---|---|---|
| **24/8** | Giao dịch swap không chạy được trên devnet | Đổi hành động chính sang gửi USDC hoặc mua NFT. Giữ nguyên câu chuyện |
| **27/8** | Chưa có 3 luật chạy kèm test | Xuống **5 luật**: giữ 1, 2, 3, 9, 11 |
| **30/8** | Demo chưa chạy end-to-end | L3 chỉ diễn giải ba luật Đỏ. Bỏ nhận diện hành động chính cho ca khác |
| **1/9** | Dataset dưới 15 mẫu | Nộp đúng con số thật. **Không phóng đại** — Thể lệ ghi rõ trình bày sai về mức hoàn thiện bị trừ điểm hoặc loại |

---

## 5 · Bốn phút trên sân khấu

| Thời lượng | Nội dung |
|---|---|
| 0:00–0:30 | Bài toán. Một câu ai cũng hiểu, không thuật ngữ |
| 0:30–1:50 | **Demo.** Nhịp 1 mất tiền · nhịp 2 được cứu, cùng một giao dịch |
| 1:50–2:00 | Chiếu một SDK call, 5–7 giây |
| 2:00–2:40 | Sản phẩm là gì, ai dùng, ai trả tiền. Nêu phản hồi thật từ ví/dApp nếu có |
| 2:40–3:20 | Vì sao AI không phải template · vì sao AI không quyết định verdict |
| 3:20–4:00 | Con số thật: bao nhiêu luật, bao nhiêu mẫu test, false positive bao nhiêu. Bước tiếp theo |

> **Bảng trên đã lỗi thời sau nghiên cứu 21/8.** Cấu trúc 4 phút mới, chín câu hỏi khó có sẵn câu trả lời, danh sách câu không được nói, và lịch tập nằm ở **`PITCH-VA-PHAN-BIEN.md`**. Dùng bản đó.

---

## 6 · Rủi ro riêng của đội vibe code

| Rủi ro | Xử lý |
|---|---|
| Bốn người sửa chéo, xung đột liên tục | Đóng băng `InspectResult` ngày 22/8 · mỗi người một thư mục · một người duy nhất gộp nhánh |
| Code chạy được nhưng không ai giải thích được | Buổi đọc code chéo 2/9, mỗi người 2 phút. Thể lệ yêu cầu sản phẩm do đội tự xây |
| Lịch sử commit trông như đổ một lần | Mỗi người commit mỗi ngày từ 22/8 |
| Bỏ test — thói quen thường gặp khi vibe code | Seed dataset **chính là** bộ test. Không có mẫu thì không tính là xong luật |
| Demo hỏng trên sân khấu | Video 60–90s nộp trước · ví nạp sẵn · RPC riêng · BTC chiếu video dự phòng và đội không mất lượt |

---

## 7 · Hồ sơ nộp bài — kiểm tra trước **4/9**

- [ ] **Link demo chạy được** trên devnet, mở từ máy khác vẫn vào được
- [ ] **Repo public** có lịch sử commit trải đều từ 22/8
- [ ] **Pitch deck** 8–10 slide, nộp trước để BTC load sẵn
- [ ] **Video demo 60–90 giây**, quay màn hình thao tác live, không dàn dựng
- [ ] **Thông tin đăng ký**: track Best Product & Business · chủ đề AI × Web3 · danh sách 4 thành viên

> Thiếu bất kỳ mục nào, hoặc nộp trễ, hoặc không có demo chạy được ⇒ **không được xếp lịch thi**.

---

## Chờ lệnh

Kế hoạch này chưa được thực thi. Để bắt đầu build, gửi:

`DUYỆT KẾ HOẠCH – BẮT ĐẦU BUILD`
