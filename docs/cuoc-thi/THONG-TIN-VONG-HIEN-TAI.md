# Vòng thi hiện tại — nguồn quyết định duy nhất về lịch

> Mọi tài liệu khác **trỏ về file này**, không tự ghi ngày. Ba bản sao của cùng một
> ngày thì sớm muộn cũng lệch, và lệch ở đây nghĩa là cả đội chuẩn bị sai vòng.
>
> Cập nhật lần cuối: **25/09/2026** · Guard: `packages/core/test/lichThi.test.ts`

## 1. Mốc hiện tại — đội đã vào CHUNG KẾT

| | |
|---|---|
| **Hạn tiếp theo** | **10/10/2026** — chung kết toàn quốc. Chủ dự án xác nhận 25/09/2026, khớp Learning Hub |
| Track | **Best Technical Build** — Chủ dự án cung cấp và xác nhận 25/09/2026 |
| Vòng loại | **Đã qua** — chủ dự án báo 25/09/2026 đội đã vào chung kết |
| Giờ · địa điểm | **chưa xác nhận** |
| Hình thức theo thể lệ | Thể lệ (BTC cập nhật 21/07) ghi nguyên văn: *"pitch 5 phút + Q&A 3 phút trên sân khấu chính (đèn vàng phút 4, đèn đỏ phút 5). Đội trực booth trong giờ Expo để giám khảo và khách trải nghiệm sản phẩm chạy thật; điểm Expo cộng vào tiêu chí sản phẩm tương ứng."* **Chưa xác nhận** còn áp dụng nguyên cho 10/10 |

> **Ngày chung kết đã rõ: 10/10.** Thể lệ 21/07 mục *Final Demo Day* ghi 26/09 tại SIHUB; Learning Hub
> ghi 10/10. Chủ dự án xác nhận 25/09 là **10/10**. Ngày 26/09 trong thể lệ coi là lịch cũ. **Hình thức**
> của thể lệ (5 + 3 phút, Expo booth) chưa rõ còn áp dụng không — vẫn phải hỏi.
>
> ⚠️ **Một điểm chưa khớp, ghi lại để hỏi, không tự suy.** Learning Hub ghi vòng loại toàn quốc
> Technical ngày 03/10, tức SAU ngày 25/09 chủ dự án báo đã vào chung kết. Có thể đội vô địch vòng
> trường được vào thẳng chung kết; repo không có văn bản nói vậy. `[CẦN XÁC NHẬN BTC]` — nếu đội
> vẫn phải thi 03/10 thì hạn tiếp theo là 03/10, không phải 10/10.

### Trước đó (ghi 25/09, trước khi track được xác nhận)

| | |
|---|---|
| Hạn đã ghi | 02/10 — vòng loại track đăng ký trên form 24/08 (Best Product & Business); 03/10 nếu đã chuyển sang Technical |
| Hình thức vòng loại theo thể lệ | Zoom, 4 phút pitch + 2 phút Q&A + 1 phút chuyển tiếp (mục 2) |
| Nguồn ngày | Learning Hub chính thức `https://unihackfest.vn/learn/` — Claude đọc lại trang ngày 25/09/2026, trích nguyên văn: *"02/10/2026 National qualifier - For teams competing in Best Product & Business"*, *"03/10/2026 National qualifier - For teams competing in Best Technical Build"*, *"10/10/2026 National Final"* |
| Mentor 1:1 | 28/09 — **Chủ dự án cung cấp**. Trang Learning Hub không có lịch mentor riêng của đội; ngày 28/09 trên trang đó là hạn nộp của đội độc lập, không phải lịch mentor |

> Lúc đó hạn chính ghi 02/10 vì chưa có xác nhận track; nay đã có (dòng Track ở trên).

## 2. Điều ĐÃ chắc, theo văn bản BTC trong repo

Lấy từ `Thể lệ UniHackfest 2026.md` (BTC cập nhật 21/07/2026):

| | |
|---|---|
| Track đăng ký | **Best Product & Business** — "Track 1", theo đúng chữ trong thể lệ |
| Track còn lại | Best Technical Build |
| Vòng Loại Online Toàn Quốc | Zoom, **7 phút/đội**: 4 phút pitch + 2 phút Q&A + 1 phút chuyển tiếp |
| Video demo dự phòng | **BẮT BUỘC** — BTC chiếu nếu sự cố kỹ thuật, đội không mất lượt |
| Trình bày | tiếng Việt; slide được dùng thuật ngữ tiếng Anh |
| Chấm | 0–10 mỗi tiêu chí × trọng số; ≥3 giám khảo; ≥5 giám khảo thì loại điểm cao nhất và thấp nhất |

**Định dạng 4+2+1 trong `docs/PITCH-VA-PHAN-BIEN.md` khớp Vòng Loại Online Toàn Quốc**,
không phải định dạng riêng của vòng trường. Nếu 19/09 là vòng khác thì phải kiểm lại
thời lượng trước khi tập pitch — tập sai thời lượng là mất điểm không cứu được.

## 3. Mâu thuẫn CHƯA giải quyết — phải hỏi BTC

Hai văn bản chính thức trong `docs/cuoc-thi/` **nói khác nhau** về vòng chung kết:

| Nguồn | Chung kết | Địa điểm |
|---|---|---|
| `Thể lệ UniHackfest 2026.md` | **26/09/2026** | SIHUB, 273 Điện Biên Phủ, Q3, TP.HCM |
| `Lịch học online… sau Unitour.md` | **23/09/2026** | Trường Đại học Kinh tế – Tài chính (UEF) |

Cả hai đều **sau** 19/09. Suy ra hai điều đội phải xử lý:

1. **19/09 là vòng TRƯỜNG, không phải điểm kết thúc.**
   Roadmap tới 19/09 đang coi đó là vạch đích. Nếu qua vòng, còn một vòng chung kết
   4–7 ngày sau đó, có **Expo booth** (thể lệ: "đội trực booth trong giờ Expo… điểm
   Expo cộng vào tiêu chí sản phẩm") — thứ chưa ai chuẩn bị.
2. **Ngày và địa điểm chung kết phải hỏi lại**, đừng chọn bừa một trong hai. Đặt vé,
   đặt lịch, hay chuẩn bị booth sai ngày là hỏng cả kỳ thi.

> **Cập nhật 25/09:** Learning Hub chính thức ghi chung kết **toàn quốc** 10/10. Hai
> ngày 23/09 và 26/09 ở trên là của các văn bản cũ trong repo; chúng khác cả hai ngày
> đó lẫn nhau. Chưa rõ chúng là lịch cũ đã bị thay, hay một vòng khác — giữ nguyên để
> không ai quên hỏi.

### Câu cần hỏi BTC

- [x] ~~19/09/2026 là hạn của vòng nào?~~ → **vòng loại cấp trường, hạn trình bày**. Đội đạt giải Nhất (chủ dự án báo 25/09).
- [x] ~~Form chấm của đội hiện thuộc track nào?~~ → **Best Technical Build** (chủ dự án xác nhận 25/09).
- [ ] Đội vào thẳng chung kết, hay vẫn thi vòng loại toàn quốc 03/10?
- [ ] Chung kết 10/10: giờ, địa điểm, thời lượng pitch/Q&A, có Expo booth không?
- [ ] Mấy giờ, và hình thức gì (online Zoom / offline) — cho vòng loại toàn quốc?
- [ ] Thời lượng pitch và Q&A có còn 4+2+1 như thể lệ không?
- [ ] Deliverable bắt buộc: video dự phòng, deck, repo/tag, booth?
- [ ] Ngày 23/09 (UEF) và 26/09 (SIHUB) trong văn bản cũ nay còn ý nghĩa gì, khi Learning Hub ghi chung kết 10/10?

## 4. Lịch sử — không xoá, để giữ dấu vết

| Mốc cũ | Trạng thái |
|---|---|
| 19/09 — hạn trình bày vòng loại cấp trường (chủ dự án cung cấp 05/09) | **Đã qua.** Đội đạt giải Nhất cấp trường |
| 05/09/2026 08:00, phòng J.5.3, Đại học Văn Lang | Vòng loại cấp trường. **Không còn là mốc hiện tại.** |
| `docs/KE-HOACH-11-NGAY-CUOI.md` | Kế hoạch viết cho hạn 05/09. Giữ nguyên nội dung. |
| `docs/ROADMAP-DEVNET.md` | Lịch viết 31/08 cho hạn 05/09. Giữ nguyên nội dung. |

Các file đó **không được sửa ngày**: chúng đúng tại thời điểm viết, và sửa lại là
viết đè lên một bản ghi đã đóng. Chúng chỉ được gắn thêm dòng đầu nói rõ chúng thuộc
về hạn cũ.
