# Đánh giá Custos sau roadmap và đề xuất đổi track

Ngày 12/09/2026, bản mã `780cf6d5408c031a852ac1fec371bbc5c9dc3207`.

**Khuyến nghị: đổi sang Best Technical Build và tiếp tục phát triển từ nền hiện tại.** Người dùng cho biết BTC đã cho phép đổi track và nhóm hiện không thể bổ sung nghiên cứu thị trường/phỏng vấn. Đây là đầu vào của quyết định; chưa tự sửa thông tin đăng ký hay metadata dự án.

## 1. Vì sao nên đổi

[Thể lệ lưu trong repo](../cuoc-thi/Thể%20lệ%20UniHackfest%202026.md) phân bổ Product & Business: thị trường/người dùng 25%, giải pháp/demo 30%, kinh doanh/GTM 25%, trình bày 20%. Hai nhóm tiêu chí chiếm tổng cộng 50% hiện khó bổ sung bằng chứng với nguồn lực của đội.

Technical Build phân bổ chiều sâu kỹ thuật 30%, kiến trúc on-chain/off-chain và smart contract 25%, Solana/composability/hiệu năng 25%, demo/trình bày 20%. Custos đã có tài sản kỹ thuật phù hợp: SDK đóng gói dùng được, pipeline mô phỏng–facts–luật–diễn giải, xử lý CPI/ALT/Token-2022, phân biệt người dùng với người trả phí, báo phần chưa đo được và giới hạn quyền của AI.

Đổi track giúp công sức tiếp theo đi vào phần đội chủ động cải thiện được. Technical vẫn đòi hỏi bài toán rõ ràng và chứng minh vì sao thiết kế này có giá trị. Không cần biến buyer interview hay pilot bên ngoài thành điều kiện bắt đầu phát triển tiếp.

**Điểm cần làm rõ với BTC:** mục 25% sẽ chấm một SDK phân tích off-chain tương tác với chương trình Solana như thế nào khi đội không viết smart contract riêng? Thể lệ được đọc không đủ để khẳng định bắt buộc có contract riêng hoặc SDK chắc chắn được tối đa mục này. Nên hỏi đúng cách áp rubric, tận dụng việc BTC đã đồng ý đổi track. Không trì hoãn các việc sửa lỗi vì câu trả lời này.

Track và chủ đề là hai lựa chọn khác nhau. Chưa có căn cứ cho rằng BTC đã đồng ý đổi chủ đề AI × Web3; nếu giữ chủ đề này, mô tả trung thực vai trò tùy chọn và giới hạn của AI.

## 2. Kết quả kiểm tra mới

Bằng chứng chạy tại [thư mục audit](../../.thu-pages/audit-2026-09-12/). Thư mục này bị Git bỏ qua; cần lưu cùng báo cáo nếu mang sang máy khác.

| Kiểm tra | Kết quả lần này | Bằng chứng |
|---|---|---|
| Typecheck + test | 487/487 đạt, không bỏ qua | `check.log` |
| Luồng tích hợp tất định | 14/14 đạt | `deterministic.log` |
| Build ví và trang tấn công | Cả hai thành công | `build-wallet.log`, `build-attack.log` |
| Bộ trình duyệt hiện có | 40/40, 0 vi phạm axe trong phạm vi kiểm | `existing-suite/ket-qua.json` |
| Kết quả trong viewport và focus | Đạt ở 320/375/768 px; top 9/9/134 px | `mobile-utf8.log` |
| Payload sai và xác nhận hủy | 4/4 đạt | `cancel-utf8.log` |
| SDK tiêu thụ ngoài monorepo | JS chạy, TS typecheck; 10/10 bẫy và 3/3 đối chứng đạt | `package.log` |
| Demo công khai, 375 × 812 | Nguy hiểm; 500 → 0; đổi chủ; coverage 2/3; không lỗi JavaScript; thẻ ở top ≈9 px | `public.json`, `public-mobile.png` |
| npm audit | 11 advisory: 5 high, 6 moderate, 0 critical | `npm-audit.json` |

Giới hạn: Chromium headless và viewport giả lập, chưa kiểm thiết bị thật/Firefox/WebKit trong lượt này. Probe gửi dùng stub; không ký hoặc phát giao dịch thật. Lượt này không gọi lại API AI có tính phí, không chạy lại cohort mainnet, không chứng thực độc lập các cuộc phỏng vấn cũ. Các số AI/cohort dưới đây là đọc artifact của nhóm.

Hai script trình duyệt ban đầu lỗi mã hóa đầu ra Windows; chạy lại bằng `python -X utf8` thì đạt. Không tính lỗi công cụ đó là lỗi giao diện.

## 3. Lỗi và khoảng trống còn lại

### T01 — P1: báo thành công khi xác nhận chứa lỗi thực thi

Trong [gui.ts](../../apps/demo-wallet/src/gui.ts), dòng 70 bỏ qua giá trị trả về của `confirmTransaction`; dòng 73 chuyển thẳng sang `thanhCong` khi Promise resolve.

Tái hiện bằng hàm sản xuất với phản hồi `{context:{slot:1}, value:{err:{InstructionError:[0,{Custom:1}]}}}`: đầu ra vẫn là `thanhCong`. Xem `probe-confirm.ts` và `probe-confirm.log` trong thư mục audit. Đã đối chiếu nhánh WebSocket trong `node_modules/@solana/web3.js/src/connection.ts`: callback có thể resolve response chứa lỗi. [Tài liệu Solana signatureSubscribe](https://solana.com/docs/rpc/websocket/signaturesubscribe) xác nhận thông báo cuối chứa `err` có thể khác null.

Ảnh hưởng: UI hiển thị trạng thái thành công, xóa thẻ kiểm tra và giao dịch chờ khi thực thi thất bại. Bản công khai tắt ký nên chưa tái hiện tác động này qua giao dịch thật.

Hướng sửa: khai báo kiểu response đúng; kiểm `value.err`; tách thất bại thực thi đã xác nhận khỏi chưa gửi và chưa rõ kết quả. Giữ chữ ký và thông tin lỗi để tra cứu. Không chỉ `throw` vào catch hiện tại vì catch sẽ gộp thành `chuaRo` dù đã có lỗi thực thi xác nhận. Test phải có phản hồi thành công `err:null`, phản hồi lỗi, response sai cấu trúc, timeout và lỗi mạng.

### T02 — P1: mất phản hồi gửi bị khẳng định là chưa gửi

`gui.ts` chỉ lưu chữ ký sau khi `sendTransaction` trả về. Nếu RPC nhận request nhưng phản hồi bị mất, hàm rơi vào `thatBai`. [App.tsx](../../apps/demo-wallet/src/App.tsx) hiển thị “Giao dịch chưa được gửi đi, nên chưa có gì thay đổi trên chuỗi. Bạn có thể thử lại.”

Probe stub nhận request rồi ném lỗi mạng trả về đúng `thatBai`. Đây là tái hiện logic phân loại trong kịch bản mạng không chắc chắn, chưa phải sự cố quan sát trên Devnet. Không có phản hồi không đủ chứng minh chưa gửi.

Hướng sửa: lưu chữ ký từ giao dịch đã ký trước bước gửi; phân biệt lỗi trước gửi, từ chối rõ ràng và mất phản hồi sau khi bắt đầu gửi. Nhánh cuối dùng trạng thái chưa rõ, tra trạng thái theo chữ ký và khóa thao tác tạo giao dịch mới để gửi lại khi kết quả chưa rõ. [Solana sendTransaction](https://solana.com/docs/rpc/http/sendtransaction) mô tả chữ ký có sẵn trong giao dịch trước khi gửi, và chấp nhận request cũng chưa bảo đảm thực thi thành công.

### T03 — P2: chạy test làm thay đổi bằng chứng eval

[soChoPhep.test.ts](../../packages/core/test/soChoPhep.test.ts) import hàm từ `scripts/eval-ai.ts`; file đó có `await main()` ở cấp module và ghi `data/eval/ai-ket-qua.json`. Lần `npm run check` này làm đổi `doLuc` của artifact. Diff chỉ có timestamp; đã lưu `test-side-effect.diff` và hoàn nguyên đúng trường do lượt kiểm tạo ra, giữ nguyên dữ liệu live.

Hướng sửa: tách hàm thuần sang module riêng hoặc bảo vệ entrypoint CLI. Unit test import helper không được chạy eval/ghi artifact. Nghiệm thu bằng so hash file trước và sau `npm run check`; lệnh eval chủ động vẫn phải hoạt động.

### T04 — P2: một số kết luận tài liệu mạnh hơn bằng chứng

- `NGHIEM-THU-V01.md` khẳng định luồng cốt lõi không còn lỗi đã xác nhận; T01/T02 cho thấy cần cập nhật kết luận và mở lại phần gửi.
- `TIEN-DO.md` còn HEAD cũ và câu “không còn việc nào Claude làm một mình được”; câu này không còn phù hợp với các lỗi mới và hướng Technical.
- `BAN-GIAO.md` ghi 451 test; báo cáo nghiệm thu khác ghi 473/478. Số lịch sử có thể giữ nếu gắn rõ bản mã/ngày; phần “hiện trạng” phải dẫn tới snapshot mới nhất.
- Tài liệu AI nói 7 và 8 lượt ở các đoạn khác nhau. `liveGanNhat` hiện ghi 4/38 lượt vượt 4.000 ms, trong khi phần chi phí nói 1–2. Script gọi interpreter không bọc timeout rồi đếm thời gian vượt ngưỡng: đây là ước lượng nếu áp timeout, chưa phải số timeout quan sát trực tiếp trong pipeline sản xuất. Cần sửa phạm vi phát biểu.

### Các giới hạn chưa phải lỗi đã tái hiện

- 11 advisory còn tồn tại. Có phân tích phơi nhiễm trong `PHU-THUOC.md`; lần kiểm này không chứng minh khai thác được hoặc đã vá. Số high gồm cả chuỗi dependency, không đồng nghĩa 5 lỗ hổng sản phẩm độc lập.
- Benchmark chưa đo accuracy độc lập. Cohort mô phỏng được 9/20 ngày 25/08, còn 4/20 ngày 08/09 theo artifact; dữ liệu/trạng thái thay đổi khiến tái lập yếu. Không đồng nhất với tỷ lệ phát hiện.
- Cảnh báo mobile đã vào tầm nhìn, nhưng thẻ cao khoảng 1.018 px ở viewport 812 px; hành động hủy ở cuối. Có thể rút phần giải thích kỹ thuật mặc định hoặc đưa hành động lên vị trí dễ tiếp cận hơn. Đây là đề xuất UX, không phải kết luận vi phạm WCAG mới.
- Chưa có thư mục video nộp bài. Video dự phòng vẫn là phần hồ sơ cần hoàn tất ở cả hai track.

## 4. Chấm thử theo Technical Build

Đây là đánh giá độc lập dựa trên mã, demo và bằng chứng quan sát được, không thay điểm lịch sử trong tài liệu khác. Điểm trình bày tạm tính theo mức sẵn sàng; chưa xem đội thuyết trình trực tiếp.

| Tiêu chí | Trọng số | Điểm /10 | Lý do |
|---|---:|---:|---|
| Độ khó và chiều sâu | 30% | 7,8 | Phân tích hậu quả, quyền sở hữu, CPI/ALT và ranh giới AI có thực chất; cần chứng minh thêm ngoài corpus viết cùng luật |
| Kiến trúc on-chain/off-chain, contract | 25% | 7,0 | Pipeline rõ, mức tin cậy phân tầng; T01/T02 còn sai trạng thái, chưa rõ cách BTC áp phần contract cho SDK |
| Solana, composability, hiệu năng | 25% | 7,5 | Có xử lý đặc thù Solana và consumer ngoài repo; benchmark tái lập, độ trễ đuôi và phạm vi tương thích còn hạn chế |
| Demo và trình bày | 20% | 7,2 | UI và demo công khai đã chạy tốt hơn; thiếu video và câu chuyện kỹ thuật cần cơ cấu lại |
| **Tổng có trọng số** | **100%** | **7,405 ≈ 7,4** | **Đánh giá tạm thời** |

Custos có cơ sở cạnh tranh ở Technical, nhưng chưa đủ bằng chứng để gọi là ứng viên chắc giải. Không có thông tin chất lượng các đội cùng track hay cách giám khảo áp rubric để tính xác suất đạt giải. Chuyển track làm tăng độ phù hợp của hồ sơ; mức cạnh tranh thực tế chưa xác định.

## 5. Thứ tự phát triển tiếp, không gắn thời gian

| Ưu tiên | Việc cần làm | Điều kiện hoàn thành |
|---|---|---|
| 1 | Sửa T01/T02 và mở lại nghiệm thu luồng gửi | Phân biệt thành công, thất bại xác nhận, chưa gửi, chưa rõ; ca lỗi RPC/mất phản hồi không nói quá dữ kiện; kiểm qua UI bằng stub |
| 2 | Sửa T03/T04, chốt baseline Technical | Test không ghi artifact; số liệu dẫn đúng commit; backlog kinh doanh/phỏng vấn chuyển sang hoãn theo lựa chọn track, không đánh dấu đã thực hiện |
| 3 | Bộ benchmark kỹ thuật tái lập | Lưu fixture đầy đủ nguồn gốc/đầu vào/kỳ vọng; tách replay offline và Devnet live; có ca dương và đối chứng cho ALT, CPI, Token-2022, nhiều signer/fee payer, thiếu account và mô phỏng lỗi |
| 4 | Chứng minh phần engine thêm vào | So sánh trên cùng đầu vào: đọc lệnh cơ bản, chỉ nhìn chênh lệch số dư, pipeline Custos; chỉ rõ ca nào thêm phát hiện đổi quyền/thiếu dữ liệu và ca nào vẫn bất lực |
| 5 | Trình diễn khả năng giải thích kỹ thuật | Chọn cảnh báo → truy tới instruction/CPI, dữ kiện trước/sau, luật kích hoạt và phần chưa đo được; tận dụng chi tiết sẵn có trước khi tạo màn hình mới |
| 6 | Kiểm độ trễ, lỗi hạ tầng và tích hợp | Có số lượt đo, môi trường, cache, số RPC, phân bố/đuôi và lỗi; retry có giới hạn; consumer mới chạy được từ hướng dẫn, không phụ thuộc workspace |
| 7 | Chuẩn bị hồ sơ Technical | Deck kể bài toán → ca khó → kiến trúc → bằng chứng → giới hạn; video demo dự phòng; instructions tái lập; cập nhật track trong hồ sơ sau quyết định của đội |

Các việc 3–6 có thể làm bằng thử nghiệm kỹ thuật do nhóm tự kiểm soát. Ca test dựng theo đặc tả có giá trị để kiểm tính đúng của hành vi; cần ghi rõ synthetic và không quảng bá thành accuracy ngoài thị trường. Tập mới dành cho đánh giá nên xác định kỳ vọng trước khi xem verdict, ghi cả ca thất bại, tránh chỉnh luật chỉ để khớp con số đẹp.

Giữ AI ở vai trò tùy chọn. Artifact mới nhất: mô hình nhắc coverage 13/16 ca, câu mẫu 14/16; tài liệu nhiều lượt ghi dao động 13–14. Chỉ số này chưa chứng minh ưu thế AI hay tổng thể chất lượng diễn giải; không đủ để kết luận AI luôn kém. Dùng template làm baseline và chỉ đầu tư tiếp vào AI khi có mục tiêu đo được cụ thể.

Không bổ sung smart contract chỉ để có contract trong sơ đồ. Nếu mở nhánh on-chain, phải có trách nhiệm thực sự cần nằm trên chuỗi và giải thích được lợi ích so với kiến trúc hiện tại. Với dữ kiện đang có, sửa tính đúng và làm bằng chứng kỹ thuật mạnh hơn là ưu tiên cao hơn việc mở rộng kiến trúc.

Lượt review này bổ sung báo cáo và probe cục bộ; chưa sửa logic sản phẩm, chưa đổi track, chưa commit/push/publish.
