# Kế hoạch 11 ngày cuối — 25/08 → 05/09

**Nguồn:** `docs/review/UPDATE-REPORT.md` · **Hạn cứng:** 05/09/2026 08:00 · **Kỷ luật đội:** 04/09

Hai roadmap trước chọn việc theo *"cái này có sai không"* rồi *"cái này đổi mấy điểm"*.
Kế hoạch này chọn theo **đường găng**: việc nào chặn việc khác, và việc nào có hạn cứng.

---

## 0 · ✅ XONG 25/08 — đã commit và push (`e9da28b`)

CI xanh, 4 trang live, số liệu công khai khớp: **249 test · coverage 82 % · 0 gắn cờ**.

**Vẫn nên đọc diff bốn file này** — chúng chạm sản phẩm, không chỉ chữ. Nếu không đồng ý
chỗ nào thì `git revert e9da28b` rồi báo:

| File | Đọc kỹ chỗ nào |
|---|---|
| `packages/core/src/l2/rules.ts` | **Luật 12 giờ bỏ qua lệnh đóng tài khoản** — kiểm chốt "về System **VÀ** lamport về 0" có đủ chặt không |
| `packages/core/src/l2/evaluate.ts` | Nhánh mới phát `CHUONG_TRINH_KHONG_RO` — kiểm nó không đổi ngưỡng verdict nào |
| `packages/core/src/constants.ts` | Mã mới xếp vào `MA_THONG_TIN` — đồng ý với cách xếp đó không? |
| `packages/{types,core,ai}/package.json` | `exports` trong repo **giữ nguyên `.ts`**; chỉ tarball mới trỏ `dist` |
| `scripts/dong-goi-sdk.mjs` | Script mới, không chạy trong CI, không đụng luồng dev |

---

## 0b · Quyết định TREO — chờ mentor xem demo (dự kiến 26/08)

### "Cần ví thật chứ không phải demo"

Ý tưởng nêu ra 25/08, **chưa triển khai**, chờ mentor xem rồi mới quyết. Ghi phân tích
sẵn ở đây để mai bàn trên nền có số, không bàn tay không.

Ba cách hiểu, ba cái giá rất khác nhau:

| Cách hiểu | Giá | Hệ quả |
|---|---|---|
| Custos **trở thành** một cái ví | Nhiều tháng · phải giữ khoá riêng người dùng | **Đổi chỗ đứng từ "bán cho ví" sang "cạnh tranh với ví"** — mà ví chính là khách hàng trả tiền (`CUSTOS.md` mục 02). Và một lớp bảo mật tự ôm khoá riêng là tự tạo bề mặt tấn công lớn nhất |
| Custos **được tích hợp vào** ví thật | Cần ví đồng ý | Đúng đích cuối, không phải chuyện 11 ngày. Nay đã có tarball để gửi khi họ hỏi |
| Custos **chạy trên giao dịch mainnet thật**, bấm được | Vài giờ | ✅ Khả thi ngay |

**Khoảng hở có thật mà ý tưởng này chỉ đúng:** mọi thứ giám khảo **bấm được** đều là
devnet + hiện trường dàn sẵn. Câu *"cái này chạy được với giao dịch thật không?"* có câu
trả lời — cohort mainnet, 249 test — nhưng nó nằm trong repo, **không bấm được**.

Trớ trêu là engine **đã** đọc và mô phỏng mainnet rồi; đó chính là cách đo cohort. Chỉ
có ví mẫu là devnet. Và `scripts/soi-mot-giao-dich.ts` đã làm đúng việc "soi một giao
dịch mainnet bất kỳ" trên dòng lệnh — docstring của nó viết thẳng: *"cách nhanh nhất để
trả lời câu sản phẩm chạy thật hay chỉ demo"*.

> **Đề xuất khi mentor hỏi:** không làm ví, làm **một trang cho dán chữ ký mainnet bất
> kỳ vào và xem Custos phân tích trực tiếp**. Không giữ khoá, không ký, không dàn dựng.
> Nó chứng minh "chạy thật" mạnh hơn mọi cái ví tự dựng — vì dữ liệu do **người xem tự
> chọn**, không phải do đội chuẩn bị.

### Hỏi mentor gì để lấy được góp ý dùng được

Mentor mới nói *"UI đẹp + hoạt động tốt là đc"* — đó là hướng ưu tiên, chưa phải góp ý
về sản phẩm. Góp ý chung chung thì không sửa được gì, nên hỏi câu hẹp:

1. Bấm **Nhận quà tặng** rồi dừng ở màn cảnh báo — **anh hiểu chuyện gì sắp xảy ra không?**
2. Dòng *"đã đọc hiểu N trên M lệnh"* — anh đọc nó thành **"đã kiểm tra được bao nhiêu"**
   hay thành **"an toàn bao nhiêu phần trăm"**?
3. Giao dịch demo hiện có **3 lệnh**. Nên dựng thêm lệnh swap cho giống tấn công thật không?
4. Nếu anh là một đội ví — thiếu gì thì anh **không** cắm cái này vào?

Câu 2 là câu đáng giá nhất: nó đo đúng chỗ sản phẩm dễ bị hiểu ngược nhất, và không ai
trong đội trả lời hộ được vì cả đội đã biết trước đáp án.

---

## 1 · Đường găng

```
        ┌─ QUYẾT ĐỊNH giao dịch demo (vai B) ─┐
        │                                     ▼
RPC key ─┼────────────────────────────────► QUAY VIDEO ──► NỘP
        │                                     ▲
        └─ neo lại cohort ─► sinh lại số liệu ─┴─► sinh lại deck ──► kiểm mắt ──► NỘP
```

**Hai nút thắt, và cả hai đang mở:**

1. **Quyết định giao dịch demo** — chặn video, là hạng mục **bắt buộc nộp**.
2. **Neo lại cohort** — chặn số liệu công khai và slide 9.

Mọi thứ khác chạy song song được.

---

## 2 · Nút thắt 1 — quyết định giao dịch demo *(vai B, quyết hôm nay)*

Giao dịch tấn công hiện có **3 lệnh**, coverage **2/3**. `CUSTOS.md` mục 07 mô tả nó nằm
giữa các lệnh swap hợp lệ — phần đó **chưa bao giờ được dựng**.

| Chọn | Video nói | Việc phải làm | Rủi ro |
|---|---|---|---|
| **A · Giữ 3 lệnh** | *"đã đọc hiểu 2 trên 3 lệnh"* | Không gì cả — quay được ngay | Giao dịch trông đơn giản hơn một cuộc tấn công thật; câu *"giao dịch Solana thật có 8–15 lệnh"* mất chỗ dựa trên màn hình |
| **B · Dựng đủ lệnh swap** | *"đã đọc hiểu 10 trên 11 lệnh"* | ~1–2 giờ vai B sửa `scripts/tan-cong.ts` | Nếu độn lệnh cho đẹp mẫu số thì **là dàn dựng** — bị loại |

**Ràng buộc cứng nếu chọn B:** mọi lệnh thêm vào phải là lệnh một giao dịch swap **thật
sự có** — `ComputeBudget`, tạo ATA, `syncNative`. Lệnh nào thêm vào chỉ để mẫu số đẹp lên
thì gỡ ra.

> **Quyết trước, quay sau.** Quay xong rồi đổi giao dịch là quay lại từ đầu.

---

## 3 · ✅ XONG 25/08 — cohort đã neo lại, và nó bắt được một cáo buộc sai

Neo cohort mới ngay hôm nay thay vì đợi 30/08, vì mẫu rụng nhanh hơn dự kiến. **Lượt đo
đầu tiên trên cohort mới ra 1 Đỏ và 1 cáo buộc** — trước đó luôn 0.

Soi ra: một giao dịch DeFi bình thường có **mở gói wSOL**. Đóng tài khoản token luôn trả
nó về System Program và rút lamport về 0, luật 12 thấy "đổi chương trình sở hữu" và gắn
Đỏ. Nghĩa là Custos **đang báo Đỏ cho mọi lệnh unwrap wSOL trên mainnet**.

Cohort cũ không bắt được vì trong 12 mẫu sống sót của nó **không có lệnh đóng tài khoản
wSOL nào**. Một bộ mẫu cố định lâu ngày không chỉ teo đi — nó teo **lệch**.

Đã vá, đã kiểm loại trừ "mẫu rụng nên hết cáo buộc" bằng cách chạy thẳng đúng giao dịch
đó. Chi tiết: `SEED-DATASET.md` mục 0b5.

> **Vẫn phải neo lại lần nữa quanh 02/09.** Mẫu tụt 12 → 9 chỉ trong vài phút giữa hai
> lượt đo. Số công bố trên sân khấu phải là số đo **cùng tuần với buổi thi**.

<details>
<summary>Hướng dẫn cũ, giữ để chạy lại lần sau</summary>

```
22/08:  12/20 mẫu đo được
25/08:   7/20 mẫu đo được     ← rụng 5 mẫu trong 3 ngày
05/09:   ~0–3 mẫu?            ← nếu cứ đà này
```

Mô phỏng phụ thuộc trạng thái chuỗi hiện tại; giao dịch càng cũ càng dễ hỏng. Đến ngày
thi, con số công bố có thể đang đứng trên **3 mẫu** — và *"0 giao dịch bị gắn cờ trên 3
giao dịch"* là câu không nói được trên sân khấu.

**Cách làm — và cách KHÔNG được làm:**

| | |
|---|---|
| ✅ Neo cohort mới bằng giao dịch **gần đây**, chạy lại, và **ghi rõ trong tài liệu là đã neo lại ngày nào, vì sao** | |
| ✅ Giữ kết quả cohort cũ trong repo để đối chiếu | |
| ❌ Lặng lẽ đổi mẫu số rồi công bố con số mới như thể cùng phép đo | Đây đúng là thứ `SEED-DATASET.md` §0b3 sinh ra để chặn |

**Cách chạy:**

```bash
mv data/seed/cohort-audit.json data/seed/cohort-audit-22-08.json
node --experimental-strip-types scripts/do-cohort.ts "neo lại 30/08" 20
node --experimental-strip-types scripts/tao-so-lieu.ts
node scripts/tao-deck.cjs docs/nop-bai/CUSTOS-PITCH.pptx apps/demo-wallet/public/so-lieu.json
```

**Acceptance:** ≥9 mẫu đo được · `cảnh báo KHÔNG có mã lý do = 0` · trang số liệu và
slide 9 khớp nhau · có một đoạn trong `SEED-DATASET.md` ghi lý do neo lại.

</details>

---

## 4 · Lịch đề xuất

| Ngày | Việc | Ai | Hạng |
|---|---|---|---|
| ~~25/08~~ | ~~commit + push vòng review~~ · ~~neo lại cohort~~ · ~~vá luật 12~~ | ✅ xong | — |
| | Quyết định giao dịch demo (A hay B) | B | 🔴 chặn video |
| **26/08** | Cắm **RPC key riêng** vào `.env.development.local` | 1 người · 10 ph | 🟠 chống sập |
| | Nếu chọn B: dựng lệnh swap + test | B · 2 h | 🔴 |
| ~~27–28/08~~ | ~~Phỏng vấn~~ · ~~outreach~~ — **ĐÃ BỎ 25/08**, không đủ thời gian. Câu trả lời sân khấu ở `docs/ket-qua-phong-van.md` | — | — |
| **29/08** | Đo **latency p50/p95** trên RPC riêng | A · 1 h | 🟡 |
| | Chạy `do-token-mo-hinh.ts` với `ANTHROPIC_API_KEY` | A · 5 ph | 🟡 |
| **02/09** | **Neo lại cohort lần nữa** + sinh lại số liệu + deck — số phải cùng tuần với buổi thi | A · 1 h | 🔴 |
| | Thêm câu Q&A về **Blockaid** | D · 20 ph | 🟡 |
| **01/09** | Mở deck bằng **Google Slides**, kiểm mắt, xuất PDF | D · 30 ph | 🟠 |
| **02/09** | **Quay video 60–90 giây** — kịch bản `docs/KICH-BAN-VIDEO.md` | 2 người · 2 h | 🔴 bắt buộc |
| **03/09** | Tập pitch 5 lượt, bấm giờ, một người đóng giám khảo khó | cả 4 · 2 h | 🟠 |
| **04/09** | **Đóng băng**: tag release, nộp video + deck, kiểm lại 4 trang live | 1 người | 🔴 |
| **05/09** | Dự phòng. Không sửa code. | — | — |

🔴 bắt buộc / chặn việc khác · 🟠 chống rủi ro sân khấu · 🟡 đắt điểm nhưng cắt được

---

## 5 · Cắt được nếu thiếu thời gian

Cắt theo thứ tự này, cắt từ dưới lên:

| Cắt | Mất gì |
|---|---|
| Đo latency | Một dòng số liệu. Nói "chưa đo" là xong |
| Đo token mô hình | Ô cuối của `DON-VI-KINH-TE.md` vẫn trống |
| Câu Blockaid | Một câu Q&A |
| Outreach | Ô traction vẫn 0 — nhưng nó **đang là 0 rồi** |
| Phỏng vấn | Tiêu chí 25 % giữ nguyên 6,5/10 |

**Không cắt được:** video · tag release · kiểm deck bằng mắt · neo lại cohort · commit.

---

## 6 · Cố ý KHÔNG làm

| Việc | Vì sao |
|---|---|
| Decoder mới cho DEX | Ô demo đã gần trần; mỗi decoder là một nguồn gắn cờ sai mới |
| Lên `@solana/web3.js` v2 | Breaking change lớn. Ghi thành known limitation thay vì sửa |
| Gán ground truth cho cohort | Việc nhiều ngày, không đổi được ô điểm nào trước hạn |
| Publish 3 gói lên npm registry | Hành động đối ngoại không hoàn tác. Tarball đủ cho pilot |
| Sửa thêm giao diện | Không có dữ liệu người dùng để biết sửa đúng hay sai |

---

## 7 · Việc tôi làm được ngay khi bạn mở khoá

| Bạn làm xong | Tôi làm tiếp |
|---|---|
| Quyết A/B giao dịch demo | Nếu B: dựng lệnh swap thật + test, đo lại coverage demo, cập nhật `CUSTOS.md` mục 07 và kịch bản video |
| Neo lại cohort | Sinh lại số liệu, sinh lại deck, soi hình học + tương phản, cập nhật `README` |
| Có `ANTHROPIC_API_KEY` trong môi trường | Chạy đo token, lấp ô cuối `DON-VI-KINH-TE.md`, tính biên gộp |
| Có RPC key | Viết script đo latency p50/p95, ghi vào `so-lieu.json` |
| Gửi JSON phỏng vấn | Xếp biên bản, chạy bộ kiểm, nêu chỗ chấm lệch |
| Gửi phản hồi ví/dApp | Cập nhật `CUSTOS.md` mục 08 từ "giả thuyết" sang "có dữ liệu" |

---

## 8 · Trạng thái hạng mục nộp bài

| Hạng mục | Trạng thái |
|---|---|
| Sản phẩm chạy được | ✅ 4 trang live |
| Mã nguồn public có lịch sử commit | ✅ |
| Slide pitch | ✅ sinh lại theo số mới — **còn cần kiểm mắt** |
| Video demo 60–90 giây | ⏸ chặn bởi §2 |
| Thông tin đăng ký | ✅ nộp 24/08 |
