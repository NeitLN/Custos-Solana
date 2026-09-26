# Custos — đặc tả nâng cấp demo thành trải nghiệm ví có hậu quả thật

> Tài liệu giao việc cho Claude/Codex. Đây là **đề xuất và tiêu chí nghiệm thu**, không phải thông báo các tính năng bên dưới đã hoàn thành.
>
> Phạm vi: nâng cấp **Ví mẫu hiện tại**, trang tấn công thử nghiệm và bộ bằng chứng cho track **Best Technical Build**. Không tạo thêm trang “giao dịch thật”. Không có mốc thời gian; thực hiện theo phụ thuộc và các cổng nghiệm thu.

## 1. Quyết định sản phẩm

**Làm cho người xem sử dụng một chiếc ví có trạng thái thật, quyết định ký thật và hậu quả có thể kiểm chứng trên Solana Devnet.**

Câu chuyện cần chứng minh:

> “Custos chỉ ra điều sắp xảy ra. Bạn huỷ thì ví không gửi. Bạn bỏ qua cảnh báo và vẫn ký thì giao dịch hợp lệ vẫn có thể thực thi; tài sản hoặc quyền kiểm soát thay đổi đúng theo giao dịch.”

Điểm hấp dẫn nhất không phải nhiều nút tấn công hoặc animation. Đó là giám khảo tự thay đổi quyết định và nhận được kết quả khác nhau, có signature và dữ liệu chuỗi để kiểm tra.

### Những điều không được đánh đồng

- **Đỏ không có nghĩa chắc chắn mất tiền ngay.** Đỏ do đổi chủ, cấp quyền hoặc hành vi khác phải trình bày đúng hậu quả đó. Giao dịch còn có thể hết hạn, thiếu tiền hoặc thất bại khi thực thi.
- **Custos bật không phải bảo hiểm.** Bản demo sử dụng policy cảnh báo và cho phép người dùng chủ động bỏ qua. SDK không cưỡng chế toàn mạng, không đảo ngược transaction.
- **Ví giống thực tế không đồng nghĩa production-ready.** Devnet, DEMO, phạm vi decoder, nguồn AI và các giới hạn phải nhìn thấy được.
- **Chỉ ký chưa đủ để nói tiền đã chuyển.** Chỉ kết luận sau khi đọc được kết quả thực thi tương ứng; signature không phải bằng chứng thành công.
- Tài sản mất trong bài trình diễn là **token/SOL thử nghiệm**. Không hiển thị USD giả hoặc nói người dùng mất tiền có giá trị quy đổi.

## 2. Cơ sở rà soát và khoảng trống hiện tại

Rà soát mã đang có trong workspace; HEAD ghi nhận `e4973af` nhưng nhiều thay đổi chưa commit. Đừng coi HEAD này đại diện đầy đủ cho tính năng mới. Lượt lập tài liệu này **không chạy thêm giao dịch**; bằng chứng live tham chiếu từ các báo cáo đã lưu.

| Hạng mục | Điều quan sát được | Điều cần làm tiếp |
|---|---|---|
| Ví mẫu | `App.tsx` mở `WalletExecution`, có Phòng phân tích trong cùng trang | Giữ một trải nghiệm ví; không tách thêm app ký |
| Thực thi | `live/session.ts` có hai kind: `transfer`, `attack`; chuyển cố định 10 DEMO hoặc nửa số dư + đổi chủ | Mở rộng theo registry và form giao dịch thực tế |
| Bỏ qua cảnh báo | `CanhBao` → `setConfirm(true)` → xác nhận → `session.execute()`; policy không cấm vì level đỏ | Đường code đã có, phải đo **bật Custos + đỏ + vẫn ký** trên browser và Devnet |
| Bằng chứng live | Probe hiện kiểm chuyển thường, huỷ đỏ, tắt Custos rồi ký, tạo phiên mới | Chưa có ca browser riêng chứng minh người dùng vẫn ký khi Custos còn bật |
| Sổ kịch bản | `kichBan.ts` có nhiều ca; đường execution mới chỉ hỗ trợ hai ca | Không nói toàn bộ sổ đã ký/gửi được; thêm capability theo từng ca |
| Ví mặc định | `scripts/demo-wallet-config.ts`; import keypair khớp mới mở ký | Địa chỉ bền nhưng manifest token/session và lịch sử chưa bền qua reload |
| Số dư | UI hiển thị amount của một tài khoản nguồn, có cảnh báo mất quyền | Tách số dư đang kiểm soát khỏi token còn ở tài khoản đã đổi chủ |
| Receipt | So số nguồn, owner và fee; `ownerAfter` lấy qua label diff | Thêm tài khoản đích, delegate/allowance/close authority; bỏ phụ thuộc label dịch thuật |
| Lịch sử | List trong state, tối đa 6; localStorage chỉ giữ receipt cuối | Lưu nhiều sự kiện công khai theo session/signature, khôi phục và đọc lại chuỗi |
| Trang tấn công | Đọc manifest công khai, chuyển request về ví | Phải gắn đúng phiên đang ký, không dùng fixture cũ cho signer mới |
| AI | Có server adapter và fallback; `boiThoiHan` có thể trả lời tất định khi timeout | Nhãn phải phản ánh nguồn **kết quả cuối**, không chỉ việc đã bắt đầu gọi AI |
| Public demo | Mở ký cần keypair đúng ví trình diễn | Khách không có file của nhóm thì chưa tự gửi được; cần chế độ khách riêng có giới hạn |

**Nguồn nội bộ phải đọc:**

- [Báo cáo live](review/live-devnet/BAO-CAO.md), đặc biệt phân biệt lượt cũ và ví mặc định mới.
- [Hướng dẫn vận hành](CHAY-DEMO-GIAO-DICH-THAT.md).
- [Đặc tả thực thi trước đây](DEMO-DEVNET-THUC-THI-VA-DOI-CHIEU.md).
- [Sản phẩm](CUSTOS.md), [threat model](bao-mat/THREAT-MODEL.md), `AGENTS.md`.
- `apps/demo-wallet/src/{WalletExecution,App,CanhBao,kichBan,yeuCauNgoai,gui}.tsx/ts` và `src/live/`.
- `apps/demo-wallet/tools/probe-live-demo.py`, `probe-default-wallet.py`, `probe-live-receipt.py`.

Con số 1.063 test trong báo cáo cũ là kết quả của lượt kiểm trước, không chứng minh những yêu cầu mới trong tài liệu này. Không lấy số dư faucet ghi nhận trước đó làm số dư hiện tại.

## 3. Ranh giới không thay đổi

1. Core SDK vẫn đọc và mô phỏng. Ví demo mới giữ signer và gửi transaction. Không thêm smart contract Custos, token Custos hoặc registry on-chain.
2. Chỉ L2 quyết định `level`. L3 giải thích và có thể yêu cầu kiểm tra thủ công; không xác nhận an toàn hay nguy hiểm thay L2.
3. `expectedAction` là lời khai, không phải ý định đã xác minh. Khớp không được giảm cảnh báo; lệch chỉ được làm thận trọng hơn.
4. Coverage thiếu phải thể hiện thiếu; không ép Xanh cho demo đẹp. Không ép Đỏ từ scenario ID.
5. Không sửa hợp đồng `InspectResult` đã đóng băng để nhét session, receipt hoặc policy vào SDK. Tạo kiểu riêng ở tầng demo.
6. Không đổi kết quả engine cho vừa lời thoại. Nếu một ca không ra Đỏ, trình bày kết quả thật và giới hạn hoặc chọn ca đã có rule phù hợp.
7. Không gọi mọi Approve, ALT hoặc Token-2022 là tấn công. Mỗi kịch bản phải có hành vi cụ thể và ca đối chứng hợp lệ.
8. Mọi luồng ký giới hạn Devnet đã xác minh genesis; không bật mainnet trong bản trình diễn.
9. Không commit/push tự động; không in khoá/API key vào log, video, JSON bằng chứng hoặc frontend bundle.

## 4. Trải nghiệm đích ngay trong Ví mẫu

### 4.1. Bố cục

```text
Custos Demo · Ví mẫu tích hợp SDK                Solana Devnet
Tài khoản đang dùng · địa chỉ · trạng thái kết nối/ký

┌ Ví của bạn ──────────────────┐  ┌ Yêu cầu giao dịch ─────────────────┐
│ DEMO bạn đang kiểm soát      │  │ Ứng dụng / hành động được yêu cầu  │
│ SOL dành cho phí             │  │ Người ký, người nhận, lượng, phí  │
│ [Gửi] [Nhận] [Hoạt động]     │  │ Dữ kiện Custos + phạm vi đọc hiểu  │
│                             │  │ [Huỷ] [Tiếp tục tới bước ký]       │
│ Custos: Bật / Tắt            │  │ Sau gửi: trạng thái + signature   │
│ Ứng dụng thử nghiệm          │  │ Dự báo ↔ kết quả Devnet            │
│ Phiên đang sử dụng           │  │ [Xem Explorer] [Xem dữ kiện]       │
└─────────────────────────────┘  └───────────────────────────────────┘
```

- Giữ nhận diện xanh lá, nền sáng và typography hiện tại; ưu tiên độ đọc trên màn chiếu.
- Các thiết lập keypair, RPC, reset, chọn scenario của người trình diễn nằm trong **Chuẩn bị demo / Nâng cao**.
- Màn chính là giao dịch của người dùng, không phải dashboard vận hành test.
- Luôn có nhãn Devnet và DEMO. Có thể giấu ghi chú tiết lộ đáp án trong chế độ trình diễn, nhưng không giấu việc đây là thử nghiệm và hành động có hậu quả thật trên Devnet.
- Form ký vẫn cung cấp đầy đủ dữ kiện; không cố tình làm mù người dùng khi tắt Custos.

### 4.2. Form gửi thay nút cứng “Gửi 10 DEMO”

- Chọn tài sản DEMO trong phiên; nhập người nhận, số lượng; có preset 1/10/25 và danh bạ “Tài khoản nhận thử nghiệm”.
- Kiểm địa chỉ, phân biệt owner address và token account address; chỉ dùng đúng mint/token program.
- Tính raw amount bằng chuỗi và BigInt, không qua floating point; chặn vượt precision, âm, 0, vượt số dư khả dụng.
- Nếu cần tạo token account nhận, ghi rõ tiền thuê và instruction chuẩn bị; không lén thay đổi message sau inspect.
- Hiện số dư trước/sau dự kiến, phí ước tính, fee payer, địa chỉ đầy đủ qua mở rộng.
- Gửi thất bại không giảm số dư optimistic; không hiển thị “thành công” bằng timer.
- Giới hạn thực thi mặc định vào mint/account thử nghiệm thuộc manifest phiên; không biến trang diễn thành công cụ gửi tài sản tuỳ ý.

### 4.3. Số dư và quyền điều khiển

Nếu giao dịch chuyển 245 từ 490 DEMO rồi đổi owner:

| Thành phần | Sau xác nhận |
|---|---|
| Đã chuyển khỏi nguồn | 245 DEMO |
| Còn trong tài khoản nguồn | 245 DEMO |
| Quyền điều khiển nguồn | Đã chuyển sang địa chỉ mới |
| DEMO khả dụng từ nguồn này cho ví cũ | 0 |

Ví tổng hợp nhiều account thì phải cộng **các account còn thuộc quyền điều khiển tương ứng**, không kết luận toàn ví bằng 0 vì một account bị đổi chủ. “Khả dụng” cũng cần xét frozen/delegate/hạn chế token liên quan, không chỉ owner.

Không để con số 245 nằm dưới tiêu đề “Tài sản của bạn” sau khi mất quyền. Hiển thị mục **Tài khoản đã mất quyền kiểm soát** riêng, vẫn cho xem địa chỉ và lịch sử.

## 5. Policy và xác nhận: chức năng quan trọng nhất

Policy mặc định của Ví mẫu: **cảnh báo và cho phép chủ động bỏ qua**. Tên gợi ý trong mã: `warn_and_allow_override`. Đây là policy của ví tích hợp, không là thuộc tính an toàn của transaction.

| Custos | Kết quả | Người dùng | Hành vi đúng |
|---|---|---|---|
| Bật | Không có cờ đỏ trong phần đã đọc | Ký | Giữ neo, xác nhận, ký/gửi |
| Bật | Warning | Huỷ / tiếp tục | Nêu phần chưa rõ; chỉ ký sau đồng ý |
| Bật | Danger | Huỷ | Không gọi signer/send cho request đã huỷ |
| Bật | Danger | Vẫn ký | Giữ nguyên danger; xác nhận riêng; gửi đúng transaction nếu còn hợp lệ |
| Tắt | Không áp dụng cổng Custos | Ký | Ví vẫn kiểm signer/network/message, xin đồng ý và gửi |
| Bất kỳ | Hết hạn / message đổi / sai signer | Bấm ký | Từ chối yêu cầu cũ; chuẩn bị lại |
| Bật | Inspect lỗi | Bấm ký | Chưa có request ký hợp lệ; cho thử lại, không âm thầm tắt Custos |

### Luồng P0 bắt buộc: Custos bật → Đỏ → vẫn ký

1. Ghi nhận trạng thái bật, `level`, reasonCodes, diff, message fingerprint và signer của lượt inspect.
2. Thẻ cảnh báo ưu tiên nút **Huỷ giao dịch**. Nút phụ: **Vẫn tiếp tục — xem hậu quả**.
3. Mở hộp xác nhận trong Ví mẫu. Không đổi màu Đỏ thành Xanh. Không bật tắt Custos hộ người dùng.
4. Tóm tắt hậu quả cụ thể bằng số đang dự báo: “Chuyển X DEMO; trao quyền kiểm soát tài khoản Y”.
5. Checkbox ban đầu trống: “Tôi hiểu các thay đổi trên và vẫn muốn ký giao dịch Devnet này”.
6. Nút cuối: **Vẫn ký giao dịch**. Mỗi request nhận một quyết định; bấm đúp không tạo lần gửi mới.
7. Kiểm lại neo, bytes, signer, network, expiry và trạng thái nguồn liên quan. Không tự sửa blockhash rồi giữ consent cũ.
8. Ký/gửi bình thường; giữ `skipPreflight: false`. Giao dịch nguy hiểm về ý nghĩa có thể hợp lệ theo quyền ký.
9. Sau xác nhận, giữ hai nhãn riêng: **Thực thi thành công** và **Đã bỏ qua cảnh báo nguy hiểm**.
10. Đọc chuỗi để hiển thị hậu quả. Nếu thất bại/chưa rõ, hiển thị đúng; không dàn dựng mất token.

**Bắt buộc ghi nhận:** `protectionAtDecision`, `levelAtDecision`, `decision: override`, `requestId`, `sessionId`, signer, message fingerprint, thời điểm đồng ý. Đây là telemetry cục bộ của demo; không gọi nó là chứng thực mật mã của việc người dùng đã đọc hiểu.

Sau khi huỷ, nếu trạng thái chuỗi vẫn đổi do một transaction khác, không được nói “không có gì thay đổi”. Kết luận đúng là “yêu cầu này không được ví gửi”; việc nguồn giữ nguyên chỉ là quan sát có slot.

## 6. Danh mục kịch bản thực thi

Mọi số ví dụ dưới đây dùng để thiết kế/kiểm thử, không gán cố định vào UI. Mỗi ca có capability rõ: `executable`, `inspect_only`, `replay`, `unavailable`. Chỉ bật nút ký khi đủ capability và tiền điều kiện.

| ID đề xuất | Tình huống | Hậu quả có thể kiểm chứng | Ưu tiên |
|---|---|---|---|
| S01 | Gửi DEMO thông thường | Nguồn giảm, đích tăng, owner giữ nguyên | P0 |
| S02 | Nhận quà kèm chuyển token và đổi chủ | Hai hậu quả trong cùng transaction | P0 |
| S03 | “Nâng cấp tài khoản” chỉ đổi chủ | Số token không đổi; quyền điều khiển đổi | P1 |
| S04 | Approve quá rộng rồi bên nhận quyền sử dụng | Tx1 cấp quyền; Tx2 chuyển token bằng delegate | P1 |
| S05 | Approve vừa đủ và revoke | Cấp quyền hợp lệ; revoke ngăn sử dụng tiếp nếu đã có hiệu lực | P1 |
| S06 | “Gửi 10” kèm chuyển thêm | Tổng source outflow lớn hơn lượng người dùng yêu cầu | P1 |
| S07 | Trao quyền đóng account | Quyền đổi trước; rent chuyển khi đóng account đủ điều kiện | P2 |
| S08 | Thiếu dữ liệu / RPC lỗi / thiếu signer | Không biết phải thể hiện không biết; không giả lập thành công | P0 |

### S01 — gửi bình thường

- Sử dụng form gửi, cùng pipeline với ca nguy hiểm.
- Cả bật và tắt Custos đều thực thi được sau xác nhận.
- Ca đối chứng phải có evidence của engine; không hardcode nhãn safe.
- Chứng minh nguồn giảm X, đích tăng X cho SPL Token thường, owner giữ nguyên; phí SOL ghi riêng.

### S02 — quà tặng kèm chuyển token và đổi chủ

- Tận dụng ca `attack` đã có, giữ Transfer + SetAuthority thực.
- Chạy đủ bốn nhánh: bật/huỷ; bật/vẫn ký; tắt/huỷ; tắt/ký.
- Ca bật/vẫn ký phải nhận đúng reason code engine cho đổi chủ, không chỉ kiểm có chữ đỏ trên UI.
- Ghi nhận source/target pre-post balance; owner trước/sau, slot và signature.
- “Mất tiền” được diễn đạt cụ thể: đã chuyển X DEMO; mất quyền điều khiển phần Y còn lại. Không nói tất cả Y cũng đã được chuyển.
- Nếu muốn bên nhận quyền chuyển tiếp Y, cần **transaction thứ hai** ký bởi đúng owner mới. Không giả việc chuyển tiếp bằng cập nhật state.

### S03 — đổi chủ nhưng không rút token

- Dựng transaction chỉ thay `AccountOwner`; không có Transfer.
- Dự báo số token nguyên vẹn; cảnh báo quyền điều khiển sẽ đổi.
- Sau ký, đọc account nguồn bằng địa chỉ cố định: số token giữ nguyên, owner khác.
- Nút gửi bằng owner cũ không còn hoạt động. Có thể cung cấp kiểm chứng bằng simulation với đúng người ký cũ; nhãn phải ghi đây là phép mô phỏng thất bại, không phải giao dịch đã lên chuỗi.
- Không nói “đã chuyển tiền” cho ca này. Cơ chế authority tham chiếu [Solana Set Authority](https://solana.com/docs/tokens/basics/set-authority).

### S04 — cấp quyền rồi mới bị rút

Đây là ca tạo khác biệt kỹ thuật tốt nhất sau khi hoàn thành P0: cho thấy rủi ro **không chỉ là biến động số dư tại thời điểm ký**.

1. Tx1 do chủ token ký Approve/ApproveChecked, hạn mức vượt số dư sống phù hợp rule hiện có.
2. Sau Tx1: số dư không giảm vì riêng Approve; UI ghi delegate và allowance mới.
3. Người trình diễn chọn **Thực hiện bước tiếp theo bằng tài khoản nhận quyền**. Hành động này tách khỏi xác nhận của nạn nhân, không tự chạy sau timeout.
4. Tx2 do delegate ký Transfer với số lượng không vượt allowance và số dư hiện tại; fee payer và các chữ ký được ghi rõ.
5. Sau Tx2: so nguồn/đích, hạn mức còn lại, signature của cả hai bước. Không xin chữ ký nạn nhân cho Tx2 để minh hoạ delegate.
6. Receipt nói “quyền vừa được cấp đã được sử dụng trong một giao dịch tiếp theo”, không nói Custos đã dự đoán chắc chắn thời điểm hoặc số lượng của một transaction tương lai.

Mã hiện tại chỉ giữ `Keypair.generate().publicKey` cho recipient nên **không còn signer cho bên nhận quyền**. Phải bổ sung actor demo với signer riêng trong bộ nhớ/keystore phù hợp. Không thể tự ký cho một public key đã bỏ private key.

Giới hạn actor ở mint/account của phiên, không quét ví khác. Không xuất khoá actor trong manifest. Quyền delegate chỉ áp dụng account/hạn mức tương ứng, không phải toàn bộ ví. Tham chiếu [Approve Delegate](https://solana.com/docs/tokens/basics/approve-delegate).

### S05 — cấp quyền vừa đủ và thu hồi quyền

- Giữ ca âm tương tự S04 với allowance hợp lệ; đừng đánh Đỏ chỉ vì có Approve.
- Thêm màn **Quyền đã cấp**: token account, delegate, allowance còn lại, slot quan sát.
- Nút **Thu hồi quyền** tạo Revoke thật, có inspect và consent mới.
- Sau Revoke confirmed, đọc lại delegate/allowance; chạy thử hoặc gửi Tx2 theo cơ chế nghiệm thu có nhãn để chứng minh delegate cũ không còn dùng quyền đó.
- Không tuyên bố revoke lấy lại tài sản đã chuyển; thứ tự xác nhận/race quyết định giao dịch nào có hiệu lực trước.
- Revoke delegate không dùng để lấy lại token account đã đổi owner. Tham chiếu [Revoke Delegate](https://solana.com/docs/tokens/basics/revoke-delegate).

### S06 — chuyển thêm ngoài hành động được yêu cầu

- Hai lệnh chuyển tới hai đích khác nhau, lấy lượng từ form và số dư thật.
- Hiện tổng rời ví và từng người nhận; không gọi khoản chuyển thêm là network fee.
- Không cam kết level đỏ nếu engine hiện không có reason code cáo buộc phù hợp. Đưa discrepancy vào thông tin có nguồn và nêu giới hạn.
- Không sửa engine để một địa chỉ demo cụ thể bị nhận là độc hại. Nếu cần rule mới, giao vai A, bổ sung ca dương/âm và review riêng.

### S07 — quyền đóng account và rent

- Tx1 thay close authority; không tự rút token hoặc rent ngay.
- Tx2 CloseAccount chỉ triển khai với SPL token account thường đã rỗng; hoặc xây dựng ca riêng có điều kiện rõ. Đừng dùng ngoại lệ wrapped SOL như quy tắc chung.
- Đối chiếu lamports tài khoản đóng và đích nhận; trừ/ghi riêng phí của fee payer.
- Quyền đóng không đồng nghĩa quyền chuyển token đang nằm trong account.
- Nếu account có token, demo phải cho thấy không thể đóng theo điều kiện thông thường; không dựng animation lấy rent giả. Tham chiếu [Close Token Account](https://solana.com/docs/tokens/basics/close-account).

### S08 — dữ liệu thiếu cũng là một ca trình diễn

- RPC không trả simulation hoặc metadata: hiện lý do và lựa chọn thử lại; không đổi thành safe.
- Transaction cần signer khác mà phiên không có: inspect-only hoặc báo chưa đủ chữ ký. Không tạo signer giả.
- L3 lỗi/timeout: thông báo diễn giải dự phòng; L2 vẫn độc lập.
- Dùng Devnet khi test live; lỗi mạng nhân tạo trong test phải được ghi là fault injection, không nói Devnet tự phát sinh lỗi đó.

## 7. Một registry cho dựng, kiểm và trình diễn

Tái sử dụng ý tưởng `kichBan.ts`; không thêm chuỗi if/else khác nhau ở Ví mẫu, trang tấn công và probe.

Registry ở tầng demo cần mô tả:

| Trường | Ý nghĩa |
|---|---|
| `id`, `title`, `category` | ID ổn định, nội dung UI |
| `capability` | Thực thi / chỉ inspect / replay / chưa hỗ trợ |
| `preconditions` | Account, owner, balance, mint, delegate, actor signer cần thiết |
| `build` | Dựng transaction từ session và dữ liệu chain đang đọc |
| `expectedAction` | Ngữ cảnh không đáng tin do ứng dụng khai |
| `actors` | Ai ký bước nào, ai trả phí |
| `steps` | Một hoặc nhiều transaction; phụ thuộc xác nhận |
| `observations` | Account/field cần đối chiếu; không phải kết quả dựng sẵn |
| `testExpectations` | Chỉ dùng kiểm thử, không đưa vào `InspectResult` |
| `recovery` | Khi nào tạo phiên mới, khi nào query-only |

Build không tự gửi. Scenario không được tự đặt `level` hoặc ghi `comparison: match`. Dữ liệu kỳ vọng không là fallback cho RPC lỗi.

## 8. Phiên demo, ví cố định và người xem tự thử

### 8.1. Ví trình diễn của nhóm

Đọc từ `scripts/demo-wallet-config.ts`, hiện là:

`AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`

- Là ví mặc định của nhóm, nhận faucet và trả phí demo. Không đổi ngầm khi thiếu keypair.
- Keypair `.devnet/vi-demo.json` phải khớp địa chỉ; file vẫn gitignore, không được public.
- Giữ đường import local hiện có. Bước nâng cấp sau có thể dùng wallet adapter hỗ trợ ký transaction để giảm thao tác kỹ thuật; phải kiểm signer trả về đúng ví, giữ nguyên message và mọi chữ ký phụ của setup.
- Không lưu private key thô vào localStorage để tạo cảm giác “đăng nhập bền”. Chỉ lưu session công khai, signer mở lại theo cách đã chọn.
- Trang chuẩn bị có: signer sẵn sàng, mạng đúng, SOL đủ phí/thuê, tài khoản token đúng owner, actor cần thiết sẵn sàng, AI khả dụng hay không. Các giá trị phải đo lại, không tin cache.
- Không phụ thuộc faucet trên sân khấu; liên kết [Solana Faucet](https://faucet.solana.com/) chỉ phục vụ chuẩn bị.

### 8.2. Phiên token bền qua tải lại

Lưu manifest công khai có version và khoá `{cluster, wallet, sessionId}`:

- Mint, decimals, source/target, actor public keys; signature setup, trạng thái setup.
- Scenario đã dùng, signature đang pending, receipt list và thời điểm quan sát.
- Sau reload: validate schema/cluster/address, đọc lại account từ RPC, khôi phục UI nhưng **không tự ký/gửi**.
- Không coi manifest là bằng chứng quyền sở hữu; owner/mint/program/decimals phải xác minh lại.
- Nguồn bị đổi chủ vẫn khôi phục thành tài khoản đã mất quyền, không ẩn đi hoặc tự tạo 500 DEMO mới.
- “Tạo phiên mới” là setup transaction mới có phí. Không gọi là undo/khôi phục tài sản đã mất.
- Không cố đóng account mất quyền; không giả reclaim rent thành công.

### 8.3. Khách không được nhận private key của nhóm

Hai trải nghiệm có nhãn:

| Người dùng | Phương án |
|---|---|
| Nhóm trình diễn | Ví mặc định cố định; người trình diễn mở signer |
| Khách xem | Mặc định đọc/inspect/replay, không ký bằng ví nhóm |
| Khách muốn giao dịch | Chọn rõ “Phiên Devnet riêng”, kết nối ví thử nghiệm của khách hoặc tạo sandbox có cơ chế giữ signer đã giải thích; funding/account riêng |

Chế độ khách là **mở rộng P2 cần lựa chọn kiến trúc**, không tự thay ví mặc định cả dự án. Chưa triển khai thì không quảng bá “ai mở web cũng ký được”. Không đặt một endpoint public cho mọi người ký bằng quỹ nhóm. Nếu sau này tài trợ phí, phải có quota, giới hạn instruction/mint/amount, chống lặp và chủ ví rõ ràng; đây là hạng mục riêng.

Giám khảo trực tiếp dùng laptop của nhóm sau khi người trình diễn mở ví là đường tự thử P0 khả thi, không cần phát private key.

## 9. Handoff giữa trang thử nghiệm và Ví mẫu

Hiện tại hai đường có thể dùng manifest khác nhau. Cần sửa để không trình bày dApp gửi yêu cầu nhưng ví lại dựng/ký một giao dịch của phiên khác.

1. Ví tạo session; dApp nhận **manifest công khai** của phiên đã chọn.
2. dApp dựng transaction với nguồn/đích/mint của phiên, lời khai hành động và requestId.
3. Ví nhận request, tự xác minh cluster, signer, account, expiry, kích thước và nguồn gửi; không tin trường `verified` từ dApp.
4. Custos inspect chính bytes nhận được; ký chính bytes đã được đồng ý. Đổi transaction phải làm lại quy trình.
5. Dùng allowlist origin và kiểm `event.origin`/`event.source` nếu dùng postMessage; không dùng `*` cho thông điệp nhạy cảm. Không truyền keypair/secret qua URL, hash hoặc message.
6. Hết hạn request hoặc gửi lặp: không tự thực thi hai lần. Request được liên kết với session và có trạng thái kết thúc rõ.
7. Trả kết quả phân biệt cancelled, submitted, confirmed, failed, unknown. dApp không được hiện nhận quà thành công khi ví chưa ký.
8. Luồng hash cũ dùng fixture vẫn có thể inspect với nhãn legacy; không ép ký bằng ví mặc định mới nếu signer/account không khớp.

Nếu P0 dùng ứng dụng giả nằm ngay trong Ví mẫu thì ghi đúng “kịch bản nội bộ”. Chỉ tuyên bố tích hợp dApp end-to-end sau khi có probe hai trang thật.

## 10. Receipt và mô hình dữ liệu bằng chứng

Đề xuất bổ sung kiểu riêng `DemoRun`, không sửa `InspectResult`:

```ts
type DemoDecision = "cancel" | "approve" | "override";
type DemoRun = {
  version: 2;
  runId: string;
  sessionId: string;
  scenarioId: string;
  cluster: "devnet";
  signer: string;
  protectionAtDecision: boolean;
  levelAtDecision: "safe" | "warning" | "danger" | null;
  decision: DemoDecision;
  messageFingerprint: string;
  prediction: unknown; // Thay bằng schema có kiểm runtime trước khi triển khai.
  steps: unknown[];    // Transaction evidence từng bước; không để unknown khi bàn giao code.
};
```

Mỗi transaction step tối thiểu có:

- Role của bước: setup / user-request / delegate-use / revoke / close / cleanup.
- Serialized message hoặc fingerprint có thuật toán rõ, signature, fee payer, required signers.
- Snapshot kết quả inspect trước ký, slot quan sát nếu có; nguồn chữ L3.
- Trạng thái gửi/confirmed/finalized và lỗi riêng. Không trộn confirmed với finalized.
- Token amounts raw dạng chuỗi + decimals; accountIndex, account address, mint, token program.
- SOL pre/post và `meta.fee`; tách transfer, rent và fee, không quy toàn bộ SOL giảm thành bị lấy cắp.
- Owner/delegate/allowance/closeAuthority quan sát trước và sau; mỗi observation có slot và nguồn.
- Comparison theo từng field: match / mismatch / unknown / not-applicable. Không ép owner “unknown” cho transfer không dự báo đổi chủ thành cảm giác engine hỏng.

**Độ tin cậy:** số dư lịch sử lấy metadata đúng transaction; authority đọc sau chỉ chứng minh trạng thái tại slot đó. Nếu có transaction khác chen vào, không quy chắc mọi thay đổi cho transaction đang xem. Account hiện không tồn tại cũng chưa đủ chứng minh chính tx này đã đóng nó; cần message, receipt và biến động liên quan.

Không parse text `label` để suy loại authority. Tầng demo nên dùng định danh dữ kiện/decoded instruction đã có, ánh xạ có test. Nếu SDK chưa cung cấp dữ kiện ổn định, giao vai A bổ sung qua cơ chế extension tương thích đã review; không sửa type đóng băng hoặc copy label tiếng Việt sang logic như một giao thức mới.

Giới hạn UI: hiển thị 3–5 dữ kiện quan trọng, phần còn lại trong “Bằng chứng kỹ thuật”. Export JSON không chứa keypair, API key, request headers có credential, nội dung nhạy cảm không cần thiết.

## 11. State machine và các lỗi phải xử lý

```text
prepared → inspecting → awaiting_decision → awaiting_signature
                                             ↓
                                  signed → submitted → confirming
                                                           ↓
                                             confirmed → observing → compared
```

Các nhánh riêng: cancelled, stale_request, rejected_signature, preflight_rejected, execution_failed, outcome_unknown, evidence_incomplete. Trạng thái UI không làm nguồn dữ liệu on-chain.

| Tình huống | Yêu cầu |
|---|---|
| Ký nhưng chưa gửi | Không hiện đã thanh toán; lưu signature nếu có để phục hồi đúng |
| RPC nhận tx rồi timeout | Giữ signature, khoá request mới có thể gây lặp; query-only |
| `getTransaction` trả null | Chưa đủ bằng chứng, không mặc định fail hoặc zero |
| Transaction thất bại trên chuỗi | Nêu lỗi thực thi và phí; không diễn số token đã bị chuyển |
| Blockhash hết hạn | Inspect/consent lại transaction mới, không tái dùng đồng ý cũ |
| Đổi mode/tài khoản/amount/đích | Vô hiệu consent và prediction cũ |
| Số dư hoặc authority trôi | Chuẩn bị lại; guard phải bao phủ dữ kiện liên quan scenario |
| Hai tab cùng ví | Session namespace riêng, lock cục bộ/cross-tab hợp lý; đọc lại chain trước gửi |
| Đổi ví ở extension | Huỷ pending, không ký bằng account mới thay account đã inspect |
| RPC 429 | Retry có giới hạn cho đọc; không đổi message rồi gửi lặp |
| Reload khi setup pending | Lưu manifest công khai trước ranh giới gửi; phục hồi bằng signature, không mint thêm ngầm |
| Receipt JSON lỗi/giả | Validate và đọc chain lại; không tin cache để hiện confirmed |

Transaction Solana thực thi nguyên tử; instruction lỗi làm các thay đổi của transaction bị hoàn tác, phí vẫn có thể bị thu. Không diễn “Transfer đã chạy một nửa nhưng SetAuthority lỗi” như trạng thái cuối thành công của cùng transaction. Tham chiếu [Solana Transactions](https://solana.com/docs/core/transactions).

Review thêm hiện trạng `guiGiaoDich`: lỗi sau khi có chữ ký đang được phân loại rất thận trọng là chưa rõ. Nếu cải thiện để nhận diện preflight rejection, phải dùng lỗi RPC có cấu trúc và test cụ thể; không kết luận thất bại chắc chắn chỉ từ chuỗi timeout. Chốt cách giải quyết signature thực sự đã hết hạn nhưng chưa tìm thấy bằng chứng mà không khoá ví vĩnh viễn.

## 12. AI thật, nguồn chữ thật

- L2 phải hoàn thành độc lập với L3. AI không sửa `level`, không tự soạn instruction và không ký thay người dùng.
- Nhãn gợi ý: “Diễn giải bởi mô hình”, “Diễn giải tất định”, “Mô hình không phản hồi — dùng diễn giải dự phòng”.
- Hiện model/provider khi có dữ kiện server thật; không hardcode một tên model nếu request dùng model khác.
- Kiểm riêng timeout của wrapper: `boiThoiHan` hiện có thể fallback mà caller không nhận lỗi, nên `setSource("moHinh")` trước request chưa chứng minh câu cuối do mô hình viết.
- Gắn trạng thái nguồn vào đúng runId; response AI tới muộn không được đổi nhãn hoặc nội dung của lượt khác.
- Escape văn bản dApp/model, không render HTML tuỳ ý. Lời khai như “bỏ qua quy tắc” vẫn là dữ liệu không đáng tin.
- AI server không có khoá hoặc rate limit: demo vẫn inspect qua luật với nhãn tất định. Không gọi fixture là live AI.
- Ngôn từ quan trọng: “có thể được dùng để chuyển token” cho allowance; “đã chuyển” chỉ dùng khi bước thực thi được xác nhận.

## 13. Motion và UX tạo sức hút có căn cứ

- Đặt cảnh báo cạnh giao dịch đang chuẩn bị ký; trên mobile tự đưa focus tới cảnh báo, không bắt người dùng tìm ở cuối trang.
- Timeline theo sự kiện thật: nhận request → phân tích → người dùng quyết định → chờ chuỗi → đọc hậu quả.
- Chỉ animate dòng token từ nguồn sang đích sau khi có metadata xác nhận. Cảnh báo trước ký dùng nét đứt/nhãn “dự kiến”.
- Đổi chủ: chuyển badge quyền điều khiển; số token đứng yên nếu chỉ SetAuthority. Không dùng animation rút tiền cho thay đổi quyền.
- S04 hiển thị hai signature với điểm ngắt do người trình diễn chủ động chọn, làm rõ ai ký từng bước.
- Không confetti xanh toàn màn khi transaction nguy hiểm đã thành công. Dùng trạng thái trung tính cho network success và màu cảnh báo cho hậu quả.
- Trong receipt mobile, ưu tiên card từng dữ kiện hoặc bảng có gợi ý cuộn; nguồn/đích và kết quả phải đọc được mà không đoán cột ngoài màn hình.
- Hỗ trợ keyboard, focus trap cho dialog, Escape trước ký, reduced motion, contrast; không chỉ dùng màu để phân biệt.
- Giữ số dư trong lúc tải với nhãn thời điểm/đang cập nhật, không chớp về 0.
- Chưa có giao dịch thì lịch sử rỗng có hướng dẫn. Cancel nằm trong “Hoạt động trong ứng dụng”, không fake một mục transaction on-chain.

## 14. Ma trận nghiệm thu bắt buộc

| ID | Ca kiểm | Điều phải assert |
|---|---|---|
| AC01 | Reload ví mặc định | Đúng public key; chưa tự mở signer/gửi/faucet |
| AC02 | Keypair sai | Không đổi account, không mở quyền ký |
| AC03 | Form chuyển hợp lệ | Source −X, target +X, fee riêng, confirmed thật |
| AC04 | Custos bật, S02 huỷ | L2 danger/reason đúng; 0 signer/send cho request đó |
| AC05 | Custos bật, S02 vẫn ký | Mode vẫn bật, level vẫn đỏ; override được ghi; signature confirmed, diff/owner khớp |
| AC06 | Custos tắt, S02 ký | Có consent; không đòi neo inspect giả; hậu quả thật |
| AC07 | Custos tắt, huỷ | Không gọi signer/send |
| AC08 | S03 chỉ đổi chủ | Token amount giữ nguyên, quyền đổi; khả dụng đúng |
| AC09 | S04 Tx1 | Delegate/allowance đổi; chưa vẽ token đã mất |
| AC10 | S04 Tx2 | Delegate ký; victim không ký; metadata cho lượng chuyển thật |
| AC11 | S05 revoke | Đọc quyền đã thu hồi; lần dùng quyền sau bị từ chối đúng nguyên nhân |
| AC12 | Ca âm tương tự | Không forced danger; lưu kết quả engine và ground truth của fixture |
| AC13 | Message/signer/mode đổi | Consent/neo cũ không dùng được |
| AC14 | RPC timeout sau send | Không tự resubmit tx mới; query đúng signature |
| AC15 | Execution failed | Không hiện mất token do transfer; fee tách riêng |
| AC16 | Metadata/authority thiếu | unknown theo từng field; không thay bằng prediction |
| AC17 | Khôi phục session | Public manifest validate; chain đọc lại; không tự setup |
| AC18 | Hai tab/race/bấm đúp | Không lẫn session, không hai lượt gửi từ một consent |
| AC19 | dApp handoff | Inspect và ký đúng bytes của cùng request/phiên |
| AC20 | AI timeout/response muộn | Nhãn fallback đúng run; level không bị AI đổi |
| AC21 | Desktop/mobile/a11y | Không mất cảnh báo, không overflow, keyboard/reduced-motion đạt |
| AC22 | Export và bundle | Không chứa secret; public evidence đủ để tra lại |

### Cách đo

- Unit: policy/amount parsing/schema/receipt comparison; không chỉ test snapshot màu hoặc tên nút.
- Integration: signer/network/message/expiry; mô phỏng RPC trả null, 429, timeout sau nhận, error meta.
- Browser: kiểm đầu vào thật và thao tác consent; ghi request gửi, không chỉ assert text.
- Devnet: transaction hợp lệ, signature, account/mint, slot, meta.err, source/target balances, authority; dùng trạng thái sống.
- Mỗi ca phá quyền chạy trên session riêng hoặc chuỗi tiền điều kiện được ghi rõ; đừng chạy S03 rồi dùng account mất owner cho S01 và gọi đó là regression engine.
- Chạy lại một bộ ca ở desktop và mobile trên build production; một vòng bổ sung trên trình duyệt khác nếu hỗ trợ, ghi chính xác phạm vi.
- Không gộp số unit tests, lượt browser và giao dịch confirmed thành một số “độ chính xác”.

**Gate P0:** AC01–AC07, AC13–AC18, AC20–AC22 và ca S08 liên quan phải có bằng chứng. AC19 phải đạt trước tuyên bố handoff tích hợp thật. P1 chỉ được ghi hoàn thành khi AC08–AC12 tương ứng đạt.

## 15. Kế hoạch triển khai theo phụ thuộc

| Gói | Việc cụ thể | Vị trí chính | Xong khi |
|---|---|---|---|
| P0-A | Tái hiện nhánh đỏ/vẫn ký, thêm decision record và kiểm consent | `WalletExecution`, `CanhBao`, `live/policy`, `live/session`, tests | AC04–AC07 có bằng chứng live mới |
| P0-B | Số dư kiểm soát, source/target receipt, trạng thái xác nhận chính xác | `live/receipt`, `live/Receipt`, wallet UI | Không nhầm đổi chủ thành chuyển hết |
| P0-C | Session store công khai, restore, pending recovery, history | Module mới trong `src/live`, session controller | Reload không mất lịch sử/ngữ cảnh hoặc gửi lặp |
| P0-D | Form gửi, xác nhận và copy UI | Wallet UI/amount parser | S01 chạy với nhiều số lượng, đủ kiểm validation |
| P0-E | Chuẩn bị demo và kết quả nguồn AI | Wallet UI/AI adapter, phối hợp C | Một run không bị sai nhãn chữ/AI |
| P1-A | Registry chung và actor runtime | `kichBan`, bộ dựng, session | Mỗi ca có capability và actor rõ |
| P1-B | S03; S04; S05 theo thứ tự | Builder/observer/UI/tests | Quyền, transfer bước sau, revoke đều có evidence |
| P1-C | S06 và handoff đúng phiên | Trang tấn công + ví + probes | Request không chạy nhầm fixture/signer |
| P2-A | S07, UX quyền và kiểm tra trên trình duyệt bổ sung | Demo app/test | Close authority không được diễn quá mức |
| P2-B | Khách tự thử và wallet adapter | Thiết kế signer/session riêng | Không chia sẻ khoá/quỹ trình diễn mặc định |
| P2-C | Motion, trình chiếu, video dự phòng | UI, kịch bản trình bày | Hình ảnh phản ánh dữ kiện đã kiểm |

P0-A và P0-B trước; P0-C là nền cho demo bền; P1 actor chỉ làm sau registry và recovery. Không ưu tiên animation khi override chưa có receipt thật. Không nâng phiên bản web3 hoặc viết lại app chỉ để làm các yêu cầu này.

Quyền sở hữu: B chủ trì ví/dApp/Devnet; C phụ trách nguồn chữ và AI; A review thay đổi extraction/luật nếu cần; D thu bằng chứng và cập nhật pitch. Không sửa chéo type/engine để làm nhanh UI.

## 16. Câu chuyện trình diễn đề xuất

1. **Ví hoạt động bình thường:** giám khảo nhập lượng gửi, ký và thấy nguồn/đích đổi. Chứng minh sản phẩm không chỉ có cảnh báo.
2. **Có Custos, người dùng nghe cảnh báo:** nhận quà, xem diff, huỷ. “Ví chưa gửi yêu cầu này.”
3. **Có Custos, người dùng bỏ qua:** giữ công tắc bật, chọn vẫn ký, xem hậu quả thật và Explorer. Đây là điểm nhấn bắt buộc.
4. **Không có Custos:** chạy mẫu tương đương trong phiên mới, ký thông thường và đối chiếu. Nói rõ đây là transaction/session khác với ví dụ trước, không replay cùng một chữ ký hai lần.
5. **Nếu cần đào sâu:** Approve không làm số dư giảm ngay; delegate dùng quyền trong transaction sau; revoke là hành động có giới hạn cụ thể.

Khi thời lượng ít, giữ 1–3. Khi mạng hỏng, chuyển sang video/receipt đã ghi với nhãn phát lại; không giữ nhãn live. Không cần trình diễn toàn bộ số ca để được xem là có chiều sâu.

Lời dẫn khi đỏ mà vẫn ký:

> “Custos đã chỉ ra giao dịch sẽ chuyển token và đổi quyền kiểm soát. Tôi chủ động bỏ qua cảnh báo, công tắc vẫn đang bật. Ví ký đúng giao dịch đó. Bây giờ chúng ta đọc kết quả từ Devnet để xem dự báo có khớp không.”

Lời dẫn sau thực thi:

> “X DEMO đã chuyển sang tài khoản nhận. Y DEMO vẫn ở nguồn, nhưng quyền kiểm soát nguồn đã đổi. Đây là hai hậu quả khác nhau; cả hai đều có địa chỉ và dữ kiện để kiểm tra.”

## 17. Đầu ra bàn giao bắt buộc

- Code theo từng gói, không commit/push tự động.
- Bảng trạng thái scenario: đã inspect / đã ký / đã confirmed / đã đối chiếu / giới hạn.
- Report riêng của bản mới; không ghi đè hoặc tái sử dụng signature cũ như bằng chứng lần chạy mới.
- JSON mỗi run và từng transaction step; screenshot desktop/mobile của cảnh báo, override, receipt.
- Hướng dẫn chuẩn bị ví cố định, phục hồi session, tạo lại account, xử lý RPC lỗi.
- Video dự phòng có nhãn Devnet và thời điểm ghi, cùng lời dẫn khớp dữ kiện.
- Danh sách chưa kiểm được và nguyên nhân; không gọi một phần bị chặn là hoàn thành toàn bộ.

## 18. Prompt giao Claude triển khai

```text
Hãy triển khai docs/DAC-TA-DEMO-CUSTOS-CHAN-THAT.md trong repository hiện tại.

Mục tiêu: nâng cấp Ví mẫu hiện có thành trải nghiệm có quyết định ký và hậu quả
Devnet thật. Không tạo một trang giao dịch thật riêng, không thay toàn bộ thiết kế.

Đọc AGENTS.md, đặc tả này và báo cáo live trước khi sửa. Xác minh lại workspace:
những thay đổi chưa commit cũng là code hiện hành. Đừng báo bug cũ nếu đã sửa.

Ưu tiên P0-A: bật Custos, inspect ra danger thật, người dùng vẫn ký, transaction
được gửi khi hợp lệ và hậu quả được đọc từ chain. Không tắt Custos hộ người dùng;
không đổi level; không giả số dư hoặc signature. Đường code có sẵn cần hoàn thiện
và kiểm chứng, không mặc định viết lại từ đầu.

Sau đó làm receipt/số dư kiểm soát, session recovery, form gửi và nhãn AI đúng.
Chỉ mở rộng các ca authority/delegate/revoke khi pipeline P0 đã qua gate.

Ví trình diễn mặc định đọc scripts/demo-wallet-config.ts. Khoá chỉ ở máy/keystore,
không nhúng frontend, không chia sẻ cho khách. Fixture cũ không được sửa địa chỉ
để giả thành hiện trường mới. Không sửa InspectResult đã đóng băng.

Mỗi thay đổi hành vi có test có ý nghĩa, browser test trên build và Devnet evidence
nếu tuyên bố đã thực thi. Bộ ca đỏ+vẫn ký, huỷ, tắt+bình thường và tắt+nguy hiểm
phải kiểm riêng. Nếu mạng/signer/SOL chặn, ghi rõ và tiếp tục phần độc lập.

Giao kèm report, JSON receipts, screenshot, runbook và các giới hạn. Không lấy số
test cũ làm bằng chứng mới. Không tự commit hoặc push. Hoàn thành theo phụ thuộc,
không chỉ trả lại một bản kế hoạch và không ưu tiên animation hơn tính đúng.
```

## 19. Tiêu chí hoàn thiện cuối

- [ ] Người dùng gửi lượng token tự chọn trong phạm vi demo và thấy nhận/gửi thật.
- [ ] Custos bật + đỏ + huỷ: request đó không được gửi.
- [ ] Custos bật + đỏ + vẫn ký: giao dịch hợp lệ thực thi; level không bị đổi; hậu quả có bằng chứng.
- [ ] Custos tắt vẫn có consent và gửi bình thường; nhãn đo dự báo độc lập rõ.
- [ ] Số dư hiển thị đúng quyền điều khiển, không chỉ amount trong account.
- [ ] Đổi chủ, cấp quyền, sử dụng quyền, thu hồi quyền được phân biệt đúng.
- [ ] Reload giữ ví mặc định và khôi phục ngữ cảnh công khai; không tự gửi/reset.
- [ ] Transaction lỗi, chưa rõ và thiếu bằng chứng có trạng thái riêng.
- [ ] AI chỉ giải thích, nguồn câu chữ được ghi đúng từng lượt.
- [ ] Public demo không đòi nhóm phát private key cho khách.
- [ ] Mọi nút “xem bằng chứng” dẫn tới đúng transaction/session/cluster.
- [ ] Motion giúp hiểu dữ kiện, không đóng vai dữ liệu hoặc làm giả thành công.
- [ ] Báo cáo và lời pitch nói đúng phạm vi đã chạy, không hứa “bảo vệ mọi giao dịch”.
