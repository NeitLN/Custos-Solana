# Đặc tả kỹ thuật Custos Core

**Chủ sở hữu: vai A** (`packages/core`) · vai C đọc mục 5 · vai B đọc mục 6 · vai D đọc mục 4

Mục tiêu của tài liệu: ngày đầu build, vai A không phải mất nửa buổi tự thiết kế, và ba vai còn lại có mock để chạy song song ngay từ giờ đầu tiên.

> Đây là **đặc tả**, chưa phải code. Vẫn chờ `DUYỆT KẾ HOẠCH – BẮT ĐẦU BUILD`.

---

## 1 · Nguyên tắc kiến trúc quan trọng nhất

> **Ưu tiên phát hiện qua *thay đổi trạng thái*, không qua *đọc instruction*.**

Kẻ tấn công giấu được instruction — bọc trong CPI, gói trong program riêng, nén địa chỉ vào ALT. Nhưng **không giấu được hậu quả**: nếu quyền sở hữu tài khoản token đổi chủ, trạng thái tài khoản sau mô phỏng sẽ khác trước, bất kể instruction nào gây ra.

Đây chính là bài học từ ca Coinspect (`NGHIEN-CUU-21-08.md` mục 2): mô phỏng bỏ lọt vì nó đọc instruction, không đối chiếu trạng thái.

Hệ quả cho thiết kế: **L1 phải lấy được trạng thái trước và sau, không chỉ danh sách instruction.**

---

## 2 · L1 — Bóc tách

### 2.1 Trình tự bắt buộc

```
1. Giải ALT              → có đủ danh sách account thật của giao dịch
2. getMultipleAccounts   → trạng thái TRƯỚC
3. simulateTransaction   → trạng thái SAU + logs + inner instructions
4. So khớp trước/sau     → Facts
```

### ⚠️ Bẫy tốn nửa ngày nếu không biết trước

**`simulateTransaction` chỉ trả về trạng thái SAU mô phỏng.** Nó không cho biết trước đó tài khoản trông thế nào. Muốn có bảng chênh lệch thì **bắt buộc phải `getMultipleAccounts` trước khi mô phỏng**.

Và muốn biết phải hỏi những account nào thì **phải giải ALT trước** — vì địa chỉ nằm trong lookup table không xuất hiện trong `staticAccountKeys`.

Thứ tự này không đảo được.

### 2.2 Tham số gọi `simulateTransaction`

| Tham số | Giá trị | Vì sao |
|---|---|---|
| `sigVerify` | `false` | Giao dịch **chưa được ký** — đây là toàn bộ mục đích của sản phẩm |
| `replaceRecentBlockhash` | `true` | Không dùng chung được với `sigVerify: true`. Cần cái này để mô phỏng tx chưa ký |
| `innerInstructions` | `true` | **Bắt buộc.** Hành vi độc hại thường nằm trong CPI, không ở tầng ngoài |
| `accounts.addresses` | danh sách account cần theo dõi | Trả về trạng thái sau mô phỏng. **Có giới hạn số lượng — kiểm tra khi triển khai** |
| `encoding` | `base64` | |

Trả về: `err`, `logs`, `accounts`, `unitsConsumed`, `returnData`, `innerInstructions`.

### 2.3 Đọc dữ liệu tài khoản — dùng thư viện, đừng tự parse byte

`@solana/spl-token` đã có `unpackAccount`, `unpackMint`, `getPermanentDelegate`, `getTransferHook`. Tự bóc byte thủ công là cách nhanh nhất để tạo bug âm thầm.

Nhưng vẫn cần biết trong đó có gì:

**Token account — 165 byte**

| Trường | Dùng cho luật |
|---|---|
| `mint` | tra ngược ra mint |
| **`owner`** | **luật 1** — đổi chủ sở hữu |
| **`amount`** | **luật 11** — chênh lệch số dư |
| **`delegate` + `delegatedAmount`** | **luật 3** — cấp quyền rút |
| **`closeAuthority`** | **luật 2** |
| `state` | bị đóng băng hay không |

**Mint — 82 byte**

| Trường | Dùng cho luật |
|---|---|
| **`mintAuthority`** | **luật 6** — chưa thu hồi |
| **`freezeAuthority`** | **luật 7** |
| `decimals` | hiển thị số cho đúng |

**Token-2022** — cùng layout gốc, sau byte 165 là account-type rồi tới các extension TLV. Cần đọc: `PermanentDelegate` (luật 4), `TransferHook` (luật 5).

**Trường `owner` của chính account** *(không phải `owner` bên trong token account)* — là program sở hữu account đó. Đổi trường này ⇒ **luật 12**.

> Phân biệt hai chữ `owner` này. Nhầm lẫn ở đây là lỗi rất dễ mắc: `AccountInfo.owner` là **program** sở hữu account; `TokenAccount.owner` là **ví** sở hữu số dư.

### 2.4 Đầu ra của L1

```ts
type Facts = {
  signer: string;
  simulationOk: boolean;              // false nếu err != null
  simulationError: string | null;

  tokenAccounts: Array<{
    address: string;
    mint: string;
    ownerBefore: string;  ownerAfter: string;      // ví sở hữu số dư
    amountBefore: bigint; amountAfter: bigint;
    delegateBefore: string | null; delegateAfter: string | null;
    delegatedAmountAfter: bigint;
    closeAuthorityBefore: string | null; closeAuthorityAfter: string | null;
    programOwnerBefore: string; programOwnerAfter: string;   // program sở hữu account
  }>;

  mints: Array<{
    address: string;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    permanentDelegate: string | null;
    transferHookProgramId: string | null;
    isToken2022: boolean;
  }>;

  solDelta: Record<string, bigint>;      // theo địa chỉ

  instructions: Array<{
    index: number;
    programId: string;
    isInner: boolean;
    parentIndex: number | null;
    decoded: { kind: string; [k: string]: unknown } | null;   // null = không decode được
    fromLookupTable: boolean;
  }>;

  lookupTables: Array<{ address: string; resolved: boolean }>;

  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
};
```

**Quy tắc tính `coverage`:**
- **Mô phỏng thất bại ⇒ `analyzed = 0`.** `coverage` trả lời *"hiểu được hậu quả của bao nhiêu phần giao dịch"*, không phải *"nhận ra tên bao nhiêu instruction"*. Đọc được tên lệnh mà mô phỏng hỏng thì vẫn **không biết gì về hậu quả**.
  > Lỗ hổng này do smoke test trên devnet lộ ra: ví rỗng ⇒ mô phỏng lỗi `AccountNotFound`, nhưng coverage vẫn ra `1/1` — một L2 ngây thơ sẽ thấy coverage đầy đủ và ra `safe`. Đã có test hồi quy ở `packages/core/test/failsafe.test.ts`.
- `total` = **tất cả** instruction, kể cả inner
- `analyzed` = số instruction có `programId` nằm trong danh sách đã xác minh **và** `decoded != null`
- `unverifiedPrograms` = số program ID **khác nhau** không nằm trong danh sách xác minh

**Danh sách program đã xác minh — bản thi giữ ngắn:** System, SPL Token, Token-2022, Associated Token Account, Orca Whirlpool, SPL Memo. Ngắn là tốt: nó làm coverage phản ánh đúng sự thật rằng đội mới decode được chừng đó.

---

## 3 · L2 — Engine luật

### 3.1 Chữ ký

```ts
type RuleResult = { fired: boolean; level: Level; reasonCode: string; detail?: string };
type Rule = { id: number; code: string; evaluate(facts: Facts): RuleResult };

function evaluate(facts: Facts): { level: Level; reasonCodes: string[] } // lấy mức cao nhất
```

**Không có AI ở đâu trong file này.** Đây là ranh giới đã khoá.

### 3.2 Mười hai luật của bản thi — phân theo nguồn dữ liệu

Phân loại này cho biết mỗi luật cần gì, và luật nào làm được ngay mà không cần mô phỏng.

| # | Luật | Nguồn dữ liệu | Verdict |
|---:|---|---|---|
| 1 | Token account đổi `owner` | **Chênh lệch trạng thái** | Đỏ |
| 2 | `closeAuthority` được gán cho bên thứ ba | **Chênh lệch trạng thái** | Đỏ |
| 3 | `delegate` được gán, `delegatedAmount` vượt ngưỡng | **Chênh lệch trạng thái** | Đỏ |
| 12 | `AccountInfo.owner` đổi sang program khác | **Chênh lệch trạng thái** | Đỏ |
| 11 | Outflow không khớp các leg còn lại | **Chênh lệch trạng thái** | Vàng → Đỏ nếu trùng luật Đỏ |
| 4 | Mint có Permanent Delegate | Dữ liệu tĩnh của mint | Vàng → Đỏ nếu chính PD đó chuyển/burn trong tx |
| 6 | `mintAuthority` chưa thu hồi | Dữ liệu tĩnh của mint | Vàng |
| 9 | Program ngoài danh sách xác minh | Danh sách instruction | Vàng |
| 8 | Ví nhận mới tạo dưới 24h, nhận giá trị lớn | **Tra cứu ngoài** | Vàng |
| 5 | Mint có Transfer Hook trỏ tới chương trình chưa xác minh | Dữ liệu tĩnh của mint | Vàng |
| 7 | `freezeAuthority` còn hiệu lực và không thuộc người ký | Dữ liệu tĩnh của mint | Vàng |
| 10 | Có bảng tra địa chỉ (ALT) không giải được | Cấu trúc giao dịch | Vàng |

> Bốn luật Đỏ đầu tiên đều là **chênh lệch trạng thái**. Đó không phải trùng hợp — xem mục 1.

### 3.3 Luật 8 và một cái bẫy về fail-safe

Luật 8 là luật **duy nhất** cần gọi RPC thêm (`getSignaturesForAddress`). Nó chậm, và lịch sử RPC có giới hạn nên đôi khi không tra được.

**Quy tắc phân biệt — quan trọng, đừng làm lẫn:**

| Loại thất bại | Xử lý |
|---|---|
| Không decode được instruction, hoặc mô phỏng lỗi | `coverage` giảm, verdict **tối thiểu là `warning`** |
| Tra cứu bổ sung thất bại (tuổi ví) | Luật **không kích hoạt**. Verdict **không** bị đẩy lên warning vì lý do này |

Nếu áp fail-safe cho cả tra cứu bổ sung, **mọi giao dịch sẽ ra Vàng** — và người dùng sẽ học được cách bỏ qua cảnh báo. Sản phẩm bảo mật chết vì mệt mỏi cảnh báo cũng nhanh như chết vì bỏ lọt.

Fail-safe áp cho **đường decode**, không áp cho **đường làm giàu dữ liệu**.

---

## 4 · Bộ kiểm thử

Đầu vào là `data/seed/` do vai D quản (xem `SEED-DATASET.md`). A **đọc, không sửa nhãn**.

```
cho mỗi mẫu trong index.json:
    facts   = L1(fixture)
    ketqua  = L2(facts)
    khẳng định ketqua.level        == mẫu.expected.level
    khẳng định ketqua.reasonCodes  ⊇ mẫu.expected.reasonCodes
    khẳng định facts.coverage tỉ lệ ≥ mẫu.expected.minCoverageRatio
```

**Chỉ số công bố trên sân khấu** — tính riêng, không gộp:

```
Tỉ lệ báo nhầm = số mẫu âm tính provenance="real-mainnet" bị ra Đỏ hoặc Vàng
                 ────────────────────────────────────────────────────────────
                 tổng số mẫu âm tính provenance="real-mainnet"
```

Mẫu `synthetic-devnet` **không** vào mẫu số. Lý do ở `SEED-DATASET.md` mục 0.

---

## 5 · L3 — Ranh giới cho vai C

### 5.1 L3 không bao giờ nhìn thấy giao dịch thô

Đầu vào của L3 **chỉ** là `Facts` và `reasonCodes` từ L2. Không phải base64, không phải mảng byte.

Đây là quyết định chống bịa: mô hình không thể suy diễn về thứ nó không được nhìn. Mọi câu nó viết ra đều truy ngược được về một trường trong `Facts`.

### 5.2 Chữ ký

```ts
function interpret(facts: Facts, reasonCodes: string[], locale: "vi"): {
  detectedPrimaryAction: { type: string; from?: string; to?: string } | null;
  explanation: string;
  aiAdvisory: "review_required" | null;
}
```

**Bốn ràng buộc cứng:**

1. **Không trả về `level`.** Hàm này không có `level` trong kiểu trả về — ranh giới được cưỡng chế bằng kiểu dữ liệu, không bằng lời dặn.
2. Không chắc hành động chính ⇒ trả `null`, không đoán bừa.
3. Gặp program chưa xác minh ⇒ **không suy đoán chức năng của nó**. Chỉ mô tả thay đổi đo được và nói rõ phần không xác định.
4. Lỗi hoặc quá thời gian ⇒ rơi về câu mẫu tiếng Việt cứng theo `reasonCodes`, `aiAdvisory = null`. **`level` không đổi.**

### 5.3 `expectedAction` — quy tắc bất đối xứng

| Tình huống | Xử lý |
|---|---|
| Ví/dApp không cung cấp | Bỏ qua |
| Cung cấp và **lệch** với `detectedPrimaryAction` | `aiAdvisory = "review_required"` |
| Cung cấp và **khớp** | **Không làm gì.** Không giảm verdict, không tắt cảnh báo nào |

dApp độc hại hoàn toàn có thể khai đúng để trông vô hại. Ngữ cảnh chỉ được làm sản phẩm thận trọng hơn.

---

## 6 · Chạy song song từ giờ đầu — dành cho vai B và C

`packages/types` đóng băng ngày 22/8. Kèm theo nó, **A xuất ba `InspectResult` mẫu ngay trong ngày đầu**, viết tay, không cần L1 chạy được:

| Mẫu | Nội dung | B dùng để | C dùng để |
|---|---|---|---|
| `mock-danger.json` | Đỏ, 2 reasonCode, coverage 10/11, có `aiAdvisory` | Dựng màn cảnh báo đỏ | Chỉnh câu chữ |
| `mock-warning.json` | Vàng, coverage 8/11 | Dựng trạng thái thận trọng | |
| `mock-safe.json` | Xanh, coverage 11/11 | Dựng trạng thái bình thường | |

Ba file này là thứ khiến B **không phải chờ A một ngày nào**. Chi phí: khoảng 20 phút của A.

---

## 7 · Thứ tự làm của vai A

| Ngày | Việc | Xong khi |
|---|---|---|
| 22/8 | `packages/types` + ba file mock | B bắt đầu dựng giao diện được |
| 23/8 | L1 bước 2–3: `getMultipleAccounts` + `simulateTransaction`, in ra JSON thô | Nhìn thấy trạng thái trước và sau |
| 24/8 | L1 bước 4: so khớp ra `Facts`, có `tokenAccounts` và `solDelta` | Bảng chênh lệch có dữ liệu thật |
| 25/8 | **Luật 1, 2, 3, 12** — cả bốn đều là chênh lệch trạng thái, cùng một khuôn | Bốn luật Đỏ chạy |
| 26/8 | Bộ kiểm thử chạy trên mẫu đầu tiên của D. Luật 11 | Test chạy được, dù mới vài mẫu |
| 27/8 | Luật 4, 6, 9 — đọc dữ liệu tĩnh của mint | Bảy luật |
| 28/8 | Luật 8 + giải ALT + tính `coverage` | Chín luật, coverage đúng |
| 29/8 | Chạy toàn bộ dataset, sửa false positive | Có con số báo nhầm thật |
| 30/8 | Đóng gói SDK `custos.inspect()`, khoá engine | **Cổng 30/8** |

> Xếp bốn luật Đỏ vào cùng một ngày là có chủ đích: chúng dùng chung một khuôn *so sánh trước/sau*. Làm rời rạc sẽ viết lại cùng một đoạn logic bốn lần.

**Nếu chậm tiến độ, cắt theo thứ tự:** luật 8 (cần RPC thêm) → luật 9 → luật 4 và 6. **Không bao giờ cắt luật 1, 2, 3, 12** — đó là bốn luật Đỏ, và không có chúng thì demo không có verdict để hiện.
