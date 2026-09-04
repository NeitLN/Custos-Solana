# Vòng thi hiện tại — nguồn quyết định duy nhất về lịch

> Mọi tài liệu khác **trỏ về file này**, không tự ghi ngày. Ba bản sao của cùng một
> ngày thì sớm muộn cũng lệch, và lệch ở đây nghĩa là cả đội chuẩn bị sai vòng.
>
> Cập nhật lần cuối: **05/09/2026** · Guard: `packages/core/test/lichThi.test.ts`

## 1. Mốc hiện tại

| | |
|---|---|
| **Hạn tiếp theo** | **19/09/2026** |
| Giờ | **chưa xác nhận** — không suy ra từ lịch cũ |
| Vòng nào | **Vòng loại cấp trường** — hạn trình bày. Chủ dự án xác nhận 05/09/2026 |
| Nguồn | **Chủ dự án cung cấp ngày 05/09/2026** |
| Quan hệ với mốc cũ | Thay cho vòng trường 05/09 tại Văn Lang — cùng một vòng, dời ngày |
| Hình thức | chưa xác nhận |

> ⚠️ Mốc 19/09 hiện **chưa có văn bản BTC nào trong repo xác nhận**. Nó đến từ chủ
> dự án. Ghi đúng xuất xứ đó ở đây thay vì gọi nó là "thông báo BTC" — hai thứ khác
> nhau, và nói nhầm thì cả đội mất đường kiểm chứng.

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

**Định dạng 4+2+1 trong `PITCH-VA-PHAN-BIEN.md` khớp Vòng Loại Online Toàn Quốc**,
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

### Câu cần hỏi BTC

- [x] ~~19/09/2026 là hạn của vòng nào?~~ → **vòng loại cấp trường, hạn trình bày**.
- [ ] Mấy giờ, và hình thức gì (online Zoom / offline)?
- [ ] Thời lượng pitch và Q&A của vòng đó?
- [ ] Deliverable bắt buộc gồm những gì?
- [ ] Chung kết là 23/09 (UEF) hay 26/09 (SIHUB)?

## 4. Lịch sử — không xoá, để giữ dấu vết

| Mốc cũ | Trạng thái |
|---|---|
| 05/09/2026 08:00, phòng J.5.3, Đại học Văn Lang | Vòng loại cấp trường. **Không còn là mốc hiện tại.** |
| `docs/KE-HOACH-11-NGAY-CUOI.md` | Kế hoạch viết cho hạn 05/09. Giữ nguyên nội dung. |
| `docs/ROADMAP-DEVNET.md` | Lịch viết 31/08 cho hạn 05/09. Giữ nguyên nội dung. |

Các file đó **không được sửa ngày**: chúng đúng tại thời điểm viết, và sửa lại là
viết đè lên một bản ghi đã đóng. Chúng chỉ được gắn thêm dòng đầu nói rõ chúng thuộc
về hạn cũ.
