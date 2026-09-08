# Kiểm trên trình duyệt thật

```bash
# cài một lần — phiên bản đã GHIM, xem "Vì sao ghim" bên dưới
pip install -r scripts/kiem-trinh-duyet/requirements.txt
playwright install chromium
npm ci                        # axe-core 4.13.0, ghim trong devDependencies

# chạy — cần HAI server đang bật
npm run vi          # 5188
npm run tan-cong    # 5189
python scripts/kiem-trinh-duyet/soi-trinh-duyet.py   # axe + luồng, 40 mục
python scripts/kiem-trinh-duyet/soi-vung-bam.py      # kích thước vùng bấm, 26 mục
python scripts/kiem-trinh-duyet/soi-ban-phim-va-phong-to.py   # bàn phím · zoom · chữ dài
python scripts/kiem-trinh-duyet/soi-handoff.py                 # tấn công → ví, cả chuỗi
python scripts/kiem-trinh-duyet/soi-do-tre.py                   # độ trễ — cần `vite preview`, xem docs/HIEU-NANG.md
```

## Vì sao ghim phiên bản

Bộ này sinh ra câu *"0 vi phạm axe"*. Câu đó chỉ có nghĩa khi nói rõ **axe nào**:
axe-core đổi bộ luật giữa các bản nhỏ, và Chromium mới tính lại màu lẫn kích thước
thật. Chạy bản khác rồi ghi cùng một kết luận là so hai phép đo khác nhau rồi gọi
chúng là một.

Nên mỗi lần chạy in đúng bộ công cụ đã đo ở dòng đầu:

```
Chromium 149.0.7827.55 · Playwright 1.61.0 · axe-core 4.13.0
```

Lệch bản axe là **FAIL** — nó ghim trong `package.json` nên lệch nghĩa là có người
cài đè, và kết quả lúc đó không so được với lần trước. Lệch bản Playwright chỉ
**cảnh báo**: máy khác có thể chưa `pip install -r`, mà chặn cứng ở đó thì người ta
bỏ luôn việc chạy bộ kiểm thay vì sửa cho khớp.

Số đo hiện tại: **40 PASS** trên đúng ba phiên bản ở trên.

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
| **A** | Ví · giao dịch nguy hiểm — verdict, bảng 500 → 0, coverage 2/3, axe, **CTA chính** ≥44px, tràn ngang |
| **B** | Ví · giao dịch bình thường — verdict Bình thường, không hiện chữ "an toàn" |
| **C** | Trang tấn công → ví — `window.open` gọi **đồng bộ** trong cử chỉ bấm, ví bắt được lời khai gian |
| **D** | Devnet **treo** — thẻ lỗi đúng hạn 9 s, nói rõ là lỗi kết nối, đường lui có nhãn, thử lại gọi lại RPC |
| **E** | `prefers-reduced-motion` — cảnh báo vẫn hiện, 0 animation còn chạy |
| **F** | Trang số liệu và trang phỏng vấn — axe + tràn ngang, cả 375 px lẫn 1440 px |

axe-core chạy thật, ở mức `wcag2a · wcag2aa · wcag21a · wcag21aa`.

## `soi-vung-bam.py` — vì sao phải tách ra một bài riêng

Nhóm A đã có dòng *"mọi CTA chính ≥44px"* và dòng đó **luôn xanh** trong khi sản
phẩm có bốn nút cao **19px**. Không phải nó nói dối: nó chọn `button.nut`, và
`.nut` đúng là đã đạt. Bốn nút kia mang lớp `.lien-ket` nên chưa bao giờ nằm
trong tập được chọn.

Đây là kiểu hỏng khó thấy nhất trong repo này: **một phép đo xanh vì nó không nhìn
vào chỗ hỏng.** 40/40 vẫn đúng nguyên văn, chỉ là nó chưa từng trả lời câu hỏi mà
người đọc tưởng nó trả lời. Nên bài mới quét **mọi** `button`, `a[href]`,
`[role=button]` đang hiện trên ba trạng thái màn hình, thay vì một lớp CSS.

Hai mức, và ranh giới giữa chúng là chuyện tiêu chuẩn chứ không phải chuyện gu:

| Mức | Ngưỡng | Nghĩa |
|---|---|---|
| **VI PHẠM** | < 24px | dưới ngưỡng WCAG 2.5.8 AA |
| **CẦN SỬA** | < 44px | đạt AA, nhưng dưới khuyến nghị Apple HIG / Material |

Gọi mọi thứ dưới 44px là *"vi phạm WCAG"* là nói sai về tiêu chuẩn — AA dùng 24px
kèm ngoại lệ cho mục inline và mục có khoảng cách đủ. Trước khi sửa: **4 vi phạm,
2 cần sửa**. Sau khi sửa: **0 và 0** trên 26 mục.

Chỉ đo trong ngữ cảnh `has_touch`. Chuột không cần 44px, và bắt nó đạt 44px ở
khung máy tính chỉ làm giao diện phình ra vì một con số không áp dụng ở đó.

Bằng chứng: `data/a11y/vung-bam.json`, có `sourceCommit` như bài axe.

## `soi-ban-phim-va-phong-to.py` — ba thứ axe không kiểm

axe đọc cây DOM tĩnh. Nó không bấm Tab, không thu nhỏ khung, không nhét thêm chữ
vào. Nên *"0 vi phạm axe"* và *"dùng được bằng bàn phím"* là hai câu khác nhau, và
chỉ câu đầu có bằng chứng cho tới bài này.

| Nhóm | Đo gì |
|---|---|
| **A · bàn phím** | đi hết bằng Tab, không bẫy focus, vòng focus thấy được, Enter và Space đều mở được mục gập, và **lựa chọn an toàn đứng trước** trong thứ tự Tab |
| **B · phóng to** | reflow 320px (WCAG 1.4.10 AA) và 640px (≈ khung 1280px phóng 200%) — 0px tràn, CTA còn nguyên |
| **C · chữ dài** | giải thích dài gấp mười không làm vỡ khung, CTA giữ 44px |

**16 PASS.** Thứ tự Tab đo được: Xem chi tiết → Chi tiết kỹ thuật → **Chặn & huỷ** →
Vẫn ký. Với sản phẩm chặn giao dịch thì thứ tự đó không trung tính: người bấm
Tab-Enter theo phản xạ trúng nút huỷ, không trúng nút ký. Nên nó có một bài kiểm
riêng thay vì để may rủi theo thứ tự DOM.

### Kiểm phủ định của bài này đã cứu chính nó

Bản đầu kiểm vòng focus bằng `outlineWidth >= 1`. Thêm `outline: none !important`
vào CSS thì bài kiểm **vẫn xanh** — Chromium trả `outline-style: none` nhưng giữ
`outline-width: 3px`, tức bề rộng đã khai báo vẫn còn dù không vẽ gì. Phép kiểm ấy
không bao giờ đỏ được.

Phải đọc **cả `outline-style`**. Sau khi sửa, cùng mutation đó cho FAIL trên 3 nút —
và đúng 3, vì "Chặn & huỷ" có `box-shadow` riêng nên vẫn thấy được.

> Một bài kiểm khả năng tiếp cận không bao giờ đỏ được thì tệ hơn là không có bài
> nào: nó phát ra sự yên tâm mà nó không có cơ sở để phát.

### Một điều bài này GHI NHẬN mà không gọi là hỏng

Chữ dùng px cố định: đặt `font-size` gốc 16px → 32px thì chữ giữ nguyên 12,5px.
Đó **không** phải vi phạm WCAG 1.4.4 — tiêu chí đó được thoả bằng phóng to của
trình duyệt, và nhóm B chứng minh reflow còn nguyên ở 640px. Cái mất là người đặt
cỡ chữ mặc định lớn trong trình duyệt không được hưởng. Chuyển px → rem là việc
riêng, có rủi ro hồi quy thị giác riêng, không lẫn vào U06.

Bằng chứng: `data/a11y/ban-phim-phong-to.json`.

## `soi-handoff.py` — cả chuỗi tấn công → ví

Bốn bài trên đều soi MỘT trang. Bài này soi chỗ nối giữa hai app, và chỗ nối là
nơi hỏng mà không app nào tự thấy.

Đo: `window.open` chạy trong cử chỉ bấm (không bị chặn) · tab mới **không phải chính
trang tấn công** · đúng cổng ví · URL mang giao dịch · và ví bên kia thật sự dựng
được khối kết quả. **5 PASS.**

### Điều bài này CỐ Ý không đo

Lỗi U07 là địa chỉ ví giải sai khi vào bằng `127.0.0.1` thay vì `localhost`. Nhưng
trên máy này Vite gắn vào `localhost` → `::1`, nên `127.0.0.1` **từ chối kết nối ở
cả hai cổng**. Mở nó ở đây chỉ cho một bài kiểm đỏ vì môi trường.

Quy tắc giải địa chỉ nằm ở `packages/core/test/diaChiDemo.test.ts` — 8 ca, `location`
là **tham số** chứ không phải môi trường, nên `127.0.0.1`, `[::1]` và IP LAN đều đo
được và chạy mọi lúc, không cần server nào.

Chia việc như vậy là cố ý: bài đơn vị giữ **quy tắc**, bài trình duyệt giữ **chuỗi
còn sống**. Ép bài trình duyệt gánh cả hai là cách nhanh nhất có một guard đỏ vì
lý do không ai sửa được.

Bằng chứng: `data/a11y/handoff.json`.

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
5. **"Xem chi tiết" và "Chi tiết kỹ thuật" cao 19 px** — dưới cả ngưỡng AA.
   Bài a11y cũ không thấy vì nó chỉ chọn `.nut`; xem `soi-vung-bam.py` ở trên.
