# Prompt giao cho Claude — Custos từ giải Nhất cấp trường tới vòng toàn quốc

> Sao chép toàn bộ nội dung **bên dưới đường kẻ** vào Claude đang mở đúng repo Custos. Prompt này giao **việc triển khai và kiểm chứng**, không chỉ xin thêm một roadmap. Đọc [báo cáo rà soát 25/09](review/national-20260925/BAO-CAO.md) trước khi làm. Nếu trạng thái repo đã thay đổi, đo lại và ghi rõ chênh lệch; không biến báo cáo cũ thành sự thật vĩnh viễn.

---

Bạn là **Technical Lead + Solana security engineer + product/UX reviewer + hackathon pitch coach** của Custos. Chủ dự án đã xác nhận nhóm đạt **giải Nhất cấp trường, thuộc track Best Technical Build và đã vào vòng cuối**. Đọc lịch và những thông tin còn cần xác nhận tại `docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md`; không tiếp tục hỏi lại track đã được chủ dự án chốt, không sao chép ngày thi sang nhiều tài liệu.

## Ưu tiên mới từ góp ý mentor — demo giao dịch thực thi thật

**Đọc và thực hiện `docs/DEMO-DEVNET-THUC-THI-VA-DOI-CHIEU.md` trước khi mở rộng tính năng khác.** Chủ dự án muốn trọng tâm demo là: Custos cảnh báo hậu quả trước ký; người dùng huỷ thì ví không gửi; nếu tắt Custos và chủ động ký trong môi trường Devnet riêng, giao dịch vẫn thực thi bình thường và hậu quả thực tế kiểm chứng được trên chuỗi. Giao dịch lành tính cũng phải ký/gửi thành công cả khi bật lẫn tắt Custos.

Đây là nâng cấp ở **ví demo, bộ chuẩn bị hiện trường và giao diện đối chiếu bằng chứng**. SDK Custos vẫn chỉ đọc/mô phỏng; ví là bên ký/gửi. Các câu “không ký/phát giao dịch” ở bước kiểm tra mô phỏng bên dưới chỉ áp dụng cho phép kiểm không làm thay đổi hiện trường; **không cấm luồng thực thi Devnet có chủ ý mới được giao**. Không chuyển bản công khai thành trang phát tán khoá của đội.

Baseline cũ trong báo cáo đã có nhiều bản sửa: đọc `docs/review/national-20260925/FINDINGS.md` và mã hiện tại trước khi làm lại. Đặc biệt kiểm đường tắt Custos đang gọi `kyVaGui()` trong `App.tsx`, trong khi hàm này yêu cầu `neoRef` từ inspect; đây là xung đột được nhận thấy qua đọc mã, cần test hành vi xác nhận. Tách chính sách bảo vệ với cơ chế ký/gửi, giữ nguyên các guard của chế độ bảo vệ.

## Mục tiêu

Hãy **trực tiếp rà soát, sửa lỗi, hoàn thiện demo “dự báo → lựa chọn ký → hậu quả đã xác nhận” và hồ sơ kỹ thuật có thể kiểm chứng**. Thứ tự là: (1) luồng lành tính và luồng nguy hiểm thực thi đúng trên Devnet riêng; (2) bằng chứng sau giao dịch độc lập với kết quả mô phỏng; (3) kể rõ giá trị của Custos tại thời điểm trước ký; (4) release candidate và tài liệu phản biện; (5) nâng cấp thêm khi không phá độ ổn định.

Không dừng ở việc lập kế hoạch. Được phép viết code, test và tài liệu trong phạm vi đã mở của dự án; **không tự `git commit` hay `git push`**, không deploy/nộp bài nếu chưa có ủy quyền tương ứng. Dừng sau từng mốc lớn để báo kết quả và tiếp tục việc độc lập còn làm được. Chỉ hỏi chủ nhóm về thông tin chỉ họ/BTC biết, không hỏi xin phép cho những sửa lỗi đã được giao.

## Nguồn phải đọc và ranh giới phải giữ

1. Đọc `AGENTS.md`, `docs/CUSTOS.md`, `docs/adr/0001-doi-huong-technical-build.md`, `docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md`, `docs/BENCHMARK.md`, `docs/SEED-DATASET.md`, `docs/bao-mat/THREAT-MODEL.md`, `docs/NGHIEM-THU-VA-BAN-GIAO.md`, `packages/core/README.md`, `docs/review/national-20260925/BAO-CAO.md` và artifacts đi kèm. Đọc các file khác khi chạm đúng phần việc.
2. Trước mọi sửa đổi, ghi `git status`, HEAD và danh sách file đang dirty. **Giữ nguyên** việc người khác đang làm. Tuân thủ ranh giới vai A/B/C/D trong `AGENTS.md`: báo/đề xuất cho người sở hữu khi phải sửa chéo; đừng đè thay đổi chưa commit.
3. Không đảo các quyết định đã khóa: chỉ L2 tạo `level`; AI chỉ diễn giải/advisory, không xác nhận an toàn hoặc kết luận nguy hiểm; `expectedAction` khớp không làm giảm cảnh báo; dữ liệu thiếu → warning; Custos không ký, không gửi, không ghi on-chain; không thêm Anchor program, token hay registry chỉ để “có blockchain”. Phân biệt hành động suy ra từ transaction với ý định người dùng.
4. Tất cả demo và slide nói đúng phạm vi: Devnet; giao dịch được mô phỏng; `SetAuthority` chỉ đổi quyền, nếu muốn hiện số dư giảm phải có `Transfer` trong đúng transaction; `coverage` không phải độ an toàn; 0 **cáo buộc** khác 7 **gắn cờ**, chưa có ground truth để gọi **báo nhầm**. 20 người dùng trong hồ sơ cũ không phải 20 khách hàng mua. Chưa có pilot bên thứ ba hoặc phỏng vấn người mua được xác nhận.
5. Không cho API key, private key hay seed của đội vào browser bundle/repo/video. Không thử mainnet. Chỉ ký/gửi trong **demo Devnet riêng có ví và tài sản thử nghiệm do nhóm kiểm soát**, sau thao tác đồng ý ký; bản công khai không có signer giữ chế độ mô phỏng được gắn nhãn. Không bịa thị trường, traction, partnership, transaction, benchmark hoặc feedback mentor/BGK.

## Bước 0 — Xác nhận baseline mới

- Đối chiếu báo cáo 25/09 với HEAD hiện tại. Chạy typecheck/test, build hai frontend, đóng gói SDK, test tích hợp tất định và probe browser trên local/preview. Chạy lệnh có mạng trong môi trường phù hợp; nếu sandbox cấm mạng/esbuild/Git lock thì ghi là hạn chế môi trường, không gọi là lỗi sản phẩm. Mỗi kết quả có lệnh, exit code, bản Node/browser và phạm vi.
- Xem chính xác luồng website → trang tấn công → ví → Inspector → bằng chứng Devnet; mở mobile 375×812 và desktop 1440×900. Kiểm console/network, điều hướng bằng bàn phím, overflow, reduced motion, nút quay lại, lỗi RPC, Devnet không sẵn sàng, AI backend không sẵn sàng. Phân biệt smoke test với khả năng người dùng thật hiểu cảnh báo.
- Rà lại `npm audit --json`; hiện báo cáo ghi 5 high. Xác minh package/đường runtime/trạng thái vá mới rồi mới quyết định. Không dùng `npm audit fix --force`/downgrade major một cách mù quáng.
- Tạo hoặc cập nhật bảng finding có `ID · mức độ · bước tái hiện · quan sát · kỳ vọng · nguyên nhân/giả thuyết · bằng chứng · owner · cách sửa · điều kiện nghiệm thu`. Đánh dấu **đã tái hiện** hoặc **chưa tái hiện**; không gộp chúng.

## Bước 1 — Sửa luồng demo P0 trước mọi nâng cấp hào nhoáng

Lỗi đã tái hiện ở HEAD `0c1b96d`: `apps/trang-tan-cong/src/App.tsx` dựng `dungGiaoDichTanCong({ soLuong: BigInt(ht.soLuong) })` = `500000000`, trong khi tài khoản Devnet nguồn hiện có `490000000`. `simulateTransaction` báo `insufficient funds`; bàn giao vào ví cho “Chưa đọc hiểu hết”/coverage `0/3`, không cho cảnh báo hậu quả tấn công. `apps/demo-wallet/src/kichBan.ts` đã dùng nửa lượng cấu hình cho ca tương đương. `apps/demo-wallet/src/PhongVan.tsx` còn dùng lượng cũ, **cần tái hiện riêng**.

Hãy:

1. Đo lại số dư thực và lỗi mô phỏng để chắc lỗi còn tồn tại trên HEAD mới. Tránh chữa một vấn đề đã được người khác sửa.
2. Thiết kế một helper/bộ dựng transaction demo được chia sẻ hợp lý giữa các luồng thuộc vai B, ưu tiên **đọc số dư on-chain lúc chạy và chọn lượng chuyển hợp lệ có biên**, không sao chép “chia đôi 500” ở ba chỗ. Nếu không lấy được trạng thái hoặc tài khoản không còn đủ tiền, trả lỗi demo rõ, có cách reset/fallback có nhãn; không giả vờ đó là verdict `warning` về giao dịch nguy hiểm.
3. Bảo đảm giao dịch thực có `Transfer` và `SetAuthority` khi UI tuyên bố cả số dư giảm và quyền đổi chủ. Lời khai gian của dApp chỉ có thể **tăng** nghi ngờ; không được giảm verdict khi khai đúng. Không ký/phát giao dịch.
4. Viết test có giá trị: lượng chuyển ≤ số dư thật trong ca thử; transaction dựng ra chứa instruction mong muốn; mô phỏng hợp lệ và diff bằng hậu quả thực; cross-app handoff tới ví ra `danger` với reason code/diff cụ thể; ca thiếu tiền/RPC lỗi cho thông điệp riêng. Test nên bắt lại đúng lỗi này, không chỉ assert helper trả chính giá trị vừa gán.
5. Cập nhật probe đang đòi `500 → 0` cố định ở `scripts/kiem-trinh-duyet/soi-trinh-duyet.py`. Assert **mối quan hệ** số trước/sau, lượng chuyển và chủ sở hữu, kèm reason code; không hạ chuẩn thành “thấy chữ Nguy hiểm là đủ”. Rà `apps/demo-wallet/src/SoLieu.tsx` và lời dẫn/video/slide có cùng số cũ.

**Gate qua bước 1:** ít nhất hai lần chạy liên tiếp desktop và mobile từ trang tấn công sang ví đều ra hậu quả khớp transaction, có `danger` hợp lệ, không lỗi simulation, không gửi on-chain. Đường ví trực tiếp và màn phỏng vấn không hồi quy.

## Bước 2 — Đưa AI và Devnet về trạng thái trình bày trung thực

- Vite local trả 404 cho `/api/dien-giai` khi không chạy serverless function. Chọn đường triển khai thật cho host demo (backend giữ secret) hoặc chế độ deterministic rõ ràng. Trước khi gọi AI, UI biết endpoint có/không, hiện nhãn phù hợp, tránh request vô ích/404 khi có thể. Nếu dùng model thật, ghi provider/model, đầu vào, đầu ra đã lọc, lỗi/fallback và usage thực nếu có; AI tuyệt đối không sửa `level`.
- Chạy thử cùng **origin/URL sẽ mở trước BGK**, trên mạng dự kiến của sân khấu. Kiểm Devnet RPC/rate limit/timeout, blockhash hết hạn khi chuyển tab, video dự phòng offline, link QR, luồng reset hiện trường. Nếu GitHub Pages không chạy được API, không quảng cáo “AI thật live” trên URL đó. Một lần live eval riêng có log không đồng nghĩa mọi lần demo đều chạy AI.
- Sau khi code ổn định, chạy lại `npm run thu-tich-hop:devnet`, `npm run replay-rpc`, `npm run thu-goi`, `npm run kiem-san-pham`, `npm run nop-bai-strict` và browser probe. Bằng chứng phải ghi đúng source commit và cây sạch nếu script yêu cầu. 10 fixture replay còn thiếu: thêm trước cho các ca sử dụng trong trình bày, mỗi fixture có nguồn gốc và kỳ vọng rõ. Không suy tỷ lệ false positive từ corpus âm/không có nhãn thật.

## Bước 3 — Chuẩn bị trao đổi mentor và hồ sơ chung kết

Chuẩn bị gói cô đọng, kiểm được: (a) demo trực tiếp 60–90 giây: hành động người dùng → giao dịch → simulation/state diff → cảnh báo trước ký; (b) video dự phòng cùng build; (c) sơ đồ một trang cho L1/L2/L3, nguồn dữ liệu Solana, fail-safe, điều Custos không kiểm soát; (d) bảng “đã build/đã đo/chưa biết”; (e) ba đề xuất nâng cấp có đổi điểm rubric và chi phí rủi ro; (f) câu hỏi mentor ưu tiên.

Hỏi/để chủ nhóm hỏi BTC/mentor:

1. Xác nhận thời lượng, hình thức, yêu cầu hiện vật của vòng cuối theo nguồn lịch trung tâm; track Technical đã được chủ dự án xác nhận.
2. Với SDK off-chain **không có smart contract**, 25% “on-chain/off-chain architecture and smart contract quality” sẽ được chấm thế nào? BGK cần xem bằng chứng nào thay cho contract?
3. Yêu cầu AI × Web3 ở vòng quốc gia có bắt buộc AI gọi model live trong demo không? Bằng chứng nào chấp nhận được khi backend thất bại? Không hứa trước câu trả lời.
4. Giám khảo vòng trường khen/chê điều gì cụ thể? Phần nào cần làm rõ để khác ví phổ thông/transaction simulation khác?
5. Vòng cuối yêu cầu video dự phòng, deck, repo/tag, booth, thiết bị, Internet và tài liệu nộp như thế nào?

Ghi câu trả lời nguyên văn và nguồn; chuyển chúng thành quyết định ưu tiên có owner và kiểm chứng, không biến lời mentor thành “BTC đã duyệt” nếu không phải BTC.

## Bước 4 — Nâng cấp để tăng điểm Technical, có điều kiện dừng

Sau khi Bước 1–3 ổn định, ưu tiên theo **tác động điểm × bằng chứng × rủi ro hồi quy**:

1. **Chứng minh khác biệt kỹ thuật:** một ca instruction nhìn vô hại nhưng state-diff cho thấy đổi chủ/rút tài sản, cùng ca an toàn rất giống để chứng minh không gắn cờ bừa. Nếu có CPI/ALT/Token-2022, nêu ranh giới đọc hiểu thực tế và reason code, không gọi năng lực giao thức là tấn công chỉ vì nó tồn tại.
2. **SDK cho người khác dùng:** một ví dụ `inspect()` từ dự án ngoài monorepo có thể chạy theo README; contract input/output rõ; thời hạn RPC và fallback kiểm được. Không gọi đó là partner integration.
3. **Hiệu năng/bảo mật:** đo latency p50/p95 trên cùng môi trường, số request RPC/đường lui, bundle size và tác động lên UI; xử lý dependency high có thể vá an toàn, ghi giới hạn không vá được. Không tự nhận mô hình “phát hiện 100%”.
4. **Thuyết trình:** deck Technical 8–10 slide theo Problem → live demo → mechanism/state-diff → kiến trúc → AI/Solana roles → kiểm thử/giới hạn → bước tiếp; 4 phút nếu format BTC xác nhận. Demo hơn animation. Website chỉ chỉnh điểm nhìn thấy trực tiếp và có thể kiểm trên mobile; không đại tu giao diện sát vòng thi.

Chỉ đề xuất loại tấn công mới khi có giao dịch Devnet/mô phỏng thật, ca đối chứng an toàn, luật/coverage rõ và kịch bản demo không phụ thuộc số dư dễ trôi. Nếu không đạt, giữ ca hiện tại chạy chắc hơn. Không thêm on-chain program nếu mentor/BTC chưa chỉ ra giá trị sản phẩm cụ thể và đội chưa chứng minh an toàn.

## Cách báo cáo mỗi lượt

- Mở đầu bằng **đã sửa gì và kết quả quan sát**, sau đó mới giải thích. Nêu file/đường dẫn, lệnh test, exit code, URL/môi trường và artifact. Phân biệt **PASS / FAIL / BLOCKED_BY_ENV / CHƯA KIỂM**.
- Mỗi lỗi còn mở có độ ưu tiên P0/P1/P2, owner A/B/C/D và điều kiện đóng. Nếu chạm thư mục vai khác, để lại đề xuất/patch cho người sở hữu theo `AGENTS.md`.
- Cập nhật báo cáo/roadmap hiện hành và tài liệu lịch trung tâm theo thông tin chính thức; giữ tài liệu lịch sử. Không để pitch/video nói số cũ nếu code/bằng chứng đã đổi. Đánh dấu `[CẦN XÁC NHẬN BTC]`, `[CẦN BẰNG CHỨNG]`, `[CẦN NGƯỜI DÙNG]` đúng chỗ; không điền số giả.
- Bàn giao gồm: mã đã sửa, test hồi quy, báo cáo findings trước/sau, demo script + fallback, mentor packet, và danh sách việc chỉ chủ nhóm có thể làm. **Không commit/push**; chủ nhóm tự chọn thời điểm ghi và đẩy mã.

**Tiêu chuẩn hoàn tất:** người không viết mã có thể chạy bộ ba demo trong `docs/DEMO-DEVNET-THUC-THI-VA-DOI-CHIEU.md`: chuyển tiền lành tính thành công, nguy hiểm được cảnh báo rồi huỷ không ký/gửi, và nguy hiểm khi chủ động tắt Custos/ký cho ra hậu quả Devnet có signature và dữ liệu kiểm chứng. Tạo phiên mới để lặp lại được. Số thực tế phải đọc từ chuỗi, không chép từ dự báo; AI/Devnet ở chế độ nào đều được ghi đúng; toàn bộ test baseline hiện tại và test mới đạt, build/package/preview đạt. Gate thiếu do signer, secret, BTC hoặc dữ liệu người dùng phải ghi chưa hoàn tất, không đánh dấu xanh chỉ vì đã có UI.
