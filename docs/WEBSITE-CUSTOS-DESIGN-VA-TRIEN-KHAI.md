# Custos — đặc tả website giới thiệu, thiết kế và triển khai cho Claude

> **Cập nhật yêu cầu thiết kế:** chủ dự án đã yêu cầu bỏ hướng UI của nhóm tham chiếu. Khi triển khai tiếp, đọc [DIEU-CHINH-UI-CUSTOS.md](DIEU-CHINH-UI-CUSTOS.md) trước. Tài liệu mới thay thế art direction, bảng màu, hero, card/button/shadow và nhịp bố cục bên dưới. Giữ các yêu cầu chức năng, nguồn dữ liệu, VI/EN và route còn phù hợp; không dùng prompt cuối file này để dựng lại hướng tím–lilac–lime cũ.

Ngày soạn: 18/09/2026. Baseline đã đọc: commit `c14eeb0`. Đây là **đặc tả cần triển khai**, không phải báo cáo website đã hoàn thành. Không đặt mốc thời gian; nghiệm thu theo đầu ra.

## 0. Đọc trước khi thực hiện

### Yêu cầu của chủ dự án

Xây thêm website giới thiệu Custos, lấy cảm hứng từ các ảnh N.E.D Wallet do chủ dự án cung cấp: hero tối, tiêu đề lớn, phần giới thiệu sản phẩm nổi bật bên phải, các phần nền kem, nút màu sáng, viền rõ và bóng đổ cứng. Claude được quyết định nội dung và chi tiết thiết kế trong định hướng này.

**Đầu ra phiên hiện tại là tài liệu này.** Khi được giao triển khai, Claude phải làm website chạy được theo đặc tả, không chỉ viết thêm kế hoạch. Không cần người dùng gửi lại ảnh mẫu: phần 2–7 mô tả đủ tinh thần thị giác và bố cục để bắt đầu một phiên mới.

### Phạm vi

- Một landing page hoàn chỉnh, responsive, tiếng Việt mặc định và bản tiếng Anh đầy đủ.
- Nội dung giới thiệu đúng Custos: SDK phân tích giao dịch Solana trước ký, ví mẫu và công cụ kiểm chứng.
- Một trải nghiệm đối chiếu A/B từ kết quả mẫu có nguồn, dẫn vào demo thật khi người xem muốn kiểm lại.
- Các lối đi hoạt động tới ví mẫu, Inspector, số liệu có nguồn và tài liệu cho nhà phát triển.
- Kiểm accessibility, production build, route ở đường dẫn con và hiệu năng trang giới thiệu.
- Không tự triển khai toàn bộ roadmap engine, xây ví mới, thêm đăng nhập, thu thập lead, thanh toán hoặc mainnet.

### Các tài liệu cần đọc

1. `AGENTS.md` trong phạm vi sửa nếu có.
2. Tài liệu này: thiết kế và hành vi website.
3. [Demo khác biệt](DEMO-KHAC-BIET-CUSTOS.md): contract các tính năng DW, đặc biệt live A/B, session và signer stub.
4. [Roadmap cập nhật](../UPDATE-CUSTOS.md): acceptance CU khi phải chạm core/consumer.
5. [Tiến độ](roadmap/TIEN-DO.md) và [bàn giao](roadmap/BAN-GIAO.md): trạng thái thực tế.
6. `apps/demo-wallet/vite.config.ts`, `.github/workflows/deploy.yml`, `scripts/dong-goi-ban-trinh-dien.mjs`: cách dựng và phân phối hiện hành.

Nếu code đã tiến xa hơn baseline, kiểm lại và tái dùng. Không hạ tính năng đang hoạt động về trạng thái cũ trong tài liệu. Ngược lại, không đưa tính năng mới chỉ có trong roadmap lên website như đã phát hành.

## 1. Website phải giúp người xem hiểu và làm gì?

### Người xem chính

- Giám khảo mở link lần đầu: cần hiểu Custos làm gì, thấy một tình huống khác biệt và có đường kiểm chứng.
- Nhà phát triển ví/dApp: cần thấy vị trí của SDK trong luồng ký, giới hạn và tài liệu tích hợp.
- Người quan tâm sản phẩm: cần hiểu số tiền thay đổi và quyền tài khoản thay đổi là hai chuyện khác nhau.

### Thông điệp chính

> Custos giúp bạn nhìn rõ hậu quả của một giao dịch Solana trước khi ký — từ thay đổi số dư đến quyền kiểm soát tài khoản.

Đây là cách giới thiệu sản phẩm. Tại nơi trình bày kết quả, phải giữ đúng phạm vi dữ liệu đã đọc, nguồn simulation và giới hạn. Không diễn đạt thành bảo đảm tất cả hậu quả đều được biết trước.

### Hành trình ưu tiên

```text
Hiểu công dụng → xem cùng số tiền nhưng khác quyền → mở bằng chứng
→ thử demo → nếu quan tâm kỹ thuật, mở Inspector / SDK / số liệu
```

Website thành công khi người mới có thể trả lời: Custos kiểm gì? Vì sao giao dịch B đáng ngại? Bằng chứng ở đâu? Làm thế nào thử tiếp? Không cần số liệu thị trường/phỏng vấn để tạo ra trải nghiệm này.

### Quyết định thiết kế đã chốt

1. Bố cục giới thiệu sản phẩm với hero hai cột; không dùng bố cục dashboard làm toàn bộ landing.
2. Màu tím đậm + kem + lilac; xanh vàng chỉ nhấn hành động/điểm khác biệt. Nhận diện Custos nối bằng tên, mascot sẵn có và nội dung thật.
3. Điểm nhớ là **bảng giao dịch hé lộ quyền bị đổi**, không phải animation khối 3D.
4. Landing có entry riêng `gioi-thieu.html` trong app Vite hiện hữu. Root vẫn là ví mẫu trong phạm vi này.
5. Minh họa đọc từ artifact đã kiểm có nhãn; mọi nút tuyên bố chạy thật phải đi vào luồng thật.

## 2. Chuyển tinh thần ảnh mẫu sang Custos

Các ảnh mẫu được quan sát trực tiếp trong yêu cầu; chưa thực hiện audit website N.E.D đang online. Chỉ kế thừa cách tổ chức thị giác, không kế thừa tuyên bố sản phẩm hoặc quan hệ đối tác trong ảnh.

| Thành phần trong mẫu | Áp dụng cho Custos | Quyết định cụ thể |
|---|---|---|
| Navbar tím đậm, logo, menu, VI/EN, CTA | Giữ tinh thần | Logo Custos; Cách hoạt động / Trải nghiệm / Cho nhà phát triển / FAQ |
| Headline trắng lớn bên trái | Giữ | “Trước khi ký, nhìn rõ điều sẽ thay đổi.” |
| Điện thoại nghiêng bên phải | Chuyển thành giao diện Custos | Khung sản phẩm hiển thị số dư và quyền; không giả Custos là app mobile đã phát hành |
| Cube nổi và lưới nền | Giảm, gắn với nội dung | Hai thẻ instruction Transfer / SetAuthority quanh khung; không tạo mưa cube |
| Nút lilac, nút sáng, viền và bóng cứng | Giữ có tiết chế | Nút chính lilac; bóng lệch tối; trạng thái bấm rõ |
| Dải logo đối tác chạy ngang | Chuyển mục đích | Dải thông tin sản phẩm tĩnh: Solana Devnet / SDK / Inspector / bằng chứng |
| Ba thẻ chức năng | Giữ ở một phần duy nhất | Xem hậu quả / Hiểu cảnh báo / Kiểm bằng chứng |
| Phần tương tác chia hai cột | Giữ | Lựa chọn A/B bên trái, kết quả và owner bên phải |
| Ba bước bắt đầu | Giữ vì đây là chuỗi thật | Chọn tình huống → xem hậu quả → mở bằng chứng |
| Mascot làm bạn đồng hành | Tái dùng Custos | Dino xuất hiện ở logo và một chú thích, không phủ kín trang |

**Không đưa vào:** logo trường/BTC như đối tác nếu chưa có căn cứ; lời chứng thực bịa; số người dùng; doanh thu; “bảo mật 100%”; “được audit” nếu chưa có audit tương ứng; tính năng gửi tiền qua số điện thoại/không seed phrase của mẫu.

## 3. Art direction: một bàn kiểm giao dịch dễ tiếp cận

### Cảm giác cần đạt

Ba từ định hướng: **rõ ràng, chắc chắn, có sức sống**. Người xem mở bằng laptop trong phòng sáng hoặc nhìn trên máy chiếu: hero tối tạo điểm mở đầu, phần giải thích nền sáng giúp đọc lâu và xem dữ kiện.

Tham chiếu cụ thể: cấu trúc màu và viền trong ảnh N.E.D; bảng before/after của Custos; mascot dino đã có. Tránh rẽ sang giao diện terminal đen/xanh, ảnh hacker trùm đầu hoặc một trang chỉ có typography và slogan.

### Điểm nhấn hình ảnh riêng

Khung giao dịch ở hero có hai lớp:

- Lớp số dư: “Chuyển 10 token” và “500 → 490” từ kết quả mẫu.
- Lớp quyền: “Chủ tài khoản: Bạn → địa chỉ khác”, được đưa ra phía trước khi người xem chọn biến thể có đổi quyền.

Đường nối mảnh từ instruction `SetAuthority` tới hàng quyền giúp giải thích mối liên hệ **chỉ trong minh họa cấu trúc ca mẫu đã biết**. Với dữ liệu inspect tổng quát, không vẽ liên kết nhân quả nếu evidence chưa resolve được instruction.

Không làm toàn bộ khung nghiêng nhiều vì đây là giao diện cần đọc. Có thể dùng tấm nền phía sau nghiêng 3 độ; nội dung đọc và điều khiển vẫn thẳng. Mobile bỏ tấm nền nghiêng.

### Nhịp màu toàn trang

```text
Navbar + hero: tím đậm
Dải thông tin: xanh vàng sáng, chiều cao thấp
Cách hoạt động: kem
Trải nghiệm A/B: kem với một khung trắng lớn
Bắt đầu: lilac nhạt, khoảng nghỉ ngắn
Cho nhà phát triển: tím đậm
Bằng chứng + FAQ: kem
CTA cuối: lilac
Footer: tím đậm
```

Không lặp cùng một lưới ba card ở mọi phần. Đổi nhịp bằng sơ đồ, một khung tương tác, danh sách tài liệu và accordion.

## 4. Design tokens

### 4.1. Màu

Hex là mốc thiết kế chính xác. Claude có thể chuyển tương đương sang OKLCH theo convention, nhưng phải giữ màu nhìn thấy và đo lại contrast. Namespace `--landing-*`, không ghi đè token của ví mẫu.

| Token | Màu | Công dụng |
|---|---|---|
| `night` | `#17132A` | Hero, developer section, footer |
| `paper` | `#F6F2E8` | Nền sáng, chữ chính trên nền tối |
| `ink` | `#211E2E` | Chữ chính, viền và hard shadow |
| `lilac` | `#B9A3F3` | CTA chính, tấm nhấn hero |
| `lime` | `#D5F45B` | Dải thông tin, nhãn nhấn; không mang nghĩa an toàn |
| `muted` | `#635D71` | Chữ phụ trên nền kem |
| `night-muted` | `#C9C2D9` | Chữ phụ trên nền tối |
| `surface` | `#FFFFFF` | Panel dữ kiện |
| `success-ink` | `#0C6D61` | Trạng thái không có phát hiện trong phạm vi đọc |
| `danger-ink` | `#A12B42` | Nhãn nguy hiểm và quyền thay đổi |
| `danger-surface` | `#FFF0F2` | Hàng quyền đáng ngại |
| `soft-line` | `#D9D2E0` | Đường phân cách không mang thông tin độc lập |

Các cặp màu phẳng đã được tính contrast khi soạn: paper/night 16,15:1; ink/paper 14,56:1; ink/lilac 7,44:1; ink/lime 13,12:1; muted/paper 5,63:1; night-muted/night 10,49:1; success-ink/paper 5,56:1; danger-ink/white 7,14:1. Đây không thay thế đo trên UI cuối, nơi opacity, ảnh và nền thực tế có thể khác.

Không dùng chữ trắng trên lime/lilac. Không dùng màu lime của thương hiệu làm verdict “an toàn”. Focus ring phải nhìn rõ trên cả light/dark, có thể dùng vòng kép với màu đối lập theo nền.

### 4.2. Typography

- Display: **Manrope 800** cho H1/H2 và số liệu minh họa lớn.
- Body/UI: **Be Vietnam Pro 400/500/600/700** cho đoạn văn, menu và nút.
- Code/địa chỉ: system `ui-monospace, Consolas, monospace`; không tải thêm font chỉ để làm vài dòng code.
- Tối ưu số weight thực tải; ưu tiên 400/600/700 cho body nếu 500 không cần. Self-host WOFF2 có license và glyph tiếng Việt đầy đủ; `font-display: swap`.
- Kiểm riêng chuỗi “Trước khi ký”, “quyền kiểm soát”, “bằng chứng”, “đã thay đổi”, chữ đậm và dấu kép. Không dùng fallback làm mất dấu hoặc cắt dấu do line-height quá thấp.

Nguồn font để Claude lấy metadata/license: [Manrope trên Google Fonts](https://fonts.google.com/specimen/Manrope), [metadata Manrope](https://github.com/google/fonts/blob/main/ofl/manrope/METADATA.pb), [Be Vietnam Pro trên Google Fonts](https://fonts.google.com/specimen/Be+Vietnam+Pro), [metadata Be Vietnam Pro](https://github.com/google/fonts/blob/main/ofl/bevietnampro/METADATA.pb). Pin nguồn tài sản tải về trong manifest, không hotlink font không rõ nguồn.

| Vai trò | Desktop | Mobile | Line-height |
|---|---|---|---|
| H1 | 64–76px | 38–44px | 1,14–1,18, tăng nếu dấu bị cắt |
| H2 | 40–48px | 28–34px | 1,2 |
| H3 | 24–28px | 22–24px | 1,3 |
| Hero body | 18–20px | 17–18px | 1,65 |
| Body | 16–18px | 16px | 1,65 |
| Menu/button | 15–16px, 600/700 | 15–16px | 1,3 |
| Label/caption | 13–14px | 13–14px | 1,5 |
| Code | 13–14px | 13px | 1,6 |

H1 dùng `clamp()`, letter-spacing tối đa khoảng -0,03em; body không âm. `text-wrap: balance` cho heading, độ rộng đoạn 55–65 ký tự. Không ép line break desktop sang mobile; mẫu ngắt dòng ở mục 6 là định hướng, không phải ràng buộc cứng.

### 4.3. Kích thước, viền, bóng

- Container tối đa 1240px; gutter 24px desktop, 20px tablet, 16px mobile.
- Lưới desktop 12 cột; hero khoảng 5/7 hoặc 6/6 tùy copy thực, gap 48–64px.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px.
- Section padding desktop 88–112px; tablet 64–80px; mobile 48–64px. Phần tiếp nối cùng chủ đề có thể ngắn hơn.
- Navbar 76–80px desktop, tối thiểu 64px mobile. Sticky có nền kín, không blur kính nặng.
- Card radius 14–16px, panel lớn 16px; border 2px `ink` ở surface sáng. Divider 1px; không tất cả khối đều cần border.
- Hard shadow panel chủ lực `7px 7px 0 var(--landing-ink)`; card nhỏ `4px 4px 0`; không chồng glow/blur.
- Nút cao ít nhất 48px, horizontal padding 22–24px, radius 10–12px, border 2px. Active dịch 2px và giảm shadow để có cảm giác nhấn thật.
- Tag hình pill chỉ cho trạng thái/nguồn; không biến mọi heading thành pill.

## 5. Sitemap và bố cục tổng thể

### Route sản phẩm

| Bề mặt | Dev | Production hiện hành dự kiến |
|---|---|---|
| Website mới | `/gioi-thieu.html` | `/Custos-Solana/gioi-thieu.html` |
| Ví mẫu hiện có | `/` | `/Custos-Solana/` |
| Inspector | `/soi.html` | `/Custos-Solana/soi.html` |
| Số liệu | `/so-lieu.html` | `/Custos-Solana/so-lieu.html` |

Đây là thiết kế route theo Vite config đang có, không phải xác nhận các URL mới đã deploy. Tạo URL từ `import.meta.env.BASE_URL` hoặc helper chung; không rải chuỗi `/Custos-Solana/` trong component.

Giữ `index.html` và flow dApp → ví đang dùng root. Chuyển landing thành homepage root là một migration riêng với kiểm handoff, deep link, CI, README và link đã chia sẻ; không lén thực hiện trong task này.

### Thứ tự section

| Thứ tự | Anchor | Nội dung | Hành động chính |
|---|---|---|---|
| 1 | `#dau-trang` | Navbar và hero | Mở demo Custos |
| 2 | Không cần anchor menu | Dải thông tin sản phẩm | Không cần CTA |
| 3 | `#cach-hoat-dong` | Ba giá trị và luồng phân tích | Xem tình huống |
| 4 | `#trai-nghiem` | A/B cùng số tiền, khác quyền | Xem bằng chứng / chạy demo |
| 5 | `#bat-dau` | Ba bước dùng thử | Đi tới demo |
| 6 | `#nha-phat-trien` | Vị trí SDK, tích hợp và công cụ | Đọc hướng dẫn SDK |
| 7 | `#bang-chung` | Tài liệu và phạm vi đã kiểm | Mở số liệu có nguồn |
| 8 | `#faq` | Câu hỏi thường gặp | Accordion |
| 9 | `#thu-custos` | CTA cuối | Mở demo Custos |
| 10 | Footer | Repo, docs, giới hạn, nhận diện | Các link có thật |

Các anchor giữ ổn định khi đổi ngôn ngữ. Có `scroll-margin-top` lớn hơn navbar; không để tiêu đề bị che khi mở link trực tiếp.

### Wireframe desktop

```text
┌────────────────────────────────────────────────────────────────────┐
│ Dino CUSTOS   Cách hoạt động  Trải nghiệm  Builders  FAQ  VI/EN [Demo]│
├────────────────────────── nền tím đậm ──────────────────────────────┤
│ Solana · Phân tích trước ký       ┌── Custos / kết quả mẫu ──────┐   │
│                                  │ A: Chuyển 10 token          │   │
│ Trước khi ký,                    │ B: Chuyển + đổi chủ          │   │
│ nhìn rõ điều                     │ Số dư:      500 → 490        │   │
│ sẽ thay đổi.                     │ Chủ tài khoản: Bạn → Khác  │   │
│                                  └─────────────────────────────┘   │
│ Đoạn mô tả 2–3 dòng              [Transfer]      [SetAuthority]     │
│ [Mở demo Custos →] [Xem cách hoạt động]                             │
│ Demo Devnet · Không dùng tài sản thật                               │
├──── Devnet ───── SDK ───── Inspector ───── Bằng chứng có nguồn ──────┤
│             Xem giao dịch ở cả số dư lẫn quyền                       │
│ [Xem hậu quả]         [Hiểu cảnh báo]         [Kiểm bằng chứng]       │
│                                                                    │
│ Cùng chuyển 10 token.             ┌─────────────────────────────┐   │
│ Khác quyền kiểm soát.             │ A       | B                 │   │
│ Chọn biến thể và mở chi tiết.     │ balance | owner | evidence  │   │
│ [A] [B] [Vì sao cảnh báo?]        └─────────────────────────────┘   │
├────── Chọn tình huống → Xem hậu quả → Mở bằng chứng ─────────────────┤
│ Tích hợp vào luồng ký             ┌── Trích dẫn API đã kiểm ────┐   │
│ [SDK] [Inspector] [CLI docs]      └─────────────────────────────┘   │
├───────────────────── nền kem ──────────────────────────────────────┤
│ Bằng chứng và giới hạn          Danh sách link có nguồn              │
│ FAQ                             Các câu hỏi mở/đóng                  │
│                Xem giao dịch bằng một góc nhìn khác                 │
│                        [Mở demo Custos →]                           │
└────────────────────────── Footer ───────────────────────────────────┘
```

### Wireframe mobile

```text
[Dino Custos]             [VI/EN] [Menu]
Solana · Phân tích trước ký
Trước khi ký,
nhìn rõ điều sẽ thay đổi.
Mô tả ngắn
[Mở demo Custos →]
[Xem cách hoạt động]
Demo Devnet · Không dùng tài sản thật
[Khung sản phẩm thẳng, đọc được]
[Dải thông tin 2 × 2]
Heading → ba giá trị xếp dọc
Heading A/B → nút chọn → kết quả → bằng chứng
Ba bước xếp dọc → developer → tài liệu → FAQ → CTA
```

Không giảm toàn bộ desktop bằng `transform: scale()` để vừa điện thoại. Dàn lại nội dung; không có horizontal carousel bắt người xem vuốt mới biết kết quả B.

## 6. Nội dung tiếng Việt theo từng section

Đây là copy nền dùng được trực tiếp. Claude có thể rút gọn để tránh xuống dòng xấu, nhưng không thay nghĩa hoặc mở rộng tuyên bố. Mỗi section dưới đây gồm mục tiêu, nội dung và hành vi.

### 6.1. Navbar

- Brand: `Custos`; dòng phụ nhỏ nếu còn chỗ: `Solana transaction insights`.
- Menu: `Cách hoạt động`, `Trải nghiệm`, `Cho nhà phát triển`, `FAQ`.
- CTA: `Mở demo Custos` với mũi tên phải.
- VI/EN là điều khiển thật; không ship bản EN chỉ dịch navbar.
- Logo về đầu trang giới thiệu. Một link tên rõ trong ví mẫu dẫn ngược về trang giới thiệu; không đổi nút xử lý giao dịch thành nút marketing.
- Mobile: menu button có tên, `aria-expanded`, điều khiển vùng nav; đóng bằng Escape và chọn link, trả focus khi cần. Không bắt buộc overlay toàn màn hình.

### 6.2. Hero

Eyebrow duy nhất ở đầu: `Solana · Phân tích giao dịch trước ký`.

H1:

> Trước khi ký, nhìn rõ điều sẽ thay đổi.

Mô tả:

> Custos mô phỏng giao dịch Solana, chỉ ra thay đổi về tài sản và quyền kiểm soát, rồi đưa bạn đến dữ kiện đứng sau cảnh báo.

CTA chính: `Mở demo Custos` → ví mẫu hoặc live demo DW đã thực sự hoạt động.

CTA phụ: `Xem cách hoạt động` → `#cach-hoat-dong`.

Microcopy: `Bản thử nghiệm trên Devnet. Không dùng tài sản thật.`

Khung sản phẩm bên phải:

- Header `Custos / Trước khi ký`.
- Nhãn `Kết quả mẫu đã lưu`; hiển thị `Devnet` tách biệt. Chỉ riêng chữ Devnet không đủ phân biệt live với mẫu.
- Dòng lớn `Chuyển 10 token`.
- Dòng số dư `500 → 490 token` từ fixture có provenance.
- Dòng quyền `Chủ tài khoản token: Bạn → địa chỉ khác` với icon và nhãn `Quyền thay đổi`.
- Link `Xem tình huống này` tới `#trai-nghiem`.
- Caption `Minh họa từ một lượt mô phỏng Devnet; không phải giao dịch đã gửi.`

Không nhét đầy logs, graph hoặc reason code dài vào hero. Khung preview là hình ảnh chủ lực được dựng bằng DOM/CSS, không phải ảnh render chứa chữ khó đọc. Nó không phải màn kết quả live nên không có animation “đang quét” giả.

### 6.3. Dải thông tin

Dải lime thấp, thông tin tĩnh, có thể 4 cột desktop / 2 × 2 mobile:

- `Solana Devnet` — `Môi trường thử nghiệm`.
- `SDK` — `Dành cho ví và dApp`.
- `Inspector` — `Kiểm tra transaction`.
- `Bằng chứng` — `Xem dữ kiện và giới hạn`.

Không gắn heading “Đối tác của chúng tôi”. Các ô là năng lực/đường truy cập, không logo endorsement. Không marquee, không stripes dày, không gắn con số test vào dải này.

### 6.4. Ba giá trị và luồng hoạt động

H2: `Xem giao dịch ở cả số dư lẫn quyền.`

Mở đầu:

> Một giao dịch có thể chuyển đúng số token bạn thấy, đồng thời thay đổi cách tài khoản được kiểm soát. Custos giúp làm rõ những thay đổi đó trong phạm vi dữ liệu đã phân tích.

| Thẻ | Nội dung | Hình ảnh nhỏ |
|---|---|---|
| Xem hậu quả | Đối chiếu trạng thái trước và sau mô phỏng để thấy thay đổi về tài sản, phí và quyền. | Hai hàng before/after, không dùng số giả như đo live |
| Hiểu cảnh báo | Đọc hành vi đáng chú ý bằng ngôn ngữ rõ ràng, cùng phạm vi Custos đã kiểm được. | Một hàng cảnh báo về chủ tài khoản |
| Kiểm bằng chứng | Đi từ cảnh báo tới dữ kiện liên quan và mở thêm chi tiết khi cần kiểm sâu. | Account → dữ kiện, liên kết có nghĩa |

Ngay dưới là sơ đồ gọn:

`Transaction chưa ký → Mô phỏng và đọc dữ liệu → Luật phát hiện → Kết quả kèm bằng chứng`.

Chú thích: `Ví hoặc dApp tích hợp Custos quyết định cách dùng kết quả trong luồng ký.` Không vẽ Custos tự động kiểm soát mọi ví trên Solana.

### 6.5. Trải nghiệm A/B — phần trung tâm

H2: `Cùng chuyển 10 token. Khác quyền kiểm soát.`

Mô tả:

> Hai tình huống dưới đây cùng để lại 490 token trong lượt mô phỏng mẫu. Nhưng một tình huống còn chuyển quyền kiểm soát tài khoản sang địa chỉ khác.

Nhãn cố định: `Kết quả mẫu · Devnet · mô phỏng độc lập` cùng thời điểm từ fixture.

Điều khiển:

- `A · Chỉ chuyển token`.
- `B · Chuyển và đổi chủ`.
- `So sánh A/B` trên desktop có thể là chế độ mặc định; mobile mặc định B kèm nút rõ để xem A.

Kết quả:

| Trường | A | B |
|---|---|---|
| Token chuyển | 10 | 10 |
| Số dư sau mô phỏng | 490 | 490 |
| Thao tác đổi chủ tài khoản | Không có trong transaction mẫu | Có |
| Kết luận lượt mẫu | Không phát hiện nguy hiểm trong phần đã đọc | Phát hiện thay đổi quyền kiểm soát |

Không suy before/after owner của A chỉ từ việc không có `diff`. Nếu cần hiển thị owner A cụ thể, lấy từ Facts đầy đủ. Khi nguồn chỉ đủ kết luận cấu trúc transaction, dùng đúng dòng “Không có trong transaction mẫu”.

Panel bằng chứng mở bằng `Vì sao cảnh báo?`:

- `Điều thay đổi`: chủ sở hữu token account.
- `Trước` / `Sau`: lấy giá trị từ artifact, giữ địa chỉ đầy đủ trong dữ liệu nếu có.
- `Nguồn`: kết quả mô phỏng mẫu và mã phiên bản/commit nguồn nếu có.
- `Luật`: `SPL_SET_AUTHORITY__ACCOUNT_OWNER` ở lớp kỹ thuật.
- `Giới hạn`: đây là hai simulation độc lập; không chứng minh cùng atomic snapshot hoặc giao dịch đã được thực thi.

CTA: `Mở demo để kiểm tra` với chú thích `Bạn sẽ chuyển sang ứng dụng demo.` Nếu live DW A/B đã tích hợp, đổi thành `Tự thay đổi tình huống` và link đúng route; chỉ đổi khi test tuyến đó đạt.

Kết luận ngắn dưới panel:

> Số tiền là một phần của câu chuyện. Quyền kiểm soát cũng cần được nhìn thấy.

### 6.6. Bắt đầu trong ba bước

H2: `Tự xem một giao dịch thay đổi điều gì.`

1. **Chọn tình huống:** mở demo Custos và chọn giao dịch thử nghiệm.
2. **Xem hậu quả:** đọc thay đổi tài sản, quyền và phạm vi phân tích.
3. **Mở bằng chứng:** xem dữ kiện liên quan hoặc chuyển sang Inspector để kiểm sâu hơn.

Nút: `Bắt đầu với demo`. Chú thích: `Dùng tình huống thử nghiệm, không nhập seed phrase hoặc khóa riêng.`

Không dùng flow đăng ký/OTP giống N.E.D vì Custos hiện không cần các bước đó. Không hứa “chỉ 30 giây” khi chưa đo.

### 6.7. Cho nhà phát triển

Nền tối, H2: `Đưa phần kiểm tra vào trước bước ký.`

Mô tả:

> Tích hợp Custos vào ví hoặc dApp để phân tích transaction chưa ký, hiển thị cảnh báo và cho người dùng xem dữ kiện liên quan.

Sơ đồ có ranh giới:

```text
Ứng dụng tạo transaction → Custos inspect → UI hiển thị kết quả
                                            ↓
                        Consumer kiểm phiên/consent → signer của ví
```

Chú thích: `SDK cung cấp kết quả phân tích. Consumer chịu trách nhiệm gắn kết quả với đúng transaction và xử lý điều kiện ký.`

Các link: `Đọc hướng dẫn SDK`, `Mở Inspector`, `Xem hướng dẫn CLI`.

Code panel lấy **một excerpt ngắn từ API hiện hành đã compile/test**. Không dùng API tưởng tượng như `custos.protectWallet()`; không hiện đoạn `if safe then sign()` thiếu coverage/session/consent. Nếu excerpt chỉ gọi inspect, đặt chú thích “Ví dụ phân tích; xem hướng dẫn consumer trước khi nối vào bước ký”.

Không hứa npm bản công khai chứa mọi feature của HEAD. Tài liệu phải phân biệt version đã publish với source/tarball nếu còn lệch. Landing không tự publish để làm khớp lời hứa.

### 6.8. Bằng chứng và giới hạn

H2: `Có dữ kiện để xem, có giới hạn để biết.`

Mô tả:

> Bạn có thể mở mã nguồn, xem cách đo và kiểm tra các tình huống đã ghi nhận. Kết quả cần được đọc cùng phạm vi hỗ trợ và điều kiện mô phỏng.

Trình bày dạng danh sách tài liệu 2 cột, không làm bảng số đếm hoành tráng:

- `Mã nguồn và hướng dẫn` — repo và tài liệu tích hợp.
- `Số liệu kèm cách đo` — trang số liệu hiện có.
- `Phạm vi hỗ trợ` — tài liệu capability/giới hạn đã được đối chiếu.
- `Tình huống minh họa` — nguồn dữ liệu cho A/B trên website.

Mỗi link có mô tả và đích thật. Không nối vào một `README#anchor` không tồn tại. Không đưa báo cáo nội bộ chứa dữ liệu không phù hợp công khai vào site chỉ vì cần thêm “bằng chứng”.

Giới hạn dễ đọc:

> Custos không bảo đảm một giao dịch an toàn tuyệt đối. Dữ liệu thiếu, chương trình chưa hỗ trợ và thay đổi trạng thái mạng có thể giới hạn kết quả. Bản demo dùng Solana Devnet.

### 6.9. FAQ

**Custos có phải một ví mới không?**

Custos tập trung vào phân tích giao dịch trước ký. Dự án có ví mẫu để trình diễn cách tích hợp; mục tiêu không phải yêu cầu người dùng chuyển tài sản sang một ví mới.

**Tôi có cần nhập seed phrase hoặc dùng tài sản thật để thử không?**

Không cần cho website và luồng tình huống mẫu này. Demo sử dụng Devnet. Không nhập seed phrase hoặc khóa riêng vào trang giới thiệu hay Inspector.

**Kết quả “không phát hiện nguy hiểm” có nghĩa là an toàn tuyệt đối không?**

Không. Kết quả chỉ có ý nghĩa trong phạm vi dữ liệu và chương trình đã phân tích. Hãy đọc coverage, dữ kiện còn thiếu và giới hạn đi kèm.

**AI có quyết định giao dịch nguy hiểm không?**

Kết luận của lớp luật tất định được tách khỏi phần diễn giải. Nếu dùng AI để hỗ trợ giải thích, phần đó không được tự thay verdict hoặc sáng tạo dữ kiện.

**Tôi có thể thử transaction khác không?**

Có thể dùng Inspector với đầu vào và mạng nằm trong phạm vi được công cụ hỗ trợ. Inspector phân tích transaction; không nhập khóa riêng và không coi kết quả là bảo đảm an toàn.

**Website đang chạy kiểm tra trực tiếp hay hiển thị kết quả mẫu?**

Khung giới thiệu và phần A/B trên trang có nhãn kết quả mẫu đã lưu. Nút mở demo dẫn tới ứng dụng để chạy kiểm tra. Chế độ live hoặc replay phải được ghi rõ tại nơi hiển thị kết quả.

**Custos có tự chặn mọi ví ký giao dịch nguy hiểm không?**

Không. Ví hoặc dApp cần tích hợp và xử lý kết quả đúng. Consumer tham chiếu là nơi dự án minh họa các điều kiện trước khi gọi signer.

**Tôi bắt đầu tích hợp từ đâu?**

Mở hướng dẫn SDK và consumer mẫu. Kiểm phiên bản gói, phạm vi hỗ trợ và hành vi khi mô phỏng lỗi trước khi kết nối vào luồng ký của ứng dụng.

### 6.10. CTA cuối và footer

H2: `Xem giao dịch bằng một góc nhìn khác.`

Mô tả: `Bắt đầu từ một tình huống mẫu, rồi mở dữ kiện đứng sau cảnh báo.`

CTA: `Mở demo Custos`; link phụ `Đọc tài liệu tích hợp`.

Footer gồm logo Custos, một câu định vị, link Demo / Inspector / SDK / GitHub / Số liệu. Ghi `Bản thử nghiệm trên Solana Devnet`. Tên nhóm lấy từ dữ liệu dự án đã xác nhận; không tự thêm ảnh thành viên hoặc danh xưng cố vấn.

Không hiển thị icon mạng xã hội chưa có đích. Không thêm newsletter, giá gói, chính sách trả phí hoặc email tự đoán.

## 7. Hợp đồng tương tác và chuyển động

### 7.1. Navbar, anchor và ngôn ngữ

- Sticky navbar không giật chiều cao khi cuộn. Chỉ đổi border/shadow nhẹ khi cần phân cách.
- Anchor dùng link thật; không chặn hành vi mặc định bằng JavaScript không cần thiết. Back/forward vẫn hoạt động.
- Language switch cập nhật copy, `document.documentElement.lang`, title và mô tả. URL `?lang=vi` / `?lang=en` có thể chia sẻ; query không hợp lệ về VI.
- Chỉ lưu preference ngôn ngữ nếu thuận tiện, có try/catch khi storage bị chặn. Query explicit ưu tiên preference đã lưu; mặc định VI khi cả hai vắng.
- Đổi ngôn ngữ không reset A/B đang chọn hoặc đẩy người xem về đầu trang. Không localize code, address hoặc reason code.
- Link ra ví mẫu không ép tham số locale chưa được ví hỗ trợ. Chỉ giữ ngôn ngữ nếu đích có contract tương ứng.

### 7.2. Khung hero

- Nội dung và CTA hiện ngay; không có splash/loading intro chặn người dùng.
- Một entrance ngắn 350–450ms cho tấm nền/khung, không làm opacity nội dung chính bằng 0 nếu script lỗi.
- Có thể nhấn hàng quyền một lần khi vào viewport; không tự đổi A/B liên tục.
- Hover chỉ nâng panel tối đa 2px trên thiết bị có hover. Không theo con trỏ mọi frame.
- Chip instruction chỉ là label, không mang affordance button nếu không bấm được.
- Mascot nhỏ khoảng 36–52px trong header hoặc 56–72px bên caption, không xuất hiện trên mỗi card.

### 7.3. Mẫu A/B

- Mặc định desktop so sánh hai bên; mobile chọn B để thấy phần quyền, nhưng tiêu đề và điều khiển luôn cho biết có A để đối chiếu.
- Nếu dùng tabs, triển khai đủ keyboard và ARIA tab pattern; nếu không cần độ phức tạp, dùng hai button với `aria-pressed` và một vùng kết quả có heading rõ.
- Khi đổi A/B, dữ liệu mẫu cập nhật trực tiếp. Không tạo spinner vài giây để giống gọi RPC.
- Giữ chiều cao panel đủ ổn định để CTA không nhảy xa. Không đặt `min-height` quá lớn làm mobile trống.
- Mở evidence bằng disclosure/inline expansion; tránh modal cho nội dung ngắn. Giữ focus ở điều khiển và thông báo trạng thái vừa đủ.
- Badge `Kết quả mẫu đã lưu` luôn còn thấy khi đổi A/B hoặc mở bằng chứng.
- Có nút hoặc link mở nguồn; dữ liệu public rút gọn phải truy ngược được về artifact mà không đưa toàn bộ bundle chẩn đoán nặng lên trang.

### 7.4. Nếu nối live A/B của DW

Đây là nâng cấp có điều kiện, không phải điều kiện bắt landing phải tự viết lại engine. Chọn link sang app làm mặc định. Chỉ nhúng live vào landing nếu DW đã có module dùng lại được và kiểm được bundle/lifecycle.

Nếu nhúng:

1. Chỉ tải engine khi người dùng bấm `Chạy kiểm tra trên Devnet`.
2. Đổi nhãn trước khi chạy: sample → running live → live result hoặc error. Không giữ kết quả mẫu dưới nhãn live.
3. Có `idle / loading / success / error / cancelled / stale` theo module hiện hành.
4. Thay input vô hiệu kết quả; abort và bỏ response cũ theo attempt ID.
5. RPC lỗi: hiện lỗi thật, nút thử lại và lựa chọn có nhãn `Xem kết quả mẫu`.
6. Không kết nối ví, ký hoặc broadcast từ landing. Không bật AI có trả phí chỉ vì mở trang.
7. Không thêm collector theo dõi transaction. Không log raw input, full RPC credential hoặc receipt vào console/analytics.

### 7.5. Motion chung

| Tác động | Duration định hướng | Hành vi |
|---|---|---|
| Hover/press button | 120–160ms | Dịch nhẹ, giảm shadow |
| Chuyển panel A/B | 160–220ms | Crossfade nhẹ; text không bị blur |
| Mở evidence/FAQ | 160–220ms | Nếu animation làm focus/height lỗi, dùng native disclosure |
| Hero entrance | 350–450ms | Một lần, không chặn nội dung |
| Anchor scroll | Theo trình duyệt | Tắt smooth khi reduced-motion |

`prefers-reduced-motion: reduce`: bỏ translate/tilt/parallax/reveal, chuyển trạng thái ngay; giữ nguyên nội dung và chức năng. Không autoplay video, không loop float vô hạn, không scroll hijacking, không bắt kéo ngang để tiến câu chuyện.

## 8. Tài sản hình ảnh, logo và dữ liệu

### Tài sản sẵn có

- `apps/demo-wallet/public/custos-dino.png`.
- `apps/demo-wallet/public/custos-dino-favicon.png`.
- `docs/review/demo-wow-20260918/` có ảnh và kết quả thử lịch sử, dùng để đối chiếu khi chuẩn bị nội dung.

Kiểm kích thước/chất lượng trước dùng. Không kéo giãn PNG nhỏ làm hero. Logo dùng mascot + wordmark chữ rõ; không tự vẽ mascot mới lệch nhận diện khi file hiện tại dùng được.

### Tài sản cần tạo khi triển khai

| Tài sản | Cách tạo | Điều kiện nghiệm thu |
|---|---|---|
| Product preview hero | Semantic DOM/CSS, dữ liệu mẫu | Đọc được ở mobile, nhãn mẫu không mất |
| Mini hình minh họa ba giá trị | SVG/icon nhất quán + dữ liệu rút gọn | Có ý nghĩa, không giả screenshot tính năng chưa có |
| Social preview | 1200×630, từ bố cục đã duyệt bằng code/chụp | Logo + headline + một hàng quyền; URL local đúng |
| Font files | Nguồn chính thức, lưu license | Dấu tiếng Việt đủ, không gọi dịch vụ font ngoài lúc render |
| Fixture landing | Tách tối thiểu từ artifact đã kiểm | Có provenance, không có khóa/credential/dữ liệu thừa |
| Ảnh chụp demo thực tế nếu dùng | Chụp bản chạy tại commit ghi nhận | Không gán nhãn screenshot cho mockup |

Hero cần hình sản phẩm, không cần ảnh stock. Không thêm ảnh hacker, khóa 3D hoặc shield bóng chỉ để lấp vùng trống. SVG dùng cho icon/quan hệ đơn giản; không dành công sức vẽ cảnh minh họa phức tạp không giúp hiểu sản phẩm.

Các asset chứa chữ do render/chụp phải có ngôn ngữ tương ứng hoặc caption phù hợp; hero text chính luôn là HTML. Decorative image dùng alt rỗng; screenshot có alt mô tả mục đích và trạng thái mẫu.

## 9. Quy tắc về dữ liệu và tuyên bố sản phẩm

### 9.1. Phân loại hiển thị

| Trạng thái | Nhãn trên UI | Được nói gì? |
|---|---|---|
| Minh họa không chạy engine | Minh họa | Giải thích cấu trúc/khái niệm, không gọi là kết quả đo |
| Artifact từ lần kiểm trước | Kết quả mẫu đã lưu | Kết quả tại lần kiểm ghi nhận, không phải chain hiện tại |
| Phân tích lại snapshot offline | Replay | Phần engine/version thực chạy trên snapshot |
| Simulation mới qua RPC | Kiểm tra Devnet trực tiếp | Kết quả lượt mới với context và giới hạn |

Hiển thị JSON cũ không phải replay. `source: devnet-live-independent-simulations` trong artifact lịch sử không cho phép badge “live” khi chỉ render artifact đó.

### 9.2. Fixture landing

Nguồn khởi đầu: [scenarios.json](review/demo-wow-20260918/scenarios.json). Lượt này ghi nhận A/B chuyển 10 token, số dư 500 → 490. Kiểm lại trường thực tế trước tách dữ liệu; không lấy bản `scenarios-base-units.json` để gắn nhãn 10 token.

Fixture public phải có tối thiểu:

- Schema version riêng của phần hiển thị.
- Loại `recorded-sample`, thời điểm từ artifact, source commit nếu có, mô tả Devnet.
- ID ca, input summary, raw amount dạng chuỗi và decimals nếu UI tự format.
- Kết quả mẫu: level, phần diff cần dùng, reason code, coverage/giới hạn cần công bố.
- Nguồn từng dữ kiện hiển thị: observed/derived/structural; không thêm owner trước/sau còn thiếu.
- Link/identifier về nguồn audit. Nếu giảm dữ liệu để public, ghi rõ fixture hiển thị không phải receipt đủ để replay.

Không import `docs/review/*` trực tiếp vào app runtime. Tạo adapter/extract script nhỏ hoặc fixture được quản lý trong module landing, kèm kiểm consistency về giá trị quan trọng. Không viết thêm pipeline dữ liệu lớn chỉ cho hai mẫu.

### 9.3. Claim registry ở mức vừa đủ

Giữ bản đồ nội dung và nguồn trong module content hoặc tài liệu liền kề: claim, source, trạng thái sẵn sàng. Không cần CMS/backend.

| Nội dung | Nguồn cần đối chiếu | Cách hiển thị |
|---|---|---|
| Có SDK/Inspector/CLI | Code + README + entry hiện hành | Link tới chức năng đã tồn tại |
| Trace/evidence | Code + test liên quan | Nói đúng mức truy được dữ kiện; không hứa mọi instruction có causal trace |
| A/B live | DW-01–03 và kiểm trình duyệt | Chỉ mở CTA thay input khi luồng đã đạt |
| Chặn message mismatch | DW-04 và consumer regression | Không quảng cáo như đã triển khai nếu mới có roadmap |
| Receipt/replay | CU-11/12, DW-07 | Chưa đạt thì bỏ khỏi feature đã có; có thể link roadmap trong docs |
| Test count/latency | Artifact đo cùng phiên bản | Mặc định dẫn sang trang số liệu, không hardcode vào hero |
| Mainnet/audit/đối tác | Bằng chứng riêng phù hợp | Không suy ra từ Devnet, test nội bộ hoặc logo nền tảng |

Thêm test cho integrity dữ liệu, nhãn nguồn và link có ý nghĩa; không viết test khóa mọi câu marketing nguyên văn khiến biên tập khó khăn.

## 10. Bản tiếng Anh và hệ thống nội dung

### Cách tổ chức

- `vi` và `en` dùng cùng cấu trúc key có type checking hoặc cách tương đương repo; không rải ternary ở mọi component.
- Mọi text nhìn thấy/accessible cần dịch: menu, heading, mô tả, button, aria-label, error, loading, alt, caption, FAQ, metadata, nhãn sample/live.
- Không dùng cờ quốc gia làm nhãn ngôn ngữ. Hiển thị `VI / EN`, accessible name “Tiếng Việt / English”.
- Định dạng số theo locale và giữ decimals chính xác; địa chỉ/hash không dịch. Thời điểm có timezone hoặc format rõ, không ambiguous ngày/tháng.
- Bản EN dịch trung thành giới hạn; không đổi “không phát hiện” thành “fully secure”.

### Copy EN nền cho phần chính

| Vị trí | English |
|---|---|
| Nav | How it works · Explore · For developers · FAQ |
| Hero eyebrow | Solana · Transaction analysis before signing |
| Hero H1 | Before you sign, see what changes. |
| Hero body | Custos simulates Solana transactions, surfaces changes to assets and account control, and lets you inspect the evidence behind a warning. |
| CTA chính | Open the Custos demo |
| CTA phụ | See how it works |
| Hero note | Devnet prototype. Do not use real assets. |
| Sample badge | Recorded sample |
| Sample caption | Based on a recorded Devnet simulation. No transaction was broadcast. |
| Giá trị H2 | Look at balances and account control. |
| Giá trị mở đầu | A transaction can transfer the amount you expect while also changing who controls an account. Custos surfaces these changes within the scope of the data it analyzes. |
| Giá trị 1 | See the effects — Compare state before and after simulation to understand changes to assets, fees, and permissions. |
| Giá trị 2 | Understand the warning — Read a clear description of the finding and the scope of the analysis. |
| Giá trị 3 | Inspect the evidence — Follow a warning to the relevant data and open technical details when needed. |
| A/B H2 | Same 10-token transfer. Different account control. |
| A/B body | Both recorded examples leave 490 tokens after simulation. One also transfers control of the token account to another address. |
| A | Transfer only |
| B | Transfer and change owner |
| Bằng chứng button | Why this warning? |
| A kết quả | No danger detected in the analyzed scope |
| B kết quả | Account control changes detected |
| A/B note | Recorded sample · Devnet · independent simulations |
| A/B kết luận | The amount is part of the story. Account control matters too. |
| Start H2 | Explore what a transaction changes. |
| Start 1 | Choose a scenario — Open the demo and select a test transaction. |
| Start 2 | Review the effects — Check changes to assets, permissions, and analysis coverage. |
| Start 3 | Open the evidence — Inspect the relevant data or continue in the Inspector. |
| Start note | Use test scenarios. Do not enter a seed phrase or private key. |
| Developer H2 | Add inspection before signing. |
| Developer body | Integrate Custos into a wallet or dApp to analyze unsigned transactions, display warnings, and expose the relevant evidence. |
| Developer note | The SDK provides analysis. The consumer is responsible for binding it to the correct transaction and enforcing signing conditions. |
| Developer CTAs | Read the SDK guide · Open Inspector · View CLI documentation |
| Evidence H2 | Evidence you can inspect. Limits you can understand. |
| Evidence body | Explore the source code, measurement methods, and recorded scenarios. Read every result alongside its supported scope and simulation conditions. |
| Limit | Custos does not guarantee that a transaction is safe. Missing data, unsupported programs, and changing network state can limit its results. The demo uses Solana Devnet. |
| CTA cuối H2 | Take another look before you sign. |
| CTA cuối body | Start with a sample scenario, then inspect the data behind the warning. |

### FAQ EN

1. **Is Custos a new wallet?** Custos focuses on transaction analysis before signing. The project includes a demo wallet to show integration; it does not ask you to move assets into a new wallet.
2. **Do I need a seed phrase or real assets to try it?** No, not for this website and its sample flow. The demo uses Devnet. Do not enter a seed phrase or private key into the landing page or Inspector.
3. **Does “no danger detected” mean a transaction is completely safe?** No. The result is limited to the data and programs analyzed. Review coverage, missing evidence, and the stated limitations.
4. **Does AI decide whether a transaction is dangerous?** Deterministic rule results are separate from explanations. If AI helps explain a result, it must not override the verdict or invent evidence.
5. **Can I inspect another transaction?** Use Inspector for inputs and networks within its supported scope. Its analysis is not a guarantee of safety, and it does not need your private key.
6. **Is this page running a live check or showing a sample?** The product preview and A/B section show labeled, recorded samples. The demo button opens the application for further checks. Live and replay modes must be labeled where results appear.
7. **Does Custos automatically stop every wallet from signing?** No. A wallet or dApp must integrate it and handle its results correctly. The reference consumer demonstrates checks before calling a signer.
8. **Where should I start integrating?** Read the SDK guide and reference consumer. Verify package versions, supported scope, and failure handling before connecting analysis to your signing flow.

### Microcopy trạng thái

| Ngữ cảnh | VI | EN |
|---|---|---|
| Copy thành công | Đã sao chép | Copied |
| Clipboard lỗi | Chưa sao chép được. Bạn có thể chọn và sao chép nội dung. | Could not copy. You can select and copy the content. |
| Sample thiếu | Chưa tải được kết quả mẫu. Thử lại hoặc mở demo. | Could not load the sample. Retry or open the demo. |
| Tải module live, nếu có | Đang mở công cụ kiểm tra… | Loading the inspection tool… |
| Đang kiểm live | Đang kiểm tra trên Devnet… | Checking on Devnet… |
| Đầu vào đổi | Đầu vào đã thay đổi. Cần kiểm lại. | The input has changed. Run a new check. |
| RPC lỗi | Chưa hoàn tất kiểm tra. Thử lại hoặc xem kết quả mẫu. | The check did not complete. Retry or view the recorded sample. |
| Nguồn | Nguồn dữ liệu | Data source |
| Địa chỉ | Xem địa chỉ đầy đủ | Show the full address |
| Menu | Mở menu / Đóng menu | Open menu / Close menu |

Claude bổ sung các key nhỏ chưa liệt kê với cùng giọng văn; nghiệm thu bản EN phải đi qua toàn trang và mọi trạng thái, không chỉ kiểm đủ key count.

## 11. Kiến trúc đề xuất trong repository

### 11.1. Tận dụng app Vite hiện hữu

Baseline có React, TypeScript, Tailwind/Vite và multi-page entry. Thêm entry nhẹ trong `apps/demo-wallet`; không cần Next.js, một app khác hoặc backend chỉ cho landing này.

Cấu trúc đề xuất, Claude được đổi tên theo convention nhưng phải giữ tách trách nhiệm:

```text
apps/demo-wallet/
  gioi-thieu.html                  # entry mới, metadata VI mặc định
  src/
    landing.tsx                   # mount landing, không import wallet main
    landing/
      LandingPage.tsx
      landing.css                 # token/style chỉ của landing
      content.ts                  # copy VI/EN có cùng schema
      links.ts                    # base-aware URLs và link ngoài đã kiểm
      sample.ts                   # fixture/adapter tối thiểu, provenance
      SiteHeader.tsx
      Hero.tsx
      TransactionPreview.tsx
      ValueSection.tsx
      ScenarioExplorer.tsx
      EvidenceDisclosure.tsx
      GettingStarted.tsx
      DeveloperSection.tsx
      ProofSection.tsx
      FAQ.tsx
      SiteFooter.tsx
  public/
    landing/
      fonts/                      # asset có license
      social-preview-vi.*
      social-preview-en.*
      asset-sources.md
```

Không nhất thiết tách một file cho một dòng chữ. Component lớn tách khi có state/trách nhiệm riêng; ưu tiên ít abstraction và dễ đọc.

### 11.2. Không kéo bundle ví vào landing

- Landing entry không import `main.tsx`, `App.tsx`, `vi.ts` hoặc toàn bộ core chỉ để render hình.
- Không dùng `iframe` nạp ví vào hero: nặng, khó responsive/focus và có thể kích hoạt RPC ngoài ý muốn.
- Scenario mẫu chỉ cần data tối thiểu và component trình bày. Không import `@solana/web3.js`, AI client hoặc signer tại top-level của landing.
- Tái dùng component thật khi dependency nhẹ và style không xung đột. Nếu `Trace.tsx` kéo quá nhiều context, trích component trình bày thuần dùng shared types thay vì copy logic phân tích.
- Không thêm thư viện animation/3D vì hai thẻ dịch vài pixel. CSS đủ cho design đã chốt.

### 11.3. CSS cô lập

- Root `.custos-landing`, tokens `--landing-*`; không import `style.css` của ví chỉ để lấy vài màu.
- Nếu dùng Tailwind chung, kiểm ảnh hưởng Preflight và content scan ở build. Không sửa rule `body`, `button`, `h1` của ví để làm landing đẹp.
- Các trang là HTML entry tách biệt nhưng shared CSS/chunk vẫn cần kiểm network. Chỉ dùng global rule trong CSS entry landing khi chắc không được app khác import.
- Giữ ý nghĩa token trạng thái của sản phẩm, không đổi danger thành màu trang trí tím/lime.

### 11.4. Build, base path và CI

Trong `apps/demo-wallet/vite.config.ts`, thêm input mới vào `build.rollupOptions.input`. Giữ nguyên:

- `base` phân biệt dev với build/preview; production hiện có `/Custos-Solana/`.
- Điều kiện `isPreview`, tránh lỗi JS trả về HTML dưới prefix.
- `css: { postcss: {} }`, vì repo có bẫy PostCSS từ thư mục cha.
- Cấu hình Buffer/global của các entry ví; landing không cần nó trong initial dependency graph nhưng không được xóa làm hỏng ví.
- Các input `main`, `soLieu`, `phongVan`, `soi` hiện hành.

Workflow hiện copy toàn bộ `apps/demo-wallet/dist/*` sang `site/`; kiểm trang mới đi theo đường này. Bổ sung base-path check cho `gioi-thieu.html` và asset quan trọng; không chỉ kiểm status 200, phải đọc MIME và xác nhận browser render.

Nếu cập nhật gói demo offline, đối chiếu `scripts/dong-goi-ban-trinh-dien.mjs` và danh sách trang hardcode. Thêm landing có kiểm, không đổi URL root của ví. Link ra Internet trong gói offline phải có hành vi/mô tả rõ khi không truy cập được.

README có thể thêm link trang giới thiệu sau khi route được build và kiểm local; không viết “đã online” trước deploy. Task này dừng ở bản build có thể review nếu chưa có quyền triển khai ngoài.

## 12. Accessibility, responsive và hiệu năng

### 12.1. Accessibility

- Một H1, hierarchy H2/H3 hợp lý; semantic header/nav/main/section/footer, skip link tới main.
- Button cho hành động, anchor cho điều hướng. Không lồng button trong anchor hoặc dùng div có click thay control chuẩn.
- Visible focus, target tối thiểu 44×44px; nút chính cao 48px như design.
- Text/body đo contrast mục tiêu ít nhất 4,5:1; UI/focus rõ; kiểm trên background thực, không chỉ hex.
- Warning có icon + tên + mô tả, không dựa riêng màu đỏ/xanh.
- FAQ dùng `<details><summary>` nếu đáp ứng design; nếu custom phải có expanded/controls và keyboard đúng.
- Không trap focus trong panel inline; menu đóng không để focus rơi vào nội dung ẩn.
- 200% zoom và reflow ở bề rộng tương đương 320 CSS px vẫn đọc và thao tác được.
- Icon decorative ẩn với screen reader; icon-only button có accessible name theo locale.
- Reduced-motion, no-JS fallback và font-failure không làm mất nội dung chính.

### 12.2. Responsive

| Bề rộng | Bố cục cần kiểm |
|---|---|
| 320 / 360 / 390px | Một cột, H1 đủ dấu, CTA wrap hợp lý, owner/address không làm tràn |
| 768px | Hero có thể một cột; không ép hai cột khiến chữ quá hẹp |
| 1024px | Kiểm menu và hero không va; có thể dùng menu gọn nếu cần |
| 1280 / 1440px | Hero hai cột; trải nghiệm A/B có hàng đối chiếu rõ |
| 1920px | Container vẫn giới hạn, không giãn paragraph toàn màn hình |

Ở laptop 1440×900, hero phải thấy H1, mô tả, CTA và phần quyền trong preview mà không cần cuộn. Không ép mọi thiết bị thấy toàn hero trong một viewport. Trên mobile, CTA có trước product preview; không dùng `height: 100vh` cắt nội dung.

Kiểm cả VI và EN; bản EN không được coi là pass chỉ vì VI không tràn. Full address/hash dùng wrap hoặc vùng scroll riêng trong raw detail; layout tổng không scroll ngang.

### 12.3. Budget hiệu năng — mục tiêu thiết kế, chưa phải số đã đo

- Initial JS landing mục tiêu ≤120KB gzip, loại trừ module live chỉ tải sau thao tác. Đo graph/chunk thực, không tính mỗi file entry mà bỏ shared chunk.
- CSS mục tiêu ≤35KB gzip; tổng font ưu tiên ≤250KB WOFF2. Nếu vượt, đo và tối ưu weight/subset hợp lý, không bỏ glyph tiếng Việt để đạt số.
- Hero DOM/CSS nhẹ; raster nếu có mục tiêu ≤180KB. Khai width/height hoặc aspect-ratio để giữ chỗ.
- Không gọi RPC/AI/analytics mặc định khi mở landing. Font và hình có thể tải cùng origin.
- Không fetch dữ liệu thị trường hay test count mỗi page load. Link sang trang số liệu có nguồn là đủ.
- Chỉ preload font/asset thực sự cần cho above-the-fold. Lazy-load hình dưới fold, không lazy-load asset LCP chủ lực.
- Mục tiêu lab: LCP ≤2,5s, CLS ≤0,1, TBT ≤200ms với cấu hình máy/throttle ghi rõ. Đo tối thiểu ba lượt cùng cấu hình, lưu từng lượt và median; đây không phải thống kê toàn bộ người dùng hoặc INP field.
- Nếu không có công cụ đo phù hợp, báo chưa đo thay vì suy Lighthouse 100 từ bundle nhỏ.

## 13. Metadata, chia sẻ và độ tin cậy của link

- Title VI: `Custos — Hiểu giao dịch Solana trước khi ký`.
- Title EN: `Custos — Understand Solana transactions before signing`.
- Description VI: `Khám phá Custos: mô phỏng giao dịch Solana, xem thay đổi tài sản và quyền kiểm soát, rồi kiểm tra dữ kiện đứng sau cảnh báo. Bản demo trên Devnet.`
- Description EN: `Explore Custos: simulate Solana transactions, review asset and account-control changes, and inspect the evidence behind warnings. Devnet demo.`
- Dùng favicon Custos hiện hành. `theme-color` theo navbar tối của landing.
- Open Graph/Twitter image từ asset thực, URL đầy đủ dựa trên deployment public đã xác nhận. Không để localhost hoặc domain tự bịa trong production.
- Canonical chỉ đặt sau khi xác định URL chuẩn; không để canonical của ví mẫu cho trang landing.
- Một entry đổi language bằng JavaScript không đảm bảo crawler đọc metadata EN. Ghi rõ giới hạn; nếu cần social preview/SEO độc lập cho EN, tạo entry prerender/HTML EN riêng với cùng component/content, không thêm framework chỉ vì việc này.
- Nội dung HTML tối thiểu/no-JS fallback cần tên, mô tả và link demo/docs thật; hướng ưu tiên là static/prerender HTML khi pipeline hiện hữu cho phép. Không render hai bản nội dung trùng nhau cho screen reader.
- Không thêm schema ratings/reviews/organization partnerships bịa. Social image không chứa badge audit hoặc phần trăm bảo vệ.
- Link ngoài có nhãn rõ; nếu mở tab mới, dùng `rel` phù hợp và báo ngữ cảnh khi cần. Không làm mọi link mở tab mới mặc định.

## 14. Backlog triển khai cho Claude

Mã `WEB-*` dùng tham chiếu phạm vi, không tạo sổ trạng thái cạnh tranh. Thêm một nhóm Website trong `docs/roadmap/TIEN-DO.md` hoặc ghi dưới mục phù hợp, bàn giao tại `docs/roadmap/BAN-GIAO.md`. Không đánh dấu CU/DW DONE từ việc viết copy website.

| Gói | Công việc | Phụ thuộc | Đầu ra nghiệm thu |
|---|---|---|---|
| WEB-00 | Đọc repo, chốt nguồn claim/link và baseline | Không | Biết phần có thật, route, asset và gap; working tree được giữ |
| WEB-01 | Dựng entry và tokens; hero desktop/mobile | WEB-00 | Build mở được, hero đúng định hướng, không ảnh hưởng root ví |
| WEB-02 | Nội dung VI, section và navigation | WEB-01 | Toàn trang có copy thật, CTA/link hoạt động |
| WEB-03 | A/B mẫu + evidence + provenance | WEB-00/02 | Tương tác thật trên data mẫu, không nhãn live giả |
| WEB-04 | Nối demo/Inspector/SDK và feature readiness | WEB-02/03 | Từng CTA khớp chức năng đích; fallback không dead end |
| WEB-05 | EN đầy đủ, responsive, keyboard, motion | WEB-02–04 | Cả hai locale và các viewport đạt kiểm |
| WEB-06 | Asset/font, metadata, bundle/performance | WEB-01–05 | Asset có nguồn, build nhẹ được đo, social image thật |
| WEB-07 | Kiểm production prefix, regression và bàn giao | WEB-01–06 | Evidence review, runbook, không làm hỏng ví/Inspector |

### WEB-00 — Kiểm hiện trạng

Ghi commit/dirty tree; đọc app entry, config, asset, README và roadmap. Xác nhận dino/logo, bản SDK, URL repo và khả năng DW tại HEAD. Chọn nguồn dữ liệu public tối thiểu; không tự chạy script phát giao dịch để tạo hình minh họa.

**Xong khi:** lập được bản đồ `nội dung → nguồn → component → link đích`; gap được ghi rõ. Không yêu cầu phỏng vấn thị trường hoặc mua dịch vụ để bắt đầu.

### WEB-01 — Foundation và hero

Tạo entry, stylesheet cô lập, type scale, container, buttons, header, hero product preview. Dùng nội dung thật ngay từ đầu. Chụp 1440×900 và 390×844, sửa line break/spacing/độ đọc rồi mới nhân design ra các section.

**Xong khi:** diện mạo thể hiện được nền tối, type lớn, lilac CTA, khung quyền nổi bật và cream tiếp nối; ảnh product không bị bé như thumbnail; build/preview route mới hoạt động.

### WEB-02 — Nội dung và nhịp toàn trang

Xây section theo mục 5–6. Làm anchor, FAQ, menu mobile, footer và link registry. Mỗi CTA có đích; không giữ `href="#"`, nút disabled vô nghĩa hoặc Lorem ipsum. Độ dài trang được kiểm qua screenshot toàn trang; cắt lặp copy trước khi giảm font.

**Xong khi:** đọc từ đầu tới cuối có câu chuyện rõ; ba thẻ giá trị chỉ xuất hiện một lần; các phần còn lại có bố cục phù hợp nội dung.

### WEB-03 — Data và A/B

Tạo fixture tối thiểu từ nguồn đã kiểm, nối hero/explorer cùng data để không lệch. Mở evidence và nguồn, giữ sample badge. Test chuyển ca, nguồn thiếu, format amount và field thiếu; không lấy absence-of-diff làm proof owner không đổi.

**Xong khi:** người xem tự đổi A/B và hiểu khác biệt bằng data; không có animation giả simulation, không request RPC khi trang vừa tải.

### WEB-04 — Nối sản phẩm

Xác nhận từng route thật từ app/README. Nếu DW live đã đạt, dùng route đó; nếu chưa, dùng ví mẫu với CTA tổng quát. Không tạo flag “đã có” chỉ để hiện nút cho đẹp. Code excerpt dựa trên API hiện hành; nếu chưa xác minh được đoạn code, dùng sơ đồ và link tài liệu thật trước, ghi gap cho excerpt.

**Xong khi:** mỗi CTA được bấm thử trong build preview; Inspector không bị gọi bằng payload mẫu thiếu bytes; không chuyển nguyên JSON kết quả thành transaction đầu vào.

### WEB-05 — EN, mobile và accessibility

Dịch toàn bộ key, metadata client và accessible labels; kiểm overflow trên cả VI/EN. Hoàn thiện menu, focus, FAQ, reduced-motion, zoom. Rà màn hình thật ở các viewport mục 12; không chỉ nhìn screenshot desktop.

**Xong khi:** task chính đi được bằng keyboard; mobile không tràn; ngôn ngữ đổi nhất quán; warning không mất nghĩa khi tắt màu/animation.

### WEB-06 — Tài sản và hiệu năng

Self-host font có license, tạo social image, kiểm favicon/404, đo bundle và network. Cắt dependency nặng khỏi landing entry. Giảm asset dư trước khi giảm chất lượng chữ/hình sản phẩm. Metadata/public URL dựa trên cấu hình đã xác nhận.

**Xong khi:** có số đo và điều kiện đo, font tiếng Việt đúng, initial landing không tải core/AI do import nhầm, không có broken image.

### WEB-07 — Nghiệm thu và bàn giao

Chạy ma trận mục 15; build preview dưới prefix; mở lại root ví, Inspector và số liệu để kiểm hồi quy. Cập nhật hướng dẫn mở landing, trạng thái website và link trong docs. Bàn giao gồm ảnh desktop/mobile/EN, lỗi còn lại, command/exit code và phần chưa đo.

**Xong khi:** reviewer mở được bản local/production build theo hướng dẫn, toàn bộ gate bắt buộc có bằng chứng. Chưa deploy thì nói “đã build và kiểm local”, không nói “website đã online”.

## 15. Ma trận nghiệm thu và kiểm chứng

### 15.1. Chức năng

| Ca | Cách kiểm | Điều kiện đạt |
|---|---|---|
| Entry landing | Mở trực tiếp và refresh | Render đúng, không dựa SPA fallback giả |
| Root ví | Mở link cũ và handoff liên quan | Ví vẫn hoạt động, không bị thay bằng landing |
| Primary CTA | Bấm ở hero, navbar, cuối trang | Đúng app/route, wording khớp hành vi |
| Anchor | Bấm menu và mở URL có hash | Đúng section, heading không bị navbar che |
| VI/EN | Đổi ở đầu/cuối trang | Copy/labels đổi hết, giữ ngữ cảnh A/B |
| Locale query/storage | URL en, query sai, storage bị chặn | Có fallback, không crash |
| A/B | Chọn A rồi B và so sánh | Balance/owner đúng nguồn, sample badge còn thấy |
| Evidence | Mở và xem địa chỉ/nguồn | Đúng dữ kiện ca đang chọn; thiếu hiện thiếu |
| Fixture hỏng/thiếu | Dữ liệu không hợp lệ hoặc tải lỗi | Có thông báo và link demo, không fake verdict |
| Copy | Clipboard thành công và bị chặn | Feedback đúng, có cách copy tay |
| FAQ/menu | Keyboard, Escape, đóng/mở | Focus đúng, không truy cập nội dung đang ẩn |
| Offline | Ngắt mạng sau/tại tải tùy ca | Không giả live; nội dung local còn dùng được khi đã tải |
| JS/font lỗi | Chặn script/font | Fallback dễ hiểu, text/link thiết yếu còn truy cập được theo giải pháp đã chọn |
| External links | Mở SDK/repo/source | Đích tồn tại, anchor đúng, không placeholder |
| Live nhúng nếu có | Lỗi RPC, hủy, đổi input, response muộn | Tuân thủ DW/session, không reuse kết quả cũ |

### 15.2. Thị giác

- H1 đọc được ngay, không cắt dấu, không góa một từ vô lý nếu có thể tránh bằng bố cục.
- Khung hero đủ lớn để đọc một hàng số dư và một hàng quyền; không phải hình điện thoại giả không liên quan Custos.
- Trang có nét của mẫu: khối màu rõ, hero tối, cream body, lilac buttons, outline/hard shadow có chủ đích.
- Custos có nội dung và hình chủ lực riêng; không đổi tên N.E.D trên một clone còn tính năng không liên quan.
- Không glow ở mọi cạnh, không gradient text, không mưa icon/cube, không trùng một template card qua mọi section.
- Không paragraph dài hơn khoảng 65 ký tự mỗi dòng ở phần giải thích; không rút font body dưới 16px để nhét chữ.
- Shadow/transform không làm tràn ngang; full-page screenshot có nhịp, không nhiều khoảng trống không mục đích.
- Ở mobile, CTA không đè nội dung bằng fixed bottom bar nếu không có lý do; ưu tiên flow tự nhiên.

### 15.3. Bộ lệnh baseline

Đọc lại scripts tại HEAD trước chạy. Các lệnh sau tồn tại ở baseline:

```powershell
node --version
npm --version
git status --short
npm run typecheck
npm run build -w @custos-solana/demo-wallet
npm run test
npm run preview -w @custos-solana/demo-wallet -- --port 5197
```

Preview là tiến trình server; mở URL prefix từ output, ví dụ `http://localhost:5197/Custos-Solana/gioi-thieu.html`. Không chờ server tự kết thúc rồi mới mở browser. Cổng có thể đổi nếu bận, ghi đúng URL đã dùng.

Repo có Playwright Python và axe trong `scripts/kiem-trinh-duyet/`; tái dùng version và helper hiện hành. Viết probe cho landing khi hành vi mới cần kiểm; không giả định bộ cũ tự quét entry mới. Test heading hiện hữu ở `apps/demo-wallet/test/moiTrangCoH1.test.ts` cần được xem khi thêm entry.

Kiểm production asset response ngoài status: JS/CSS có MIME đúng, không trả `index.html`; browser không có pageerror hoặc console error thuộc thay đổi. Kiểm build entry mới được đóng gói vào output dùng cho site.

Không cần chạy test live/AI có trả phí khi chỉ sửa landing tĩnh. Nếu sửa core/consumer để tích hợp, chạy cổng phù hợp theo roadmap DW/CU và ghi phạm vi riêng.

### 15.4. Artifact bàn giao

Tạo một thư mục review theo ngày/commit theo convention repo, chứa:

- Screenshot hero VI/EN desktop và mobile; full-page VI; A/B và evidence mở; menu/FAQ trạng thái cần xem.
- Báo cáo command/exit code, URL/cấu hình preview, browser/tool version.
- Bundle/network measurements và các lượt performance nếu đã đo.
- Kết quả kiểm a11y/keyboard/zoom, không đồng nhất “axe 0 lỗi” với toàn bộ UX đạt.
- Danh sách file sửa, feature có điều kiện còn chưa nối, link/metadata chưa xác nhận.

Không ghi số điểm Lighthouse, test count hay trạng thái pass chưa chạy. Nếu còn lỗi có ảnh hưởng, báo PARTIAL và bước sửa cụ thể.

## 16. Những điều Claude cần tránh khi triển khai

1. Làm thêm một landing chung chung với slogan “bảo vệ tài sản của bạn” nhưng thiếu tình huống quyền kiểm soát.
2. Sao chép chữ, tính năng, mascot, logo đối tác hoặc screenshot của N.E.D vào Custos.
3. Coi một preview mẫu có toggle là engine đang phân tích trực tiếp.
4. Dựng số người dùng, đối tác, đánh giá sao, bảo mật tuyệt đối hay khả năng đạt giải.
5. Đưa tính năng session/replay chỉ có trong kế hoạch vào mục “đang có”.
6. Đổi root ví hoặc rewrite route khiến handoff/deep link cũ gãy.
7. Thay toàn bộ design system của ví vì landing có art direction riêng.
8. Thêm backend/auth/database, Three.js, animation framework hoặc CMS khi phạm vi không cần.
9. Cắt glyph tiếng Việt, giảm font quá nhỏ, dùng full screenshot chứa chữ thay semantic UI.
10. Chạy RPC/AI ngay page load, nhúng ví bằng iframe hoặc đưa private key vào bundle.
11. Tạo nút không có hành vi, menu EN giả hoặc đường link “sắp ra mắt” ở CTA chính.
12. Tự publish/deploy để đóng task mà chưa có ủy quyền cho hành động đó.

## 17. Prompt khởi động cho Claude

```text
Đọc toàn bộ docs/WEBSITE-CUSTOS-DESIGN-VA-TRIEN-KHAI.md và triển khai website
giới thiệu Custos theo tài liệu. Chủ dự án đã giao quyền quyết định nội dung
và chi tiết thiết kế trong hướng tham chiếu đã mô tả; không cần hỏi lại các
quyết định đã chốt và không dừng ở việc lập thêm kế hoạch.

Đối chiếu code/AGENTS.md/tiến độ hiện tại trước khi sửa. Thực hiện WEB-00 đến
WEB-07 theo dependency, không đặt mốc thời gian. Tạo entry gioi-thieu.html trong
app Vite hiện hữu, giữ root ví và flow handoff đang hoạt động.

Art direction: hero tím đậm, body kem, lilac CTA, viền rõ và hard shadow tiết
chế. Hero có headline lớn và khung giao dịch Custos; điểm nhớ là cùng chuyển
10 token nhưng khác quyền kiểm soát. Dùng mascot hiện có. Không sao chép
branding/tính năng/claim của N.E.D. Không redesign toàn bộ ví.

Làm nội dung VI/EN đầy đủ, A/B dùng mẫu có provenance và badge rõ, evidence
mở được, CTA nối chức năng thật, responsive/keyboard/reduced-motion đầy đủ.
Nếu DW live chưa xong, dẫn vào ví mẫu đúng nhãn; không hardcode kết quả dưới
nhãn live và không triển khai toàn bộ engine roadmap chỉ để hoàn tất landing.

Kiểm build production dưới /Custos-Solana/, giữ css.postcss và isPreview trong
Vite, kiểm MIME assets và các route cũ. Chụp desktop/mobile/EN, kiểm UI thực,
đo bundle theo mục tiêu, ghi kết quả thực tế vào bàn giao. Không tự deploy,
publish, ký/gửi transaction hoặc bịa số liệu. Hoàn tất bản có thể review local.
```

## 18. Definition of Done

Website được coi là hoàn thành phạm vi này khi:

1. Trang giới thiệu mở được ở dev và production preview đúng base path; root ví và Inspector còn hoạt động.
2. Hình ảnh và bố cục đạt art direction của mẫu, nội dung/hình chủ lực mang đặc trưng Custos.
3. Hero, ba giá trị, A/B, hướng dẫn bắt đầu, developer, bằng chứng, FAQ và footer đều có nội dung thật.
4. VI/EN đầy đủ; mọi CTA/link chính đi tới chức năng đang có.
5. Mẫu/live/replay không bị nhập nhằng; dữ kiện và claim truy được nguồn.
6. Responsive, keyboard, focus, reduced-motion và các ca lỗi có bằng chứng kiểm.
7. Build/test liên quan đạt; hiệu năng đã đo hoặc phần chưa đo được nêu rõ, không ghi số giả.
8. Có ảnh review và hướng dẫn mở bản build; tiến độ/bàn giao cập nhật đúng.

Đây là website giúp người xem hiểu và thử sản phẩm rõ hơn. Chất lượng website hỗ trợ trình diễn; nó không tự chứng minh hiệu quả bảo vệ trên mainnet, nhu cầu thị trường hoặc khả năng đạt giải.
