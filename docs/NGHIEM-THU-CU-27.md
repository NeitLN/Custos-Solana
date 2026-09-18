# CU-27 — Nghiệm thu bản nâng cấp

**Đo tại HEAD `11380bf`, ngày 18/09/2026.** Mọi con số dưới đây đến từ lượt chạy
thật trong phiên nghiệm thu này, không chép lại từ báo cáo cũ.

Thẻ đòi **bốn nhóm kết luận tách riêng**, vì trộn chúng là cách một dự án tự khen
mình: *"sản phẩm đã kiểm"*, *"bằng chứng người dùng"*, *"hồ sơ nộp"* và *"việc chờ
quyền"* trả lời bốn câu hỏi khác nhau, và mạnh yếu rất khác nhau.

---

## 1 · Sản phẩm đã kiểm

| Lát cắt | Kết quả | Lệnh |
|---|---|---|
| Typecheck + bộ test | **953 pass · 0 fail** | `npm run check` |
| Cổng tích hợp tất định | **14/14**, fixture, không mạng | `npm run thu-tich-hop:deterministic` |
| Gói dùng được từ ngoài | **7/7** trên tarball thật | `npm run thu-goi` |
| — bẫy đối kháng trên gói | **10/10 bị chặn** | (trong `thu-goi`) |
| — ranh giới trình duyệt | **0 file dist** kéo module Node-only | (bước 7/7) |
| Tích hợp **live Devnet** | PASS · 3 kịch bản · RPC thật | `npm run thu-tich-hop:devnet` |
| Đối kháng lớp AI | `soSai: 0` | `npm run doi-khang` |
| Ranh giới L2/L3 | 13/13 ca giữ nguyên `level` | `scripts/ky-thuat/qa-ranh-gioi-l3.mjs` |
| Accessibility (axe) | 0 vi phạm serious/critical | `scripts/kiem-trinh-duyet/soi-trinh-duyet.py` |
| Inspector trên Chromium | TẤT CẢ PASS | `scripts/kiem-trinh-duyet/soi-inspector.py` |
| Cổng sản phẩm | **10 đạt · 0 chưa rõ** | `npm run kiem-san-pham` |

### Hiệu năng (n=195 warm, đã bỏ 5 lượt đầu)

| Phép tính | Trung vị |
|---|---|
| L2 `danhGia` | 0,003 ms |
| Dựng biên lai | 0,089 ms |
| Chạy lại từ biên lai | 0,117 ms |
| Lô 20 giao dịch | 0,032 ms |
| **Một lượt `inspect()` có RPC** | **649 ms** |

Bốn dòng đầu là phần **tất định**, không chạm mạng. Dòng cuối mới là thứ người
dùng cảm nhận. Đọc bốn dòng đầu thành *"Custos chạy trong 0,1 ms"* là phóng đại,
dù mọi con số đều đúng.

---

## 2 · Bằng chứng người dùng và người mua

Nhóm này **yếu hơn hẳn** nhóm 1, và phải nói ra.

| Ô | Thực tế |
|---|---|
| Phỏng vấn người mua | **0** — đội quyết định không làm kỳ này |
| Bên thứ ba tích hợp | **0** — ví dụ tích hợp do chính đội dựng |
| Usability vòng 2 | chưa chạy |
| Eval với mô hình thật | `BLOCKED_BY_SECRET` — cần `ANTHROPIC_API_KEY` |

**Probe tự động không phải usability research.** `soi-inspector.py` chứng minh giao
diện *chạy được*; nó không chứng minh người thật *hiểu được*. Hai câu khác nhau, và
chỉ câu đầu có bằng chứng.

**Bộ test không đo độ chính xác phát hiện.** Nó đo **không hồi quy**. Cohort mainnet
chưa có ground truth từng giao dịch, nên không có confusion matrix — xem
`docs/BENCHMARK.md`.

---

## 3 · Hồ sơ nộp

`npm run nop-bai` → **7/10**.

| ✓ | Mục |
|---|---|
| ✓ | Bộ test xanh · 953 pass |
| ✓ | Ví dụ tích hợp chạy được · 8/8 kịch bản |
| ✓ | Deck dựng lại được từ dữ liệu |
| ✓ | Ảnh dự phòng máy tính + điện thoại · 8 ảnh |
| ✓ | **Video demo dự phòng** · `CUSTOS-DEMO.mp4` + `.srt` |
| ✓ | Gói AI có bản vá trên registry · 0.2.0 · 10/10 |
| ✓ | Metadata repo · 7 topic |
| · | Cây làm việc sạch — còn 2 file chưa commit **của chủ dự án** |
| · | Lịch thi xác nhận đủ — 4 câu chưa hỏi BTC |
| · | Release tag cố định — chưa có tag |

---

## 4 · Việc chờ quyền chủ dự án

Không việc nào dưới đây được thực thi trong phiên này.

| Việc | Vì sao chờ |
|---|---|
| Tạo release tag `v0.2.0` | Tag là cam kết công khai. Chạy `npm run nop-bai -- --strict` trước |
| Gỡ `@custos-solana/ai@0.1.2` | Cần đăng nhập npm |
| Eval mô hình thật | Cần khoá API — **đặt biến môi trường, đừng dán vào chat** |
| Nhắn ví/dApp | Roadmap cấm Claude tự gửi tin |
| Xác nhận lịch BTC + track đăng ký | `TB-H01`/`TB-H02` vẫn `WAIT_INPUT` |

---

## 5 · Trạng thái 28 thẻ CU

**5 DONE · 23 PARTIAL · 0 TODO**, cộng **4 nhánh DEFERRED_SCOPE** (nhánh có điều kiện, chưa mở
theo đúng mục 8 của đặc tả).

`PARTIAL` ở đây **không phải cách nói tránh**. Mỗi thẻ ghi rõ phần đã có bằng chứng
đo được và phần còn lại, trong `docs/roadmap/TIEN-DO.md`. Phần còn lại phổ biến
nhất là **nối vào UI** — thuộc vai B, và phạm vi đó được chọn có chủ ý để không sửa
chéo sát hạn nộp 19/09.

### Không nâng điểm vì hoàn thành nhiều thẻ

Thẻ CU-27 dặn đúng điều này, nên nói thẳng: phiên này đóng 11 thẻ, nhưng ô **bằng
chứng người dùng vẫn trống**, và đó là ô một giám khảo sản phẩm sẽ hỏi trước tiên.
Số thẻ đóng được không bù cho một cuộc phỏng vấn chưa làm.

---

## 6 · Điều đáng nhớ nhất của phiên này

Bốn lỗi dưới đây **chỉ lộ ra khi đo**, và cả bốn đều từng có test xanh bao quanh:

1. **`node:crypto` làm trắng cả hai trang.** 854 test vẫn xanh, vì test chạy trên
   Node. Chỉ Chromium mới thấy. Nay có guard trên tarball (bước 7/7).
2. **Guard đỏ vì lý do sai** — quét văn bản thô nên khớp phải chính chú thích kể
   lại lỗi đó. Bẫy đã ghi trong bàn giao, và tôi mắc lại.
3. **Guard xanh vì lý do sai** — regex đếm luật bắt nhầm `LUAT_DO` (4 luật) rồi
   nuốt chú thích, ra 28; 28 ≥ 14 nên xanh mà không canh gì.
4. **Đột biến M1 của CU-19 không đỏ** — hoá ra có lớp phòng thủ thứ hai đỡ mất.
   Tin tốt, nhưng bài test không phân biệt được hai lớp thì lớp đầu chết hẳn cũng
   không ai biết.

Bài học chung: **test xanh không đồng nghĩa bằng chứng còn hiệu lực**, và một guard
chưa bao giờ đỏ thì chưa chứng minh được gì.
