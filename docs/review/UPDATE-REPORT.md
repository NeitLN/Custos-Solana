# Update Report — vòng review độc lập

**Commit được review:** `31a59d7` · nhánh `main`
**Ngày:** 25/08/2026 · **Phạm vi:** PHASE 0 → 4, chỉ các mục **P0**
**Trạng thái commit:** ⚠️ **chưa commit, chưa push** — theo yêu cầu. Thay đổi nằm trong
cây làm việc, chờ người dùng tự duyệt và tự commit.

---

## 1 · Kết luận

# `PASS WITH KNOWN LIMITATIONS`

Năm mục P0 đã xong và qua re-review độc lập. Ba giới hạn còn lại **không sửa được bằng
code** — chúng cần khoá API, người thật, và một quyết định của vai B.

---

## 2 · Điểm theo vai

| Vai | Điểm /10 | Kết luận ngắn | Blocker |
|---|---:|---|---|
| 1 · Product Truth & Scope | 8,5 | Truth matrix dựng xong; 5 con số lệch đã đồng bộ | — |
| 2 · Wallet Security Auditor | 8,5 | 15/16 hạng mục đạt từ đầu; lỗ hổng duy nhất đã vá và re-audit sạch | — |
| 3 · Protocol Integration | 9,0 | Không tìm thấy discriminator hay semantics đoán mò. Phần mạnh nhất repo | — |
| 4 · SDK Integration | 8,0 *(từ 2,0)* | Trước: bên thứ ba **không** tích hợp được. Sau: project trống chạy `inspect()` bằng `node` thường | — |
| 5 · QA & Adversarial | 8,0 | Bộ test tốt nhưng thiếu test **bất biến bao trùm** — đã bổ sung | — |
| 6 · RPC Reliability | 6,5 | Chi phí đo được; **latency chưa đo** | cần RPC key riêng |
| 7 · Evaluation & Data | 8,0 | Kỷ luật cohort tốt; đã sửa cách gọi tên con số | cohort đang rụng mẫu |
| 8 · UX Research | **CHƯA ĐO** | Không thực hiện được — cấm tạo dữ liệu người dùng giả | cần người thật |
| 9 · Design & VN Writing | 8,5 | Bốn trạng thái phân biệt được, có câu chặn hiểu nhầm coverage và AI | — |
| 10 · AI Safety | 9,0 | Không có đường nào AI chạm `level`. Cưỡng chế ở kiểu dữ liệu | token thật `BLOCKED_BY_SECRET` |
| 11 · B2B & GTM | 5,0 | Khung đủ, **0 outreach / 0 pilot / 0 LOI** | phụ thuộc người dùng |
| 12 · Hackathon Judge | 7,5 | Trung thực về giới hạn là điểm mạnh nhất; traction là điểm yếu nhất | — |

---

## 3 · Bảng finding

| ID | Finding | Trước | Sau | Test / bằng chứng | Trạng thái |
|---|---|---|---|---|---|
| **R4-01** | SDK không tích hợp được từ ngoài repo | `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` | project trống chạy `inspect()`, `node` thường không cờ | `scripts/dong-goi-sdk.mjs` + log tái hiện §5 | **PASS** |
| **R2-01** | Cảnh báo không có mã lý do | `level: warning`, `reasonCodes: []` | `reasonCodes: ["CHUONG_TRINH_KHONG_RO"]` | `packages/core/test/ma-ly-do.test.ts` — 3 test, có test **bất biến bao trùm** | **PASS** |
| **R1-01** | README/CLAUDE nói thấp hơn thực tế | 188/138 test · 46 % · "chưa có deck" · "chưa chạy mô hình" | 245 test · deck đã có · mô hình đã chạy, có biên bản | `grep` sạch | **PASS** |
| **R4-02** | `nguoiDung` ở dòng 200/249 | quick-start bỏ qua | có trong quick-start + khối ⚠️ giải thích hậu quả | `readme.test.ts` vẫn xanh | **PASS** |
| **R7-01** | "Cáo buộc sai" ngụ ý ground truth | "0 cáo buộc sai" | "0 **giao dịch bị gắn cờ**" + câu thú nhận chưa kiểm chứng | trang số liệu + deck slide 9 sinh lại | **PASS** |
| **R4-03** | Hợp đồng công khai lệch tài liệu | thiếu `truocDayDu`/`sauDayDu` | đã bổ sung kèm lý do bảo mật | README khớp `types/src/index.ts` | **PASS** (kéo lên từ P1) |
| **R4-04** | README còn "10/11" | còn | đã đổi thành "2 trên 3" | `grep -c "10/11"` = 0 | **PASS** (kéo lên từ P1) |
| R6-01 | 8 lỗ hổng phụ thuộc (3 high) | — | — | `npm audit` 25/08 | **KNOWN LIMITATION** |
| R1-02 | `DAC-TA-CORE.md` ghi 12 luật | — | ghi rõ "đặc tả 12, đã thực thi 14" | `CLAUDE.md` | **PASS** |
| R11-01 | Không có gì để gửi khi ví hỏi xem SDK | — | **đã tháo chặn** bởi R4-01 | — | **UNBLOCKED** |
| R12-01 | Thiếu câu trả lời về Blockaid | — | — | — | **TODO** (P1, vai D) |

### Hai lần tôi tự sửa kết luận của chính mình

Ghi lại thay vì sửa lặng lẽ — đây là điều quy trình review sinh ra để bắt:

1. **R4-01 root cause sai ở vòng đầu.** Tôi kết luận *"E404 vì `@custos-solana/types` chưa
   publish"*. Test tái hiện bác bỏ: pack cả ba gói rồi cài **cùng một lượt** thì npm giải
   được — 77 gói, sạch. Root cause thật là Node không bóc kiểu TS trong `node_modules`.
2. **R2-01 severity vế giao diện đánh giá quá nặng.** Tôi viết "trạng thái êm nhất sản
   phẩm có" như một lỗi. Soi kỹ `constants.ts:75-78` thì thấy đội **cố ý** xếp ca gần như
   y hệt vào nhóm thông tin, kèm số đo (11/12 giao dịch mainnet kích hoạt). Đã hạ vế đó
   xuống mức quan sát; vế "hợp đồng vỡ" vẫn giữ High.

---

## 4 · Số liệu

| | Trước | Sau |
|---|---|---|
| Test | 242 pass / 0 fail | **245 pass / 0 fail** |
| Typecheck | PASS | PASS |
| Build ví mẫu | PASS | PASS |
| Build trang tấn công | PASS | PASS |
| Secret scan | sạch (14 file) | sạch (14 file) |
| Tích hợp từ project trống | **FAIL** | **PASS** |
| Coverage (cohort cố định 22/08) | 77 % · 12/20 mẫu | **77 % · 12/20 mẫu — không đổi** |
| Chạm tài sản | 28/38 = 74 % | **28/38 = 74 % — không đổi** |
| Cảnh báo không mã lý do (cohort) | 0 | 0 |
| Lượt gọi RPC / `inspect()` | 6,5 trung vị (4–9), n=20 | không đo lại |
| Latency p50 / p95 | **CHƯA ĐO** | **CHƯA ĐO** |
| Phỏng vấn người thật | **0** | **0** |
| B2B outreach / pilot | **0 / 0** | **0 / 0** |
| Demo rehearsal | **CHƯA ĐO** | **CHƯA ĐO** |
| `npm audit` | 8 (5 mod, 3 high) | 8 (5 mod, 3 high) |

### Coverage — đo lại cùng cohort, và vì sao KHÔNG công bố con số mới

Chạy lại `do-cohort.ts` ngày 25/08 trên **đúng cohort cố định** cho ra:

```
25/08:  7/20 mẫu đo được   coverage 75 %   chạm tài sản 0/7    gắn cờ 0   không-mã 0
22/08: 12/20 mẫu đo được   coverage 77 %   chạm tài sản 28/38  gắn cờ 0   không-mã 0
```

**Đây là mẫu rụng, không phải hồi quy.** Mô phỏng phụ thuộc trạng thái chuỗi hiện tại, và
5 mẫu nữa đã quá cũ để mô phỏng. Hai lượt đo trên **hai tập mẫu sống sót khác nhau** nên
không so sánh trực tiếp được.

Tôi đã **khôi phục ảnh chụp 22/08** vào `data/seed/cohort-ket-qua.json` và không công bố
con số 7 mẫu. Lý do: nó **kém đại diện hơn**, không phải "đẹp hơn hay xấu hơn". Ghi cả hai
ở đây để người đọc tự đối chiếu.

> **Việc cần làm trước khi nộp (P1):** cohort đang rụng khoảng 5 mẫu mỗi 3 ngày. Đến
> 05/09 có thể còn dưới 5 mẫu. Cần **neo lại cohort mới** và **nói rõ là đã neo lại** —
> không được lặng lẽ đổi mẫu số.

---

## 5 · Bằng chứng tích hợp SDK — tái hiện được

```bash
# trong repo
node scripts/dong-goi-sdk.mjs goi-sdk

# project HOÀN TOÀN mới, ngoài monorepo
mkdir vi-thu && cd vi-thu && npm init -y
npm install ../Custos-Solana/goi-sdk/*.tgz @solana/web3.js@^1
node goi-that.mjs        # node THƯỜNG, không cờ nào
```

Kết quả:

```
level      : warning
coverage   : 1/1
reasonCodes: ["TRANG_THAI_DO_KHUYET"]
explanation: Giao dịch này chạm tới 2 tài khoản mà chúng tôi không đọc đư…

KẾT QUẢ: PASS — hợp đồng đủ trường, fail-safe giữ (không ra safe khi dữ liệu khuyết)
```

Đáng chú ý: fail-safe hoạt động đúng **ngay trong lần chạy đầu tiên của người ngoài** —
RPC giả trả `accounts: null`, và Custos không ra `safe`.

---

## 6 · File đã thay đổi

| File | Lý do |
|---|---|
| `packages/{types,core,ai}/package.json` | R4-01 — version 0.1.0, `files`, script `build`, `publishConfig`. **`exports` trong repo giữ nguyên `.ts`** để không vỡ luồng dev |
| `packages/{types,core,ai}/tsconfig.build.json` | *(mới)* R4-01 — cấu hình emit `.js` + `.d.ts`, `rewriteRelativeImportExtensions` |
| `scripts/dong-goi-sdk.mjs` | *(mới)* R4-01 — đóng gói qua thư mục dàn. `publishConfig` **không** được npm áp lúc `npm pack`, đã kiểm |
| `.gitignore` | R4-01 — bỏ qua `packages/*/dist/` |
| `packages/core/src/l2/evaluate.ts` | R2-01 — phát `CHUONG_TRINH_KHONG_RO` ở fail-safe 2 |
| `packages/core/src/constants.ts` | R2-01 — thêm mã, xếp vào `MA_THONG_TIN` cho nhất quán với `PROGRAM_CHUA_XAC_MINH` |
| `packages/ai/src/templates.ts` | R2-01 — câu tiếng Việt cho mã mới (**test có sẵn của repo bắt được bản vá thiếu này**) |
| `packages/core/test/ma-ly-do.test.ts` | *(mới)* R2-01 — 3 test, gồm test bất biến bao trùm |
| `packages/core/README.md` | R4-01/02/03/04 — mục Cài đặt, `nguoiDung` vào quick-start, hợp đồng khớp, gỡ "10/11", 138→245 |
| `README.md` · `CLAUDE.md` | R1-01/R1-02 — đồng bộ số test, deck, trạng thái mô hình, số luật |
| `apps/demo-wallet/src/SoLieu.tsx` | R7-01 — "cáo buộc sai" → "giao dịch bị gắn cờ" |
| `scripts/tao-deck.cjs` | R7-01 — slide 9 dùng nhãn mới |
| `apps/demo-wallet/public/so-lieu.json` | sinh lại (245 test) |
| `docs/nop-bai/CUSTOS-PITCH.pptx` | sinh lại từ số liệu mới |
| `docs/review/*.md` | *(mới)* ba file đầu ra của vòng review |

**Không chạm:** engine luật (ngưỡng verdict), `scripts/tan-cong.ts`, dataset, cohort,
`packages/types/src/index.ts` (public type **không** đổi).

---

## 7 · Known limitations

1. **Latency chưa đo.** Endpoint công khai trả `429` liên tục; số đo từ đó nói về hạn mức
   endpoint chứ không nói về sản phẩm. Cần RPC key riêng.
2. **8 lỗ hổng phụ thuộc (3 high)**, phần lớn trong nhánh `@solana/web3.js` v1
   (`bigint-buffer`, `jayson`, `uuid`). Dứt điểm cần lên web3.js v2 — breaking change,
   không hợp lý trong 11 ngày. **Nên ghi thành known limitation trong hồ sơ thay vì im lặng.**
3. **0 phỏng vấn người dùng thật.** Công cụ và giao thức sẵn sàng; chưa chạy.
4. **0 outreach B2B.** R4-01 đã tháo chặn kỹ thuật — giờ có tarball để gửi.
5. **Token mô hình chưa đo** — `BLOCKED_BY_SECRET`.
6. **Cohort đang rụng mẫu** — xem §4.
7. **Giao dịch demo 3 lệnh** (coverage 2/3) đơn giản hơn câu chuyện pitch mô tả. Quyết
   định của vai B, và nó **đang chặn việc quay video**.
8. **Ba gói chưa lên npm registry.** Đường tích hợp là tarball. Publish là hành động đối
   ngoại không hoàn tác — cố ý để người dùng tự quyết.
9. **Deck chưa được nhìn bằng mắt** trong PowerPoint — máy này không cài ứng dụng mở `.pptx`.

---

## 8 · Việc người dùng cần làm

| # | Việc | Vì sao chỉ người dùng làm được |
|---|---|---|
| 1 | **Đọc diff rồi tự commit/push** | Quy trình review cấm agent commit. `git status` liệt kê ở §6 |
| 2 | Quyết định **giao dịch demo**: giữ 3 lệnh hay dựng lệnh swap | Quyết định sản phẩm của vai B; **đang chặn video** |
| 3 | Cắm **RPC key riêng** vào environment | Cần secret; mở khoá phép đo latency và chống demo chết |
| 4 | Chạy `scripts/do-token-mo-hinh.ts` với `ANTHROPIC_API_KEY` | Cần secret |
| 5 | **Phỏng vấn ≥5 người thật** | Không được tạo dữ liệu người dùng |
| 6 | **Outreach 10–15 ví/dApp** — giờ đã có tarball để gửi | Cần liên hệ người thật |
| 7 | Mở `CUSTOS-PITCH.pptx` bằng Google Slides, kiểm mắt, xuất PDF | Máy này không mở được `.pptx` |
| 8 | **Neo lại cohort** trước 05/09 nếu mẫu rụng dưới 5 | Quyết định phương pháp đo |
| 9 | Quay video 60–90 giây | Sau việc #2 |
| 10 | Tạo **release tag** cho bản nộp | Thao tác GitHub |

---

## 9 · Trạng thái các phase

```text
PHASE 0  Baseline                 PASS
PHASE 1  Independent Review       PASS — 11 finding
PHASE 2  Product Lead Triage      PASS — P0 ×5, P1 ×12, P2 ×5
PHASE 3  Implementation           PASS — 7 finding đóng (5 P0 + 2 kéo từ P1)
PHASE 4  Independent Re-review    PASS WITH KNOWN LIMITATIONS
```

**Vai 2 re-audit:** probe gốc chạy lại → `reasonCodes: ["CHUONG_TRINH_KHONG_RO"]`, không
tái hiện được. **Vai 4:** tích hợp lại từ project trống hoàn toàn mới → PASS. **Vai 7:**
số liệu công khai sinh lại, cohort không đổi. **Vai 8:** xác nhận `docs/ket-qua-phong-van.md`
vẫn ghi *"CHƯA THỰC HIỆN"* — không có dữ liệu người dùng nào được chế ra trong vòng này.
