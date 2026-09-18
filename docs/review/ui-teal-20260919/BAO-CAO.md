# UI Custos — chuyển sang nhận diện xanh ngọc (UIR-00 → UIR-05)

**UIR đã thực hiện:** UIR-00, UIR-01, UIR-02, UIR-03, UIR-04, UIR-05.
**HEAD trước khi sửa:** `b6d66b1`. **Baseline đối chiếu:** `docs/review/ui-direction-b6d66b1/`.

Đã build và kiểm local dưới prefix production. **Chưa deploy, chưa publish.**

---

## 1 · Ba lỗi layout: tái hiện → nguyên nhân → sau sửa

Regression mới: `scripts/kiem-trinh-duyet/soi-layout-landing.py` (30 phép kiểm).
Nó **đỏ trước khi sửa** — 8/30 — rồi xanh sau.

### UI-02 · header tràn ngang

| Viewport | Trước | Sau |
|---|---|---|
| 320px VI | tràn **38px** | **0px** |
| 320px EN | tràn **55px** | **0px** |
| 360px EN | tràn **15px** | **0px** |

Tài liệu ghi 320px; đo lại thấy **bản EN tệ hơn VI** (55 so với 38) và **360px EN
cũng tràn**. Nguyên nhân: ba cụm trên một hàng, và nút chữ "Open menu" rộng hơn
"Mở menu".

**Sửa:** ở ≤640px header chỉ còn brand + nút icon 44×44px; VI/EN chuyển vào menu.
Chức năng không mất — đã kiểm đổi được sang EN từ menu ở 320px, và sau khi đổi
vẫn không tràn. Không scale header, không `overflow-x: hidden` (probe kiểm cả hai
thuộc tính này ở mọi viewport).

### UI-03 · chip đè tiêu đề

Đo ở 390px **trước**: chip `y 519,89–558,52` giao tiêu đề khung `552,27–577,02`.

**Sửa:** bỏ hẳn chip absolute và backplate nghiêng khỏi hero. Không thêm padding
để né một vật trang trí.

**Sau:** 0 phần tử absolute đè chữ ở 320/390/desktop.

### UI-04 · list reset làm lệch gutter

| | Trước | Sau |
|---|---|---|
| Mép nội dung desktop | `[0, 124, 334]` — ba mép | `[152]` — một mép |
| Gutter mobile 390 | **0px** | **20px** |

Nguyên nhân: `.custos-landing ul, ol { margin: 0; padding: 0 }` có specificity
(0,2,0) > `.lg-shell` (0,1,0), nên mọi `<ul class="lg-shell">` mất cả margin lẫn
padding.

**Sửa tận gốc, không vá một dải:** `.lg-shell` không còn là `<ul>`, và reset dùng
`:where(ul, ol)` — specificity 0, thua mọi class. Đúng như tài liệu cảnh báo, sửa
riêng margin là **chưa đủ**: phải kiểm computed `padding` mới biết.

---

## 2 · Nhận diện mới

| | Trước (`b6d66b1`) | Sau |
|---|---|---|
| Hero | tím đậm `#17132A` | nền sáng `#F5F8F7` |
| CTA chính | lilac `#B9A3F3` | brand teal `#146C60`, chữ trắng |
| Dải thông tin | lime `#D5F45B` toàn chiều ngang | hàng text trong container |
| Shadow | `7px 7px 0` cứng | border 1px |
| Trang trí hero | backplate nghiêng 3° + 2 chip absolute | không |
| Section nền tối | hero + developer + footer | **chỉ** developer + footer |
| Chiều cao trang desktop | ~5326px | **~4528px** |

Guard `UIR-01` trong `landing.test.ts` canh cả hex cũ lẫn tên token theo màu; đột
biến thêm lại `#B9A3F3` ⇒ **đỏ đúng**.

### Contrast đã đo trên palette thật

15/16 cặp đạt. Một cặp **không đạt và đã sửa**: token control border đầu tiên tôi
chọn (`#9DB5B0`) chỉ được **2,17:1** trên trắng, dưới ngưỡng 3:1 cho UI component.
Đổi sang `#6E8F88` — đo lại **3,53:1 trên trắng**, **3,30:1 trên `bg`**.

---

## 3 · UI-05 · A/B đối chiếu đồng thời

**Trước:** một ca tại một thời điểm, hai nút chọn ở cột trái; người xem phải nhớ
ca vừa rồi để thấy "cùng 490, khác quyền".

**Sau:** `<table>` semantic hai cột, hàng "Thao tác đổi chủ" đặt cạnh nhau. Không
cần thao tác nào để thấy khác biệt.

- Evidence có **nút riêng cho từng ca**, và panel hiện tên ca đang xem.
- Ca A vẫn ghi *"Không có trong transaction mẫu"* — kết luận về cấu trúc, không
  phải phép đo owner. Probe canh việc **không** có địa chỉ đầy đủ trong panel A.
- Mobile: hai tóm tắt xếp dọc + **dòng đối chiếu luôn thấy**. Không scroll ngang.
- Raw address / mã luật / ISO / commit chuyển vào `<details>` "Xem chi tiết kỹ
  thuật" — vẫn giữ, chỉ không chiếm phần mặc định.

---

## 4 · UIR-04 · nối nhận diện ví và Inspector

Tài liệu dặn: *"Trước khi đổi `--color-nhan` hoặc `--color-thuong`, tìm toàn bộ
nơi dùng và phân loại brand vs semantic."* Đã làm:

| Token | Nơi dùng | Phân loại | Hành động |
|---|---|---|---|
| `--color-nhan` | 13 chỗ: avatar, icon hành động, viền mục đang chọn, nút chính | **brand/action/selection** | → teal `oklch(0.479 0.081 181.1)` |
| `--color-thuong` | verdict `safe` / "Bình thường" | **semantic** | **GIỮ NGUYÊN** |

Đổi `thuong` sang teal sẽ làm verdict "an toàn" trùng màu thương hiệu — đúng điều
mục 3 cấm. `brand-tokens.css` chỉ chứa biến, có guard canh nó không mang rule
layout.

**Trạng thái đã mở:** ví idle, `?mock=danger`, `?mock=safe`, Inspector idle — 0
pageerror ở cả bốn. Banner mock đỏ và các nhãn severity **không đổi màu**.

**Regression đã chạy:** `soi-trinh-duyet` PASS · `soi-inspector` PASS ·
`soi-vung-bam` 0 mục dưới 44px.

**PARTIAL:** chưa mở trạng thái *thiếu coverage* và *lỗi RPC* của ví với palette
mới. Bốn trạng thái trên chưa phủ hết ma trận mục 9.

---

## 5 · Lệnh và kết quả

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | sạch |
| `npm test` | **968 pass · 0 fail** |
| `npm run build -w @custos-solana/demo-wallet` | thành công |
| `soi-layout-landing.py` | **30/30** (trước sửa: 8 đỏ) |
| `soi-landing.py 5198` | **77/77**, gồm axe 0 vi phạm VI+EN |
| `soi-trinh-duyet.py` | TẤT CẢ PASS |
| `soi-inspector.py` | TẤT CẢ PASS |
| `soi-vung-bam.py` | TẤT CẢ ĐẠT 44px |

Bundle không đổi đáng kể: `gioiThieu.js` **11,34 KB gzip**, CSS **4,47 KB gzip**.
Không thêm dependency nào để đổi màu.

---

## 6 · Viewport và locale đã kiểm

320 / 360 / 390 / 768 / 1024 / 1440 / 1920px — **cả VI và EN**, tổng 24 phép đo
tràn ngang, tất cả `scrollWidth ≤ clientWidth + 1`, và `overflow-x` không phải
`hidden` ở html/body.

Keyboard: skip link, Escape đóng menu và trả focus, VI/EN trong menu mobile.

---

## 7 · Bốn lỗi của chính tôi trong lượt này

1. **Guard overlap bỏ sót lỗi thật.** Bản đầu lọc `chu.includes(a)` nên `.lg-chip`
   — một `<span>` có chữ — bị loại khỏi danh sách absolute. Guard xanh trong khi
   đo tay cho thấy chip đè title 6,25px.
2. **CTA cao 46px.** Tôi đặt `min-height: 46px` cho "gọn hơn"; ngưỡng là 48px.
   Probe bắt được.
3. **Guard màu cũ khớp phải chú thích của chính nó** — lần thứ tư mắc bẫy này
   trong repo. `--landing-lilac` nằm trong đoạn giải thích *vì sao không dùng tên
   đó*. Sửa: bỏ chú thích trước khi tìm.
4. **Social preview logo trống.** Generator vẫn trỏ `localhost:5197` — cổng của
   server cũ đã tắt. Đúng cái bẫy cổng mà mục 8 cảnh báo, ở một chỗ khác. Sửa:
   nhúng logo dạng data URI, không phụ thuộc server.

---

## 8 · Chưa làm / PARTIAL

| Việc | Lý do |
|---|---|
| Trạng thái *thiếu coverage* và *lỗi RPC* của ví | Chưa mở với palette mới — **UIR-04 PARTIAL** |
| Đồng bộ typography ví theo landing | Mục 4 nói đây là bước riêng sau visual token; đổi sẽ gây reflow lớn |
| `canonical` / `og:url` | URL production vẫn chưa xác nhận đã deploy |
| Web vitals nhiều lượt lấy median | Chưa đo lại sau khi đổi UI |
| Deploy / publish | Không có uỷ quyền |

---

## 9 · File đã sửa

**Thêm mới**

```
apps/demo-wallet/src/landing/brand-tokens.css      token màu, CHỈ biến
scripts/kiem-trinh-duyet/soi-layout-landing.py     regression 3 lỗi layout
docs/review/ui-teal-20260919/                      ảnh + báo cáo này
```

**Sửa**

```
apps/demo-wallet/src/landing/landing.css           thay toàn bộ hệ màu/hình khối
apps/demo-wallet/src/landing/SiteHeader.tsx        VI/EN vào menu, nút icon
apps/demo-wallet/src/landing/Hero.tsx              hero sáng, phiếu phân tích
apps/demo-wallet/src/landing/ScenarioExplorer.tsx  bảng A/B đồng thời
apps/demo-wallet/src/landing/Sections.tsx          pipeline, bỏ section lilac
apps/demo-wallet/src/landing/LandingPage.tsx       thứ tự section mới
apps/demo-wallet/src/landing/content.ts            copy VI/EN mới
apps/demo-wallet/src/style.css                     --color-nhan → teal
apps/demo-wallet/gioi-thieu.html                   theme-color trắng
apps/demo-wallet/test/landing.test.ts              sửa test ghim #17132A, thêm 2 guard
apps/demo-wallet/public/landing/social-preview-*   dựng lại theo UI mới
scripts/kiem-trinh-duyet/soi-landing.py            cổng tham số, selector A/B mới, 320px
```

Không đụng `App.tsx`, `Inspector.tsx`, logic engine, luồng ký hay `vite.config.ts`.

---

## 10 · Ảnh

`desktop-hero` · `desktop-full` · `desktop-en` · `mobile-390` · `mobile-320` ·
`mobile-320-menu` · `ab-bang` · `ab-evidence` · `wallet-idle` · `wallet-danger` ·
`wallet-safe` · `inspector-idle`.

Đối chiếu trước/sau với `docs/review/ui-direction-b6d66b1/` (cùng viewport).

---

## 11 · Bước tiếp theo

1. Mở nốt trạng thái thiếu coverage và lỗi RPC của ví để đóng UIR-04.
2. Đo lại web vitals ba lượt, lấy median.
3. Chủ dự án quyết định deploy.
