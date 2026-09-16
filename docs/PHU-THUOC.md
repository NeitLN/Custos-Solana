# Xử trí lỗ hổng phụ thuộc

**Đo lại 13/09/2026** · `npm audit` · 0 critical · **5 high** · 0 moderate

> **SÁU ADVISORY ĐÃ ĐƯỢC VÁ THẬT — kết luận cũ của trang này chỉ đúng một nửa.**
>
> Bản 08/09 viết *"chờ bản vá không phải một kế hoạch"* và áp câu đó cho **cả 11**
> advisory. Đo lại ở TB-S03 cho thấy nó **đúng với 5 high, sai với 6 moderate**:
>
> | Gói | Dải bị ảnh hưởng | Đọc ra |
> |---|---|---|
> | `uuid` | `<11.1.1` | có **giới hạn trên** ⇒ bản vá tồn tại |
> | `stream-json` | `<=3.4.0` | có **giới hạn trên** ⇒ bản vá tồn tại |
> | `bigint-buffer` · `image-size` · `spl-token` … | `*` | **không** giới hạn trên ⇒ chưa có bản vá |
>
> Dấu hiệu phân biệt nằm ngay trong `npm audit --json`: dải `*` nghĩa là **mọi**
> phiên bản đều dính, còn `<11.1.1` nghĩa là đã có bản sạch. Bản trước đọc
> `fixAvailable` — trường đó đề xuất `@solana/web3.js@0.0.3`, một bản hạ cấp mười năm
> tuổi, nên nó bị bỏ qua **cùng với** thông tin hữu ích nằm cạnh.
>
> Cách vá: `overrides` với **dải mở** (`>=11.1.1`), không phải `^11.1.1`. Bản đầu
> dùng `^` và ép `rpc-websockets` — vốn đã dùng `uuid@14.0.2` sạch — **xuống** 11.x,
> làm cây phụ thuộc không hợp lệ (`npm ls` báo `invalid`). Một bản vá hạ cấp nhánh
> vốn an toàn thì không phải bản vá.

Trang này tồn tại vì *biết con số* không phải là *đã xử lý*. Mỗi mục dưới đây trả lời
bốn câu: nó nằm ở đâu, có tới được người dùng không, có bản vá thật không, và quyết
định là gì.

> **Không chạy `npm audit fix --force`.** Mọi "bản vá" mà npm đề xuất cho repo này đều
> là **hạ cấp semver-major về bản cổ** — `@solana/spl-token@0.1.8` (hiện dùng `0.4.x`),
> `@solana/web3.js@0.0.3` (hiện dùng `1.98.x`), `pptxgenjs@1.1.5` (hiện dùng `4.0.1`).
> Đó không phải sửa lỗi; đó là vứt bỏ sản phẩm.

## 0 · "Thượng nguồn chưa có fix" — đã tra, không phải suy đoán

Câu đó ở bản trước được suy ra từ việc *npm đề xuất hạ cấp*. Suy như vậy chưa đủ: npm
đề xuất hạ cấp cả khi có bản vá mà cây phụ thuộc không với tới được. Nên tra thẳng
registry, **08/09/2026**:

| Gói | Đang dùng | Mới nhất trên registry | Dải bị ảnh hưởng |
|---|---|---|---|
| `bigint-buffer` | `1.1.5` | **`1.1.5`** | `<=1.1.5` |
| `image-size` | `1.2.1` | `2.0.2` | **`<=2.0.2`** |
| `@solana/spl-token` | `0.4.15` | **`0.4.15`** | — |
| `@solana/web3.js` | `1.98.4` | **`1.98.4`** | — |
| `pptxgenjs` | `4.0.1` | **`4.0.1`** | — |

Hai điều đọc ra được, và điều thứ hai mạnh hơn câu ở bản trước:

1. **Ba gói trực tiếp đều đã ở bản mới nhất.** Không có bản vá nào đang bị bỏ lỡ.
2. **Cả hai advisory high đều KHÔNG có bản đã vá.** `bigint-buffer` mới nhất chính là
   bản dính lỗi. `image-size` có `2.0.2` mới hơn bản đang cài, nhưng dải bị ảnh hưởng
   là `<=2.0.2` — **nâng lên cũng không sửa được gì**, nên `overrides` để kéo `2.x`
   là công vô ích, không phải một phương án đang bị bỏ qua.

Nói cách khác: **với năm advisory HIGH, chờ bản vá không phải một kế hoạch.** Thứ
thay cho bản vá là lập luận phơi nhiễm ở mục 3 — và từ vòng này, lập luận đó có test
canh (mục 3.4).

> **Câu trên từng được viết cho CẢ 11 advisory, và cái sai đó tốn năm ngày.**
> Sáu advisory moderate có dải bị ảnh hưởng **giới hạn trên** (`uuid <11.1.1`,
> `stream-json <=3.4.0`) — tức bản vá đã tồn tại từ trước. Chỉ nhóm high mới có dải
> `*`, nghĩa là mọi phiên bản đều dính. Phân biệt nằm ngay trong `npm audit --json`;
> bản trước không đọc tới vì đã kết luận từ `fixAvailable` (trường đó đề xuất
> `@solana/web3.js@0.0.3`, một bản hạ cấp mười năm tuổi, nên bị bỏ qua cùng với
> thông tin hữu ích nằm cạnh). Xem mục 3.2.

---

## 1 · Năm advisory còn lại, hai nguyên nhân gốc

| Nguyên nhân gốc | Mức | Đường vào | Số advisory kéo theo |
|---|---|---|---|
| `bigint-buffer` — tràn bộ đệm trong `toBigIntLE()` | **high** | `@solana/spl-token` → `@solana/buffer-layout-utils` | 3 |
| `jayson` — kéo `stream-json` (DoS O(depth²)) và `uuid` (thiếu kiểm biên) | moderate | `@solana/web3.js` | 5 |
| `image-size` — vòng lặp vô hạn ở parser ICNS/JXL/HEIF | **high** | `pptxgenjs` | 3 |

Tám advisory còn lại là cùng ba lỗi đó đếm lại theo từng gói trung gian.

---

## 2 · Đo xem chúng có tới được người dùng không

Bundle công khai được dựng rồi soi trực tiếp — không suy đoán từ cây phụ thuộc:

```bash
npm run build -w @custos-solana/demo-wallet
npm run build -w @custos-solana/trang-tan-cong
mkdir -p site && cp -r apps/demo-wallet/dist/* site/
grep -rlF "TokenAccountNotFoundError" site/assets/   # spl-token có trong bundle?
grep -rlF "node:stream" site/assets/                 # jayson/stream-json có không?
```

| Gói | Trong bundle trình duyệt? | Bằng chứng |
|---|---|---|
| `@solana/spl-token` (→ `bigint-buffer`) | **CÓ** | chuỗi `TokenAccountNotFoundError`, `TokenInvalidMint`, `TokenOwnerOffCurve` đều có mặt |
| `jayson` · `stream-json` · `uuid` | **KHÔNG** | `node:stream` vắng mặt; web3.js dùng đường `fetch` trong trình duyệt, không dùng `jayson` |
| `pptxgenjs` · `image-size` | **KHÔNG** | devDependency của repo gốc, không phải của gói nào đã phát hành |

Tên gói bị minifier đổi, nên phép grep dựa vào **chuỗi ký tự** — minifier không đổi
được string literal. Đây là bằng chứng mạnh, không phải chứng minh tuyệt đối.

---

## 3 · Xử trí từng nguyên nhân

### 3.1 · `bigint-buffer` — **high**, có trong bundle, đường tới hẹp

`toBigIntLE()` tràn bộ đệm khi nhận buffer **dài hơn dự kiến**. Nó nằm trong đường
đọc của Custos, và dữ liệu đưa vào do **kẻ tấn công tạo được** — bất kỳ ai cũng mở
được một token account rồi nhét gì vào đó tuỳ ý.

Đường mã thật là [`parseTokenAccount`](../packages/core/src/l1/parse.ts) gọi
`unpackAccount` của `@solana/spl-token` — **không** gọi `AccountLayout.decode()` thẳng
như bản trước của trang này viết. Khác biệt đó quan trọng: `unpackAccount` **kiểm độ
dài trước khi giải mã**, còn `AccountLayout.decode()` thì không.

**Đo, không lập luận** — nạp buffer dị dạng qua đúng hàm sản xuất:

| Đầu vào | Kết quả |
|---|---|
| 165 byte hợp lệ | `amount=500` ✅ đọc được |
| 5000 byte rác · Token program | `null` — từ chối |
| 5000 byte rác · Token-2022 | `null` — từ chối |
| 165 byte hợp lệ + 4000 byte đuôi | `null` — từ chối |
| 8 byte cụt · 0 byte | `null` — từ chối |

Không ca nào ném lỗi ra ngoài: `parseTokenAccount` hứa chịu được dữ liệu bất kỳ mà
không làm sập cả lượt kiểm tra, và nó giữ đúng lời hứa đó.

- **Quyết định:** chấp nhận rủi ro, có điều kiện.
- **Điều kiện xem lại:** nếu Custos bắt đầu gọi `toBigIntLE()` trên buffer **độ dài
  thay đổi** — ví dụ khi thêm decoder cho chương trình DEX có layout động — mục này
  phải được đánh giá lại **trước** khi decoder đó vào nhánh chính.
- **Theo dõi:** khi `@solana/spl-token` phát hành bản bỏ `bigint-buffer` (hoặc
  `bigint-buffer` vá), nâng ngay. Đây là bản vá duy nhất đáng chờ trong ba mục.

### 3.2 · `jayson` → `stream-json`, `uuid` — ✅ **ĐÃ VÁ 13/09**, không còn advisory

> **Mục này giữ nguyên phần phân tích cũ làm dấu vết.** Kết luận cũ (*"không vào
> runtime người dùng nên chấp nhận được"*) **đúng nhưng chưa đủ**: đã có bản vá thật
> và trang này bỏ lỡ nó suốt năm ngày, vì câu *"thượng nguồn chưa có fix"* ở mục 0
> được áp cho cả 11 advisory thay vì kiểm từng cái.
>
> `overrides: { "uuid": ">=11.1.1", "stream-json": ">=3.6.0" }` trong `package.json`.
> Sau đó `npm audit` còn **5**, và cả bốn cổng đều xanh: 566 test · build hai app ·
> devnet 6/6 · `thu-goi` 10/10 bẫy + 3/3 đối chứng.
>
> **Bài học giữ lại:** "không tới được người dùng" là lý do để **hạ ưu tiên**, không
> phải lý do để **ngừng tìm bản vá**.

`jayson` là client JSON-RPC **của Node** trong `@solana/web3.js`. Bundle trình duyệt
không chứa nó (mục 2). Trên Node, nó chỉ chạy trong các script đo của repo, nối tới
RPC Devnet công cộng do chính đội chọn.

Đường khai thác `stream-json` cần một endpoint RPC **thù địch** trả JSON lồng sâu. Ai
trỏ Custos vào một RPC thù địch thì đã có vấn đề lớn hơn nhiều — RPC đó kiểm soát
toàn bộ kết quả mô phỏng, tức kiểm soát mọi thứ Custos nói.

- **Quyết định:** chấp nhận rủi ro.
- **Điều kiện xem lại:** nếu có bản `@solana/web3.js` 1.x vá được chuỗi này mà không
  phải hạ cấp, nâng. Không chuyển sang web3.js v2 chỉ vì lý do này — xem
  `NGHIEN-CUU-21-08.md` về bẫy phiên bản.

### 3.3 · `image-size` qua `pptxgenjs` — **high**, chỉ ở máy đội

`pptxgenjs` dựng `docs/nop-bai/CUSTOS-PITCH.pptx`. Nó là **devDependency của repo
gốc**, không phải phụ thuộc của `@custos-solana/core`, `ai` hay `types` — người cài
SDK không nhận nó.

Đường khai thác cần một **file ảnh độc hại** đi vào bước dựng deck. Deck hiện không
nhúng ảnh nào từ bên ngoài; đầu vào là `so-lieu.json` do chính repo sinh.

- **Quyết định:** chấp nhận rủi ro.
- **Điều kiện xem lại:** nếu deck bắt đầu nhúng ảnh do người ngoài cung cấp — ảnh
  chụp màn hình từ pilot chẳng hạn — mục này phải đánh giá lại trước.
- **Ghi nhận trung thực:** hai advisory high này **do chính đội tạo ra** khi thêm
  `pptxgenjs` để sinh deck từ dữ liệu. Đổi lại, deck không còn mang số gõ tay.

### 3.4 · Điều kiện xem lại — nay có test canh

Mỗi quyết định ở trên là *chấp nhận rủi ro CÓ ĐIỀU KIỆN*, và mỗi điều kiện từng chỉ
là một câu tiếng Việt trong file này.

Một điều kiện chỉ nằm trong tài liệu là một điều kiện sẽ không ai kiểm. Người viết
decoder DEX sáu tuần nữa không mở lại trang này trước khi gõ dòng đầu tiên — họ mở
một bài kiểm đỏ. Nên bốn điều kiện quan trọng nhất nằm ở
[`packages/core/test/phoiNhiemPhuThuoc.test.ts`](../packages/core/test/phoiNhiemPhuThuoc.test.ts):

| Mục | Bài kiểm canh điều gì | Đỏ khi |
|---|---|---|
| 3.1 | buffer dị dạng bị từ chối trước lớp giải mã | ai đó nới lỏng `parseTokenAccount` |
| 3.1 | không nguồn nào import thẳng `bigint-buffer` / `@solana/buffer-layout-utils` | ai đó thêm decoder layout **động** |
| 3.3 | `tao-deck.cjs` không gọi API nhúng ảnh | deck bắt đầu nhận file ảnh |
| 3.3 | `pptxgenjs`/`image-size` không vào `dependencies` của gói phát hành | công cụ slide rơi vào SDK |

Cả bốn đã được **kiểm phủ định**: phá đúng thứ chúng canh thì chúng đỏ, và chỉ đúng
cái tương ứng đỏ — không cái nào đỏ lây.

Bài thứ hai đáng chú ý vì nó canh thứ bài thứ nhất **không thể** thấy. Điều kiện thật
của 3.1 nói về một *đường mã chưa tồn tại*; không bài kiểm nào chạy được qua mã chưa
viết. Thứ canh được là **cửa vào**: hôm nay mọi lần đọc `u64` đều đi qua
`unpackAccount`, nên bất kỳ ai cần layout động đều buộc phải import thẳng lớp dưới —
và đúng lúc đó bài kiểm chặn họ lại.

### 3.5 · Ai chịu trách nhiệm, và xem lại khi nào

| | |
|---|---|
| **Người chịu trách nhiệm** | **vai A** (sở hữu Custos Core + SDK — xem bảng vai trong `CLAUDE.md`) |
| **Quyết định** | **6 đã vá** (`overrides`, 13/09) · **5 chấp nhận** tạm thời và có điều kiện |
| **Đo lần này** | 13/09/2026 · `npm audit` · 0 critical · **5 high** · 0 moderate |
| **Xem lại khi** | (a) một trong bốn bài kiểm ở 3.4 đỏ · (b) thượng nguồn ra bản đã vá thật · (c) trước khi nộp bài, hạn 19/09/2026 — tuỳ điều nào tới trước |

Ba điều kiện, không phải một ngày duy nhất. Đặt mỗi một ngày thì rủi ro trôi tự do
giữa hai lần xem; đặt mỗi "khi test đỏ" thì bỏ sót bản vá thượng nguồn.

---

## 4 · Điều trang này KHÔNG nói

- Không nói *"11 lỗ hổng đã được vá"*. **Sáu** đã vá thật (13/09, `overrides`);
  **năm** còn lại **chưa** được vá — chúng được **đánh giá và chấp nhận có điều
  kiện**, và điều kiện được ghi ra để kiểm lại.
- Không nói *"đã hết moderate nên an toàn hơn"*. Năm advisory còn lại đều là **high**,
  và một trong số đó (`bigint-buffer`) nằm **trong bundle trình duyệt**. Xoá sáu
  moderate không đụng gì tới rủi ro đó.
- Không nói bundle *"sạch tuyệt đối"*. Phép đo ở mục 2 dựa vào chuỗi ký tự trong file
  đã minify — mạnh, nhưng không phải chứng minh hình thức.
- Không nói rủi ro bằng **không**. `bigint-buffer` nằm trong đường đọc thật; lập luận
  ở 3.1 dựa vào một tính chất của layout SPL, và tính chất đó có thể đổi khi mã đổi.
  Bài kiểm ở 3.4 phát hiện được thay đổi đó — nó **không** ngăn được thay đổi đó.
- Không nói bốn bài kiểm ở 3.4 là *chứng minh không khai thác được*. Chúng canh đúng
  bốn giả định mà quyết định chấp nhận rủi ro đang dựa vào. Giả định thứ năm mà đội
  chưa nghĩ ra thì không có bài nào canh — và đó là giới hạn thật của cả trang này.

---

## 5 · Kiểm lại

```bash
npm audit                       # số hiện tại
npm run check                   # bốn bài kiểm ở mục 3.4 nằm trong đây
npm run kiem-san-pham           # ô "Lỗ hổng phụ thuộc có xử trí"
```

Ô trong cổng sản phẩm chỉ xanh khi **vừa có số, vừa có trang này**. Có số mà không
nói định làm gì với nó thì chưa phải là đã xử lý — và đó chính là lý do trang này tồn
tại.


### Kiểm lại trong bàn giao Codex — 16/09/2026

`npm audit` vẫn ghi 5 high, 0 moderate, 0 critical; artifact ở
`docs/review/technical/codex-20260916/audit.json`. Các test phơi nhiễm nằm trong lượt
check mới đã đạt. Giữ quyết định chấp nhận có điều kiện ở mục 3.5; chưa có kết luận
rằng 5 high đã vá hoặc không thể khai thác. Xem lại trước nộp nếu phụ thuộc thay đổi.
