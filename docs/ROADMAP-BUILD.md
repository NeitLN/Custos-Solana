# Roadmap build — hoàn thiện Custos

Lập ngày 23/08/2026. Nguồn: `docs/bao-mat/REMEDIATION-REPORT.md` mục *Vấn đề chưa
giải quyết*, cộng những gì đo được trên mainnet hôm nay.

## Số đo hiện tại — mốc để so

| | |
|---|---:|
| Test | 218 PASS |
| Luật | 14 |
| Coverage trung bình | **74 %** |
| Coverage lệnh **chạm tài sản người ký** | **70 %** |
| Verdict Đỏ sai trên cohort | 0 |
| Cảnh báo mang tính cáo buộc | 0 |

Con số chạm-tài-sản vừa nhảy từ 37 % lên 70 % nhờ một phát hiện: RPC **tự phân
giải** lệnh CPI của chương trình nó biết và trả `parsed.type` thay vì `data` thô.
Đường decode cũ chỉ đọc `data` nên bỏ qua 42/42 lệnh SPL Token trong CPI.

## Nguyên tắc chọn việc

1. **An toàn trước, con số sau.** Một lỗ bỏ lọt đáng sửa hơn năm điểm coverage.
2. **Không đoán.** Mọi bảng mã lệnh phải có nguồn: IDL trên chuỗi, enum của thư
   viện chính thức, hoặc bố cục có tài liệu. Không có nguồn thì để "chưa đọc hiểu".
3. **Đo trên cùng cohort, một lượt.** Đã suýt công bố nhầm +5 điểm vì so chéo hai
   mẻ mẫu — xem `SEED-DATASET.md` mục 0b3.
4. **Mỗi thay đổi phải có ca âm tính.** Sửa quá tay là cách tạo mệt mỏi cảnh báo.

---

## P0 — An toàn và trung thực hiển thị

### P0-A · Wrapped SOL chưa được đối chiếu — LỖ HỔNG

**Vấn đề.** wSOL là SOL bọc trong một tài khoản token: số dư token **chính là**
lamport nằm trong tài khoản đó. Custos hiện xử lý nó như một token bình thường.

Hệ quả cụ thể: đóng tài khoản wSOL của người dùng và gửi lamport đi chỗ khác thì
- luật 13 (SOL rời ví) đọc `solDelta[signer]` — **không thấy**, vì lamport nằm ở
  địa chỉ tài khoản token, không phải ví người ký;
- luật 11 (outflow) đòi **từ hai loại tài sản trở lên** — một mình wSOL không đủ.

**ĐÃ XÁC MINH — tái hiện được, và lỗi đi CẢ HAI CHIỀU:**

```
BỎ LỌT  · đóng tài khoản wSOL 5 SOL, lamport về ví lạ
          verdict: safe · mã lý do: RỖNG · 5 SOL biến mất không một lời nào

KÊU OAN · bọc 5 SOL thành wSOL để swap (ví mất 5 SOL, wSOL tăng 5 SOL)
          luật 13 gắn cờ, trong khi người dùng không mất gì
```

**Đã sửa 23/08.** Luật 13 giờ tính trên TỔNG SOL người dùng kiểm soát — lamport
trong ví cộng wrapped SOL. Bọc và mở gói chỉ đổi hình dạng nên tổng không đổi;
lamport chảy ra ngoài thì tổng giảm thật. Cả hai lỗi tự đúng.

**Review sau khi sửa tìm thêm một mong manh do CHÍNH bản vá tạo ra.** Luật 13 giờ
đọc `facts.accounts`, trong khi bản trước đọc `solDelta`. Hai nguồn này hiện luôn
đi cùng nhau (cùng lọc theo `afterByIndex` trong `l1/fetch.ts`) nên không sai được
hôm nay — nhưng nếu một lần refactor làm chúng lệch, hậu quả là luật 13 **im lặng**.
Đã thêm nhánh dựng lại từ `solDelta`, kèm test bất biến.

**Files:** `sol.ts` (mới), `l2/rules.ts`, `packages/ai/src/templates.ts`
**Thực tế:** ~2 giờ

### P0-B · Bảng chênh lệch lẫn lộn "số dư" với "mức thay đổi"

**Vấn đề.** Đo được trên mainnet hôm nay:

```
Số dư HSZC…7mDi sau khi ký | 0,0          -> 16.689,81168      (số dư -> số dư)
Chuyển SOL đi              | 1,894850064  -> −0,026147526 SOL  (số dư -> MỨC THAY ĐỔI)
Phí mạng (ước tính)        | 0            -> −0,000014999 SOL  (0 giả -> mức thay đổi)
```

Ba dòng, ba quy ước khác nhau, trên **cùng một bảng**. Đây là màn hình sắp đem đi
đo mức độ hiểu của 12 người.

**Review tìm thêm một lỗi nặng hơn ở cùng chỗ.** Ca đóng tài khoản wSOL cho ví lạ:

```
verdict : warning · SOL_ROI_VI          <- luật nói mất 5 SOL
BẢNG    : Số dư SOL  5,0 -> 0,0  [info] <- bảng tô màu THÔNG TIN
          (không có dòng "Chuyển SOL đi" nào)
```

Verdict nói nguy, bảng nói bình thường. Nguyên nhân: `severity` của dòng token
tính bằng `coHitO(t.address)` — dò xem có luật nào nhắc tới **địa chỉ tài khoản**
đó không. Luật 13 nói về SOL của người dùng chứ không nhắc địa chỉ ATA nào, nên
dòng wSOL không bao giờ được tô đỏ.

**Acceptance:**
- Mọi dòng dùng chung một quy ước: `trước → sau`, cả hai là **số dư**
- Dòng không phải số dư (phí, phần chưa đọc được) dùng `—` ở cột trái
- Luật 13 kích hoạt ⇒ dòng SOL phải là `danger`, không được là `info`
- Ca chỉ có phí: verdict không đổi, không có dòng nào bị tô đỏ
- Test khoá quy ước VÀ khoá liên kết luật↔màu

**XONG 23/08.** Một dòng `Tổng SOL của bạn` duy nhất, gộp cả wrapped SOL. Màu lấy
thẳng từ `hits.some(h => h.ruleId === 13)` thay vì dò chuỗi địa chỉ. Dòng không
phải số dư dùng `—` ở cột trái.

**Làm xong mới lộ thêm hai thứ:**

1. **Nhãn trùng tiền tố.** `"Số dư SOL của bạn"` bắt đầu bằng `"Số dư "`, mà
   `mucNgan.ts` phân loại dòng bằng `startsWith` — nên dòng SOL rơi nhầm vào
   nhánh token và được đọc thành *"một token tên SOL của bạn"*. Đã đổi thành
   `"Tổng SOL của bạn"`, và thêm test bất biến: **không nhãn nào được là tiền tố
   của nhãn khác**.

2. **`phiUocTinh` là cận dưới nên dòng SOL hiện cả khi chỉ trả phí.** Đo mainnet:
   phí thật 5203 lamport, ước tính 5000 → chênh 203 lamport vẫn vượt ngưỡng nên
   dòng hiện ra. Không sai, nhưng nhiễu. Sinh ra mục **P1-G**.

**Files:** `diff.ts`, `sol.ts`, `mucNgan.ts`, test
**Thực tế:** ~2,5 giờ

### ~~P0-C~~ → **P1-C** · Rent bị gọi nhầm là khoản chuyển

**Vấn đề.** Tạo tài khoản token tốn ~0,002 SOL tiền rent — đó là **tiền đặt cọc
lấy lại được**, không phải khoản chuyển đi. Đóng tài khoản thì được hoàn. Hiện cả
hai gộp vào "Chuyển SOL đi" và "Nhận SOL".

Trong giao dịch mainnet ở trên: hai lệnh `createAtaIdempotent` + một `closeAccount`
— một phần của 0,026 SOL là rent, phần còn lại mới là tiền mua thật.

**HẠ ƯU TIÊN sau review, vì hai lý do.**

**Một — thiết kế tôi ghi ban đầu KHÔNG chạy được.** Tôi viết "suy ra từ chính danh
sách lệnh". Nhưng RPC trả lệnh CPI ở dạng `parsed.type`, **không kèm số lamport**.
Lệnh `createAccount` trong CPI chỉ cho biết *có tạo tài khoản*, không cho biết
*bao nhiêu tiền*. Muốn số chính xác phải đọc chênh lệch lamport của tài khoản mới
tạo — tức đọc trạng thái, không đọc lệnh. Phải thiết kế lại.

**Hai — P0-B đã hoá giải phần lớn tác hại.** Cái sai không phải con số, mà là
nhãn: gọi tiền đặt cọc là "Chuyển SOL đi". Sau P0-B, bảng hiện `Số dư SOL: trước →
sau`, và đó là **sự thật** — người dùng thật sự đang có ít SOL hơn, dù lấy lại
được sau. Không còn nhãn nào nói sai nữa.

Còn lại là tinh chỉnh: tách riêng dòng cho biết phần nào lấy lại được.

**Cách làm mới:** rent = lamport nằm trong các tài khoản **mới tạo trong chính
giao dịch này** (`programOwnerBefore === null` mà `programOwnerAfter !== null`).
Đọc từ trạng thái, không đọc từ lệnh.

**Files:** `diff.ts`, `sol.ts`
**Ước:** 2 giờ

---

## P1 — Coverage, có nguồn thẩm quyền

### P1-D · Bảng mã lệnh SPL Token sinh TỪ ENUM CỦA THƯ VIỆN

**Vấn đề.** Bảng 25 mã lệnh trong `decode.ts` hiện **viết tay**. Hai rủi ro: chép
sai một dòng, và Token-2022 có mã 25–46 chưa có dòng nào.

**Cách làm.** `@solana/spl-token` export sẵn enum `TokenInstruction` với đủ mã tới
46 (`InitializeMintCloseAuthority`, `TransferFeeExtension`, …, `PermissionedBurnExtension`).
Sinh bảng từ đó thì **không bao giờ lệch khỏi thư viện**, và tự có luôn extension.

**Đã kiểm chứng trong review:** enum có **44 mã**. Tám mã đối chiếu thử
(0, 3, 6, 9, 12, 17, 21, 24) đều khớp chính xác tên viết tay sau khi đổi
camelCase. Rủi ro thấp, ước lượng giữ nguyên.

**Acceptance:**
- Bảng sinh từ enum, không còn dòng viết tay
- Test đối chiếu lại: mọi mã trong enum phải decode được
- Mã ngoài enum vẫn trả `null`
- Đo cohort trước/sau **một lượt**

**Files:** `l1/decode.ts`, test
**Ước:** 1–2 giờ

### P1-G · Phí mạng CHÍNH XÁC thay vì cận dưới

**Từ P0-B.** `phiUocTinh` hiện chỉ tính chắc phần phí cơ bản; phí ưu tiên đòi cả
`setComputeUnitPrice` lẫn `setComputeUnitLimit` mới suy ra được. Hệ quả đo được:
phí thật 5203 lamport trong khi ước tính 5000, nên dòng `Tổng SOL của bạn` hiện
ra cho một thay đổi 203 lamport — nhiễu, và nhãn phải kèm chữ "(ước tính)".

**Cách làm.** RPC có `getFeeForMessage` trả phí **chính xác** cho một message.
Một lượt gọi, và bỏ được luôn chữ "(ước tính)".

**XONG 23/08.** Kiểm trên bốn giao dịch mainnet: `getFeeForMessage` khớp **từng
lamport** với `meta.fee` thật, kể cả các ca có phí ưu tiên (36999, 33763, 8213)
mà công thức ước tính cũ không tính nổi.

Thêm `Facts.phiChinhXac`. Nhãn là `Phí mạng` khi lấy được số chính xác, `Ước tính
phí mạng` khi phải lui về cận dưới — trình bày một cận dưới như số chính xác là
loại nói quá mà sản phẩm này cấm.

**Hai thứ lộ ra khi làm:**

1. **Test bất biến nhãn bắt lỗi của chính tôi.** Đặt `PHI_UOC` là
   `"Phí mạng (ước tính)"` — bắt đầu bằng `"Phí mạng"`. Test thêm ở P0-B đỏ ngay.
   Đổi thành `"Ước tính phí mạng"`.

2. **`.catch()` không đỡ được method không tồn tại.** Connection giả trong test
   không có `getFeeForMessage`, và gọi `undefined(...)` ném **đồng bộ** trước khi
   có promise nào. Phải bọc `try` trong hàm async. RPC cũ hoặc connection rút gọn
   của bên tích hợp đều rơi vào đây.

**Tối ưu:** lượt gọi khởi động NGAY từ đầu `extractFacts` vì nó chỉ cần `msg`,
chạy song song với mô phỏng nên không cộng thêm thời gian chờ nào cho người dùng.

**Files:** `l1/fetch.ts`, `facts.ts`, `diff.ts`, test
**Thực tế:** ~1 giờ

### P1-E · Thu thêm IDL trên chuỗi

Khảo sát 30 giao dịch hôm nay: các chương trình nặng ký đã decode hết. Còn đuôi
dài, mỗi cái 2–5 lệnh. Ứng viên có discriminator Anchor:

| Chương trình | Lệnh | Dấu hiệu |
|---|---:|---|
| `CAMMCzo5YL8w…` | 5 | `global:swap`, `global:swapV2` |
| `3QUnrcMqCQoi…` | 3 | `global:swap` |

**Acceptance:** chỉ thêm chương trình **có IDL trên chuỗi**. Không có IDL thì
không thêm — quy tắc đã khoá.

**Files:** `scripts/tao-bang-idl.ts` (chỉ thêm địa chỉ), `bang-idl.ts` sinh lại
**Ước:** 1 giờ

---

## P2 — Trình bày

### P2-F · Mức diễn đạt Kỹ thuật (mức 3)

`DAC-TA-L3.md` mục 6 đặc tả ba mức. Mức Ngắn và Đầy đủ đã có. Mức Kỹ thuật liệt kê
lệnh, mã lý do, chương trình chưa xác minh.

Đặc tả ghi rõ: *"thiếu thời gian thì cắt mức 3 trước, không cắt mức 2."* Nên nó
đứng cuối.

**Files:** `packages/ai/src/mucKyThuat.ts`, `CanhBao.tsx`
**Ước:** 2 giờ

---

## Cố ý KHÔNG làm

| Việc | Vì sao |
|---|---|
| Tự sửa hạn chế `nguoiDung` | Chỉ ví mới biết địa chỉ người dùng. SDK không suy ra được — đã ghi rõ trong tài liệu tích hợp |
| Thêm chain khác (Arc, Stellar) | Ngoài phạm vi đã khoá. Dùng cho slide mở rộng, không dùng trong code |
| Tích hợp Privy vào demo | 1–2 ngày, và vẫn là demo của đội chứ không phải ví thật chọn dùng |
| Thêm chương trình vào danh sách xác minh mà không có decoder | Quy tắc đã khoá. SPL Memo từng bị gỡ vì đúng lý do này |

---

## Thứ tự thực hiện

```
P0-A  wSOL              XONG
P0-B  bảng nhất quán    XONG
P1-G  phí chính xác     XONG — gỡ luôn chữ "(ước tính)" khỏi nhãn
P1-C  rent              (hạ từ P0 — P0-B đã hoá giải phần lớn tác hại)
P1-D  enum SPL Token
P1-E  thêm IDL
P2-F  mức Kỹ thuật
```

Sau mỗi mục: `npm run check` + đo cohort. Không sang mục sau khi mục trước chưa xanh.

## Trạng thái

| | |
|---|---|
| P0-A | **PASS** — 3 ca test, không hồi quy cohort |
| P0-B | **PASS** — 7 ca test, kiểm trên mainnet thật |
| P1-C | TODO — hạ từ P0 sau review |
| P1-G | **PASS** — phí khớp từng lamport trên 4 giao dịch mainnet |
| P1-D | TODO |
| P1-E | TODO |
| P2-F | TODO |
