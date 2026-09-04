# Custos — Transaction-intelligence SDK cho ví và dApp Solana

**Bản mô tả sản phẩm — phạm vi đã khoá** · UniHackfest 2026 · lịch ở `docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md`

| | |
|---|---|
| **Hình dạng sản phẩm** | SDK / API tích hợp vào ví và dApp |
| **Track đăng ký** | Best Product & Business |
| **Chủ đề** | AI × Web3 |
| **Idea Pool** | 09 — Security, privacy & anti-scam |
| **Mạng** | Solana Devnet |
| **Phiên bản** | v5 — 21/08/2026 |

> **One-line pitch**
> Custos phát hiện những hậu quả **không thuộc về hành động chính** của một giao dịch Solana, và giải thích bằng tiếng Việt trước khi người dùng ký.

> **GTM một câu**
> Custos giúp ví và dApp Solana bổ sung transaction intelligence tiếng Việt thông qua một SDK call.

> ⚠️ **Trạng thái thật:** sản phẩm **chưa được build**. Còn 15 ngày đến vòng loại. Mọi giao diện bên dưới là ảnh dựng, mọi con số tự chấm là ước lượng của chính đội.

---

## 00 — Lịch sử phiên bản

| Tiêu chí | v1 | v2 | v3 | v4 |
|---|---:|---:|---:|---:|
| **Tổng** | **8,2** | **8,5** | **8,8** | **9,0** |
| Mức độ cấp thiết | 9,0 | 9,0 | 9,0 | 9,0 |
| Độ rõ ràng của sản phẩm | — | — | 9,2 | 9,4 |
| Phù hợp AI × Web3 | 8,5 | 8,8 | 8,7 | 8,9 |
| Tính khác biệt | 7,5 | 8,0 | 8,3 | 8,5 |
| Tiềm năng kinh doanh | 8,0 | 8,0 | 8,4 | 8,4 |
| Khả năng tạo demo | 9,0 | 9,2 | 9,2 | 9,4 |
| Tiềm năng dài hạn | 7,5 | 8,0 | 8,2 | 8,3 |

*Các thay đổi của v1→v4 đã được tích hợp vào nội dung bên dưới. Dưới đây là bốn chỉnh cuối của v5.*

| # | Giám khảo nói | Chúng tôi làm gì |
|---|---|---|
| 1 | *"Một giao dịch chỉ cho biết nó sẽ làm gì, không chứng minh chắc chắn người dùng muốn làm gì."* | **Tách hai khái niệm.** `detectedPrimaryAction` (suy ra từ giao dịch) tách khỏi `expectedAction` (ngữ cảnh do ví/dApp cung cấp, **không đáng tin tuyệt đối**). Giao diện nói *"hành động chính được nhận diện"*, không nói *"ý định thật của người dùng"*. Mục 03 và 04 |
| 2 | *"Cho phép L3 nâng verdict lên Vàng — về mặt logic, AI vẫn đang thay đổi verdict."* | **Đúng, chúng tôi đã né câu chữ.** `level` giờ **chỉ do L2 tạo ra**; L3 trả về trường riêng `aiAdvisory`. Và đổi luôn cách tuyên bố cho trung thực: *AI không được phép xác nhận an toàn, cũng không được kết luận nguy hiểm — chỉ được yêu cầu kiểm tra thủ công.* Mục 04 |
| 3 | *"Transfer Hook là một năng lực, không mặc định là honeypot"* | Sửa mô tả. Mục 01 |
| 4 | *"Permanent Delegate không nên lên Đỏ chỉ vì giao dịch có PD và một transfer bình thường"* | Siết luật 4: chỉ Đỏ khi **chính permanent delegate đó** thực hiện transfer/burn ảnh hưởng tài khoản người dùng. Mục 04 |
| 5 | *"Chưa trả lời khách hàng trả khoảng bao nhiêu"* | Thêm **giả thuyết định giá** ba tầng, không đưa con số chưa có dữ liệu. Mục 08 |

**Đã khoá, không thay đổi nữa:** hình dạng SDK · track · chủ đề · kiến trúc L1/L2/L3 · kịch bản demo · nhóm khách hàng đầu tiên.

---

## 01 — Bài toán

### Người mới ký giao dịch mà không hiểu mình vừa ký gì

Ví Solana hiện hiển thị cho người dùng một danh sách địa chỉ base58 và tên instruction bằng tiếng Anh. Người mới không đọc được. Kẻ lừa đảo khai thác đúng khoảng mù đó.

Bối cảnh khiến khoảng mù này sắp mở rộng rất nhanh: Luật Công nghiệp Công nghệ số có hiệu lực 01/01/2026 công nhận tài sản mã hoá là tài sản, Nghị quyết 05/2025 mở thí điểm sàn được cấp phép. Từ 2026, thị trường sẽ đón hàng loạt người dùng hoàn toàn mới — và **hiện không tồn tại lớp bảo vệ nào bằng tiếng Việt**.

### Cụ thể kẻ tấn công làm gì

| Cơ chế | Người dùng thấy gì | Hậu quả thật |
|---|---|---|
| `SetAuthority` · AccountOwner | Một dòng instruction lạ | Người dùng **mất quyền kiểm soát** tài khoản token; chủ sở hữu mới có thể rút tài sản sau đó. Bản thân instruction này không chuyển tiền |
| `Approve` delegate `u64::MAX` | "Cấp quyền" | Ví lạ rút bất cứ lúc nào, kể cả nhiều tháng sau |
| Token-2022 · Permanent Delegate | Không thấy gì cả | Một địa chỉ giữ quyền chuyển/burn token của mọi người. **Có trường hợp dùng hợp pháp cho mục đích tuân thủ** — xem luật 4 |
| Token-2022 · Transfer Hook | Token bình thường | **Cho phép program tuỳ chỉnh điều kiện chuyển token; có thể bị lợi dụng để chặn bán hoặc hạn chế người nhận.** Bản thân transfer hook là một năng lực, không mặc định là honeypot |
| Mint / Freeze authority chưa thu hồi | Không thấy gì cả | In thêm không giới hạn, hoặc đóng băng ví bạn |
| Address Lookup Table | Ít địa chỉ hơn bình thường | Tài khoản đích khó đọc trên màn hình ký. **ALT là kỹ thuật hợp lệ và phổ biến** — xem luật 10 |
| Instruction bị giấu giữa các instruction hợp lệ | Một hành động vô hại | Hành động thật nằm ở instruction người dùng không cuộn xuống đọc |

> **Nguyên tắc viết mục này:** mô tả đúng mức năng lực của từng cơ chế, không phóng đại. Một sản phẩm bảo mật mất uy tín nhanh nhất bằng cách gọi mọi thứ là mối đe doạ.

---

## 02 — Người dùng & ai trả tiền

| | Người dùng cuối | Khách hàng |
|---|---|---|
| **Là ai** | Người Việt mới dùng crypto dưới 12 tháng | ① Ví Solana phục vụ người Việt / Đông Nam Á · ② dApp muốn tăng niềm tin ở bước ký · ③ Nền tảng embedded wallet và treasury |
| **Thấy Custos ở đâu** | Bên trong ví hoặc dApp họ đang dùng — **không phải một website riêng** | Trong tài liệu tích hợp SDK |
| **Trả tiền** | Không bao giờ | Theo lượt kiểm tra hoặc thuê bao — xem mục 08 |

**Sàn tập trung không nằm trong nhóm khách hàng đầu tiên:** phần lớn người dùng trên sàn không ký transaction dApp, nên họ không có bài toán mà Custos giải. Sàn thuộc thị trường mở rộng.

> **Chưa có:** chúng tôi chưa có LOI hay cam kết nào từ bất kỳ ví/dApp nào. Đây là giả thuyết, chưa phải traction.

---

## 03 — Sản phẩm

### Hình dạng: một lớp phân tích, không phải một website

Custos không đứng giữa trang lừa đảo và ví. Custos **nằm bên trong** ví hoặc dApp.

```
Trang lừa đảo  ──tạo giao dịch──▶  Ví / dApp
                                      │
                                      │  custos.inspect(tx, ctx)
                                      ▼
                            ┌──────────────────┐
                            │   CUSTOS  (SDK)   │
                            │  L1 · L2 · L3    │
                            └──────────────────┘
                                      │
                                      ▼
                          Ví hiển thị màn cảnh báo
```

### Bề mặt tích hợp — một SDK call

```ts
const result = await custos.inspect(transaction, {
  locale: "vi",
  // Tuỳ chọn. Ngữ cảnh do ví/dApp cung cấp — KHÔNG được tin tuyệt đối.
  expectedAction: { type: "swap", from: "SOL", to: "USDC" }
});

if (result.level !== "safe" || result.aiAdvisory) showWarning(result);
```

Kết quả trả về:

```jsonc
{
  "level": "danger",                    // CHỈ L2 tạo ra. AI không chạm vào trường này.
  "aiAdvisory": "review_required",      // L3 tạo ra. Không làm thay đổi level.
  "detectedPrimaryAction": {            // Suy ra TỪ GIAO DỊCH, không phải từ lời khai
    "type": "swap", "from": "SOL", "to": "USDC"
  },
  "diff": [ /* thay đổi số dư và quyền, đo được từ mô phỏng */ ],
  "reasonCodes": ["SPL_SET_AUTHORITY__ACCOUNT_OWNER", "SPL_TRANSFER_NGOAI_HANH_DONG_CHINH"],
  "coverage": { "analyzed": 10, "total": 11, "unverifiedPrograms": 1 },
  "explanation": "…"
}
```

### Custos biết "hành động chính" từ đâu — và giới hạn của nó

> **Giám khảo:** *"Một giao dịch chỉ cho biết nó sẽ làm gì, không chứng minh chắc chắn người dùng muốn làm gì."*

Đúng, và v4 nói không chính xác khi gọi đó là *"ý định thật của người dùng"*. Hai khái niệm tách riêng:

| | Nguồn | Độ tin cậy |
|---|---|---|
| **Hành động chính được nhận diện** (`detectedPrimaryAction`) | Suy ra từ chính nội dung giao dịch | Đo được, nhưng là **nhận diện**, không phải bằng chứng về mong muốn của người dùng |
| **Hành động người dùng kỳ vọng** (`expectedAction`) | Ngữ cảnh do ví hoặc dApp cung cấp | **Không đáng tin tuyệt đối** — một dApp độc hại có thể khai gian |

**Quy tắc bất đối xứng khi dùng `expectedAction`:**

- **Lệch** với hành động được nhận diện ⇒ sinh `aiAdvisory: "review_required"`. Dùng để **nâng nghi ngờ**.
- **Khớp** ⇒ **không làm giảm** verdict, không làm tắt cảnh báo nào. Một dApp độc hại hoàn toàn có thể khai đúng để trông vô hại.

Nói ngắn: ngữ cảnh chỉ được phép làm sản phẩm **thận trọng hơn**, không bao giờ được làm nó dễ dãi hơn. Và verdict Đỏ vẫn luôn dựa trên **hậu quả xác định** do L2 tính ra, không phụ thuộc vào ngữ cảnh nào.

### Màn cảnh báo — do ví hiển thị, Custos cung cấp nội dung

```
┌──────────────────────────────────────────────────────────┐
│  DEMO WALLET — DEVNET ONLY                               │
│  ⚠ Được kiểm tra bởi Custos            [ NGUY HIỂM ]      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  HÀNH ĐỘNG CHÍNH ĐƯỢC NHẬN DIỆN                          │
│  Hoán đổi SOL sang USDC                                  │
│                                                          │
│  Giao dịch còn chứa hai hành động không phục vụ việc     │
│  hoán đổi: nó chuyển 500 USDC sang một ví lạ, rồi        │
│  chuyển luôn quyền sở hữu tài khoản USDC của bạn cho     │
│  ví đó. Chúng tôi đã mô phỏng — đây là kết quả thật.     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Số dư USDC sau khi ký         500,00  →  0,00     │  │  ← đỏ
│  │ Chủ sở hữu tài khoản USDC     Bạn  →  9xQe…7Tm2   │  │  ← đỏ
│  │ Phí mạng                      −0,000005 SOL       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ⚑ AI đề nghị kiểm tra thủ công                          │
│                                                          │
│  Đã đọc hiểu 2/3 lệnh · 1 chương trình chưa xác minh     │
│                                                          │
│  SPL_SET_AUTHORITY__ACCOUNT_OWNER                        │
│  SPL_TRANSFER_NGOAI_HANH_DONG_CHINH   VI_NHAN_TUOI_4H    │
│                                                          │
│  [ Chặn & huỷ giao dịch ]  [ Vẫn ký — tôi hiểu rủi ro ]  │
└──────────────────────────────────────────────────────────┘
                                    Ảnh dựng. Sản phẩm chưa build.
```

Verdict **NGUY HIỂM** đến từ L2 (`SetAuthority`). Dòng **⚑ AI đề nghị kiểm tra thủ công** là tín hiệu riêng của L3, hiển thị bên cạnh chứ không thay thế verdict.

### Ba tính năng cốt lõi

**1 · Bảng chênh lệch** — dữ liệu đo được từ mô phỏng. Không có phỏng đoán.

**2 · Hành động chính được nhận diện, và hậu quả không thuộc về nó** — điểm khác biệt trung tâm.

**3 · Mức độ bao phủ phân tích** — *"đã đọc hiểu 2/3 lệnh, 1 chương trình chưa xác minh"* (số thật của giao dịch demo, đo 23/08). Cụ thể và kiểm chứng được, thay cho nhãn "độ tin cậy" dễ bị đọc thành *"chắc chắn nguy hiểm 100%"*.

### Bốn thành phần trong 15 ngày

| Thành phần | Vai trò | Là sản phẩm bán ra? |
|---|---|---|
| **Custos Core** (thư viện TS) + API | Sản phẩm thật | ✅ |
| **Demo Wallet — Devnet Only** | Trang ký tối giản, chứng minh hình dạng sản phẩm và làm sân khấu demo | ❌ tài liệu minh hoạ |
| **Trang tấn công giả** trên devnet | Nguồn giao dịch độc hại | ❌ đạo cụ |
| **Dashboard** | Xem lại các lần chặn, đo lường | Phụ, sau này thành cổng cho khách B2B |

### Custos không ghi gì lên chain

Lựa chọn có chủ đích: Custos là **lớp đọc và mô phỏng**. Không giữ tài sản, không có smart contract, không có bề mặt tấn công on-chain. Bằng chứng Web3 nằm ở chỗ nó phân tích giao dịch Solana thật, mô phỏng trên devnet, decode SPL Token và Token-2022 — và giao dịch nguy hiểm trong demo kiểm chứng được trên Explorer.

---

## 04 — Vai trò của AI

### Tuyên bố chính xác về quyền hạn của AI

> **Giám khảo:** *"Tài liệu nói 'AI không quyết định mức độ nguy hiểm', nhưng lại cho phép L3 nâng verdict lên Vàng. Về mặt logic, AI vẫn đang thay đổi verdict."*

Đúng. v4 vừa gỡ mâu thuẫn ở luật 8 vừa để lại một cửa sau nhỏ hơn ở chính chỗ đó. v5 đóng hẳn:

> **AI không được phép xác nhận giao dịch an toàn, cũng không được kết luận giao dịch nguy hiểm. AI chỉ có thể yêu cầu người dùng kiểm tra thủ công.**

Thể hiện trong cấu trúc dữ liệu:

| Trường | Ai tạo ra | Ghi chú |
|---|---|---|
| `level` — Đỏ / Vàng / Xanh | **Chỉ L2** | AI không chạm vào |
| `aiAdvisory` — `review_required` hoặc `null` | **Chỉ L3** | Trường riêng, không làm thay đổi `level` |

Ví hiển thị cả hai: verdict chính thức từ L2, và cảnh báo bổ sung từ AI nếu có. Nếu L3 hỏng hoàn toàn, `level`, `diff` và `reasonCodes` vẫn nguyên vẹn — người dùng vẫn được bảo vệ.

### Ranh giới L2 / L3

| | Được làm | Không được làm |
|---|---|---|
| **L2 — Engine luật** | Tạo `level` trên hậu quả xác định: đổi owner, cấp delegate, gán close/freeze authority, outflow không khớp | — |
| **L3 — AI** | Nhận diện hành động chính · chỉ ra hậu quả không thuộc về nó · **giải thích vì sao một luật L2 bị kích hoạt** · phát `aiAdvisory` | **Không tạo, không sửa `level`.** Không xác nhận an toàn. Không kết luận nguy hiểm |

Ví dụ đúng:
- L2 phát hiện `SetAuthority` đổi `AccountOwner` ⇒ `level: "danger"`. Hoàn toàn xác định.
- L3 nhận diện hành động chính là swap và thấy `SetAuthority` không phục vụ swap ⇒ **giải thích** vì sao hành động này bất thường, và phát `aiAdvisory: "review_required"`.

### "Dùng template bình thường có được không?"

> Được — cho các mẫu tấn công đã biết. Không được — cho phần còn lại.

Một giao dịch Solana thật là **một tổ hợp mở**: 8–15 instruction, nhiều program, một số chưa có IDL, có thể bọc trong ALT. Số tổ hợp là vô hạn; số template thì không.

**Ba việc AI làm:**

**1 · Nhận diện hành động chính từ nhiều instruction, rồi chỉ ra phần lệch.** Template cho ra 11 dòng kỹ thuật; AI cho ra một câu người dùng đọc được. Tính năng trung tâm của sản phẩm.

**2 · Xử lý giao dịch không nằm trong mẫu cứng — trong giới hạn được nói rõ.** Khi gặp program chưa biết, AI **không suy đoán chức năng của program**. Nó chỉ tổng hợp thay đổi **quan sát được** và nói rõ phần không xác định:

> *"Giao dịch này gọi một program chúng tôi chưa xác minh. Chúng tôi không biết program đó làm gì. Điều đo được: sau khi ký, quyền sở hữu tài khoản USDC của bạn thuộc về ví 9xQe…7Tm2. Đã đọc hiểu 2/3 lệnh."*

**3 · Điều chỉnh cách diễn đạt theo trình độ người dùng.** Cùng một facts, hai cách nói.

### 14 luật của L2

| # | Luật *(xác định, không có AI tham gia)* | Verdict |
|---:|---|---|
| 1 | `SetAuthority` đổi `AccountOwner` của tài khoản token người ký | Đỏ |
| 2 | `SetAuthority` gán `CloseAccount` hoặc `Freeze` cho bên thứ ba | Đỏ |
| 3 | `Approve` delegate với hạn mức vượt ngưỡng bất thường | Đỏ |
| 4 | Token-2022 có Permanent Delegate | **Vàng** — lên **Đỏ** khi `authority` của lệnh transfer/burn ĐÚNG BẰNG permanent delegate. Không bóc được `authority` thì giữ Vàng |
| 5 | Token-2022 có Transfer Hook trỏ tới chương trình chưa xác minh | Vàng |
| 6 | Mint authority chưa thu hồi | Vàng |
| 7 | Freeze authority còn hoạt động | Vàng |
| 8 | Ví nhận được tạo dưới 24 giờ và nhận giá trị lớn | Vàng |
| 9 | Program không nằm trong danh sách đã xác minh | Vàng |
| 10 | Có bảng tra địa chỉ (ALT) không giải được | Vàng |
| 11 | Có outflow từ tài khoản người ký ở tài sản hoặc khối lượng không khớp với các leg còn lại của giao dịch | **Vàng** — lên **Đỏ** chỉ khi trùng với một luật Đỏ khác |
| 12 | `SystemProgram.assign` đổi owner của một account thuộc người ký sang program khác | Đỏ |
| 13 | Phần lớn số SOL của người dùng rời ví, sau khi trừ phí mạng ước tính | **Vàng** — lên **Đỏ** chỉ khi trùng một luật Đỏ khác |
| 14 | Giao dịch có nhiều người ký và ví không cho biết địa chỉ nào là của người dùng | Vàng |

**Nguyên tắc chung của bốn luật đã được nới (4, 5, 10, 11):** ba cơ chế Token-2022 Permanent Delegate, Transfer Hook và Address Lookup Table đều là **năng lực hợp lệ của giao thức**, có trường hợp dùng chính đáng. Chúng chỉ trở thành dấu hiệu tấn công khi kết hợp với hành vi cụ thể trong chính giao dịch đang xét. Gắn cờ Đỏ cho sự tồn tại của một tính năng là cách nhanh nhất để tạo false positive.

Cả 14 luật đều có **mẫu kích hoạt** trong bộ kiểm thử; luật 13–14 có thêm **ca đối chứng gần giống** để kiểm ranh giới kích hoạt — mục 09.

---

## 05 — Vì sao cần Solana

Đối tượng của sản phẩm *chính là* giao dịch Solana. Không có `simulateTransaction`, không có SPL Token / Token-2022 để decode, không có wallet-standard để chen vào luồng ký — thì không có sản phẩm.

Giám khảo đã xác nhận qua bốn vòng: *"Phần phân tích giao dịch Solana đủ thuyết phục."* Mọi thành phần on-chain thêm vào chỉ để làm dày lập luận này đã được gỡ bỏ.

---

## 06 — Phạm vi 15 ngày

Điều kiện loại của BTC: hồ sơ thiếu, nộp trễ, hoặc không có demo chạy được thì **không được xếp lịch thi**.

| Ưu tiên | Nội dung |
|---|---|
| **P0 · Bắt buộc** | **Custos Core** (L1 + L2 **14 luật** + L3) đóng gói thành SDK · **bộ kiểm thử** chạy trên seed dataset · **Demo Wallet devnet** · **trang tấn công giả** devnet · dashboard tối giản. Không cần một dòng Rust nào. |
| **P0 · Song song** | **Seed evaluation dataset** 30–50 giao dịch gắn nhãn và **nghiên cứu người dùng** 20 phỏng vấn — hai việc riêng biệt. |
| **P1 · Có cắt** | Thêm luật ngoài 11 · hồ sơ rủi ro địa chỉ chi tiết · đánh bóng trải nghiệm. |
| **P2 · Sau cuộc thi** | Browser extension (B2C) · đánh dấu cộng đồng on-chain · registry có đặt cọc · Anchor program · bảng điều khiển doanh nghiệp · khách hàng sàn tập trung. |

**Phân bổ thời gian:** engine luật + bộ kiểm thử **50%** · trải nghiệm cảnh báo + demo **30%** · seed dataset + xác thực người dùng **20%**.

**Demo Wallet ở mức tối giản:** burner keypair devnet · nhận transaction · gọi `custos.inspect()` · hiển thị kết quả · người dùng huỷ hoặc ký. Không bọc ví có sẵn qua Wallet Standard ở vòng này. Nhãn **"Demo Wallet — Devnet Only"** hiển thị thường trực.

**Vì sao đội này làm được:** toàn bộ P0 nằm trong TypeScript/React, nơi đội đã có hai codebase trưởng thành đang chạy (Next.js 16 + Supabase có auth và RLS đã kiểm thử; Tauri 2 + React 19 đã làm việc với crypto thật: Argon2id, XChaCha20-Poly1305, thiết kế KEK/DEK).

---

## 07 — Kịch bản demo

### Cùng một giao dịch, hai lần ký — khoảng 80 giây

**Giao dịch demo — thiết kế trung thực.** Người dùng vào trang *"swap ưu đãi"*. Giao dịch thật sự chứa:
- Các instruction **swap hợp lệ** (tạo ATA, route qua pool)
- Một `Transfer` chuyển **500 USDC** sang ví lạ
- Một `SetAuthority` đổi chủ sở hữu tài khoản USDC

> `SetAuthority` một mình chỉ lấy đi *quyền kiểm soát*, không rút tiền ngay. Nếu bảng chênh lệch hiển thị 500 → 0 mà giao dịch không chuyển tiền thì đó là demo sai sự thật — Thể lệ BTC ghi rõ điều đó bị trừ điểm hoặc loại. Bảng chênh lệch phải khớp đúng với những gì giao dịch làm.

**Nhịp 1 — mất tiền.**
1. Demo Wallet trên devnet có 500 USDC. Chiếu Solana Explorer.
2. Bấm **Swap**. **Custos chưa bật:** ký → refresh Explorer → **số dư về 0, và tài khoản đã đổi chủ**. Im lặng hai giây.

**Nhịp 2 — được cứu, cùng giao dịch đó.**
3. Reset. Bật Custos trong Demo Wallet — **chiếu một SDK call lên màn hình 5–7 giây**:
   ```ts
   const result = await custos.inspect(transaction);
   if (result.level !== "safe" || result.aiAdvisory) showWarning(result);
   ```
   Nói một câu: *"Một SDK call để thêm lớp transaction intelligence tiếng Việt."*
4. Bấm **Swap** lại. Custos trả về:
   - Hành động chính được nhận diện: **hoán đổi SOL sang USDC**
   - Hai hậu quả **không phục vụ việc hoán đổi**: chuyển 500 USDC, và đổi quyền sở hữu tài khoản
   - **L2 báo Đỏ** vì `SetAuthority` — quyết định xác định
   - **L3 giải thích** vì sao hành động đó bất thường, và phát cờ *đề nghị kiểm tra thủ công*
   - Đã đọc hiểu **2/3 lệnh** *(số thật đo 23/08 — xem cảnh báo ngay dưới)*

Cùng một giao dịch tạo ra hai kết cục khác nhau. Demo chứng minh cùng lúc bốn thứ: mô phỏng thật · engine luật hoạt động · AI nhận diện hành động chính · chi phí tích hợp là một SDK call.

> ### ⚠️ CHƯA KHỚP — giao dịch demo đơn giản hơn mô tả ở trên
>
> Đo ngày 23/08: giao dịch tấn công hiện tại có **3 lệnh** (Memo chưa xác minh ·
> `Transfer` · `SetAuthority`), coverage thật **2/3**. Mô tả ở đầu mục này nói nó
> còn chứa **các lệnh swap hợp lệ** — phần đó **chưa được dựng**.
>
> **Hậu quả nếu không xử lý:** trên sân khấu nói *"đã phân tích 10/11"* trong khi màn
> hình hiện *"đã đọc hiểu 2 trên 3 lệnh"*. Thể lệ BTC: trình bày sai về dữ liệu bị
> trừ điểm hoặc loại. Con số **10/11 đã bị gỡ khỏi toàn bộ tài liệu** vì lý do đó.
>
> **Hai lựa chọn, vai B quyết:**
>
> | | Được | Mất |
> |---|---|---|
> | **Giữ 3 lệnh, nói đúng 2/3** | Trung thực tuyệt đối, không phải làm gì thêm | Giao dịch trông đơn giản hơn một cuộc tấn công thật; câu *"giao dịch thật có 8–15 lệnh"* mất chỗ dựa trên màn hình |
> | **Dựng đủ các lệnh swap như mô tả** | Khớp với thiết kế đã chốt, và giống drainer thật — chúng giấu hành vi độc hại giữa lệnh hợp lệ | Vai B mất một buổi; các lệnh thêm vào phải là lệnh **chạy thật** (ComputeBudget, tạo ATA, syncNative), không được là lệnh độn cho đẹp số |
>
> Cách hai đúng hơn với thiết kế, nhưng **chỉ khi mọi lệnh thêm vào đều là lệnh một
> giao dịch swap thật sự có**. Độn lệnh để mẫu số đẹp lên là dàn dựng.

**Dự phòng:** ví nạp sẵn, RPC riêng, toàn bộ kịch bản quay thành video 60–90 giây nộp trước theo yêu cầu BTC.

---

## 08 — Mô hình kinh doanh

### Sản phẩm và thị trường

| Nguồn | Người trả | Trạng thái |
|---|---|---|
| SDK / API kiểm tra giao dịch | Ví Solana phục vụ người Việt/ĐNÁ · dApp · nền tảng embedded wallet, treasury | **Sản phẩm cốt lõi**, có trong bản thi |
| Bảng điều khiển tổ chức | Doanh nghiệp, quỹ, DAO nhiều người ký | Sau cuộc thi |
| Browser extension | Người dùng cá nhân, freemium | Sau cuộc thi |
| Sàn tập trung | — | Thị trường mở rộng |
| Trải nghiệm cho người dùng cuối | Không ai — luôn miễn phí | Đi kèm ví/dApp đã tích hợp |

### Giả thuyết định giá

> Ở mức ý tưởng chúng tôi **không đưa con số**, vì chưa có dữ liệu nào để đứng sau nó. Điều cần chứng minh là **có một đường đi liên tục từ dùng thử đến trả tiền**:

| Tầng | Ai dùng | Cơ chế |
|---|---|---|
| **Developer** | Dev thử tích hợp, dự án nhỏ | Miễn phí, giới hạn số lượt kiểm tra |
| **Startup** | Ví/dApp mới, lượng ký vừa | Trả theo số lượt kiểm tra |
| **Enterprise** | Ví lớn, nền tảng embedded wallet, treasury | Thuê bao, kèm SLA và dashboard |

Điểm chuyển từ miễn phí sang trả tiền là **hạn mức lượt kiểm tra** — cùng cơ chế mà các nhà cung cấp RPC và API hạ tầng Solana đang dùng, nên khách hàng đã quen với hình thức này.

### Neo giá — tra bảng giá CÔNG KHAI, không phải phỏng đoán

Đội chưa hỏi được ví/dApp nào về mức giá họ sẵn sàng trả. Nhưng có một thứ tra được
ngay: **hạ tầng Solana mà chính những khách hàng đó đang trả tiền hàng tháng.**
Tra ngày 22/08/2026:

| Nhà cung cấp | Miễn phí | Tầng đầu tiên trả tiền | Tầng tiếp theo |
|---|---|---|---|
| [Helius](https://www.helius.dev/pricing) | 1M credit/tháng · 10 req/s | **$49/tháng** — 10M credit | $499 — 100M credit |
| [QuickNode](https://www.quicknode.com/pricing) | 10M credit (dùng thử) · 15 req/s | **$49/tháng** — 80M credit | $249 — 450M credit |

**Hai nhà cung cấp độc lập cùng đặt tầng trả tiền đầu tiên ở $49/tháng.** Đó là mức
giá thị trường đã quen cho hạ tầng Solana ở quy mô nhỏ, và Helius bán thêm credit ở
**$5/triệu lượt gọi**.

Điều này chưa nói Custos nên bán bao nhiêu — Custos tốn nhiều hơn một lời gọi RPC
(mỗi lượt kiểm tra gồm resolve ALT, `getMultipleAccounts`, `simulateTransaction`, và
có thể một lượt gọi mô hình ngôn ngữ). Nhưng nó cho một **neo có thật**: khách hàng
mục tiêu đã quen trả khoảng $49/tháng để bắt đầu, và quen với mô hình hạn mức lượt gọi.

> **Vẫn còn thiếu, và phải nói thẳng:** neo giá không thay thế được việc hỏi khách
> hàng. Chưa ví/dApp nào nói với đội rằng họ sẽ trả bao nhiêu cho lớp kiểm tra này.
> Đây là số liệu tham chiếu, **không phải** validation.

### Thị trường này đã được người khác chứng minh hộ

> *"Chúng em không cần chứng minh thị trường này có tồn tại. Ví lớn nhất Solana đã
> bỏ tiền mua đúng năng lực này — Phantom mua Blowfish, rồi **đóng cửa dịch vụ bán
> rời của Blowfish**. Thị trường có thật, và có người rời khỏi bàn."*

Phantom mua Blowfish năm 2024, và thông báo mua lại ghi rõ *"the current service has
been sunset"*; `blowfish.xyz` giờ là tên miền hết hạn (tra 22/08/2026).

⚠️ **KHÔNG nói "mọi ví khác không mua được nữa".** Đó là quá rộng và SAI: **Blockaid**
vẫn cung cấp transaction security cho ví khác (đúng như bảng đối thủ ở mục dưới của
chính file này). Chỉ **dịch vụ bán rời của Blowfish** đã dừng, không phải cả thị
trường đóng lại. Nói quá là mất điểm với giám khảo biết mảng này, và tự mâu thuẫn với
slide đối thủ.

Vậy Blowfish chứng minh điều gì cho pitch: **thị trường có thật** (ví lớn nhất trả
tiền mua), và **có một khoảng trống cụ thể** (một nhà cung cấp rời đi). Nó KHÔNG chứng
minh "không còn đối thủ". Khác biệt của Custos phải đến từ chỗ khác, không từ chỗ
"không ai làm":

- **Giải thích tiếng Việt** — đội chưa thấy đối thủ nào làm; nếu bị hỏi thì nói đúng
  như vậy, đừng khẳng định tuyệt đối.
- **Công khai coverage và phần chưa hiểu** — Blockaid là dịch vụ **mã đóng**, nên bên
  tích hợp không tự kiểm được nó hiểu tới đâu.
- **Rule engine đặc thù Solana**, verdict tất định truy được về luật.
- **AI không được đổi verdict** — ràng buộc an toàn, không phải giới hạn.
- **Cắm nhẹ vào ví/dApp nhỏ** — Blockaid bán theo hợp đồng doanh nghiệp cho ví lớn;
  đội nhỏ chưa có security engineer là phân khúc Custos nhắm tới.

⚠️ Nói ở **thì quá khứ** về Blowfish: *"công ty Phantom đã mua"*, không nói *"đang
cung cấp"*.

### Chi phí biên — đo được, không ước lượng

Trung vị **6,5 lượt gọi RPC** mỗi lượt kiểm tra (thấp 4, cao 9), đo trên 20 giao dịch
công khai có thật, **lưu offline** để kiểm engine — runtime của demo chạy hoàn toàn
trên Devnet. Phần mô hình ngôn ngữ có **trần cứng 400 token đầu ra**.

Chi phí biên nằm ở hàng phần nghìn đến phần trăm nghìn đô la — **nhỏ hơn chi phí RPC
mà chính ví đó đang trả để gửi giao dịch đi**. Chi tiết và phần còn thiếu:
`docs/DON-VI-KINH-TE.md`.

> Chưa có biên lợi nhuận, vì chưa có giá bán của Custos. Nói *"biên gộp 90%"* hôm nay
> là bịa.

### Số liệu thị trường — chỗ còn trống, và nguồn tra được

Mục này **chưa có TAM/SAM**, và đó là khoảng trống thật ở một track chấm thị trường.

Nguồn công khai đáng tra nhất: **Chainalysis Global Crypto Adoption Index** — Việt Nam nhiều
năm đứng nhóm đầu thế giới. Nếu đúng như vậy khi tra lại, đó là số liệu bên thứ ba, miễn phí,
và nói đúng điều cần nói: thị trường này không nhỏ, và không phải đội tự nghĩ ra.

> **Phải tự tra bản mới nhất và ghi rõ năm trước khi đưa lên slide.** Trích một thứ hạng cũ
> rồi bị hỏi "số năm nào?" thì mất nhiều hơn được.

### Sau cuộc thi — đường đi là grant, không phải gọi vốn

Câu *"sau cuộc thi các em làm gì?"* gần như luôn được hỏi ở vòng cuối.

Custos là **hạ tầng cho hệ sinh thái**, không phải app tiêu dùng: không giữ tài sản,
không phát token, không cần vốn lớn để vận hành. Dạng đó hợp với **grant của Solana
Foundation** hơn là gọi vốn mạo hiểm.

Ba thứ cần có trước khi nộp grant, và đội đã có một:

| Cần | Trạng thái |
|---|---|
| Số liệu trên lưu lượng thật | ✅ đo offline trên giao dịch công khai đã lưu, hiện ở `/so-lieu.html` (demo chạy Devnet) |
| Một ví hoặc dApp thật tích hợp | ⬜ chưa |
| Audit bên thứ ba | ⬜ chưa — và **tự rà soát không thay thế được** |

> Nói rõ ranh giới khi bị hỏi: đội **đã tự rà soát bảo mật** và tìm ra 4 lỗ hổng
> Critical (`docs/bao-mat/SECURITY-AUDIT.md`). Đó **không** phải audit. "Audit" nghĩa
> là một công ty bên thứ ba đọc và ký tên chịu trách nhiệm. Nói nhầm hai thứ này là
> mất uy tín ở đúng nhóm giám khảo hiểu rõ nhất.

### Trình tự tiếp cận khách hàng

| Giai đoạn | Ai | Dấu hiệu đúng hướng |
|---|---|---|
| 0–3 tháng | 2–3 ví/dApp Việt qua Superteam Vietnam | 1 đội tích hợp bản miễn phí |
| 3–9 tháng | Nền tảng ví nhúng mở rộng sang ĐNÁ (Privy có hỗ trợ Solana) | Hợp đồng trả tiền đầu tiên |
| 9 tháng+ | Ví khu vực ngoài Việt Nam | Doanh thu định kỳ, kèm SLA |

**Điểm bán:** *Custos giúp ví và dApp Solana bổ sung transaction intelligence tiếng Việt thông qua một SDK call.*

---

## 09 — Moat và dữ liệu

**Lợi thế ban đầu:** trải nghiệm tiếng Việt và giải thích theo hậu quả. Đây là lợi thế khởi động, không phải moat — nó biến mất nếu một đối thủ lớn quyết định làm tiếng Việt.

**Moat dài hạn mà đội hướng tới** *(giả thuyết, chưa được kiểm chứng)*: tập giao dịch đã gắn nhãn tích luỹ theo thời gian · danh sách domain lừa đảo nhắm vào người Việt · engine luật chuyên sâu cho Solana · dữ liệu đo **mức độ người Việt thật sự hiểu cảnh báo**.

### Hai loại dữ liệu, tách riêng

| | Dữ liệu nghiên cứu người dùng | Dữ liệu bảo mật |
|---|---|---|
| **Câu hỏi trả lời** | Người dùng có hiểu cảnh báo không? | Giao dịch nào độc hại, thuộc mẫu nào, bằng chứng gì? |
| **Hình thức** | 20 cuộc phỏng vấn + kiểm tra hiểu | **Seed evaluation dataset**: 30–50 giao dịch gắn nhãn |
| **Dùng để** | Chỉnh cách diễn đạt của L3 | Kiểm thử L2, đo false positive |

### Seed evaluation dataset — quy cách

**30–50 giao dịch gắn nhãn kỹ thuyết phục hơn 500 địa chỉ không rõ nguồn.**

- 15–20 giao dịch **nguy hiểm**
- 15–20 giao dịch **an toàn tương tự** — để đo false positive
- Một số ca **không đủ dữ liệu**, verdict kỳ vọng là Vàng

Mỗi mẫu có: link Explorer hoặc transaction fixture · loại tấn công · instruction gây rủi ro · verdict kỳ vọng · mã lý do · bằng chứng vì sao được gắn nhãn.

> Đây là **bộ kiểm thử**, chưa phải moat. Moat là thứ tích luỹ sau đó.

---

## 10 — Cạnh tranh

| Đã tồn tại | Họ làm gì | Khoảng trống |
|---|---|---|
| Ví lớn (Phantom, Backpack) | Transaction preview: mô phỏng, cảnh báo thời gian thực, diễn giải dạng người đọc được. **Đã cảnh báo khi giao dịch gọi `setAuthority` bất thường** | Tiếng Anh. Và quan trọng hơn: **không cho biết đã hiểu được bao nhiêu phần giao dịch** — khi mô phỏng bỏ lọt một instruction, người dùng không được báo gì cả |
| Blockaid | API bảo mật giao dịch, **vẫn đang hoạt động** và cung cấp cho nhiều ví | **Mã đóng** (không phải đã đóng cửa), tiếng Anh, bán theo hợp đồng doanh nghiệp |
| Unruggable | Ví cứng cho Solana | Phần cứng, phải mua thiết bị mới |

### Blowfish đã bị Phantom mua và ĐÓNG dịch vụ độc lập

Kiểm chứng ngày 22/08/2026: `blowfish.xyz` giờ trả về trang báo hết hạn tên miền.
Phantom công bố mua lại Blowfish, và trong chính thông báo đó:

> *"Blowfish has notified all existing customers that the current service has been sunset."*

Con số Blowfish công bố trước khi bị mua: 1,3 tỉ giao dịch đã quét, 2,8 triệu vụ
lừa đã chặn, hơn 18 tỉ USD tài sản được bảo vệ.

**Điều này cắt cả hai chiều, và phải nói cả hai:**

- **Thuận:** mô hình "bán SDK bảo mật giao dịch cho ví" **đã được thị trường trả tiền
  xác nhận** — ví lớn nhất Solana bỏ tiền mua đúng năng lực này. Đây là bằng chứng
  mạnh hơn bất kỳ lập luận nào đội tự nghĩ ra.
- **Nghịch:** năng lực đó giờ **nằm trong Phantom**, không còn bán rời. Ví lớn nhất
  đã có sẵn thứ này. Khách hàng đầu tiên của Custos vì vậy **không thể là Phantom** —
  mà là ví và dApp chưa có, phục vụ người Việt.

Nếu giám khảo hỏi *"Phantom đã có rồi, sao còn cần các em?"* — câu trả lời không phải
"chúng em làm tốt hơn". Câu trả lời là: **Phantom có, bằng tiếng Anh, cho người dùng
Phantom.** Lựa chọn cho ví/dApp nhỏ phục vụ người Việt thì hẹp: Blowfish đã đóng dịch
vụ bán rời sau khi Phantom mua, còn Blockaid thì tiếng Anh và nhắm ví lớn.

⚠️ **Không nói "họ không có gì".** Blockaid vẫn bán SDK cho ví khác — nói vậy là sai và
tự mâu thuẫn với chính bảng đối thủ ở mục dưới.

Cùng hình dạng sản phẩm với Blockaid (SDK bán cho ví). Khác ở thị trường mục tiêu,
và ở một lựa chọn kiến trúc: **Custos nói cho người dùng biết phần nào của giao dịch
nó chưa hiểu.**

Đây không phải suy đoán về đối thủ. Coinspect đã công bố một ca mô phỏng của Blowfish bỏ lọt instruction `assign` chuyển quyền sở hữu tài khoản; khi kẻ tấn công ghép nó với một vế trông hợp lệ, ví chỉ hiển thị vế hợp lệ và **im lặng về phần nó không hiểu**. Khuyến nghị của nhóm nghiên cứu là ví phải có phương án dự phòng khi mô phỏng thất bại. Trường `coverage` và quy tắc fail-safe về `warning` của Custos chính là phương án đó.

> Lỗi cụ thể trong ca đó **đã được vá**. Luận điểm dùng được là luận điểm cấu trúc, không phải cáo buộc một sản phẩm đang có lỗ hổng.

---

## 11 — Pháp lý, an toàn, riêng tư

- **Không giữ tài sản người dùng.** Không phải ví, không giữ khoá riêng, không có smart contract.
- **Không phải phương tiện thanh toán.** Không phát hành stablecoin. Không vận hành sàn. Không tư vấn đầu tư.
- **Demo chạy hoàn toàn trên devnet**, Demo Wallet gắn nhãn **"Devnet Only"** thường trực.
- **Demo trung thực:** bảng chênh lệch hiển thị đúng những gì giao dịch làm — mục 07.

**Trách nhiệm khi báo sai.** Năm cơ chế giảm thiểu: fail-safe về Vàng khi không chắc · **AI không tạo và không sửa `level`** · ngữ cảnh do dApp cung cấp chỉ được làm sản phẩm thận trọng hơn, không bao giờ dễ dãi hơn · hiển thị mức độ bao phủ để người dùng biết Custos chưa hiểu phần nào · bộ kiểm thử có ca an toàn tương tự để đo false positive từ ngày đầu. Disclaimer rõ ràng có mặt từ ngày đầu.

**Quyền riêng tư.** SDK mô phỏng qua RPC ngay ở phía client khi có thể, chỉ gửi lên máy chủ phần facts đã ẩn danh, không lưu địa chỉ ví người dùng.

---

## 12 — Rủi ro tự nhận

| Rủi ro | Giảm thiểu |
|---|---|
| Demo Wallet ngốn thời gian hơn dự tính | Đã chốt mức tối giản: burner keypair, hiển thị, gọi `inspect`, ký |
| Không có ví/dApp thật nào tích hợp trước hạn | Demo Wallet + một SDK call là bằng chứng về *khả năng* tích hợp. Không tuyên bố có khách hàng |
| Bị hỏi *"AI ở đây có gì hơn template?"* | Mục 04; nhịp 2 của demo chứng minh bằng hình ảnh |
| Bị hỏi *"AI có tham gia quyết định verdict không?"* | Không. `level` chỉ do L2 tạo; AI có trường riêng `aiAdvisory` |
| Bị hỏi *"làm sao biết người dùng muốn gì?"* | Mục 03: sản phẩm chỉ tuyên bố **nhận diện hành động chính**, không tuyên bố biết mong muốn của người dùng |
| dApp độc hại khai gian `expectedAction` | Quy tắc bất đối xứng: khớp thì không giảm cảnh báo, chỉ lệch mới nâng nghi ngờ |
| False positive làm oan dự án thật | Bốn luật đã nới; bộ kiểm thử có ca an toàn tương tự |
| Chưa có moat dài hạn | Mục 09 — nêu là giả thuyết, không tuyên bố đã có |

---

## 13 — Tự chấm theo rubric Track Best Product & Business

> **Sửa lại 23/08.** Bảng cũ tự chấm **8,8/10** ở giai đoạn còn là ý tưởng. Chấm lại
> theo trạng thái đo được thì ra **6,95** (bản chấm chi tiết nằm trong lịch sử git,
> `docs/CHAM-DIEM-GIA-DINH.md`, và bản mới hơn ở `docs/MENTOR-REVIEW-25-08.md`). Giữ con số
> cũ trong một repo public là rủi ro lớn hơn 1,85 điểm: **nó làm mọi con số khác
> trong tài liệu này mất giá**, kể cả những con số đội đo rất cẩn thận.

| Tiêu chí | Trọng số | **Hôm nay** | Trần thấy được | Vì sao |
|---|---:|---:|---:|---|
| Bài toán thị trường & người dùng | 25% | **6,5** | 8,5 | Nỗi đau hiểu tức thì và khách hàng đã thu hẹp đúng, nhưng **0 người dùng thật đã được hỏi**. Chân dung người dùng vẫn là giả thuyết |
| Giải pháp, demo, trải nghiệm | 30% | **8,5** | 9,0 | Demo devnet thật, 0 giao dịch bị luật buộc tội trên cohort công khai lưu offline, dòng coverage là ý tưởng sản phẩm mạnh nhất. Trừ vì **chưa ai ngoài đội tích hợp SDK** |
| Mô hình kinh doanh & GTM | 25% | **5,5** | 8,0 | Có neo giá công khai và đơn vị kinh tế đo được (mục 08). Thiếu: **giá bán của chính Custos**, và **0 cuộc trò chuyện với khách hàng** |
| Trình bày & phản biện | 20% | **7,0** | 8,5 | Tài liệu phản biện tốt, nhưng **chưa có slide, chưa có video, chưa tập lần nào** |
| **Tổng có trọng số** | | **6,95** | **8,4** | |

**Khoảng cách 1,45 điểm giữa hôm nay và trần không phải khoảng cách kỹ năng.** Nó là
bốn buổi tối làm việc không giống lập trình: hỏi 12 người dùng, nhắn 8 ví/dApp, quay
video, tập nói. Xem `docs/VIEC-CUA-BAN.md`.

---

## 14 — Toàn bộ quyết định đã chốt

| Câu hỏi | Quyết định |
|---|---|
| Có giữ idea? | Có |
| Track · chủ đề | Best Product & Business · AI × Web3 — **cân lại 23/08, giữ nguyên**, xem dưới bảng |
| Hình dạng sản phẩm | SDK/API cho ví và dApp |
| Anchor program · memo on-chain | Không có trong bản thi |
| Số lượng luật L2 | **14** (chốt 11, thêm 3 khi thực thi), mỗi luật có ca kiểm thử an toàn/nguy hiểm |
| Dữ liệu | Seed evaluation dataset 30–50 giao dịch, tách khỏi nghiên cứu người dùng |
| Phân bổ thời gian | Engine luật + test 50% · trải nghiệm 30% · dataset 20% |
| Demo Wallet | Trang ký tối giản, nhãn "Demo Wallet — Devnet Only" |
| Code trên slide | Có, 5–7 giây |
| **AI và verdict** | **`level` chỉ do L2. AI có trường riêng `aiAdvisory`, không xác nhận an toàn, không kết luận nguy hiểm** |
| **Ý định người dùng** | **Sản phẩm chỉ tuyên bố nhận diện hành động chính. Ngữ cảnh từ dApp không đáng tin tuyệt đối** |
| Khách hàng đầu tiên | Ví · dApp · embedded wallet. Sàn là thị trường mở rộng |
| Định giá | Ba tầng Developer / Startup / Enterprise, chưa đưa con số |

**Phạm vi đã khoá.** Từ đây trở đi mọi thay đổi là thay đổi khi thực thi, không phải thay đổi ý tưởng.

### Vì sao KHÔNG chuyển sang Track 2 — cân lại 23/08

Câu hỏi hợp lý: đội mạnh kỹ thuật, sao thi track không chấm chủ yếu kỹ thuật?
Chấm thử Custos theo rubric Track 2:

| Tiêu chí Track 2 | Trọng số | Ước điểm |
|---|---:|---:|
| Độ khó & chiều sâu kỹ thuật | 30 % | 8,0 |
| Kiến trúc on-chain/off-chain, **chất lượng smart contract** | 25 % | **3,5** |
| Tận dụng Solana stack, composability, hiệu năng | 25 % | 7,0 |
| Độ hoàn thiện demo & trình bày | 20 % | 8,5 |
| **Tổng** | | **≈ 6,7** |

Track 1 hôm nay ≈ 6,95; sau khi lấp hai ô đang trống thì ≈ 8,2.

**Chỗ chết là ô 25 % gọi đích danh "chất lượng smart contract".** Giám khảo phải
điền một con số, và Custos không có gì để họ chấm. Lập luận *"off-chain là cố ý,
không có bề mặt tấn công on-chain"* đúng và hay, nhưng nó trả lời một câu rubric
không hỏi.

Và ô đó **không sửa được**: viết smart contract trong 12 ngày vi phạm quyết định số
5, và sẽ là một contract chưa audit, viết vội, **trong một sản phẩm bảo mật** — câu
hỏi đó không có câu trả lời nào nghe được.

Đối chiếu: hai ô yếu của Track 1 (thị trường, kinh doanh) lấp được bằng bốn buổi tối
không viết code. Một bên là trần cứng, một bên là việc đang làm dở.

**Không có gì bị lãng phí khi ở lại.** Cùng khối lượng kỹ thuật đó đang nuôi ô
*demo* 30 % của Track 1 và được chấm 8,5.

---

## Nguồn của các dữ kiện trong tài liệu này

- Bối cảnh pháp lý (Luật Công nghiệp Công nghệ số hiệu lực 01/01/2026, Nghị quyết 05/2025), nhận định "chưa tồn tại lớp bảo vệ tiếng Việt", và các dẫn chứng về Blowfish / Blockaid / Unruggable lấy từ **trang Idea Pools chính thức của UniHackfest** (bản cập nhật 8/2026).
- **Rubric chấm điểm** lấy từ *Thể lệ UniHackfest 2026*, xác nhận trùng khớp trên trang sự kiện Vòng loại Văn Lang.
- **Các mẫu tấn công ở mục 01 và 14 luật ở mục 04** là mô tả kỹ thuật của đội về hành vi có thật của SPL Token, Token-2022 và Address Lookup Table trên Solana — không trích từ tài liệu BTC.
- **Điểm số, nhận xét và các đề xuất được trích dẫn** đến từ bốn vòng phản hồi giám khảo ngày 21/08/2026.

*Custos là tên tạm.*
