# Custos — điều chỉnh UI theo nhận diện riêng sau khi chạy thử

Baseline đã chạy: `b6d66b1` — trang giới thiệu WEB-00 đến WEB-07. Ngày lập tài liệu: 18/09/2026. Đối tượng thực hiện: Claude trong repository Custos. Không đặt mốc thời gian; nghiệm thu theo hành vi và hình ảnh thực tế.

## 0. Quyết định mới của chủ dự án và thứ tự ưu tiên

**Không tiếp tục dùng UI của nhóm khác làm thiết kế cho Custos.** Trang hiện tại đã triển khai theo đặc tả trước, nhưng hướng tím đậm–lilac–lime, nền kem và bóng đổ cứng bám mẫu quá sát. Cần tạo nhận diện riêng từ công dụng kiểm tra giao dịch, mascot Custos và cấu trúc bằng chứng của sản phẩm.

Tài liệu này **thay thế các yêu cầu về art direction, palette, hero, nhịp section, card, button, shadow và motion** trong [đặc tả website trước](WEBSITE-CUSTOS-DESIGN-VA-TRIEN-KHAI.md). Các yêu cầu về provenance, VI/EN, route, privacy, accessibility và tích hợp đúng chức năng vẫn có hiệu lực nếu không được sửa rõ tại đây.

- Không dùng hình, mascot, logo, copy hoặc bố cục đặc trưng của N.E.D làm mục tiêu tái tạo.
- Không chỉ đổi `lilac` thành xanh rồi giữ nguyên toàn bộ cấu trúc và bóng đổ cứng.
- Giữ code chức năng và dữ liệu đã được kiểm: sample A/B, evidence, locale, links, FAQ, consumer boundaries.
- Đây là **file giao việc để sửa UI**. Ở lượt đánh giá tạo file, chỉ build/chạy browser, lưu bằng chứng và viết tài liệu; chưa sửa UI sản phẩm.
- Claude được tự quyết chi tiết có thể đảo ngược trong hướng đã chốt. Không cần hỏi lại màu chính hoặc có tiếp tục lấy mẫu không.

**Hướng chốt:** nền trắng pha xanh nhẹ, xanh ngọc đậm làm màu thương hiệu, chữ xanh đen, mint nhẹ làm nền selected. Chỉ khu vực developer/footer dùng nền xanh đậm. Cảnh báo vẫn đỏ/amber riêng biệt.

## 1. Đã chạy và quan sát những gì?

### Phạm vi kiểm thực tế

1. Build `@custos-solana/demo-wallet` thành công bằng `npm run build -w @custos-solana/demo-wallet`.
2. Mở **production preview** tại `http://localhost:5198/Custos-Solana/gioi-thieu.html`, không chỉ nhìn source hoặc ảnh cũ.
3. Xem VI desktop 1440×900; EN desktop; VI 390×844, 320×844 và 768×844.
4. Bấm ca A, ca B, mở bằng chứng; mở FAQ; mở menu mobile và đóng bằng Escape.
5. Mở root ví mẫu với `?khongkhoa=1` và trang Inspector ở trạng thái ban đầu để đối chiếu nhận diện. Không thử ký/gửi transaction.
6. Đo box model và làm hai thí nghiệm CSS **chỉ trong browser** để truy nguyên lỗi. Không patch stylesheet sản phẩm.

Lượt browser không ghi nhận `pageerror` hoặc failed network request của landing. FAQ mở được; Escape đóng menu được. Đây không phải kết luận tất cả chức năng hoặc toàn bộ accessibility đã đạt. Không chạy lại toàn bộ unit test, audit axe hay benchmark latency ở lượt này.

Build có warning các URL font được giữ để resolve runtime. Trong production preview, tám face được ghi nhận `loaded`, response font trả 200 với MIME `font/woff2`. **Không ghi đây là lỗi font hỏng production.** Đường font ở dev chưa được kiểm riêng trong lượt này.

Server phục vụ review đã được dừng sau khi chụp/đo. Những thay đổi thử trong browser không được lưu vào sản phẩm.

### Bằng chứng

- [Hero desktop](review/ui-direction-b6d66b1/desktop-hero.png).
- [Toàn trang desktop](review/ui-direction-b6d66b1/desktop-full.png).
- [Mobile 390px](review/ui-direction-b6d66b1/mobile-390.png) và [mobile 320px](review/ui-direction-b6d66b1/mobile-320.png).
- [A/B mở bằng chứng](review/ui-direction-b6d66b1/ab-section.png).
- [Ví mẫu](review/ui-direction-b6d66b1/wallet-idle.png), [Inspector](review/ui-direction-b6d66b1/inspector-idle.png).
- [Browser report](review/ui-direction-b6d66b1/browser.json), [đo nguyên nhân layout](review/ui-direction-b6d66b1/layout-diagnosis.json).
- [Bảng màu đề xuất và contrast](review/ui-direction-b6d66b1/palette-contrast.json).

Script tái hiện nằm cạnh artifact: `inspect_ui.py` và `diagnose_layout.py`. Không ghi đè các ảnh review trước ở `docs/review/website-20260919/`.

## 2. Vấn đề cần giải quyết, theo thứ tự

### UI-01 — Nhận diện chưa thuộc về Custos

**Quan sát:** hero tím đậm, nút lilac, dải lime và các panel viền dày/bóng cứng tạo đúng ngôn ngữ thị giác của mẫu. Dino xanh nhỏ trong header chưa đủ làm trang có bản sắc khác.

**Ảnh hưởng:** khi đứng cạnh nhóm tham chiếu, khác nội dung nhưng vẫn giống cách trình bày. Khi mở demo, phong cách lại chuyển hẳn sang ví fintech trắng–indigo.

**Sửa:** dùng hệ xanh ngọc–trắng được đặc tả ở mục 3; hero sáng; bỏ hard shadow và backplate nghiêng; thay dải lime bằng hàng thông tin gọn; biến điểm nhớ thành sơ đồ quyền trước/sau và bảng A/B đồng thời.

**Nghiệm thu:** không còn tổ hợp hero tím + CTA lilac + dải lime + shadow cứng. Xem thumbnail toàn trang vẫn nhận ra thay đổi về cấu trúc và nhịp, không chỉ đổi hue.

### UI-02 — Header gây tràn ngang ở 320px

**Đã đo:** viewport 320px, `document.documentElement.scrollWidth = 358`, tràn 38px. `.lg-header__phai` kết thúc ở x≈358,38px. Logo không co, nhóm VI/EN và nút “Mở menu” đều chiếm chiều rộng cố định, cộng gap và gutter.

**Thí nghiệm cô lập:** ẩn riêng bộ VI/EN trong header bằng CSS tạm ở browser đưa scrollWidth từ 358 về **320**. Đây là bằng chứng nguồn gây tràn, không phải đề xuất xóa chức năng đổi ngôn ngữ.

**Sửa chính thức:** ở mobile ≤640px, header chỉ giữ brand và nút menu 44–48px. Đưa VI/EN vào menu mở, luôn truy cập được. Không ép ba cụm chen trên một hàng, không scale cả header và không che bằng `overflow-x: hidden`.

**Nghiệm thu:** 320/360/390px cả VI/EN không tràn; menu vẫn mở/đóng/đổi locale; Escape và focus hoạt động. Nút menu có tên accessible; có thể dùng icon menu với text ẩn thay nút chữ dài.

### UI-03 — Chip instruction che đầu product preview trên mobile

**Đã đo ở 390px:** chip có khoảng y≈519,89–558,52; tiêu đề khung nằm y≈552,27–577,02, Devnet y≈549,89–579,39. Các box giao nhau theo cả x/y, tương ứng ảnh chip đè lên chữ.

**Nguyên nhân trong CSS:** `.lg-chip` là absolute với z-index 3; breakpoint ≤520px đưa cả hai chip lên `top: -12px` trong khi header panel vẫn nằm ngay dưới mép khung.

**Sửa:** bỏ chip absolute/backplate khỏi hero mới. Nếu cần hiển thị instruction, đặt trong hàng “Thành phần giao dịch” thuộc flow bình thường bên dưới kết quả. Không thêm padding tùy ý để né một vật trang trí không cần thiết.

**Nghiệm thu:** không có box instruction chồng title, nhãn nguồn, Devnet hoặc controls ở tất cả breakpoint; không mất nội dung khi zoom.

### UI-04 — Dải thông tin mất căn lề và gutter

**Đã đo:** ở 1440px, hero shell có x=100 và padding trái 24px, nội dung bắt đầu x=124. `.lg-dai__ds`, vốn là `<ul class="lg-shell ...">`, có x=0, margin=0 và padding=0; chữ đầu dải chạm mép trái màn hình.

**Nguyên nhân:** reset `.custos-landing ul, .custos-landing ol { margin: 0; padding: 0; }` có specificity cao hơn `.lg-shell { margin: 0 auto; padding-inline: ... }`. Thí nghiệm tạm tăng specificity cho margin của `ul.lg-shell` đưa shell về x=100, nhưng **chưa phục hồi padding**. Không coi sửa margin là đã sửa cả lỗi.

**Sửa ưu tiên:** wrapper `.lg-shell` là div chứa ul; reset chỉ quản list. Hoặc dùng reset specificity thấp có chủ ý rồi kiểm computed style của margin/padding. Rà cùng kiểu xung đột ở `.lg-menu__ds` và các list khác; không chỉ vá một dải.

**Nghiệm thu:** nội dung dải/các list cùng mép nội dung với hero ±1px trên desktop; có gutter ít nhất 16px trên mobile. Kiểm box model thay vì nhìn màu mới rồi kết luận đã sửa.

### UI-05 — A/B desktop vẫn buộc ghi nhớ ca trước

**Quan sát:** phần A/B hiển thị một kết quả tại một thời điểm, hai nút chọn nằm cột trái. Khi mở evidence, cột trái để trống phần lớn chiều cao; người xem phải chuyển A/B để nhớ “cùng 490, khác quyền”.

**Sửa:** desktop hiển thị bảng hai cột A/B cùng lúc, với các hàng thẳng nhau; hàng quyền có trọng tâm. Evidence mở bên dưới bảng, sử dụng chiều rộng phù hợp. Mobile dùng hai tóm tắt xếp dọc hoặc segmented control kèm một dòng đối chiếu luôn thấy; không đưa toàn desktop vào vùng scroll ngang.

**Nghiệm thu:** người xem đọc được cả hai số dư và khác biệt quyền trong một khung. A vẫn không được bịa owner before/after nếu nguồn không đủ.

### UI-06 — Nhịp nội dung dài, lặp ý và nhấn nhiều nơi

**Quan sát:** trang desktop hiện khoảng 5326px; ở 390px khoảng 7897px. Hero đã giải thích quyền, ba card giải thích tiếp, rồi A/B và ba bước lặp lại hành trình. Độ dài tự nó không phải lỗi, nhưng cần ưu tiên phần giúp người xem hiểu khác biệt.

**Sửa:** đưa A/B ngay sau hero; ba giá trị rút thành một hàng mô tả nhẹ ở phần sau; gộp “bắt đầu” vào một cụm ba bước trong panel A/B hoặc gần CTA. Chỉ một section developer nền tối; các phần khác nối bằng khoảng trắng và divider nhẹ.

**Nghiệm thu:** A/B là phần đầu tiên sau hero. Không xóa giới hạn để rút trang; không giảm font body. Loại trùng nội dung trước khi giảm spacing. Không dùng chiều cao trang cố định làm gate.

### UI-07 — Landing và công cụ thiếu liên kết nhận diện

**Quan sát:** landing tím/kem/shadow cứng; ví và Inspector sáng, nhiều indigo và shadow mềm. Người dùng đi từ giới thiệu sang demo thấy một hệ UI khác.

**Sửa:** đồng bộ màu thương hiệu, text, neutral surface, button và focus theo từng bước; giữ cấu trúc ví đang hoạt động. Đổi indigo thương hiệu thành teal ở các control/selection đã được map rõ, không thay hue của danger/warning theo find-replace.

**Nghiệm thu:** logo, brand CTA, đường link/focus và nền chung liên tục giữa ba bề mặt. Ví vẫn là UI công cụ mật độ cao, không bị áp typography hero hoặc animation marketing.

## 3. Hệ màu mới: xanh ngọc và nền sáng

### Lý do chọn

Dino hiện có mang màu xanh; vai trò Custos là giúp đọc và kiểm chứng trước ký. Xanh ngọc đậm tạo mối liên hệ với nhận diện sẵn có, còn nền sáng hỗ trợ xem bảng số dư/quyền và gần với ví mẫu. Màu đỏ dành riêng cho hậu quả đáng ngại giúp bảng phân tích nổi bật bằng ngữ nghĩa.

Đây là quyết định thiết kế phù hợp brief, không phải khẳng định màu sắc tạo tin cậy đã được nghiên cứu người dùng hoặc chứng minh làm tăng điểm thi.

### Palette bắt buộc

| Token mới | Hex | Vai trò |
|---|---|---|
| `--custos-bg` | `#F5F8F7` | Nền trang sáng pha xanh nhẹ |
| `--custos-surface` | `#FFFFFF` | Panel kết quả, navbar, form |
| `--custos-text` | `#142C2A` | Heading, số liệu và text chính |
| `--custos-muted` | `#526865` | Mô tả, timestamp, caption |
| `--custos-brand` | `#146C60` | CTA chính, link và focus trên nền sáng |
| `--custos-brand-hover` | `#10584F` | Hover/pressed của CTA |
| `--custos-brand-soft` | `#D9F0E5` | Selected, một số nền minh họa |
| `--custos-dark` | `#123A35` | Developer section và footer |
| `--custos-on-dark-muted` | `#B9D3CC` | Chữ phụ trên nền dark |
| `--custos-border` | `#D6E3DF` | Divider/panel boundary không phải tín hiệu duy nhất |
| `--custos-danger` | `#B4233C` | Chữ/icon cảnh báo nguy hiểm |
| `--custos-danger-bg` | `#FFF1F3` | Nền hàng quyền nguy hiểm |
| `--custos-warning` | `#8A5200` | Cảnh báo/coverage thiếu |
| `--custos-warning-bg` | `#FFF4DC` | Nền cảnh báo |
| `--custos-info` | `#285EA8` | Thông tin trung tính cần phân biệt với brand |

Mỗi vai trò chỉ có một token chính. Nếu cần hover/border của warning/danger, thêm theo semantic name và kiểm contrast; không khai lại cùng mã hex ở nhiều component.

### Contrast đã tính cho màu phẳng

| Text / nền | Tỷ lệ |
|---|---|
| Text / bg | 13,81:1 |
| Muted / bg | 5,57:1 |
| Trắng / brand | 6,28:1 |
| Brand / brand-soft | 5,25:1 |
| Trắng / dark | 12,48:1 |
| On-dark-muted / dark | 7,88:1 |
| Danger / danger-bg | 5,89:1 |
| Warning / warning-bg | 5,85:1 |
| Info / trắng | 6,45:1 |

Đây là số tính từ palette đề xuất, **không phải audit UI sau sửa**. Claude phải kiểm contrast trên trạng thái thực. Border nhạt chỉ phù hợp divider không thiết yếu; input boundary/focus cần contrast riêng đủ rõ.

### Ngữ nghĩa trạng thái

- Brand xanh dùng cho hành động, không có nghĩa giao dịch an toàn.
- `safe`: “Không phát hiện nguy hiểm trong phạm vi đã đọc”, không phủ toàn card xanh và không dùng shield check để hứa bảo vệ tuyệt đối.
- `warning`: amber, có nhãn về điều cần chú ý/giới hạn.
- `danger`: đỏ, icon và câu mô tả cụ thể; không đỏ toàn trang.
- `sample`: neutral xám–xanh, nhãn “Kết quả mẫu đã lưu”, không pulse-dot online.
- `running`: tiến trình từ request thực, không dùng skeleton để diễn một fixture.
- `stale`: text “Đầu vào đã đổi — cần kiểm lại”, không giữ verdict cũ như hiện hành.

Tỷ trọng tham khảo cho landing: khoảng 75–85% nền sáng/trắng; 10–20% dark section; phần còn lại brand/semantic accents. Đây là định hướng thị giác, không phải quota cần tính pixel.

## 4. Typography, hình khối và chi tiết

### Typography

Giữ Manrope và Be Vietnam Pro đã self-host và load được; chúng không thuộc nhận diện độc quyền của nhóm tham chiếu. Sự thay đổi phải đến từ cách dùng font, màu và cấu trúc. Không thêm font mới chỉ để tạo khác biệt.

- H1 desktop 56–64px, weight 800, line-height 1,16–1,22. Mobile 36–40px, không cắt dấu tiếng Việt.
- H2 desktop 34–40px; mobile 26–30px. H3 21–24px.
- Body 16–18px, line-height 1,6; caption quan trọng tối thiểu 14px.
- Giá trị số 24–32px trong hero, 18–22px trong bảng A/B; `font-variant-numeric: tabular-nums` để dễ đối chiếu.
- Địa chỉ/code chỉ dùng mono, 13–14px; không dùng mono cho body.
- Bỏ eyebrow in hoa lime dài. Thay bằng dòng nhỏ sentence case “Kiểm tra giao dịch Solana trước ký”.
- Giữ font control của ví hiện hành nếu thay nó tạo reflow lớn; đồng bộ typography product là bước riêng sau visual token, không bắt ví dùng H1/display của landing.

### Hình khối

- Border panel 1px nhẹ; input/control có boundary rõ hơn khi cần.
- Radius button/input 10px, panel 14px; badge 6px hoặc pill theo nhóm trạng thái, không mọi label đều pill.
- Bỏ `7px 7px 0`, `4px 4px 0`, backplate nghiêng và nút dày như sticker.
- Panel dữ liệu dùng border, không thêm blur shadow lớn. Nếu cần nâng một control, shadow rất nhẹ ≤8px blur; không biến mọi card thành vật nổi.
- Hero background phẳng hoặc phân vùng mint rất nhẹ bằng khối hình học có nghĩa; không neon glow, cyber grid, cube, shield 3D hoặc ảnh hacker.
- Icon 18–20px, stroke nhất quán; danger/warning có icon + chữ.
- Mascot dùng asset hiện có ở logo và tối đa một điểm hỗ trợ. Giữ sắc xanh tự nhiên, không recolor PNG bằng CSS filter làm mờ/cháy viền.

### Spacing

- Container tối đa 1200px; gutter desktop 24–32px, mobile 16–20px.
- Navbar 72px desktop, 64px mobile.
- Section padding desktop 72–88px; mobile 40–56px. Không đặt 100px cho mọi section theo một nhịp máy móc.
- H1 → body 20–24px; body → CTA 24px; CTA → note 12–16px.
- Data row padding 14–18px; khoảng cách evidence label/value rõ, không để mảng JSON làm đoạn chính.
- Không dùng CSS `overflow-x: hidden` ở html/body như cách sửa layout. Phần code được scroll nội bộ là hợp lệ.

## 5. Bố cục mới của landing

### Thứ tự section

1. Navbar trắng gọn.
2. Hero sáng: lời giới thiệu ngắn + phiếu phân tích giao dịch.
3. A/B đối chiếu đồng thời và evidence — phần tương tác chủ lực.
4. Cách Custos kiểm: ba bước theo pipeline thật, kèm ba giá trị đã rút gọn.
5. Developer trên nền xanh đậm.
6. Bằng chứng/phạm vi và FAQ.
7. CTA cuối gọn trên nền sáng, footer xanh đậm.

Bỏ dải lime toàn chiều ngang. Nếu giữ bốn thông tin Devnet/SDK/Inspector/bằng chứng, đưa thành một hàng text/divider trong container dưới hero, với căn lề đúng UI-04. Bỏ section “bắt đầu” nền lilac riêng; gộp hướng dẫn vào cụm A/B hoặc pipeline.

### Hero

H1 VI đề xuất:

> Hiểu điều bạn sắp ký.

EN:

> Understand what you’re about to sign.

Body VI:

> Xem thay đổi tài sản và quyền kiểm soát trong giao dịch Solana, cùng dữ kiện đứng sau mỗi cảnh báo.

Body EN:

> Review changes to assets and account control in a Solana transaction, with evidence behind each warning.

Giữ giới hạn cạnh kết quả và trong mục phạm vi; không biến “each warning” thành lời hứa mọi instruction đã có causal trace.

- CTA chính: “Mở demo Custos” / “Open the Custos demo”, nền brand, chữ trắng.
- CTA phụ dạng text link: “Xem tình huống A/B” / “Explore the A/B example”, dẫn `#trai-nghiem`.
- Note: “Bản thử nghiệm Devnet · Không dùng tài sản thật”.
- Desktop left/right khoảng 5/7, hình chủ lực đủ rộng để đọc dữ kiện; hero không cần lấp cả 100vh.

Phiếu bên phải:

```text
Phân tích giao dịch                   Kết quả mẫu đã lưu
Chuyển 10 token                      Devnet

TÀI SẢN
Số dư token                   500 → 490

QUYỀN KIỂM SOÁT
Chủ tài khoản token           Bạn → địa chỉ khác
! Có thao tác đổi chủ trong transaction mẫu

Xem đối chiếu và bằng chứng →
```

Khung thẳng, nền trắng, border mảnh, hàng quyền đỏ nhạt. Nhãn nguồn nhỏ nhưng rõ, không biến thành một callout chiếm nhiều diện tích. Các số vẫn lấy từ fixture, không dùng trạng thái chain hiện tại để kể mẫu lịch sử.

### A/B desktop

```text
Cùng số tiền chuyển. Khác quyền kiểm soát.
Kết quả mẫu đã lưu · hai simulation độc lập

                         A · Chỉ chuyển       B · Chuyển và đổi chủ
Token chuyển                  10                        10
Số dư sau mô phỏng            490                       490
Thao tác đổi chủ              Không có                  Có
Kết luận mẫu                 Không phát hiện...        Quyền thay đổi

                     [Xem dữ kiện của ca B]
                     Account / Trước / Sau / Nguồn

[Mở demo để kiểm tra]        Đường dẫn tới ứng dụng, không chạy giả
```

- Bảng semantic hoặc cấu trúc có quan hệ heading rõ; không dùng hai card độc lập mất alignment.
- A không hiển thị owner “giữ nguyên” từ absence-of-diff. Dòng cấu trúc dùng “Không có thao tác đổi chủ trong transaction mẫu”.
- Evidence chọn ca nào phải hiện tên ca đó; ca A không có cảnh báo thì diễn đạt đúng, không tạo panel B dưới A.
- Raw address, code, timestamp ISO và source commit nằm trong phần kiểm sâu. Phần mặc định hiện thời điểm dễ đọc theo locale + provenance cơ bản.
- Khi bằng chứng mở, dùng toàn chiều rộng dưới bảng hoặc layout nội dung tối đa 760px; bỏ cột selector trống kéo dài.

### A/B mobile

Hiển thị hai tóm tắt gọn xếp dọc, mỗi tóm tắt có số token/số dư/quyền. Chi tiết evidence chọn theo ca. Nếu giữ segmented selector, phải có dòng so sánh cố định “A và B đều còn 490; chỉ B yêu cầu đổi chủ”, lấy từ fixture hợp lệ, để người xem không phải ghi nhớ ca cũ.

Không ép bảng desktop rộng vào mobile, không che cột B và không dùng vuốt ngang làm thao tác bắt buộc để hiểu điểm chính.

### Pipeline và developer

- Một sơ đồ ba bước thật: nhận transaction chưa ký → mô phỏng và phân tích → trả kết quả kèm dữ kiện/giới hạn.
- Số 1/2/3 chỉ dùng cho chuỗi này, bỏ số thứ tự khỏi ba giá trị ngang hàng.
- Developer giữ excerpt API có thật, vùng code riêng, nền dark xanh. Không decor syntax thành hiệu ứng neon.
- Consumer/signer boundary giữ nguyên ý nghĩa. Website vẫn không có đường ký.

### Proof, FAQ và CTA cuối

- Tài liệu trình bày như danh sách link có mô tả; giới hạn là một đoạn rõ ràng nền neutral, không banner cảnh báo khổng lồ.
- FAQ desktop: heading + mô tả ngắn bên trái, accordion bên phải; mobile xếp dọc. Giữ native `<details>` nếu đang hoạt động tốt.
- CTA cuối: một câu + một nút; không cần lặp đoạn hero hoặc tô nền lilac.
- Footer giữ một tone xanh đậm, link đủ contrast; không thêm social icon không có đích.

## 6. Đồng bộ với ví mẫu và Inspector

Phần bắt buộc của thay đổi là landing. Sau khi landing đạt, thực hiện **lát cắt nhận diện nhỏ** cho ví/Inspector để nối hành trình; không redesign logic hoặc tổ chức màn hình của hai công cụ trong task này.

| Thành phần hiện hành | Mapping đề xuất | Giới hạn |
|---|---|---|
| Nền ví sáng hơi tím/xanh | `bg`, `surface` | Không đổi layout, số dư, lịch sử |
| Accent indigo ở primary CTA/link | `brand`, `brand-hover` | Chỉ role thương hiệu/action, không thay các màu dữ liệu khác |
| Selected/highlight | `brand-soft` + `brand` | Phải phân biệt selection và verdict |
| Text và muted | `text`, `muted` | Đo contrast ở cả card và background |
| Cảnh báo đỏ/amber | Semantic tokens tương ứng | Giữ severity, nội dung, icon và engine verdict |
| Focus ring | Brand trên light, màu sáng đủ contrast trên dark | Không xóa outline khi chưa có thay thế |
| Logo và heading nhỏ | Dino + Custos | Không đổi identity ví đang chọn |

Ưu tiên thêm `brand-tokens.css` **chỉ chứa biến màu**, được các entry cần dùng import; landing/wallet giữ layout CSS riêng. Không import toàn `landing.css` vào ví và không biến global CSS thành nguồn side effect mới. Có thể giữ alias token cũ để migration có kiểm soát.

Trước khi đổi `--color-nhan` hoặc `--color-thuong` trong `style.css`, tìm toàn bộ nơi dùng và phân loại brand vs semantic. Những tên hiện tại có thể mang nhiều vai trò; không find-replace hex toàn repo.

Chỉ nghiệm thu đồng bộ app sau khi mở cả trạng thái bình thường/cảnh báo/thiếu dữ kiện/lỗi. Lượt review này mới xem ví và Inspector ở trạng thái idle, chưa xác minh những trạng thái đó với palette mới.

## 7. Hướng dẫn sửa code theo file

| File | Việc cần làm |
|---|---|
| `apps/demo-wallet/src/landing/landing.css` | Thay semantic color map, bỏ hard shadow/backplate/chip absolute, sửa reset specificity, responsive header và nhịp spacing |
| `apps/demo-wallet/src/landing/SiteHeader.tsx` | Đưa VI/EN vào menu ở mobile, giữ keyboard/focus và label theo locale |
| `apps/demo-wallet/src/landing/Hero.tsx` | Hero sáng, copy ngắn, product preview theo flow; bỏ chip trang trí |
| `apps/demo-wallet/src/landing/ScenarioExplorer.tsx` | A/B cùng lúc desktop, evidence có ca rõ, mobile đọc được |
| `apps/demo-wallet/src/landing/Sections.tsx` | Rút dải, gộp getting started, pipeline, developer, FAQ và CTA |
| `apps/demo-wallet/src/landing/LandingPage.tsx` | Thứ tự section mới, không reset state do đổi locale |
| `apps/demo-wallet/src/landing/content.ts` | VI/EN đồng bộ copy mới và accessible names |
| `apps/demo-wallet/src/landing/sample.ts` | Giữ dữ liệu/provenance, chỉ thêm adapter trình bày nếu cần |
| `apps/demo-wallet/src/landing/links.ts` | Giữ base-aware URLs; link anchor mới phải có đích thật |
| `apps/demo-wallet/src/style.css` | Mapping token có kiểm soát cho ví/Inspector ở giai đoạn cuối |
| `apps/demo-wallet/gioi-thieu.html` | `theme-color` theo navbar sáng mới, metadata phù hợp |
| `apps/demo-wallet/public/landing/` | Cập nhật social preview theo UI mới, giữ license/font và logo hợp lệ |
| `apps/demo-wallet/test/landing.test.ts` | Cập nhật test metadata đang ghim `#17132A`; giữ test fixture/privacy/route |
| `scripts/kiem-trinh-duyet/soi-landing.py` | Thêm kiểm 320px, overlap, container alignment; cập nhật selector A/B theo hành vi mới |

Không giữ `--landing-lilac`, `--landing-lime` làm tên lâu dài rồi gán màu teal; tên token phải phản ánh vai trò. Có thể dùng alias trong một bước migration, nhưng bản kết thúc không để semantic name mâu thuẫn.

Rà màu hardcode ngoài token: border header, `.lg-dai__o span`, code panel, button disabled, social preview và `theme-color`. Tìm theo tên role và mã màu cũ; sửa có ngữ cảnh.

## 8. Trình tự công việc và nghiệm thu

Theo dõi `UIR-*` trong sổ tiến độ hiện hành; không lập một checklist trạng thái cạnh tranh với `docs/roadmap/TIEN-DO.md`. Ghi handoff ở `docs/roadmap/BAN-GIAO.md`.

### UIR-00 — Baseline và lỗi layout

- Đọc tài liệu này và ảnh/source đã dẫn; kiểm HEAD thực tế.
- Tái hiện 320px overflow, mobile chip overlap và dải lệch gutter.
- Thêm regression browser cho các lỗi cụ thể trước hoặc cùng lúc sửa; không tạo test khóa toàn bộ CSS text.
- Giữ các file chưa commit của người dùng.

**Đạt:** có kết quả trước/sau từng lỗi với viewport, selector, box hoặc scrollWidth. Không kết luận “không tràn” chỉ từ ảnh 390px.

### UIR-01 — Tokens và hero nhận diện mới

- Thêm palette có role, thay hero/nav/button/panel.
- Sửa header responsive, bỏ chip absolute và hard shadow.
- Giữ font hiện hữu và provenance mẫu; tạo ảnh desktop/mobile để đánh giá trước khi lan ra toàn trang.

**Đạt:** headline/CTA/product preview đọc được; mobile không overlap; tổng thể khác hướng cũ về cả light/dark balance và hình khối.

### UIR-02 — A/B và cấu trúc nội dung

- Đưa A/B ngay sau hero, desktop đối chiếu đồng thời, mobile có phương án đọc rõ.
- Evidence đúng ca; giữ before/after và provenance, không bịa Facts.
- Rút lặp copy, gộp ba bước bắt đầu; sửa container/list reset có nguyên nhân.

**Đạt:** so sánh được cùng số dư/khác quyền mà không phải nhớ ca trước; evidence mở dễ hiểu; section căn lề thống nhất.

### UIR-03 — Developer, FAQ, locale và assets

- Đổi dark section sang xanh đậm, hoàn thiện hierarchy/code.
- FAQ/menu/locale giữ keyboard semantics; test VI/EN ở 320–1440px.
- Social preview và HTML theme-color theo bản mới; sửa test ghim màu cũ theo yêu cầu mới, không xóa các guard dữ liệu.

**Đạt:** không còn màu cũ ở các bề mặt chính, không locale nửa cũ nửa mới, không link/asset hỏng.

### UIR-04 — Nối nhận diện ví và Inspector

- Map các brand token rõ vai trò, giữ product structure.
- Kiểm trạng thái idle, kết quả thông thường, warning/danger, thiếu coverage và lỗi bằng cơ chế test hiện có.
- Không tạo hiệu ứng hoặc bảng marketing bên trong luồng quyết định ký.

**Đạt:** ba bề mặt cùng nhận diện, severity và hành vi không đổi. Nếu chưa kiểm được trạng thái quan trọng thì ghi PARTIAL của UIR-04, không phủ nhận phần landing đã hoàn tất.

### UIR-05 — Production review và bàn giao

- Build mới, chạy preview với `/Custos-Solana/`, mở trực tiếp/refresh các route.
- Chụp cùng viewport với artifact baseline để so trước/sau.
- Kiểm bundle/requests/font, không thêm dependency nặng để đổi màu.
- Cập nhật trạng thái/ảnh tài liệu; không tự deploy hoặc publish.

**Đạt:** người review có thể mở bản chạy theo hướng dẫn, thấy thay đổi và đối chiếu kết quả kiểm.

## 9. Ma trận kiểm bắt buộc sau khi sửa

| Nhóm | Ca | Điều kiện đạt |
|---|---|---|
| Overflow | 320/360/390/768/1024/1440px, VI/EN | `scrollWidth <= clientWidth + 1`; không che overflow ở body để pass |
| Header | Đóng/mở menu, locale, Escape, focus | Điều khiển còn đủ, không đẩy ra ngoài màn hình |
| Overlap | Hero title/source/Devnet và instruction | Không giao box che chữ hoặc vùng bấm |
| Alignment | Hero, thông tin dưới hero, A/B, footer/menu | Cùng gutter theo container, không list chạm mép viewport |
| A/B | Desktop cả hai ca, mobile và đổi locale | Dữ liệu đúng, selection/evidence không nhầm |
| Source | Mẫu/live/replay | Nhãn nguồn chính xác, sample không có trạng thái online giả |
| Keyboard | Tab/Shift+Tab/Enter/Space/Escape | Focus thấy được, không trap, không focus vào menu ẩn |
| Accessibility | Axe + kiểm thủ công | Không dùng màu là tín hiệu duy nhất; tương phản kiểm thật |
| Reflow | Zoom 200%, reduced-motion, font loading lỗi | Nội dung/CTA còn dùng được, không motion bắt buộc |
| Routes | Landing/root ví/Inspector/số liệu, refresh | Không gãy base path hoặc handoff |
| Fonts | Production + dev nếu sửa URL | Tải đúng MIME, glyph tiếng Việt đầy đủ |
| Brand tokens | Button/hover/focus/selected/disabled/danger | Đúng role, không dùng brand green làm bảo đảm an toàn |
| Regression app | Các trạng thái bị ảnh hưởng bởi token chung | Engine verdict/consent/signing logic không đổi |

**Lưu ý khi đo overflow:** code `<pre>` có nội dung rộng nhưng scroll nội bộ không phải lỗi overflow toàn trang. Skip link đặt offscreen khi chưa focus cũng không tự là lỗi. Trong baseline, source gây tràn toàn trang là header, đã được thí nghiệm xác nhận.

### Lệnh nền tảng

```powershell
npm run typecheck
npm run test
npm run build -w @custos-solana/demo-wallet
npm run preview -w @custos-solana/demo-wallet -- --port 5198
```

Lệnh preview chạy liên tục; mở browser trong khi server chạy. Probe repo cũ có thể ghim cổng 5197, nên truyền/config đúng cổng khi dùng lại, không kiểm nhầm server cũ. Đọc scripts trước khi chạy; không dùng script dựng hiện trường/gửi transaction để nghiệm thu một thay đổi thị giác.

Nếu thay token chung, chạy thêm browser regression liên quan trong `scripts/kiem-trinh-duyet/`. Không cần viết unit test cho mọi mã màu; regression có giá trị là layout đã từng hỏng, semantic status và navigation.

## 10. Giao thức bàn giao cho Claude

Mỗi lát cắt ghi:

```text
UIR đã thực hiện và HEAD:
Các file thay đổi:
Hành vi/hình ảnh trước → sau:
Lỗi đã tái hiện, nguyên nhân, kết quả sau sửa:
Viewport và locale đã kiểm:
Lệnh/exit code và ảnh bằng chứng:
Phần chưa kiểm hoặc đang PARTIAL:
Tác động lên ví/Inspector và regression đã chạy:
Bước tiếp theo:
```

Không ghi “thiết kế độc quyền/không giống bất kỳ ai”: không thể chứng minh bằng một lần review. Ghi cụ thể rằng đã bỏ cấu trúc/màu đặc trưng của mẫu và xây nhận diện từ Custos.

Không dùng số điểm thẩm mỹ hoặc xác suất đạt giải thay cho bằng chứng. Mục tiêu là giao diện riêng, dễ đọc, giúp thấy khác biệt kỹ thuật và không có các lỗi layout đã tái hiện.

## 11. Prompt đưa cho Claude

```text
Đọc docs/DIEU-CHINH-UI-CUSTOS.md và triển khai UIR-00 đến UIR-05.
Đây là quyết định thiết kế mới của chủ dự án: không dùng UI/màu/bố cục đặc
trưng của nhóm N.E.D. Tài liệu này thay phần art direction của đặc tả website cũ.

Chạy giao diện hiện tại và đối chiếu ảnh baseline b6d66b1 trước khi sửa.
Ưu tiên sửa lỗi header tràn ở 320px, chip chồng title/Devnet và list reset làm
lệch gutter; kiểm bằng browser metrics, không giấu bằng overflow-x:hidden.

Thiết kế lại theo nền sáng #F5F8F7, surface trắng, brand xanh ngọc #146C60,
chữ #142C2A, dark section #123A35. Bỏ lilac/lime/hard shadow/backplate/chip nổi.
Hero sáng, copy gọn; A/B ngay sau hero và hiển thị đồng thời ở desktop.
Giữ dữ liệu mẫu/provenance, VI/EN, route/base path và giới hạn đã công bố.

Sau khi landing ổn, đồng bộ có kiểm soát brand token của ví/Inspector, không
đổi logic ký hoặc redesign công cụ theo layout marketing. Kiểm trạng thái
semantic và cập nhật test metadata đang ghim màu cũ đúng theo thiết kế mới.

Chạy build và browser desktop/mobile VI/EN, chụp trước/sau, cập nhật tiến độ
và bàn giao. Không chỉ viết kế hoạch, không tự deploy/publish hoặc ký/gửi tx.
```
