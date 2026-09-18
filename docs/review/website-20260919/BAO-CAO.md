# Website giới thiệu Custos — bàn giao WEB-00 → WEB-07

**Đã build và kiểm local. CHƯA deploy.** Đặc tả mục 14 (WEB-07) nói rõ: chưa
triển khai thì viết *"đã build và kiểm local"*, không viết *"website đã online"*.

| | |
|---|---|
| Baseline | `c14eeb0` |
| Ngày | 19/09/2026 |
| Node | v24.12.0 · npm 11.6.2 |
| Browser | Chromium (Playwright, bản ghim trong repo) |
| Preview | `npm run preview -w @custos-solana/demo-wallet -- --port 5197` |
| URL đã dùng | `http://localhost:5197/Custos-Solana/gioi-thieu.html` |

## 1 · Mở bản build

```powershell
npm run build -w @custos-solana/demo-wallet
npm run preview -w @custos-solana/demo-wallet -- --port 5197
# Mở http://localhost:5197/Custos-Solana/gioi-thieu.html
```

Preview là tiến trình server — mở URL từ output, đừng chờ nó tự kết thúc. Cổng
5197 có thể bận; khi đó Vite đổi cổng và in ra URL thật.

Dev: `npm run vi` rồi mở `http://localhost:5188/gioi-thieu.html`.

## 2 · Lệnh đã chạy và kết quả

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | sạch |
| `npm test` | **966 pass · 0 fail** |
| `npm run build -w @custos-solana/demo-wallet` | thành công, có `gioi-thieu.html` trong dist |
| `python scripts/kiem-trinh-duyet/soi-landing.py` | **75/75 PASS** |
| `python scripts/kiem-trinh-duyet/soi-trinh-duyet.py` | TẤT CẢ PASS (hồi quy) |
| `python scripts/kiem-trinh-duyet/soi-inspector.py` | TẤT CẢ PASS (hồi quy) |

Biên bản probe: `data/a11y/landing.json` (có `soKiem`, `kiem[]`, `dauVet.bam`
theo đúng quy ước `bangChungA11y.test.ts`).

## 3 · Số đo

### Bundle

| Phần | Gzip | Mục tiêu |
|---|---|---|
| `gioiThieu.js` | **11,3 KB** | — |
| React (`client.js`, dùng chung) | 60,6 KB | — |
| **Tổng JS ban đầu** | **≈72 KB** | ≤120 KB ✔ |
| `gioiThieu.css` | **4,7 KB** | ≤35 KB ✔ |
| Font (8 WOFF2) | 116,5 KB | ≤250 KB ✔ |

`CanhBao.js` (348 KB, chứa `@solana/web3.js`) **không** nằm trong nhánh phụ thuộc
của landing — đo trên chunk thật, và có guard đọc mã (`landing.test.ts`).

### Tải mạng khi mở trang

| | Trước | Sau |
|---|---|---|
| image | 363,8 KB | **9,8 KB** |
| font | 116,5 KB | 116,5 KB |
| **tổng** | **480,4 KB** | **126,3 KB** |

Mascot gốc là 1296×1213 / 363,8 KB dùng cho logo 44px — đúng lỗi mục 12.3 cảnh
báo. Thu còn 128px, giảm **97 %**. Bản gốc giữ nguyên cho ví mẫu.

### Web vitals — LAB, một lượt, KHÔNG phải field data

`LCP 152 ms · CLS 0,015`, đo trên Chromium không throttle, máy dev Windows 11.

**Đây là một lượt đo trên máy phát triển.** Mục 12.3 đòi tối thiểu ba lượt cùng
cấu hình và ghi median mới gọi là số đo có nghĩa — **chưa làm**. Không suy ra
điểm Lighthouse từ con số này.

## 4 · Ảnh

| Tệp | Nội dung |
|---|---|
| `hero-vi-desktop.png` | Hero VI, 1440×900 |
| `hero-vi-mobile.png` | Hero VI, 390×844 — CTA đứng trước product preview |
| `hero-en-desktop.png` | Hero EN, 1440×900 |
| `full-vi-desktop.png` | Toàn trang VI |
| `sec-giatri.png` · `sec-ab.png` · `sec-dev.png` · `sec-bangchung.png` | Từng section |

## 5 · Ba lỗi thị giác tìm ra bằng ẢNH CHỤP, không phải bằng test

Cả ba đều có test xanh bao quanh lúc chúng tồn tại.

1. **Chữ trong khung hero mờ không đọc được.** `.lg-panel` nằm trong `.lg-dark`
   nên nó **kế thừa** `color: paper` — chữ kem trên nền trắng. Sửa: panel khai
   `color` tường minh.
2. **Caption bị tấm nền nghiêng đè.** Sửa hai lần đầu bằng `z-index` — sai. Đo
   ra: caption `z:2`, nền `z:0`, tức z-index đã đúng; vấn đề là **hình học**,
   nền chạy 186→609px còn caption ở 532–572px. Sửa bằng cách thu nền lại.
3. **Dòng code tràn ngang** trong panel developer. Rút ngắn chú thích; đo lại
   `scrollWidth === clientWidth`.

## 6 · Bốn guard của tôi đỏ vì lý do sai

Khi viết `landing.test.ts`, bốn bài đỏ và **cả bốn đều là lỗi của test**:

| Bài | Khớp phải | Thực tế |
|---|---|---|
| EN không nới thành bảo đảm | `"completely safe"` | nằm trong **câu hỏi FAQ** phủ nhận chính nó |
| Landing không import core | `@custos-solana/core` | nằm trong **chuỗi code mẫu** hiển thị cho người đọc |
| Không gõ tay prefix | `/Custos-Solana/` | nằm trong **chú thích** giải thích vì sao không gõ tay |
| Không đặt og:url | `og:url` | nằm trong **chú thích** giải thích vì sao không đặt |

Ba trong bốn là đúng bẫy *"guard khớp phải chính chú thích của mình"* đã ghi
trong `BAN-GIAO-CHO-CODEX.md` — tôi mắc lại. Sau khi sửa, đột biến thêm một
`import { PublicKey } from "@solana/web3.js"` thật vào `Hero.tsx` ⇒ guard **đỏ
đúng file**.

## 7 · Một guard của REPO bắt được lỗi của tôi

`bangChungA11y.test.ts` đỏ với *"biên bản rỗng mà vẫn báo đạt"*: probe landing
ghi `data/a11y/landing.json` bằng tên trường riêng (`tong`, `loi`) không khớp quy
ước, và thiếu `dauVet.bam`. Đã sửa probe dùng `dauvet.doc("giao-dien")` — đúng
việc guard đó sinh ra để làm.

## 8 · Phần CHƯA làm, có chủ ý

| Việc | Vì sao |
|---|---|
| Live A/B nhúng trong landing | Mục 7.4 là **nâng cấp có điều kiện**; đã chọn link sang app làm mặc định, và landing không được tự viết lại engine |
| Prerender HTML EN riêng | Mục 13: đổi ngôn ngữ bằng JS **không bảo đảm** crawler đọc metadata EN. Giới hạn đã ghi trong `LandingPage.tsx`; người dùng thật và screen reader vẫn đọc đúng |
| `canonical` và `og:url` | Mục 13: chỉ đặt sau khi xác định URL chuẩn. URL production **chưa xác nhận đã deploy**, nên URL tuyệt đối ở đây sẽ là URL tự bịa |
| Web vitals 3 lượt + median | Mục 12.3 đòi vậy mới có nghĩa. Mới đo **một lượt** |
| Đổi root ví sang landing | Mục 5 cấm: đó là migration riêng cần kiểm handoff/deep link/CI |
| Deploy | Không có uỷ quyền. Mục 16.12 cấm tự publish để đóng task |

## 9 · File đã sửa

**Thêm mới**

```
apps/demo-wallet/gioi-thieu.html
apps/demo-wallet/src/landing.tsx
apps/demo-wallet/src/landing/{LandingPage,SiteHeader,Hero,ScenarioExplorer,Sections}.tsx
apps/demo-wallet/src/landing/{content,links,sample}.ts
apps/demo-wallet/src/landing/landing.css
apps/demo-wallet/test/landing.test.ts
apps/demo-wallet/public/landing/fonts/*.woff2          (8 tệp)
apps/demo-wallet/public/landing/custos-dino-128.png
apps/demo-wallet/public/landing/social-preview-{vi,en}.png
apps/demo-wallet/public/landing/asset-sources.md
scripts/kiem-trinh-duyet/soi-landing.py
docs/review/website-20260919/                          (ảnh + báo cáo này)
```

**Sửa**

```
apps/demo-wallet/vite.config.ts          chỉ THÊM input `gioiThieu`
apps/demo-wallet/test/moiTrangCoH1.test.ts  thêm gioi-thieu.html vào bảng
docs/roadmap/TIEN-DO.md                  thêm nhóm Website
```

Không đụng `style.css`, `App.tsx`, `main.tsx`, `Inspector.tsx` hay bất kỳ phần
nào của ví. `base`, `isPreview`, `css.postcss` và alias `buffer` giữ nguyên.
