# Custos — bản trình diễn mang đi

Thư mục này chạy độc lập. **Không cần cài gì, không cần repo, không cần npm install.**
Chỉ cần máy có **Node.js**.

---

## Chạy

| Máy | Làm gì |
|---|---|
| **Windows** | Bấm đúp **`CHAY.cmd`** |
| macOS / Linux | `./chay.sh` |
| Cách nào cũng được | `node phuc-vu.mjs 8080` rồi mở `http://localhost:8080/phong-van.html` |

Cổng 8080 bận thì đổi: `node phuc-vu.mjs 8081`.

> **Đừng bấm đúp `index.html`.** Trang sẽ trắng. Bản dựng là ES module và trình duyệt
> chặn module khi mở bằng `file://` — bắt buộc phải qua máy chủ, kể cả máy chủ nhỏ như
> cái đi kèm đây.

---

## ⚠️ CẦN MẠNG

Màn hình cảnh báo **không phải ảnh chụp**. Nó được dựng bằng cách mô phỏng thật một
giao dịch trên **Solana Devnet** ngay lúc mở trang.

Không có mạng ⇒ trang hiện **thẻ lỗi** kèm nút *Thử lại*, chứ không hiện cảnh báo. Đó
là chủ ý: thà nói thẳng "chưa kiểm tra được" còn hơn hiện một màn hình giả.

**Thử trước khi đi hỏi ai.** Mở `/phong-van.html`, thấy tấm cảnh báo đỏ *"Nguy hiểm"*
hiện ra là được. Nếu ra thẻ lỗi thì kiểm mạng, hoặc hiện trường Devnet đã hết hạn —
nhắn đội dựng lại (`npm run hien-truong` trong repo gốc).

---

## Bốn trang

| Đường dẫn | Dùng để |
|---|---|
| **`/phong-van.html`** | **Màn hình phỏng vấn — mở cái này** |
| `/` | Ví mẫu, có cả hai kịch bản |
| `/tan-cong/` | Trang lừa đảo giả, bàn giao sang ví |
| `/so-lieu.html` | Trang số liệu công khai |

Luồng đầy đủ chạy được ngay trong thư mục này: mở `/tan-cong/`, bấm **Nhận 1.000 SOLB**,
ví mở ra và Custos chặn.

---

## Bản này KHÔNG ký được — cố ý

Không có khoá ký nào nhúng trong thư mục. Người xem chạy được mô phỏng và thấy đủ màn
cảnh báo (mô phỏng không cần chữ ký), nhưng **không ký được gì**. Nghĩa là:

- không ai phá được hiện trường demo của đội,
- không có khoá riêng nào nằm trong một thư mục được chuyền tay.

Đã quét: **0 khoá riêng trong 18 file**, `localStorage` rỗng sau khi mở.

---

## Cách hỏi

Đừng giải thích trước. Đưa màn hình, im lặng, rồi hỏi đúng hai câu — **tách nhau**:

1. *"Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?"*
2. *"Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?"*

Toàn bộ giao thức và phiếu ghi nằm trong repo:
`docs/PHIEU-PHONG-VAN.md` (cầm theo) · `docs/BIEN-BAN-PHONG-VAN.md` (điền vào).

Chép **nguyên văn** lời họ nói, kể cả khi sai. Không ghi tên, email, số điện thoại.
