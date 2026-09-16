# Bàn giao cho Codex — bản lịch sử của Claude

> **Codex đã xử lý ngày 16/09:** xem [kết quả](review/technical/codex-20260916/BAO-CAO.md). Trạng thái hiện hành chỉ ở [TIEN-DO.md](roadmap/TIEN-DO.md). Các trở ngại DNS/quyền trong phần dưới mô tả lúc bàn giao, không phải kết luận hiện tại.

**Người viết:** Claude Code, phiên 14–16/09/2026.
**Trạng thái lúc bàn giao:** HEAD `9d85c8c` · **716 test pass, 0 fail** · **11 commit
chưa push** · cây có **1 file bẩn** (`data/tich-hop/ket-qua.json`).
**Dấu vết nội dung:** mã `6baf5fabc6f966d5` (121 file) · giao diện `c90436fd14d2fcb9` (30 file).

Đọc `docs/roadmap/TIEN-DO.md` để biết trạng thái từng thẻ — **đó là nguồn trạng thái
duy nhất**, file này chỉ giải thích phần còn mở. Đừng tạo bảng trạng thái thứ hai.

---

## 0 · Đọc cái này trước, nếu không sẽ phá thứ đang được đo

Bốn đường dưới đây bị `scripts/toTien.ts` → `laMa()` tính là **mã**. Sửa bất kỳ file
nào trong đó làm **mọi bằng chứng tích hợp cũ hết hiệu lực**, kể cả lượt pass 12/09:

```
packages/**            vi-du-tich-hop/**
scripts/dong-goi-sdk.mjs      scripts/thu-tich-hop.mjs
apps/demo-wallet/public/hien-truong.json
```

Và `vi-du-tich-hop/src/tich-hop.js` bị `demDongMa()` (`scripts/thu-tich-hop.mjs:315`)
**đếm số dòng**, con số đó công bố ở **sáu chỗ**. Thêm một dòng vào file đó là thổi
"30 dòng tích hợp" lên mà không ai nhận ra.

**Quy tắc rút ra từ ba lỗi của phiên này:** trước khi sửa một dòng tài liệu hay một
hằng số, `grep` xem script nào đang neo nó. Tôi đã bỏ qua bước này một lần và làm
`npm run so-lieu` ném lỗi **giữa chừng, sau khi đã ghi xong `README.md`** — một lượt
đồng bộ ghi nửa vời, không dấu hiệu nào trên cây làm việc.

---

## 1 · Việc CHẶN, và nó không nằm trong repo

### 1.1 · DNS của máy này không phân giải `*.solana.com`

Đây là lý do `npm run thu-tich-hop:devnet` hỏng, và là ô đỏ duy nhất còn lại mà máy
có thể đóng được.

| Resolver | `api.devnet.solana.com` |
|---|---|
| `192.168.1.1` (router) | **ETIMEOUT** |
| `123.23.23.23` (VNPT) | **ESERVFAIL** |
| `1.1.1.1` (Cloudflare) | `74.63.203.93` ✓ |
| `8.8.8.8` (Google) | `74.63.203.93` ✓ |

`curl --resolve` bỏ qua DNS cho ra `{"jsonrpc":"2.0","result":"ok"}` HTTP 200. Đường
mạng thông, domain sống, Solana không sập — **chỉ resolver chặn**. `api.testnet` và
`api.mainnet-beta` cũng thế. `solana.com`, `registry.npmjs.org`, `api.github.com`
đều bình thường.

**Cách sửa (cần người, quyền Administrator):**

```powershell
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses 1.1.1.1,8.8.8.8
nslookup api.devnet.solana.com
# hoàn nguyên khi xong:
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ResetServerAddresses
```

Hoặc phát 4G từ điện thoại. Xong thì chạy `npm run thu-tich-hop:devnet` và commit
`data/tich-hop/ket-qua.json`.

### 1.2 · Ba đường vòng tôi đã thử và BỎ — đừng thử lại

| Cách | Vì sao không |
|---|---|
| `dns.setServers(['1.1.1.1'])` | vô dụng: `dns.lookup()` gọi `getaddrinfo` của Windows, không qua resolver của Node. `resolve4()` thì được — nhưng `fetch` không dùng nó |
| Cắm `lookup` tuỳ biến vào `fetch` | `undici` không `require` được (MODULE_NOT_FOUND), Node 24.12 không phơi `setGlobalDispatcher` |
| `ConnectionConfig.fetch` (CÓ tồn tại, `index.d.ts:3180`) | vá được **về kỹ thuật**, nhưng chỗ phải vá là `vi-du-tich-hop/src/chay.js:118` — file đang **được đo**. Sửa consumer để chiều một trục trặc DNS là đổi chính phép đo |
| Đổi `rpc` trong `hien-truong.json` | file đó nằm trong `laMa()` ⇒ mọi bằng chứng tích hợp cũ hết hiệu lực. Và mọi RPC devnet thay thế (Ankr, Helius, Alchemy) đều **đòi API key** |

Tôi cũng không đụng `C:\Windows\System32\drivers\etc\hosts` — nằm ngoài repo.

### 1.3 · Trạng thái artifact hỏng — KHÔNG hoàn nguyên nó

`data/tich-hop/ket-qua.json` đang ghi một lượt **hỏng thật**, và nó trung thực:

```
lastAttempt.dat             = false
lastAttempt.failureCategory = "timeout"
lastAttempt.loi             = "hạ tầng: timeout — lấy blockhash quá hạn sau 8000 ms"
lastAttempt.dirtyWorktree   = false
lastAttempt.dauVet          = 6baf5fabc6f966d5 / 121 file  ← ĐÚNG mã hiện tại
lastSuccessful              = lượt 12/09, GIỮ NGUYÊN
lichSuPass                  = 10 lượt, không bị xoá
```

Cổng đọc ra đúng: *"LƯỢT GẦN NHẤT HỎNG [timeout] — hạ tầng"*, phân biệt được với hỏng
phát hiện. `npm run check` vẫn **716/716 xanh**; 17/17 guard artifact xanh.

**Đừng `git checkout` file này để làm sạch cây.** Một lượt hỏng có ghi lý do là dữ
kiện; xoá nó đi thì lần sau không ai biết chuyện đã xảy ra. Hai đường hợp lệ: sửa DNS
rồi chạy lại, hoặc commit lượt hỏng kèm giải thích.

> Hằng số hạn ở `vi-du-tich-hop/src/chay.js:98` (`HAN_BLOCKHASH_MS`, 8000 ms). Lượt
> hỏng dừng ở 7985 ms — **sát hạn**. Đừng nới nó để "cho qua": lượt đó hỏng vì DNS
> không phân giải được, không phải vì RPC chậm 15 ms. Nới hạn là giấu triệu chứng.

---

## 2 · Thẻ còn mở — phân loại theo *ai* làm được

Nguồn: `docs/roadmap/TIEN-DO.md`. 40 thẻ · **28 DONE** · 5 TODO · 4 có điều kiện · 3 WAIT_INPUT.

### 2.1 · Codex làm được ngay

| Thẻ | Việc | Phụ thuộc |
|---|---|---|
| **TB-D02** | Pitch Technical và bộ câu hỏi phản biện | `D01, X03, I02` — **cả ba đã DONE** |

Đây là thẻ duy nhất đủ điều kiện. Thẻ đòi kể theo thứ tự: *vấn đề khi ký → ca khó →
pipeline → ranh giới tin cậy → bằng chứng B06 → kết quả/giới hạn → cách tích hợp*, và
soạn 11 câu phản biện (*vì sao không chỉ đọc instruction? · balance delta chưa đủ? ·
IDL biết gì? · ai chặn ký? · RPC nói sai? · simulation khác thực thi? · sao không có
contract? · AI đóng góp gì? · benchmark tự gắn nhãn? · chưa hỗ trợ gì? · advisory còn
lại xử lý sao?*).

**Nghiệm thu:** mỗi câu trỏ tới code/artifact **có thật** hoặc một giới hạn được thừa
nhận; có sơ đồ kiến trúc khớp implementation; **không** dành phần chính cho doanh
thu/market-size khi không có bằng chứng; deck và lời nói **không** tuyên bố tính năng
còn TODO.

**Cảnh báo:** `PITCH-VA-PHAN-BIEN.md` hiện viết cho track *Best Product & Business*
(4 phút, mạch kể thị trường). `claim.test.ts` neo **năm dòng** trong file này
(`NEO_DONG_BO` dòng 259-261 và hai chỗ số test). Sửa mạch kể mà gãy neo là `npm run
check` đỏ ngay. Thời lượng: thẻ nói *"dùng thời lượng được xác nhận ở nguồn BTC"* —
mà nguồn BTC trong repo **chưa xác nhận** vòng hiện tại (xem 2.4).

### 2.2 · Chặn bởi thẻ khác

| Thẻ | Chặn bởi | Ghi chú |
|---|---|---|
| **TB-V01** | thiếu **B07** trong `C01–C06, S01–S03, B01–B07, X01–X03, I01–I03, P01–P02, L01, D01` | và S02 **không tự thông được** — xem 2.3 |
| **TB-D03** | `D02, B07` | video demo |
| **TB-D04** | `V01, D03` | gói nộp |
| **TB-V02** | `D04` | chấm lại rubric |

**TB-V01 không đóng được bằng cách chờ.** `docs/NGHIEM-THU-V01.md` mục 3 ghi rõ: 5
advisory high **không cái nào có bản vá thượng nguồn** (`image-size` 2.0.2 và
`bigint-buffer` 1.1.5 mới nhất vẫn nằm trong dải bị ảnh hưởng). Muốn đóng V01 thì đó
là một **quyết định của người**: chấp nhận rủi ro đã ghi ở `docs/PHU-THUOC.md` và cho
V01 chạy trên phần còn lại. Đừng tự quyết thay.

### 2.3 · WAIT_INPUT — cần quyền hoặc cần người

| Thẻ | Cần gì |
|---|---|
| **TB-B07** | quyền chạm Devnet + DNS hoạt động. Thẻ đòi: mô phỏng giao dịch **chưa ký** trên hiện trường có sẵn, ca nguy hiểm/lành/khuyết dữ liệu/lỗi RPC có fault injection ghi nhãn. **Không truy mainnet.** `docs/BENCHMARK.md:107` ghi tầng `devnet-live`: **0/19 mẫu đã chạy** |
| **TB-H01** | chủ dự án xác nhận cách áp rubric và trạng thái đăng ký (form 24/08 vẫn là *Best Product & Business*) |
| **TB-H02** | quyền push/publish/deploy/nộp. **Phần remote CI của TB-I03 nằm ở đây** |

### 2.4 · Có điều kiện — CỐ Ý chưa làm, không phải bỏ sót

| Thẻ | Điều kiện mở |
|---|---|
| **TB-L02** | thử cải thiện AI có giả thuyết đo được. Không chặn Technical |
| **TB-O01** | chỉ khi replay RPC không đủ kiểm một bug semantics cụ thể |
| **TB-O02** | chỉ khi corpus chỉ ra một **họ** giao dịch thiếu semantics — không phải một sample khó |
| **TB-O03** | chỉ khi có rủi ro không xử lý được bằng nâng nhỏ. Migration `web3.js` thuộc đây, **không** nhập vào thẻ tối ưu |

**Đừng mở chúng để "làm cho đủ việc".** Mỗi thẻ có điều kiện viết sẵn; chưa thoả thì
chưa mở.

---

## 3 · Cổng nộp bài: 6/13 ô chưa đạt

`npm run nop-bai -- --strict`:

| Ô | Ai làm được | Lý do |
|---|---|---|
| Cây làm việc sạch | **máy** | 1 file bẩn — mục 1.3 |
| Ví dụ tích hợp chạy được | **máy** | lượt gần nhất hỏng [timeout] — mục 1.1 |
| Bằng chứng tích hợp thuộc đúng bản này | **máy** | cùng nguyên nhân |
| Video demo dự phòng | **người** | **thể lệ ghi là BẮT BUỘC**, chưa có file nào. Kịch bản đã soạn ở `docs/KICH-BAN-VIDEO.md` |
| Release tag cố định | **người** | chưa có tag |
| Lịch thi xác nhận đủ | **ngoài** | 4 câu chưa hỏi BTC |

Bốn câu chưa hỏi BTC (`docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md:61-64`):
mấy giờ và hình thức gì · thời lượng pitch và Q&A · deliverable bắt buộc gồm gì ·
chung kết 23/09 (UEF) hay 26/09 (SIHUB).

> Câu cuối là **mâu thuẫn có thật trong repo**: hai văn bản BTC nói hai ngày khác
> nhau. Đừng chọn bừa một cái.

**Ba ô cuối Codex cũng không làm được.** Ghi ra để đừng thử.

---

## 4 · Đã đo và CỐ Ý không làm — đừng "sửa" ngược lại

### 4.1 · Hiệu năng (`docs/HIEU-NANG.md` mục 5, `docs/NGAN-SACH-RPC.md` mục 7)

Bottleneck lớn nhất là **retry của RPC công cộng**: 11/30 lượt gọi >7 lần RPC, trung
vị **2875 ms** so với **852 ms** — chênh **3,4×**, Pearson **r = 0,84**. **Ngoài tay
đội.** Mọi thứ tối ưu được cộng lại vẫn nhỏ hơn dao động của một endpoint công cộng.

Đã cân nhắc và **không** làm, mỗi cái một lý do đo được:

- **cache** balances/authority/verdict — thẻ P02 cấm bằng đúng chữ
- **gộp hai lượt `getMultipleAccountsInfo` đầu** — không gộp được: lượt sau chỉ biết
  hỏi gì **sau** khi lượt trước và `simulateTransaction` trả về
- **`disableRetryOnRateLimit`** — sai hướng, làm sản phẩm kém chịu lỗi để đổi lấy số đẹp
- **lazy-load `@solana/web3.js`** (346 KB) — ví và trang phỏng vấn đều gọi `inspect()`
  thật nên lazy chỉ **dời** chi phí; trang số liệu đã không kéo nó
- **hạ `MAX_VI_TRA`/`HAN_LAM_GIAU_MS`** — ba chặng làm giàu đã có `Promise.all` + hạn
  2500 ms riêng, không nằm trên đường găng
- **`AbortSignal` xuống transport** — cần ADR và consumer test, chưa có

**Chưa đo được, và nói ra:** p95 của **tổng thể** (chỉ có `p95QuanSat` trên n=30, một
phiên một máy) · mạng bị bóp 3G/4G · thiết bị thật · trang phỏng vấn và trang số liệu.

### 4.2 · Phạm vi trình duyệt

Mọi số giao diện đo trên **Chromium headless 149.0.7827.55**, viewport giả lập.
**Chưa kiểm:** WebKit · Firefox · thiết bị thật · mạng bị bóp. Công bố đúng như vậy ở
`README.md`, `NGHIEM-THU-V01.md`, `ADR-0001`. Đừng nâng phạm vi mà không chạy thật.

### 4.3 · Số không được nói

`docs/BANG-CLAIM.md` giữ danh sách đầy đủ. Ba chỗ dễ sai nhất:

- **"0 cáo buộc" ≠ "0 báo nhầm" ≠ "0 gắn cờ"** — 7 giao dịch **đã** bị gắn cờ; chưa
  có ground truth nên **chưa đo được** tỉ lệ báo nhầm
- **"AI giúp người dùng hiểu hơn"** — chưa đo. Trên thước nêu-coverage, mô hình
  **ngang** câu mẫu (13–14/16 so 14/16), không hơn
- **p95 quan sát** ≠ p95 của người dùng. Hai phiên cách nhau một ngày cho 3874 và
  5359 ms — đuôi phân bố **không hứa được**

---

## 5 · Bài học từ phiên này — chúng sẽ lặp lại nếu không đọc

Năm lỗi dưới đây đều **của chính tôi**, và mỗi lỗi mất ít nhất một vòng sửa.

1. **Guard đỏ vì lý do SAI, hai lần.** `indexOf("<GioiHan")` bắt trúng khối đầu trong
   **sáu** khối của `SoLieu.tsx`; `/^  [a-z0-9-]+:$/` trên `deploy.yml` bắt trúng
   `  push:` trong khối `on:`. **Guard đỏ vì lý do sai nguy hiểm ngang guard không đỏ
   được** — người sửa sẽ chiều nó ở đúng chỗ nó chỉ, tức làm hỏng một chỗ vô can.

2. **Phép kiểm theo chuỗi không phân biệt "làm X" với "nói về X".** Bài cấm
   `npx --yes` đỏ vì chính **chú thích** giải thích tại sao đã bỏ `npx --yes`. Lọc
   dòng chú thích trước khi quét.

3. **`new Set(...)` làm trùng lặp tan biến.** Bảng trạng thái có **hai** dòng TB-X03
   nói hai trạng thái ngược nhau, guard vẫn xanh.

4. **Sửa một dòng có neo mà không tra ai neo nó** — làm `npm run so-lieu` ghi nửa vời.

5. **Chép số của lượt đo trước thay vì chạy lại.** Tôi suýt ghi "0/5 lệch" cho
   `so-baseline` dựa trên lượt chạy **trước** khi sửa `fetch.ts`.

**Quy tắc chung:** một guard chỉ tính là guard khi đã chứng minh **đỏ được** — sửa
đúng thứ nó canh rồi xem nó có đỏ không, và đỏ có gọi đúng tên không.

---

## 6 · Lệnh cần biết

```bash
npm run check                  # typecheck + 716 test
npm run so-lieu                # ĐO LẠI rồi mới đồng bộ tài liệu — đừng gọi lẻ
npm run nop-bai -- --strict    # cổng nộp bài, 13 ô
npm run replay-rpc             # replay offline, 19/29 fixture
npm run doi-khang              # 5 probe đối kháng, offline
npm run thu-tich-hop:deterministic   # 14 kiểm, fixture, không mạng
npm run thu-tich-hop:devnet    # CẦN MẠNG + DNS — đang hỏng, mục 1.1
```

**Thứ tự quan trọng:** `tao-so-lieu.ts` phải chạy **trước** `npm run check`. Ngược
lại thì guard đối chiếu tài liệu với số **cũ**, hai bên cùng cũ nên vẫn xanh — đó
chính là lỗi làm HEAD `780cf6d` đỏ 11 test mà không ai biết suốt ba ngày.

Guard `ciBaTang.test.ts` canh đúng thứ tự này trong `.github/workflows/deploy.yml`.

---

## 7 · Chưa push

11 commit đang chờ trên `main`. `CLAUDE.md` nói **người dùng tự push** — tôi không tự
chạy `git push`. Nếu chủ dự án đồng ý, `git push origin main` sẽ kích hoạt CI ba tầng
(`build` → `goi-sdk` → `deploy` lên GitHub Pages) và đó cũng là **run remote đầu tiên**
của cấu hình CI mới, tức phần remote của TB-I03.
