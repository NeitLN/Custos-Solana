# Hồ sơ nộp bài

Thể lệ: *"Nộp đầy đủ trước hạn BTC công bố. **Hồ sơ thiếu hoặc trễ có thể bị loại.**"*

| Hạng mục | Yêu cầu | Trạng thái |
|---|---|---|
| Sản phẩm chạy được | Link demo live hoặc devnet truy cập được | ✅ `neitln.github.io/Custos-Solana` |
| Mã nguồn | Repo public, có lịch sử commit thể hiện quá trình build thật | ✅ `github.com/NeitLN/Custos-Solana` |
| **Slide pitch** | Nộp trước để BTC load sẵn theo thứ tự | ✅ `CUSTOS-PITCH.pptx` |
| **Video demo dự phòng** | 60–90 giây, quay màn hình thao tác live, không mockup | ⬜ kịch bản ở `docs/KICH-BAN-VIDEO.md` |
| **Thông tin đăng ký** | Track chính, chủ đề, danh sách thành viên | ⬜ nội dung điền ở `docs/VIEC-CUA-BAN.md` mục 1 |

---

## Slide

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
node scripts/tao-deck.js docs/nop-bai/CUSTOS-PITCH.pptx apps/demo-wallet/public/so-lieu.json
```

> **Chưa soi được bằng mắt.** Máy dựng không có LibreOffice nên không render ra ảnh
> được; mới kiểm bằng hình học (tràn hộp, đè nhau, lòi mép) và bằng cách đọc lại
> toàn bộ chữ. **Mở một lượt trong PowerPoint trước khi nộp** — nhất là xem hai
> tiêu đề dài ở slide 3 và 8 có xuống dòng xấu không.

### Phông chữ

Trebuchet MS · Calibri · Consolas — đều có sẵn trên Windows và hỗ trợ tiếng Việt.
Nếu BTC mở trên máy khác mà chữ vỡ dấu thì xuất PDF nộp kèm.
