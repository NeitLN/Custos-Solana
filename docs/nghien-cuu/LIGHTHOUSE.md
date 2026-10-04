# Lighthouse: related work, chưa tích hợp

> Việc D2 trong [`ROADMAP-SAU-MENTOR.md`](../roadmap/ROADMAP-SAU-MENTOR.md). Soạn ngày 29/09/2026.
> Mọi tuyên bố về Lighthouse và Phantom dưới đây đều có nguồn ở mục 6. Câu nào không có nguồn
> thì không được đưa vào pitch.

## 1 · Lighthouse là gì

Theo README chính thức, Lighthouse là *"an open-source Solana program that provides assertion
instructions to enhance transaction security"*. Nó cho phép chèn **assertion** vào giao dịch, ví dụ:

- trạng thái tài khoản token (số dư, chủ, delegate);
- dữ liệu account nói chung;
- tài khoản oracle (giá);
- so sánh trước và sau qua *memory account*.

Assertion sai thì **cả giao dịch thất bại**: *"If a bad actor spoofs simulation results, there's
overspending during the transaction, or an oracle account is in an undesired state, the assertion
will fail, causing the entire transaction to fail."*

Lighthouse **không hoàn toàn chỉ đọc**. Giao thức còn có *write instructions* ghi dữ liệu runtime vào
*memory account* (một PDA) để so trước và sau.

Program ID trên cả Devnet và Mainnet Beta (theo README) là
`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`. Đội đã đo ngày 29/09/2026 bằng `getAccountInfo` qua RPC
công cộng: account tồn tại, `executable: true`, owner là `BPFLoaderUpgradeab1e…` trên cả hai mạng. Kết quả
có slot và thời điểm đo, lưu ở
[`lighthouse-program.json`](../review/ck-20260929/lighthouse-program.json). Client JS là `lighthouse-sdk`
2.1.0, dựng trên `@solana/kit`.

## 2 · Phantom dùng Lighthouse thế nào

Tài liệu developer của Phantom viết: *"When you submit a transaction to Phantom, it may be augmented
with Lighthouse assertion instructions before being submitted to the network."* Mục đích được nêu
là *"protecting against unexpected outcomes like simulation spoofing or malicious transaction
manipulation"*.

Blog của Phantom gọi các assertion này là **Guard Instructions**: chúng *"verify that all state
changes shown in the transaction preview will occur as displayed"*.

Như vậy, mentor gọi là "Phantom Lighthouse" là đúng ở nghĩa **Phantom dùng Lighthouse**. Nhưng
Lighthouse là giao thức mã nguồn mở riêng (tác giả Jac0xb), **không phải sản phẩm của Phantom**.
Khi nói ra ngoài, hãy nói: *"Phantom tích hợp Lighthouse để chèn Guard Instructions"*.

## 3 · Custos và Lighthouse bổ trợ cho nhau, không thay nhau

| | Custos | Lighthouse (qua Phantom) |
|---|---|---|
| Làm gì | **Giải thích trước khi ký**: hậu quả nằm ngoài hành động chính, bằng tiếng Việt | **Cưỡng chế lúc thực thi**: trạng thái sau khi chạy phải đúng như bản xem trước |
| Chặn được | Người dùng **không ký** vì đã hiểu: đổi chủ tài khoản, cấp quyền, chuyển kèm… | Giao dịch **thất bại on-chain** khi ví đã chèn assertion cho một trường và kết quả vi phạm nó (giả mạo mô phỏng, trạng thái đổi giữa lúc xem và lúc chạy) |
| Không chặn được | Trạng thái chain đổi **giữa** lúc mô phỏng và lúc chạy (TOCTOU). Biên nhận chỉ phát hiện lệch sau khi chạy, ở các trường nó chấm | Giao dịch làm **đúng** điều bản xem trước hiển thị, nhưng người dùng không hiểu hậu quả. Ví dụ `SetAuthority` hiện đúng là "đổi chủ", nhưng người dùng không biết như vậy là mất tài khoản |
| Ghi lên chain | Không (quyết định khoá số 5) | Có: thêm instruction vào giao dịch, và có thể ghi memory account |
| Nằm ở đâu | SDK trong ví hoặc dApp, trước khi ký | Instruction trong chính giao dịch, do ví chèn |

Ca B5 ngày 29/09 gợi ý ranh giới này. Đây là **suy luận**, không phải kết quả đã thử với Phantom
hay Lighthouse:

- Giao dịch SolBonus làm **đúng** điều Custos dự báo ở ba trường được chấm (kết quả thực thi, số dư
  token, chủ tài khoản): số dư 499 → 249,5 và chủ đổi sang ví khác. Một assertion kiểu *"kết quả
  phải khớp bản xem trước"* vì thế sẽ **không** làm giao dịch này thất bại. Thứ bảo vệ người dùng ở
  đây là việc họ **hiểu** cảnh báo và không ký.
- Chiều ngược lại cần hai điều kiện. Biên nhận của Custos chỉ phát hiện lệch **sau khi giao dịch đã
  chạy**, và chỉ ở **những trường nó đối chiếu và có dữ liệu**: hiện là kết quả thực thi, số dư token
  và chủ tài khoản. Delegate, close authority và SOL chưa được chấm. Lighthouse có thể làm giao dịch
  thất bại **ngay lúc chạy**, nhưng chỉ khi ví **đã chèn đúng assertion** cho trường đó và điều kiện
  bị vi phạm. Tài liệu Phantom nói giao dịch *"may be augmented"*, không nói mọi giao dịch đều có
  guard.

## 4 · Vì sao Custos chưa tích hợp Lighthouse trước chung kết

1. **Chạm quyết định khoá số 5.** Chèn instruction là sửa giao dịch của người dùng. Custos hiện chỉ
   đọc và mô phỏng.
2. **Interop.** Custos dùng `@solana/web3.js` v1. `lighthouse-sdk` 2.x dựng trên `@solana/kit`;
   client legacy ghim web3.js 1.91.7. Chưa kiểm được là dùng chung được.
3. **Ngân sách byte.** Thêm instruction và account sẽ ăn vào giới hạn 1232 byte của một giao dịch.
4. **Chữ ký và mô phỏng.**
   - Sửa message thì mọi chữ ký có sẵn mất hiệu lực. Giao dịch nhiều người ký, như ca đồng ký trong
     `cuaSoVi.test.ts`, sẽ vỡ.
   - Phải mô phỏng lại **đúng bytes cuối**, vì `neo.ts` coi đổi message là đổi giao dịch.
5. **Chọn sai điều kiện thì vẫn mất tiền.** Ví dụ assertion *"số dư ≥ dự báo"* vô dụng khi chính dự
   báo đã gồm khoản bị rút. Nếu chọn assertion, phải chọn từ **điều người dùng đã thấy trên thẻ cảnh
   báo**, chẳng hạn "chủ tài khoản token vẫn là bạn".
6. **Nói đúng về thất bại.** Assertion thất bại ngay ở bước mô phỏng hay preflight thì không được
   gọi là "đã chặn on-chain".

## 5 · Hướng sau chung kết (cần ADR riêng)

- Mặc định **tắt**; ví tự bật. Chỉ ví, không bao giờ dApp, được quyết định chèn.
- Chỉ chèn assertion suy ra từ các dòng người dùng đã **thấy và chấp nhận** trên thẻ cảnh báo.
- Mô phỏng lại giao dịch sau khi chèn, rồi ký đúng bytes đó (`kySauKhiKiem` đã khớp neo trên bytes).
- Biên nhận B4 vẫn giữ nguyên: nó là phép đo trung thực bên ngoài, không phụ thuộc Lighthouse.

## 6 · Nguồn (đọc ngày 29/09/2026)

- Lighthouse README: <https://github.com/Jac0xb/lighthouse>
- Phantom developer docs, *Transaction Validation*: <https://docs.phantom.com/developer-powertools/lighthouse>
- Phantom blog, *Anti-Spoofing Security With Lighthouse*: <https://phantom.com/learn/blog/anti-spoofing-security>
- QuickNode, *Protect Solana Transactions with Lighthouse Assertion Guards*: <https://www.quicknode.com/guides/solana-development/tooling/web3-2/lighthouse>. Nguồn thứ cấp, chỉ tham khảo.
