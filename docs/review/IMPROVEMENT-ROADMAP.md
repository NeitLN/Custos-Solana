# Improvement Roadmap — từ PRODUCT-REVIEW vòng 1

**Nguồn:** `docs/review/PRODUCT-REVIEW.md` · commit được review `31a59d7`
**Triage:** Vai 1 — Product Truth & Scope Lead

## Đã loại khỏi roadmap

| Đề xuất | Vì sao loại |
|---|---|
| Nâng coverage bằng decoder DEX mới | Ô *demo* đã gần trần; mỗi decoder mới là một nguồn cáo buộc sai mới. P2 |
| Lên `@solana/web3.js` v2 để dứt lỗ hổng audit | Breaking change lớn, 11 ngày trước hạn. Ghi known limitation thay vì làm |
| Đổi thang màu / làm lại giao diện | Sở thích, không có bằng chứng người dùng |
| Thêm backend cho bộ đo phỏng vấn | Thêm chỗ lộ dữ liệu người tham gia; đã cố ý không làm |
| Sửa `caoBuoc` thành metric mới | Không cần đổi phép đo — chỉ cần gọi đúng tên (R7-01) |

---

# P0 — trước khi quay video và nộp bản cuối

## P0-1 · R4-01 — làm SDK cài được từ ngoài repo

| | |
|---|---|
| **Owner** | Vai A |
| **Files** | `packages/types/package.json`, `packages/core/package.json`, `packages/ai/package.json`, `packages/core/README.md` |
| **Dependency** | không |
| **Risk** | Trung bình — chạm `exports`/`main` có thể vỡ đường import nội bộ của ví mẫu và test |
| **Rollback** | `git checkout -- packages/*/package.json` |
| **Status** | TODO |

**Vấn đề.** `"private": true` + `@custos/types: "*"` chưa publish ⇒ mọi lượt cài từ ngoài
đều E404, kể cả cài từ đường dẫn cục bộ.

**Cách sửa — ưu tiên tương thích ngược, không đổi public type:**

1. Đổi `@custos/types: "*"` → `"workspace:*"` hoặc phiên bản cụ thể; đặt version thật
   (`0.1.0`) cho cả ba gói thay vì `0.0.0`.
2. Thêm bước đóng gói tạo `dist` (`tsc --emitDeclarationOnly` + giữ nguồn `.ts`, hoặc
   `tsc` ra `.js` + `.d.ts`), trỏ `exports` vào `dist`, thêm `files`.
3. **Hoặc** — nếu không kịp — cung cấp đường tích hợp thay thế **có kiểm chứng**:
   `npm pack` cả ba gói thành tarball, tài liệu hoá `npm install ./custos-core-0.1.0.tgz`.
   Rẻ hơn nhiều và đủ cho technical pilot.
4. `packages/core/README.md`: thêm **mục Cài đặt** ngay trên đoạn quick-start.

> **Không publish lên npm registry công khai trong phạm vi này** — đó là hành động đối
> ngoại không hoàn tác được, cần người dùng quyết định riêng.

**Test bắt buộc.**
- Script kiểm: từ thư mục tạm, `npm init -y` → cài tarball → `import { inspect }` chạy được.
- `npm run check` vẫn xanh (đường import nội bộ không vỡ).
- Build ví mẫu và trang tấn công vẫn xanh.

**Acceptance criteria.** Một project trống, **không** nằm trong monorepo, chạy được
`inspect()` trên một `VersionedTransaction` và nhận `InspectResult` hợp lệ. Có log
tái hiện được trong `UPDATE-REPORT.md`.

---

## P0-2 · R2-01 — mọi cảnh báo phải có mã lý do

| | |
|---|---|
| **Owner** | Vai A |
| **Files** | `packages/core/src/constants.ts`, `packages/core/src/l2/rules.ts` (luật 9), `packages/core/src/l2/evaluate.ts` |
| **Dependency** | không |
| **Risk** | Thấp — chỉ thêm mã, không đổi ngưỡng verdict nào |
| **Rollback** | revert một commit |
| **Status** | TODO |

**Cách sửa.** Thêm mã `CHUONG_TRINH_KHONG_RO` — **khác** `PROGRAM_CHUA_XAC_MINH`:

| Mã | Nghĩa |
|---|---|
| `PROGRAM_CHUA_XAC_MINH` | biết là chương trình nào, chưa đọc hiểu nó |
| `CHUONG_TRINH_KHONG_RO` | **không biết đó là chương trình gì** |

Phát mã ở fail-safe 2 khi có lệnh `decoded === null && chamTaiSanNguoiKy` mà luật 9 đã bỏ
qua (`programId === ""`).

> **Không** nới bộ lọc `p !== ""` của luật 9 thành phát `PROGRAM_CHUA_XAC_MINH` với
> `programId` rỗng — chuỗi rỗng lọt vào phần `detail` sẽ tạo câu vô nghĩa
> *"Chương trình  ghi vào tài khoản của bạn"*.

**Test bắt buộc.**
1. Unit tái hiện: Facts như probe trong `PRODUCT-REVIEW.md` §2 ⇒ `reasonCodes` chứa
   `CHUONG_TRINH_KHONG_RO`.
2. **Bất biến bao trùm:** duyệt một tập Facts sinh máy; với mọi ca `level !== "safe"`,
   `reasonCodes.length > 0`. Đây là test lẽ ra phải có từ đầu.
3. Giao diện: `chiLaChuaHieu` **không** bật cho ca này.
4. Cohort đo lại: coverage và verdict **không đổi** (mã mới không kích hoạt trên cohort hiện tại).

**Acceptance criteria.** Probe trả mã; `npm run check` xanh; `do-cohort.ts` cho cùng con
số như baseline.

---

## P0-3 · R1-01 + R1-02 — tài liệu khớp trạng thái code

| | |
|---|---|
| **Owner** | Vai A |
| **Files** | `README.md`, `CLAUDE.md`, `packages/core/README.md`, `docs/bao-mat/REMEDIATION-REPORT.md` |
| **Dependency** | **làm SAU P0-1 và P0-2** — hai mục đó đổi số test |
| **Risk** | Thấp |
| **Rollback** | revert |
| **Status** | TODO |

**Sửa:** 188/138 → số test thật · 46 % → 77 % · 21 % → 74 % · "Chưa có: deck" → đã có ·
"chưa chạy mô hình thật" → đã chạy, có file bằng chứng · 12 luật → 14.

**Nguyên tắc:** mọi con số trong `README.md` phải **trỏ về `/so-lieu.html`** thay vì chép
tay, hoặc ghi kèm ngày đo. Số chép tay là số sẽ lệch lần sau.

Hai file `docs/CHAM-DIEM-GIA-DINH.md` và `docs/ROADMAP-DIEM-SO.md` **giữ nguyên số cũ**
nhưng thêm một dòng đầu: *"Ảnh chụp ngày 23/08 — số liệu tại thời điểm đó"*.

**Acceptance criteria.** `grep -rn "188 test\|138 test\|46 %"` trong `README.md`,
`CLAUDE.md`, `packages/core/README.md` không còn kết quả nào mô tả trạng thái hiện tại.

---

## P0-4 · R4-02 — `nguoiDung` lên đầu tài liệu tích hợp

| | |
|---|---|
| **Owner** | Vai A · **Files** `packages/core/README.md:11-25` · **Risk** Thấp · **Status** TODO |

Đưa `nguoiDung` vào **chính đoạn quick-start**, kèm một câu giải thích hậu quả nếu bỏ:

> Không truyền `nguoiDung` thì Custos bảo vệ **fee payer**. Nếu dApp trả phí hộ, fee payer
> là dApp — toàn bộ bảng chênh lệch sẽ tính trên ví sai.

**Acceptance criteria.** Đoạn code đầu tiên trong README có `nguoiDung`; `readme.test.ts`
(test chạy thật trên ví dụ trong README) vẫn xanh.

---

## P0-5 · R7-01 — gọi đúng tên con số

| | |
|---|---|
| **Owner** | Vai A (code) · Vai D (deck) |
| **Files** | `apps/demo-wallet/src/SoLieu.tsx`, `docs/nop-bai/CUSTOS-PITCH.pptx` (qua `scripts/tao-deck.cjs`), `scripts/do-cohort.ts` (chỉ chú thích) |
| **Risk** | Thấp — **không đổi phép đo**, chỉ đổi nhãn |
| **Status** | TODO |

`cáo buộc sai` → **`giao dịch bị gắn cờ`**, kèm chú thích:

> Trên 12 giao dịch SPL mainnet lấy ngẫu nhiên. Chúng tôi **chưa kiểm chứng từng giao dịch
> là lành**, nên đây là số lần gắn cờ, không phải tỉ lệ báo nhầm đã chứng minh.

**Acceptance criteria.** Không còn chữ "cáo buộc sai" / "false positive" ở chỗ chưa có
ground truth; deck sinh lại từ `so-lieu.json` và số khớp.

---

# P1 — trước ngày thi

| ID | Việc | Owner | Files | Test / AC | Status |
|---|---|---|---|---|---|
| P1-1 (R4-03) | Bổ sung `truocDayDu`/`sauDayDu` vào bảng hợp đồng trong README | A | `packages/core/README.md` | Bảng khớp `packages/types/src/index.ts` | TODO |
| P1-2 (R4-04) | Gỡ ví dụ "10/11" còn sót | A | `packages/core/README.md:49` | `grep -c "10/11"` = 0 | TODO |
| P1-3 (R6-01) | Ghi **known limitation** về 3 lỗ hổng high; nêu rõ nằm trong nhánh `@solana/web3.js` v1 | A | `README.md`, `docs/review/UPDATE-REPORT.md` | Có mục, có ngày chạy `npm audit` | TODO |
| P1-4 (R12-01) | Thêm câu trả lời về **Blockaid** cạnh câu Blowfish | D | `PITCH-VA-PHAN-BIEN.md` | Có câu, nói ở thì đúng, không bịa về đối thủ | TODO |
| P1-5 | Đo **latency p50/p95** sau khi có RPC key riêng | A | script mới | Có n, có endpoint, không dùng public RPC | BLOCKED — cần khoá |
| P1-6 | Đo **token thật** của mô hình | A | `scripts/do-token-mo-hinh.ts` (đã sẵn) | `chi-phi-mo-hinh.json` có số | BLOCKED_BY_SECRET |
| P1-7 | Quyết định giao dịch demo: giữ 3 lệnh hay dựng lệnh swap | B | `scripts/tan-cong.ts` | Nếu dựng: mọi lệnh thêm phải là lệnh một swap thật có | TODO — **chặn video** |
| P1-8 | Phỏng vấn người thật (≥5) | Cả 4 | `data/seed/phong-van.json` | `kiem-phong-van.ts` chạy sạch | TODO |
| P1-9 | Outreach 10–15 ví/dApp | D | ghi chép | ≥3 phản hồi thật, ghi cả câu "không" | TODO — phụ thuộc P0-1 |
| P1-10 | Mở deck bằng mắt (Google Slides), xuất PDF | D | — | Không vỡ dấu, không xuống dòng xấu | TODO |
| P1-11 | Tập pitch 5 lượt, bấm giờ | Cả 4 | — | 4 phút không tràn | TODO |
| P1-12 | Release tag cho bản nộp | người dùng | — | Tag trỏ đúng commit đã demo | TODO |

---

# P2 — sau bản thi ổn định

| ID | Việc | Ghi chú |
|---|---|---|
| P2-1 | Decoder cho chương trình DEX | Nâng coverage; mỗi decoder cần fixture dương/âm/malformed |
| P2-2 | Ground truth cho cohort mainnet | Mở đường nói "false positive" đúng nghĩa |
| P2-3 | Đệm kết quả tra tuổi ví | `getSignaturesForAddress(limit:1000)` là lượt gọi nặng nhất — xem `DON-VI-KINH-TE.md` §2 |
| P2-4 | Lên `@solana/web3.js` v2 | Dứt điểm lỗ hổng phụ thuộc; breaking change |
| P2-5 | Bảng điều khiển tổ chức · extension | `CUSTOS.md` mục 08 đã xếp sau cuộc thi |

---

## Thứ tự thực thi P0

```
P0-1  đóng gói SDK        <- chặn cả P1-9 (outreach) và câu hỏi giám khảo nặng nhất
P0-2  mã lý do fail-safe  <- lỗ hổng bảo mật duy nhất tìm được
P0-4  nguoiDung lên đầu   <- cùng file với P0-1, làm liền tay
P0-5  gọi đúng tên số
P0-3  đồng bộ tài liệu    <- LÀM CUỐI, vì bốn mục trên đổi số test
```

Sau mỗi mục: test tái hiện → sửa tối thiểu → `npm run check` → build phần bị ảnh hưởng →
soi diff → cập nhật tài liệu. **Không commit, không push.**
