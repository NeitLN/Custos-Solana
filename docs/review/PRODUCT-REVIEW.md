# Product Review — hội đồng độc lập

**Commit được review:** `31a59d7cf13f9ce48b93c3e88b2cad02e989c172` · nhánh `main` · 24/08/2026 23:55 +07
**Ngày review:** 25/08/2026 · **Vòng:** 1 (read-only, chưa sửa production code)

> Review chạy **tuần tự theo vai**, không dùng subagent — người review đã có ngữ cảnh
> sâu về repo, và vai chạy lạnh sẽ phải dựng lại từ đầu. Ranh giới nhiệm vụ giữ nguyên:
> mỗi phát hiện ghi rõ vai phát hiện, và không vai nào tự duyệt bản vá của mình.

---

## 0 · Baseline

| Hạng mục | Kết quả |
|---|---|
| Branch / HEAD | `main` / `31a59d7` · working tree **sạch** · đồng bộ `origin/main` (0 ahead, 0 behind) |
| Node / npm | v24.12.0 / 11.6.2 |
| `npm ci` (cây làm việc) | **FAIL** — `EPERM`, OS khoá file |
| `npm ci` (checkout sạch) | **PASS** |
| `npm run typecheck` | PASS |
| `npm run test` | **242 pass · 0 fail** · 5,15 s |
| Build ví mẫu | PASS (1,45 s) |
| Build trang tấn công | PASS (1,70 s) |
| Secret scan `dist` | PASS — không thấy khoá riêng trong 14 file |
| `npm audit` | **8 lỗ hổng — 5 moderate, 3 high** |
| CI | xanh (`Deploy demo lên GitHub Pages`) |
| Demo công khai | `neitln.github.io/Custos-Solana` · 4 trang trả 200 |

**Về `npm ci` FAIL:** lỗi nguyên văn là *"The operation was rejected by your operating
system... the file was already in use"*. **Không phải lockfile lệch** — nguyên nhân là hai
server Vite đang chạy giữ `node_modules`. Đã xác minh bằng cách `git clone` sang thư mục
tạm và chạy lại: **PASS**. Baseline dùng cho toàn bộ review là checkout sạch đó.

> **Giả thuyết 8 trong đề bài — BÁC BỎ.** Lockfile đồng bộ, `npm ci` chạy được trên
> checkout sạch.

---

## 1 · Truth matrix — Vai 1

Nguồn quyết định cho từng loại thông tin, và chỗ đang lệch:

| Thông tin | Nguồn quyết định | Giá trị đúng | Chỗ đang nói sai |
|---|---|---|---|
| Số test | `npm run test` | **242** | `README.md:27,84` → 188 · `CLAUDE.md:29` → 188 · `packages/core/README.md:240` → **138** · `docs/bao-mat/REMEDIATION-REPORT.md:200` → 188 |
| Coverage | `data/seed/cohort-ket-qua.json` | **77 %** (12 mẫu đo được / 20 cohort) | `README.md:89` → 46 % · `CLAUDE.md:34,40` → 46 % |
| Chạm tài sản | cùng file | **28/38 = 74 %** | `CLAUDE.md:41` → 21 % |
| Số luật | `packages/core/src/l2/rules.ts` | **14** | `CLAUDE.md:18` (mô tả `DAC-TA-CORE.md`) → 12 luật |
| Deck | `docs/nop-bai/CUSTOS-PITCH.pptx` | **đã có** | `CLAUDE.md:33` → *"Chưa có: deck"* |
| Chạy mô hình thật | `docs/bao-mat/DANH-GIA-claude-haiku-4-5-20251001-2026-08-22.md` | **đã chạy** | `CLAUDE.md:36` → *"chưa chạy với mô hình thật lần nào"* |
| Số liệu công khai | `apps/demo-wallet/public/so-lieu.json` (sinh tự động, CI dựng lại mỗi lần deploy) | 242 · 14 · 77 % · 28/38 | — |

**Nhận định:** tài liệu **nói thấp hơn thực tế**, không phải phóng đại. Nhưng đó vẫn là
lỗi, và nó đắt theo một cách riêng: giám khảo mở `README.md` thấy *46 % · 188 test*, mở
trang `/so-lieu.html` thấy *77 % · 242 test*. Chênh lệch đó đọc ra là cẩu thả, và tệ hơn
là **làm người đọc nghi ngờ luôn con số cao hơn**.

Hai file `docs/CHAM-DIEM-GIA-DINH.md` và `docs/ROADMAP-DIEM-SO.md` ghi 232 test / 80 %
coverage — chúng là **ảnh chụp có ghi ngày** của một vòng review trước, nên không tính
là mâu thuẫn, nhưng nên đánh dấu rõ là số liệu tại thời điểm đó.

---

## 2 · Bảo mật ví Solana — Vai 2

Chế độ chỉ đọc. Đã đối chiếu từng hạng mục trong danh sách yêu cầu:

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Mô phỏng thất bại | ✅ fail-safe 1 + mã `MO_PHONG_HONG` | `evaluate.ts:42-46` · test `failsafe.test.ts` |
| `accounts: null` | ✅ không bịa mất mát | test `do-khuyet.test.ts:106` |
| Account thứ 101+ | ✅ fail-safe 4 + `TRANG_THAI_DO_KHUYET` | `evaluate.ts:81-84` · test `do-khuyet.test.ts:64` |
| ALT không giải được | ✅ luật 10 → `ALT_KHONG_GIAI_DUOC` | `rules.ts:425-439` |
| ALT tồn tại (lành) | ✅ **không** gắn cờ | `rules.ts:406-417` — ghi rõ 7/10 mẫu mainnet dùng ALT và cả 7 đều lành |
| Wrapped SOL | ✅ gộp vào tổng SOL | `sol.ts:39-60` |
| Rent / đặt cọc | ✅ trừ khỏi ngưỡng, **có kiểm chủ sở hữu** | `sol.ts:77-87` |
| Permanent Delegate tồn tại | ✅ chỉ cảnh báo khi mint có liên quan tới giao dịch | `rules.ts:162` |
| Permanent Delegate **ra tay** | ✅ nâng Đỏ khi authority khớp | `rules.ts:182-192` |
| Transfer Hook | ✅ chỉ gắn cờ khi hook program **chưa xác minh** | `rules.ts:357-365` |
| Program owner đổi | ✅ luật 12 → Đỏ | `rules.ts:114-133` |
| Multi-signer / fee payer khác người dùng | ✅ luật 14 → `NGUOI_DUNG_KHONG_RO` | `rules.ts` luật 14 |
| `expectedAction` hạ verdict | ✅ **không thể** — chỉ sinh `loiKhaiLech`, không chạm `level` | `inspect.ts:69-88` |
| AI sinh/sửa `level` | ✅ **không thể** — `level: l2.level` | `inspect.ts:81` |
| Trả `safe` khi dữ liệu khuyết | ✅ bốn fail-safe chặn | `evaluate.ts:42-84` |
| **Mọi cảnh báo có mã lý do** | ❌ **VI PHẠM — tái hiện được** | xem `R2-01` |

### R2-01 — Cảnh báo không có mã lý do

```text
ID:                R2-01
Reviewer:          Vai 2 — Independent Solana Wallet Security Auditor
Category:          Fail-safe / contract invariant
Severity:          High
Status:            CONFIRMED (tái hiện bằng probe đọc-thuần)
Affected files:    packages/core/src/l2/evaluate.ts:36-38, 63-66
                   packages/core/src/l2/rules.ts:229 (luật 9, bộ lọc `p !== ""`)
                   packages/core/src/l1/fetch.ts:232 (nguồn sinh programId rỗng)
                   apps/demo-wallet/src/CanhBao.tsx:48-53 (hệ quả giao diện)
```

**Bằng chứng.** `evaluate.ts:36-38` tự phát biểu nguyên tắc:

> *"Một cảnh báo không có mã là cảnh báo mà giao diện không giải thích được và bên tích
> hợp không phân loại được — xem SECURITY-AUDIT.md mục A2."*

Rồi fail-safe 2 (dòng 63-66) nâng `level` lên `warning` mà **không** đẩy mã nào. Bình
thường luật 9 bù mã `PROGRAM_CHUA_XAC_MINH` — nhưng luật 9 lọc `p !== ""`.

**Tái hiện.** Probe dựng `Facts` với một inner instruction `programId: ""`,
`decoded: null`, `chamTaiSanNguoiKy: true`, không có ALT chưa giải:

```
level       : warning
reasonCodes : []
```

`programId` rỗng sinh ra thật ở `fetch.ts:232` — `pd.programId?.toBase58?.() ?? ""` —
khi RPC trả inner instruction thiếu `programId`.

**Hành vi quan sát được.** Verdict `warning`, không mã lý do.

**Hành vi mong đợi.** Mọi lần nâng verdict đều kèm mã truy được về nguyên nhân. Ca này
nên có mã riêng, ví dụ `CHUONG_TRINH_KHONG_RO`, vì nó **khác** `PROGRAM_CHUA_XAC_MINH`:
ở đây không phải "chưa đọc hiểu chương trình" mà là **"không biết đó là chương trình gì"**.

**Ảnh hưởng — có hai vế, và vế thứ hai YẾU HƠN đánh giá ban đầu của tôi.**

*Vế chính (đúng, và là lý do xếp High):* hợp đồng công khai vỡ. Ví tích hợp nhận
`level: "warning"` với `reasonCodes: []` thì **không phân loại, không ghi log, không dịch
sang ngôn ngữ khác được**. `reasonCodes` tồn tại chính để làm việc đó, và tài liệu tích
hợp bán nó là "mã ổn định để ví tự phân loại".

*Vế phụ (tôi đã đánh giá quá nặng ở bản nháp):* `CanhBao.tsx:48-53` chuyển sang trạng
thái êm *"Chưa đọc hiểu hết"*. Nhưng khi soi kỹ `MA_THONG_TIN` mới thấy đội **cố ý** xếp
`PROGRAM_CHUA_XAC_MINH` — ca gần như y hệt — vào nhóm thông tin, có lý do đo được ghi tại
`constants.ts:75-78`: nó kích hoạt 11/12 giao dịch mainnet, báo động cho nó thì Custos kêu
ở mọi giao dịch. Vậy giọng êm ở ca này là **nhất quán với một quyết định có bằng chứng**,
không phải sơ suất. Hạ vế này xuống mức quan sát.

**Rủi ro kề cận.** Cùng điều kiện cũng làm hỏng bộ đếm `warningKhongLyDo` trong
`scripts/do-cohort.ts` — nó đang báo 0 vì cohort hiện tại không có ca này, nên phép đo
không phát hiện ra lỗ hổng.

**Test cần có.** (a) unit: `danhGia` với Facts như probe ⇒ `reasonCodes.length > 0`;
(b) bất biến: với mọi tổ hợp Facts sinh `level !== "safe"`, `reasonCodes` không rỗng;
(c) UI: `chiLaChuaHieu` **không** bật khi có lệnh chạm tài sản mà không nhận dạng được.

**Acceptance criteria.** Probe trên trả về ít nhất một mã; `npm run check` xanh; cohort
đo lại không đổi coverage.

---

## 3 · Decoder và nguồn — Vai 3

| Kiểm | Kết quả |
|---|---|
| Bảng SPL Token | ✅ **sinh từ enum** `TokenInstruction` của `@solana/spl-token`, không gõ tay — `l1/decode.ts` |
| IDL Anchor | ✅ đọc **on-chain**, script `scripts/lay-idl-onchain.ts` → `l1/bang-idl.ts` (7 chương trình) |
| Discriminator | ✅ tính `sha256("global:<tên>")[0..8]`, không đoán |
| Mọi chương trình đã xác minh đều có decoder | ✅ có test cưỡng chế (`SO_LENH_DOC_DUOC`) |
| Đo coverage cùng cohort trước–sau | ✅ kỷ luật ghi ở `SEED-DATASET.md` §0b3 |

**Không tìm thấy discriminator hay semantics nào đoán mò.** Đây là phần mạnh nhất của repo.

---

## 4 · Tích hợp SDK — Vai 4

Đóng vai một đội ví chưa từng biết Custos. **Đây là phần có phát hiện nặng nhất.**

### R4-01 — Không cài được từ ngoài repo

```text
ID:                R4-01
Reviewer:          Vai 4 — Wallet/dApp SDK Integration Engineer
Category:          Packaging / distribution
Severity:          Critical (đối với tuyên bố SDK; không phải lỗi bảo mật)
Status:            CONFIRMED
Affected files:    packages/core/package.json · packages/ai/package.json
                   packages/types/package.json · packages/core/README.md:11-25
```

**Tái hiện.**

```bash
mkdir vi-thu && cd vi-thu && npm init -y
npm install @custos/core
# npm error code E404 — 404 Not Found - GET https://registry.npmjs.org/@custos%2fcore

npm install --install-links file:<repo>/packages/core
# npm error 404  '@custos/types@*' could not be found
```

**Root cause — ĐÃ SỬA LẠI sau khi test tái hiện bác bỏ giả thuyết đầu.**

> Vòng đầu tôi ghi root cause là *"`@custos/types@*` chưa publish nên E404"*. **Sai.**
> Test tái hiện cho thấy `npm pack` cả ba gói rồi cài **cùng một lượt** thì npm giải
> được `@custos/types@*` từ tarball đồng cấp — 77 gói, không lỗi. E404 ban đầu chỉ vì
> tôi cài **mỗi** `@custos/core`. Ghi lại đây thay vì sửa lặng lẽ: đó chính là lỗi
> "kết luận trước khi tái hiện" mà quy trình review này sinh ra để chặn.

Root cause thật:

```
ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING
```

`main`/`exports` trỏ thẳng vào `./src/index.ts`, và **Node từ chối bóc kiểu TypeScript
cho file nằm trong `node_modules`** — kể cả khi bật `--experimental-strip-types`. Đây là
giới hạn của Node, không phải cấu hình sai. Không runtime nào tiêu thụ được gói này.

Phụ: version `0.0.0`, `private: true`, không `files`, không bước build.

**Ảnh hưởng.** `packages/core/README.md` mở đầu bằng đoạn `import { inspect } from
"@custos/core"` và **không có bước cài đặt nào**. Một đội ví làm đúng tài liệu sẽ dừng ở
dòng lệnh đầu tiên. Kết luận bắt buộc của vai này:

> **Chưa đạt technical pilot.** Không phải "chưa production" — mà là **bên thứ ba hiện
> không tích hợp được bằng bất kỳ đường nào ngoài việc làm việc bên trong monorepo**.

Điều này va thẳng vào slide 5 của deck (*"Chi phí tích hợp: một lần gọi"*) và vào câu
hỏi giám khảo *"SDK có được tích hợp thật chưa?"*.

### R4-02 — `nguoiDung` nằm ở dòng 200/249

```text
ID:        R4-02      Severity: High      Status: CONFIRMED
Affected:  packages/core/README.md:11-25 (quick-start), :200 (chỗ duy nhất nhắc)
```

Đoạn quick-start truyền đúng `{ locale: "vi" }`. `nguoiDung` xuất hiện **một lần duy
nhất**, ở dòng 200 trên tổng 249, kèm chú thích nhạt *"← nên truyền"*.

Không truyền `nguoiDung` thì Custos bảo vệ **fee payer**. Trong một dApp trả phí hộ,
fee payer là **dApp**, không phải người dùng — nghĩa là toàn bộ bảng chênh lệch và luật
13 đang tính trên ví sai. Luật 14 có bắt ca nhiều người ký, nhưng tài liệu không nói
điều đó ở chỗ người ta copy code.

### R4-03 — Hợp đồng công khai lệch tài liệu

```text
ID:        R4-03      Severity: Medium    Status: CONFIRMED
Affected:  packages/core/README.md:31-42  vs  packages/types/src/index.ts:29-47
```

`DiffEntry` thật có thêm `truocDayDu?` và `sauDayDu?` (địa chỉ đầy đủ — lớp chống địa chỉ
vanity giả mạo). README **không nhắc**. Bên tích hợp đọc README sẽ không biết hai trường
đó tồn tại, tức bỏ luôn lớp phòng thủ đó.

### R4-04 — README còn con số đã bị gỡ

```text
ID:        R4-04      Severity: Low       Status: CONFIRMED
Affected:  packages/core/README.md:49  — ví dụ "đã đọc hiểu 10/11 lệnh"
```

`10/11` đã bị gỡ khỏi `CUSTOS.md` và `PITCH-VA-PHAN-BIEN.md` ngày 23/08 vì giao dịch demo
thật ra là **2/3**. `packages/core/README.md` còn sót.

---

## 5 · QA và test — Vai 5

| Kiểm | Kết quả |
|---|---|
| 242 test, 0 fail, chạy offline | ✅ |
| Test đi qua đường sản xuất | ✅ — `do-token-mo-hinh.ts` cố ý đi qua `dienGiaiBangMoHinh` thay vì tự dựng payload |
| Fixture đại diện hành vi tuyên bố | ✅ — `e2e-tan-cong.test.ts` dựng giao dịch tấn công thật |
| Ca chặn (không chỉ ca thuận) | ✅ — có test "đổi chủ mà KHÔNG chuyển tiền thì không hiện 500→0" |
| Test bất biến | ✅ — nhãn không được là tiền tố của nhãn khác |
| **Bất biến "mọi cảnh báo có mã"** | ❌ **thiếu** — chính là lỗ hổng R2-01 lọt qua |

**Khoảng trống lớn nhất:** bộ test có test cho *từng* fail-safe, nhưng **không có test bất
biến bao trùm** kiểu *"với mọi Facts, `level !== safe` ⇒ `reasonCodes` không rỗng"*. Đó là
lý do R2-01 tồn tại mà 242 test vẫn xanh.

---

## 6 · Reliability và hiệu năng — Vai 6

| Chỉ số | Giá trị |
|---|---|
| Lượt gọi RPC mỗi `inspect()` | **trung vị 6,5 · thấp 4 · cao 9** — đo trên 20 giao dịch mainnet |
| Latency p50 / p95 | **CHƯA ĐO** |
| Thời hạn làm giàu dữ liệu | 2 500 ms (`fetch.ts:21`) |
| Trần ví tra tuổi | 3 (`MAX_VI_TRA`) |
| Trần token đầu ra mô hình | 400 |
| Fallback không mô hình | ✅ `dienGiaiKhongAI` |
| Fallback mô phỏng hỏng | ✅ fail-safe 1 |
| Video dự phòng | ⏸ chưa quay |

**Vì sao latency ghi CHƯA ĐO:** endpoint công khai `api.mainnet-beta.solana.com` trả `429`
liên tục trong lúc đo chi phí — con số latency lấy từ đó sẽ nói về hạn mức của endpoint
công cộng chứ không nói về sản phẩm. Cần RPC key riêng mới đo có nghĩa. **Không tự điền.**

### R6-01 — Phụ thuộc có lỗ hổng đã biết

```text
ID:        R6-01      Severity: Medium    Status: CONFIRMED
Bằng chứng: npm audit trên checkout sạch → 8 lỗ hổng (5 moderate, 3 high)
Gói:        bigint-buffer, @solana/web3.js, @solana/spl-token, jayson, uuid, …
```

Một **sản phẩm bảo mật** xuất xưởng kèm 3 lỗ hổng high trong cây phụ thuộc là câu hỏi
giám khảo có thể hỏi và đội chưa có câu trả lời. Phần lớn nằm trong nhánh
`@solana/web3.js` v1 nên không sửa được bằng `npm audit fix` mà không lên v2.

---

## 7 · Dữ liệu và phép đo — Vai 7

| Kiểm | Kết quả |
|---|---|
| Cohort cố định, tái sử dụng | ✅ `data/seed/cohort-audit.json`, 20 chữ ký |
| Đếm và báo mẫu rụng | ✅ — hiện **8/20 rụng**, trang số liệu nói rõ |
| Không đổi mẫu số giữa hai lần đo | ✅ — kỷ luật ghi ở `SEED-DATASET.md` §0b3 |
| Tách mainnet khỏi synthetic | ✅ — con số báo nhầm chỉ đo trên mainnet |
| Số liệu công khai sinh tự động | ✅ — `tao-so-lieu.ts`, CI dựng lại mỗi lần deploy |
| Ground truth cho mẫu mainnet | ❌ **không có** |

### R7-01 — "Cáo buộc sai" ngụ ý ground truth chưa có

```text
ID:        R7-01      Severity: Medium    Status: CONFIRMED
Affected:  apps/demo-wallet/src/SoLieu.tsx (nhãn "cáo buộc sai")
           docs/nop-bai/CUSTOS-PITCH.pptx slide 9
           scripts/do-cohort.ts (biến `caoBuoc`)
```

`caoBuoc` đếm số mẫu có mã lý do mang tính cáo buộc. Gọi nó là **"cáo buộc sai"** ngầm
khẳng định 12 giao dịch đó **lành** — mà điều đó chưa được kiểm chứng, chỉ được giả định
vì chúng là giao dịch SPL mainnet lấy ngẫu nhiên.

Đúng ra phải nói: **"0 giao dịch bị gắn cờ trên 12 giao dịch mainnet ngẫu nhiên"**, và
nếu muốn nói mạnh hơn thì phải kiểm từng mẫu một để có ground truth.

Vi phạm trực tiếp nguyên tắc II.11 của chính đề bài review.

---

## 8 · Nghiên cứu người dùng — Vai 8

**Trạng thái: BLOCKED — không thể thực hiện trong vòng review này.**

Vai này đòi phỏng vấn người Việt thật ở bốn nhóm kinh nghiệm. Người review không có
người tham gia thật, và nguyên tắc II.8 cấm tạo dữ liệu người dùng giả.

Repo đã ghi đúng trạng thái ở `docs/ket-qua-phong-van.md`: **chưa phỏng vấn ai**. Công cụ
đo (`/phong-van.html`) và giao thức (`docs/GIAO-THUC-PHONG-VAN.md`) đã sẵn sàng.

> **Lịch sử đáng ghi:** repo từng nhận hai lần dữ liệu phỏng vấn do AI sinh và **đã từ
> chối đưa vào hồ sơ** cả hai lần. Đó là dấu hiệu tốt về kỷ luật dữ liệu.

**Con số duy nhất được nói trên sân khấu về mục này: không có.**

---

## 9 · Thiết kế và chữ tiếng Việt — Vai 9

| Kiểm | Kết quả |
|---|---|
| Bốn trạng thái phân biệt được | ✅ Bình thường / Chưa đọc hiểu hết / Cần xem kỹ / Nguy hiểm |
| Bảng trước → sau có nhãn cột | ✅ thêm 24/08 |
| Coverage bị hiểu thành điểm an toàn | ✅ đã có câu chặn *"Đây là mức đọc hiểu, không phải mức an toàn"* |
| AI bị hiểu là bên quyết verdict | ✅ đã có câu chặn dưới dòng `aiAdvisory` |
| Ba mức diễn đạt | ✅ Ngắn (mặc định) · Đầy đủ (bấm) · Kỹ thuật (bấm) |
| Địa chỉ đầy đủ | ✅ ở mức Kỹ thuật |
| **Trạng thái êm nhất bị dùng sai** | ❌ hệ quả của R2-01 |
| Chống mệt mỏi cảnh báo | ✅ fail-safe 2 có vế "chạm tài sản", có ghi lý do đo được |

Không phát hiện thêm vấn đề thiết kế nào ngoài hệ quả giao diện của R2-01.

---

## 10 · AI safety — Vai 10

| Ràng buộc | Kết quả | Bằng chứng |
|---|---|---|
| AI không sinh/sửa `level` | ✅ | `inspect.ts:81` — `level: l2.level` |
| AI chỉ trả `aiAdvisory` | ✅ | hợp đồng `InspectResult` |
| AI không nhận transaction thô | ✅ | payload whitelist trong `moHinh.ts` |
| Chặn câu trấn an | ✅ | `CHU_CAM` trong `moHinh.ts` |
| Chống prompt injection từ tên token | ✅ | `kyHieuAnToan` + `KY_HIEU_HOP_LE` regex |
| Fallback khi mô hình hỏng | ✅ | `boiThoiHan` + `dienGiaiKhongAI` |
| Trần token đầu ra | ✅ | 400 |
| Test đối kháng | ✅ | có |
| Live-model smoke test | ✅ **đã chạy** | `docs/bao-mat/DANH-GIA-claude-haiku-4-5-20251001-2026-08-22.md` |
| Đo token thật | ⏸ `BLOCKED_BY_SECRET` | `scripts/do-token-mo-hinh.ts` in "CHƯA ĐO" khi không có khoá |

**Không tìm thấy đường nào AI chạm được vào `level`.** Đây là ràng buộc quan trọng nhất
của sản phẩm và nó được cưỡng chế đúng chỗ — ở kiểu dữ liệu, không phải ở lời hứa.

---

## 11 · Kinh doanh B2B — Vai 11

| Hạng mục | Trạng thái |
|---|---|
| Người dùng cuối / người trả tiền tách bạch | ✅ `CUSTOS.md` mục 02 |
| Chi phí biên đo được | ✅ 6,5 lượt RPC trung vị + trần 400 token |
| Neo giá công khai | ✅ Helius/QuickNode $49, có link, ghi rõ **không phải validation** |
| Trình tự GTM | ✅ ba giai đoạn |
| Trả lời build-vs-buy | ✅ `PITCH-VA-PHAN-BIEN.md` mục 4b câu 10 |
| **Outreach** | ❌ **0/10–15** |
| **Phản hồi thật** | ❌ **0/3–5** |
| **Bên đồng ý xem SDK / pilot** | ❌ **0** |
| Giá bán của Custos | ❌ chưa có |
| Biên lợi nhuận | ❌ chưa tính được (thiếu 3 dữ kiện, ghi rõ ở `DON-VI-KINH-TE.md`) |

**R11-01 [High cho ô kinh doanh]:** `R4-01` làm hỏng luôn con đường pilot. Kể cả khi một
ví trả lời *"cho bọn tôi xem SDK"*, hôm nay **không có gì để gửi** ngoài một link repo và
lời hướng dẫn tự chạy trong monorepo. Nghĩa là mục tiêu tối thiểu của vai này bị chặn bởi
một vấn đề đóng gói, không phải bởi thiếu thời gian đi hỏi.

---

## 12 · Chấm như giám khảo — Vai 12

| Tiêu chí | Điểm /10 | Ghi chú |
|---|---:|---|
| Problem | 8,0 | Nỗi đau hiểu tức thì, khách hàng thu hẹp đúng |
| Product clarity | 8,0 | Ba mức diễn đạt, hợp đồng rõ |
| AI × Web3 fit | 8,5 | Ranh giới AI/luật là điểm mạnh thật |
| Technical depth | 8,5 | State diff, IDL on-chain, Token-2022 |
| Security credibility | 7,0 | Fail-safe tốt, nhưng R2-01 là lỗ hổng trong chính bất biến đội tự đặt |
| Demo quality | 7,5 | Chạy thật, hai nhịp; giao dịch demo 3 lệnh đơn giản hơn câu chuyện |
| Business model | 5,5 | Có khung, **0 outreach** |
| Traction | 3,0 | 0 người dùng, 0 pilot, 0 LOI |
| Differentiation | 8,0 | Dòng coverage là ý tưởng mạnh và không ai làm |
| Team execution | 8,5 | Kỷ luật đo lường và từ chối dữ liệu giả — hiếm |
| Honesty about limitations | **9,0** | Tự nói ra chỗ thiếu ngay trên slide 9 |

**Chín câu hỏi bắt buộc — trạng thái:**

| Câu | Có câu trả lời? |
|---|---|
| AI có gì hơn template? | ✅ `PITCH` mục 3 câu 2 |
| Ví đã có simulation, cần Custos làm gì? | ✅ mục 3 câu 1 |
| Coverage thấp thì bảo vệ kiểu gì? | ✅ mục 4b câu 11 |
| Ai trả tiền? | ✅ mục 3 câu 5 |
| Tại sao không dùng Blowfish/Blockaid? | ⚠️ **có Blowfish, chưa có Blockaid** |
| False positive bao nhiêu? | ⚠️ có số, nhưng cách gọi tên sai — xem R7-01 |
| Nếu AI sai thì sao? | ✅ mục 3 câu 3 |
| **SDK có được tích hợp thật chưa?** | ❌ **và R4-01 làm câu trả lời tệ hơn đội tưởng** |
| Sản phẩm đã chạy production chưa? | ✅ README ghi devnet-only |

---

## Bảng ưu tiên

| ID | Vai | Severity | Ảnh hưởng | Effort | Priority | Owner |
|---|---|---|---|---|---|---|
| R4-01 | 4 | Critical (SDK claim) | Bên thứ ba không tích hợp được bằng đường nào | M | **P0** | A |
| R2-01 | 2 | High | Chương trình không nhận dạng chạm tài sản → hiện ở trạng thái êm nhất | S | **P0** | A |
| R1-01 | 1 | High | README/CLAUDE nói thấp hơn thực tế; mâu thuẫn với trang số liệu | S | **P0** | A |
| R4-02 | 4 | High | Copy quick-start ⇒ bảo vệ nhầm ví khi dApp trả phí hộ | S | **P0** | A |
| R7-01 | 7 | Medium | "Cáo buộc sai" ngụ ý ground truth chưa có | S | **P0** | A/D |
| R4-03 | 4 | Medium | Bên tích hợp bỏ lỡ lớp chống địa chỉ giả mạo | S | P1 | A |
| R6-01 | 6 | Medium | 3 lỗ hổng high trong cây phụ thuộc | M | P1 | A |
| R1-02 | 1 | Medium | `DAC-TA-CORE.md` ghi 12 luật, thật 14 | S | P1 | A |
| R4-04 | 4 | Low | README còn "10/11" | XS | P1 | A |
| R11-01 | 11 | High (ô KD) | Không có gì để gửi khi ví hỏi xem SDK | — | phụ thuộc R4-01 | D |
| R12-01 | 12 | Low | Thiếu câu trả lời về Blockaid | XS | P1 | D |

---

## Kết luận vòng 1

**Trạng thái: chưa kết luận — cần PHASE 3 và re-review.**

Sản phẩm mạnh hơn tài liệu của chính nó ở phần kỹ thuật, và yếu hơn tuyên bố của chính nó
ở phần đóng gói. Hai phát hiện P0 nặng nhất — `R4-01` và `R2-01` — đều **không phải lỗi
thuật toán**: một là gói npm chưa publish được, một là một dòng `if` thiếu mã lý do. Cả
hai đều sửa được trong phạm vi hackathon.
