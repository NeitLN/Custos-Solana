# Custos — giao dịch thật trên Devnet, hậu quả kiểm chứng được

> Làm rõ sau triển khai: tính năng phải nằm trong **Ví mẫu (`index.html`)**, giữ trải nghiệm ví và luồng cảnh báo trước ký. Không tạo trang giao dịch thật riêng. Bản tích hợp hiện tại và phạm vi đã kiểm được ghi trong `CHAY-DEMO-GIAO-DICH-THAT.md` và `review/live-devnet/BAO-CAO.md`; các tiêu chí bên dưới là đặc tả, không tự chứng minh mọi tiêu chí đã hoàn thành.

## 1. Yêu cầu đã nhận từ chủ dự án

Mentor góp ý demo chưa đủ thật ở điểm cốt lõi: Custos bảo vệ giao dịch bằng cách nào? Khi tắt bảo vệ, người dùng vẫn phải ký/gửi được như luồng ví thông thường, và giao dịch nguy hiểm phải gây hậu quả thực tế tương ứng với điều Custos đã dự báo. Tài sản là token thử nghiệm trên Devnet; không cần chuyển sang mainnet để chứng minh điều này.

**Kết quả người xem cần hiểu:** “Custos chỉ ra tiền và quyền kiểm soát sẽ thay đổi trước khi tôi ký. Nếu tôi huỷ, ví không gửi. Nếu tôi vẫn ký hoặc dùng luồng không có Custos, giao dịch có thể thực thi và gây ra thay đổi đó.”

Đây là brief triển khai cho Claude, chưa phải thông báo tính năng đã được build hoặc đã kiểm thử live. Phạm vi chính thuộc vai B; phối hợp vai C về câu chữ, vai D về kịch bản/bằng chứng. Giữ ranh giới SDK và giao kèo kiểu dữ liệu hiện tại. Track/vòng/lịch đọc từ `cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md`.

## 2. Hiện tại có gì, cần thay ở đâu

Qua đọc mã tại HEAD `e4973af`:

- `apps/demo-wallet/src/App.tsx` đã có nhánh bật/tắt Custos và `kyVaGui()`; `gui.ts` có ký, gửi, xác nhận, trạng thái chưa rõ và thất bại thực thi. Tận dụng phần này thay vì viết một luồng gửi song song không được kiểm thử.
- `vi.ts` cho ký theo `VITE_DEMO_SECRET`; bản public thiếu signer nên nhánh tắt Custos chạy `inspect()` và hiển thị `HauQua.tsx` mang nhãn mô phỏng. Do đó khán giả chưa được thấy hậu quả **đã xảy ra** trên chuỗi ở luồng public.
- Nhánh tắt có signer gọi `kyVaGui(tx)`, nhưng hàm đó kiểm `neoRef.current` được tạo từ luồng inspect. Có khả năng bị chặn vì không có neo. **Đây là phát hiện qua mã, chưa chạy ký để xác nhận.** Viết test hồi quy trước khi kết luận/sửa.
- `scripts/hienTruongSong.ts` đã đọc số dư sống, chọn lượng chuyển và phát hiện tài khoản đổi chủ; các sửa P0 cũ đã được ghi trong `review/national-20260925/FINDINGS.md`. Không lấy báo cáo cũ làm danh sách lỗi còn mở.
- `scripts/dung-hien-truong.ts` có cơ chế dựng mới sau khi tài khoản bị đổi chủ. Nâng thành quy trình tạo phiên riêng; không làm hỏng hiện trường công khai hoặc fixture đang dùng bởi test khác.

## 3. Trải nghiệm chủ đạo: ba ca để chứng minh đủ hai phía

| Ca | Hành động của người trình diễn | Điều Custos/ ví làm | Bằng chứng khán giả thấy |
|---|---|---|---|
| A — chuyển bình thường | Chọn người nhận, lượng token; xem chi tiết và ký | Khi bật Custos, inspect rồi cho người dùng ký theo policy; khi tắt, ký theo luồng thông thường | Transaction confirmed không lỗi, người nhận tăng token, người gửi giảm tương ứng; có link Explorer |
| B — nguy hiểm, có Custos | Mở lời mời nhận quà; xem cảnh báo; bấm “Huỷ giao dịch” | Custos trả verdict/reasons/diff; ví huỷ yêu cầu, không gọi signer hoặc send | Dòng số dư/quyền sở hữu dự báo; trạng thái “Đã huỷ trước khi ký”; số dư/quyền đọc lại chưa đổi trong phiên cô lập |
| C — nguy hiểm, không Custos | Chủ động chọn chế độ đối chứng; cùng mẫu giao dịch; xem hộp ký thông thường và đồng ý ký | Không dùng verdict L2/L3 làm điều kiện ký; ví gửi giao dịch hợp lệ lên Devnet | Signature thật, trạng thái confirmed, số dư nguồn/đích và token-account owner thực tế; bảng đối chiếu dự báo–thực tế |

“Không Custos” không có nghĩa bỏ xác nhận ký của người dùng, bỏ signature validation hay bỏ Solana preflight. Không cần làm giao dịch sai trở thành giao dịch thành công. **Giao dịch độc hại về ý nghĩa vẫn có thể hợp lệ về quyền ký**; chính khoảng trống này là điều demo chứng minh.

Lấy ca C làm cao trào: bảng “Custos dự báo” đứng cạnh “Devnet đã ghi nhận”. Ca B thể hiện người dùng tránh được việc gửi nhờ cảnh báo, không tuyên bố SDK có quyền ngăn mọi ví hay hoàn tác giao dịch. Nếu UI cho “Vẫn ký”, phải nói rõ người dùng vừa chọn bỏ qua cảnh báo.

## 4. Thiết kế UI tập trung vào bằng chứng

### Trước ký

- Thanh đầu: tên ví demo, mạng **Solana Devnet**, số dư token thử nghiệm và trạng thái Custos bật/tắt. Token phải có nhãn `DEMO`, không quy đổi thành USD hoặc gọi là USDC thật.
- Khu thao tác giống ví thật: người nhận, tài sản, lượng chuyển, phí ước tính, xác nhận ký. Lời mời nhận quà được gắn là **kịch bản thử nghiệm** ở phạm vi trang, không dụ người dùng đưa ví tài sản thật vào.
- Chế độ có Custos: hiển thị hành động được nhận diện, hậu quả ngoài hành động chính, reason code mở rộng và giới hạn coverage. Không nhồi log kỹ thuật ở màn chính.
- Chế độ đối chứng: nhãn “Custos tắt — thử nghiệm Devnet”; hộp ký ví thông thường, chỉ cho thao tác trên phiên demo đã chuẩn bị. Nếu một ví bên ngoài cũng có cảnh báo riêng, giữ nguyên cảnh báo đó và giải thích nó thuộc ví ấy; không cố lách.

### Sau ký

Trạng thái có thứ tự thật: **Chờ ký → Đã gửi → Chờ xác nhận → Đã xác nhận → Đang đọc hậu quả → Đã đối chiếu**. Tách “thất bại thực thi”, “chưa xác định” và “chưa đọc đủ bằng chứng”. Có signature chưa đủ để ghi thành công. RPC trả `null` khi lấy transaction không có nghĩa giao dịch chưa từng được gửi.

Ví dụ bố cục (giá trị phải đọc từ phiên thật, không gán hằng số):

| Dữ kiện | Custos dự báo trước ký | Devnet ghi nhận sau giao dịch | Đối chiếu |
|---|---|---|---|
| Token tài khoản nguồn | giảm X token | giảm Y token từ transaction metadata | Khớp / Lệch / Chưa đủ dữ liệu |
| Token tài khoản đích | tăng X token nếu có dữ liệu | tăng Y token từ metadata | Khớp / Lệch / Chưa dự báo |
| Quyền sở hữu token account | ví demo → địa chỉ nhận quyền | owner đọc lại từ đúng account | Khớp / Lệch / Chưa đủ dữ liệu |
| Phí SOL | ước tính trước ký nếu có | `meta.fee` và fee payer của giao dịch | Hiện riêng, không lẫn với số token mất |

Phải giữ **địa chỉ token account nguồn**, không chỉ truy vấn token account “thuộc ví nạn nhân”: sau SetAuthority, account có thể biến mất khỏi danh sách thuộc ví nhưng token vẫn nằm trong đó dưới quyền chủ mới. Chuyển một nửa + đổi chủ không được hiển thị là “đã chuyển hết token”; nói đúng “đã chuyển X; quyền kiểm soát phần còn lại đã đổi”.

Animation chỉ phản ứng theo dữ liệu: luồng token di chuyển sau xác nhận, highlight đúng dòng vừa đo, nút Explorer và “Tạo phiên thử mới”. Không dùng bộ đếm/timeout/animation như nguồn sự thật. Tôn trọng reduced motion; số và nút phải đọc được trên màn chiếu, mobile và bàn phím.

## 5. Tách ba trách nhiệm kỹ thuật

1. **SDK Custos:** inspect, L2 verdict, L3 explanation/advisory, prediction snapshot. Không giữ signer, không broadcast, không sửa `InspectResult` để chứa receipt của demo.
2. **Ví tích hợp:** áp dụng policy bật/tắt trong môi trường demo; xin đồng ý ký; kiểm signer/network; ký và gửi đúng bytes; theo dõi xác nhận. Khi bật Custos, giữ nguyên neo kết quả, kiểm freshness/message/signer/network và chống race hiện có.
3. **Bộ đối chiếu demo:** giữ dự báo, lấy receipt và trạng thái tài khoản, so sánh dữ liệu tương ứng, lưu bằng chứng công khai không có secret. Bộ này không được lấy số dự báo để làm giả số thực tế.

Tách điểm kiểm policy khỏi tầng gửi dùng chung. **Không sửa `kyVaGui()` thành “nếu tắt thì bỏ mọi guard”.** Nhánh đối chứng dùng đường vào riêng giới hạn cho hiện trường Devnet, có đồng ý ký và snapshot message bất biến; nhánh bảo vệ vẫn yêu cầu neo inspect hợp lệ. Cả hai dùng chung cơ chế gửi, trạng thái lỗi, khoá chống lặp và xác nhận.

Không tạo neo inspect giả để nhánh tắt vượt qua guard. Nếu muốn đo dự báo trong phiên tắt, bộ đo có thể gọi inspect riêng trước thực thi và lưu cho đối chiếu; ghi rõ “Custos được chạy để đo dự báo, không dùng làm cổng bảo vệ của lượt ký này”. Lỗi của bộ đo không được lén biến nhánh đối chứng thành chế độ bảo vệ; nếu thiếu dự báo thì hiện không thể đối chiếu và xử lý buổi demo trung thực.

## 6. Chuẩn bị hiện trường và người ký

- Dùng ví Devnet chuyên trình diễn và token mint thử nghiệm thuộc nhóm; ví người xem không phải yêu cầu bắt buộc. Có thể dùng wallet adapter với ví trình diễn riêng; nếu dùng signer local dành riêng cho sân khấu thì khoá ở phía local/keystore, không nhúng vào Vite env public. Mỗi lựa chọn phải cho thấy hành động đồng ý ký thật.
- Bản public không signer tiếp tục cho mô phỏng, ghi rõ. Không biến thiếu signer thành một hoạt cảnh có signature giả. Việc ký live phải có dấu hiệu nhận biết rõ với người xem.
- Xác minh cluster thực qua RPC/genesis identity, không chỉ chuỗi URL hoặc nhãn `devnet`; không cho đường thực thi hoạt động trên mainnet hay cluster chưa nhận diện.
- Chuẩn bị mint/account và SOL phí trước buổi demo. Ghi các transaction chuẩn bị riêng; không tính chúng là giao dịch “người dùng đã ký” trong ba ca A/B/C. Không phụ thuộc faucet lúc lên sân khấu.
- Để reset lặp lại được, giữ quỹ token thử nghiệm dự trữ trước khi thu hồi mint authority, hoặc tạo mint mới và tài khoản mới như script đang làm. Không hứa có thể mint thêm vào mint đã thu hồi authority. Account nguồn sau đổi chủ được đánh dấu đã dùng; tạo account/phiên mới, không vẽ số dư cũ trở lại.
- Tạo session manifest công khai gồm cluster, mint, source/target account, signer public key, authority recipient, giá trị và session ID; không có private key. Hạn chế đường ký đối chứng vào đúng các account, program, instruction và mức phí/giá trị cần cho kịch bản. Không cho URL `#tx` tùy ý trở thành quyền ký bằng ví trình diễn.
- Không tự động gửi khi mở trang, chọn kịch bản hoặc tắt công tắc. Đổi chế độ huỷ pending request/consent cũ; người dùng phải bắt đầu thao tác mới. Khi đóng tab hoặc reload, khôi phục signature đang chờ để tra cứu, không tự tạo và gửi một transaction mới.

## 7. Dự báo và receipt phải nói về đúng giao dịch

Lưu snapshot trước ký: session/scenario, cluster, signer, account addresses, serialized message/hash, blockhash và hạn hiệu lực, slot/thời điểm lấy trạng thái, raw amounts/decimals, token-account authority, kết quả inspect bất biến. So với message đã ký; nếu wallet sửa transaction thì prediction cũ không còn hợp lệ.

Với đường bảo vệ, đổi message/blockhash phải chạy inspect và xin consent mới theo guard hiện có. Với đường đối chứng, refresh transaction phải xin ký lại và cập nhật snapshot đo; không dùng dự báo cũ rồi tuyên bố “cùng một giao dịch”. Đổi account để làm hai nhánh A/B là hai giao dịch tương đương theo kịch bản, **không phải cùng bytes hoặc cùng ảnh chụp chain**.

Ưu tiên trình diễn nhánh bảo vệ trước khi có thao tác thay đổi tài khoản; nếu tiếp tục dùng mẫu đó cho nhánh đối chứng thì đây là yêu cầu ký mới có consent mới. Không hồi sinh tự động transaction vừa bị huỷ. Mỗi phiên phải kiểm hiện trường còn khớp và blockhash còn dùng được; không cho hai tab cùng chạy trên một account nguồn.

Sau gửi: lấy signature đúng transaction đã ký, theo dõi confirmed/finalized, kiểm lỗi thực thi, đọc `getTransaction` với version hỗ trợ và commitment phù hợp. Đối chiếu số token trước/sau từ metadata theo **account index + mint**, xử lý account tạo/đóng và dữ liệu thiếu rõ ràng. `getTransaction` có thể chưa sẵn ngay: retry có giới hạn rồi hiện “chưa đủ dữ liệu”, không điền số từ mô phỏng.

Owner của token account lấy lại từ account cụ thể sau xác nhận, lưu slot/commitment và public key. Số dư account đọc lại sau giao dịch là trạng thái tại thời điểm đọc, có thể bị giao dịch khác thay đổi; không khẳng định đó là ảnh chụp chính xác tại slot thực thi nếu RPC không cung cấp. Dùng phiên cô lập và chỉ đánh dấu khớp trên dữ kiện có nguồn đủ; lệch phải hiển thị, không ép cho đẹp.

Không xoá prediction khi `gui.ts` báo thành công: hiện `App.tsx` dọn `ketQua`/`txCho`, nên cần receipt/prediction state riêng ở demo, độc lập với pending-sign state. Lưu public receipt để tải JSON và kiểm lại qua Explorer; giữ secret ngoài log.

## 8. Test và điều kiện nghiệm thu

| Kiểm tra bắt buộc | Kỳ vọng |
|---|---|
| Giao dịch lành tính, bật và tắt Custos | Mỗi lượt xin consent riêng; ký/gửi thành công; metadata và số dư đúng |
| Giao dịch nguy hiểm, bật Custos rồi huỷ | Có reasons/diff trước ký; signer call = 0, send call = 0; trạng thái nguồn trong phiên không đổi |
| Giao dịch nguy hiểm, tắt Custos | Không cần neo inspect để được ký trong session demo hợp lệ; signer/send chạy sau consent; có receipt thành công thật |
| Hậu quả Transfer + SetAuthority | Token giảm đúng lượng chuyển; target nhận đúng; owner đổi đúng; không báo rút hết khi chỉ chuyển một phần |
| Người dùng chọn vẫn ký khi bảo vệ bật | Giữ kiểm neo/freshness; ghi lựa chọn bỏ qua cảnh báo; hậu quả có thể xảy ra, không nói đã được chặn |
| Bật Custos nhưng neo thiếu/cũ/message bị tráo | Không ký; test xác nhận bản sửa đường tắt không làm hỏng cổng này |
| Từ chối ký/đổi ví/đổi mạng/đổi chế độ | Pending consent cũ vô hiệu; không gửi nhầm |
| Double-click/nhiều tab/timeout gửi | Không tự tạo giao dịch mới; giữ signature để tra cứu; không suy thất bại chỉ từ timeout |
| `meta.err` khác null, RPC null hoặc metadata thiếu | Tách thất bại với chưa rõ; không hiện “hậu quả đã xảy ra” hoặc “đối chiếu khớp” sai |
| So sánh sai mint/account/decimals/snapshot cũ | Báo lệch hoặc không đủ cơ sở, không tự đổi dữ liệu cho khớp |
| Reset sau đổi chủ | Tạo phiên/account mới có funding thật; không tái dùng account đã mất quyền; không phá hiện trường public |
| Bản public không signer | Chỉ mô phỏng có nhãn, không fake transaction/signature; không lộ khoá |

Test offline cho policy, consent, trạng thái gửi, parser receipt và phép đối chiếu; browser test cho luồng người dùng. Live Devnet nghiệm thu riêng trên session đã chuẩn bị: ca A, B, C, rồi tạo phiên mới và chạy lại. Chỉ đánh dấu hoàn thành live khi có signature/slot/kết quả mạng và bằng chứng phép huỷ không gọi signer/send. Không đánh giá khả năng phát hiện tổng quát từ ba ca tự tạo.

## 9. Kịch bản trình diễn đề nghị

1. Chuyển một lượng token DEMO bình thường: ký, xác nhận, mở nhanh Explorer. “Đây là ví giao dịch thật trên Devnet.”
2. Mở lời mời nhận quà có hành vi đổi quyền; Custos hiện số token sẽ bị chuyển và quyền sẽ mất. Huỷ. “Custos cho tôi biết điều này trước khi ký; ví chưa gửi gì.”
3. Chuyển sang phiên đối chứng được chuẩn bị; chủ động ký khi Custos tắt. Hiện tiến trình thật, sau đó bảng dự báo–thực tế và Explorer. “Devnet vừa ghi nhận đúng các thay đổi này.” Chỉ dùng câu cuối nếu bằng chứng khớp.
4. Kết: “Custos giúp ví và dApp giải thích hậu quả trước khi người dùng quyết định ký.” Mở giới hạn coverage khi giám khảo hỏi; không kết luận giao dịch an toàn tuyệt đối.

Nếu mạng lỗi, giữ trạng thái lỗi/chưa rõ và chuyển video của lượt đã ghi nhận, có nhãn ghi hình. Không dùng video thay live mà che giấu nguồn.

## 10. Đầu ra Claude cần bàn giao

- Code ở demo wallet/harness và tests, SDK giữ nguyên vai trò; sơ đồ điểm kiểm policy và điểm ký/gửi.
- Runbook chuẩn bị ví, funding, session, trình diễn, reset, xử lý RPC timeout; không chứa secret.
- Probe chứng minh nhánh tắt ký được trong session, nhánh bật vẫn giữ guard; kiểm trên build sẽ trình bày.
- Receipt thật đã bỏ secret, signature và Explorer; bảng dự báo so với thực tế, có nguồn cho từng hàng.
- Cập nhật `FINDINGS.md` bằng kết quả thực đo và danh sách chưa làm; không gọi một UI mock là hoàn thành. Không commit/push.

## Tài liệu RPC để kiểm triển khai

- [Solana sendTransaction](https://solana.com/docs/rpc/http/sendtransaction): RPC nhận transaction không đồng nghĩa mạng đã xác nhận thành công; phải theo dõi trạng thái sau gửi.
- [Solana getTransaction](https://solana.com/docs/rpc/http/gettransaction): tra transaction bằng signature với commitment/version phù hợp; kết quả có thể là null nếu chưa tìm được ở commitment yêu cầu.
