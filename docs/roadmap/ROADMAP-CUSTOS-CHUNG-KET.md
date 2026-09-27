# Custos — roadmap nâng cấp cho vòng chung kết

> Bản đề xuất sau chạy thử ngày 27/09/2026. Track: **Best Technical Build**.
> Đây là yêu cầu triển khai cho Claude, **không phải báo cáo đã triển khai**.
> Lịch và hình thức thi chỉ tra tại [nguồn lịch duy nhất](../cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md).
> Baseline: HEAD `964363a2232c681852cce30b77fe0a5b6b22913b` **cộng thay đổi chưa commit**.
> [Báo cáo chạy thử và bằng chứng](../review/chung-ket-20260927/BAO-CAO.md).

## 1. Quyết định sản phẩm

**Hãy biến Custos thành một trải nghiệm kiểm chứng giao dịch mà người xem tự hiểu, tự đối chiếu và tự thử lại được.** Phần đáng đầu tư nhất hiện nay là đường đi từ yêu cầu của dApp đến hậu quả thật của giao dịch; không cần một đợt thay toàn bộ giao diện nữa.

Ba kết quả người xem phải thấy:

1. **Cùng chuyển một lượng token, nhưng quyền kiểm soát có thể khác.** Custos chỉ ra sự khác biệt bằng dữ kiện, không chỉ bằng màu đỏ.
2. **Cảnh báo không đảo ngược một chữ ký.** Bật Custos nhưng chủ động bỏ qua cảnh báo thì giao dịch vẫn thực thi; số dư và quyền thay đổi phải khớp dữ liệu Devnet.
3. **Chưa thấy token rời ví không có nghĩa chưa trao quyền.** Cho phép → ứng dụng dùng quyền → thu hồi, với người ký và giới hạn từng bước rõ ràng.

Các cơ chế trên đã có đáng kể trong repo. Việc cần làm là nối chúng thành một sản phẩm trình diễn ổn định, không tạo thêm một ví hay một trang giao dịch riêng.

### Vì sao chọn hướng này

[Learning Hub chính thức](https://unihackfest.vn/learn/) hiện công bố trọng số Technical: chiều sâu kỹ thuật 30%; kiến trúc on-chain/off-chain và chất lượng contract 25%; vận dụng Solana, khả năng kết hợp và hiệu năng 25%; demo và trình bày 20%. Hướng nâng cấp dưới đây tập trung làm bằng chứng của các tiêu chí đó dễ kiểm tra hơn. Không suy từ trọng số rằng Custos phải thêm contract.

| Hướng cân nhắc | Giá trị | Quyết định |
|---|---|---|
| Thêm nhiều kịch bản và animation | Tạo cảm giác phong phú nhưng dễ che mất chất lượng từng ca | Chỉ thêm khi lộ khoảng trống kỹ thuật có thể chứng minh |
| Làm sâu chuỗi phân tích → quyết định → hậu quả → bằng chứng | Thể hiện cả sản phẩm, Solana và độ đúng | **Hướng chính** |
| Mở rộng sang ví đầy đủ, nhiều chain hoặc agent tự ký | Phạm vi rất lớn, đổi sản phẩm | Không thuộc bản nâng cấp này |

Không cam kết điểm hay xác suất đạt giải. Chưa có cơ sở chấm một điểm tổng đáng tin khi đường live của lượt kiểm này bị quá hạn và chưa chạy model thật trên bản đang kiểm.

## 2. Hiện trạng đã kiểm, không dựng lại phần đã có

| Hạng mục | Hiện trạng | Hành động |
|---|---|---|
| TypeScript + toàn bộ test | **1.136/1.136 qua**, không skip trong lượt mới | Giữ làm baseline, không gọi là độ chính xác phát hiện |
| Sáu ca hồi quy từ phản biện trước | **6/6 qua** | Không mở lại F-01/02/03/04/07/08 như lỗi còn tồn tại |
| Replay RPC | **29/29 qua**, offline; có 12 mẫu ghép lô account theo địa chỉ | Đưa khả năng này tới trải nghiệm người xem, giữ provenance |
| Phòng phân tích | Có 9 lựa chọn, mở mặc định, không cần keypair | Giữ; bổ sung lối vào có hướng dẫn |
| Ví mẫu thực thi | Có bật/tắt Custos, override, actor, revoke, receipt và phục hồi | Hoàn thiện điều phối và bằng chứng, không viết lại signer |
| Kịch bản thực thi | 9 thao tác; một số là các bước của cùng một tình huống | Không quảng cáo là 9 kiểu tấn công độc lập |
| Dự báo so với thực thi | `live/Receipt.tsx` và `receipt.ts` đã có | Nâng khả năng đọc và liên kết chứng cứ |
| RPC dự phòng | Đã có `scripts/rpcDuPhong.ts`; cấu hình dự phòng hiện chỉ đọc khi DEV | Cần cách vận hành bản trình diễn production và provenance mỗi lượt |
| AI | Có server adapter, nguồn diễn giải và fallback; build kiểm cố ý không nạp env | Không kết luận deployment công khai thiếu AI; cần kiểm riêng môi trường đích |
| CPI | Có script mô phỏng CPI lành ATA; CPI nguy hiểm có test dùng RPC giả | Mở rộng có mục tiêu; không nhận là đã chứng minh CPI nguy hiểm live |
| UI | 9 trạng thái/trang kiểm ban đầu: không lỗi JS, không tràn ngang; 1 axe finding ở banner mock | Đánh bóng luồng và trạng thái, không redesign toàn app |

### Những điểm thực sự cần xử lý

**CK-F01 — P0 cho độ sẵn sàng trình diễn: RPC sống một phần, nhưng không phân tích được.** Sau khi mở quyền mạng chỉ đọc, ví đọc được 500 token thử nghiệm và lịch sử; ba ca phân tích đều hiện quá hạn 12 giây. Probe riêng: `getLatestBlockhash` 316 ms, `getBalance` 300 ms, hai phương thức đọc account quá hạn 8.003 ms. Đây là quan sát trên endpoint/môi trường ở lượt đo này, không chứng minh Devnet toàn cầu hỏng. UI fail-safe đúng: không kết luận an toàn. Script mô phỏng 9 ca cũng không hoàn tất, đã dừng; không có kết quả 9/9 mới.

**CK-F02 — P1: đường lui mock không tiếp tục đúng câu chuyện của kịch bản.** Chọn “Nhận thưởng nhưng token rời ví” trong `?mock=danger`, thẻ cố định lại nhận diện `swap · SOL → USDC`. Có nhãn mock trung thực, nhưng người xem không thể dùng nó để kiểm chứng ca đang chọn. Cần replay theo kịch bản; không sửa nhãn để làm mock trông như live.

**CK-F03 — P1 về khả năng hiểu: chín thẻ ngang cấp và thuật ngữ kiểm thử lộ trên giao diện.** “Đối chứng — engine phải im”, “Dữ liệu khuyết — fail-safe” hợp với tài liệu kỹ thuật hơn người mới. Trên màn nhỏ, danh sách kéo dài trước kết quả. Đây là đánh giá chuyên gia trên UI đã chạy, chưa phải kết quả nghiên cứu người dùng.

**CK-F04 — P1 về trình bày: công nghệ đã có nhưng bằng chứng nằm rời nhau.** Trang chủ có A/B; Phòng phân tích có tình huống; Ví của bạn có thực thi; Inspector nhận base64; Số liệu đọc báo cáo. Người xem phải tự nối chúng. Cần liên kết một `scenarioId`/lượt kiểm xuyên suốt mà không cho URL hoặc dữ liệu chia sẻ cấp quyền ký.

**CK-F05 — P1 về độ tin cậy AI: chưa có phép đo mới sau các guard mới.** Sáu regression qua chỉ chứng minh các ca đó đã bị chặn. Không chứng minh model không thể nói sai hoặc AI tốt hơn tất định. Cần tập giữ lại và đo model thật riêng, không gọi API giả là AI thật.

**CK-F06 — P2: trạng thái tài liệu bị phân tán.** `TIEN-DO.md` còn dòng hiện hành cũ; báo cáo live trước có ví khách nhưng quyết định mới đã bỏ ví khách. Phải gắn nhãn lịch sử, tránh để Claude hoặc người phản biện hiểu tính năng cũ còn hoạt động.

**CK-F07 — P2: banner mock nằm ngoài landmark.** Axe báo `region`, mức moderate. Không phải lỗ hổng tài sản; sửa cùng phần hoàn thiện accessibility.

## 3. Ranh giới bất biến

- Ví demo duy nhất: **`AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`**. Không tạo ví khách mới, không đổi mặc định. Token account/mint của phiên có thể khác, nhưng ví mặc định không đổi.
- Không đọc, xuất hoặc nhúng keypair vào báo cáo/bundle. Cơ chế ký hiện tại chỉ ở màn thực thi của ví mẫu bằng file cục bộ đúng ví; roadmap không thay quyết định này.
- SDK chỉ đọc/mô phỏng. Consumer mới ký/gửi. Không thêm contract, memo hoặc registry on-chain để tạo cảm giác có blockchain.
- `level` và `reasonCodes` do L2. AI không tạo/sửa mức; chỉ giải thích và có thể yêu cầu xem thủ công.
- `expectedAction` là lời khai không đáng tin; khớp không làm giảm cảnh báo. Không đổi tên nó thành “ý định thật”.
- Thiếu dữ liệu không thành `safe`. UI không biến `unknown` thành 0 hoặc “khớp”.
- SetAuthority không đồng nghĩa rút token. Approve không đồng nghĩa đã chuyển. Revoke không hoàn tiền đã mất. Delegate/Token-2022/ALT không tự thân là độc hại.
- Thông tin một lần mô phỏng, một lần gửi, một receipt và một kết quả phát lại phải phân biệt rõ.
- Không đổi hợp đồng `InspectResult` đã khoá. Metadata bổ sung đi qua cơ chế mở rộng đã có hoặc envelope của consumer; không nhét dữ liệu trình diễn vào verdict.
- Không sửa test để hợp thức hoá output sai. Không commit/push/publish/deploy tự động.

## 4. Trải nghiệm đích

### 4.1 Người xem mới

`Mở demo → chọn “Thử có hướng dẫn” → ca chuyển bình thường → ca cùng lượng chuyển nhưng đổi quyền → bấm xem dữ kiện → hiểu kết quả và giới hạn`.

- Không cần keypair, faucet hay API key để xem luồng này.
- Có hai nguồn độc lập: **Mô phỏng Devnet hiện tại** và **Chạy engine trên dữ liệu RPC đã ghi**.
- Nếu live lỗi, giữ tên kịch bản và lựa chọn của người xem; cho họ chủ động chuyển sang replay tương ứng.
- Nếu chỉ có ảnh/kết quả lưu, gọi đúng là “Kết quả đã lưu”; không nói engine vừa chạy.
- Có nút “Mở cùng giao dịch trong Inspector” dùng đầu vào được validate; Inspector luôn là đường chỉ đọc.

### 4.2 Người vận hành trình diễn

`Kiểm tra sẵn sàng → mở đúng ví cố định → chọn ca → đọc cảnh báo → huỷ hoặc ký có chủ ý → chờ metadata → đối chiếu dự báo/thực tế → mở Explorer`.

- Không tự ký khi bấm Next/Play hoặc khi chuyển cảnh.
- Trên màn chiếu, sự thay đổi tài sản và quyền là trung tâm; kỹ thuật mở theo nhu cầu.
- Mọi “thực thi thành công” dựa trên receipt/metadata, không dựa vào việc nhận được signature.
- Reload, mất actor key hoặc đang có giao dịch chưa rõ kết quả phải nêu đúng điều kiện; không giả vờ reset chain.

### 4.3 Người phản biện kỹ thuật

`Kết quả → hậu quả cụ thể → evidence/trace → nguồn + slot + coverage → tải receipt đã làm sạch → tái kiểm bằng CLI/SDK`.

Hash chỉ chứng minh nội dung được đối chiếu, không chứng minh RPC nói thật. Replay không phải lần thực thi Solana mới.

## 5. Thứ tự ưu tiên và phụ thuộc

P0/P1 dưới đây là ưu tiên phát triển bản trình diễn, không phải nhãn mức độ lỗ hổng.

| Thẻ | Ưu tiên | Vai chính | Phụ thuộc | Kết quả giao được |
|---|---|---|---|---|
| CK-00 | P0 | D + các chủ phần | Không | Baseline và bản đồ phần đã có |
| CK-01 | P0 | B, A kiểm ranh giới | 00 | Preflight RPC và lượt kiểm có nguồn rõ |
| CK-02 | P0 | A/B | 00 | Replay đúng kịch bản trên UI |
| CK-03 | P1 | B/C | 02 | Lối dùng thử có hướng dẫn |
| CK-04 | P1 | B/C, A cung cấp evidence | 03 | Màn hậu quả và đường mở bằng chứng |
| CK-05 | P0 | B | 01, 04 | Chuỗi A/B, huỷ, override kiểm chứng được |
| CK-06 | P1 | B/C | 05 | Câu chuyện cấp quyền → dùng quyền → thu hồi |
| CK-07 | P0 | B | 01, 05 | Sẵn sàng phiên, phục hồi và reset trung thực |
| CK-08 | P1 | C/D | 00 | Đánh giá model thật sau guard mới |
| CK-09 | P1 | B/C | 04, 08 | AI có ích và nguồn phản hồi rõ |
| CK-10 | P1 | A/D | 00 | Ma trận semantics và đối chứng có chiều sâu |
| CK-11 | P1 | A/B | 00, 10 | Consumer ngoài monorepo dùng được SDK |
| CK-12 | P1 | B/C | 03–06, 09 | UI gọn, đọc tốt trên máy chiếu/mobile |
| CK-13 | P0 trước bàn giao | D + chủ phần | 05–11 | Bộ bằng chứng nhất quán, không lẫn lịch sử |
| CK-14 | P0 trước bàn giao | A/B/D | 07, 12, 13 | Nghiệm thu bản cuối + đo độ bền/hiệu năng |
| CK-15 | P1 | D | 13, 14 | Demo, deck và phản biện khớp sản phẩm |

Lát cắt đầu tiên: **00 → 01 + 02 → 03 + 04 → 05 + 07**. Chưa qua lát cắt này thì chưa thêm loại tấn công mới. Các nhóm có thể làm những thẻ độc lập, nhưng sửa đúng thư mục sở hữu; thay đổi giao diện giữa vai phải được ghi nhận.

Trạng thái thực thi chỉ cập nhật tại `docs/roadmap/TIEN-DO.md` với tiền tố `CK-`; ngữ cảnh tiếp tục ở `BAN-GIAO.md`. Không coi bảng yêu cầu trên là bảng DONE thứ hai.

## 6. Đặc tả từng thẻ cho Claude

### CK-00 — Xác lập baseline và tránh xây trùng

**Đọc:** `AGENTS.md`, `CUSTOS.md`, đặc tả core/L3, threat model, báo cáo lượt này, `TRANG-THAI-SUA.md`, roadmap CU/TB và code thực tế.

**Làm:** ghi HEAD, dirty flag, phiên bản Node/npm, danh sách file có thay đổi sẵn. Đối chiếu từng thẻ CK với CU/TB và luồng live; phần đã có thì đánh dấu “tái sử dụng”, không mở implementation mới. Dọn dòng trạng thái hiện hành cũ nhưng giữ số liệu lịch sử với nhãn.

**Nghiệm thu:** có danh mục “đã có / cần sửa / mới / chưa kiểm”, lệnh tái hiện và artifact của baseline. Không reset mã người khác; không lấy số test trong văn bản làm kết quả chạy mới.

### CK-01 — RPC đáng tin ở mức vận hành, không chỉ có URL dự phòng

**Căn cứ:** CK-F01. **Vùng mã:** `scripts/rpcDuPhong.ts`, `apps/demo-wallet/src/hienTruong.ts`, `live/rpc.ts`, `live/session.ts`, tầng fetch/observation trong core.

**Làm:**

1. Preflight chỉ đọc: xác định Devnet bằng genesis hash khi có, blockhash, tài khoản ví và tài khoản token cần dùng, khả năng mô phỏng ca lành. Ping balance thành công không đủ để gắn “Sẵn sàng”.
2. Hiện kết quả từng bước: thành công/chưa đo/quá hạn, lần đo, tên nhà cung cấp đã làm sạch, bước thất bại. URL chứa credential không xuất ra UI/log/receipt.
3. Tái sử dụng fallback hiện có. Thiết kế cấu hình cho bản production dùng để trình diễn; không đơn giản bỏ điều kiện DEV rồi nhúng API key vào bundle. Nếu dùng proxy, chỉ nhận RPC Devnet nằm trong allowlist của người vận hành, có hạn mức và không cho client chọn URL tuỳ ý.
4. Quy định tổng deadline một inspection và số retry tối đa. Khi đổi endpoint giữa lần đọc, bảo toàn provenance từng observation; nếu dữ liệu không còn nhất quán thì bỏ attempt và chạy lại lượt đọc từ đầu. Không gộp hai nhà cung cấp thành “một snapshot”.
5. Abort từ người dùng phải dừng retry. Response đến muộn không ghi đè lượt mới. Tách chính sách đọc với gửi; không tự gửi lại một giao dịch chưa rõ kết quả.

**Kiểm:** endpoint A trả balance nhưng treo accounts; B hoạt động; hai endpoint khác genesis; cả hai 429; abort; late response; JSON-RPC error trong HTTP 200. Không chỉ test đổi host là pass.

**Nghiệm thu:** giới hạn chờ hữu hạn theo cấu hình; UI chỉ rõ vì sao không sẵn sàng; credential không lọt artifact; lượt chuyển nguồn không làm kết quả bị gắn sai nguồn hoặc hạ mức. Đo trên đúng build định trình diễn, không chỉ `npm run vi`.

### CK-02 — Replay theo kịch bản, dùng engine thật

**Căn cứ:** CK-F02; replay CLI đã qua 29 mẫu. **Vùng mã:** `scripts/ky-thuat/replay-rpc.ts`, `chay-replay.ts`, `kichBan.ts`, `App.tsx`, receipt/Inspector hiện có.

**Làm:** tạo danh mục replay từ fixture được phép công khai, ít nhất các ca trong hành trình chính: chuyển lành, chuyển kèm đổi chủ, chỉ đổi chủ, quyền có giới hạn, dữ liệu thiếu. Mỗi mục có ID, phiên bản/schema, input, ví được bảo vệ, nguồn capture, thời điểm/slot nếu có, chain, khả năng replay và giới hạn.

Đưa adapter RPC fixture vào luồng inspect chỉ đọc. UI hiện kết quả **vừa chạy lại engine** tách khỏi kết quả capture cũ; sai khác do engine đổi phải hiện ra. Thiếu method/account trong fixture thì báo thiếu, không lén gọi live bù vào.

Không ép dùng replay 29 mẫu lịch sử làm ví demo mới: mẫu có protected address khác chỉ được mở trong phòng bằng chứng với địa chỉ gốc và nhãn lịch sử; không thay địa chỉ của ví cố định và không sửa fixture để trông như cùng ví. Hành trình demo chính cần mẫu đúng ví cố định.

**Kiểm:** offline tuyệt đối; đổi kịch bản đổi đúng tx; fixture hỏng/khác version/thiếu call; mock không được sinh receipt thực thi; replay không mở signer; URL từ ngoài không tự chọn “live” hay cấp consent.

**Nghiệm thu:** các ca chính chạy được khi tắt mạng; không có RPC phát sinh; nhìn một lần biết “replay”, thời điểm dữ liệu và engine đang dùng. Giữ mock tĩnh cho test layout nhưng tách khỏi lối dự phòng chính.

### CK-03 — Hành trình ngắn và thư viện nâng cao

**Vùng mã:** `App.tsx`, `kichBan.ts`, `landing/LandingPage.tsx`.

**Làm:** giữ Phòng phân tích mặc định, thêm “Thử có hướng dẫn” và “Tự chọn tình huống”. Luồng đầu chỉ có ba chặng: chuyển bình thường → khác biệt về quyền → đọc bằng chứng. Thư viện giữ mọi ca hiện có, nhóm theo tài sản/quyền/dữ liệu thiếu; gắn đối chứng liên quan cạnh ca nguy hiểm.

Đổi copy người dùng: “Đối chứng — engine phải im” → “Giao dịch tương tự để đối chiếu”; “Dữ liệu khuyết — fail-safe” → “Chưa đủ dữ liệu để kết luận”. Đưa từ kỹ thuật vào phần mở rộng.

**Kiểm:** cold start không localStorage/key/env; bàn phím chọn ca; back/forward; URL có scenario lạ; chuyển tab khi có pending. Không giảm bảo vệ lock đang có để navigation trông mượt hơn.

**Nghiệm thu:** từ trang demo, một thao tác có thể bắt đầu ca; ở replay, không phải mở devtools để có kết quả. Không đưa setup ký vào đường thử chỉ đọc.

### CK-04 — Hậu quả là trung tâm của màn kết quả

**Vùng mã:** thẻ kết quả hiện có trong `App.tsx`, `Trace.tsx`, `live/Receipt.tsx`, `live/receipt.ts`, copy L3; tái dùng format số của core.

**Bố cục:**

```text
[Nguồn dữ liệu] [Mức L2] [AI: nguồn diễn giải]
Điều thay đổi chính — một câu lấy từ dữ kiện
TÀI SẢN               QUYỀN KIỂM SOÁT
Trước → Sau           Chủ / Delegate / Hạn mức
[Vì sao có cảnh báo?]  [Phần chưa đọc được]
[Huỷ yêu cầu]          [Hành động theo policy hiện tại]
Sau thực thi: Dự báo | Devnet ghi nhận | Khớp / Lệch / Chưa rõ
```

Phân biệt “token còn trong tài khoản” với “ví cũ còn quyền sử dụng”. Số dư của Phòng phân tích và token của phiên thực thi có thể là hai tài khoản khác nhau; hiển thị mã tài sản/mint rút gọn và nguồn, không tạo cảm giác chúng là một ví tiền fiat thống nhất.

Nút “Vì sao” mở evidence/trace thật đã có trong inspection, không gọi AI để tạo lý do mới. Từ diff đi tới lệnh/program/account liên quan; thiếu liên kết thì nói chưa có, không dựng trace suy đoán.

**Nghiệm thu:** ca chỉ đổi chủ không animate token biến mất; ca transfer hiện đúng đơn vị; quyền ở slot muộn không được gắn “khớp” nếu chưa quy cho tx; người xem mở được địa chỉ đầy đủ và Explorer. Màu chỉ là tín hiệu phụ bên cạnh chữ/icon.

### CK-05 — Điều phối A/B và ba quyết định

**Vùng mã:** `WalletExecution.tsx`, `live/session.ts`, `scenarios.ts`, `Receipt.tsx`, dApp handoff. **Không tạo trang thực thi mới.**

**Làm:** bổ sung điều phối dựa trên các hàm đang có, không viết nhánh tấn công thứ hai. Một manifest phiên ghi scenario, account nguồn/đích, số dư trước, loại hành động, policy, message fingerprint và nguồn kết quả.

Ba nhánh phải có thể biểu diễn:

| Nhánh | Kết quả cần chứng minh |
|---|---|
| Custos bật → cảnh báo → huỷ | Không có broadcast; token/quyền không đổi do thao tác này |
| Custos bật → cảnh báo → override có consent | Giữ mức đỏ; chính message đã consent được ký; hậu quả theo chain |
| Custos tắt → consent → thực thi | Giao dịch vẫn diễn ra; không dùng L2 để âm thầm chặn đối chứng |

Không tự động phát live cả ba nhánh khi bấm Play. Sau nhánh phá trạng thái, phải tạo phiên token phù hợp trên **cùng ví**, đo lại điều kiện; không tuyên bố A/B byte-identical nếu blockhash/account/số dư khác. Với hai lần mô phỏng cùng input có thể so exact message; với hai lần thực thi, ghi rõ các biến đã chuẩn hoá và các biến thay đổi.

**Kiểm:** huỷ không send; bật/tắt không sửa payload; thay số lượng/account/blockhash sau consent làm mất hiệu lực xác nhận theo chính sách hiện có; override không sửa verdict; pending không nhận lần ký thứ hai.

**Nghiệm thu:** người vận hành chạy được chuỗi có receipt và Explorer; chênh lệch được tính từ metadata, không từ `scenario.expected`. Nếu chưa có quyền/key hoặc Devnet lỗi, ghi `CHƯA KIỂM LIVE`, hoàn thành test offline độc lập.

### CK-06 — Cấp quyền hôm nay, hậu quả ở giao dịch sau

**Tái dùng:** `approve`, `delegate-transfer`, `revoke`, `owner`, `close-authority`, `close` trong `live/scenarios.ts`.

**Làm:** UI dạng các bước có điều kiện: chưa cấp → đã cấp N → actor dùng M → còn N−M → thu hồi. Mỗi bước hiện “ai ký”, nguồn phí và quyền còn lại. Tách số tiền đã chuyển với khả năng được chuyển trong tương lai. `SetAuthority` là câu chuyện riêng về mất quyền dù số dư còn nguyên.

Ca cấp quyền hợp lệ có thể không đỏ. Không chỉnh ngưỡng L2 chỉ để câu chuyện kịch tính. Sau revoke, kiểm bằng mô phỏng thử sử dụng lại quyền hoặc bằng test nguồn phù hợp; nếu UI chỉ chặn chuẩn bị thì không gọi đó là “Solana đã từ chối giao dịch”.

**Nghiệm thu:** không cần tạo ví mặc định khác; actor không bị nhầm là chữ ký chủ ví; reload làm mất actor key phải có thông báo đúng, không khôi phục từ public address. Có ca quyền giới hạn hợp lệ cạnh ca tăng hạn mức bất thường.

### CK-07 — Sẵn sàng phiên và phục hồi khi trình diễn

**Vùng mã:** `live/store.ts`, `session.ts`, `WalletExecution.tsx`, preflight CK-01.

**Làm:** checklist đo được: đúng ví, đúng Devnet, có quyền ký hay chỉ đọc, SOL đủ cho các bước đã ước lượng, source account tồn tại, đúng mint/owner, actor còn trong tab hay không, có pending chưa rõ hay không. Nêu số tiền cần và nguồn tính; không dùng một con số SOL cố định như bảo đảm đủ cho mọi kịch bản.

Phân biệt “làm mới hiển thị”, “khôi phục phiên công khai”, “tạo phiên token mới”. Tạo phiên mới là giao dịch có chi phí và cần consent; không reset chain bằng localStorage. Receipt cũ vẫn mở được sau reset; khi chưa có quyền xác minh thì chỉ xem lại với nhãn chưa xác minh.

**Kiểm:** reload trước/sau signature, nguồn đã đổi chủ, account đã đóng, hai tab, storage bị chặn, pending hết blockhash nhưng chưa rõ chain, actor key mất.

**Nghiệm thu:** không có nút reset làm mất dấu pending; không tự gửi lại; không dùng receipt replay để cho phép ký; tất cả lỗi có bước tiếp theo khả thi hoặc lý do chưa thể tiếp tục.

### CK-08 — Đo AI thật và tập giữ lại

**Vùng mã:** `packages/ai/src/moHinh.ts`, test đối kháng, `scripts/eval-ai.ts`, `data/eval`, `docs/AI-EVALUATION.md`.

**Làm:** giữ kiến trúc tất định + guard + AI phụ trợ hiện tại. Chưa có bằng chứng để thay toàn bộ L3 bằng kiến trúc mới. Tạo tập giữ lại riêng, không dùng để chỉnh prompt/guard rồi tiếp tục gọi là holdout. Nếu dùng một ca để vá, chuyển nó sang regression và thay bằng ca giữ lại mới.

Nhóm ca bắt buộc: lời trấn an viết cách khác; tiếng Việt không dấu/Unicode; bỏ sót một trong nhiều hậu quả; metadata chứa chỉ dẫn; địa chỉ/số bịa; nguy hiểm và đối chứng gần giống; dữ liệu thiếu; output dài/sai schema/timeout. Các ca chỉ đổi bề mặt cùng một fixture phải được nhóm cùng họ để tránh rò giữa tập phát triển và giữ lại.

Chạy deterministic baseline và model thật trên cùng tập. Ghi phiên bản model/provider, prompt/guard hash, input ID, output được chấp nhận hay fallback, lý do, thời gian, token nếu provider thực trả. Thay đổi model không được đổi verdict.

**Đo:** số output vi phạm được chấp nhận; bỏ sót hậu quả; fallback rate; độ trễ. AI so với câu mẫu được đánh giá theo rubric rõ: đủ hậu quả, đúng dữ kiện, đọc hiểu, không trấn an; nếu chỉ nhóm tự chấm thì nói là tự đánh giá. Chưa có người dùng độc lập thì chưa công bố lợi ích hiểu biết người dùng.

**Nghiệm thu:** mọi lỗi đã biết có regression; report hiển thị cả ca fail và mẫu số; không có API key thì giữ trạng thái chưa đo model live, không dựng số thay thế. Không coi 0 lỗi trên tập hữu hạn là chứng minh AI tuyệt đối an toàn.

### CK-09 — AI có giá trị thấy được và nguồn rõ ràng

**Vùng mã:** `goiAiQuaServer.ts`, `live/interpreter.ts`, UI thẻ cảnh báo và API hiện có.

**Làm bắt buộc:** kiểm máy chủ trên môi trường trình diễn thật. Hiện “AI đã diễn giải”, “Câu mẫu tất định”, “AI không phản hồi, đang dùng câu mẫu” theo kết quả lượt đó. Health check xanh không đồng nghĩa lượt cụ thể đã dùng AI. Model response đến muộn không đổi inspection đang hiển thị.

Tóm tắt ngắn trả lời: “Điều gì sẽ đổi?”, “Vì sao liên quan tới tôi?”, “Phần nào chưa đọc được?”. Dữ kiện quan trọng luôn có bản tất định, ngay cả khi AI chưa về.

**Mở rộng có điều kiện:** chỉ sau CK-08 cho thấy giá trị, thử giải thích theo câu hỏi định sẵn về một evidence cụ thể. Đầu vào chỉ facts đã lọc, không mở chatbot tự do; không cho AI đề xuất ký, sửa transaction hoặc thao tác phục hồi tự động.

**Nghiệm thu:** tắt AI mà phân tích cốt lõi vẫn đầy đủ; provider trả sai/timeout không gây spinner vô hạn; dữ liệu gửi provider được công khai phạm vi, không nói mọi xử lý ở máy. Không trộn model giả vào video AI thật.

### CK-10 — Chiều sâu Solana qua ca đối chứng có căn cứ

**Vùng mã:** L1/L2, `packages/core/test`, `data/seed`, `cpi-devnet.ts`, `MA-TRAN-NANG-LUC.md` và generator.

**Làm:** lấy capability matrix hiện tại làm điểm xuất phát: đọc được tên lệnh khác hiểu hậu quả. Chọn khoảng trống từ giao dịch/fixture có thật, không thêm decoder chỉ vì protocol nổi tiếng.

Ma trận tối thiểu cần kiểm/hoàn thiện (tái dùng ca đã có):

| Cặp/nhóm | Điều cần chứng minh | Nguồn phù hợp |
|---|---|---|
| Cùng delegate, hạn mức giữ nguyên / tăng bất thường | Không chỉ xét địa chỉ delegate | Regression + replay |
| Chỉ chuyển / chuyển kèm đổi owner | Phân biệt tài sản và quyền | Devnet hoặc replay đã ghi |
| Cấp quyền giới hạn / hành vi cụ thể vượt điều kiện | Không gắn đỏ mọi approve | Seed có nhãn và giải thích |
| CPI lành / CPI có hậu quả cần cảnh báo | Hậu quả lồng có evidence, thiếu stack không dựng cây giả | CPI lành Devnet; ca nguy hiểm dùng fixture thì ghi rõ |
| Thiếu mint / thiếu vị trí account mô phỏng | Không giả số 0/decimals; warning | RPC fault fixture |
| ALT resolve đủ / thiếu | Định danh account đúng, coverage trung thực | Fixture hoặc mô phỏng được phép |

Token-2022 chỉ mở nhánh mới nếu có bằng chứng gap và ca lành tương tự. Không thêm program on-chain của Custos chỉ để dựng CPI nhiều tầng. Giao dịch lịch sử mainnet chỉ phát lại offline theo scope hiện hành.

**Nghiệm thu:** mỗi ca có ground truth ai gắn, nguồn và giới hạn; so cả mã thiếu lẫn cáo buộc thừa; tên protocol không được nâng thành chứng nhận hỗ trợ semantics. Kết quả mới không tự cập nhật mức của seed để làm pass.

### CK-11 — Chứng minh một ví khác có thể tích hợp

**Vùng mã:** `packages/core/README.md`, ví dụ consumer, scripts đóng gói/thu-goi và `docs/PILOT-TU-LAM.md`.

**Làm:** thử tarball từ thư mục trống ngoài monorepo trong vùng được phép, không symlink source. Dùng consumer JS/TS nhỏ để đọc serialized tx → inspect → quyết định hỏi/chặn/cho theo policy → tạo neo/consent đúng phiên trước signer giả. Bao gồm `safe + review_required` phải hỏi.

Chạy ca thành công, input hỏng, RPC lỗi, AI chậm, signer từ chối, signer trả payload đổi. Không cần mở rộng signer của ví demo hoặc tích hợp extension khi chưa cần chứng minh SDK.

**Nghiệm thu:** hướng dẫn cài chạy đúng bản đóng gói; consumer không import path nội bộ; có log lệnh, phiên bản tarball, giới hạn và diff trước/sau. Nhóm tự thử ngoài monorepo là bằng chứng khả năng tích hợp, không phải pilot bên thứ ba.

### CK-12 — Hoàn thiện UI theo luồng đã chạy

**Giữ:** nhận diện xanh rừng, nền sáng cho nội dung, logo, bố cục sản phẩm hiện tại. Không thay toàn bộ theme.

**Làm:**

- Giảm phần giới thiệu phía trên kết quả ở màn demo; nút bắt đầu và nguồn live/replay nằm trong viewport đầu.
- Ba ca nổi bật trong guided mode; ca nâng cao là vùng mở thêm. Giữ đối chứng dễ tìm.
- Chỉ animate thay đổi khi có dữ kiện: đang phân tích → kết quả → quyết định → xác nhận. Không đếm tiền giảm trước metadata thực thi.
- Motion dùng opacity/transform nhẹ, không nền chạy sau đoạn cảnh báo đang đọc; có reduced motion và pause khi cần.
- Typography tiếng Việt phải giữ dấu ở tiêu đề, số tiền dùng tabular numbers; code/address có nút copy và chuỗi đầy đủ truy cập được.
- Nút huỷ không bị nhấn chìm, override cần hành động rõ nhưng không dùng UI đánh lừa. Focus về thẻ mới hoặc thông báo lỗi; không tự cuộn khi người dùng đang đọc chi tiết.
- Đặt banner mock trong landmark thích hợp; kiểm 320/390/768/1440, zoom 200%, bàn phím. Trạng thái pending/unknown/mismatch phải đọc tốt như trạng thái thành công.

**Nghiệm thu:** không tràn trang; không mất focus; CTA đọc được trên máy chiếu; axe không còn finding đã biết ở bề mặt kiểm. Axe qua không thay kiểm bàn phím/screen reader; browser nào chưa chạy ghi rõ.

### CK-13 — Một bộ bằng chứng, nhiều bề mặt hiển thị

**Vùng mã:** generator số liệu hiện có, `SoLieu.tsx`, README, `TIEN-DO.md`, bàn giao live, tài liệu pitch.

**Làm:** dùng cơ chế artifact/manifest đang có. Mỗi phép đo có source hash/dirty flag, build ID, timestamp, command, scope, input/fixture hash, kết quả và giới hạn. Tách đo trong lượt này với snapshot lịch sử; không ghi đè report cũ làm mất provenance.

Liên kết theo chuỗi: ca → inspection → quyết định consumer → signature nếu có → metadata → đối chiếu. Huỷ không có signature. Receipt chia sẻ phải làm sạch nhưng không giả vờ replayable nếu dữ liệu cần thiết đã bị bỏ.

Trên trang bằng chứng, phân biệt: unit/regression, replay RPC, simulation live, execution live, AI evaluation, consumer tự thử. Không gộp thành một số “đã kiểm chứng”. Cập nhật dòng “ví khách” trong tài liệu hiện hành theo quyết định ví cố định; giữ phần cũ dưới nhãn lịch sử.

**Nghiệm thu:** một con số trong UI/deck truy được đúng artifact và phạm vi; “0 cáo buộc”, “7 gắn cờ”, “chưa đo báo nhầm” không bị trộn. Không dùng 1.136 test làm số giao dịch hoặc tỷ lệ chính xác.

### CK-14 — Độ bền, hiệu năng và cổng bản cuối

**Làm:** đo trên đúng build/host dùng trình diễn. Tách thời gian dựng tx, đọc RPC, mô phỏng, L2, L3, và render kết quả. Đo cold/warm, AI bật/tắt, live/replay riêng; ghi số lần thử, timeout và lỗi.

Mục tiêu thiết kế ban đầu, **không phải số đã đạt**: thao tác UI có phản hồi chờ trong 200 ms; replay đủ fixture có kết quả trong 1 giây trên máy trình diễn; live có deadline hữu hạn được công khai. Hiệu chỉnh mục tiêu theo phép đo thực, không tăng timeout vô hạn để tỷ lệ pass đẹp hơn. Nếu báo p95, dùng ít nhất 30 lượt của từng nhóm và công bố cả timeout; mẫu nhỏ hơn chỉ báo từng lượt/trung vị/phạm vi.

Kiểm CI/probe theo hai bề mặt mới; build không nạp secret; build path GitHub Pages và root-domain không lẫn. Thử mạng chậm/offline, 429, tab ngủ/reload, duplicate click, popup bị chặn, AI sai schema, storage hỏng, expired blockhash. Đường bất định không được báo thành công giả.

**Cổng bàn giao:** typecheck/test phù hợp qua; targeted regressions qua; browser không lỗi console mới; replay offline qua; live readiness có artifact hoặc blocker rõ; AI live có report hoặc nhãn chưa đo; secret scan bundle qua; các claims khớp artifact. Không tự publish.

### CK-15 — Demo để người xem nhớ được sản phẩm

**Tái dùng:** deck/script/video hiện có trong `docs/pitch-technical`; không gọi QA recording có fault injection là video live sạch.

**Mạch trình bày:** một lời mời của dApp → hậu quả khác lời mời → Custos chỉ dữ kiện → người dùng quyết định → chain ghi nhận → kiến trúc và giới hạn. Chỉ một ca chính trong phần ngắn; quyền hai bước và Inspector dành cho hỏi sâu.

Chuẩn bị ba đường: demo live khi preflight qua; replay engine có nhãn; video capture thật có thời điểm/phiên bản. Nếu chuyển đường, nói rõ ngay trên màn hình. Không nối footage nhiều phiên thành một chuỗi giao dịch duy nhất mà không chú thích.

**Nghiệm thu:** người trình bày biết đâu là consumer policy, đâu là SDK, đâu là Solana, đâu là AI; giải thích được vì sao không có contract. Câu kết: “We are building transaction intelligence for Solana wallets and dApps so users can understand what they are about to sign.”

## 7. Ma trận nghiệm thu hành trình chính

| Tình huống | Điều phải thấy | Điều tuyệt đối không làm |
|---|---|---|
| Ca lành | Hậu quả đúng, coverage và giới hạn | Ép đỏ để demo có kịch tính |
| Chỉ đổi chủ | Token còn nguyên, quyền cũ mất | Hiện tiền bị chuyển hết |
| Đỏ rồi huỷ | Không broadcast bởi thao tác này | Tạo signature giả hoặc “tiết kiệm X USD” |
| Đỏ rồi override | Mức đỏ giữ nguyên, consent gắn message, metadata thật | Tự sửa tx thành lành để bảo vệ người xem |
| Tắt Custos | Consent vẫn có; thực thi theo transaction | Âm thầm dùng Custos để chặn rồi gọi là đối chứng |
| Approve và dùng quyền | Approve chưa chuyển; actor ký bước sau | Nói owner ký giao dịch actor |
| Revoke | Quyền không còn hiệu lực cho bước tiếp theo nếu chain xác nhận | Hoàn lại số đã chuyển bằng animation |
| RPC chỉ sống một phần | Nêu bước thiếu, retry hữu hạn, replay tương ứng | Hiện “sẵn sàng” vì chỉ balance trả lời |
| AI lỗi/không có | Câu mẫu tất định và nhãn nguồn thật | Gắn “AI đang bảo vệ” khi không có model output |
| Replay | Engine chạy trên fixture, không mạng/không signer | Dùng receipt làm quyền ký hoặc gọi là live |
| Account/decimals thiếu | Unknown/đơn vị gốc, warning phù hợp | Thay thiếu bằng 0 |

## 8. Nội dung mang tới mentor

Mang bản chạy được cùng ba artifact: một receipt thật đã có, một cặp nguy hiểm/đối chứng, một trang chỉ rõ phần chưa hỗ trợ. Không cần bịa market size, khách hàng hoặc phỏng vấn để lấp slide Technical.

Các câu cần xin phản biện:

1. SDK không có contract riêng được đánh giá phần kiến trúc thế nào khi dùng chương trình Solana có sẵn?
2. Bằng chứng nào thuyết phục hơn cho bước tiếp theo: consumer tích hợp ngoài repo hay một gap semantics cụ thể? Cho mentor xem cả hai lựa chọn có demo.
3. Sau khi xem ca cùng số dư nhưng khác quyền, mentor có phân biệt được Custos với bảng balance change thông thường không? Đây là phản hồi mentor, không ghi thành nghiên cứu thị trường.
4. Vai trò L3 đủ tạo giá trị chưa, hay câu mẫu hiện đã rõ hơn? Dùng kết quả CK-08 để thảo luận.
5. Xác nhận hình thức, thời lượng và đường vào vòng thi tại tài liệu lịch trung tâm; không phân tán ngày trong roadmap.

## 9. Những phần để sau, có điều kiện mở

- Thêm decoder semantics: chỉ khi CK-10 chỉ ra gap lặp lại và có cặp kiểm chứng.
- Mở câu hỏi AI về evidence: chỉ khi CK-08 đo được lợi ích và không làm suy yếu guard.
- Hỗ trợ nhiều ví/extension, đa chain, Mainnet: ngoài phạm vi bản này; đặc biệt không đổi ví mặc định dưới danh nghĩa cải thiện onboarding.
- Dashboard trả phí, đăng nhập, telemetry ví, risk score phần trăm, tự revoke, agent tự ký: chưa có căn cứ đưa vào bản chung kết.
- Mô phỏng hậu quả đẹp hơn: chỉ sau khi nguồn số và điều kiện thực thi đúng. Không thêm hiệu ứng làm chậm đường đọc cảnh báo.

## 10. Prompt giao Claude

```text
Đọc docs/roadmap/ROADMAP-CUSTOS-CHUNG-KET.md và báo cáo chạy thử được liên kết.
Triển khai theo thẻ CK, bắt đầu CK-00. Đây là nhiệm vụ nâng cấp sản phẩm hiện có,
không phải viết thêm roadmap hoặc dựng lại các tính năng đã có.

Đối chiếu code/artifact hiện tại trước mỗi kết luận; baseline trong roadmap là
một snapshot, không tự gọi nó là số hiện tại nếu repo đã đổi. Giữ thay đổi đang có
của người khác. Trạng thái CK ghi vào TIEN-DO.md, bàn giao tiếp tục ở BAN-GIAO.md.

Ưu tiên lát cắt: RPC/preflight + replay đúng kịch bản → guided flow → hậu quả/
bằng chứng → A/B/override/huỷ trong chính Ví mẫu → phục hồi và nghiệm thu.
Không redesign toàn app, không thêm ví hoặc trang ký mới.

Giữ đủ 8 quyết định khoá trong AGENTS.md. Ví cố định luôn là
AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ. Không đọc/in/nhúng secret vào
artifact. Không đổi L2 bằng AI, không gắn đỏ mọi delegate, không fake balance,
không dùng replay để cấp quyền ký. Giữ hợp đồng InspectResult.

Từng thẻ cần thay đổi chạy được, kiểm thử đúng phạm vi và evidence. Không hoàn
thành thẻ bằng tài liệu/mock nếu nó đòi runtime. Tái dùng receipt, RPC fallback,
registry và consumer hiện có. Nếu thiếu key/provider/quyền live, ghi blocker
đúng và làm tiếp phần độc lập; không gọi output giả là AI/live thật.

Không tự commit/push/publish/deploy. Không thực hiện broadcast ngoài phạm vi
được chủ dự án giao; chuẩn bị sẵn màn và test chỉ đọc trước. Khi báo cáo nêu rõ
file đổi, luồng dùng được, test đã chạy, điều chưa kiểm và thẻ tiếp theo.
```

## 11. Nguồn và cách diễn giải

- [Bằng chứng chạy mới](../review/chung-ket-20260927/BAO-CAO.md): cơ sở trạng thái trong tài liệu này.
- [Bản sửa phản biện trước](../review/phan-bien-da-vai-20260926/TRANG-THAI-SUA.md): đối chiếu lỗi đã đóng, không thay bằng chứng chạy mới.
- [Báo cáo thực thi Devnet trước](../review/live-devnet/BAO-CAO-CHAN-THAT.md): lịch sử receipt có gửi thật; không phải nghiệm thu bản hiện tại.
- [Ma trận năng lực](../MA-TRAN-NANG-LUC.md): phân biệt tên lệnh và hiểu hậu quả.
- [Learning Hub BTC](https://unihackfest.vn/learn/): trọng số và hướng Technical, đã mở kiểm khi lập roadmap.
- [Solana simulateTransaction](https://solana.com/docs/rpc/http/simulatetransaction): simulation có cấu hình inner instructions, signature verification và thay blockhash; simulation thành công không tương đương đã broadcast hoặc đã xác nhận giao dịch.

Các mục tiêu UX, ngưỡng hiệu năng và thẻ CK là đề xuất của lượt review, không phải quy định BTC hoặc số đo đã đạt.
