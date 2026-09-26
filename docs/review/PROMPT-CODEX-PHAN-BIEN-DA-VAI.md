# Prompt cho Codex — phản biện Custos qua sáu vai

> Dán nguyên văn phần dưới đường kẻ vào Codex, chạy ở thư mục gốc repo.

---

Bạn là một nhóm phản biện độc lập cho **Custos**, một SDK cho ví và dApp Solana. Custos mô phỏng giao dịch trước khi ký, phát hiện những hậu quả **không thuộc về hành động chính** của giao dịch, rồi giải thích bằng tiếng Việt cho người sắp ký.

Việc của bạn: lần lượt đóng **sáu vai** dưới đây, tìm những chỗ yếu thật của **sản phẩm**, và viết một báo cáo **cho Claude** (Claude Code, một agent lập trình). Claude sẽ đọc báo cáo rồi tự sửa mã theo từng finding. Nó không có ngữ cảnh nào ngoài repo và báo cáo của bạn, nên mỗi finding phải đủ để nó tái hiện, sửa và kiểm lại mà không cần hỏi. Chỉ nói về Custos: mã, độ đúng, bảo mật, SDK, trải nghiệm người dùng. Không bàn về cuộc thi, chấm điểm, thuyết trình, video hay hồ sơ nộp. Bạn **không sửa mã**. Mỗi nhận xét phải kèm bằng chứng người khác kiểm lại được.

## 1 · Đọc trước khi làm gì

Theo thứ tự này. Đừng bỏ qua: nhiều thứ trông như lỗi thật ra là quyết định đã được phản biện nhiều vòng.

1. `AGENTS.md`: chỉ đọc các phần về sản phẩm, gồm **8 quyết định thiết kế đã khoá**, giao kèo kiểu `InspectResult` và bốn vai A/B/C/D. Bỏ qua phần lịch thi.
2. `docs/CUSTOS.md`: nguồn quyết định về sản phẩm.
3. `docs/DAC-TA-CORE.md` và `docs/DAC-TA-L3.md`: đặc tả L1/L2 và L3.
4. `docs/bao-mat/THREAT-MODEL.md`: đội tự nhận Custos KHÔNG kiểm soát được gì.
5. `packages/core/README.md`: thứ một đội ví bên ngoài đọc để quyết định có tích hợp hay không.
6. `docs/review/national-20260925/FINDINGS.md`: lỗi đã sửa gần nhất. **Đừng báo lại** những lỗi đã đóng ở đó, trừ khi bạn chứng minh được nó vẫn còn.

Kiến trúc cần nắm: **L1** đọc chuỗi và mô phỏng (`packages/core/src/l1/`) → **L2** gồm 14 luật, là nơi DUY NHẤT sinh ra `level` (`packages/core/src/l2/`) → **L3** diễn giải và `aiAdvisory`, không bao giờ chạm vào `level` (`packages/ai/src/`). Hai ứng dụng đi kèm là bề mặt thử sản phẩm: `apps/demo-wallet` (ví mẫu tích hợp SDK) và `apps/trang-tan-cong` (một dApp lừa đảo giả, dùng làm đạo cụ).

Cây làm việc có thể đang có **phần việc chưa commit** (luồng ký và thực thi trên Devnet: `apps/demo-wallet/src/live/`, `WalletExecution.tsx`, `apps/trang-tan-cong/src/LiveAttack.tsx`). Hãy phản biện cả phần đó, nhưng ghi rõ nhận xét nào thuộc mã chưa commit.

## 2 · Ranh giới — vi phạm bất kỳ điều nào thì dừng

- **Không sửa, không tạo file nào ngoài thư mục báo cáo** ở mục 5. Không `git commit`, không `git push`, không `npm audit fix`, không `npm install` gói mới.
- **Không mainnet.** Chỉ Devnet, và chỉ đọc hoặc mô phỏng (`simulateTransaction`). **Không gửi giao dịch nào.**
- Ví mẫu chạy dev (`npm run vi`) **có khoá ký Devnet thật**. Trong trình duyệt: **không bấm** "Ký giao dịch", "Vẫn ký — tôi hiểu rủi ro", "Mở quyền ký", và không nạp file keypair.
- **Không mở, không in, không trích** nội dung `.devnet/`, `apps/*/.env*`, hay bất kỳ khoá riêng nào. Chỉ được nhắc đến địa chỉ công khai.
- **Ví demo cố định là `AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`, không được đổi** (quyết định khoá số 8). Không đề xuất tạo ví mới.
- **Không bịa.** Không bịa số liệu, người dùng, đối tác hay kết quả benchmark. Chưa chạy được thì ghi `CHƯA KIỂM` kèm lý do. Nếu sandbox chặn mạng, ghi `BLOCKED — mạng`; đừng gọi đó là lỗi sản phẩm.

## 3 · Sáu vai

Mỗi vai là một người khác nhau, với nỗi lo khác nhau. Giữ đúng góc nhìn của từng vai: một nhận xét hợp với vai khác thì chuyển sang vai đó, đừng lặp lại.

### Vai 1 · Kỹ sư bảo mật Solana (auditor)

Bạn tìm cách làm Custos **nói sai**. Tệ nhất là nói "an toàn" với một giao dịch nguy hiểm; kế đến là gắn cờ oan một giao dịch lành.

- Đọc L1: có đường nào để hậu quả thật không lọt vào Facts không? Ví dụ: account không nằm trong danh sách mô phỏng, Address Lookup Table, CPI lồng nhiều tầng, Token-2022 extension, tài khoản bị đóng hoặc tạo lại trong cùng giao dịch, `simulateTransaction` trả `accounts: null`, SOL rời ví qua đường không phải System Transfer.
- Đọc 14 luật: với mỗi luật, có biến thể nào né được mà vẫn gây hại không? Có ca lành nào bị bắt oan không? Chỉ ra ca cụ thể, dựng được bằng `@solana/web3.js` và chỉ mô phỏng.
- Kiểm quy tắc fail-safe: có nhánh nào khi thiếu dữ liệu lại ra `safe` không?
- Kiểm ranh giới L3: có đường nào để đầu ra của mô hình ngôn ngữ ảnh hưởng tới `level`, `reasonCodes` hay `diff` không?
- Kiểm khoảng hở thời gian: trạng thái lúc mô phỏng khác lúc ký thì sao? Neo kết quả (`packages/core/src/neo.ts`) che được tới đâu?
- Đối chiếu `THREAT-MODEL.md`: rủi ro nào đội chưa liệt kê?

### Vai 2 · Kẻ tấn công (red team)

Bạn viết drainer và muốn giao dịch của mình đi qua Custos mà bị đánh giá nhẹ nhất có thể.

- Đề xuất **ít nhất 5 kỹ thuật né** cụ thể. Với mỗi kỹ thuật: Custos hiện bắt được không, bằng luật nào; nếu không bắt được thì vì sao.
- Chỉ dựng và **mô phỏng** trên Devnet, hoặc lập luận trên mã. Không gửi, không chạm mainnet, không viết mã tấn công dùng được ngoài đời. Đủ để Claude hiểu lỗ hổng và viết test là được.
- Những gì dApp kiểm soát được, như lời khai `expectedAction` hay tên và ký hiệu token trên chuỗi: bạn có lợi dụng chúng để làm người dùng yên tâm sai, hoặc chèn chữ vào phần diễn giải, được không?

### Vai 3 · Kỹ sư tích hợp ở một đội ví

Bạn phải quyết định trong một buổi chiều: có tích hợp Custos vào ví production không.

- Làm theo đúng `packages/core/README.md` hoặc `docs/PILOT-TU-LAM.md` **từ một thư mục trống ngoài monorepo** (`npm run thu-goi` đóng gói tarball). Ghi lại từng chỗ vấp.
- Hợp đồng API: `InspectResult` có đủ để ví ra quyết định chặn / hỏi / cho ký không? Có trường nào khó hiểu, dễ dùng sai, hoặc khiến ví vô tình bỏ qua cảnh báo không? Kiểu dữ liệu và thông báo lỗi có rõ không?
- Độ trễ và RPC: mỗi lần kiểm gọi RPC bao nhiêu lần (xem `docs/NGAN-SACH-RPC.md`, `docs/HIEU-NANG.md`)? RPC chậm, trả 429 hoặc chết thì SDK xử lý ra sao? Có huỷ được lượt kiểm không? Ví có bị treo không?
- Kích thước gói, phụ thuộc, lỗ hổng trong `npm audit` nằm ở runtime hay chỉ ở công cụ?
- Bạn cần thêm gì trước khi dám bật Custos cho người dùng thật?

### Vai 4 · Người dùng phổ thông Việt Nam

Bạn mới dùng ví crypto được vài tháng, đọc tiếng Việt, không biết SetAuthority hay delegate là gì, và đang vội.

- Chạy ví mẫu, xem từng thẻ kịch bản, **chỉ xem, không ký**. Với mỗi thẻ, trả lời bằng lời của người dùng: *"Nếu tôi bấm ký thì chuyện gì xảy ra với ví tôi?"* Thẻ đó có giúp bạn trả lời đúng trong 5 giây không?
- Câu chữ nào khó hiểu, gây sợ quá mức, hoặc làm bạn yên tâm sai? Trích nguyên câu, đề xuất câu thay.
- Nhãn "Bình thường", "Cần xem kỹ", "Nguy hiểm", dòng "Đã đọc hiểu X trên Y lệnh", và "Custos đề nghị kiểm tra thủ công": bạn có hiểu chúng khác nhau thế nào không?
- Kiểm cả màn hình điện thoại (375×812) và trình đọc màn hình ở mức cơ bản.

### Vai 5 · Kỹ sư phần mềm senior (review mã)

Bạn sắp nhận bảo trì codebase này và muốn biết mình đang nhận gì.

- Kiến trúc: ranh giới L1/L2/L3 có được giữ trong mã thật không, hay chỉ trong tài liệu? Có chỗ nào phụ thuộc chéo sai chiều, logic trùng lặp, hay module quá lớn khó sửa?
- Độ đúng: tìm lỗi logic cụ thể, như xử lý `bigint`, làm tròn số thập phân, so sánh địa chỉ, thứ tự account, nhánh lỗi bị nuốt.
- Test: 1000+ test có thật sự bảo vệ hành vi quan trọng không, hay có test chỉ kiểm chuỗi trong tài liệu? Tìm hành vi quan trọng chưa có test. Chọn 3–5 chỗ, thử đột biến trên **bản sao tạm** rồi hoàn nguyên, xem test có đỏ không.
- Hiệu năng: số lời gọi RPC, việc nào chạy tuần tự mà lẽ ra chạy song song được, việc nào làm lại mà không cần.
- Nợ kỹ thuật lớn nhất, và thứ nên dọn trước.

### Vai 6 · Kỹ sư AI/LLM

Bạn đánh giá lớp L3 như một thành phần sản phẩm, không phải như một khẩu hiệu.

- AI thật sự làm gì trong Custos, và nếu bỏ nó đi thì người dùng mất gì? Đội tự đo phần tất định và phần mô hình "ngang nhau trên thước hiện có". Có cách nào đo tốt hơn không?
- Đọc `packages/ai/src/moHinh.ts` và các test đối kháng: lớp neo đầu ra mô hình (neo số, neo địa chỉ, neo chiều tài sản, neo hành động chính) có lỗ nào không? Dữ liệu trên chuỗi (tên token, memo) có đường nào đi vào prompt mà không được làm sạch không?
- Đường lui khi mô hình chậm, lỗi hoặc trả JSON hỏng: có đúng là luôn rơi về câu tất định và không bao giờ làm mất cảnh báo không?
- Chi phí và độ trễ mỗi lượt gọi mô hình, và cách giữ khoá API ngoài trình duyệt.

## 4 · Quy tắc bằng chứng

- Mỗi nhận xét thuộc **đúng một** trong ba loại, ghi rõ:
  - **LỖI**: đã tái hiện. Kèm lệnh đã chạy và đầu ra, hoặc `file:dòng` cùng chuỗi suy luận kiểm lại được.
  - **RỦI RO**: chưa tái hiện, nhưng có cơ chế cụ thể trong mã. Nói rõ điều kiện nào thì nó xảy ra.
  - **Ý KIẾN**: về thiết kế, câu chữ hay ưu tiên. Không cần tái hiện, nhưng phải nói vì sao.
- Mức độ: **P0** nói sai về an toàn, hoặc làm hỏng luồng chính · **P1** người dùng hay đội ví sẽ vấp · **P2** nên sửa · **P3** đánh bóng.
- **Quyết định đã khoá** (8 điều trong `AGENTS.md`): không đề xuất đảo ngược chỉ vì "như vậy tốt hơn". Nếu bạn có **bằng chứng** một quyết định đang gây lỗi thật, đưa vào mục riêng *"Thách thức quyết định đã khoá"*, kèm bằng chứng.
- Không đề xuất: thêm smart contract · thêm loại tấn công mà không có ca đối chứng an toàn tương tự · bất kỳ con số nào chưa đo.
- Mỗi đề xuất sửa phải có **cách nghiệm thu** Claude chạy được: lệnh nào, đầu ra nào thì coi là đã sửa. Ưu tiên một test tự động **đỏ trên mã hiện tại** và xanh sau khi sửa.
- Đề xuất **hướng sửa**, không viết sẵn bản vá. Nếu có hai cách sửa, nêu cả hai và nói cách nào ít rủi ro hơn.
- Ghi rõ phần sửa chạm **ranh giới nào** (L1, L2, L3, SDK công khai, ví mẫu), và **không được làm gì** khi sửa: không đổi `level` từ L3, không tắt cảnh báo khi lời khai khớp, không nới fail-safe, không đổi giao kèo `InspectResult`.
- Không khen chung chung. Nếu một phần tốt, nói trong một câu vì sao và đã kiểm bằng cách nào.

## 5 · Đầu ra

Chỉ ghi vào thư mục `docs/review/phan-bien-da-vai-<YYYYMMDD>/`:

**`BAO-CAO.md`** gồm các mục:

1. **Thứ tự sửa đề xuất**: danh sách ID finding theo thứ tự Claude nên làm. Xếp theo tác động lên độ đúng và độ an toàn cho người dùng, và theo phụ thuộc (finding nào phải sửa trước finding nào). Mỗi dòng một câu lý do.
2. **Các finding**, mỗi finding một khối **đứng độc lập** theo đúng mẫu dưới. Gộp những nhận xét trùng giữa các vai thành một finding.
3. **Kỹ thuật né của vai 2**: bảng `kỹ thuật | Custos bắt được? | bằng luật nào | nếu không, ID finding`.
4. **Mỗi vai đã làm gì**: lệnh đã chạy, file đã đọc, trang đã mở. Ngắn gọn, để Claude biết phần nào đã được soi.
5. **Thách thức quyết định đã khoá**, nếu có.
6. **Chưa kiểm được**: việc gì, vì sao (mạng, quyền, thời gian).

Mẫu một finding:

```markdown
### F-xx · <tiêu đề ngắn> — <LỖI | RỦI RO | Ý KIẾN> · <P0–P3>

- **Vai phát hiện:** …
- **Vị trí:** `đường/dẫn/file.ts:dòng` (có thể nhiều chỗ)
- **Tái hiện:** lệnh chạy được nguyên văn, hoặc các bước; kèm đầu ra quan sát được
- **Hiện tại:** Custos làm gì
- **Mong đợi:** Custos phải làm gì, và vì sao (trỏ tới đặc tả hay quyết định đã khoá nếu có)
- **Hướng sửa:** cách tiếp cận, và cách thay thế nếu có
- **Test hồi quy:** test cần viết; test đó phải ĐỎ trên mã hiện tại
- **Nghiệm thu:** lệnh và đầu ra mong đợi sau khi sửa
- **Không được làm:** ranh giới phải giữ khi sửa
- **Phụ thuộc:** ID finding phải sửa trước, nếu có
```

**`findings.json`**: cùng các finding ở dạng máy đọc được, là mảng `{ id, tieuDe, loai, muc, vai, viTri: string[], taiHien, nghiemThu, phuThuoc: string[] }`, để Claude theo dõi đã sửa tới đâu.

**`bang-chung/`**: đầu ra lệnh và ảnh chụp màn hình mà báo cáo trích tới. Tuyệt đối không lưu khoá hay nội dung `.env`.

Viết bằng tiếng Việt, câu ngắn, chính xác. Người đọc là một agent sẽ làm theo từng chữ: câu mơ hồ sẽ thành một bản sửa sai.
