# Roadmap khắc phục

Nguồn: `docs/bao-mat/SECURITY-AUDIT.md`, commit `92cca15`.

Nguyên tắc xuyên suốt: **sửa nguyên nhân gốc trước triệu chứng.** Ba lỗi Critical
(F2, A1, một phần F1) đều bắt nguồn từ việc `Facts` không phân biệt được *"đo được
và bằng không"* với *"chưa đo được"*. Vá riêng lẻ sẽ để lại lỗ thứ tư.

Không bắt đầu P1 khi P0 chưa PASS.

---

## Quyết định kiến trúc

### QĐ-1 · Thêm biểu diễn "đo khuyết" vào `Facts` nội bộ

`Facts` là kiểu **nội bộ** của `packages/core` (`src/facts.ts`), không nằm trong hợp
đồng đóng băng `packages/types`. Mở rộng ở đây không phá hợp đồng công khai.

Thêm:

```ts
type Facts = {
  // …
  /** Account có mặt trong giao dịch nhưng KHÔNG đo được trạng thái sau.
   *  Rỗng = phép đo đầy đủ. Không rỗng = bảng chênh lệch có thể thiếu. */
  accountKhongDoDuoc: string[];
};
```

Và trong `AccountFact` / `TokenAccountFact`, phân biệt `null` (đo được, không có) với
trạng thái chưa đo. Cách rẻ nhất và ít phá nhất: **không đưa account chưa đo được vào
`accounts`/`tokenAccounts` nữa**, mà đưa địa chỉ của nó vào `accountKhongDoDuoc`.
Như vậy không luật nào đọc nhầm `null` thành `0`, và không dòng chênh lệch nào bịa ra.

**Vì sao không mở rộng `Coverage` trong `packages/types`:** `Coverage` là hợp đồng công
khai đã đóng băng, và `analyzed/total` mang nghĩa **instruction**. Nhét thêm nghĩa
account vào đó làm hỏng ý nghĩa của cả hai con số. Bên tích hợp sẽ nhận tín hiệu qua
`reasonCodes` — cơ chế đã có sẵn, không phá gì.

### QĐ-2 · `nguoiDung` là ngữ cảnh do ví cung cấp, mặc định an toàn

Thêm trường **tuỳ chọn** vào `InspectOptions` (hợp đồng công khai — mở rộng tương thích
ngược, mã cũ bỏ qua được):

```ts
export type InspectOptions = {
  // …
  /** Địa chỉ ví NGƯỜI DÙNG mà ví/dApp muốn Custos bảo vệ.
   *  Vắng mặt ⇒ Custos dùng fee payer VÀ nâng nghi ngờ khi có signer khác. */
  nguoiDung?: string;
};
```

Đây là mở rộng thêm trường tuỳ chọn, không đổi trường cũ, không đổi ngữ nghĩa trường cũ.
Vẫn phải ghi decision record — chính mục này.

**Mặc định an toàn khi vắng ngữ cảnh:** nếu giao dịch có **nhiều hơn một signer** và ví
không nói ai là người dùng, Custos không được im lặng. Nó phải bảo vệ **mọi signer** và
nói rõ trong mã lý do.

### QĐ-3 · Phí mạng là fact riêng, không suy từ tổng chênh lệch lamport

`Facts` thêm `phiUocTinh: bigint`. Phí thật của một giao dịch Solana không đọc được từ
mô phỏng một cách chắc chắn. Đây là **cận DƯỚI**: phí cơ bản thì chắc, phí ưu tiên chỉ
tính được khi giao dịch khai đủ cả giá lẫn hạn mức compute unit. Nhãn hiển thị phải
nói rõ là ước tính. Phần lamport rời ví **vượt quá** ước tính đó là khoản chuyển, không phải phí.

---

## P0 — Correctness và fail-safe

| # | Task | Vai | Files | Phụ thuộc |
|---|---|---|---|---|
| P0-1 | Biểu diễn "đo khuyết" trong `Facts` + fail-safe 4 + mã lý do | C | `facts.ts`, `l1/fetch.ts`, `l2/evaluate.ts`, `constants.ts` | — |
| P0-2 | Không bịa dòng chênh lệch cho account chưa đo được | C | `diff.ts` | P0-1 |
| P0-3 | Tách phí mạng khỏi khoản chuyển SOL | C | `facts.ts`, `l1/fetch.ts`, `diff.ts` | P0-1 |
| P0-4 | Luật SOL outflow + mã lý do | C | `l2/rules.ts`, `constants.ts` | P0-3 |
| P0-5 | `nguoiDung` trong `InspectOptions`, mặc định an toàn khi đa signer | C | `packages/types`, `l1/fetch.ts`, `inspect.ts` | P0-1 |
| P0-6 | Fail-safe 1 phải có mã lý do | C | `l2/evaluate.ts`, `constants.ts` | — |
| P0-7 | Test hồi quy và đối kháng cho toàn bộ P0 | C | `packages/core/test/` | P0-1..6 |
| P0-8 | Kiểm Demo Wallet hiển thị đúng sau thay đổi | C | `apps/demo-wallet` (chỉ đọc/kiểm) | P0-1..6 |

### Acceptance criteria P0

**P0-1 / P0-2 — đo khuyết**

- Account bị cắt ở trần 100 phải xuất hiện trong `accountKhongDoDuoc`.
- Có account chưa đo được ⇒ verdict **không bao giờ** `safe`.
- Cảnh báo đó phải kèm mã lý do (`TRANG_THAI_DO_KHUYET`).
- Bảng chênh lệch **không** được sinh dòng nào cho account chưa đo được.
- `simulateTransaction` trả `accounts: null` phải rơi vào đúng nhánh này.
- Test phải kiểm chính account thứ 101 trở đi, và kiểm cả ca `accounts: null`.
- Ca âm tính: giao dịch nhỏ, đo đủ ⇒ `accountKhongDoDuoc` rỗng, verdict không đổi.

**P0-3 / P0-4 — SOL**

- Ca chỉ có phí: hiện đúng một dòng phí, verdict không đổi.
- Ca chuyển SOL hợp lệ: dòng nhãn **`Chuyển SOL`** tách khỏi dòng phí.
- Ca rút SOL lớn: **không được** `safe`, phải có mã lý do hành động được.
- Ca hoàn rent (SOL tăng): không được hiển thị như phí âm/dương lẫn lộn.
- Ca gửi SOL bình thường **không** được gắn `danger`.
- Giới hạn phải ghi rõ trong tài liệu: priority fee, rent tạo/đóng account, wSOL,
  fee payer khác người dùng, giao dịch nhiều signer.

**P0-5 — người dùng ≠ fee payer**

- Truyền `nguoiDung` ⇒ mọi luật và bảng chênh lệch nhắm đúng địa chỉ đó.
- Không truyền, giao dịch một signer ⇒ hành vi như cũ (không hồi quy).
- Không truyền, giao dịch **nhiều signer** ⇒ không được `safe`, phải có mã lý do.
- Ca 7 và ca 8 trong audit phải chuyển từ `safe` sang phát hiện được.

**P0-6**

- Mô phỏng hỏng ⇒ `warning` kèm mã `MO_PHONG_HONG`.
- Không mã lý do rỗng ở bất kỳ verdict khác `safe` nào. Có test bất biến.

### Rủi ro P0 và cách rollback

| Rủi ro | Giảm thiểu |
|---|---|
| Luật SOL gắn cờ mọi giao dịch gửi tiền — đúng lỗi luật 11 đã mắc | Đo trên cohort trước/sau; ngưỡng theo **tỉ lệ số dư**, không theo con số tuyệt đối |
| Fail-safe mới làm mọi giao dịch ra Vàng — mệt mỏi cảnh báo | Chỉ kích hoạt khi account chưa đo được **writable**; đo trên cohort |
| Mở rộng `InspectOptions` phá bên tích hợp | Trường tuỳ chọn, vắng mặt giữ nguyên hành vi cũ; có test |
| Đổi `Facts` phá dataset đã đóng băng | Trường mới có giá trị mặc định khi đọc fixture cũ; chạy lại toàn bộ 29 mẫu |

Rollback: mỗi task là một nhóm thay đổi độc lập trong worktree; hoàn nguyên bằng
`git checkout -- <file>` vì người dùng chưa commit.

---

## P1 — Chiều sâu ngữ nghĩa

| # | Task | Vai | Phụ thuộc |
|---|---|---|---|
| P1-1 | Bóc `authority` của Transfer vào `InstructionFact` | C | P0 PASS |
| P1-2 | Luật 4 dùng authority: chỉ nâng khi chính permanent delegate ra tay | C | P1-1 |
| P1-3 | Decoder protocol theo IDL/nguồn đáng tin | D | P0 PASS |
| P1-4 | Đo lại coverage trên **cùng cohort** | A | P1-3 |
| P1-5 | Cập nhật giới hạn trong README và SEED-DATASET | A | P1-4 |

**Acceptance P1-1/P1-2:** owner tự chuyển ⇒ **không** Đỏ. Permanent delegate thực sự
chuyển hoặc burn ⇒ phát hiện đúng. Không đủ dữ liệu ⇒ giữ Vàng, không đoán. Có fixture
dương và âm.

**Acceptance P1-3:** mỗi decoder có nguồn ghi trong code. **Không đoán discriminator.**
Chương trình chưa hiểu vẫn phải giảm coverage. Input dị dạng không làm sập và không
thành `safe`.

---

## P2 — AI và trình bày

| # | Task | Vai | Phụ thuộc |
|---|---|---|---|
| P2-1 | Live-model adapter + smoke test | E | P0, P1 core PASS · **BLOCKED_BY_SECRET** |
| P2-2 | Evaluation tiếng Việt trên tập cố định | E | P2-1 |
| P2-3 | Mức diễn đạt **Ngắn** | E | P0 PASS |
| P2-4 | Mức diễn đạt **Kỹ thuật** | E | P2-3 |

Mọi mức diễn đạt phải giữ nguyên facts, con số và `reasonCodes`; chỉ đổi cách nói.

---

## Trạng thái

| Task | Trạng thái |
|---|---|
| P0-1 … P0-8 | **PASS** — re-audit 9/9 cổng đạt |
| P1-1, P1-2 (authority + luật 4) | **PASS** |
| P1-3 (decoder từ IDL trên chuỗi, 6 chương trình) | **PASS** |
| P1-4 (đo lại cùng cohort) | **PASS** |
| P1-5 (cập nhật tài liệu) | **PASS** |
| P2-1, P2-2 | **BLOCKED** — không có khoá API trong environment |
| P2-3, P2-4 (ba mức diễn đạt) | TODO |
