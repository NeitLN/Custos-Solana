# Kịch bản video demo 60–90 giây

**Bắt buộc nộp.** Thể lệ: *"60–90 giây, quay màn hình thao tác live, **không dùng
mockup dàn dựng**"*. Thiếu là hồ sơ có thể bị loại — không phải trừ điểm.

Video còn là **phao cứu sinh**: nếu demo chết trên sân khấu, BTC chiếu video và
**đội không mất lượt**.

---

## 0 · Chuẩn bị — làm xong hết rồi mới bấm quay

```bash
# 1. Dựng lại hiện trường devnet cho sạch (số dư về đúng 500)
node --experimental-strip-types scripts/dung-hien-truong.ts

# 2. Hai server
npm run dev -w @custos-solana/demo-wallet -- --port 5188 --strictPort
npm run tan-cong        # cổng 5189
```

| Việc | Vì sao |
|---|---|
| Đóng hết tab khác, tắt thông báo | Một cái pop-up Messenger là quay lại từ đầu |
| Phóng trình duyệt lên **125–150 %** | Giám khảo xem trên máy chiếu, chữ nhỏ là mất trắng phần bảng chênh lệch |
| Ẩn bookmark bar | Bớt nhiễu |
| Quay **cả cửa sổ trình duyệt**, không quay toàn màn hình | Không lộ desktop |
| Chuẩn bị sẵn **hai tab**: `localhost:5189` và `localhost:5188` | Không phải gõ URL trong lúc quay |

> **Kiểm tra trước khi quay:** bấm thử một lượt từ đầu tới cuối. Nếu devnet chậm
> hoặc `429`, cắm RPC riêng (`docs/VIEC-CUA-BAN.md` mục 4) rồi hãy quay.

---

## 1 · Chọn một trong hai bản

### Bản A — ký thật trên devnet *(mạnh hơn, chọn bản này nếu có `VITE_DEMO_SECRET`)*

Nhịp 1 ký thật, tiền đi thật, xem được trên Explorer. Không gì thuyết phục bằng.
Sau mỗi lần quay phải chạy lại `dung-hien-truong.ts` để nạp lại 500 token.

### Bản B — không có khoá ký

Nhịp 1 dùng màn **"Nếu bạn ký mà không có Custos"**, dán nhãn *"Kết quả mô phỏng"*.
Vẫn trung thực tuyệt đối vì con số đến từ mô phỏng thật. Mở ví bằng
`localhost:5188/?khongkhoa=1`.

> Cả hai bản đều **không dàn dựng**. Bản B chỉ nói rõ nó là mô phỏng — và đó chính
> là điều thể lệ đòi.

---

## 2 · Kịch bản — 85 giây, lời thoại đọc gần đúng

**Không tua nhanh. Không cắt đoạn chờ.** Giám khảo cần thấy nó chạy thật; đoạn chờ
3 giây là bằng chứng có mô phỏng thật chạy, không phải điểm yếu.

| Giây | Trên màn hình | Nói |
|---|---|---|
| **0–8** | Tab `localhost:5189` — trang *SolBonus*, trông hiền lành | "Đây là một trang phát thưởng. Nhìn không có gì đáng ngờ." |
| **8–14** | Bấm **nhận quà**. Ví bật lên | "Người dùng bấm nhận quà. Ví mở ra." |
| **14–20** | *(Bản A: tắt công tắc Custos, bấm ký)* · *(Bản B: màn "Nếu bạn ký mà không có Custos")* | "Nếu ví không có lớp kiểm tra nào — đây là thứ họ nhận được." |
| **20–30** | **Dừng ở số dư 0 và dòng đổi chủ. Im lặng 2 giây.** | *(không nói gì — để con số tự nói)* |
| **30–36** | *(Bản A: chạy lại, bật Custos)* · *(Bản B: bấm **Xem Custos chặn nó**)* | "Cùng đúng giao dịch đó. Lần này có Custos." |
| **36–44** | Đợi `inspect()` chạy — **đừng cắt** | "Nó mô phỏng giao dịch trước khi ký." |
| **44–56** | Màn cảnh báo. Chỉ vào câu đầu | "Toàn bộ token bị chuyển đi, và tài khoản đổi chủ. Một câu, không thuật ngữ." |
| **56–66** | Chỉ vào bảng chênh lệch, cột **trước → sau** | "Đây là hậu quả đo được, không phải danh sách lệnh." |
| **66–78** | **Chỉ vào dòng "Đã đọc hiểu 2 trên 3 lệnh"** | "Và đây là chỗ khác biệt: nó tự khai phần nó **chưa** hiểu. Ví hiện tại im lặng về phần đó." |
| **78–85** | Bấm **Chặn & huỷ giao dịch** | "Người dùng huỷ. Mất hai giây thay vì mất sạch ví." |

**Câu ở giây 66–78 là câu quan trọng nhất của cả video.** Nếu phải cắt cho vừa 90
giây thì cắt chỗ khác.

---

## 3 · Ba câu tuyệt đối không được nói

| Không nói | Vì sao |
|---|---|
| "Đã phân tích 10/11 lệnh" | **Con số thật là 2/3.** Đọc số không khớp màn hình là trình bày sai dữ liệu |
| "Custos xác nhận giao dịch này an toàn" | Sản phẩm không bao giờ nói an toàn — đó là quyết định đã khoá |
| "AI phát hiện ra nguy hiểm" | Verdict do engine luật quyết. AI chỉ được đề nghị kiểm tra thủ công |

**Đọc đúng con số đang hiện trên màn hình**, dù nó là bao nhiêu. Giám khảo đang nhìn
thẳng vào màn hình lúc bạn nói.

---

## 4 · Sau khi quay

- Quay **ít nhất 2 lần**, giữ cả hai. Lần hai luôn mượt hơn lần một.
- Có **phụ đề tiếng Việt** hoặc lời nói rõ — máy chiếu hội trường thường tậm tịt tiếng.
- Xuất **MP4 1080p**, dưới 100 MB cho dễ nộp.
- Xem lại **có tắt tiếng** một lượt: chỉ nhìn hình có hiểu chuyện gì đang xảy ra không?
  Nếu không thì phóng to chưa đủ.
- Kiểm tra khung hình **không lộ**: khoá riêng, đường dẫn có tên thật, tab lạ.

---

## 5 · Nếu quay hỏng đúng đêm cuối

Quay bằng điện thoại chĩa vào màn hình còn hơn không có video. Thể lệ đòi *thao tác
live*, không đòi chất lượng điện ảnh. Một video hơi rung mà thật vẫn qua; không có
video thì hồ sơ thiếu hạng mục bắt buộc.
