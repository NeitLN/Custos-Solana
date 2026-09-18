# Nguồn tài sản của trang giới thiệu

Tệp trong thư mục này **tải về từ Google Fonts**, không hotlink lúc render.
Đặc tả mục 4.2: *"Self-host WOFF2 có license và glyph tiếng Việt đầy đủ"*.

## License

Cả hai họ chữ dùng **SIL Open Font License 1.1**:

- Manrope — <https://fonts.google.com/specimen/Manrope>
  · metadata: <https://github.com/google/fonts/blob/main/ofl/manrope/METADATA.pb>
- Be Vietnam Pro — <https://fonts.google.com/specimen/Be+Vietnam+Pro>
  · metadata: <https://github.com/google/fonts/blob/main/ofl/bevietnampro/METADATA.pb>

## Tệp đã tải

Chỉ lấy subset `vietnamese` và `latin`. Không bỏ subset vietnamese để giảm
dung lượng — mục 12.3 cấm đích danh việc đó.

| Tệp | Họ | Weight | Subset | KB |
|---|---|---|---|---|
| `be-vietnam-pro-400-vietnamese.woff2` | Be Vietnam Pro | 400 | vietnamese | 11.3 |
| `be-vietnam-pro-400-latin.woff2` | Be Vietnam Pro | 400 | latin | 20.7 |
| `be-vietnam-pro-600-vietnamese.woff2` | Be Vietnam Pro | 600 | vietnamese | 11.9 |
| `be-vietnam-pro-600-latin.woff2` | Be Vietnam Pro | 600 | latin | 21.5 |
| `be-vietnam-pro-700-vietnamese.woff2` | Be Vietnam Pro | 700 | vietnamese | 12.2 |
| `be-vietnam-pro-700-latin.woff2` | Be Vietnam Pro | 700 | latin | 21.6 |
| `manrope-800-vietnamese.woff2` | Manrope | 800 | vietnamese | 4.1 |
| `manrope-800-latin.woff2` | Manrope | 800 | latin | 13.3 |

Tổng: **116.5 KB** (mục tiêu ≤250 KB).

## Logo hiện tại

Logo chữ C của Custos nằm trong `../brand/`. Biểu tượng được vẽ mới bằng SVG;
wordmark dùng Manrope 800 đã chuyển thành path. Xem `../brand/README.md` để biết
biến thể nền sáng/tối, favicon, PNG và cách tái tạo. Header, footer, ví mẫu và
Inspector hiện dùng logo này. Ảnh chia sẻ mới nằm trong `../brand/`.

## Mascot cũ — giữ làm tài sản lịch sử

`custos-dino.png` và `custos-dino-favicon.png` là tài sản sẵn có của dự án.
Không vẽ mascot mới.

`landing/custos-dino-128.png` là bản THU NHỎ của chính file đó, tạo bằng Pillow
(LANCZOS, `optimize=True`).

**Vì sao cần bản nhỏ, đo được:** logo hiển thị ở 44px và 40px, nhưng file gốc là
1296×1213 / **363,8 KB**. Đo mạng khi mở landing cho thấy ảnh chiếm 363,8 KB
trong tổng 480,4 KB — tức mascot một mình nặng gấp ba lần toàn bộ font. Mục 12.3
cấm đích danh việc kéo giãn/thu nhỏ PNG lớn trong trình duyệt.

Sau lần tối ưu cũ: **9,8 KB** (128×120), giảm 97%. Các file cũ vẫn được giữ,
nhưng ví mẫu và landing hiện đã chuyển sang logo SVG nói trên.
