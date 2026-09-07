# Xử trí lỗ hổng phụ thuộc

**Đo ngày 08/09/2026** · `npm audit` · 0 critical · 5 high · 6 moderate

Trang này tồn tại vì *biết con số* không phải là *đã xử lý*. Mỗi mục dưới đây trả lời
bốn câu: nó nằm ở đâu, có tới được người dùng không, có bản vá thật không, và quyết
định là gì.

> **Không chạy `npm audit fix --force`.** Mọi "bản vá" mà npm đề xuất cho repo này đều
> là **hạ cấp semver-major về bản cổ** — `@solana/spl-token@0.1.8` (hiện dùng `0.4.x`)
> và `@solana/web3.js@0.0.3` (hiện dùng `1.98.x`). Đó không phải sửa lỗi; đó là vứt
> bỏ sản phẩm. Nói cách khác: **thượng nguồn chưa có fix**.

---

## 1 · Mười một advisory, ba nguyên nhân gốc

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
đọc của Custos: `AccountLayout.decode()` bóc dữ liệu tài khoản token lấy từ RPC, và
dữ liệu đó do **kẻ tấn công tạo được** — bất kỳ ai cũng mở được một token account.

Nhưng điều kiện kích hoạt không đi qua được: `AccountLayout` là layout **cố định 165
byte**, và trường `amount` là lát `u64` **cố định 8 byte**. Buffer đưa vào
`toBigIntLE()` luôn đúng 8 byte, bất kể tài khoản trên chuỗi trông thế nào.

- **Quyết định:** chấp nhận rủi ro, có điều kiện.
- **Điều kiện xem lại:** nếu Custos bắt đầu gọi `toBigIntLE()` trên buffer **độ dài
  thay đổi** — ví dụ khi thêm decoder cho chương trình DEX có layout động — mục này
  phải được đánh giá lại **trước** khi decoder đó vào nhánh chính.
- **Theo dõi:** khi `@solana/spl-token` phát hành bản bỏ `bigint-buffer` (hoặc
  `bigint-buffer` vá), nâng ngay. Đây là bản vá duy nhất đáng chờ trong ba mục.

### 3.2 · `jayson` → `stream-json`, `uuid` — moderate, không vào runtime người dùng

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

---

## 4 · Điều trang này KHÔNG nói

- Không nói *"11 lỗ hổng đã được vá"*. Chúng **chưa** được vá; chúng đã được **đánh
  giá và chấp nhận có điều kiện**, và điều kiện được ghi ra để kiểm lại.
- Không nói bundle *"sạch tuyệt đối"*. Phép đo ở mục 2 dựa vào chuỗi ký tự trong file
  đã minify — mạnh, nhưng không phải chứng minh hình thức.
- Không nói rủi ro bằng **không**. `bigint-buffer` nằm trong đường đọc thật; lập luận
  ở 3.1 dựa vào một tính chất của layout SPL, và tính chất đó có thể đổi khi mã đổi.

---

## 5 · Kiểm lại

```bash
npm audit                       # số hiện tại
npm run kiem-san-pham           # ô "Lỗ hổng phụ thuộc có xử trí"
```

Ô trong cổng sản phẩm chỉ xanh khi **vừa có số, vừa có trang này**. Có số mà không
nói định làm gì với nó thì chưa phải là đã xử lý — và đó chính là lý do trang này tồn
tại.
