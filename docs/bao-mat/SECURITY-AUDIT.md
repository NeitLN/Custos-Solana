# Audit bảo mật Custos — vòng 1

| | |
|---|---|
| Commit được audit | `92cca153f62dd6451b9a5f20cf9c6c0ee3f844d6` (`main`) |
| Ngày | 21/08/2026 |
| Môi trường | Windows · Node v24.12.0 · npm 11.6.2 |
| Baseline | `npm run check` → **167/167 PASS**, worktree sạch |
| Cohort đo | 20 chữ ký mainnet cố định, ghi tại `data/seed/cohort-audit.json` |

Baseline cohort: coverage **53 %** · coverage lệnh chạm tài sản **21 %** (26/122) ·
verdict Đỏ/Vàng/Xanh = **0/20/0** · cáo buộc **0** · cảnh báo không có mã lý do **0**.

> README ghi coverage 46 %. Cohort này ra 53 %. Hai mẻ mẫu khác nhau, không mâu
> thuẫn — nhưng nó cho thấy vì sao mọi so sánh trước/sau phải dùng cùng cohort.

---

## Nguyên nhân gốc chung của ba phát hiện nặng nhất

`Facts` **không có cách biểu diễn "không biết"**. Nó chỉ có "không có".

Khi L1 không lấy được trạng thái sau của một account — vì bị cắt ở trần 100, vì
RPC không trả dữ liệu, hoặc vì bảng tra địa chỉ chưa giải — giá trị rơi về `null`
rồi được đọc như *"account trống, số dư 0, không đổi chủ"*. Không có tín hiệu nào
đi kèm nói rằng phép đo đã khuyết.

Hệ quả xuất hiện ở cả hai chiều: bỏ lọt tấn công (`safe`) **và** bịa ra mất mát
không có thật (`500.000.000 → 0`). Cả hai đều vi phạm quyết định đã khoá số 4
(*không đủ dữ liệu ⇒ warning, không bao giờ safe*) và số 7 (*bảng chênh lệch
hiển thị đúng những gì giao dịch làm*).

Mọi bản vá P0 phải sửa nguyên nhân này, không chỉ vá từng triệu chứng.

---

## F1 · Native SOL gần như không được bảo vệ

```text
ID:            F1
Severity:      Critical
Status:        CONFIRMED
Affected:      packages/core/src/diff.ts:90-98
               packages/core/src/l2/rules.ts  (không luật nào đọc solDelta)
```

**Tái hiện** — sáu ca dựng bằng `Facts` fixture, chạy qua `danhGia` và `dungBangChenhLech`:

| Ca | Kết quả quan sát | Đánh giá |
|---|---|---|
| 1. Chỉ phí mạng 5000 lamports | `safe` · `Phí mạng 0 → −0,000005 SOL` | đúng |
| 2. Chuyển 0,1 SOL hợp lệ | `safe` · `Phí mạng 0 → −0,100005 SOL` | **nhãn sai** — phí và khoản chuyển gộp làm một |
| 3. Rút 5 SOL | **`safe`** · mã **rỗng** · `Phí mạng 0 → −5,0 SOL` `[info]` | **Critical** |
| 4. Rent tạo ATA | `safe` · `Phí mạng 0 → −0,00204428 SOL` | nhãn sai, hậu quả lành |
| 5. Đóng account, hoàn rent | `safe` · `Phí mạng 0 → 0,00203428 SOL` | phí **dương** — vô nghĩa |
| 6. Wrapped SOL rời ví | `danger` · `SPL_SET_AUTHORITY__ACCOUNT_OWNER` | bắt được, nhưng nhờ đổi chủ chứ không nhờ SOL |

**Root cause.** `diff.ts` lấy `facts.solDelta[facts.signer]` — chênh lệch lamport thô
của người ký — rồi gán cứng nhãn `"Phí mạng"` và `severity: "info"`. Không có bước
tách phí thật khỏi phần còn lại. Song song đó, cả mười hai luật L2 chỉ đọc
`tokenAccounts` và `accounts.programOwner`; **không luật nào đọc `solDelta`**.

**Ảnh hưởng.** SOL là tài sản phổ biến nhất trên mạng này, và drainer rút SOL là kiểu
lừa thường gặp nhất. Với giao dịch chỉ rút SOL, Custos nói *"Bình thường"* và trình
bày khoản mất như phí mạng.

---

## F1b · Custos bảo vệ NGƯỜI TRẢ PHÍ, không phải người dùng

*Phát hiện mới — không nằm trong sáu phát hiện được cung cấp.*

```text
ID:            F1b
Severity:      Critical
Status:        CONFIRMED
Affected:      packages/core/src/l1/fetch.ts:66   const signer = msg.staticAccountKeys[0]
               kéo theo toàn bộ l2/rules.ts và diff.ts
```

**Tái hiện.**

| Ca | Kết quả | Đánh giá |
|---|---|---|
| 7. dApp trả phí · người dùng là signer #2 bị rút 5 SOL | **`safe`** · mã rỗng · bảng chỉ hiện phí 0,000005 SOL của dApp | **Critical** |
| 8. dApp trả phí · token account của người dùng **đổi chủ** | **`safe`** · mã rỗng · không có dòng nào về vụ đổi chủ | **Critical** |

**Root cause.** `signer` được suy ra bằng `staticAccountKeys[0]`, tức **fee payer**.
Mọi thứ phía sau khoá theo giá trị đó: `cuaNguoiKy`, `chamTaiSanNguoiKy`, điều kiện
`t.ownerBefore === f.signer` của luật 1, 2, 3, và dòng phí trong bảng chênh lệch.

Trong giao dịch được tài trợ phí — mô hình hợp lệ và đang phổ biến — fee payer
**không phải** người dùng. Ví vẫn hỏi người dùng ký, Custos vẫn chạy, và mọi luật
bảo vệ đều đang nhắm vào ví của dApp.

Đây cũng là một cách dựng tấn công: kẻ tấn công tự đứng tên trả phí.

**Lưu ý phạm vi.** Chỉ ví hoặc dApp mới biết địa chỉ nào là người dùng. SDK không tự
suy ra được. Cần một đường truyền ngữ cảnh, và mặc định phải an toàn khi vắng ngữ cảnh.

---

## F2 · Cắt âm thầm ở account thứ 101

```text
ID:            F2
Severity:      Critical   (báo cáo ban đầu ước lượng thấp hơn)
Status:        CONFIRMED
Affected:      packages/core/src/l1/fetch.ts:17,123
               packages/core/src/l1/coverage.ts  (chỉ đếm instruction)
```

**Tái hiện.** Giao dịch tổng hợp 131 account tĩnh, 130 account writable. Account của
người ký ở vị trí 129 bị `SystemProgram.assign` giao sang chương trình của kẻ tấn công.

```text
simulateTransaction được hỏi 100 địa chỉ
có hỏi account nạn nhân không? KHÔNG
accounts theo dõi được : 100 / 131
coverage               : 1/1        <- báo ĐẦY ĐỦ
verdict                : safe
mã lý do               : (không có)
```

Chạy lại với nạn nhân là **tài khoản token** thì bắt được — vì `uuTien` xếp tài khoản
token lên trước lát cắt. Nhưng account **thường** rơi vào `conLai` và bị cắt. Đó đúng
là vector `SystemProgram.assign` của luật 12, tức ca Coinspect.

**Root cause.** `simIdx = [...uuTien, ...conLai].slice(0, MAX_SIM_ACCOUNTS)` bỏ phần dư
mà không ghi lại. `computeCoverage` chỉ đếm instruction nên không phản ánh được việc
trạng thái account bị khuyết. Không có mã lý do, không có fail-safe.

**Trả lời trực tiếp câu hỏi ở mục IV:** *"transaction có instruction coverage đầy đủ
nhưng account state bị cắt có thể ra `safe` không?"* — **Có. Đã tái hiện.**

---

## A1 · `simulateTransaction` trả `accounts: null` ⇒ bịa ra mất mát

*Phát hiện mới — không nằm trong sáu phát hiện được cung cấp.*

```text
ID:            A1
Severity:      Critical
Status:        CONFIRMED
Affected:      packages/core/src/l1/fetch.ts:143-155, 195-218
```

**Tái hiện.** RPC trả `{ err: null, accounts: null }` — mô phỏng thành công nhưng không
kèm dữ liệu account. Trạng thái trước có một tài khoản token 500 token.

```text
simulationOk : true
verdict      : safe | mã: (RỖNG)
coverage     : 1/1
bảng chênh lệch:
   Số dư …yMtV sau khi ký : 500.000.000 → 0   [info]
   Phí mạng               : 0 → −5,0 SOL      [info]
```

Sản phẩm **vừa nói "Bình thường" vừa hiển thị người dùng mất sạch số dư**, và cả hai
đều sai. Con số `500.000.000` còn hiển thị thô vì không lấy được `decimals`.

**Root cause.** Chính nguyên nhân gốc chung: `after[k] === null` được đọc như *"account
không tồn tại, số dư 0"* thay vì *"chưa đo được"*.

---

## A2 · Fail-safe 1 tạo cảnh báo KHÔNG có mã lý do

*Phát hiện mới.*

```text
ID:            A2
Severity:      Medium
Status:        CONFIRMED
Affected:      packages/core/src/l2/evaluate.ts  (fail-safe 1)
```

Mô phỏng hỏng ⇒ `warning` với `reasonCodes: []`. Giao diện hiện cảnh báo mà không nói
được vì sao, và bên tích hợp không có mã nào để phân loại hay ghi log.

Fail-safe 2 và 3 đều đã có mã (`PROGRAM_CHUA_XAC_MINH`, `ALT_KHONG_GIAI_DUOC`).
Fail-safe 1 là chỗ duy nhất còn khuyết.

---

## F3 · Luật Permanent Delegate chưa biết ai thực hiện Transfer

```text
ID:            F3
Severity:      Medium
Status:        CONFIRMED
Affected:      packages/core/src/facts.ts   InstructionFact.decoded chỉ có { kind }
               packages/core/src/l2/rules.ts  luật 4 luôn Vàng
```

Đã ghi sẵn là giới hạn đã biết trong `rules.ts` và `SEED-DATASET.md` mục 0c. Hành vi
hiện tại **đúng theo chính sách**: giữ Vàng thay vì đoán. Không phải lỗi, là việc chưa làm.

Dữ liệu cần thì có sẵn: lệnh tầng ngoài có `accountKeyIndexes`, lệnh CPI có mảng
`accounts` từ kết quả mô phỏng. Với SPL Token `Transfer`, authority là account thứ ba.

---

## F4 · Coverage

```text
ID:            F4
Severity:      Medium
Status:        CONFIRMED — đo lại trên checkout hiện tại
```

Cohort 20 giao dịch: coverage **53 %**, lệnh chạm tài sản người ký **21 %** (26/122).

Con số 21 % thấp hơn mức chung, nghĩa là phần chưa đọc hiểu tập trung đúng vào phần
đang di chuyển tài sản. Đã ghi trong `SEED-DATASET.md` mục 0b4.

---

## F5 · Ba mức diễn đạt

```text
ID:            F5
Severity:      Low
Status:        CONFIRMED
```

`DAC-TA-L3.md` mục 6 đặc tả ba mức. Hiện chỉ có một mức, xấp xỉ mức "Đầy đủ". Không có
mã nào liên quan tới mức diễn đạt trong `packages/ai/src/`.

Đặc tả ghi *"thiếu thời gian thì cắt mức 3 trước, không cắt mức 2"* — mức đang có đúng
là mức phải giữ.

---

## F6 · Model layer chưa chạy thật

```text
ID:            F6
Severity:      Low  (không chặn P0/P1)
Status:        CONFIRMED · BLOCKED_BY_SECRET
```

Không có `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CUSTOS_MODEL_KEY` hay `GOOGLE_API_KEY`
trong environment. Adapter và test đối kháng đã có (`packages/ai/test/moHinh.test.ts`).
Chưa từng chạy với mô hình thật lần nào.

---

## Bảng ưu tiên

| # | ID | Severity | Vì sao thứ tự này |
|---|---|---|---|
| 1 | **A1** | Critical | Nguyên nhân gốc chung. Sửa trước thì F2 và một phần F1 rẻ hơn hẳn |
| 2 | **F2** | Critical | Cùng nguyên nhân gốc; cần thêm biểu diễn "đo khuyết" |
| 3 | **F1** | Critical | Độc lập; cần fact phí riêng và luật SOL |
| 4 | **F1b** | Critical | Cần ngữ cảnh từ ví; phải mở rộng `InspectOptions` tương thích ngược |
| 5 | **A2** | Medium | Rẻ, làm kèm khi đụng `evaluate.ts` |
| 6 | **F3** | Medium | P1 — cần mở rộng `InstructionFact` |
| 7 | **F4** | Medium | P1 — decoder, phụ thuộc nguồn IDL đáng tin |
| 8 | **F5** | Low | P2 |
| 9 | **F6** | Low | P2, BLOCKED_BY_SECRET |

**Không có phát hiện nào NOT REPRODUCED.** Ba phát hiện mới: **F1b**, **A1**, **A2**.
Mức độ của **F2** nặng hơn báo cáo ban đầu — Critical, không phải High.
