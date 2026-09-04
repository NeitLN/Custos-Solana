# Kiểm trên trình duyệt thật

```bash
# cài một lần
pip install playwright && playwright install chromium
npm install --no-save axe-core

# chạy — cần HAI server đang bật
npm run vi          # 5188
npm run tan-cong    # 5189
python scripts/kiem-trinh-duyet/soi-trinh-duyet.py
```

## ⚠️ KHÔNG nằm trong CI, và cố ý như vậy

`npm run check` **không** chạy bộ này. Không workflow nào chạy axe.

Playwright kéo theo một trình duyệt vài trăm MB; thêm nó vào đường deploy ngay
trước hạn thi là đổi một rủi ro nhỏ lấy một rủi ro lớn. Nhưng bộ này **phải nằm
trong repo**: nếu không thì không ai ngoài người viết nó lặp lại được kết quả, và
một bằng chứng không lặp lại được thì không phải bằng chứng.

Chạy tay trước khi quay video, và sau mỗi lần đụng vào CSS hoặc luồng lỗi.

## Nó kiểm gì

| Nhóm | Nội dung |
|---|---|
| **A** | Ví · giao dịch nguy hiểm — verdict, bảng 500 → 0, coverage 2/3, axe, vùng bấm ≥44px, tràn ngang |
| **B** | Ví · giao dịch bình thường — verdict Bình thường, không hiện chữ "an toàn" |
| **C** | Trang tấn công → ví — `window.open` gọi **đồng bộ** trong cử chỉ bấm, ví bắt được lời khai gian |
| **D** | Devnet **treo** — thẻ lỗi đúng hạn 9 s, nói rõ là lỗi kết nối, đường lui có nhãn, thử lại gọi lại RPC |
| **E** | `prefers-reduced-motion` — cảnh báo vẫn hiện, 0 animation còn chạy |
| **F** | Trang số liệu và trang phỏng vấn — axe + tràn ngang, cả 375 px lẫn 1440 px |

axe-core chạy thật, ở mức `wcag2a · wcag2aa · wcag21a · wcag21aa`.

> Checker tương phản **tự viết** đã sai hai lần trước đây: Chrome trả màu dạng
> `oklch()` và mã đọc ba số đó như RGB, cho ra tỉ lệ vô nghĩa — có lần báo
> "1,03:1". Đừng viết lại nó; dùng axe.

## Bằng chứng lần chạy gần nhất

**04/09/2026 · Chromium 149.0.7827.55 · headless · 375×812 và 1440×900**
→ **toàn bộ PASS**, không vi phạm WCAG A/AA trên cả bốn trang.

| Đo được | |
|---|---|
| Thẻ lỗi khi Devnet treo | **9,1 s** (trước khi sửa: >25 s vẫn chưa có gì) |
| CTA chính | mọi nút `.nut` ≥ 44 px |
| Tràn ngang | 0 px ở cả hai khung |
| Lỗi console | 0 |

## Bốn lỗi bộ này tìm ra mà test đơn vị KHÔNG thấy

1. **`huyRef` mắc kẹt `true`** — StrictMode chạy effect hai lượt, bản vá chỉ có
   cleanup nên sau lượt đầu mọi callback thoát sớm. Bấm nút không có gì xảy ra,
   không lỗi, không cảnh báo.
2. **Link "Số liệu" mất tên dưới 640 px** — chữ bị `hidden`, icon thì `aria-hidden`,
   nên trình đọc màn hình chỉ đọc "liên kết". Chỉ hỏng ở một cỡ màn hình.
3. **Tấm cảnh báo trên trang phỏng vấn phối màu ra mảng xám đục** — 11 chỗ dưới
   ngưỡng AA, thấp nhất 2:1.
4. **`.nut` cao 42 px** — thiếu 2 px so với ngưỡng vùng bấm, trên đúng hai nút quan
   trọng nhất sản phẩm.
