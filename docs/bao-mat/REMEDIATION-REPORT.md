# Báo cáo khắc phục

| | |
|---|---|
| Commit được audit | `92cca153f62dd6451b9a5f20cf9c6c0ee3f844d6` (`main`) |
| Ngày | 21–22/08/2026 |
| Baseline | `npm run check` → **167/167 PASS**, worktree sạch |
| Sau khắc phục | `npm run check` → **197/197 PASS** |
| Trạng thái commit | **CHƯA commit, CHƯA push** — người dùng tự làm |

## Kết luận re-audit

> **PASS WITH KNOWN LIMITATIONS**

P0 hoàn thành và qua toàn bộ cổng. P1 hoàn thành phần lõi. P2: mức diễn đạt Ngắn
đã cài, live-model đã chạy thật với Haiku; còn mức Kỹ thuật chưa làm.

Giới hạn quan trọng nhất còn lại nằm ở mục *Vấn đề chưa giải quyết* bên dưới —
**không được đọc "PASS" mà bỏ qua mục đó**.

---

## Findings đã xác minh và xử lý

| ID | Trước | Sau | Test chứng minh | Trạng thái |
|---|---|---|---|---|
| **F1** SOL không được bảo vệ | Rút 5 SOL ⇒ `safe`, mã rỗng, hiện là "Phí mạng" | `warning` + `SOL_ROI_VI`, tách "Phí mạng (ước tính)" / "Chuyển SOL đi" / "Nhận SOL" | `core/test/sol.test.ts` (7 ca) | **ĐÃ SỬA** |
| **F1b** Bảo vệ nhầm người trả phí | dApp trả phí ⇒ người dùng bị rút sạch vẫn `safe` | `InspectOptions.nguoiDung`; vắng mặt + đa signer ⇒ `NGUOI_DUNG_KHONG_RO`, không bao giờ `safe` | `sol.test.ts` ca 6–8 | **ĐÃ SỬA một phần** — xem giới hạn |
| **F2** Cắt âm thầm account thứ 101 | 131 account, 31 bị bỏ, `coverage 1/1`, verdict `safe` | `accountKhongDoDuoc` + fail-safe 4 + `TRANG_THAI_DO_KHUYET` | `core/test/do-khuyet.test.ts` | **ĐÃ SỬA** |
| **A1** `accounts: null` ⇒ bịa ra mất mát | `safe` **và** bảng hiện "500.000.000 → 0" | Không dựng fact cho account chưa đo được; bảng không còn dòng bịa | `do-khuyet.test.ts` (2 ca) | **ĐÃ SỬA** |
| **A2** Fail-safe không có mã lý do | Mô phỏng hỏng ⇒ `warning`, `reasonCodes: []` | `MO_PHONG_HONG` | `do-khuyet.test.ts`, bất biến ở `ai/test/templates.test.ts` | **ĐÃ SỬA** |
| **F3** Luật PD không biết ai ra tay | Luôn Vàng | `authority` bóc từ danh sách account; chính PD ra tay ⇒ Đỏ; không bóc được ⇒ giữ Vàng | `core/test/authority.test.ts` (6 ca) | **ĐÃ SỬA** |
| **F4** Coverage | 53 % · chạm tài sản 21 % | 69 % · chạm tài sản 39 % (cohort 22/08) | `scripts/do-cohort.ts` | **CẢI THIỆN** |
| **F5** Ba mức diễn đạt | Chỉ mức "Đầy đủ" | Thêm mức **Ngắn** (mặc định) + nút "Xem chi tiết"; mức Kỹ thuật chưa làm | `ai/test/mucNgan.test.ts` (8 ca) | **MỘT PHẦN** |
| **F6** Model layer chạy thật | Chưa chạy lần nào | Chạy thật với Haiku 4.5: 12/12 mẫu dùng được, latency 2430ms | `scripts/danh-gia-mo-hinh.ts` · `docs/bao-mat/DANH-GIA-claude-haiku-*.md` | **ĐÃ CHẠY** |

---

## Số liệu

### Test

| | Trước | Sau |
|---|---:|---:|
| Test | 167 | **197** |
| File test mới | — | `sol.test.ts`, `do-khuyet.test.ts`, `authority.test.ts`, `ai/test/mucNgan.test.ts` |

### Coverage — đo trên cohort cố định

Cohort ghi tại `data/seed/cohort-audit.json`, đo bằng `scripts/do-cohort.ts`.

| Cohort | Mẫu đo được | Coverage | Lệnh chạm tài sản |
|---|---:|---:|---:|
| 21/08 (baseline) | 20/20 | 53 % | 21 % |
| 22/08 (sau khắc phục) | 15/20 | **69 %** | **39 %** |

**Coverage dao động rất mạnh giữa các mẻ mẫu.** Hai cohort trên chênh nhau 16 điểm
mà phần lớn là do mẫu, không do code. Vì vậy phần đóng góp của decoder sinh từ IDL
được đo **trong cùng một lượt trên cùng cohort**:

| | Có decoder IDL | Không có |
|---|---:|---:|
| Coverage | 69 % | 67 % |
| Lệnh chạm tài sản | 39 % | 35 % |

Tức decoder IDL đóng góp **+2 điểm**, không phải +5 như so chéo hai cohort gợi ý.
Đây đúng cái bẫy đã ghi ở `SEED-DATASET.md` mục 0b3, và lần này tránh được.

### Báo nhầm

Trên mọi lần đo cohort sau khắc phục: **0 verdict Đỏ**, **0 cảnh báo mang tính
cáo buộc**, **0 cảnh báo không có mã lý do**. Không luật mới nào gây mệt mỏi cảnh báo.

### Dataset

29 mẫu, không đổi. Fixture đóng băng trước khi có trường mới vẫn đọc được nhờ
mặc định ở `giaiDongBangFacts`.

---

## Files đã thay đổi

**Lõi**

| File | Lý do |
|---|---|
| `packages/core/src/facts.ts` | thêm `accountKhongDoDuoc`, `nguoiKy`, `nguoiDungDuocChiDinh`, `phiUocTinh`; `decoded` mang `authority` |
| `packages/core/src/l1/fetch.ts` | phân biệt "chưa đo được" với "bằng không"; ước tính phí; bóc `authority`; nhận địa chỉ người dùng |
| `packages/core/src/l1/decode.ts` | vị trí `authority` của SPL Token; tra bảng IDL |
| `packages/core/src/l1/bang-idl.ts` | **sinh tự động** từ IDL trên chuỗi — 6 chương trình, 207 lệnh |
| `packages/core/src/l2/evaluate.ts` | fail-safe 4; mã lý do cho fail-safe |
| `packages/core/src/l2/rules.ts` | luật 13 (SOL rời ví), luật 14 (không rõ bảo vệ ai), luật 4 dùng `authority` |
| `packages/core/src/diff.ts` | tách phí / chuyển đi / nhận về; dòng "Phần chưa đọc được" |
| `packages/core/src/constants.ts` | 6 mã lý do mới; ngưỡng SOL; danh sách xác minh sinh từ bảng IDL |
| `packages/core/src/facts-io.ts` | tương thích ngược với fixture cũ |
| `packages/core/src/inspect.ts` | truyền `options.nguoiDung` xuống L1 |
| `packages/types/src/index.ts` | **mở rộng tương thích ngược**: thêm `InspectOptions.nguoiDung` (tuỳ chọn) |
| `packages/ai/src/templates.ts` | câu tiếng Việt cho 6 mã lý do mới |

**Công cụ**

| File | Lý do |
|---|---|
| `scripts/do-cohort.ts` | đo trên cohort CỐ ĐỊNH, kèm so sánh một lượt |
| `scripts/lay-idl-onchain.ts` | lấy IDL Anchor từ chuỗi |
| `scripts/tao-bang-idl.ts` | sinh `bang-idl.ts` |
| `scripts/smoke-model.ts` | gọi thật một lượt để kiểm adapter |
| `scripts/danh-gia-mo-hinh.ts` | bộ đánh giá 12 mẫu cố định, chạy qua ĐƯỜNG SẢN XUẤT |
| `packages/ai/src/anthropic.ts` | adapter Anthropic — file duy nhất biết tên nhà cung cấp |
| `packages/ai/src/mucNgan.ts` | mức diễn đạt Ngắn |

**Tài liệu**: `CUSTOS.md`, `README.md`, `CLAUDE.md`, `packages/core/README.md`,
`docs/bao-mat/*`.

---

## Quyết định về hợp đồng công khai

`packages/types/src/index.ts` được **mở rộng**, không phá:

- thêm `InspectOptions.nguoiDung?: string` — trường tuỳ chọn, mã cũ bỏ qua được;
- **không** đổi `Coverage`. `analyzed/total` mang nghĩa *instruction*; nhét thêm
  nghĩa *account* vào đó sẽ làm hỏng ý nghĩa của cả hai. Tín hiệu "bảng chênh lệch
  chưa đầy đủ" đi qua `reasonCodes` và qua một dòng trong `diff` — hai cơ chế đã có.

`Facts` là kiểu nội bộ của `packages/core`, không thuộc hợp đồng đóng băng, nên
mở rộng ở đó không cần đàm phán.

---

## Vấn đề chưa giải quyết

### 1. Thiếu `nguoiDung` thì chỉ cảnh báo phạm vi, KHÔNG phát hiện được vụ trộm

Đây là giới hạn nghiêm trọng nhất còn lại.

- Ví **có** truyền `nguoiDung` ⇒ phát hiện đầy đủ (có test: verdict `danger`).
- Ví **không** truyền, giao dịch nhiều signer ⇒ chỉ `warning` + `NGUOI_DUNG_KHONG_RO`.
  Custos nói *"tôi có thể đang xem nhầm ví"*, chứ **không** nói *"ví của bạn đang bị rút"*.

SDK không tự suy ra được địa chỉ người dùng. Đây là việc bên tích hợp phải làm, và
`packages/core/README.md` đã ghi rõ.

### 2. Phí mạng là ước tính cận dưới

Phí ưu tiên chỉ tính được khi giao dịch có cả `setComputeUnitPrice` lẫn
`setComputeUnitLimit`. Thiếu một trong hai thì bỏ qua phần đó. Hệ quả: dòng
"Chuyển SOL đi" có thể lẫn vài nghìn lamport phí. Không ảnh hưởng verdict vì luật
13 dùng ngưỡng theo tỉ lệ 50 %.

### 3. Rent chưa tách khỏi khoản chuyển

SOL trả cho rent khi tạo account, và SOL hoàn lại khi đóng account, hiện gộp
chung vào "Chuyển SOL đi" / "Nhận SOL". Tỉ lệ nhỏ nên không kích hoạt luật 13,
nhưng nhãn chưa chính xác.

### 4. Wrapped SOL

Chỉ được xử lý như một token bình thường. Không có bước đối chiếu giữa số dư wSOL
và lamport, nên không phát hiện được kiểu tấn công lợi dụng chênh lệch đó.

### 5. Coverage vẫn thấp ở đúng chỗ quan trọng

Lệnh **chạm được tài sản người dùng** mới đọc hiểu 39 %. Chương trình không công
bố IDL trên chuỗi thì không có cách nào đọc hiểu mà không phỏng đoán, nên vẫn bị
đếm là chưa xác minh.

### 6. F5 mới xong một phần

- **F5**: mức **Ngắn** đã cài và là mặc định trên màn cảnh báo; mức **Đầy đủ** nằm
  sau nút "Xem chi tiết". Mức **Kỹ thuật** chưa làm — đặc tả `DAC-TA-L3.md` mục 6
  ghi rõ nếu thiếu thời gian thì cắt mức 3 trước.
- **F6** live-model: **đã chạy thật** với `claude-haiku-4-5-20251001` ngày 22/08.
  12/12 mẫu mô hình trả lời được, 0 lượt rơi về câu mẫu cứng, 0 lượt phá bất đối
  xứng `aiAdvisory`, latency trung bình 2430ms.

  **Opus 5 KHÔNG dùng được với cấu hình hiện tại:** đo được 7864ms cho một lượt
  gọi với payload thật, sát ngay dưới hạn 8000ms của `boiThoiHan`, nên trên thực
  tế mọi lượt đều quá hạn và rơi về câu mẫu cứng. Muốn dùng Opus thì phải nâng
  thời hạn — nhưng 8 giây đã là quá lâu để bắt người dùng chờ ở màn hình ký.
  Haiku ở 2,4 giây là lựa chọn đúng cho việc này.

---

## Việc người dùng cần làm

1. **Tự commit và push.** 29 mục thay đổi trong worktree, chưa commit gì.
2. **Cấu hình khoá API** (`ANTHROPIC_API_KEY` hoặc tương đương) trong environment
   nếu muốn chạy đánh giá mô hình thật. Không dán khoá vào chat.
3. **Nói với bên tích hợp: truyền `nguoiDung`.** Không truyền thì Custos chỉ bảo
   vệ được người trả phí.
4. **Kiểm mắt giao diện Demo Wallet** — đã chạy tự động và đạt, nhưng dòng
   "Phí mạng (ước tính)" và "Phần chưa đọc được" là chữ mới trên màn cảnh báo.

---

## Cách chạy lại phần kiểm chứng

```bash
npm run check                                             # 188 test
node --experimental-strip-types scripts/do-cohort.ts x    # đo trên cohort cố định
node --experimental-strip-types scripts/soi-lenh-chua-decode.ts
node scripts/soi-ro-ri-khoa.mjs site                      # sau khi build
```
