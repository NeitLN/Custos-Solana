# Roadmap "demo → bản thật" — 5 ngày cuối

**Lập 31/08/2026** *(bản đầu ghi nhầm 30/08 — đã sửa, và nó làm mất một ngày đệm).*
Hạn nộp tự đặt **04/09**, thi **05/09 08:00**. **Còn 4 ngày.**
Phạm vi đã chốt: **Mức 1 + Mức 2**. Mức 3 (cắm Phantom) và Mức 4 (khách hàng thật) **loại**.

---

## 0 · Điều luật của cả roadmap này

Bài thi hiện đã **chạy tốt**. Mọi việc dưới đây là **cộng thêm**, không phải sửa lại.
Từ đó ra ba luật không được vi phạm:

| # | Luật | Vì sao |
|---|---|---|
| **L1** | **Không sửa file nào đang phục vụ demo devnet.** Chỉ thêm file mới | Video quay ngày 31/08 dựa vào đúng luồng đó. Làm hỏng nó là mất thứ bắt buộc phải nộp |
| **L2** | **Không đụng đường ký.** Trang mới chỉ đọc, không có khoá, không có nút ký | Sửa đường ký 5 ngày trước thi là rủi ro không tương xứng với phần thưởng |
| **L3** | **Mỗi phase có cổng dừng.** Quá giờ mà chưa qua tiêu chí thì **bỏ phase đó**, không cố | Deadline cứng. Một tính năng dở dang tệ hơn không có |

> **Nhánh riêng.** Toàn bộ việc này làm trên nhánh `ban-that`, chỉ merge vào `main`
> khi qua Phase 4. `main` luôn ở trạng thái nộp được — nếu 03/09 mọi thứ cháy, cứ nộp
> `main` là xong.

---

## Sơ đồ thời gian

```
31/08 chiều ├── Phase 0  ranh giới an toàn        ✅ xong
            ├── Phase 3  publish npm              (30 phút)   ← chạy trước, cần bạn
            ├── Phase 1  trang soi mainnet chạy   (2–3 tiếng) ← CỔNG DỪNG 22:00
            └── Phase 2  trung thực & lỗi         (1 tiếng)

31/08 tối   └──── QUAY VIDEO ────  ưu tiên tuyệt đối, không build gì thêm

01–02/09    └── Phase 4  nghiệm thu + đưa vào bài (2 tiếng)   ← CỔNG MERGE

03/09       tập pitch · KHÔNG BUILD
04/09       nộp · đóng băng code
05/09       thi
```

> **Phase 3 lên trước Phase 1.** Nó chỉ 30 phút, không phụ thuộc gì, và phần việc của
> bạn (tạo org + `npm login`) chạy song song được với phần việc của Claude. Xếp sau
> thì nó thành thứ bị cắt khi hết giờ, dù nó rẻ nhất.

**VIDEO LÀ VIỆC CỦA HÔM NAY.** Nếu 22:00 Phase 1 chưa xong: `git checkout main`, quay
video, bỏ hết phần còn lại. Không thương lượng — video là thứ **bắt buộc nộp**, trang
soi mainnet thì không.

---

## Phase 0 · Ranh giới an toàn — 30 phút

Làm trước khi gõ dòng code nào, vì đây là thứ cho phép làm nhanh mà không sợ.

| Việc | Tiêu chí xong |
|---|---|
| Tạo nhánh `ban-that` từ `main` | `git branch` hiện nhánh mới |
| Ghi lại "trạng thái vàng" của demo hiện tại | Chụp lại: 249 test qua · hiện trường còn 500 token · hai trang deploy chạy |
| Liệt kê file **cấm chạm** | `App.tsx`, `vi.ts`, `yeuCauNgoai.ts`, `hienTruong.ts`, `dung-hien-truong.ts` |

**Cổng ra:** biết chính xác lệnh nào đưa mọi thứ về nguyên trạng (`git checkout main`).

---

## Phase 1 · Trang soi giao dịch mainnet — 2–3 tiếng

**Mục tiêu:** dán chữ ký mainnet bất kỳ → Custos phân tích live, hiện đúng màn cảnh báo.

### Vì sao làm được nhanh

Cách dựng lại giao dịch **đã có sẵn và đã chứng minh**: `scripts/do-cohort.ts` lấy
`getTransaction`, dựng `VersionedTransaction` với chữ ký rỗng, rồi `extractFacts`.
Đã chạy trên **20 giao dịch mainnet thật**. Phase này là **port sang trình duyệt**,
không phải phát minh gì mới.

### Việc

| # | Việc | Ghi chú |
|---|---|---|
| 1.1 | `src/Soi.tsx` — ô nhập, gọi `inspect()`, tái dùng `CanhBao` | ✅ **đã dựng nháp 30/08** |
| 1.2 | `soi.html` + `src/soi.tsx` — entry trang thứ tư | Theo đúng mẫu `so-lieu.html` |
| 1.3 | Thêm `soi` vào `rollupOptions.input` trong `vite.config.ts` | Thiếu bước này thì build im lặng bỏ qua trang |
| 1.4 | Polyfill Buffer — trang này **có** đụng `@solana/web3.js` | Khác `so-lieu.tsx` (trang đó cố ý bỏ polyfill) |

### Tiêu chí xong — đo được, không cảm tính

- [ ] Dán **3 chữ ký cohort** → cả ba ra kết quả, không trắng trang
- [ ] Dán **một chữ ký rác** → hiện thông báo lỗi tiếng Việt, không phải stack trace
- [ ] `npm run check` vẫn **249/249**
- [ ] Ví mẫu devnet ở `/` vẫn chạy y nguyên *(mở bằng tay, không tin vào build xanh)*

### Rủi ro đã biết

| Rủi ro | Xử lý |
|---|---|
| Node công khai mainnet chặn tốc độ (`429`) | Đây chính là lý do có `VITE_RPC`. Cắm key Helius là hết |
| Giao dịch quá cũ, node đã cắt lịch sử | Đã có nhánh xử lý `tx === null` với câu tiếng Việt |
| Bundle phình vì thêm web3.js vào trang mới | Đo `dist/` trước–sau. Trang mới tách chunk riêng, không ảnh hưởng `/` |

**CỔNG DỪNG: 22:00 ngày 31/08.** Chưa qua 4 ô tiêu chí thì dừng, để nhánh đó đấy, đi quay video.

---

## Phase 2 · Trung thực và trạng thái lỗi — 1 tiếng

Phase này **không thêm tính năng nào**. Nó tồn tại vì thể lệ BTC ghi rõ: *trình bày
sai về mức độ hoàn thiện bị trừ điểm hoặc loại*.

### Ba điều trang phải tự khai, trước khi người ta bấm

| Điều | Vì sao bắt buộc |
|---|---|
| **Không ký gì cả** | Người lạ dán giao dịch của họ vào một trang lạ — phải nói ngay là không có khoá |
| **Mô phỏng trên trạng thái chuỗi HIỆN TẠI** | Giao dịch đã thực thi xong thì mô phỏng lại trả lời *"nếu gửi lại bây giờ"*, **có thể khác** cái đã xảy ra. Giấu điều này là nói dối bằng cách im lặng |
| **Mức độ do luật quyết định, không do AI** | Quyết định thiết kế đã khoá số 1 |

### Việc

- [ ] Khối "đọc trước ba dòng này" hiện **phía trên** ô nhập ✅ *(đã có trong nháp)*
- [ ] Nói rõ đang bảo vệ **ví nào** trong kết quả — chọn sai ví là sai toàn bộ verdict
- [ ] Lỗi mạng, chữ ký sai, giao dịch không tồn tại → ba câu tiếng Việt khác nhau
- [ ] Không có chữ **"an toàn"** ở bất kỳ đâu trên trang

### Tiêu chí xong

- [ ] Đọc to ba dòng cảnh báo cho một người ngoài đội — họ hiểu trang này **không** ký
- [ ] `grep -i "an toàn" src/Soi.tsx` → chỉ khớp trong câu phủ định

---

## Phase 3 · Publish SDK lên npm — 30 phút

**Đổi câu trả lời từ *"cài bằng file .tgz"* thành *"npm i @custos/core"*.**

### Việc

| # | Việc | Ai |
|---|---|---|
| 3.1 | Kiểm scope `@custos` trên npm còn trống không | Claude |
| 3.2 | Tạo tài khoản npm + `npm login` | **Bạn** — Claude không có credential |
| 3.3 | Bỏ `private: true`, thêm `publishConfig.access: "public"` cho 3 gói lib | Claude |
| 3.4 | `npm publish` theo thứ tự `types` → `core` → `ai` | Claude, sau khi bạn login |
| 3.5 | Thử cài từ máy sạch: `npm i @custos/core` trong thư mục trống | Claude |

> **Thứ tự bắt buộc.** `core` phụ thuộc `types`; publish ngược thứ tự là gãy.

### Nếu scope `@custos` đã có người lấy

Đổi sang `@custos-solana/*` hoặc tên không scope `custos-solana`. **Quyết định trong
5 phút, không cân nhắc lâu** — tên gói không phải thứ ăn điểm.

### Cổng bỏ qua

Không tạo được org `custos` → **đổi sang tên không scope `custos-solana`** (đã kiểm: còn trống). Vẫn bí thì bỏ Phase 3. Câu *"SDK cài được"* vẫn
đúng nhờ tarball đã test thật; chỉ là không nói được *"một dòng"*.

---

## Phase 4 · Nghiệm thu và đưa vào bài thi — 2 tiếng

Phase dễ quên nhất, và là phase **biến code thành điểm**. Code không ai biết thì bằng không.

### 4a · Nghiệm thu trước khi merge

- [ ] `npm run check` — 249/249
- [ ] Build cả hai app, gộp `site/`, chạy `soi-ro-ri-khoa.mjs` → sạch
- [ ] Mở **bằng tay** cả 4 trang: `/`, `/soi.html`, `/so-lieu.html`, `/phong-van.html`
- [ ] Kiểm số dư hiện trường devnet vẫn 500 token *(đọc số dư thật, không tin HTTP 200)*
- [ ] Merge `ban-that` → `main`, push, **đợi CI xanh**, mở lại link công khai

> **Đây là chỗ đã sập một lần rồi.** Bản deploy công khai từng trỏ vào hiện trường
> chết mà HTTP vẫn 200. Phải đọc số dư, không được tin mã trạng thái.

### 4b · Đưa vào bài — ba chỗ

| Chỗ | Thêm gì |
|---|---|
| **Deck** | Một slide: *"Đừng tin em — anh/chị tự dán giao dịch của mình vào"* + link |
| **Pitch** | Một câu trả lời mới cho *"demo có dàn dựng không?"* |
| **`CUSTOS.md` mục trạng thái** | Cập nhật: SDK publish npm · trang soi mainnet công khai |

### Câu nói được trên sân khấu — soạn sẵn, học thuộc

> *"Demo devnet là kịch bản tụi em dựng, và tụi em nói thẳng điều đó. Nhưng bộ máy
> phân tích thì không dựng được — nó đã chạy trên **20 giao dịch mainnet thật**.
> Anh/chị mở ví của mình, copy chữ ký một giao dịch bất kỳ, dán vào trang này. Nó
> **không ký gì cả**, chỉ đọc."*

**Không được nói:** *"Custos đã chạy trên mainnet cho người dùng thật"* — sai. Đúng là
*"bộ máy đã phân tích giao dịch mainnet thật; chưa có ví nào tích hợp"*.

---

## Bảng theo dõi

| Phase | Hạn | Cổng dừng | Trạng thái |
|---|---|---|---|
| 0 · Ranh giới | — | — | ✅ xong |
| 1 · Trang soi mainnet | **31/08 22:00** | **Quá giờ → bỏ hết** | ◐ nháp `Soi.tsx` xong |
| 2 · Trung thực & lỗi | 31/08 23:00 | Quá giờ → bỏ Phase 1 luôn | ☐ |
| 3 · npm publish | 31/08 chiều | Không tạo được org → đổi tên gói | ◐ tài khoản đã có |
| 4 · Nghiệm thu + vào bài | 02/09 | **Không qua → không merge** | ☐ |

---

## Cái không làm, và vì sao ghi ra

Ghi ra để đến 03/09 không ai hỏi lại *"hay là mình thêm…"*:

| Không làm | Vì sao |
|---|---|
| Cắm Phantom qua wallet-adapter | Sửa đường ký sát ngày thi. Không chứng minh thêm gì mà Phase 1 chưa chứng minh |
| Chạy demo tấn công trên mainnet | Không dựng được giao dịch độc hại hợp pháp trên mainnet |
| Tìm ví/dApp tích hợp thật | Vài tuần. `CUSTOS.md` đã chốt đường sau thi là **grant** |
| Decoder cho chương trình DEX | Nâng coverage vài %, tốn cả ngày. Không đổi được câu chuyện |
| Sửa lại giao diện ví mẫu | Mentor đã nói *"UI đẹp vs hoạt động tốt là được"*. Nó đang hoạt động tốt |
