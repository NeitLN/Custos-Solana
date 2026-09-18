# Ma trận hành vi Solana — cái gì đã kiểm, cái gì chưa

**Việc TB-B03.** Ma trận gốc ở mục 16 của [`docs/roadmap/ROADMAP-TECHNICAL-CUSTOS.md`](../roadmap/ROADMAP-TECHNICAL-CUSTOS.md).

Trang này trả lời một câu hỏi hẹp hơn bảng số liệu:

> **Mỗi hành vi Solana mà Custos đang quảng bá — có ca dương, có ca đối chứng gần
> giống, và bằng chứng đó ở tầng nào?**

Ba chữ dưới đây mang ba nghĩa khác nhau, và trộn chúng là cách nói quá dễ nhất:

| Chữ | Nghĩa |
|---|---|
| **đọc được** | L1 bóc được trường đó ra khỏi dữ liệu chuỗi |
| **kiểm được** | có ca dương **và** ca đối chứng, chạy trong `npm run check` |
| **hỗ trợ** | không dùng ở trang này — nó gộp cả hai nghĩa trên và che mất khoảng cách |

---

## 1 · Mười chín họ ca

Cột **Bằng chứng** ghi nơi bài kiểm nằm. Cột **Tầng** dùng đúng ba tầng của
[`BENCHMARK.md`](../BENCHMARK.md) mục 3.1b: `l2-facts` (Facts đóng băng làm đầu vào) ·
`l1-replay` (fixture RPC → `extractFacts` sản xuất) · `devnet-live` (chưa chạy).

| # | Họ ca | Ca dương | Đối chứng | Bằng chứng | Tầng |
|---|---|---|---|---|---|
| 1 | Chuyển token | R01-pos, R11-pos | R01-neg, R11-neg | `l2.test.ts`, `hauQua.test.ts` | l1-replay |
| 2 | Đổi owner | R01-pos, R02-pos | R01-neg, R02-neg | `l2.test.ts`, `authority.test.ts` | l1-replay |
| 3 | Delegate | R03-pos | R03-neg + 10 ca âm | `l2.test.ts` | l1-replay |
| 4 | Token-2022 | R04-pos, R05-pos | R04-neg, R05-neg | `l2.test.ts`, `l1.test.ts` | l1-replay |
| 5 | System account | R12-pos, R13-pos | R12-neg, R13-neg | `l2.test.ts`, `sol.test.ts` | **l2-facts** cho R13 |
| 6 | CPI / inner instruction | có | có | `l1.test.ts`, `templates.test.ts` | l1-replay |
| 7 | ALT / v0 | R10-pos | R10-neg | `l2.test.ts`, `replayRpc.test.ts` | l1-replay |
| 8 | **Legacy** | — | — | `legacyTx.test.ts` **(mới)** | offline |
| 9 | Nhiều signer | R14-pos | R14-neg | `l2.test.ts` | **l2-facts** |
| 10 | Dữ liệu thiếu | có | có | `l1.test.ts`, `moHinh.test.ts` | l1-replay |
| 11 | Mô phỏng lỗi | R09-pos, R10-pos | R09-neg | `chay-replay.ts`, `l1.test.ts` | l1-replay |
| 12 | Unknown program | R09-pos | R09-neg | `l2.test.ts` | l1-replay |
| 13 | IDL | có | có | `bangChungTichHop.test.ts` | offline |
| 14 | Metadata / symbol giả dạng | có | có | `cheNhayCam.test.ts`, `l1.test.ts` | offline |
| 15 | L3 | có | có | `boiThoiHanC05.test.ts`, `moHinh.test.ts` | offline |
| 16 | Handoff | có | có | `yeuCauNgoai.test.ts` (7 bài) | offline |
| 17 | Gửi / xác nhận | có | có | `gui.test.ts` (18), `c03Race.test.ts` (8) | offline |
| 18 | Freshness | có | có | `neo.test.ts` (15) | offline |
| 19 | Kích thước / số | có | có | `moHinh.test.ts`, `yeuCauNgoai.test.ts` | offline |

**14/14 luật L2 đều có ca dương và ca đối chứng gần giống.** Con số đó không phải
thành tích mới của B03 — nó đã đúng từ trước, và việc của thẻ này là **kiểm lại** thay
vì tin báo cáo cũ.

---

## 2 · Ba ô mà rà lại thấy thiếu

### 2.1 · Legacy — hành vi đúng, không bài nào khoá

Cả repo **không có một dòng mã nào** nhắc tới chữ `legacy`. Đo trước khi viết test:

| Đo | Kết quả |
|---|---|
| `VersionedTransaction.deserialize` với byte legacy | **nhận**, trả `version === "legacy"` |
| `message.addressTableLookups` | `[]` — mảng rỗng, không phải `undefined` |
| `extractFacts` | chạy trọn: `nguoiKy` 1, `instructions` 1, coverage **1/1** |

Nên đây **không phải bản vá**. `legacyTx.test.ts` khoá một hành vi đang đúng, kèm một
bài canh rằng legacy **không** tốn lượt RPC hỏi ALT. Phạm vi ghi đúng chữ của ma trận:
legacy được hỗ trợ **qua bề mặt API `VersionedTransaction`**, không phải qua một đường
riêng.

### 2.2 · Cancel — lỗi thật, đã tái hiện và đã sửa

Ô *"Gửi/xác nhận · double-click, late completion, cancel"* có hai vế đầu được
`c03Race.test.ts` canh từ TB-C03. Vế **cancel** thì không.

Rà ra một lỗi chưa ai biết. `onHuy` dọn màn hình nhưng **không đụng `luotRef`**, nên
lượt `inspect()` đang bay vẫn thoả `conDung()`. Đo được ở `probe-race-c03.ts` ca
**C03-e**:

```
sau khi huỷ: ketQua=danger  txCho=giao-dich-A  neo=luot-1
```

`txCho` và `neo` là **đúng hai thứ** `kyVaGui` đòi trước khi cho ký. Nên hậu quả không
dừng ở giao diện nhấp nháy: người dùng bấm *"Chặn & huỷ giao dịch"* trên một giao dịch
Đỏ, rồi một giây sau nút Ký sống lại trên chính giao dịch đó.

Bản sửa thêm `luotRef.current++` và `neoRef.current = null` vào `onHuy` — cùng thứ
tiếng mà lượt kiểm mới đã dùng để nói *"kết quả lượt cũ không còn áp dụng"*. Ca
**C03-f** đo cách đúng và đạt. Guard đã mutation hai hướng: gỡ dòng nào cũng đỏ.

### 2.3 · Token-2022 — **2/26 extension**, và đây là khoảng cách lớn nhất trang này

Nghiệm thu thẻ đòi *"ghi rõ Token-2022 extension nào kiểm được/chưa kiểm"*. Đo bằng
`ExtensionType` của `@solana/spl-token`:

| | Số | Extension |
|---|---|---|
| **Đọc được** | **2** | `PermanentDelegate` (luật 4) · `TransferHook` (luật 5) |
| **Không đọc** | **23** | `TransferFeeConfig`, `MintCloseAuthority`, `ConfidentialTransferMint`, `DefaultAccountState`, `MemoTransfer`, `NonTransferable`, `InterestBearingConfig`, `CpiGuard`, `MetadataPointer`, `TokenMetadata`, `GroupPointer`, `ScaledUiAmountConfig`, `PausableConfig`, `PermissionedBurn`, … |

**Điều nguy hiểm không phải con số 2, mà là cách 23 cái kia đi qua.** Đo được:

```
mint có TransferFeeConfig → parseMint trả:
  { permanentDelegate: null, transferHookProgramId: null, isToken2022: true, … }
```

`parseMint` **không** ném và **không** trả `null` — nó trả một `MintFact` hợp lệ trông
y hệt một mint trơn. `Facts` không có trường nào nói *"mint này còn extension tôi không
đọc"*, và `computeCoverage` chỉ đếm **instruction**, không đếm extension. Nên một mint
có `PausableConfig` hay `TransferFeeConfig` đi qua với coverage đầy đủ và verdict không
biết gì.

Đó đúng là thứ ma trận gọi là *"tách biết tính năng và biết hành vi"* — và hiện Custos
**không tách được**. Ghi ở đây thay vì sửa, vì vá đúng cách là thêm một trường Facts
mới (`extensionKhongDoc`) và một luật L2 dùng nó; cả hai nằm ngoài phạm vi B03, và
thêm một luật thứ 15 lúc này đổi giao kèo kiểu đã đóng băng.

**Hệ quả cho lời quảng bá:** [`README.md`](../../README.md) ô rubric 30 % ghi
*"Token-2022"* trần. [`packages/core/README.md`](../../packages/core/README.md) ghi
*"Token-2022 (permanent delegate, transfer hook)"* — chỗ thứ hai trung thực, chỗ đầu
là nhãn trần. Sửa chỗ đầu chứ không nới chỗ sau.

---

## 3 · Hai ca dương chỉ có Facts dựng tay

Thẻ nói *"ưu tiên bằng chứng raw transaction + RPC replay cho L1 thay vì chỉ dựng
Facts"*. Đếm thật: **12/14** ca dương có cả raw tx lẫn fixture replay. Hai cái còn lại:

| Ca | Luật | Vì sao chưa có tx |
|---|---|---|
| `R13-pos` | `SOL_ROI_VI` | cần ví có số dư và một khoản SOL rời đi **vượt 50 %** — dựng được trên devnet, chưa dựng |
| `R14-pos` | `NGUOI_DUNG_KHONG_RO` | cần giao dịch **≥ 2 người ký** và ví không khai `nguoiDung` — dựng được, chưa dựng |

Cả hai **dựng được**, không phải không dựng được. Ghi là việc còn lại chứ không ghi là
giới hạn kỹ thuật — hai thứ đó khác nhau, và gọi nhầm là tự cho mình một cái cớ.

---

## 4 · Điều ma trận này KHÔNG nói

- **Không nói tỉ lệ phát hiện.** Mọi ca ở đây do đội tự dựng để kiểm luật của chính
  đội. Hợp lệ để chống hồi quy, **không** thay được dữ liệu độc lập — xem
  [`BENCHMARK.md`](../BENCHMARK.md) mục 1.
- **Không nói `devnet-live`.** Cột tầng có giá trị `devnet-live` ở **0** họ ca: TB-B07
  chưa chạy.
- **Không nói L1 đúng trên mainnet.** 10 mẫu `real-mainnet` chưa có fixture replay —
  lý do ở `BENCHMARK.md` mục 3.1b.
