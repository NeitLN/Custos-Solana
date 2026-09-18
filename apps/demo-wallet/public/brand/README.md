# Custos — logo «điểm kiểm tra»

Biểu tượng chữ C được tạo từ một vòng hình học mở. Điểm hình thoi nằm tại cửa ra gợi việc kiểm tra giao dịch trước khi ký. Hình khối được vẽ bằng vector gốc cho Custos; không dùng logo hoặc mascot của nhóm tham chiếu.

## Tệp sử dụng

| Tệp | Công dụng |
| --- | --- |
| `custos-logo.svg` | Logo ngang trên nền sáng, gồm biểu tượng và chữ Custos. |
| `custos-logo-light.svg` | Logo ngang trên nền tối. |
| `custos-symbol.svg` | Biểu tượng xanh ngọc dùng trong website. |
| `custos-symbol-light.svg` | Biểu tượng trắng xanh, điểm nhấn xanh nhạt, dùng trên nền tối. |
| `custos-symbol-mono.svg` | Bản đơn sắc xanh rừng cho tài liệu. |
| `custos-favicon.svg` | Favicon trên nền xanh rừng. |
| `custos-logo.png`, `custos-logo-light.png` | Logo ngang PNG trong suốt, 1240 × 320. |
| `custos-symbol-512.png` | Biểu tượng PNG trong suốt, 512 × 512. |
| `custos-apple-touch-icon.png` | Icon 180 × 180 cho thiết bị Apple. |
| `custos-favicon-32.png` | Icon PNG 32 × 32 dùng khi cần định dạng raster. |
| `custos-social-vi.png`, `custos-social-en.png` | Ảnh chia sẻ 1200 × 630, dùng bộ nhận diện mới. |
| `index.html` | Trang xem trước và tải các biến thể. |

## Quy cách

- Xanh ngọc `#146C60`: logo trên nền sáng.
- Xanh rừng `#102F28`: chữ và nền favicon.
- Trắng xanh `#F5F7F4`: logo trên nền tối.
- Xanh nhạt `#B9DE87`: điểm nhấn của bản nền tối.
- Chừa khoảng trống quanh biểu tượng tối thiểu 8 đơn vị trong hệ 64 × 64.
- Biểu tượng nhỏ nhất khuyến nghị 16px; trên header dùng 32–44px.
- Giữ nguyên tỉ lệ. Không thêm bóng, viền hoặc xoay biểu tượng.
- Màu thương hiệu không thể hiện verdict an toàn/nguy hiểm của giao dịch.

Chữ Custos dùng Manrope 800 của bộ font dự án, đã chuyển sang đường vector nên SVG không phụ thuộc font trên máy người nhận. Manrope được phân phối theo SIL Open Font License 1.1; nguồn font được ghi trong `../landing/asset-sources.md`.

## Tái tạo

Từ thư mục gốc repository, `scripts/brand/tao-logo-custos.py` sinh SVG; cần Python `fontTools` và `brotli`. Trên môi trường hiện tại, Brotli được cài local trong `node_modules/.custos-logo-python`:

```powershell
$env:PYTHONPATH = (Resolve-Path node_modules/.custos-logo-python).Path
python scripts/brand/tao-logo-custos.py
```

Khi dev server đang chạy, `scripts/brand/kiem-logo-custos.py BASE_URL --export` dùng Chromium để xuất PNG từ SVG và render ảnh chia sẻ từ HTML. Bỏ `--export` khi chỉ kiểm tra bản production.

Logo khủng long cũ được giữ trong repository như tài sản lịch sử, không còn được gọi ở các vị trí nhận diện đã cập nhật.
