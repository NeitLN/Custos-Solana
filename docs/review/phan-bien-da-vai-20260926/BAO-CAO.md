# Custos — phản biện sản phẩm qua sáu vai, bàn giao Claude

> ⚠️ **TÀI LIỆU LỊCH SỬ — ảnh chụp mã nguồn lúc Codex phản biện, 26/09/2026.** Báo cáo mô tả lỗi TRƯỚC khi sửa; giữ nguyên văn làm mốc. Trạng thái sửa từng finding: [`TRANG-THAI-SUA.md`](TRANG-THAI-SUA.md).

Ngày 26/09/2026 · HEAD tham chiếu `e4973afbd63e4fea6c6247b6f13a6ab0bc73bd71` · **cây làm việc có thay đổi chưa commit**.

**Kết luận:** ưu tiên sửa độ đúng của quyền rút và fail-safe dữ liệu mint trước khi mở rộng tính năng. Hai ca chạy toàn tuyến bằng RPC stub hiện trả `safe` khi dữ kiện/quyền cần cảnh báo bị bỏ sót. Bộ test hiện có không phủ những biến thể này.

Đây là review đọc mã và thử nghiệm cục bộ; không phải chứng nhận bảo mật hay báo cáo đã sửa. **8 finding: 7 LỖI, 1 RỦI RO.** Mức độ: 3 P0, 4 P1, 1 P2. Không thay code sản phẩm, không gửi giao dịch, không mở khoá hoặc đọc file bí mật. Ví mặc định giữ nguyên `AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`.

## 1. Thứ tự sửa đề xuất

1. **F-01** — cấp lại quyền cho delegate cũ có thể tăng lên MAX mà toàn tuyến vẫn im.
2. **F-08** — phân biệt thiếu dữ liệu mint với mint không có thuộc tính rủi ro; đồng thời chặn sai đơn vị token.
3. **F-07** — dữ liệu mô phỏng bị cắt không được dựng thành tiền về 0; làm cùng lượt rà L1 nhưng test riêng.
4. **F-04** — lời mô hình không được trở thành lời khuyên ký hoặc phán quyết thứ hai.
5. **F-02** — cô lập tham chiếu ở biên interpreter, để sửa/timeout của adapter không làm hỏng dữ kiện.
6. **F-03** — nối aiAdvisory vào quyết định consumer, không thay enum level.
7. **F-05** — đóng đường UI đổi ví qua query; giữ đúng ví đã nạp faucet.
8. **F-06** — làm rõ snapshot hiện tại và bằng chứng hậu quả của đúng giao dịch.

Các finding không có phụ thuộc bắt buộc vào nhau. Trong F-01 phải làm **L1 lưu before → L2/diff/L3 đọc before → consumer test**. Trong F-08 làm **đánh dấu thiếu dữ liệu → L2 fail-safe → hiển thị số**. A/B/C chỉ sửa phạm vi được giao và phối hợp ở biên; không mở rộng SDK contract vô cớ.

## 2. Finding độc lập

Lệnh trong báo cáo chạy từ thư mục gốc repo. `bang-chung/` bên dưới là thư mục cạnh báo cáo. Các log là bằng chứng của lượt này, không phải kết quả CI toàn dự án. Các test mới cố ý đỏ trước sửa; không sửa/xoá assert để làm báo cáo xanh.

### F-01 · Tăng hạn mức của delegate cũ không được phát hiện — LỖI · P0

- **Vai phát hiện:** 1 — auditor
- **Vị trí:** `packages/core/src/l2/rules.ts:131` · `packages/core/src/l1/fetch.ts:375` · `packages/core/src/facts.ts:14` · `packages/core/src/diff.ts:209` · `packages/ai/src/nhanDien.ts:82`
- **Tái hiện:** Chạy `node --experimental-strip-types docs/review/phan-bien-da-vai-20260926/bang-chung/probe.mjs`; xem dòng `F-01 L1-to-L3` trong `bang-chung/probe.log`. Probe dựng SPL account bằng AccountLayout và giao dịch Approve chưa ký, RPC stub có trạng thái trước/sau. Delegate không đổi; hạn mức từ 1 DEMO lên u64::MAX; mint đã thu hồi mint/freeze authority. Ví được bảo vệ là ví cố định. Không gửi giao dịch.
- **Hiện tại:** `level=safe`, `reasonCodes=[]`, coverage 1/1; diff chỉ còn phí; L3 nói “Không tìm thấy dấu hiệu nào trong danh sách chúng tôi kiểm tra được.” L2 bỏ qua ngay khi địa chỉ delegate không đổi. L1 chỉ giữ hạn mức SAU nên tầng sau không phân biệt tăng/giảm/giữ nguyên. Đây là lỗi toàn tuyến, không chỉ một mock trực tiếp của L2.
- **Mong đợi:** Nhận diện việc mở rộng quyền rút dù người được cấp quyền không đổi. Approve ghi lại delegate và allowance; tài liệu chính thức: [Solana — Approve Delegate](https://solana.com/docs/tokens/basics/approve-delegate). Ca tăng 1 → MAX phải kích hoạt R03 và hiện rõ quyền mới; không nói token đã chuyển ngay.
- **Hướng sửa:** A bổ sung hạn mức trước vào Facts nội bộ, lấy từ account đã đọc. L2 phân biệt đổi delegate và tăng allowance. A/C cập nhật diff + nhận diện để cùng phản ánh thay đổi. Ít rủi ro hơn việc xoá đơn thuần điều kiện “cùng delegate”: xoá điều kiện sẽ có thể cáo buộc cả giao dịch không thay quyền. Với fixture cũ thiếu hạn mức trước, giữ trạng thái chưa biết và chọn xử lý thận trọng có tài liệu; không tự coi trước=0.
- **Test hồi quy:** Đã có test F-01 ĐỎ trong regression.test.mjs. Thêm: cùng delegate tăng 1→MAX; cấp mới MAX; cùng delegate giữ nguyên; giảm hạn mức; tăng nhưng vẫn trong ngưỡng hợp lệ; chuyển token không đổi quyền. Kiểm cả mã R03, dòng allowance và lời L3, không chỉ màu.
- **Nghiệm thu:** `node --experimental-strip-types --test --test-reporter=tap docs/review/phan-bien-da-vai-20260926/bang-chung/regression.test.mjs`: riêng F-01 phải xanh sau sửa; bộ `node --test packages/core/test/l2.test.ts packages/core/test/inspect.test.ts packages/ai/test/nhanDien.test.ts` vẫn qua. Cuối đợt cả sáu test mới phải xanh.
- **Không được làm:** Chạm L1/L2/diff/L3, owner A+C. Không biến mọi Approve thành Đỏ; không cho L3 sửa level; không đổi các trường bắt buộc của InspectResult.
- **Phụ thuộc:** Không có finding bắt buộc phải sửa trước.

### F-08 · Không đọc được mint vẫn trả safe và tự gán decimals=0 — LỖI · P0

- **Vai phát hiện:** 1 — auditor
- **Vị trí:** `packages/core/src/l1/fetch.ts:449` · `packages/core/src/l1/fetch.ts:454` · `packages/core/src/diff.ts:159` · `packages/core/src/l2/rules.ts:471`
- **Tái hiện:** `node --experimental-strip-types docs/review/phan-bien-da-vai-20260926/bang-chung/probe.mjs`, dòng `F-08 missing mint`. Cùng giao dịch chuyển 1 token, cùng account buffers và mô phỏng; chỉ đổi lượt đọc mint từ buffer hợp lệ sang null. Mint đối chứng có freeze authority; không gửi giao dịch.
- **Hiện tại:** Đủ mint: warning, FREEZE_AUTHORITY_CON_HIEU_LUC, số dư 500,0→499,0. Thiếu mint: safe, không mã lý do, coverage 1/1, số dư 500.000.000→499.000.000, soLieu.decimals=0. Đây là hai biểu hiện của cùng nguyên nhân: dữ liệu nền bắt buộc bị xử lý như metadata tên token tuỳ chọn.
- **Mong đợi:** Thiếu mint liên quan phải được công khai là thiếu dữ liệu phân tích, không suy “không có quyền đóng băng/extension”. Không biến đơn vị thô thành số lượng token bằng cách đoán decimals. Quyết định fail-safe #4 áp dụng; ký hiệu token và tuổi ví vẫn là dữ liệu làm giàu tuỳ chọn.
- **Hướng sửa:** Theo dõi mint liên quan chưa đọc/parse được trong Facts, L2 trả warning do thiếu dữ kiện. Giữ coverage instruction đúng nghĩa, thêm thông báo thiếu dữ liệu thay vì giả vờ không decode được lệnh. Bảng/L3 không format số token khi chưa biết decimals: hiện đơn vị cơ sở có nhãn rõ hoặc bỏ giá trị quy đổi; không xuất soLieu.decimals=0 giả. Có thể retry đọc mint một lần trong ngân sách hiện có, nhưng hết hạn vẫn phải suy giảm đúng.
- **Test hồi quy:** Test F-08 hiện ĐỎ. Bổ sung mint trả null, throw, buffer sai và thiếu Token-2022 extension; mint decimals=0 THẬT phải vẫn hợp lệ; chỉ mất symbol/PDA hoặc tuổi ví không tự làm warning. Đối chiếu hiển thị và dữ liệu có cấu trúc.
- **Nghiệm thu:** `node --experimental-strip-types --test --test-reporter=tap docs/review/phan-bien-da-vai-20260926/bang-chung/regression.test.mjs`: F-08 xanh. Thêm test tích hợp L1→L2 và diff vào suite core; ca đủ mint vẫn giữ cảnh báo thuộc tính hiện có, ca thiếu mint không safe và không giả decimals.
- **Không được làm:** Chạm L1/L2/diff/L3, A+C. Không coi freeze/PD/hook là độc hại chỉ vì tồn tại; không áp fail-safe cho mọi lỗi metadata tên token; không phá InspectResult.
- **Phụ thuộc:** Không có finding bắt buộc phải sửa trước.

### F-07 · Mảng accounts bị cắt được đọc thành tài khoản về 0 — LỖI · P1

- **Vai phát hiện:** 1 — auditor
- **Vị trí:** `packages/core/src/l1/fetch.ts:270` · `packages/core/src/l1/fetch.ts:322`
- **Tái hiện:** `node --experimental-strip-types docs/review/phan-bien-da-vai-20260926/bang-chung/probe.mjs`, dòng `F-07 truncated simulation accounts`: trước ví có 1 SOL, tx chuyển 1 lamport, RPC stub trả err:null và accounts:[] dù đã yêu cầu account.
- **Hiện tại:** Diff tuyên bố 1,0→0,0 SOL, reason SOL_ROI_VI, coverage 1/1. Array.isArray đủ để coDuLieuAccount=true; ô KHÔNG CÓ được đổi thành null rồi coi là trạng thái tài khoản không còn. Đã phân biệt accounts:null, nhưng chưa phân biệt mảng thiếu phần tử với phần tử null hợp lệ.
- **Mong đợi:** Dữ liệu thiếu phải thành “chưa đo”, không thành mất tiền. Đây không phải khẳng định RPC công cộng hiện trả phản hồi lỗi này: lỗi xử lý phản hồi đã tái hiện bằng transport stub tại ranh giới tin cậy.
- **Hướng sửa:** Kiểm độ dài và sự hiện diện từng index trước khi đưa vào afterByIndex. Đánh dấu các địa chỉ thiếu ở accountKhongDoDuoc; chỉ null HIỆN DIỆN ở đúng vị trí mới có nghĩa account không tồn tại. Có thể từ chối toàn bộ phản hồi sai hình dạng; xử lý từng vị trí giữ được nhiều dữ kiện hơn nhưng cần test kỹ.
- **Test hồi quy:** Test F-07 hiện ĐỎ. Thêm [], mảng ngắn, sparse array và account data malformed. Đối chứng mảng đủ độ dài có một null do CloseAccount phải giữ hành vi hợp lệ, không biến thành số liệu thiếu toàn bộ.
- **Nghiệm thu:** `node --experimental-strip-types --test --test-reporter=tap docs/review/phan-bien-da-vai-20260926/bang-chung/regression.test.mjs`: F-07 xanh, có TRANG_THAI_DO_KHUYET và không dựng dòng SOL 1→0 từ ô không tồn tại; `node --test packages/core/test/failsafe.test.ts packages/core/test/dong-tai-khoan.test.ts` qua.
- **Không được làm:** Chạm L1, A. Không gộp “missing” với “đã đóng”; không nâng thiếu dữ liệu thành cáo buộc drainer; không nới fail-safe.
- **Phụ thuộc:** Không có finding bắt buộc phải sửa trước.

### F-04 · Lời AI vẫn tự kết luận nguy hiểm và khuyên ký — LỖI · P0

- **Vai phát hiện:** 6 — AI/LLM
- **Vị trí:** `packages/ai/src/moHinh.ts:93` · `packages/ai/src/moHinh.ts:234` · `packages/ai/src/moHinh.ts:429`
- **Tái hiện:** `node --experimental-strip-types docs/review/phan-bien-da-vai-20260926/bang-chung/probe.mjs`, ba dòng `F-04`. Callback GoiMoHinh giả lập trả JSON đúng schema trên Facts cấp quyền hợp lệ. Đây là phép thử validator, KHÔNG phải đo mô hình thật hay chứng minh token metadata đã prompt-inject thành công.
- **Hiện tại:** Cả ba câu được nhận nguyên văn: “Giao dịch này nguy hiểm.”; “Bạn có thể ký mà không phải kiểm tra thêm.”; “Tài sản của bạn được bảo vệ tuyệt đối.” Bộ chặn chủ yếu bắt một danh sách cụm trấn an; những câu không có số/địa chỉ cũng qua các neo khác. Enum level không bị sửa, nhưng câu người dùng đọc vi phạm quyết định #1.
- **Mong đợi:** L3 chỉ mô tả hậu quả có căn cứ hoặc đề nghị kiểm tra thủ công; không tự xác nhận an toàn, không tự kết luận nguy hiểm, không bảo người dùng bỏ kiểm tra.
- **Hướng sửa:** Trước mắt thêm nhóm kiểm câu phán quyết/xúi ký và ca phủ định/phủ định kép; trả về câu tất định khi vi phạm. Hướng bền hơn: để mô hình chọn/diễn đạt các mệnh đề hậu quả đã định danh, UI dựng phần cảnh báo quan trọng từ dữ kiện. Không coi việc thêm ba regex là chứng minh đã loại mọi biến thể ngôn ngữ. Giữ một bộ đối kháng ngoài các mẫu dùng để sửa.
- **Test hồi quy:** Test F-04 hiện ĐỎ trên ba câu. Thêm paraphrase, Unicode/zero-width, phủ định, câu đặt số đúng vào quan hệ sai; đối chứng lời mô tả “tài khoản đổi chủ” có bằng chứng vẫn được nhận. Assert L2 nguyên vẹn và fallback còn đủ hậu quả.
- **Nghiệm thu:** `node --experimental-strip-types --test --test-reporter=tap docs/review/phan-bien-da-vai-20260926/bang-chung/regression.test.mjs`: F-04 xanh; `node --test packages/ai/test/moHinh.test.ts packages/ai/test/boiThoiHanC05.test.ts` qua. Báo riêng số câu bị chặn sai/cho lọt trên tập giữ lại; không tự đặt tỷ lệ chưa đo.
- **Không được làm:** Chạm L3, C. Không cho AI điều chỉnh level/reasonCodes; không bỏ cảnh báo tất định vì AI lỗi; không nhúng khoá API vào browser.
- **Phụ thuộc:** Không có finding bắt buộc phải sửa trước.

### F-02 · Interpreter nhận tham chiếu có thể sửa dữ kiện L2 trả về — LỖI · P1

- **Vai phát hiện:** 5 — senior maintainer
- **Vị trí:** `packages/core/src/inspect.ts:158` · `packages/core/src/inspect.ts:266` · `packages/core/src/inspect.ts:267`
- **Tái hiện:** `node --experimental-strip-types docs/review/phan-bien-da-vai-20260926/bang-chung/probe.mjs`, dòng `F-02`. Callback interpret thực hiện reasonCodes.splice(0) và sửa facts.coverage.analyzed=123 rồi trả về bình thường.
- **Hiện tại:** Kết quả vẫn warning nhưng reasonCodes thành [], coverage 123/1. Facts và mảng l2.reasonCodes được đưa cho callback bằng tham chiếu; locL3 chỉ lọc GIÁ TRỊ TRẢ VỀ. Không chứng minh LLM từ xa chạy được JavaScript này: điều kiện là adapter do consumer cung cấp có bug hoặc không đáng tin. Diff đã dựng trước nên không bị đổi trực tiếp trong probe.
- **Mong đợi:** Quyết định #1 và lời cam kết trong inspect.ts rằng L3 hỏng không làm mất reasonCodes phải đúng cả ở runtime. Plugin diễn giải không được làm hỏng dữ kiện trả về hoặc chỉ mục bằng chứng tạo sau await.
- **Hướng sửa:** Truyền bản sao sâu của Facts/options và bản sao reasonCodes vào interpreter, giữ snapshot gốc cho result/diagnostic. Có thể deep-freeze bản sao để bắt adapter sửa nhầm; ưu tiên cách không freeze object do consumer sở hữu. Readonly TypeScript bổ sung tài liệu nhưng không thay kiểm runtime. Kiểm cả callback giữ tham chiếu và sửa sau timeout.
- **Test hồi quy:** Test F-02 hiện ĐỎ. Thêm mutation trước resolve, trước throw, sau resolve, sau timeout; canh reasonCodes, coverage, diagnostic và input options không đổi. Ca interpreter đọc bình thường không được suy giảm.
- **Nghiệm thu:** `node --experimental-strip-types --test --test-reporter=tap docs/review/phan-bien-da-vai-20260926/bang-chung/regression.test.mjs`: F-02 xanh; `node --test packages/core/test/inspect.test.ts packages/core/test/chanDoanX01.test.ts` qua; kết quả warning phải còn MO_PHONG_HONG và coverage không vượt total.
- **Không được làm:** Chạm biên SDK/L3, A+C. Không chạy lại RPC để lấy “dữ kiện sạch”; không cho interpreter sửa level; không thay giao kèo công khai.
- **Phụ thuộc:** Không có finding bắt buộc phải sửa trước.

### F-03 · Ví dụ tích hợp cho ký dù có yêu cầu kiểm tra thủ công — LỖI · P1

- **Vai phát hiện:** 3 — kỹ sư tích hợp
- **Vị trí:** `vi-du-tich-hop/src/tich-hop.js:75` · `vi-du-tich-hop/src/tich-hop.js:83` · `packages/core/README.md:92` · `apps/demo-wallet/src/WalletExecution.tsx:118` · `apps/demo-wallet/src/live/session.ts:317`
- **Tái hiện:** `node --experimental-strip-types docs/review/phan-bien-da-vai-20260926/bang-chung/probe.mjs`, dòng `F-03`: inject InspectResult safe + coverage đầy đủ + aiAdvisory=review_required vào kiemTruocKhiKy.
- **Hiện tại:** Helper trả cho:"ky", lyDo:"khong_van_de". Ví dụ “đầy đủ” trong README cũng chỉ xét level/coverage, trái với đoạn ngắn ngay đầu README xét cả aiAdvisory. WalletExecution/execute cũng chỉ dùng level để phân biệt approve/override; UI vẫn hiện advisory nên không gọi đó là mất hiển thị, nhưng nhật ký và câu đồng ý không thể hiện người dùng đã bỏ qua advisory.
- **Mong đợi:** Advisory phải được consumer xử lý như yêu cầu người dùng xem lại; không cần đổi level sang warning. Việc tiếp tục ký phải là quyết định rõ ràng theo policy của consumer, không được gọi “không vấn đề” rồi cho đi thẳng.
- **Hướng sửa:** Thêm nhánh advisory sau các mức L2 mạnh hơn và trước trả cho:"ky"; chọn hoi với lý do có tài liệu. Đồng bộ snippet/test executable. Rà đường xác nhận của ví mẫu để advisory có bước xác nhận đọc hiểu và ghi nhật ký tương ứng, vẫn cho phép override có chủ ý.
- **Test hồi quy:** Test F-03 hiện ĐỎ. Ma trận safe+null, safe+advisory, warning, danger, coverage thiếu và inspect throw/timeout. Với lời khai lệch mà L2 safe, helper phải hoi; lời khai khớp không được xoá advisory đã có.
- **Nghiệm thu:** `node --experimental-strip-types --test --test-reporter=tap docs/review/phan-bien-da-vai-20260926/bang-chung/regression.test.mjs`: F-03 xanh, safe+advisory trả hoi; thêm test consumer thật trong suite thay vì chỉ tìm chuỗi README. Chạy lại các test ví dụ tích hợp tất định sau khi rà script bảo đảm chỉ ghi trong phạm vi được phép.
- **Không được làm:** Chạm consumer policy/README/ví mẫu, A+B+C. Không nâng level từ AI; không hạ danger thành hoi; không biến ngoại lệ RPC thành được ký.
- **Phụ thuộc:** Không có finding bắt buộc phải sửa trước.

### F-05 · URL guest vẫn thay ví mặc định đã khoá — LỖI · P1

- **Vai phát hiện:** 4 — người dùng Việt Nam
- **Vị trí:** `apps/demo-wallet/src/WalletExecution.tsx:23` · `apps/demo-wallet/src/WalletExecution.tsx:28` · `apps/demo-wallet/src/WalletExecution.tsx:35` · `apps/demo-wallet/src/WalletExecution.tsx:191` · `apps/demo-wallet/test/viDemoCoDinh.test.ts:62`
- **Tái hiện:** Dựng và chạy browser theo mục 4. Mở `http://127.0.0.1:5197/?guest=1&wallet=724Me67n3Rfc4G6FisqPFi1ukt5qEfcFQQ3t1vBWHw3G`. Xem guest-public-address.png và browser.json. Chỉ truyền địa chỉ CÔNG KHAI cũ; không sinh khoá, không upload, không ký. Code còn cho phép ?guest=1 không địa chỉ tự gọi Keypair.generate; nhánh này chỉ đọc code, không chạy browser.
- **Hiện tại:** UI đổi sang địa chỉ 724Me… và ghi “Ví khách riêng”. Landing ví cố định có link “Tự thử bằng ví khách riêng”. Guard viDemoCoDinh kiểm vi.ts nhưng không kiểm WalletExecution mới. Sáu test ví cố định vẫn qua trong suite 162 bài.
- **Mong đợi:** Mọi entry demo phải dùng AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ như quyết định #8 trong AGENTS.md:100. Không đẩy người vừa nạp faucet vào một ví khác.
- **Hướng sửa:** Bỏ khả năng URL/link thay public wallet trong đường UI sản phẩm; query cũ được bỏ qua hoặc thông báo đã về ví chuẩn. Test seam constructor có thể giữ cho unit test, nhưng UI không truyền override từ URL. Không xoá dữ liệu phiên cũ hoặc key file của người dùng.
- **Test hồi quy:** Browser regression: không query, guest=1, guest=1&wallet=địa_chỉ_khác, địa chỉ lỗi và reload đều hiện ví chuẩn; không có nút tạo/tải ví khách. Kiểm DOM địa chỉ đầy đủ thay vì chỉ nhãn rút gọn. Ca hiện tại query địa chỉ cũ sẽ ĐỎ.
- **Nghiệm thu:** Chạy lại build-review.mjs và browser-review.py. Artifact guest-public-address phải vẫn hiện ví AqX3…EBCLZ; không có Ví khách riêng/Tự thử bằng ví khách riêng. Test viDemoCoDinh vẫn qua. Không dùng khoá thật để test.
- **Không được làm:** Chạm ví mẫu, B. File UI/session là mã CHƯA COMMIT. Không tạo ví demo mới, không đổi faucet đích, không đụng .devnet hoặc .env.
- **Phụ thuộc:** Không có finding bắt buộc phải sửa trước.

### F-06 · So quyền đọc ở slot sau dễ bị hiểu thành hậu quả của giao dịch cũ — RỦI RO · P2

- **Vai phát hiện:** 4 — UX, phối hợp auditor
- **Vị trí:** `apps/demo-wallet/src/live/receipt.ts:35` · `apps/demo-wallet/src/live/receipt.ts:44` · `apps/demo-wallet/src/live/session.ts:370` · `apps/demo-wallet/src/live/Receipt.tsx:26`
- **Tái hiện:** `node --experimental-strip-types docs/review/phan-bien-da-vai-20260926/bang-chung/probe.mjs`, dòng `F-06`: giao dịch ở slot 100, quyền đọc lại slot 900 khác dự báo. compareReceipt trả authority:mismatch. Hàm đã tái hiện; chưa thực hiện hai giao dịch thật để chứng minh chuỗi sự kiện ngoài mạng.
- **Hiện tại:** So sánh chấp nhận mọi ownerSlot >= transaction slot. UI có ghi slot và footnote trạng thái có thể thay đổi tiếp — điểm giảm rủi ro đã có. Tuy nhiên cột “Đối chiếu”/“Có chênh lệch” dưới tiêu đề “Dự báo gặp thực tế” vẫn có thể bị đọc thành dự báo sai cho chính giao dịch cũ. Delegate bị sử dụng hoặc quyền bị đổi ở giao dịch sau là điều kiện cụ thể.
- **Mong đợi:** Tách đối chiếu metadata của đúng giao dịch với đối chiếu snapshot hiện tại. Snapshot sau chỉ chứng minh trạng thái lúc đọc, không chứng minh quyền ngay sau giao dịch; cùng slot cũng không đủ chứng minh không có giao dịch khác trong slot.
- **Hướng sửa:** Ít rủi ro: giữ số dư theo transaction metadata; các quyền hiện tại có nhãn “Trạng thái hiện tại tại slot …; chưa quy được cho riêng giao dịch này”. Không tính chúng vào pass/fail dự báo lịch sử. Phương án sâu hơn cần nguồn lịch sử có thể quy thuộc thay đổi cho đúng transaction, không chỉ minContextSlot.
- **Test hồi quy:** Nếu chọn hướng tách đối chiếu: test slot100 + read900 khác quyền phải có historical authority=unknown, vẫn hiện current snapshot; test khớp giá trị cũng không được biến thành bằng chứng lịch sử chắc chắn. Test kỳ vọng unknown sẽ ĐỎ ở mã hiện tại. Đây là thay đổi semantics nội bộ cần B thống nhất, không phải khẳng định RPC cung cấp lịch sử.
- **Nghiệm thu:** Thêm test vào apps/demo-wallet/test/liveDemo.test.ts rồi chạy `node --test apps/demo-wallet/test/liveDemo.test.ts`; fixture có một thay đổi quyền xen giữa không bị ghi là Custos dự báo sai; số dư theo metadata vẫn đối chiếu được.
- **Không được làm:** Chạm receipt/UI, B; mã CHƯA COMMIT. Không thay owner hiện tại bằng owner dự báo; không giả lịch sử; không yêu cầu gửi giao dịch trong vòng kiểm read-only này.
- **Phụ thuộc:** Không có finding bắt buộc phải sửa trước.

## 3. Kỹ thuật né của vai 2

Chỉ lập luận trên mã, fixture công khai và RPC stub. Không tạo drainer dùng ngoài đời, không gửi transaction. “Bắt được” có điều kiện dữ kiện L1 đủ; không phải bảo đảm toàn mạng.

| Kỹ thuật | Custos bắt được? | Luật/cơ chế | Nếu không, finding hoặc giới hạn |
|---|---|---|---|
| Xin cấp ít trước, sau đó tăng allowance của cùng delegate lên MAX | **Không** ở ca đã dựng toàn tuyến | R03 bỏ qua địa chỉ không đổi; L3/diff cũng bỏ | **F-01** |
| dApp khai `transfer` đúng dù ghép thêm SetAuthority | Có khi owner người được bảo vệ đổi | R01; lời khai khớp không hạ level | Test bất đối xứng qua và mutation đảo điều kiện bị bắt |
| Giấu SetAuthority trong CPI hoặc qua ALT giải được | Hậu quả owner vẫn bắt được nếu account được đo | R01 dựa trên state, không phụ thuộc vị trí lệnh | CPI nhiều tầng thực trên Devnet chưa kiểm lượt này; ALT không giải được có R10 |
| Dùng chương trình chưa biết ghi vào tài sản người ký | Cảnh báo coverage/unknown program | R09 + fail-safe 2 | Không tuyên bố đã hiểu semantics của program |
| Trả về ít token rác để che SOL outflow | Có thể né R13; nhiều-token outflow cũng có ngoại lệ nhận lại | R11/R13 kiểm phần nhận lại, không có giá trị kinh tế | **Giới hạn đã được tài liệu thừa nhận**, không báo lại như lỗi mới. Cần hiển thị dòng tiền, không hứa định giá được |
| Đặt symbol/memo kiểu câu ra lệnh | Symbol có lọc hình dạng, memo thô không nằm trong whitelist prompt | kyHieuAnToan + duLieuChoMoHinh | Lọc hình dạng không chứng minh an toàn ngữ nghĩa; `SAFE` vẫn có thể là tên. **F-04** chứng minh bộ lọc output còn lỗ, không chứng minh injection đầu vào đã thành công |
| Lợi dụng RPC/proxy trả mảng account thiếu vị trí | Chưa xử lý đúng; báo sai mất SOL | afterByIndex biến missing thành null | **F-07**; dApp thường không điều khiển RPC của ví tin cậy, cần điều kiện proxy/transport lỗi |
| Mint không đọc được, trong khi token account mô phỏng được | Có thể làm cảnh báo thuộc tính biến mất | mints rỗng nên R04/R05/R06/R07 không có đầu vào | **F-08**; điều kiện RPC thiếu/lỗi, không mặc định dApp kiểm soát RPC |
| Nhờ một bên khác trả phí để SDK bảo vệ nhầm người | Ví truyền nguoiDung đúng tránh được; bỏ địa chỉ khi nhiều người ký có cờ | R14 và lựa chọn signer trong L1 | Không báo lại lỗi cũ đã sửa; giữ test sponsored payer |

Rà 14 luật: R01/R02/R12 xét thay quyền; R03 có F-01; R04/R05/R06/R07 phụ thuộc mint nên chịu F-08; R08 bỏ enrichment lỗi theo quyết định; R09/R10 giữ unknown-program/ALT; R11/R13 có giới hạn phần nhận lại đã công bố; R14 cảnh báo người dùng không rõ. **Không khẳng định đã dựng biến thể adversarial mới cho đủ cả 14 luật.** `l2.test.ts` được chạy và mutation R01 bị bắt. Các ca program đã decode chỉ có tên không đồng nghĩa đã xác minh semantics.

## 4. Mỗi vai đã làm gì

### 4.1 Auditor và red team

Đọc các quyết định sản phẩm trong AGENTS, CUSTOS, DAC-TA-CORE, DAC-TA-L3; THREAT-MODEL; README SDK; bảng finding đã đóng ngày 25/09. Đọc `l1/fetch.ts`, parse/decode qua test, `l2/rules.ts`, `evaluate.ts`, `diff.ts`, `inspect.ts`, `neo.ts`, nhánh receipt/session mới. Không báo lại F-01/F-11/F-13/F-15 của báo cáo cũ: ID ở tài liệu này là namespace **riêng**.

Các phần mới cần bổ sung threat model sau sửa: mint là dữ liệu phân tích bắt buộc chứ không chỉ enrichment; callback interpreter có alias tới dữ kiện; mảng RPC thiếu vị trí khác null account; hạn mức thay đổi khi delegate giữ nguyên. TOCTOU vẫn là giới hạn: neo message chứng minh cùng byte/người/cluster, không khoá trạng thái chuỗi. Ví mẫu có refresh state và neo hết hạn nhưng không có bảo đảm mọi account trên chuỗi bất biến giữa mô phỏng và thực thi.

### 4.2 Kỹ sư tích hợp

Chạy helper `kiemTruocKhiKy` bằng dependency injection: F-03. Đọc README, script `thu-goi-nguoi-ngoai.mjs`, `dong-goi-sdk.mjs`, manifest core/ai, NGAN-SACH-RPC, HIEU-NANG và PHU-THUOC. **Chưa chạy cài SDK ngoài monorepo**: script tạo thư mục ngoài repo, cài gói, build `packages/*/dist` và dàn ở `node_modules/.dan-sdk`; trái ranh giới chỉ ghi thư mục báo cáo và không cài gói mới. Không thay phép thử này bằng import workspace rồi gọi là clean install.

Đã thử `npm audit --json --ignore-scripts --cache docs/review/phan-bien-da-vai-20260926/bang-chung/npm-cache`: **BLOCKED — mạng**, endpoint registry thất bại; xem audit.json/audit-error.log. Không kết luận số advisory hiện tại. Theo tài liệu lịch sử và manifest: đường spl-token/buffer-layout-utils thuộc runtime; pptxgenjs/image-size thuộc tooling. Tình trạng advisory mới nhất và kích thước tarball **CHƯA KIỂM**.

RPC không có một số lượt cố định cho mọi transaction: số ALT, lô account, mint thiếu, metadata và tuổi ví làm thay đổi số gọi. Số 7 lượt median và p95 6005 ms trong HIEU-NANG là phép đo **25/09**, không đo lại ở đây. SDK inspect không có deadline tổng nội tại; consumer phải bọc. L3 boiThoiHan có fallback và dọn timer đã kiểm. live/rpc.ts có timeout 15 giây mỗi request và tối đa bốn lần thử cho read gặp 429, không retry signing. **Không báo nhầm rằng transport mới không có timeout.** Timeout mỗi request không phải ngân sách toàn lượt; SDK không huỷ mọi RPC còn chạy khi UI ngừng chờ.

Điều kiện trước khi cân nhắc tích hợp rộng: đóng P0/P1, chạy clean-install thật trong sandbox được phép, test consumer policy/neo/thời hạn, đánh giá dependency hiện tại và công bố phạm vi decoder. Không đề xuất đổi phạm vi Devnet đã chốt.

### 4.3 Người dùng Việt Nam và bề mặt trình duyệt

Dùng skill webapp-testing. Dựng từ source hiện tại bằng `build-review.mjs`: `configFile:false`, `envFile:false`, output trong báo cáo; không load config có khoá và không đọc .env. Chromium headless; desktop 1440×812 và mobile 375×812; profile tạm trong thư mục báo cáo. Mở ví mặc định, query guest với địa chỉ công khai cũ, Phòng phân tích mock danger/safe/warning; chỉ bấm nút chọn tình huống đã nhìn thấy, không bấm ký/mở khoá/faucet. Browser chặn mọi request ghi và chỉ cho danh sách read/simulate Devnet.

Lệnh tái hiện (server chạy ở một terminal riêng):

```powershell
node docs/review/phan-bien-da-vai-20260926/bang-chung/build-review.mjs
python -m http.server 5197 --bind 127.0.0.1 --directory docs/review/phan-bien-da-vai-20260926/bang-chung/site
# Terminal khác:
python docs/review/phan-bien-da-vai-20260926/bang-chung/browser-review.py
```

Artifact: [browser.json](bang-chung/browser.json), [ví mobile](bang-chung/wallet-mobile.png), [ví desktop](bang-chung/wallet-desktop.png), [query đổi ví](bang-chung/guest-public-address.png), [mock đỏ](bang-chung/analysis-danger.png), [mock xanh](bang-chung/analysis-safe.png), [mock vàng](bang-chung/analysis-warning.png). Mock chỉ dùng kiểm hiển thị ba trạng thái, **không** chứng minh kết quả engine của thẻ vừa bấm. Không dùng số 500→0 của mock làm số liệu live.

Không có horizontal overflow và không có pageerror trên sáu lượt mở. Axe thấy banner mock ngoài landmark (`region`). Một lượt desktop báo contrast thấp trên chữ số dư trong lúc animation; lượt trước không báo. **Chưa xác nhận lỗi contrast ổn định**; cần chạy sau animation và reduced-motion, không dùng phép đo này làm finding chắc chắn. Không chạy NVDA/VoiceOver; axe và DOM semantics chỉ là kiểm hỗ trợ cơ bản, không tương đương test screen reader thật.

Đọc đủ mô tả 9 kịch bản thực thi trong `live/scenarios.ts`. Bảng dưới là câu người dùng cần trả lời, đối chiếu code dựng instruction; **không phải khảo sát 5 giây đã thực hiện**. Không mở khoá/tạo phiên nên chưa mở mọi màn xác nhận live của chín kịch bản.

| Thẻ | Nếu ký thì chuyện gì xảy ra? | Nhận xét UX |
|---|---|---|
| Gửi DEMO | Chuyển lượng chọn tới token account cùng mint | Cần hiện lượng và người nhận ở xác nhận; mô tả hiện tại rõ |
| Nhận quà tặng | Chuyển nửa số dư, đồng thời mất quyền kiểm soát tài khoản | Lời mời là dApp khai, cảnh báo phải nói hậu quả; không lấy chữ “nhận” làm hành động thật |
| Trao quyền kiểm soát | Token chưa giảm ngay; tôi không còn điều khiển tài khoản | Mô tả hiện tại phân biệt tiền/quyền đúng |
| Cấp quyền sử dụng token | Ứng dụng được rút tới hạn mức; chưa chuyển ngay | Phải thấy cả hạn mức cũ/mới khi cấp lại: F-01 |
| Ứng dụng sử dụng quyền | Ứng dụng chuyển bằng quyền tôi đã cấp, không cần tôi ký bước này | Giữ nhãn người ký ứng dụng, không làm như ví tôi ký |
| Thu hồi quyền | Chặn lần dùng quyền tiếp theo, không lấy lại token đã đi | Câu hiện tại nêu đúng giới hạn |
| Gửi kèm chuyển thêm | Lượng chọn cộng một khoản 1 DEMO tới ứng dụng | Không gọi khoản 1 DEMO là phí mạng |
| Trao quyền đóng tài khoản | Ứng dụng có thể đóng khi DEMO rỗng | Chưa được nói mất toàn bộ token ngay |
| Ứng dụng đóng tài khoản rỗng | Tài khoản bị đóng; ứng dụng nhận SOL thuê account | Phân biệt rent và phí mạng, không chỉ nhìn token 0 |

“Bình thường” là không có dấu hiệu trong phạm vi đã kiểm; “Cần xem kỹ” có thể do hành vi hoặc dữ liệu thiếu; “Nguy hiểm” là luật L2 xác định; coverage chỉ nói mức đọc được; “Custos đề nghị kiểm tra thủ công” là tín hiệu riêng. UI mock có lời giới hạn bên cạnh nhãn xanh. F-03 chỉ ra policy tích hợp chưa phản ánh đầy đủ tín hiệu riêng đó. Ý kiến UX: đổi nhãn kỹ thuật “Không có delegate” ở receipt thành “Không có ví/ứng dụng được cấp quyền rút”; giữ thuật ngữ trong phần kỹ thuật. Đây là gợi ý chữ, không phải lỗi đã đo với người dùng.

### 4.4 Senior maintainer

`tsc --noEmit -p tsconfig.json`: **PASS**, [typecheck.log](bang-chung/typecheck.log). Chạy chọn lọc **162/162** test hiện có: [tests.log](bang-chung/tests.log). Không chạy toàn suite để tránh test/tool khác ghi ra ngoài phạm vi; không tái khẳng định số “1000+” là đã kiểm lượt này.

```powershell
node --experimental-strip-types --test --test-reporter=tap packages/core/test/l1.test.ts packages/core/test/l2.test.ts packages/core/test/inspect.test.ts packages/core/test/failsafe.test.ts packages/core/test/neo.test.ts packages/ai/test/moHinh.test.ts packages/ai/test/boiThoiHanC05.test.ts apps/demo-wallet/test/viDemoCoDinh.test.ts apps/demo-wallet/test/liveDemo.test.ts apps/demo-wallet/test/liveScenarios.test.ts apps/demo-wallet/test/liveSourceStore.test.ts
```

**4 phép đột biến** chỉ trên bản sao `bang-chung/mutation-copy/`, trả về nguyên trạng sau mỗi phép thử. Các import bare package dùng dependency workspace hiện có; đây là test mutation nguồn, không phải test tarball cô lập. Ban đầu bản sao inspect thiếu helper fixture nên baseline đỏ vì import; đã bổ sung đúng hai helper vào bản sao rồi chạy lại, không đếm lần lỗi harness đó là bắt được mutation.

| Phép đột biến | Baseline | Sau mutation | Hành vi test bắt được |
|---|---|---|---|
| Vô hiệu phát hiện owner đổi của R01 | Xanh | Đỏ, 3 bài | Không còn danger và mất hit |
| Tắt fail-safe simulationOk | Xanh | Đỏ, 1 bài | Mất mã mô phỏng hỏng |
| Đảo điều kiện expectedAction khớp/lệch | Xanh | Đỏ, 5 bài | Khớp bị tố lệch, lệch không được nâng nghi ngờ |
| Bỏ bộ lọc câu cấm AI | Xanh | Đỏ, 3 bài | Câu trấn an thuộc corpus cũ lọt |

Xem [mutations.json](bang-chung/mutations.json) và log baseline/changed. Chạy lại: `python docs/review/phan-bien-da-vai-20260926/bang-chung/mutations.py`.

**6 test hồi quy mới đều đỏ**: F-01, F-02, F-03, F-04, F-07, F-08. [regression-red.log](bang-chung/regression-red.log). Chạy `node --experimental-strip-types --test --test-reporter=tap docs/review/phan-bien-da-vai-20260926/bang-chung/regression.test.mjs`. File là bằng chứng ở report; Claude nên đưa test tương ứng vào suite của owner khi sửa, giữ bản gốc báo cáo làm baseline.

Nhận xét kiến trúc: L2 vẫn là nơi sinh enum level; mutation thử return.level cũ được guard. F-02 cho thấy quyền sửa dữ liệu qua tham chiếu là một biên khác chưa được bảo vệ. `session.ts` gộp setup, consent, signing, persistence, RPC recovery và reconciliation; chỉ nên tách dần sau khi thêm test hành vi, không refactor hàng loạt trước các lỗi độ đúng. BigInt của parseDemoAmount tránh float và có kiểm u64; các test liveScenarios đã chạy. Test dạng tìm chuỗi tài liệu/source hữu ích để giữ quy ước nhưng không thay được runtime: F-05 là ví dụ cụ thể.

### 4.5 AI/LLM

Đọc `moHinh.ts`, `nhanDien.ts`, `index.ts`, wrapper `live/interpreter.ts`; chạy moHinh/boiThoiHanC05/liveSourceStore. Validator dùng whitelist dữ kiện, không gửi memo/raw transaction; địa chỉ/số/chiều có neo nhưng ngôn ngữ tự do còn F-04. Neo from/to bằng tìm substring không phải kiểm quan hệ ngữ nghĩa đầy đủ; chưa dựng biến thể mới nên không khẳng định đã khai thác.

Bỏ mô hình vẫn còn nhanDien + câu tất định; phần mất là cách viết lại tự nhiên và khả năng advisory bổ sung, không phải engine luật. Chưa đo thêm token, tiền hoặc độ trễ mô hình thật vì không dùng khoá và không gọi provider trong review. Đề xuất đánh giá tiếp: hai bản lời giải thích trên cùng Facts, người đọc trả lời riêng tiền thay đổi, quyền thay đổi, ai ký, phần chưa biết; ghi độ đúng và hiểu sai nghiêm trọng, dùng tập paraphrase giữ lại. Chưa có kết quả người dùng, không tự điền điểm “AI tốt hơn”.

## 5. Thách thức quyết định đã khoá

**Không có đề xuất đảo ngược quyết định nào.** F-04 thực thi đúng ranh giới AI đã khoá; F-05 thực thi ví cố định #8; F-08 làm rõ ranh giới dữ liệu phân tích bắt buộc với làm giàu tuỳ chọn. Không thêm smart contract, không đề xuất mainnet, không tạo ví demo mới.

## 6. Chưa kiểm được và giới hạn bằng chứng

- **CHƯA KIỂM — clean install ngoài monorepo và kích thước tarball:** mâu thuẫn với ranh giới chỉ ghi trong report; script còn install và build ngoài report. Cần một lượt kiểm riêng được phép dùng sandbox ngoài repo. Không phải kết luận gói SDK hỏng.
- **BLOCKED — mạng:** npm audit endpoint không truy cập được; không có con số advisory cập nhật.
- **CHƯA KIỂM — provider AI thật:** dùng callback trả JSON để kiểm validator; không xác nhận mô hình nào sẽ sinh ba câu đã thử trong thực tế.
- **CHƯA KIỂM — chín kịch bản live đến màn xác nhận/kết quả:** không mở khoá, không tạo phiên, không ký. Màn mock chỉ chứng minh UI; buffer test chỉ chứng minh xử lý mã.
- **CHƯA KIỂM — hai giao dịch xen kẽ thật cho F-06, CPI nhiều tầng và các extension phức tạp trên Devnet:** chỉ kiểm mã/fixture trong lượt này.
- **CHƯA KIỂM — NVDA/VoiceOver, Firefox/WebKit, điện thoại vật lý, contrast sau mọi animation.** Không gọi axe là chứng nhận accessibility.
- **CHƯA KIỂM — toàn bộ 1000+ test và E2E gửi thật.** Chỉ xác nhận 162 test đã nêu, 6 regression mới đỏ và 4 mutation.

Claude bắt đầu bằng F-01/F-08 và ca đối chứng; cập nhật trạng thái theo ID của báo cáo này. Không tự gửi giao dịch để “xác minh” khi chỉ được giao sửa mã; các kiểm tra hiện tại đều tái chạy offline. Sau sửa, ghi riêng bằng chứng mới, không ghi đè log đỏ gốc rồi coi như lỗi chưa từng tồn tại.
