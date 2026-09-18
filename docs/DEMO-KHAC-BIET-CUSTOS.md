# Custos — roadmap triển khai demo khác biệt dành cho Claude

Đánh giá và đề xuất ngày 18/09/2026, dựa trên HEAD `dd7e776`, code hiện tại và một lượt xem trình duyệt local. Đây là kế hoạch tập trung vào trình diễn giá trị, không thay `UPDATE-CUSTOS.md` và không đánh dấu tính năng đề xuất là đã hoàn thành.

## 0. Chỉ dẫn cho Claude khi bắt đầu

**Nhiệm vụ:** triển khai các lát cắt trong tài liệu này thành chức năng có thể chạy và kiểm chứng. Không dừng ở việc viết thêm kế hoạch. Không đặt mốc ngày/tuần; chuyển bước khi đạt điều kiện nghiệm thu.

- Đọc mục 1–10 để hiểu sản phẩm, mục 12–16 để thực hiện và bàn giao. Mục 11 có prompt khởi động.
- Đọc `AGENTS.md` nếu có trong phạm vi sửa; `UPDATE-CUSTOS.md`, `docs/roadmap/TIEN-DO.md` và bàn giao hiện hành trước khi sửa code. Đối chiếu HEAD thực tế: các trạng thái trong tài liệu này là ảnh chụp tại thời điểm đánh giá, có thể đã thay đổi.
- Làm lần lượt bốn vai: người thiết kế sản phẩm xác định điều cần chứng minh; kỹ sư triển khai; QA thử cả đối chứng và lỗi; người phản biện kiểm lời trình bày có vượt bằng chứng không. Không bắt buộc tạo nhiều agent.
- Tự quyết các chi tiết triển khai có thể đảo ngược theo kiến trúc repo. Chỉ hỏi khi thiếu quyết định sản phẩm chặn công việc, đồng thời tiếp tục phần độc lập.
- Phạm vi chính: A/B có tương tác → evidence dễ xem → thử thay message bằng signer giả lập → đường kiểm sâu bằng CLI. Receipt/replay là phần mở rộng kế tiếp, thực hiện sau khi phạm vi chính đạt nghiệm thu.
- Giữ thay đổi của người khác trong working tree. Không tự publish SDK, deploy, gửi transaction hoặc thêm khóa thật trong luồng demo này.
- Khi gặp phần đã hoàn thành, kiểm lại và tái dùng; không viết một bản song song. Khi dependency thiếu, hoàn thiện phần cần thiết và ghi rõ phần CU còn chưa đạt.

**Kết quả cần giao:** chức năng chạy được, test các hành vi quan trọng, bằng chứng UI và kết quả kiểm, kịch bản trình diễn cập nhật, bàn giao để phiên Claude tiếp theo tiếp tục được.

## 1. Kết luận

Chọn một trải nghiệm chủ lực: **người xem thay đổi giao dịch, Custos chỉ ra hậu quả thay đổi, dẫn đến dữ kiện và yêu cầu kiểm lại trước khi ký**.

Câu giới thiệu đề xuất:

> Custos giúp nhà phát triển ví giải thích một cảnh báo bằng dữ kiện, đồng thời giữ kết quả kiểm gắn với đúng giao dịch người dùng đang xem.

Đây là định vị và mục tiêu sản phẩm có thể chứng minh bằng demo. Chưa phải tuyên bố Custos là sản phẩm duy nhất hoặc vượt mọi giải pháp thương mại.

**Thứ tự đề xuất:** so sánh A/B có tương tác → hiển thị bằng chứng chính ngay tại cảnh báo → thử tráo giao dịch sau kiểm → receipt/replay để người khác kiểm lại.

## 2. Tôi đã xem và thử gì?

- Đọc `Inspector.tsx`, `Trace.tsx`, `CanhBao.tsx`, `App.tsx`, consumer ký, core evidence và sổ tiến độ CU.
- Mở ví mẫu trên Chromium 1440×900, chạy tình huống Nhận quà tặng, mở Chi tiết kỹ thuật và xem trang Inspector `/soi.html`.
- Lượt xem không có `pageerror`; đây không phải kiểm toàn bộ UI/UX, accessibility hoặc mọi chức năng.
- Chạy ba transaction chưa ký bằng simulation Devnet, không broadcast. Các lượt mô phỏng độc lập, không phải chuỗi giao dịch đã thực thi.
- Không chạy lại toàn bộ unit test trong lượt đánh giá này. Con số 840 xuất hiện trong commit/artifact hiện hành không được dùng làm thước đo “wow”.

Bằng chứng: [ảnh kết quả](review/demo-wow-20260918/wallet-result.png), [ảnh vùng kỹ thuật](review/demo-wow-20260918/wallet-evidence.png), [Inspector](review/demo-wow-20260918/inspector.png), [nội dung UI](review/demo-wow-20260918/browser.json), [kịch bản live](review/demo-wow-20260918/scenarios.json).

Lượt thử đầu dùng 10 base unit được giữ riêng ở `scenarios-base-units.json`; lượt hiện hành đọc decimals từ mint và chuyển đúng 10 token. Không nhầm base unit với số token hiển thị.

## 3. Vì sao demo hiện tại chưa tạo cảm giác khác biệt?

### 3.1. Màn hình mở đầu chưa cho thấy phần kỹ thuật mới

Luồng chính vẫn là Nhận quà tặng → cảnh báo đỏ → 500 token về 0. Tình huống dễ hiểu nhưng người xem có thể coi đây là một cảnh báo được chuẩn bị sẵn cho một nút demo.

Inspector và CLI đã có, nhưng Inspector là một trang form base64 riêng. Nó chứng minh khả năng tích hợp tốt hơn là tạo khoảnh khắc dễ hiểu trên sân khấu. Không nên bắt giám khảo đọc base64 trước khi họ hiểu giá trị.

### 3.2. Bằng chứng quan trọng bị đặt quá sâu

Ở ảnh chụp hiện tại, trace nằm dưới Chi tiết kỹ thuật, sau nhiều đoạn diễn giải, và người xem còn phải bấm reason code. Chữ reason/trace khoảng 11–12px trong code. Trên máy chiếu, phần đáng chứng minh nhất khó nhìn hơn số dư và lịch sử giao dịch.

Lịch sử giao dịch chiếm phần lớn cột trái; đó chưa phải bằng chứng của lần kiểm đang trình diễn. Mở đầy đủ phần kỹ thuật làm trang dài hơn đáng kể, buộc cuộn xuống để thấy trace.

### 3.3. Pitch đang nói ít hơn khả năng mới của code

Sổ CU ghi CU-05, CU-08, CU-09, CU-10 đã hoàn thành ở phạm vi khai báo. `PITCH-VA-PHAN-BIEN.md` vẫn có câu trace chỉ phủ 2/14 luật. Cần đối chiếu và cập nhật lời nói theo mã hiện tại.

Phải phân biệt **luật có khai evidence reference** với **mọi cảnh báo đã truy được tới instruction gây tác động**. Không sửa một con số cũ thành một lời hứa quá rộng khác.

### 3.4. Cảnh báo trước ký là một nhóm chức năng đã có trên thị trường

Phantom đã mô tả transaction preview, cảnh báo và trường hợp `setAuthority` đáng ngờ. Blockaid công bố sản phẩm mô phỏng/validation giao dịch. Do đó, “Custos phát hiện giao dịch nguy hiểm và giải thích dễ đọc” chưa tự đủ để khẳng định mới so với thị trường. Đây là suy luận định vị từ tài liệu chính thức, không phải benchmark cạnh tranh. [Phantom](https://phantom.com/learn/blog/security-at-phantom), [Blockaid](https://blockaid.io/transaction-security).

Phantom cũng có tài liệu về Lighthouse assertions kiểm điều kiện trong lúc thực thi. Vì vậy, thêm contract kiểm điều kiện không tự trở thành khác biệt độc quyền. Chưa có căn cứ để nói Custos mạnh hơn giải pháp đó. [Tài liệu Lighthouse](https://docs.phantom.com/developer-powertools/lighthouse).

## 4. Chức năng nên ưu tiên số 1: đối chiếu hai giao dịch cùng số tiền

### Cảnh mở đầu đã được kiểm bằng engine thật

| | Giao dịch A | Giao dịch B |
|---|---|---|
| Thành phần | Chuyển 10 token | Chuyển 10 token + đổi owner của token account |
| Số dư token dự kiến | 500 → 490 | 500 → 490 |
| Quyền kiểm soát token account | Không có thay đổi owner được giao dịch yêu cầu | Chuyển sang địa chỉ khác |
| Kết quả lần thử | `safe`, không reason code | `danger`, `SPL_SET_AUTHORITY__ACCOUNT_OWNER` |

`safe` được UI diễn đạt là “không phát hiện nguy hiểm trong phần đã đọc”. Hai lượt đều có phí mạng; không nói mọi biến động tài sản đều giống nhau ở mọi môi trường.

Câu dẫn:

> Hai giao dịch đều chuyển 10 token và để lại 490 token. Nhưng ở giao dịch bên phải, bạn mất quyền kiểm soát tài khoản chứa số token còn lại.

Giá trị của cảnh này là làm người xem hiểu vì sao xem số tiền thôi chưa đủ. Không gọi đây là lỗ hổng Phantom hoặc một phát hiện tấn công mới.

### Trải nghiệm cần xây

Một màn “So sánh giao dịch” có:

- Nút chọn A/B và đối chiếu cạnh nhau trên desktop, xếp dọc rõ ràng trên mobile.
- Bộ tạo transaction thử nghiệm có giới hạn: số token chuyển, một vài địa chỉ Devnet đã chuẩn bị, có/không có lệnh đổi owner.
- Nhãn rõ “Tạo tình huống thử nghiệm”; từng tổ hợp phải tạo bytes thật và đi qua `inspect()` hiện hành.
- Số dư và quyền ở hai hàng riêng. Khi cùng số dư nhưng khác owner, nhấn mạnh hàng quyền.
- Người xem chọn tham số; bấm Kiểm lại để tạo lượt simulation mới. Không gọi RPC theo mọi pixel của slider.
- Dấu “Đã đổi đầu vào — cần kiểm lại” ngay khi thay tham số; không giữ thẻ xanh/đỏ của lần trước trên input mới.
- Nút mở giao dịch này trong Inspector để người review tự xem serialized bytes hoặc dùng CLI.

Không cần triển khai full CU-20 trước để có màn đối chiếu hai trường hợp hẹp. Tuy nhiên, màn demo hẹp này **không được coi là CU-20 DONE** nếu chưa đạt toàn bộ acceptance của CU-20.

### Cảnh thứ hai có thể thêm

Chỉ `SetAuthority`, không chuyển token trong transaction đó. Engine hiện trả danger và owner change; `diff` không có hàng biến động số dư token.

Muốn hiển thị trực tiếp “500 → 500”, cần lấy before/after từ Facts của chính lượt mô phỏng, không suy “không có hàng diff nghĩa là chắc chắn bằng nhau”. Đây là phần hoàn thiện CU-04/CU-06, không được hardcode 500.

### Nghiệm thu

1. Cùng một builder/input chạy qua engine dùng trong sản phẩm; không route verdict theo tên tình huống.
2. Số lượng được quy đổi chính xác theo decimals; input vượt balance hoặc không hợp lệ hiện lỗi thật.
3. Thay số lượng/địa chỉ tạo message khác và invalidates kết quả cũ.
4. Mọi ca vẫn không ký/gửi; không mutate hiện trường trên chain.
5. Lượt Devnet có nhãn live và thời điểm; nếu dùng fixture dự phòng, màn hình phải đổi sang nhãn replay.
6. Đối chiếu từ hai simulation độc lập không được mô tả là cùng atomic snapshot hoặc trạng thái đã thực thi.

## 5. Chức năng số 2: bằng chứng xuất hiện ngay cạnh hậu quả

### Mục tiêu

Khi người xem hỏi “vì sao đỏ?”, người thuyết trình chỉ cần một thao tác để mở bằng chứng dễ đọc.

Hiện trước:

```text
QUYỀN KIỂM SOÁT THAY ĐỔI
Tài khoản token: [địa chỉ có thể mở đầy đủ]
Owner trước: ví của bạn
Owner sau: địa chỉ khác
Nguồn: trạng thái trước/sau của lượt mô phỏng này
Luật phát hiện: thay đổi owner
```

Sau đó mới mở reason code, instruction index, raw fields và thông tin RPC khi người xem muốn kiểm sâu.

### Cách hiển thị

- Desktop: vùng giao dịch/input, vùng hậu quả, vùng bằng chứng đang chọn; một luồng thị giác rõ, không thêm nhiều dashboard.
- Sơ đồ nhỏ account → quyền → owner có thể hữu ích. Mũi tên phải mang quan hệ xác định được, không dùng graph trang trí nhiều node.
- Nếu chưa truy được instruction, ghi “đã quan sát thay đổi account; chưa gắn được tới lệnh cụ thể”.
- Không lấy địa chỉ hoặc giá trị từ một RPC mới rồi ghép vào warning cũ.
- Không gọi dữ kiện thiếu là không có rủi ro; giữ provenance `observed/derived/missing/unsupported` khi phù hợp.

### Nghiệm thu

Một thao tác từ cảnh báo mở đủ account, before/after và nguồn để giải thích kết luận. Text chính đọc được trên khung trình chiếu; raw fields không chen vào đoạn kể chính. ID/reference phải resolve tới đúng dữ kiện, không chỉ có mảng evidence nonempty.

**Tái dùng:** CU-04, CU-05, CU-06, CU-09 và `Trace.tsx`. Trace đã có là nền để nâng cấp, không cần viết engine thứ hai.

## 6. Chức năng số 3: thử tráo giao dịch sau khi đã kiểm

### Cảnh trình diễn

1. Kiểm một transaction A và giữ phiên kiểm của A.
2. Trong môi trường thử nghiệm, chọn “Đổi giao dịch trước lúc ký”: thay recipient hoặc thêm một lệnh làm message thành B.
3. Gọi consumer kiểm điều kiện ký bằng **signer stub có bộ đếm thật**.
4. UI hiện lý do từ chối do message mismatch, diff A/B và `signerCalls = 0`.
5. Kiểm B bằng phiên mới; không sử dụng lại consent hoặc verdict của A.

Với đối chứng cùng message/context hợp lệ và được policy cho phép, signer stub phải được gọi đúng như contract. Nếu mọi trường hợp đều bị chặn, demo chưa chứng minh được gì.

### Điểm cần nói rõ

- Đây là thử tráo **message** trong consumer tham chiếu, không chứng minh chống mọi thay đổi state giữa simulation và execution.
- Signer stub phải có nhãn “không ký thật”. Không trình bày số 0 được gõ sẵn như phép đo.
- Core SDK không cưỡng chế ví cố tình bỏ qua; consumer chịu trách nhiệm trước signer.
- Timeout/disconnect không chứng minh ký chưa xảy ra; kết quả muộn không tự mở lại phiên hoặc gửi transaction.
- CU-02 vẫn PARTIAL trong sổ hiện tại; phải hoàn tất đúng điều kiện snapshot/binding cần cho màn này, không dùng một neo mới tạo lúc ký.

**Tái dùng:** CU-02/CU-19/CU-20; `vi-du-tich-hop/src/ky.js` và test signer đang có. Giữ `Inspector` không có đường ký.

## 7. Chức năng số 4: người khác mang bằng chứng đi kiểm lại

Sau khi demo, xuất receipt đã lọc dữ liệu và mở ở trang replay. Tắt mạng, chạy lại phần phân tích offline được hỗ trợ và xem cùng evidence.

Đây là phần làm Custos có giá trị vượt buổi trình diễn: nhà phát triển ví có thể gửi hồ sơ lỗi, tái hiện và kiểm hồi quy khi sửa decoder/rule.

### Điều kiện

- CU-11/CU-12 hiện TODO; không dùng video offline đang có để nói đã có receipt replay tương tác.
- Phải đủ snapshot/version/schema để replay; bản redacted thiếu dữ liệu thì ghi `not_replayable`.
- Engine thay version có thể ra kết luận khác; hiển thị kết quả cũ và mới cùng provenance.
- Hash là kiểm toàn vẹn nội dung, không chứng thực RPC hoặc chữ ký của tổ chức độc lập.
- Replay không tạo phiên ký live.

**Nếu phải chọn ít việc:** ưu tiên ba phần trên trước; receipt/replay là bước tiếp theo tạo ích lợi cho tích hợp và hậu kiểm.

## 8. Cách tổ chức demo

Không gắn kịch bản với thời lượng BTC chưa xác nhận. Dùng bốn hồi, có thể rút gọn theo thời lượng thực tế.

| Hồi | Người xem thấy gì? | Thông điệp |
|---|---|---|
| 1 | Hai giao dịch cùng 500 → 490; chỉ một ca đổi quyền | Số tiền chưa kể hết hậu quả |
| 2 | Người xem chọn số lượng/biến thể; engine kiểm lại, mở evidence | Kết luận gắn với input thật và dữ kiện có thể xem |
| 3 | Transaction bị thay sau kiểm; signer stub không được gọi | Kết quả của A không được dùng để ký B |
| 4 | Receipt mở lại offline hoặc CLI nhận cùng input | SDK có đường tích hợp và kiểm lại ngoài màn demo |

Chỉ sử dụng hồi 3/4 khi đã implement và kiểm đúng. Với hiện trạng đang có, hồi 4 có thể dùng CLI thật; chưa nói receipt/replay đã hoàn thành.

### Cách cho giám khảo tham gia

Cho họ chọn một tham số hoặc một ca trong danh sách minh bạch, rồi chạy thật. Đây là tương tác demo, **không** gọi là benchmark độc lập/holdout mới.

Không mời tùy ý mọi tx Mainnet khi hệ thống chưa có scope/môi trường cho điều đó. Inspector vẫn có thể được mở để review input ngoài tình huống dựng sẵn trong phạm vi đã công bố.

### Một bản demo chính, một chế độ kiểm sâu

- Chế độ trình bày: hậu quả, một evidence chính, trạng thái phiên và giới hạn quan trọng.
- Chế độ kiểm sâu: raw message, rule IDs, source slot/attempt khi có, CLI, metadata phiên bản.
- Cùng engine và cùng dữ liệu. Chế độ trình bày chỉ thay cách sắp xếp, không giấu lỗi hoặc tô verdict dễ chịu hơn.

## 9. Những thay đổi UI đáng làm ngay trong lát cắt này

1. Thu gọn lịch sử ví khi đang trình diễn một request; ưu tiên không gian cho A/B và evidence.
2. Đưa “Vì sao cảnh báo?” lên cạnh dòng quyền thay đổi, không để dưới nhiều lớp Chi tiết kỹ thuật.
3. Hiện tên hành vi bằng tiếng Việt trước reason code dài; code và địa chỉ đầy đủ vẫn truy cập được.
4. Trên chế độ trình chiếu, giữ một nhãn Devnet tĩnh dễ thấy; đánh giá lại marquee lặp chữ vì nó tranh sự chú ý với cảnh báo.
5. Chuyển động chỉ nhấn mạnh điều vừa thay đổi: hàng owner, cạnh quan hệ quyền, trạng thái cần kiểm lại. Có reduced-motion.
6. Đặt lối vào Inspector từ luồng chính; “Mở transaction này trong Inspector” rõ hơn một đường dẫn khó tìm.
7. Giữ tên tuổi/uy tín SDK nhất quán trong header và deck; không để mascot hoặc trang trí chiếm vai trò giải thích năng lực.

Đây là đánh giá khả năng trình chiếu, không phủ nhận các cải thiện màu sắc/spacing đã merge. Không cần thay toàn bộ design system để làm được các thay đổi này.

## 10. Gắn với rubric và giới hạn của kết luận

Theo rubric Technical đang lưu ở ADR-0001:

| Hạng mục | Phần demo hỗ trợ đánh giá | Bằng chứng cần đưa được khi bị hỏi |
|---|---|---|
| Chiều sâu kỹ thuật — 30% | Phân biệt số dư/quyền, phiên kiểm và thay message | Facts/rule/evidence, ca đối chứng và regression |
| Kiến trúc on/off-chain, contract — 25% | Trust boundary, trách nhiệm consumer/SDK, scope simulation | Kiến trúc và lý do thiết kế; cách chấm SDK không có contract vẫn cần BTC xác nhận |
| Solana/composability/hiệu năng — 25% | Transaction thật, authority semantics, CLI/tarball | Consumer ngoài repo, runtime scope và số đo thật |
| Demo/trình bày — 20% | A/B dễ hiểu, tương tác có kiểm, bằng chứng nhìn thấy | Video/thao tác và phần phản biện của đội |

Không quy đổi các ý tưởng này thành số điểm tăng bảo đảm hoặc xác suất đạt giải. Chúng giúp giám khảo quan sát và kiểm tra công sức kỹ thuật tốt hơn; vẫn chưa chứng minh nhu cầu thị trường hoặc ưu thế phát hiện trên đối thủ.

Nếu BTC yêu cầu một thành phần on-chain cụ thể cho mục 25%, cần quyết định sản phẩm riêng. Không tự thêm contract chỉ để tạo cảm giác phức tạp, và không tuyên bố assertion on-chain là ý tưởng chưa ai làm.

## 11. Thứ tự thực thi và giao việc cho Claude

1. **Đóng gói bằng chứng hiện có:** cập nhật pitch bị cũ; chọn A/B đã kiểm, hoàn thiện snapshot/effect cần cho màn so sánh.
2. **Làm giao diện thử A/B và evidence chính:** tái dùng engine, UI cũ và parser; chưa mở full dashboard.
3. **Nối cảnh tráo message với consumer/session thật:** đủ happy path và adversarial path, signer stub có nhãn.
4. **Đưa CLI vào phần kiểm sâu:** cùng input và verdict; nếu đủ CU-11/CU-12 thì nâng sang receipt/replay.
5. **Đo và kiểm lại:** desktop/mobile/keyboard, nhiều tổ hợp input, abort/late response, lỗi RPC, đối chứng, dữ liệu nhạy cảm trong export; dựng lại video/ảnh khi UI thay đổi.

Theo dõi subtask trong sổ `docs/roadmap/TIEN-DO.md` dưới thẻ CU tương ứng. File này không tạo thêm một bảng trạng thái cạnh tranh và không cho phép bỏ qua acceptance còn thiếu của roadmap.

### Prompt triển khai

```text
Đọc toàn bộ docs/DEMO-KHAC-BIET-CUSTOS.md, đặc biệt mục 0 và 12–16,
UPDATE-CUSTOS.md và sổ tiến độ hiện hành. Thực hiện DW-00 đến DW-06 theo
phụ thuộc; sau khi phạm vi chính đạt nghiệm thu, tiếp tục DW-07 receipt/replay.
Đây là yêu cầu triển khai, không chỉ lập thêm kế hoạch. Không đặt mốc thời gian.
Triển khai lát cắt demo đối chiếu hai giao dịch cùng số tiền nhưng khác quyền,
cho phép đổi tham số có giới hạn và kiểm lại bằng inspect thật. Đưa evidence
chính lên ngay cạnh hậu quả, giữ raw details ở chế độ kiểm sâu.

Bắt đầu từ các điều kiện CU-02/04/06 cần thiết; tái dùng CU-05/08/09/10 đã có.
Không hardcode verdict theo tên tình huống. Không mô tả một màn demo hẹp là
hoàn thành toàn bộ CU-20. Không thay design system hay engine không liên quan.

Sau đó làm thử tráo message giữa kiểm và ký qua consumer tham chiếu, dùng
signer stub có counter thật và nhãn rõ. Chạy cả đối chứng được gọi signer.
Không có khóa thật, không broadcast, không dùng receipt/replay cấp quyền ký.

Cuối cùng cập nhật pitch theo code, kiểm UI và gói demo. Receipt/replay chỉ
đưa vào lời trình bày khi CU-11/CU-12 thực sự đạt. Không hứa vượt Phantom/
Blockaid hoặc tăng bao nhiêu phần trăm cơ hội giải khi chưa có phép đo phù hợp.
```

## 12. Các gói công việc có thể thực hiện độc lập về nghiệm thu

`DW-*` là mã tham chiếu yêu cầu trong tài liệu này, **không phải một sổ trạng thái mới**. Ghi tiến độ và bằng chứng dưới CU tương ứng trong `docs/roadmap/TIEN-DO.md`; ngữ cảnh tiếp tục đặt ở `docs/roadmap/BAN-GIAO.md`.

| Mã | Đầu ra | Phụ thuộc | Liên hệ roadmap hiện có |
|---|---|---|---|
| DW-00 | Baseline và bản đồ phần cần sửa | Không | CU-00 và sổ tiến độ |
| DW-01 | Builder tạo cặp transaction thật, dữ liệu đối chiếu | DW-00 | CU-04/06, phạm vi hẹp CU-20 |
| DW-02 | Màn A/B tương tác, trạng thái kiểm đúng | DW-01 | CU-03/08/22 và phạm vi hẹp CU-20 |
| DW-03 | Evidence chính đọc được, truy được nguồn | DW-01; tích hợp vào DW-02 | CU-04/05/06/09 |
| DW-04 | Demo message mismatch qua consumer thật và signer stub | DW-00; nền CU-02 đủ điều kiện | CU-02/19/20 |
| DW-05 | Inspector/CLI nhận đúng input của lượt đã chọn | DW-02/03 | CU-08/10 |
| DW-06 | Kiểm trình duyệt, kịch bản trình diễn và bàn giao | DW-02–05 | Các CU đã tác động |
| DW-07 | Receipt/replay tương tác có version và giới hạn | Phạm vi chính đã đạt; CU-11/12 | CU-11/12 |

### DW-00 — Xác lập baseline trước khi sửa

1. Ghi HEAD, working tree và phiên bản Node/npm; đọc script hiện hành trước khi chạy.
2. Đọc code được liệt kê ở mục 13, tìm test liên quan bằng `rg`, kiểm lại trạng thái CU. Không suy toàn bộ dự án chưa làm chỉ vì tài liệu cũ ghi TODO.
3. Chạy cổng kiểm phù hợp để phân biệt lỗi có sẵn với lỗi do sửa. Lưu command, exit code và kết quả thực tế; số test cũ không phải bằng chứng mới.
4. Đối chiếu `review/demo-wow-20260918/scenarios.json` và `probe.ts`. Đây là bằng chứng lịch sử/nguồn tham khảo cho builder, không phải response mặc định của chế độ live.
5. Ghi phạm vi CU còn thiếu mà DW-01 hoặc DW-04 phụ thuộc. Nếu live RPC không khả dụng, tiếp tục builder, kiểm tất định và UI có nhãn fixture; đánh dấu nghiệm thu live còn thiếu.

**Đạt khi:** xác định được đường dữ liệu từ input → transaction → inspect → Facts/evidence → UI và consumer → signer, cùng nơi cần sửa/test. Không yêu cầu viết lại kiến trúc.

### DW-01 — Tạo cặp giao dịch và dữ liệu đối chiếu

**Công việc:**

- Tách builder thuần cho tình huống demo: cùng source, recipient, mint, số token; B thêm `SetAuthority(AccountOwner)` trên token account phù hợp. Đọc account/mint đúng từ hiện trường.
- Giữ builder tấn công cũ ở `scripts/tan-cong.ts` và các truth guard còn dùng nó. Tạo builder mới hoặc tái dùng helper nhỏ, không âm thầm đổi kịch bản cũ.
- Parse chuỗi số lượng sang base units bằng logic chính xác; không nhân số thập phân qua `Number` rồi làm tròn. Kiểm decimals, âm, rỗng, vượt precision và phạm vi được hỗ trợ.
- Lấy blockhash/context theo cơ chế hiện hành. Mỗi bên giữ message bytes và kết quả riêng; không gán metadata A cho B.
- Dùng `inspect()` và Facts/evidence hiện hành để tạo model hiển thị. Không dùng tên preset, toggle UI hoặc expected verdict làm nguồn kết luận.
- Số dư 500 là dữ liệu của lần thử cũ. Trạng thái Devnet có thể thay đổi; đọc số thực tế, tính/display theo output thật. Thiếu tiền/thiếu account phải hiện nguyên nhân và cách kiểm lại.
- Với dữ kiện chưa có, giữ trạng thái thiếu rõ ràng. Chỉ thêm trường Facts cần thiết theo schema/compatibility của repo.

**Nghiệm thu:** test decode message chứng minh A là transfer và B thêm đúng instruction; số lượng theo mint chính xác; fixtures chạy qua engine cho đối chứng; không có thao tác ký/gửi. Live probe chứng minh khác verdict khi đủ dữ kiện, không bắt buộc balance luôn bằng con số lịch sử.

### DW-02 — Xây màn A/B có tương tác

**Công việc:**

- Thêm điểm vào dễ tìm từ ví mẫu. Cho chọn số lượng và biến thể trong phạm vi chuẩn bị; hiển thị rõ tham số đang kiểm.
- Desktop cho xem A/B cùng lúc; mobile xếp dọc với nhãn A/B và tiêu đề hàng lặp lại để không mất ngữ cảnh.
- Tách input đang sửa khỏi snapshot của lượt đã kiểm. Lưu ID lượt và định danh input; chỉ nhận response còn thuộc lượt hiện hành.
- Tối thiểu có các trạng thái: chưa kiểm, đang kiểm, có kết quả, đầu vào đã đổi, thất bại, đã hủy. Tên code theo quy ước repo, không cần theo đúng tên tiếng Việt này.
- Thay đầu vào trong khi chạy phải vô hiệu hóa lượt cũ; abort khi được hỗ trợ và vẫn chặn response muộn. Lỗi một bên không được khiến bên còn lại nhìn như đã được kiểm cùng phiên thành công.
- Nút Kiểm lại điều khiển gọi RPC. Double click không tạo kết quả chồng nhau. Có hủy và thử lại sau lỗi.
- Hiển thị nguồn live/replay, thời điểm và giới hạn ở vị trí dễ thấy. Coverage thể hiện phần đọc được, không đổi thành “xác suất an toàn”.

**Nghiệm thu:** thay amount/recipient/toggle làm kết quả cũ mất hiệu lực ngay; kết quả cũ không ghi đè mới; trạng thái lỗi/hủy không có thông điệp an toàn; điều khiển dùng được bằng bàn phím. Test theo hành vi, không chỉ snapshot HTML.

### DW-03 — Đưa bằng chứng lên vùng chính

**Công việc:**

- Ưu tiên hậu quả về quyền cạnh số dư. Render tên tiếng Việt, account, owner trước/sau và nguồn; reason code nằm trong lớp kiểm sâu.
- Tái dùng resolver/reference của `Trace.tsx` và `bang-chung.ts`. Mỗi evidence được chọn phải thuộc đúng bên A/B và đúng lượt.
- Cho mở/copy địa chỉ đầy đủ; địa chỉ rút gọn chỉ là cách hiển thị. Có phản hồi khi copy lỗi.
- Chỉ hiện instruction index khi đã resolve chắc chắn. Phân biệt thay đổi quan sát được với quan hệ nguyên nhân đã xác định.
- Nếu thiếu before/after hoặc reference hỏng, thông báo giới hạn thay vì điền 0/giá trị từ ca khác.
- Giữ raw details có thể truy cập. Không dùng AI để sáng tạo dữ kiện hoặc đổi verdict tất định.

**Nghiệm thu:** từ warning tới account/before/after/source tối đa một thao tác; test reference đúng, thiếu và sai; người xem đọc được hàng quyền ở khung trình chiếu mà không mở JSON.

### DW-04 — Thử tráo message qua consumer

**Công việc:**

- Kiểm contract phiên hiện tại; hoàn thiện phần CU-02 cần dùng, giữ snapshot từ lúc kiểm. Không tạo lại neo dựa trên B ngay trước ký rồi gọi đó là kiểm A.
- Tạo harness gọi đường kiểm trước signer của consumer tham chiếu. Không viết một hàm so sánh hash chỉ dùng cho màn biểu diễn trong khi consumer thật bỏ qua kiểm.
- Dùng signer stub có bộ đếm ghi nhận invocation thực, không giữ private key. UI ghi “Thử điều kiện ký — không ký thật”.
- Đối chứng: message/context hợp lệ, có consent và policy cho phép → stub được gọi một lần theo contract.
- Đối kháng: sau khi kiểm A, đổi recipient hoặc thêm instruction thành B → gọi cùng đường consumer → từ chối trước signer, counter 0 và lý do cụ thể.
- Giữ request cũ và hiện hành riêng để giải thích khác biệt; lần kiểm mới tạo consent/session mới theo contract. Thử concurrent click, kết quả muộn và thay context theo phạm vi CU-02.
- Giữ ranh giới signed/not-signed/unknown của consumer nếu có. Timeout không được biến thành lời khẳng định chắc chắn chưa ký.

**Nghiệm thu:** test happy path và mismatch đi qua cùng consumer boundary; counter lấy từ stub thật; không thể tái dùng approval A cho B; Inspector vẫn chỉ kiểm; không tuyên bố test này chứng minh mọi ví tích hợp đều tuân thủ.

### DW-05 — Kiểm sâu bằng Inspector và CLI

**Công việc:**

- Nút Mở trong Inspector chuyển đúng serialized transaction của bên/lượt đã chọn, qua cách truyền dữ liệu phù hợp repo. Tránh đặt toàn bộ payload trong query string có thể lọt lịch sử hoặc log.
- Hiện rõ Inspector đang kiểm lại live hay xem artifact cũ; một lượt live mới có thể khác do state/RPC/blockhash, không sửa output cho khớp demo.
- Cho tải/copy input phục vụ CLI với cảnh báo dữ liệu theo cơ chế riêng tư hiện hành. Không đưa khóa hoặc RPC URL chứa credential vào export.
- Ghi câu lệnh CLI đúng theo `--help`/README hiện hành, thử thật với input mẫu. Không đoán flag hoặc export path.
- Nếu muốn so kết quả bằng nhau, dùng cùng captured Facts/context trong đường replay đã hỗ trợ; không hứa hai RPC live độc lập luôn giống nhau.

**Nghiệm thu:** bytes được chuyển không bị đổi; CLI thực sự đọc được input; nguồn và thời điểm rõ; lỗi deserialize hiện dễ hiểu. Link Inspector không tạo đường gọi signer.

### DW-06 — Hoàn thiện trải nghiệm và gói trình diễn

**Công việc:**

- Thực hiện thay đổi UI mục 9 trong design system hiện hành. Nội dung chính ưu tiên dễ đọc; raw code có thể nhỏ hơn nhưng không thay thế lời giải thích.
- Kiểm 1440×900 và 390×844; bổ sung khung trình chiếu thực tế nếu nhóm cung cấp. Không tràn ngang toàn trang; raw code có vùng cuộn riêng.
- Kiểm keyboard, focus khi mở/đóng details, loading/error announcement và reduced-motion; không dùng màu làm tín hiệu duy nhất.
- Chạy ma trận mục 14, chụp bằng chứng trước/sau ở những trạng thái quan trọng. Ghi console/page errors và xử lý lỗi thuộc thay đổi này.
- Cập nhật `PITCH-VA-PHAN-BIEN.md` và nguồn kịch bản demo theo chức năng đã đạt. Giữ tuyên bố trace/coverage đúng scope; không chỉnh số liệu thị trường để lấp thiếu phỏng vấn.
- Viết hướng dẫn mở demo, reset UI, tình huống dự phòng và cách nói khi RPC lỗi. Chuyển sang dữ liệu dự phòng phải đổi nhãn rõ; không giữ chữ live.

**Đạt khi:** người mới mở được demo theo hướng dẫn, hoàn thành luồng A/B → evidence → mismatch → Inspector/CLI; báo cáo nêu đúng phần đã thử và phần chưa xác minh. Không đợi receipt/replay để nghiệm thu lát cắt chính.

### DW-07 — Receipt/replay sau khi phạm vi chính đã ổn

**Công việc:**

- Thực hiện contract đầy đủ của CU-11/CU-12 trong `UPDATE-CUSTOS.md`; không coi hướng dẫn ngắn này thay acceptance gốc.
- Receipt mang schema version, engine/rule version, input identity, Facts cần thiết, provenance và coverage/limitations. Chỉ lưu dữ liệu phục vụ kiểm lại theo cơ chế redaction.
- Export/import phải validate cấu trúc, version, kích thước và giới hạn parser. Receipt sai/thiếu bị từ chối hoặc đánh dấu không replay được; không crash UI.
- Replay chạy phần phân tích tất định trên snapshot đã lưu; không gọi RPC âm thầm. Hiển thị kết luận lúc tạo receipt và kết luận replay hiện tại tách biệt.
- Cấm dùng receipt nhập vào làm consent/session ký. Hash không đủ chứng thực nguồn dữ liệu; sửa payload rồi tính lại hash không làm dữ liệu trở thành đáng tin.
- Khi version cũ không còn được hỗ trợ, thông báo tương thích; không giả vờ đang dùng engine cũ để tạo cùng kết quả.

**Nghiệm thu:** tắt mạng vẫn replay được receipt đủ dữ liệu; mạng không được gọi; malformed/oversized/version không hỗ trợ/redacted thiếu Facts xử lý đúng; không có đường nâng receipt thành quyền ký; CU-11/12 chỉ DONE khi đạt đầy đủ yêu cầu gốc.

## 13. Bản đồ code để Claude bắt đầu

Các đường dẫn sau có trong baseline. File mới do Claude đặt tên theo cấu trúc thực tế; không cần dồn toàn bộ tính năng vào `App.tsx`.

| Khu vực | File/đường dẫn nên đọc | Mục đích |
|---|---|---|
| Luồng ví và cảnh báo | `apps/demo-wallet/src/App.tsx`, `CanhBao.tsx`, `HauQua.tsx` trong cùng thư mục | Nối màn đối chiếu và hậu quả |
| Bằng chứng UI | `apps/demo-wallet/src/Trace.tsx` | Tái dùng điều hướng evidence |
| Inspector | `apps/demo-wallet/src/Inspector.tsx`, `soiTx.ts` trong cùng thư mục | Nhận bytes và kiểm độc lập |
| Hiện trường | `apps/demo-wallet/src/hienTruong.ts`, `scripts/tan-cong.ts` | Đọc input hiện có; giữ kịch bản cũ |
| Engine | `packages/core/src/inspect.ts`, `facts.ts`, `facts-io.ts`, `diff.ts`, `bang-chung.ts` | Kết quả và nguồn dữ kiện |
| Phiên và consumer | `packages/core/src/neo.ts`, `vi-du-tich-hop/src/ky.js`, `ky.d.ts` trong thư mục consumer | Ranh giới trước signer |
| CLI | `packages/core/src/cli.ts`, `packages/core/README.md` | Đường kiểm ngoài UI |
| Mẫu probe | `docs/review/demo-wow-20260918/probe.ts` | Tham khảo cặp transaction đã thử; không import artifact review vào runtime |
| Kiểm thử | `packages/**/test/`, `apps/**/test/` và script liên quan trong repo | Tái dùng helper/test conventions |

Nếu phải chia sẻ logic giữa UI và consumer, đặt ở module có trách nhiệm rõ và dependency phù hợp; không copy nguyên logic security vào React. Đổi public type/schema phải kiểm tác động consumer, CLI và export/replay.

## 14. Ma trận kiểm bắt buộc cho các phần đã triển khai

| Ca | Thao tác | Điều phải chứng minh |
|---|---|---|
| A/B đối chứng | Cùng amount, B thêm đổi owner | Cùng token delta khi dữ kiện hợp lệ, khác hậu quả quyền; verdict từ engine |
| Chỉ đổi owner | Không transfer | Có cảnh báo; chỉ hiển thị balance không đổi nếu Facts đủ |
| Độ chính xác amount | Dùng mint decimals và giá trị có phần lẻ | Base units đúng; từ chối precision không hợp lệ |
| Input lỗi | Âm, rỗng, sai địa chỉ, vượt balance | Lỗi cụ thể, không reuse kết quả cũ |
| Đổi input sau kết quả | Đổi amount/recipient/toggle | Kết quả mất hiệu lực trước khi kiểm lại |
| Race | Kiểm A chậm, đổi input, kiểm B nhanh | A không ghi đè B |
| Double click/hủy | Gọi liên tiếp hoặc hủy đang chạy | Trạng thái nhất quán, không có kết quả muộn sống lại |
| RPC lỗi một bên | Một simulation thất bại | Không trình bày phép so sánh đầy đủ giả |
| Coverage thiếu | Thiếu account hoặc instruction chưa hỗ trợ | Giới hạn rõ, không đồng nhất thiếu dữ kiện với an toàn |
| Evidence | Chọn A rồi B; reference sai/thiếu | Không trộn dữ kiện, có trạng thái thiếu đúng |
| Signer đối chứng | A hợp lệ theo consumer contract | Stub counter 1, không ký thật |
| Message mismatch | Kiểm A nhưng đưa B vào consumer | Stub counter 0 và lý do từ chối thật |
| Kiểm lại B | Tạo phiên mới sau mismatch | Không mang consent A sang B |
| Input sang Inspector/CLI | Xuất rồi đọc lại bytes | Giữ đúng message; ghi rõ nếu là lượt live mới |
| Keyboard/mobile | Thực hiện toàn luồng | Focus/nhãn rõ, không tràn toàn trang |
| Chế độ dự phòng | Mất mạng rồi dùng fixture | Nhãn replay, không ngụy trang live |
| Receipt, nếu đã làm | Offline, sai schema, thiếu Facts | Kết quả/giới hạn đúng, không RPC và không quyền ký |

Test logic tất định với fixture để tái hiện ổn định; live Devnet bổ sung bằng chứng tích hợp. Không dùng một lượt live làm toàn bộ regression suite. Khi thêm fix quan trọng, test phải thất bại vì hành vi sai trước fix và đạt sau fix.

## 15. Lệnh kiểm và điều kiện hoàn thành

Các script sau tồn tại tại baseline. Claude phải đọc lại `package.json` ở HEAD đang làm, rồi chạy từ repo root:

```powershell
node --version
npm --version
git status --short
npm run check
npm run build -w @custos-solana/demo-wallet
npm run thu-tich-hop:deterministic
```

- Chạy test tập trung trong lúc sửa; chạy các cổng trên ở bản cuối khi thay đổi tác động UI/core/consumer. Nếu chỉ có tài liệu thay đổi thì kiểm tài liệu, không coi việc không chạy app tests là app đã pass.
- `npm run thu-tich-hop:deterministic` cần đọc script và điều kiện trước chạy; ghi rõ nếu môi trường không đủ. Khi sửa public SDK/CLI, kiểm thêm package build và consumer ngoài workspace bằng quy trình đóng gói local hiện hành.
- Mở UI bằng `npm run vi`, đọc URL từ output, chạy kiểm trình duyệt. Build thành công không thay thế kiểm tương tác.
- Live chỉ dùng probe simulation không ký/gửi đã đọc hiểu. Không chạy `npm run hien-truong` hoặc script Devnet khác theo tên mà chưa kiểm side effect; các script có thể dựng/mutate hiện trường.
- Không tự chạy `npm run publish-sdk` hoặc gắn release/tag để hoàn tất tài liệu này.
- Số test, latency, coverage phải gắn command, môi trường và lượt đo. Không suy phần trăm cơ hội giải từ các số này.

**Gate phạm vi chính:** DW-01–05 hoạt động, các ca liên quan ở mục 14 đã kiểm, build/test phù hợp đạt hoặc có blocker được nêu trung thực, và tài liệu trình diễn đúng tính năng thực tế. Nếu còn blocker ảnh hưởng chức năng thì báo PARTIAL, không gọi hoàn thành.

**Gate mở rộng:** CU-11/CU-12 đạt acceptance gốc và ca receipt ở mục 14 đạt. Không hạ gate để có thêm một nhãn chức năng trong pitch.

## 16. Mẫu bàn giao sau mỗi lát cắt

Ghi vào nguồn bàn giao hiện hành, giữ một nguồn trạng thái duy nhất:

```text
Lát cắt DW / CU liên quan:
HEAD và trạng thái working tree:
Hành vi trước → sau:
File đã sửa và trách nhiệm từng phần:
Lệnh đã chạy, exit code, kết quả thực tế:
Ca trình duyệt/live đã thử; artifact bằng chứng:
Ca chưa thử, lý do và ảnh hưởng:
Giới hạn được hiển thị trong UI/pitch:
Phần CU chưa hoàn thành dù lát cắt này đã đạt:
Bước tiếp theo, file cần mở và điều kiện để tiếp tục:
```

**Quy tắc kết thúc phiên:** không ghi “xong toàn bộ” khi mới dựng UI; không ghi “chặn ký thành công” từ counter hardcode; không ghi “replay hoạt động” từ video; không ghi “vượt đối thủ” từ một ca demo. Báo đúng chức năng người dùng đã có thể chạy và bằng chứng đi kèm.
