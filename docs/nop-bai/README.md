# Hồ sơ nộp bài

Thể lệ: *"Nộp đầy đủ trước hạn BTC công bố. **Hồ sơ thiếu hoặc trễ có thể bị loại.**"*

| Hạng mục | Yêu cầu | Trạng thái |
|---|---|---|
| Sản phẩm chạy được | Link demo live hoặc devnet truy cập được | ✅ `neitln.github.io/Custos-Solana` |
| Mã nguồn | Repo public, có lịch sử commit thể hiện quá trình build thật | ✅ `github.com/NeitLN/Custos-Solana` |
| **Slide pitch** | Nộp trước để BTC load sẵn theo thứ tự | ✅ `CUSTOS-PITCH.pptx` |
| **Video demo dự phòng** | 60–90 giây, quay màn hình thao tác live, không mockup | ⏸ **hoãn tới khi chốt sản phẩm** — kịch bản sẵn ở `docs/KICH-BAN-VIDEO.md` |
| **Thông tin đăng ký** | Track chính, chủ đề, danh sách thành viên | ✅ **đã nộp 24/08** |

---

## Slide

**Nền sáng** (giấy hơi ngả ấm `#F7F6F2`, không trắng tinh — trắng tuyệt đối trên máy
chiếu hội trường bị chói và làm chữ mảnh khó đọc). Khối code ở slide 5 cố ý giữ nền
tối: trình soạn thảo vốn tối, và nó cho mắt một điểm nghỉ giữa deck toàn giấy sáng.

`CUSTOS-PITCH.pptx` — 10 slide, khớp đúng nhịp 4 phút trong `PITCH-VA-PHAN-BIEN.md` mục 2.

**Mỗi slide có ghi chú người nói**, kèm mốc thời gian và những chỗ dễ nói hớ. Mở
chế độ Presenter View để thấy. Ba cảnh báo quan trọng nhất nằm trong đó:

- Lỗi Coinspect **đã được vá** — luận điểm là về cấu trúc, không phải cáo buộc Phantom
- **Không nói "10/11"** — đọc đúng con số đang hiện trên màn hình
- **Không nói một tỉ lệ biên lợi nhuận cụ thể** — chưa đủ dữ liệu để có tỉ lệ

### Sinh lại slide

Mọi con số trên slide đọc từ `apps/demo-wallet/public/so-lieu.json`, **không gõ tay** —
nên đo lại rồi sinh lại là số tự đúng.

```bash
npm install pptxgenjs          # không phải phụ thuộc của repo, cài riêng khi cần
node scripts/tao-deck.cjs docs/nop-bai/CUSTOS-PITCH.pptx apps/demo-wallet/public/so-lieu.json
```

Đuôi `.cjs` là bắt buộc: repo đặt `"type": "module"` nên `.js` bị coi là ESM và
`require()` ném lỗi.

### Kiểm trước khi nộp

**Máy này không cài ứng dụng nào mở được `.pptx`** — không PowerPoint, không
LibreOffice, không WPS. Nên deck **chưa được nhìn bằng mắt trong PowerPoint**.

Đã kiểm được ba thứ bằng máy:

| Kiểm gì | Cách |
|---|---|
| Tràn hộp · hai khối chữ đè nhau · lòi mép slide | đo hình học từng hộp |
| Tương phản chữ trên nền | tính tỉ lệ tương phản, có tính cả panel nằm dưới chữ |
| Chữ, số, chính tả | đọc lại toàn bộ text trong file |

**Vẫn phải mở một lượt bằng mắt trước khi nộp.** Cách nhanh nhất: kéo file vào
`drive.google.com` để xem bằng Google Slides. Nhìn kỹ hai tiêu đề dài nhất
(slide 3 và 8) xem có xuống dòng xấu không, và kiểm phông tiếng Việt có vỡ dấu không.

### Phông chữ

Trebuchet MS · Calibri · Consolas — đều có sẵn trên Windows và hỗ trợ tiếng Việt.
Nếu BTC mở trên máy khác mà chữ vỡ dấu thì xuất PDF nộp kèm.


---

## Việc còn lại: chỉ còn video

Form đã nộp 24/08. Sản phẩm và repo đã xong. Slide đã xong.

**Video hoãn tới khi chốt sản phẩm** — hợp lý, vì quay xong mà màn hình còn đổi thì
phải quay lại. Nhưng cần chốt trước **một quyết định duy nhất còn mở**, vì nó đổi đúng
cái con số đọc trong video:

> `CUSTOS.md` mục 07 — giao dịch tấn công demo hiện có **3 lệnh**, coverage **2/3**.
> Thiết kế gốc mô tả nó nằm giữa các lệnh swap hợp lệ, tức khoảng 10–11 lệnh.
> Chưa dựng phần swap đó.

| Chọn | Video nói | Phải làm gì trước khi quay |
|---|---|---|
| **Giữ 3 lệnh** | "đã đọc hiểu 2 trên 3 lệnh" | Không phải làm gì — quay được ngay |
| **Dựng đủ lệnh swap** | "đã đọc hiểu 10 trên 11 lệnh" | Vai B thêm lệnh vào `scripts/tan-cong.ts`, và **mọi lệnh thêm vào phải là lệnh một giao dịch swap thật sự có** |

**Chốt cái này trước, rồi mới quay.** Quay trước rồi đổi giao dịch sau là quay lại từ đầu.

Và cắm **RPC key riêng** trước khi bấm quay (`docs/VIEC-CUA-BAN.md` mục 4) — endpoint
công khai chặn tốc độ `429` giữa chừng là hỏng cả lượt quay.
