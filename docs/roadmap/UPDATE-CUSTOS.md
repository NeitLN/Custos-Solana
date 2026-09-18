# UPDATE CUSTOS — kế hoạch nâng cấp chức năng dành cho Claude

**Ngày lập:** 17/09/2026. **Loại tài liệu:** đặc tả phát triển tiếp, chưa phải báo cáo tính năng đã triển khai.
**Không có lịch, deadline hoặc ước lượng số ngày.** Thứ tự dựa trên phụ thuộc, giá trị sử dụng và bằng chứng nghiệm thu.
**Mã việc:** `CU-00` đến `CU-27`; bốn nhánh có điều kiện `CU-O1` đến `CU-O4`.

## 1. Quyết định sản phẩm: nên xây thêm cái gì?

Phát triển Custos thành **bộ kiểm tra giao dịch trước ký có bằng chứng, dùng được ngoài hai tình huống demo cố định**.

Người dùng cần trả lời được năm câu:

1. Giao dịch này thay đổi tiền, token và quyền kiểm soát của tôi thế nào?
2. Vì sao Custos đưa ra từng cảnh báo, và dữ kiện nào thực sự hỗ trợ cảnh báo đó?
3. Phần nào đã đọc được, phần nào chưa đủ dữ liệu để kết luận?
4. Kết quả đang xem có còn thuộc đúng giao dịch, ví, cluster và phiên kiểm hiện tại không?
5. Tôi có thể xuất kết quả cho người khác kiểm lại mà không gửi kèm dữ liệu nhạy cảm không?

**Ưu tiên thực hiện trước:** phiên kiểm đáng tin cậy → trace cho mọi luật hiện có → màn hình Inspector nhận giao dịch bất kỳ trong phạm vi hỗ trợ. Đây là lát cắt chức năng đầu tiên phải dùng được từ đầu đến cuối.

Sau đó bổ sung CLI, báo cáo/replay offline, phân tích Token-2022 sâu hơn, policy của ví, so sánh giao dịch và kiểm nhiều giao dịch có giới hạn rõ ràng.

Không dùng số lượng trang, luật hay test làm mục tiêu sản phẩm. Không cần khảo sát thị trường hoặc phỏng vấn mới để bắt đầu các việc kỹ thuật này. Các phép kiểm do đội tự chạy vẫn phải mang đúng nhãn, không đổi tên thành kiểm chứng người dùng độc lập.

### Giá trị nhìn thấy của các nhóm chức năng

| Nhóm | Người dùng được gì? | Điều phải chứng minh |
|---|---|---|
| Trace và bảng hậu quả | Bấm cảnh báo để thấy account/instruction/dữ kiện liên quan | Liên kết đúng từ cùng một lượt kiểm, không đoán từ câu chữ |
| Inspector | Dán hoặc tải transaction chưa ký để kiểm | Input thật, lỗi dễ hiểu, không tự ký/gửi |
| Báo cáo và replay | Chuyển hồ sơ lỗi cho người khác và mở lại khi mất mạng | Phân biệt live/replay, redaction và giới hạn tái lập |
| Token-2022 và dòng tiền | Thấy phí, quyền delegate/owner, hook và phần chưa quan sát được | Có đối chứng hợp lệ, không gọi mọi extension là độc hại |
| Policy và tích hợp ví | Ví quyết định block/review/allow một cách nhất quán | SDK không biến thành bên giữ khóa; policy không sửa verdict |
| Compare và batch | Phát hiện transaction bị đổi và kiểm từng phần của một yêu cầu nhiều tx | Không giả vờ các simulation độc lập là một chuỗi state liên tục |

## 2. Baseline và cách đọc repo

### 2.1. Những gì đã quan sát khi lập kế hoạch

- HEAD lúc đọc là `15f28b6`; `git status --short` không có thay đổi. Không cố định SHA này cho các phiên sau.
- Artifact `apps/demo-wallet/public/so-lieu.json` và commit dựng deck ghi **730** ở số test (snapshot lúc lập kế hoạch). Đây là số đọc từ repo, không phải lượt chạy lại toàn bộ test trong phiên soạn tài liệu.
- Đã có L1/L2/L3, 14 luật, diagnostic tùy chọn, ví mẫu, tarball consumer, neo kết quả, timeout, bộ đối kháng, benchmark/replay và video thật.
- `rules.ts` hiện khai `bangChung` tại luật 11 và 13. Khoảng trống là phủ liên kết dữ kiện cho các luật còn lại và trình bày chúng rõ hơn; không xây lại trace từ số không.
- `Facts` có token account, mint, instruction và account facts. Mint đã có permanent delegate và transfer hook program ID; không gọi hai trường này là hoàn toàn chưa hỗ trợ.
- `fetch.ts` đang mô phỏng với `replaceRecentBlockhash: true`, có inner instructions. Cần phân biệt bytes đầu vào với ngữ cảnh mô phỏng đã thay blockhash.
- `neo.ts` hiện rút ngắn SHA-256 còn 16 ký tự hex. Cần đánh giá và nâng định dạng binding cho phiên kiểm mới, không quảng bá neo hiện tại là chứng chỉ bảo mật.
- `ky.js` đã nhận neo giữ từ trước; consumer mẫu vẫn cần contract rõ hơn cho signer bất đồng bộ, lỗi ký và chống dùng lại phiên.
- Một số đoạn của `TIEN-DO.md`/`BAN-GIAO.md` ghi snapshot 726, trong khi HEAD mới hơn có 730; cũng còn câu PARTIAL do cây bẩn cạnh báo cáo cây sạch. `CU-00` phải đối chiếu trước khi tiếp tục. Không kế thừa nguyên trạng kết luận chưa commit/DNS hỏng của phiên cũ.

### 2.2. File cần đọc

| Trách nhiệm | Nguồn hiện có |
|---|---|
| Quyết định sản phẩm, bất biến | `CLAUDE.md`, `docs/CUSTOS.md`, `docs/DAC-TA-CORE.md`, `docs/DAC-TA-L3.md` |
| Hợp đồng SDK | `packages/types/src/index.ts`, `packages/types/src/validate.ts`, `packages/core/src/index.ts` |
| Orchestration | `packages/core/src/inspect.ts` |
| Dữ kiện và serialization | `packages/core/src/facts.ts`, `facts-io.ts`, `l1/fetch.ts`, `l1/parse.ts` |
| Decode/coverage | `packages/core/src/l1/decode.ts`, `coverage.ts`, `bang-idl.ts` |
| Verdict/trace/diff | `packages/core/src/l2/rules.ts`, `evaluate.ts`, `packages/core/src/diff.ts` |
| Binding và signing | `packages/core/src/neo.ts`, `vi-du-tich-hop/src/ky.js`, `ky.d.ts`, `apps/demo-wallet/src/gui.ts` |
| UI hiện có | `apps/demo-wallet/src/App.tsx`, `CanhBao.tsx`, `HauQua.tsx`, `style.css` |
| Giải thích kỹ thuật/AI | `packages/ai/src/mucKyThuat.ts`, `templates.ts`, các validator/guard cùng package |
| Ranh giới tin cậy | `docs/bao-mat/THREAT-MODEL.md`, `docs/PHU-THUOC.md`, `docs/NGAN-SACH-RPC.md` |
| Quyết định trace/decoder | `docs/adr/0002-chan-doan-tuy-chon.md`, `docs/DECODER-TIEP-THEO.md` |
| Bằng chứng/tiến độ | `docs/roadmap/TIEN-DO.md`, `BAN-GIAO.md`, `data/benchmark/`, `data/tich-hop/` |

Các đường dẫn file mới trong tài liệu này là **đề xuất**, không phải khẳng định chúng đã tồn tại. Claude được đổi tên cho hợp cấu trúc repo và phải cập nhật tài liệu liên quan.

## 3. Ranh giới phải giữ

1. `level` chỉ do L2 tạo. Policy, UI, LLM và dApp không được hạ verdict hoặc xóa cảnh báo để cho ký.
2. `safe` vẫn chỉ có nghĩa không phát hiện vấn đề trong phạm vi đã kiểm, không phải bảo đảm an toàn.
3. Thiếu dữ liệu cần thiết phải được thể hiện rõ. Lỗi hạ tầng không được trình bày như đã phát hiện tấn công.
4. Khớp `expectedAction` không làm nhẹ verdict. dApp origin, tên token và lời khai đều không đáng tin nếu chưa có nguồn tin cậy.
5. Không mặc định thêm smart contract, token riêng, staking, dashboard doanh thu hoặc tài khoản người dùng. Mỗi thành phần mới phải phục vụ một luồng đã nêu.
6. Core không giữ khóa, không ký/gửi. Phần tích hợp gọi signer do ví cung cấp phải tách khỏi engine; tests dùng signer stub. Inspector và replay không có quyền ký.
7. Replay không được dùng để cấp phép ký; JSON import không trở thành phiên live tin cậy chỉ vì đúng schema/hash.
8. Không tự thay blockhash trong transaction người dùng rồi ký trên kết quả cũ. Thay message phải có lượt kiểm và xác nhận mới.
9. Kế thừa public API hiện có. Thay đổi phá tương thích phải có ADR, migration và versioning rõ; không âm thầm đổi nghĩa trường cũ.
10. Không biến người dùng thiếu phỏng vấn thành blocker cho việc kỹ thuật độc lập. Không tạo dữ liệu phỏng vấn/market-size giả.
11. Không tự commit/push/tag/publish/deploy/nộp nếu phiên làm việc chưa giao việc đó. Không hỏi lại quyền đã được giao. Việc code, test, tài liệu và gói local tiến hành theo yêu cầu phát triển.
12. Không in secret, RPC URL chứa credential, raw signed transaction hoặc dữ liệu người dùng vào log công khai.

Yêu cầu phát triển mới cho phép Claude đề xuất và thực hiện mở rộng tương thích trong phạm vi roadmap. Câu cũ “hợp đồng đóng băng/cần bốn vai” không có nghĩa phải dừng mọi bổ sung tùy chọn: Claude thực hiện review theo các vai dưới đây, ghi ADR; chỉ hỏi khi thực sự đổi quyết định sản phẩm ngoài phạm vi hoặc cần hành động bên ngoài.

## 4. Kiến trúc mục tiêu và hợp đồng cần chốt

### 4.1. Phân chia trách nhiệm

```text
Unsigned transaction + trusted wallet context
          ↓
Input validation + immutable inspection snapshot
          ↓
RPC collection + observation provenance + budget
          ↓
Facts → L2 verdict + structured evidence + effects
          ↓
Inspection session (opaque to untrusted inputs)
          ├── Inspector / CLI / report / compare
          ├── deterministic explanation → optional guarded AI
          └── trusted wallet policy → explicit consent → signer adapter

Recorded evidence → offline replay → report only (no signing session)
```

Không tạo thêm package chỉ vì sơ đồ có nhiều ô. Trước hết dùng module rõ trách nhiệm trong package hiện có. Chỉ tách package nếu cần ranh giới dependency/bundle hoặc consumer độc lập.

### 4.2. Những loại dữ liệu đề xuất

Tên dưới đây mô tả thiết kế, **chưa phải API đang có**. CU-01 chốt tên và version trước khi viết consumer.

| Loại | Trường/cơ chế tối thiểu | Không được hiểu thành |
|---|---|---|
| Inspection context | cluster identity, commitment, ví được bảo vệ, message digest đầy đủ, request ID, thời điểm bắt đầu/kết thúc | Một timestamp chứng minh state không thay đổi |
| Observation | nguồn, context slot nếu có, status, giá trị hoặc lý do thiếu | Tất cả RPC là atomic snapshot |
| Evidence reference | ID ổn định trong cùng inspection, loại fact, account/instruction path, liên kết được resolve | Nội dung câu giải thích là khóa join |
| Effect | loại asset/authority change, raw amount dạng decimal string, mint/account/owner, nguồn đo và độ đầy đủ | Dòng tiền chính xác khi account không quan sát đủ |
| Coverage detail | decode/semantics/state observation, lý do thiếu, account bị ảnh hưởng | Một phần trăm xác suất an toàn |
| Inspection session | binding với input/options/context, state machine, chống stale/reuse | Receipt JSON có thể nhập lại để ký |
| Policy decision | `allow/review/block`, reason IDs, profile version, immutable engine verdict | `allow` bảo đảm thực thi thành công |
| Evidence receipt | schema version, source mode, input fingerprint, engine/decoder version, evidence manifest, redaction mode | Hash nội dung chứng minh RPC nói thật |

Tách `engineVersion`, `schemaVersion`, `policyVersion`, `decoderVersion`; chúng trả lời những câu khác nhau. Dùng số nguyên/base-unit chính xác; không chuyển bigint thành Number để cộng tiền.

### 4.3. Bất biến của một phiên kiểm có quyền dẫn tới ký

- Chụp snapshot bytes **trước lần await đầu tiên**. Phân tích bản sao thuộc sở hữu consumer tin cậy, không giữ object transaction mutable do dApp cung cấp.
- Binding bao gồm message, ví được bảo vệ, cluster identity và các options ảnh hưởng đánh giá. Dùng digest đầy đủ hoặc so bytes; hash không thay thế kiểm nguồn tin cậy.
- `valid / signing / stale / consumed / cancelled / failed / unknown` có chuyển trạng thái rõ. JSON đúng schema không được tự tạo `valid`.
- Đồng ý của người dùng gắn với đúng session và policy decision. Đổi transaction/cluster/ví/policy thì vô hiệu đồng ý cũ.
- Kiểm độ mới và lifetime ngay trước signer; khóa chuyển trạng thái đồng bộ trước await signer để chặn double-click.
- Signer promise resolve mới gọi là ký xong. Reject/abort/timeout phải có trạng thái riêng. Ký xong không đồng nghĩa đã gửi hoặc đã xác nhận.
- Hết hạn chờ signer không chứng minh ví đã hủy ký. Giữ phiên không thể tái sử dụng; kết quả về muộn không tự gửi, không mở lại consent và không ghi đè phiên mới. Nếu provider không hỗ trợ abort thật, ghi kết cục chưa rõ và yêu cầu thao tác mới có kiểm lại.
- Đối chiếu message trả về sau signer; nếu khác snapshot, không chuyển tiếp để gửi. Không tự bịa chữ ký hoặc thay chữ ký người đồng ký.
- Ví/extension có thể nằm ngoài quyền kiểm soát SDK. Tài liệu phải nêu ranh giới TOCTOU và không hứa cưỡng chế consumer cố tình bỏ qua.

### 4.4. Mô phỏng, lifetime và slot

RPC hỗ trợ simulation không broadcast; yêu cầu chữ ký phụ thuộc `sigVerify`, và `replaceRecentBlockhash` có thể thay blockhash dùng trong mô phỏng. Vì vậy thành công của simulation đã thay blockhash không chứng minh message gốc còn gửi được. Lưu cờ thay thế và ngữ cảnh trả về, không sửa ngầm input. [Nguồn Solana](https://solana.com/docs/rpc/http/simulatetransaction).

Phân biệt recent-blockhash transaction với durable nonce. Với recent blockhash, chỉ dùng `lastValidBlockHeight` khi biết nó thuộc đúng hash; tx nhập ngoài không tự có metadata này. Thiếu thì dùng kiểm phù hợp hoặc ghi unknown, không lấy height của blockhash vừa fetch để gán cho hash khác. Durable nonce chưa hỗ trợ thì hiện rõ và không đi qua đường ký mặc định. [Nguồn về confirmation/expiration](https://solana.com/developers/cookbook/transactions/confirmation).

`minContextSlot` là ràng buộc tối thiểu, không tạo snapshot chung cho nhiều lời gọi. Không dùng “cùng commitment” như bằng chứng mọi pre/post account đến từ cùng một trạng thái. Fallback RPC khác phải tạo attempt có provenance mới, không ghép nửa kết quả nhà cung cấp A với nửa B rồi gọi là một lượt kiểm.

Định danh mạng cần cụ thể hơn một chuỗi `localnet`: lấy context từ cấu hình consumer tin cậy, đối chiếu genesis hash RPC với mạng dự kiến khi có, và vô hiệu phiên khi cấu hình/instance thay đổi. Không xác minh được identity thì hiện unknown và không cấp quyền ký theo policy mặc định. `getGenesisHash` trả genesis hash của cluster kết nối; đây vẫn là dữ liệu từ RPC, không phải cơ chế chống RPC nói dối. [Nguồn Solana](https://solana.com/docs/rpc/http/getgenesishash).

## 5. Quy trình làm việc dành cho Claude

### Vai cần thực hiện

| Vai | Quyết định chịu trách nhiệm |
|---|---|
| Product/Lead | Giá trị chức năng, phạm vi từng lát cắt, điều kiện mở nhánh |
| Solana/Core | Facts, CPI/ALT, Token-2022, slot/lifetime, tính đúng của rule |
| SDK/Security | Contract, trust boundary, session, parsing, privacy và dependency |
| Frontend/UX | Luồng kiểm, đọc hậu quả, keyboard/focus, mobile, trạng thái lỗi |
| QA/Reviewer | Đối chứng, regression, mutation có ý nghĩa, độ tái lập và claim |

Đây là các góc nhìn phải áp dụng, không bắt buộc thuê người hoặc chạy nhiều agent. Chỉ song song hóa khi công cụ/quyền cho phép và không cùng sửa contract chưa chốt.

### Chu kỳ thực thi

1. Đọc thẻ, code hiện hành và artifact liên quan; chỉ ra phần đã có.
2. Viết acceptance case cụ thể; với lỗi, tái hiện trước khi sửa.
3. Chốt thay đổi contract/ADR nhỏ nếu cần; mở rộng vừa đủ cho lát cắt đang làm.
4. Implement cả đường thành công, thiếu dữ liệu, lỗi và hủy.
5. Chạy test phù hợp và consumer thật; UI thay đổi phải kiểm trình duyệt.
6. Cập nhật tài liệu sử dụng và giới hạn; không đánh dấu DONE vì có code hoặc screenshot.
7. Ghi bằng chứng và trạng thái, rồi chọn thẻ kế tiếp đủ phụ thuộc. Không dừng sau khi viết plan con.

**Nguồn trạng thái duy nhất:** thêm mục `Roadmap UPDATE CUSTOS (CU)` vào `docs/roadmap/TIEN-DO.md` khi bắt đầu thực thi. Tài liệu này giữ yêu cầu và acceptance, không giữ bảng phần trăm hoàn thành thứ hai. `BAN-GIAO.md` giữ bước tiếp theo và bẫy cần nhớ.

Trạng thái: `TODO`, `IN_PROGRESS`, `VERIFY`, `DONE`, `PARTIAL`, `WAIT_INPUT`, `DEFERRED_SCOPE`, `NOT_NEEDED` có lý do. Thẻ DONE cũ bị ảnh hưởng phải được đánh dấu cần kiểm lại đúng phạm vi.

## 6. Lộ trình theo phụ thuộc

| Lát cắt | Thẻ | Sản phẩm nhìn thấy được |
|---|---|---|
| A — một giao dịch có thể giải thích | 00–09 | Inspector nhập tx, hiển thị hậu quả và trace từ phiên kiểm hiện tại |
| B — người khác kiểm lại được | 10–12 | CLI, receipt và replay offline có nhãn |
| C — đọc sâu hành vi Solana | 13–17 | Phí Token-2022, quyền, hook, SOL/rent và capability matrix |
| D — tích hợp vào luồng ví | 18–23 | Policy, signer adapter, compare, batch và ngân sách RPC |
| E — bản nâng cấp có thể nghiệm thu | 24–27 | Corpus, consumer compatibility, UX, demo và báo cáo cuối |

Các dải trên là cách gom sản phẩm, không phải yêu cầu làm tuần tự toàn bộ. CU-24 bắt đầu chuẩn bị corpus ngay khi CU-04 xong; test bảo vệ từng chức năng phải viết trong chính thẻ đó. CU-22 có thể bắt đầu sau CU-03, không cần chờ CU-21.

Đường mở đầu: `CU-00 → CU-01 → CU-02/CU-03 → CU-04 → CU-05/CU-06/CU-07 → CU-08 → CU-09`.

## 7. Các thẻ thực thi bắt buộc

Mỗi thẻ tuân thủ Definition of Done ở mục 9. “Bắt buộc” nghĩa là thuộc bản nâng cấp đầy đủ được đề xuất; không bắt buộc mọi module phải gom vào một release hoặc một PR.

### CU-00 — Khóa baseline thực tế và dọn mâu thuẫn trạng thái

**Vai:** Lead, QA. **Phụ thuộc:** không. **Ưu tiên:** nền tảng.

- Đọc HEAD/status, artifact mới nhất và phạm vi source hash. Phân biệt số đo cũ với trạng thái hiện tại.
- Chạy baseline phù hợp trên repo hiện tại; không dùng số 730 (snapshot cũ) làm quota test.
- Đối chiếu các câu 726/730, cây sạch/PARTIAL, video đã có/chưa có. Cập nhật phần hiện hành; giữ snapshot lịch sử có nhãn.
- Thêm bảng CU vào sổ tiến độ. Ghi tình trạng TB còn mở dựa trên evidence, không tự đóng việc BTC/remote CI.
- Ghi manifest baseline ở `docs/review/update-custos/<run-id>/baseline.json`: commit, dirty flag, hash phạm vi, lệnh/exit, dependency/runtime.
- **Nghiệm thu:** agent mới biết đang mở rộng bản nào và lỗi baseline nào chưa xử lý. Có lỗi thì phân loại trước khi đổi code, không gộp với lỗi tính năng mới.

### CU-01 — ADR cho API mở rộng và migration

**Vai:** SDK, Core, Security. **Phụ thuộc:** CU-00.

- Đọc hợp đồng types, validators, `inspect()` và consumer ngoài repo. Lập compatibility matrix JS/TS/browser/Node.
- Chốt observation, effect, evidence và session types của mục 4; phân biệt public DTO với state nội bộ không serialize.
- Ưu tiên trường tùy chọn hoặc API mới có tên rõ. Giữ `inspect()` cũ hoạt động theo contract cũ.
- Version schema diagnostic nếu thay cấu trúc; có decoder đọc bản cũ hoặc thông báo unsupported, không cast bừa.
- Đề xuất file `docs/adr/<số-kế-tiếp>-inspection-session-evidence.md`; không ghi đè ADR đã quyết.
- **Nghiệm thu:** ví dụ consumer cũ compile/run; consumer mới validate runtime; input thiếu/sai/unknown-version bị xử lý rõ. Không khóa public API vào React hoặc một RPC provider.

### CU-02 — Session giữ đúng giao dịch và độ mới

**Vai:** SDK, Security. **Phụ thuộc:** CU-01.

- Implement session nội bộ theo mục 4.3; digest đầy đủ, snapshot riêng, binding options/context, invalidation và generation ID.
- Giữ neo cũ để compatibility; viết migration sang phiên mới, không nhận neo nhập từ dApp làm quyền ký.
- Tách thời gian đo freshness với thời gian hoàn thành AI. AI chậm không làm kết quả cũ thành mới.
- Giới hạn tuổi phải hữu hạn, hợp lệ; timestamp tương lai/NaN, clock lệch và chính sách ms không hợp lệ phải có xử lý bảo thủ, ghi lý do.
- **Test bắt buộc:** mutate cùng object trong khi await và sau inspect; đổi ví/cluster/options; A trả sau B; double-click; session hủy/hết hạn/dùng lại; import receipt giả.
- **Nghiệm thu:** không có signer call ở trường hợp invalid. Bản sao cùng bytes chỉ được dùng khi đúng context và session hợp lệ; không cấm chỉ vì khác object reference.

### CU-03 — Ngữ cảnh RPC, blockhash và độ đầy đủ của simulation

**Vai:** Solana, Security. **Phụ thuộc:** CU-01.

- Ghi slot/commitment/provider identity đã lọc secret, simulation error, blockhash replacement và thời điểm từng bước.
- Kiểm khả năng thư viện đang ghim trước khi dùng field mới của RPC; không ép nâng toàn bộ Solana SDK nếu chưa cần.
- Cluster là context do ví/cấu hình RPC tin cậy cung cấp; serialized transaction không tự chứa một trường chứng minh cluster. Không suy cluster chỉ từ message hoặc việc simulation thành công.
- Giữ pre/post observation riêng; nêu rõ trường hợp không nhận đủ account, slot không biết hoặc context bất nhất.
- Implement kiểm lifetime phù hợp với input; recent blockhash và durable nonce đi nhánh riêng như mục 4.4.
- Retry/fallback không ghép evidence khác attempt. Core không tự gửi transaction để “xác minh”.
- **Nghiệm thu:** fixture malformed/partial/null, slot chênh, blockhash cũ nhưng simulation replacement thành công đều không được cấp xác nhận sai. Live Devnet chứng minh đúng trường mà public endpoint hiện trả; thiếu field được ghi unknown.

### CU-04 — Evidence graph và provenance thống nhất

**Vai:** Core, SDK. **Phụ thuộc:** CU-02, CU-03.

- Dựng evidence index từ Facts/observations của chính lượt inspect; ID không dùng văn bản tiếng Việt hoặc số thứ tự đã bị lọc mất ngữ cảnh.
- Instruction path giữ outer index, inner index và parent. Chưa có stack depth thì không dựng cây CPI đầy đủ bằng suy đoán.
- Phân biệt `observed`, `derived`, `missing`, `unsupported`, `error` với reason code; giá trị 0 khác unknown.
- Chỉ trả dữ liệu tối thiểu ở chế độ thường; diagnostic chi tiết có opt-in và giới hạn kích thước.
- **Test:** evidence dangling, duplicate ID, index sai, account null, asset cùng symbol khác mint, dữ liệu từ attempt khác.
- **Nghiệm thu:** mọi link public resolve được trong cùng inspection hoặc hiện thiếu rõ; bật diagnostic không đổi verdict và không gọi RPC lần nữa.

### CU-05 — Trace cho tất cả luật đang phát cảnh báo

**Vai:** Core, QA. **Phụ thuộc:** CU-04.

- Lập mapping từng luật hiện có → điều kiện → fact/observation thật → evidence ID → UI label.
- Bắt đầu luật đổi owner, delegate và outflow để cải thiện ngay demo; sau đó phủ các luật còn lại.
- Luật dựa vào thiếu thông tin phải dẫn tới evidence của sự thiếu thông tin, không bịa account/post-state.
- Thay mọi join qua `detail.includes(...)` còn lại bằng ID; không tự tạo quan hệ nhân quả chỉ từ account delta.
- **Test:** ca dương/âm từng luật; đổi câu chữ hoặc locale không đổi diff severity; mỗi hit trỏ đúng dữ kiện kích hoạt, không chỉ kiểm mảng nonempty.
- **Nghiệm thu:** tất cả hit của luật trong phạm vi có trace đủ chứng minh lý do hoặc typed missing evidence hợp lệ. Không đạt nếu chỉ gắn chung ID transaction vào mọi cảnh báo để đủ số.

### CU-06 — Bảng hậu quả tài sản và quyền có cấu trúc

**Vai:** Core, UX. **Phụ thuộc:** CU-04.

- Tách thay đổi số dư, token authority, account program owner, delegate, close authority và phí thành các nhóm effect rõ.
- Giữ raw amounts, decimals, mint và account; format chỉ ở UI. Không gộp hai mint có cùng symbol.
- Hiện địa chỉ đầy đủ khi cần so sánh/sao chép; phân biệt ví owner với program owner.
- Lượng chuyển gross/net/fee chỉ hiển thị nếu đo/suy được có căn cứ; chỉ có delta thì gọi đúng là delta.
- **Test:** nhiều token account cùng mint, owner đổi không transfer, transfer + owner đổi, wSOL wrap/unwrap, account đóng, dữ liệu post thiếu.
- **Nghiệm thu:** không vẽ tiền biến mất chỉ vì đổi quyền; không coi account không trả về là số dư 0; mỗi effect có provenance và precision chính xác.

### CU-07 — Coverage theo năng lực thay vì một con số gây hiểu nhầm

**Vai:** Core, UX, QA. **Phụ thuộc:** CU-04.

- Giữ coverage cũ cho compatibility; thêm chi tiết decode syntax, semantic knowledge và state observation.
- Danh sách chưa hiểu chỉ rõ program/instruction/account liên quan và lý do: missing decoder, missing ALT, partial simulation, extension unsupported…
- IDL nhận ra tên/lược đồ không đồng nghĩa hiểu hậu quả kinh tế. Không làm con số coverage tăng giả nhờ đổi tên mức decode.
- Không thêm risk score 0–100 khi chưa hiệu chuẩn. Có thể hiển thị tỷ lệ đếm nhưng luôn kèm mẫu số và ý nghĩa.
- **Test:** decoded nhưng semantics unknown; CPI thiếu; data enrichment thiếu nhưng dữ kiện thiết yếu đủ; ALT không resolve.
- **Nghiệm thu:** người đọc biết chính xác “chưa đọc gì”, không chỉ thấy 67%; mở chi tiết không gọi thêm RPC để sửa câu chuyện của kết quả cũ.

### CU-08 — Inspector nhận transaction ngoài tình huống demo

**Vai:** Frontend, SDK, Security. **Phụ thuộc:** CU-02, CU-03, CU-06, CU-07.

- Thêm luồng Inspector trong app hiện có; giữ các demo cũ làm ví dụ có nhãn, không thay bằng mock kết quả.
- Đầu vào đầu tiên: base64 serialized transaction và file UTF-8; ví được bảo vệ; Devnet/local validator. Validate kích thước, encoding, version, chữ ký, địa chỉ trước RPC.
- Nhận tx đã có chữ ký phải cảnh báo dữ liệu nhạy cảm, không ghi lịch sử/raw payload mặc định. Không yêu cầu seed phrase/private key.
- Hiện privacy note: simulation gửi dữ liệu giao dịch tới RPC được chọn. Không quảng cáo mọi dữ liệu chỉ ở máy khi gọi RPC.
- Trạng thái: rỗng, sai input, đang kiểm, đã hủy, lỗi RPC, partial, kết quả hợp lệ, kết quả cũ. Hủy/đổi input vô hiệu phiên trước.
- **Nghiệm thu:** dán tx thật ngoài hai button mẫu và xem kết quả; invalid input không chạm RPC; lỗi account/blockhash/RPC trong cluster đã chọn được nêu rõ, không tuyên bố tự phát hiện cluster gốc từ bytes; mobile, paste, upload, keyboard đều dùng được. Không có nút ký/gửi tại Inspector.

### CU-09 — UI bấm từ cảnh báo tới dữ kiện

**Vai:** UX, Core. **Phụ thuộc:** CU-05, CU-06, CU-07, CU-08.

- Mặc định hiện hậu quả chính, giới hạn và hành động người dùng; kỹ thuật mở dần trong drawer/section.
- Bấm một cảnh báo mở rule/reason, facts before/after, nguồn observation, instruction liên quan khi có; highlight đúng hàng.
- Phân biệt account correlation và nguyên nhân đã xác định. Chưa đủ trace thì hiện thiếu, không tự chọn instruction gần nhất.
- Focus vào kết quả mới, trả focus khi đóng drawer; loading có thông báo vừa đủ, không spam screen reader.
- **Nghiệm thu:** chạy ca đổi owner và ca lành, người review lần theo được đường cảnh báo → dữ kiện thật; dùng bàn phím hoàn toàn, không tràn ngang ở 320/375/768/desktop và zoom 200%.
- **Cổng lát cắt A:** quay/chụp minh chứng thao tác thật. Chưa đạt A thì không lấy các chức năng trang trí khác thay thế.

### CU-10 — CLI dùng được ngoài monorepo

**Vai:** SDK, QA. **Phụ thuộc:** CU-08 (contract input đã kiểm).

- Thêm CLI tối thiểu: inspect từ file/stdin, chọn ví/cluster, output human/JSON; command name chốt ở CU-01.
- Không nhận private key; không có send mặc định; endpoint có credential không lộ qua lỗi/help/log.
- Chốt exit code theo phân loại engine (`safe/warning/danger`) và lỗi input/hạ tầng, chưa diễn giải chúng thành quyền ký. JSON tách `engineLevel`, `inspectionStatus`, `policyDecision` (chưa bật policy thì null); stdout chỉ chứa kết quả, diagnostics vào stderr.
- Sau CU-18 có thể thêm chế độ policy rõ ràng; không âm thầm đổi nghĩa exit code mặc định. CLI thẻ này không phụ thuộc một evaluator chưa triển khai.
- Đặt size limits, hỗ trợ hủy, không treo vô hạn; offline input parsing không tự fetch metadata.
- **Nghiệm thu:** cài tarball vào thư mục mới rồi chạy bằng Node không TS loader; piping/stdin/JSON hợp lệ trên Windows và môi trường CI có sẵn. Test exit code thật, không chỉ gọi hàm nội bộ.

### CU-11 — Export receipt và redaction

**Vai:** SDK, Security, UX. **Phụ thuộc:** CU-04, CU-08, CU-10.

- Export JSON có version và bản đọc được (Markdown hoặc HTML tự chứa); không cần PDF mới nếu chưa có nhu cầu.
- Có hai chế độ: hồ sơ riêng đủ để replay khi dữ liệu cho phép; bản chia sẻ đã lược/ẩn dữ liệu. Cho preview trước export.
- Redact RPC credential, log path máy, memo/token metadata nhạy cảm theo schema. Địa chỉ/public tx cũng có khả năng liên kết danh tính; không gọi redaction là ẩn danh tuyệt đối.
- Tắt inclusion raw tx/signatures mặc định. Giới hạn output, sanitize HTML/Markdown/text không đáng tin.
- Ghi hash chỉ cho tính toàn vẹn nội dung; không gọi đó là chữ ký chứng thực hay bằng chứng RPC trung thực.
- **Nghiệm thu:** corpus secret giả không lọt export; import/export round-trip với bigint, Unicode và missing fields; receipt share thiếu dữ kiện replay phải ghi `not_replayable` cùng lý do.

### CU-12 — Replay offline có nhãn và bộ tình huống

**Vai:** Core, UX, QA. **Phụ thuộc:** CU-11.

- Tái dùng `facts-io.ts` và cơ chế replay đang có; không tạo bộ luật offline riêng.
- Nhập receipt/fixture, validate schema/size/version/hash; chạy L2/effects từ snapshot đã lưu mà không gọi RPC.
- Nhãn “Dữ liệu ghi lại”, thời điểm, nguồn và phiên bản hiển thị ở màn kết quả, không chỉ trong README.
- Tách replay cùng phiên bản và re-evaluate bằng engine mới; nếu kết quả khác thì hiển thị cả hai cùng nguồn.
- **Nghiệm thu:** tắt mạng vẫn mở các ca đủ dữ liệu; sửa một byte gây integrity error khi manifest yêu cầu; payload không tin cậy không tạo session ký. Receipt share không đủ dữ liệu bị từ chối replay thay vì bịa Facts.

### CU-13 — Registry decoder có phạm vi năng lực

**Vai:** Solana, SDK, Security. **Phụ thuộc:** CU-04, CU-07.

- Chuẩn hóa interface cho decoder đã có; công bố program ID, instruction/extension supported, version, output fields và giới hạn.
- Tách nhận dạng cấu trúc IDL với semantic adapter. Không hardcode “đã hỗ trợ DEX” chỉ vì đọc được instruction name.
- Decoder là dependency tin cậy do nhà phát triển đóng gói, không chạy mã plugin tải từ URL do dApp cung cấp.
- Bounded parser: giới hạn length/recursion/discriminator/account indexes; lỗi trả unknown có lý do, không fallback sang verdict thuận lợi.
- **Nghiệm thu:** decoder cũ không mất khả năng; malformed fixture không crash/hang; đối chứng instruction cùng prefix nhưng schema khác bị từ chối. Chưa thêm protocol mới ở thẻ này.

### CU-14 — Token-2022 transfer fee và amount thực nhận

**Vai:** Solana, Core. **Phụ thuộc:** CU-03, CU-06, CU-13.

- Đọc transfer-fee config/withheld fields trong phạm vi thư viện và layout hỗ trợ; ghi epoch/config dùng khi tính.
- Hiện sender delta, receiver delta, token transfer fee và network fee thành các khoản khác nhau; không đếm phí hai lần.
- Phân biệt ước tính theo config với số quan sát từ simulation; thiếu account/epoch thì ghi unknown thay vì suy từ symbol.
- Tính integer rounding/cap theo nguồn chính thức và bản code protocol tương ứng; test vector không chép chính hàm implementation làm oracle.
- **Nghiệm thu:** ca fee 0, có cap, rounding boundary, đổi config theo epoch, withheld state và dữ liệu thiếu. Không đánh dấu nguy hiểm chỉ vì token thu phí.
- **Nguồn cần đối chiếu:** [Transfer Fees](https://solana.com/docs/tokens/extensions/transfer-fees).

### CU-15 — Quyền Token-2022 và transfer hook dễ hiểu

**Vai:** Solana, UX, Security. **Phụ thuộc:** CU-05, CU-06, CU-13.

- Mở rộng trình bày các fields permanent delegate/hook đã có: ai có quyền gì, dữ kiện đọc ở mint hay account, có thay đổi trong tx hay là khả năng tồn tại sẵn.
- Với hook, chỉ mô tả inner actions/account effects đã quan sát; không hứa phân tích mọi hook program tùy ý.
- Thiếu extra accounts/hook invocation data phải làm giảm độ đầy đủ được công bố, không diễn giải như không có hậu quả.
- Giữ authority state và authority usage riêng. Một extension hợp lệ tồn tại không tự đủ để nâng thành danger.
- **Nghiệm thu:** cặp ca dùng hợp lệ và ca có hành vi đáng ngờ cho từng nhóm; quyền có từ trước không bị hiển thị là mới cấp; không thêm blacklist suy từ tên program.
- **Nguồn:** [Permanent Delegate](https://solana.com/docs/tokens/extensions/permanent-delegate), [Transfer Hook](https://solana.com/docs/tokens/extensions/transfer-hook).

### CU-16 — SOL, phí và vòng đời account

**Vai:** Core, Solana. **Phụ thuộc:** CU-03, CU-06.

- Tách network fee, priority fee khi đọc được, lamports cấp cho account/rent reserve, refund khi đóng account và SOL/wSOL movement.
- Sponsored transaction phải phân biệt fee payer với ví được bảo vệ. Không quy mọi SOL giảm cho người dùng nếu người khác trả phí.
- Quy tắc tránh double-count giữa token và lamports có fixture đối chiếu.
- Chỉ gọi “refund” khi có căn cứ; account không trả về sau simulation không tự chứng minh đóng account.
- **Nghiệm thu:** transfer SOL, create/close ATA, wrap/unwrap wSOL, fee sponsor, fee fallback và partial accounts. Tổng giải thích khớp dữ kiện quan sát trong sai số integer đã định, hoặc hiện phần chưa giải thích được.

### CU-17 — Capability matrix và hướng xử lý phần chưa hỗ trợ

**Vai:** Core, Product, UX. **Phụ thuộc:** CU-07, CU-13, CU-14, CU-15, CU-16.

- Sinh bảng hỗ trợ từ registry/contract có kiểm, không gõ riêng trong UI/docs/CLI.
- Với mỗi gap, cho biết người dùng có thể làm gì: kiểm lại khi RPC phục hồi, xem địa chỉ/program đầy đủ, xuất receipt, hoặc nhờ kiểm thủ công.
- Unsupported token extension/instruction version không được vô tình rơi vào decoder gần giống.
- “Known program” không có nghĩa “trusted program”; “instruction decoded” không có nghĩa “risk analyzed”.
- **Nghiệm thu:** UI, CLI và docs cùng nói một phạm vi; thêm/giảm capability làm guard phát hiện lệch claim. Không cho nút “bỏ qua mọi cảnh báo” chỉ để tránh trạng thái unknown.

### CU-18 — Policy của ví tách khỏi engine

**Vai:** SDK, Security, Product. **Phụ thuộc:** CU-02, CU-07, CU-17.

- Dựng evaluator thuần nhận verdict/completeness/session context và profile do ví tin cậy cung cấp; không lấy policy từ tx/dApp payload.
- Kết quả `allow/review/block` có policy version và reason IDs. Mặc định danger → block; incomplete/unknown → review hoặc block theo quy định đã công bố.
- Giữ verdict/reason/evidence nguyên vẹn; policy có thể thận trọng hơn, không âm thầm làm nhẹ kết luận engine.
- Nếu có allowlist, giới hạn mục đích; không cho phép entry “program quen” bỏ qua thay owner/outflow quan sát được.
- **Nghiệm thu:** truth table đầy đủ và ca xung đột; thay profile làm vô hiệu consent trước đó; cùng input/profile cho cùng decision. UI giải thích được ai đưa ra quyết định nào.

### CU-19 — Adapter tích hợp ví và signer bất đồng bộ

**Vai:** SDK, Security, UX. **Phụ thuộc:** CU-02, CU-03, CU-18.

- Xây integration example thực sự dùng session mới: request → inspect → policy → user consent → signer adapter. Engine vẫn không có quyền gửi.
- Signer contract hỗ trợ promise, user rejection, provider disconnect, timeout và trả transaction khác; không báo `daKy:true` trước khi promise hoàn tất.
- Khoá session trước await, chống gọi ký lặp; nếu user reject muốn thử lại phải tuân thủ lifecycle rõ ràng, không reset consumed tùy tiện.
- Timeout/disconnect khi signer đang chạy không đồng nghĩa chưa ký. Không gọi signer lần hai tự động; giữ kết cục unknown khi chưa biết, xử lý resolve muộn theo mục 4.3 và test riêng nhánh này.
- Promise reject muộn phải được xử lý, không tạo unhandled rejection; callback cũ không được cập nhật kết quả của request mới.
- Sau ký đối chiếu message; tách trạng thái signing/signed/submitted/confirmed/failed/unknown. Không gộp mất phản hồi mạng thành chưa gửi.
- **Nghiệm thu:** fake wallet kiểm mọi nhánh; không signer call ở block/cancel/stale; consumer ngoài repo dùng được. Demo công khai vẫn không nhúng khóa. Đường gửi thật chỉ khi chủ dự án giao riêng trong môi trường thử an toàn.

### CU-20 — So sánh hai transaction/kết quả

**Vai:** Core, UX. **Phụ thuộc:** CU-06, CU-08, CU-11.

- So sánh message và effects của A/B: người nhận, amount, authority, program/account, fee/blockhash/ALT khác nhau.
- Chia hai loại so sánh: bytes/structure deterministic và observation ở hai thời điểm. State drift không tự chứng minh dApp tráo transaction.
- Dùng stable identity để match dòng, không dựa vị trí UI hoặc token symbol.
- Không có nút “chấp nhận thay đổi” tái sử dụng consent cũ; B cần session riêng.
- **Nghiệm thu:** chỉ đổi blockhash, đổi đích vanity cùng đầu/cuối, thêm SetAuthority, reorder instructions, hai observation cùng tx khác slot. UI nêu rõ so sánh loại nào.

### CU-21 — Batch review có giới hạn đúng

**Vai:** SDK, Core, UX. **Phụ thuộc:** CU-08, CU-18, CU-20.

- Nhập danh sách tx giới hạn độ dài/bytes/concurrency; mỗi tx có session, state và kết quả riêng.
- Mặc định mô phỏng độc lập; hiện rõ điều đó. Không cộng delta độc lập rồi gọi là số dư cuối của toàn chuỗi.
- Nếu tx B phụ thuộc account được A tạo mà A chưa thực thi, B có thể không mô phỏng được; ghi dependency/unresolved, không sửa kết quả thành pass.
- Đổi thứ tự/thêm/xóa tx làm vô hiệu batch consent; thất bại một phần không ẩn dưới một badge xanh tổng.
- **Nghiệm thu:** batch nhiều tx trong đó có tx nguy hiểm; hủy giữa chừng; B phụ thuộc A; context cluster được khai khác nhau giữa các phần tử bị từ chối; kết quả về sai thứ tự vẫn gắn đúng hàng. Không suy cluster gốc từ raw tx và không tự triển khai bundle/sequential-state simulator ở thẻ này.

### CU-22 — Abort, retry và cache đúng ngữ cảnh

**Vai:** SDK/Perf, Security. **Phụ thuộc:** CU-02, CU-03.

- Tái dùng ngân sách chung đã có; deadline bao phủ cả orchestration và các attempt, không cộng timeout mỗi RPC thành chờ vô hạn.
- Truyền AbortSignal khi transport hỗ trợ; nếu chỉ dừng chờ, ghi đúng giới hạn và chặn stale UI update.
- Retry bounded cho lỗi tạm thời; không retry mọi simulation failure hoặc decode error. Provider fallback tạo attempt mới có provenance riêng.
- Cache metadata theo cluster/program/version thích hợp; không cache verdict làm quyền ký. TTL/invalidation cho ALT, IDL và account state phải có lý do riêng.
- **Nghiệm thu:** timeout/hủy dọn timer/listener; late response bị bỏ; cache không rò giữa cluster/ví/config; request count và deadline đo được bằng fake transport và một lượt live hẹp.

### CU-23 — Đo hiệu năng gắn với chức năng mới

**Vai:** SDK/Perf, QA. **Phụ thuộc:** CU-09, CU-12, CU-22.

- Đo production: click→result, render evidence lớn, parse/export receipt, bundle size, RPC count và cancellation latency.
- Báo sample size, cold/warm, median/p95 khi đủ mẫu; không gọi giá trị lớn nhất của vài lượt là p95 có ý nghĩa.
- Có ngân sách payload/DOM/evidence; chỉ lazy load/virtualize khi đo cho thấy cần và kiểm accessibility sau thay đổi.
- Không tối ưu bằng bỏ rule/evidence hoặc bớt failure cases. Bộ test deterministic không chứa ngưỡng thời gian máy quá chặt gây flaky.
- **Nghiệm thu:** so sánh baseline cùng điều kiện, ghi tradeoff và overhead của diagnostic; có giới hạn tài nguyên rõ cho input lớn.

### CU-24 — Corpus mở rộng và kiểm đối kháng theo chức năng

**Vai:** QA, Solana, Security. **Phụ thuộc:** CU-04; mở sớm, hoàn tất sau các chức năng áp dụng.

- Tạo manifest gắn fixture với feature/rule/nguồn/label rationale/split/limitations. Phân biệt synthetic Facts, RPC replay, local validator và Devnet live.
- Mỗi family mới có benign, adversarial, malformed và missing-data case thích hợp; không ép một số lượng test tùy ý.
- Test reference semantics Token-2022 bằng vector/công thức/implementation độc lập phù hợp, không lấy output chính Custos làm expected.
- Giữ holdout chưa dùng để sửa; khi đã xem/sửa theo mẫu, chuyển trạng thái và ghi lịch sử. Self-labeled benchmark không thành accuracy thị trường.
- Đối kháng bắt buộc: stale/mutated session, giả receipt, prompt-like memo/metadata, integer overflow/rounding, duplicate evidence, malicious IDL/oversize payload, cache cross-cluster và signer promise rejection.
- **Nghiệm thu:** giữ cả lần lỗi, mọi ca bỏ có lý do; test quan trọng chứng minh thất bại khi chủ động làm sai hành vi. Không nhét mutation vào bản sản phẩm.

### CU-25 — Contract tests, package và tài liệu tích hợp mới

**Vai:** SDK, QA. **Phụ thuộc:** CU-10, CU-11, CU-18, CU-19, CU-21, CU-22.

- Cài tarball thật từ thư mục trống ngoài monorepo, kiểm Node JS, TS, browser build và optional dependencies.
- Ví dụ README phải chạy được, gồm đường không kiểm được/hủy/stale; copy-paste không đòi nguồn `.ts` dưới node_modules.
- Kiểm docs và public exports khớp, schema mới có migration, bundle không kéo Node-only deps vào browser.
- Đếm lại dòng tích hợp nếu thay consumer; không giữ “30 dòng” bằng cách giấu phần bắt buộc trong helper rồi quảng cáo toàn bộ chỉ có 30 dòng.
- **Nghiệm thu:** consumer cũ giữ được hành vi; consumer mới thực hiện session→policy→signer stub; CLI/receipt/replay chạy ngoài repo. Publish registry là hành động riêng.

### CU-26 — Hoàn thiện UX và tài liệu sử dụng

**Vai:** UX, Product, QA. **Phụ thuộc:** CU-09, CU-12, CU-17, CU-20, CU-21.

- Giữ ngôn ngữ mặc định tiếng Việt rõ ràng; thuật ngữ kỹ thuật mở theo yêu cầu, không phô implementation trên màn quyết định chính.
- Làm đầy empty/loading/error/partial/cancelled/stale/replay states; không nút chết, không cảnh báo chỉ phân biệt bằng màu.
- Kiểm screen reader cơ bản, keyboard/focus, reduced motion, zoom, chữ dài, full address, clipboard failure và file upload error.
- Tái dùng design system/CSS hiện tại, tôn trọng thay đổi giao diện đã merge; không redesign toàn bộ chỉ vì có nhiều tính năng mới.
- **Nghiệm thu:** flow Inspector→trace→export→replay và compare/batch dùng được trên mobile/desktop; axe chỉ là một phần bằng chứng. Không gọi probe tự động là usability research người thật.

### CU-27 — Nghiệm thu bản nâng cấp và demo chức năng

**Vai:** QA, Lead, Security, Product. **Phụ thuộc:** CU-00 đến CU-26.

- Khóa manifest phạm vi nội dung; chạy ma trận mục 10 trên bản ứng viên. Không dùng artifact xanh của source khác.
- Ghi audit dependency và quyết định xử trí hiện hành; không ép nâng phá tương thích chỉ để đẹp số audit, cũng không bỏ advisory đã đổi phạm vi ảnh hưởng.
- Dựng demo mới cho Inspector, trace, receipt/replay, Token-2022, policy và compare; số liệu lấy từ nguồn sinh, không gõ tay trên deck.
- Gói local gồm app, CLI/tarball cần thiết, mẫu replay, hướng dẫn, manifest và video khi UI đã đổi; kiểm ngoài repo và khi offline ở đúng phần được hỗ trợ.
- Báo cáo riêng: tính đúng sản phẩm; độ mạnh bằng chứng; hồ sơ local; phát hành/BTC. Không nâng điểm vì hoàn thành nhiều thẻ.
- **Nghiệm thu:** tất cả lát cắt bắt buộc có bằng chứng hoặc trạng thái PARTIAL cụ thể. Remote CI/publish/đăng ký BTC không được giả thành đã làm; tiếp tục dùng TB-H01/H02 cho các việc này.

## 8. Nhánh mở rộng có điều kiện

Không mở cả bốn nhánh chỉ vì không bị hạn chế thời gian. Mỗi nhánh phải qua điều kiện dưới đây và có acceptance trước khi thêm dependency/hạ tầng.

### CU-O1 — Hỏi đáp về bằng chứng của giao dịch

**Mở khi:** CU-05, CU-11, CU-12 xong và cần giải thích câu hỏi ngoài template hiện có.

- Bắt đầu bằng Q&A tất định: “quyền nào đổi?”, “phí nào?”, “phần nào chưa biết?” trỏ evidence ID.
- Nếu thêm LLM, đầu vào là Facts/evidence đã lọc của đúng phiên; không raw tx/secret, không tool ký/gửi, không quyết verdict.
- Mỗi khẳng định factual phải gắn evidence hợp lệ; thiếu dữ kiện thì trả chưa biết. Memo/metadata được coi là dữ liệu, không phải lệnh.
- So sánh với template theo groundedness, tỷ lệ khẳng định không có nguồn, coverage disclosure, latency và chi phí thực đo. Thước offline không chứng minh người thật hiểu hơn.
- **Đóng nhánh không tích hợp LLM** nếu không chứng minh lợi ích trên thước đã chốt; giữ deterministic Q&A có ích. Không gọi API trả phí khi chưa có ngân sách/quyền hiện hành.

### CU-O2 — Trang rà quyền của một ví, chỉ đọc

**Mở khi:** CU-15, CU-17, CU-22 xong và mô hình dữ liệu có thể trả lời quyền hiện tại với phạm vi rõ.

- Người dùng chủ động nhập địa chỉ; scan có giới hạn/pagination, chọn cluster, công khai RPC disclosure.
- Hiển thị owner/delegate/close authority/token extension trong các account đã đọc, kèm coverage và thời điểm.
- Không gọi đây là “mọi quyền ví trên Solana”; không hứa phát hiện toàn bộ quyền trong mọi program. Không tự tạo lệnh revoke hàng loạt.
- **Nghiệm thu:** partial scan/timeout không thành không có quyền; không lưu danh sách ví mặc định; các quyền hợp lệ không bị gọi là bị hack.

### CU-O3 — Semantic adapter cho một protocol được chọn bằng dữ liệu

**Mở khi:** CU-13, CU-17, CU-24 xong và cohort hợp lệ cho thấy gap lặp lại có ảnh hưởng đáng kể.

- Xếp hạng theo số tx độc lập và tác động tới tài sản, không chỉ số instruction trong một tx.
- Chọn một action/program/version cụ thể; đọc nguồn chính thức của protocol, ghim ABI/IDL và fixture có nguồn.
- So với đường IDL hiện có: chứng minh adapter bổ sung semantics/effects gì, không chỉ đổi tên action đẹp hơn.
- **Nghiệm thu:** benign/adversarial/unknown-version, amount/min-out khi có căn cứ; chương trình upgrade khiến adapter hết hiệu lực phải nhận ra. Không cam kết “hỗ trợ toàn bộ DeFi”.

### CU-O4 — Dịch vụ HTTP cho tích hợp ngoài trình duyệt

**Mở khi:** CU-10, CU-11, CU-22, CU-25 xong và có yêu cầu dùng server cụ thể mà SDK/CLI chưa đáp ứng.

- Làm service local trước: API versioning, request limit, auth khi vượt localhost, CORS, timeout/cancel, structured errors và request ID.
- Không cho caller tùy ý gọi mọi URL RPC trên server: allowlist/validation chống SSRF, chặn địa chỉ nội bộ và redirect bypass.
- Mặc định không lưu raw tx/receipt/địa chỉ ví; khóa RPC server không ra client. Rate limit và quota đo được, không thêm billing sớm.
- **Nghiệm thu:** API response khớp SDK, fault/load tests có giới hạn, no credential leakage. Deploy public và chi phí hạ tầng chờ quyền tương ứng, không chặn phần service local.

## 9. Definition of Done cho mọi thẻ

Một thẻ chỉ DONE khi có tất cả điều áp dụng:

- Hành vi đúng mô tả, cả đường lỗi/partial/hủy; chức năng không chỉ tồn tại trong test.
- Test meaningful: ca thành công, đối chứng và trường hợp vi phạm bất biến; lỗi có bằng chứng trước/sau.
- Typecheck và kiểm liên quan đạt; không skip/xóa case khó để làm xanh.
- Public contract, validator, consumer example và hướng dẫn khớp nhau.
- UI có thao tác thật, focus/keyboard/mobile; screenshot không thay browser assertions.
- Claim không mạnh hơn bằng chứng; replay/live, simulated/submitted/confirmed được tách đúng.
- Có manifest source/hash/input/tooling, command/exit và phạm vi chưa kiểm.
- Không phát sinh secret, artifact measurement bị unit test ghi đè, hoặc thay đổi ngoài phạm vi chưa giải thích.

Mẫu bản ghi vào sổ tiến độ:

```text
Mã thẻ / trạng thái:
Hành vi trước → sau:
File và public contract thay đổi:
Lệnh đã chạy / exit / artifact:
Source commit / dirty flag / content hash:
Ca chưa kiểm và lý do:
Rủi ro, điều kiện mở lại:
Thẻ đủ phụ thuộc để làm tiếp:
```

Không ghi DONE cho optional branch chưa mở. `NOT_NEEDED` phải có quyết định và căn cứ; `WAIT_INPUT` chỉ khi thực sự thiếu đầu vào, không dùng vì chưa nghĩ ra cách implement.

## 10. Ma trận nghiệm thu bản nâng cấp

| Bề mặt | Ca phải có | Bằng chứng |
|---|---|---|
| Input | base64/file đúng, quá lớn, version lạ, ví sai, tx signed | Parser tests + UI/CLI actual input |
| Snapshot/session | mutate khi await, stale, đổi cluster/wallet/policy, double submit | Signer call counts + session lifecycle assertions |
| RPC/context | timeout, retry, partial/null account, context lệch, replacement blockhash | Fake transport + replay + live scope nhỏ |
| Trace | mọi hit có căn cứ đúng, missing evidence, CPI parent/index | Fixture assertions + click trace trong UI |
| Amount/authority | bigint boundary, cùng symbol khác mint, owner ≠ program owner | Reference vectors + effect provenance |
| Token-2022 | transfer fee, epoch/cap/rounding, delegate/hook benign và rủi ro | Parser/rule tests và raw evidence phù hợp |
| Policy/signing | default rules, untrusted profile, signer reject/timeout/returns altered tx | SDK/consumer ngoài repo, không ký thật |
| Receipt | versioning, corruption, secrets, redaction, not-replayable | Round-trip, negative fixtures, xuất file thật |
| Offline | đủ/thiếu snapshot, old schema, engine khác | Browser/network disabled, nhãn replay |
| Compare/batch | thay account, chỉ đổi blockhash, dependent tx, partial/cancel | UI + per-item result identity assertions |
| UX | keyboard, focus, touch target, zoom, narrow viewport, clipboard | axe + probes thực, thiết bị/browser đã kiểm ghi rõ |
| Package | old/new JS/TS consumer, CLI, browser bundle, optional deps | Tarball install ngoài repo, compile/run |
| Performance | cold/warm, payload lớn, deadline/cancel, RPC count | Run metadata và thống kê đúng cỡ mẫu |
| Claim/release | docs/deck/UI vs artifact, secret scan, source hash | Gate logs và manifest; quyền phát hành tách riêng |

Không yêu cầu tất cả phép kiểm phải gọi mạng. Devnet chỉ chứng minh các ca đã chạy trên Devnet; local validator mạnh về tái lập nhưng không đại diện mọi trạng thái thực tế.

### Các lệnh đã có để tái dùng

```powershell
git status --short
git log -5 --oneline
npm run check
npm run thu-tich-hop:deterministic
npm run replay-rpc
npm run so-baseline
npm run doi-khang
npm run thu-goi
npm run thu-tich-hop:devnet
npm run kiem-san-pham
npm run nop-bai-strict
```

Đây là tập lệnh tham chiếu, không chạy lại toàn bộ sau mỗi sửa CSS. Chọn theo phạm vi và điều kiện môi trường; ghi rõ command chưa chạy. Đọc script trước khi chạy lệnh có tác động mạng/đóng gói. Không dùng `publish-sdk` như lệnh kiểm.

Khi test count/luật/consumer/số liệu đổi, dùng generator hiện có (`so-lieu`, đồng bộ tài liệu, `release-notes`, generator deck). Đọc thứ tự phụ thuộc trước; kiểm lại sau đồng bộ. Không sửa test thành chấp nhận số sai chỉ để tránh bước này.

Nếu mã đang dirty, vẫn chạy và giữ artifact với dirty flag/content hash; không bịa cây sạch. Sau commit do người có quyền thực hiện, kiểm hiệu lực theo `toTien.ts` và gate hiện hành; chỉ đo lại khi gate hoặc thay đổi phạm vi yêu cầu.

## 11. Những việc chưa nên thêm

- Smart contract không có trách nhiệm bắt buộc trong sản phẩm; không dùng nó làm đạo cụ để lấp ô rubric.
- AI agent tự quyết giao dịch, tự sửa tx hoặc tự ký; chatbot chung không gắn evidence.
- Risk score phần trăm, nhãn “an toàn tuyệt đối”, token/protocol allowlist biến thành bảo chứng.
- Decoder hàng loạt dựa vào tên protocol nổi tiếng nhưng không có dữ liệu xác định gap.
- Auto-revoke, auto-fix hoặc một click bỏ mọi cảnh báo khi chưa có mô hình consent/session phù hợp.
- Account login, cloud history, telemetry theo dõi ví, trả phí/subscription trước khi có lý do sản phẩm và privacy design.
- Multi-chain, full wallet, ví lưu ký hoặc nền tảng trading làm lệch phạm vi transaction intelligence.

“Không giới hạn thời gian” cho phép làm sâu và kiểm đủ; không làm mọi mở rộng trở thành cần thiết.

## 12. Chỉ dẫn khởi động để dán cho Claude

```text
Đọc docs/roadmap/UPDATE-CUSTOS.md và triển khai bản nâng cấp Custos theo tài liệu này.

Đọc CLAUDE.md, docs/CUSTOS.md, roadmap Technical cũ, docs/roadmap/TIEN-DO.md và
BAN-GIAO.md trước. Đối chiếu HEAD/code/artifact hiện tại; không kế thừa số test,
DNS blocker hoặc trạng thái cây bẩn từ phiên cũ khi chưa kiểm.

Bắt đầu CU-00, CU-01 rồi hoàn thành lát cắt A: session → provenance → trace/
effects/coverage → Inspector → UI xem bằng chứng. Implement thật, không chỉ
viết kế hoạch con. Không dựng lại những gì đã có và không redesign toàn app.

Tiếp tục các thẻ CU bắt buộc theo phụ thuộc, không theo mốc thời gian. Mỗi thẻ
có code, test meaningful, UI/consumer thật nếu áp dụng, tài liệu và evidence.
Lưu trạng thái CU trong TIEN-DO.md; docs/roadmap/UPDATE-CUSTOS.md là yêu cầu, không phải
bảng hoàn thành thứ hai. Cập nhật BAN-GIAO.md để phiên sau tiếp tục chính xác.

Giữ L2 độc quyền verdict, AI chỉ diễn giải, SDK không giữ khóa/ký/gửi, receipt
replay không cấp quyền ký. Session giữ snapshot từ trước await và gắn consent
đúng message/wallet/cluster/policy; signer async phải được xử lý đúng.

Không cần phỏng vấn/market research để làm nhánh kỹ thuật. Không làm giả bằng
chứng độc lập. Nhánh CU-O chỉ mở khi đủ điều kiện; không tự mở mọi nhánh.
Không tự commit/push/publish/deploy/nộp hoặc chi tiền khi chưa được giao.
Nếu thiếu quyền/secret/BTC, ghi đúng blocker rồi làm tiếp việc độc lập.

Sau mỗi lát cắt báo: chức năng dùng được, lỗi đã sửa, test/bằng chứng, giới hạn
còn lại và thẻ tiếp theo. Không tuyên bố hoàn tất toàn bộ nếu chỉ có tài liệu,
mock hoặc test chưa chạy. Khi hoàn thành, bàn giao gói local và báo cáo đúng
phạm vi; không cam kết điểm số hay xác suất đạt giải.
```

## 13. Tài liệu tham chiếu và cách dùng nguồn

Nguồn code/repo ở mục 2 là căn cứ cho hiện trạng. Các tài liệu Solana dưới đây được tra khi lập kế hoạch; Claude phải đối chiếu lại API và phiên bản thư viện thực dùng khi triển khai, không copy ví dụ của SDK khác vào web3.js hiện tại.

- [simulateTransaction](https://solana.com/docs/rpc/http/simulatetransaction): options và response của simulation.
- [Confirmation và expiration](https://solana.com/developers/cookbook/transactions/confirmation): blockhash/lifetime và xác nhận.
- [Token extensions](https://solana.com/docs/tokens/extensions): phạm vi extension.
- [Transfer fees](https://solana.com/docs/tokens/extensions/transfer-fees): semantics và trường dữ liệu phí token.
- [Permanent delegate](https://solana.com/docs/tokens/extensions/permanent-delegate): quyền ở cấp mint.
- [Transfer hook](https://solana.com/docs/tokens/extensions/transfer-hook): thực thi hook khi transfer.

Những API/module mới, thứ tự ưu tiên và tiêu chí sản phẩm trong tài liệu là **đề xuất thiết kế của roadmap**, không phải tuyên bố Solana hoặc BTC bắt buộc chúng. Không coi nhận diện ABI/IDL hoặc một test pass là chứng minh an toàn của protocol.
