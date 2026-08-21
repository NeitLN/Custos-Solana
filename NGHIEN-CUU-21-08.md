# Khử rủi ro trước build — nghiên cứu 21/08/2026

Ba việc trong 48 giờ có hai việc cần con người (hỏi BTC, nhắn ví/dApp). Việc thứ ba — **spike giao dịch devnet** — là rủi ro số 1 của kế hoạch, và phần lớn nó khử được bằng tra cứu chứ không cần viết code. Cộng thêm việc thứ tư: kiểm chứng đối thủ.

Toàn bộ bên dưới là **tra cứu tài liệu**, chưa phải xác nhận bằng code. Nhưng nó biến spike ngày 22–23/8 từ *thăm dò* thành *xác nhận theo checklist* — khác nhau khoảng một ngày công.

---

## 1 · Giao dịch demo trên devnet — đã có đường đi

### Câu hỏi gốc

Kịch bản demo cần một giao dịch chứa **hành động chính hợp lệ nhiều instruction** + `Transfer` + `SetAuthority`. Phần khó là hành động chính: một lệnh swap thật cần pool có thanh khoản, mà devnet thì gần như không có.

### Kết luận: Jupiter không dùng được, Orca dùng được

| Router | Devnet | Ghi chú |
|---|---|---|
| **Jupiter** | ❌ **Không** | Jupiter Ultra Swap chỉ chạy trên mainnet-beta. Không có endpoint devnet. Loại |
| **Orca Whirlpools** | ✅ **Có, chính thức** | SDK có `setWhirlpoolsConfig("solanaDevnet")` |
| Raydium | ? | Không tra kỹ — không cần, Orca đã đủ |

### Điều quan trọng nhất: không cần đi tìm pool, **tự tạo pool**

Orca SDK có `createSplashPool` — tạo pool mới với hai mint bất kỳ và giá khởi tạo. Nghĩa là đội **tự mint hai token SPL của mình trên devnet, tự tạo pool, tự cấp thanh khoản**, rồi swap qua đó.

Swap đó là **swap thật qua chương trình AMM thật**, không phải giả lập. Hoàn toàn trung thực để demo.

```ts
await setWhirlpoolsConfig('solanaDevnet');
await setRpc('https://api.devnet.solana.com');

const { poolAddress, instructions, initializationCost, callback: sendTx } =
  await createSplashPool(devnetRpc, tokenMintOne, tokenMintTwo, initialPrice, signer);
```

### Điều quan trọng thứ hai: `swapInstructions` trả về **instructions**, không phải giao dịch đã gửi

Đây là chi tiết quyết định. Vì hàm trả về danh sách instruction, đội **ghép được** swap-leg với `Transfer` và `SetAuthority` vào **một giao dịch duy nhất** — đúng như kịch bản demo yêu cầu. Nếu SDK chỉ có hàm "swap và gửi luôn" thì kịch bản đã không dựng được.

### ⚠️ Bẫy phiên bản — ảnh hưởng đến cách chia việc

**SDK Orca dùng Solana Web3.js v2 (`@solana/kit`), không tương thích v1.x.**

Đây là bẫy thật với đội vibe code: `@solana/web3.js` v1 có lượng dữ liệu huấn luyện lớn hơn nhiều, AI viết code v1 trơn hơn hẳn v2. Nếu vai A viết Custos Core bằng v1 còn vai B dùng v2 cho Orca, hai bên sẽ va nhau ở kiểu dữ liệu.

**Cách xử lý — tách theo ranh giới, không ép cả đội theo một phiên bản:**

Đầu vào của Custos là **một giao dịch**, không phải một builder. Nên:

- **B** dùng `@solana/kit` (v2) trong **một script dựng giao dịch riêng biệt**, xuất ra giao dịch đã serialize
- **A** viết Custos Core bằng phiên bản nào tiện nhất, chỉ nhận giao dịch đã serialize
- Phiên bản không lan ra khỏi module của B

Điều này cũng khớp với quy tắc "mỗi vai một thư mục, không sửa chéo".

### Checklist spike đã rút gọn — B làm 22–23/8

| # | Bước | Xong khi |
|---|---|---|
| 1 | Burner keypair devnet + xin SOL faucet | Có SOL trả phí |
| 2 | Tạo 2 mint SPL riêng, mint token vào ví demo | Số dư thật, xem được trên Explorer |
| 3 | **Tx chỉ gồm `Transfer` + `SetAuthority`, ký, kiểm tra Explorer** | **Xương sống demo đã sống** |
| 4 | `setWhirlpoolsConfig('solanaDevnet')` + `createSplashPool` với 2 mint ở bước 2 | Pool tồn tại trên devnet |
| 5 | Mở position, cấp thanh khoản vào pool | Pool có thanh khoản |
| 6 | `swapInstructions(...)` → lấy instructions, **không gửi** | Có mảng instruction của swap |
| 7 | Ghép instructions bước 6 + `Transfer` + `SetAuthority` thành một tx | Giao dịch demo đầy đủ |

**Cổng 24/8 giữ nguyên:** nếu bước 4–6 vượt quá một ngày, đổi hành động chính sang thứ chắc chắn chạy. Nhưng giờ xác suất phải dùng đường lui đã thấp hơn nhiều.

> **Lưu ý về giá trị của swap.** Nếu phải đổi sang "gửi 10 token cho bạn", giao dịch chỉ còn 2–3 instruction — và câu chuyện *"11 instruction, nguy hiểm ở #7, AI tổng hợp được ý định"* sẽ yếu đi đáng kể. Hành động chính nhiều instruction không phải để cho đẹp; nó là thứ làm cho phần AI có ý nghĩa. Đáng bỏ thêm nửa ngày cho bước 4–6.

---

## 2 · Đối thủ — phải sửa tuyên bố trong `CUSTOS.md`

Đây là việc thứ tư trong danh sách 48 giờ, và kết quả **không thuận lợi**.

### Phantom và Blowfish đã làm nhiều hơn tài liệu của ta đang mô tả

`CUSTOS.md` mục 10 hiện viết ví lớn *"nói số dư đổi bao nhiêu chứ không nói hậu quả nào không thuộc hành động chính"*. Tra cứu cho thấy điều đó **không chính xác**:

- Phantom dùng transaction preview do **Blowfish** cung cấp, có cảnh báo thời gian thực và diễn giải giao dịch dạng người đọc được
- Phantom **đã cảnh báo khi giao dịch gọi `setAuthority` một cách bất thường**
- API của Blowfish trả về `warnings` + `simulationResults` + một **suggested action**, và trong bộ luật của họ có mục *"deceptive instructions that hide asset transfers"* — về ý tưởng thì rất gần với "hành động không thuộc hành động chính"

**Hệ quả:** nếu lên sân khấu nói "Phantom chỉ hiển thị chênh lệch số dư", một giám khảo biết mảng này sẽ bắt được ngay — và đó đúng là loại "trình bày sai" mà Thể lệ BTC trừ điểm.

### Nhưng nghiên cứu cũng đưa ra một khác biệt mạnh hơn, và thật

Coinspect công bố một ca cụ thể: mô phỏng của Blowfish **không phát hiện được instruction `assign`** chuyển quyền sở hữu tài khoản sang chương trình của kẻ tấn công. Khi dApp độc hại ghép nó với một vế trông hợp lệ (người dùng nhận 1 SOL), **ví chỉ hiển thị vế nhận tiền và không nói gì về phần nó không hiểu**.

Khuyến nghị của nhóm nghiên cứu, trích nguyên văn:

> *"Wallet vendors must have a fallback plan for transaction simulations to create secure user experiences. Third-party providers must not be the main strategy to integrate critical security features."*

**Đây chính xác là hai quyết định thiết kế đã khoá của Custos:**

| Khuyến nghị của Coinspect | Quyết định Custos tương ứng |
|---|---|
| Ví phải có phương án dự phòng khi mô phỏng thất bại | **Fail-safe:** không đủ dữ liệu ⇒ `warning`, không bao giờ `safe` |
| Không được im lặng về phần không hiểu được | **Mức độ bao phủ:** *"đã phân tích 10/11 instruction · 1 program chưa xác minh"* |

### Khác biệt nên đổi trục

| | Cũ — dễ bị bắt bẻ | Mới — chắc hơn và trung thực |
|---|---|---|
| Luận điểm | "Chúng tôi phát hiện được thứ họ không phát hiện" | "Chúng tôi **nói cho bạn biết chỗ chúng tôi không hiểu**" |
| Vì sao chắc hơn | Họ có thể đã làm, hoặc sẽ làm | Đây là lỗ hổng có kiểm toán công bố, và là lựa chọn kiến trúc chứ không phải một tính năng đuổi theo |

Điều này cũng khiến **trường độ bao phủ** — thứ giám khảo ép đội thêm vào ở vòng 4 — trở thành **trung tâm** của câu chuyện khác biệt, chứ không còn là chi tiết phụ.

### ⚠️ Nói cho đúng, đừng nói quá tay

- Lỗi cụ thể đó **đã được vá** — báo cáo ngày 5/4, vá và xác nhận ngày 7/4. **Không được nói Phantom hiện đang có lỗ hổng này.**
- Bài viết không ghi rõ năm trong phần tôi đọc được. **Phải xác minh năm trước khi trích trên sân khấu.**
- Luận điểm dùng được là luận điểm **cấu trúc** (ví cần phương án dự phòng khi mô phỏng thất bại), không phải luận điểm về một lỗi cụ thể.

---

## 3 · Một lỗ hổng trong bộ luật, phát hiện nhờ nghiên cứu trên

Tám luật của L2 bắt `SetAuthority` của **SPL Token**. Nhưng ca Coinspect dùng **`assign` của System Program** — một vector hoàn toàn khác, đổi chủ sở hữu của chính *account*, không phải của token account.

**Bộ luật hiện tại sẽ bỏ lọt đúng ca đã qua mặt được Blowfish.**

Đề xuất bổ sung, đưa vào nhóm Đỏ:

| # | Luật | Verdict |
|---:|---|---|
| **12** | `SystemProgram.assign` đổi owner của một account thuộc người ký sang program khác | **Đỏ** |

Chi phí thực hiện thấp — cùng dạng với luật 1 và 2 — và nó đóng một vector tấn công có thật, có tài liệu. Đây cũng là thứ trả lời rất gọn cho câu *"AI ở đây có gì hơn"*: không phải AI, mà là **độ phủ của engine luật**, và độ phủ đó đến từ việc đọc ca thật.

---

## 4 · Việc phải làm tiếp

| Việc | Ai | Khi nào |
|---|---|---|
| Chạy checklist spike 7 bước ở mục 1 | B | 22–23/8 |
| Sửa `CUSTOS.md` mục 10 theo mục 2 | C | trước 23/8 |
| Thêm luật 12 (`SystemProgram.assign`) vào bộ luật và vào dataset | A + D | trong tuần |
| Xác minh năm của bài Coinspect trước khi trích | D | trước 1/9 |
| Tự mở Phantom trên devnet, ký thử một giao dịch, chụp lại màn cảnh báo của họ | B | trước 1/9 |

Việc cuối cùng đáng làm nhất trong năm việc: **nhìn tận mắt output của đối thủ**. Cả tài liệu này lẫn năm vòng phản biện đều đang mô tả họ qua tài liệu, không qua quan sát trực tiếp.

---

## Nguồn

- Jupiter chỉ mainnet: [Jupiter Developers](https://developers.jup.ag/docs/get-started) · [QuickNode — Jupiter Ultra Swap guide](https://www.quicknode.com/guides/solana-development/3rd-party-integrations/jupiter-ultra-swap)
- Orca devnet, `createSplashPool`, `swapInstructions`: [dev.orca.so — Create Pool](https://dev.orca.so/SDKs/Whirlpool%20Management/Create%20Pool/) · [swapInstructions](https://dev.orca.so/ts/functions/_orca-so_whirlpools.swapInstructions.html) · [@orca-so/whirlpools trên npm](https://www.npmjs.com/package/@orca-so/whirlpools)
- Blowfish API và tích hợp ví: [Scan transactions — Solana](https://docs.blowfish.xyz/reference/scan-transactions-solana) · [Wallet Integration Guide](https://docs.blowfish.xyz/docs/wallet-integration-guide)
- Phantom dùng Blowfish, cảnh báo `setAuthority`: [Security at Phantom](https://phantom.com/learn/blog/security-at-phantom)
- Ca mô phỏng bỏ lọt `assign`: [Coinspect — Unveiling Transaction Simulation Challenges](https://www.coinspect.com/blog/transaction-simulation-challenges/)
