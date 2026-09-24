# Custos — rà soát sau giải Nhất cấp trường, trước vòng toàn quốc

**Ngày rà soát:** 25/09/2026 · **Mã nguồn:** `0c1b96d` cộng với thay đổi chưa commit của nhóm. Đây là ảnh chụp tại thời điểm kiểm tra, không phải nghiệm thu bản phát hành cuối. Không có commit/push nào được thực hiện trong lượt này.

## Kết luận để ra quyết định

Custos có lõi kỹ thuật đáng trình bày: SDK đóng gói được, 14 luật L2, giao dịch Devnet có mô phỏng trước ký, phân biệt rõ kết luận của luật với diễn giải AI. `npm run check` đạt **1004/1004** trên môi trường có mạng; hai bản build frontend, gói SDK và tích hợp tất định đều chạy được. Tuy nhiên **chưa nên dùng luồng “trang tấn công → ví” làm demo trực tiếp trước khi sửa**: giao dịch do trang tấn công dựng chuyển 500.000.000 đơn vị khi tài khoản nguồn hiện có 490.000.000. Mô phỏng Devnet báo thiếu tiền; ví hiển thị “Chưa đọc hiểu hết” thay vì hậu quả chuyển tiền và đổi chủ. Đó là lỗi của **kịch bản demo**, không phải bằng chứng engine bỏ sót tấn công.

Mục tiêu hợp lý trước buổi mentor 1:1 ngày 28/09 là **luồng demo lặp lại được, có bằng chứng đúng và câu hỏi chiến lược rõ**. Sau đó mới quyết định nâng cấp chiều sâu kỹ thuật cho vòng loại/toàn quốc. Tránh thêm smart contract chỉ để lấp một ô rubric: Custos cố ý là lớp đọc/mô phỏng, không ký và không ghi chain.

## Phạm vi và bằng chứng đã chạy

| Kiểm tra | Kết quả | Ý nghĩa/giới hạn |
|---|---|---|
| `npm run check` | 1004 test đạt, typecheck đạt | Chạy ngoài sandbox để có mạng cho bốn ca CLI; lần trong sandbox làm bốn ca này lỗi `fetch failed`, không phải lỗi logic đã xác nhận. |
| Build `@custos-solana/demo-wallet` và `@custos-solana/trang-tan-cong` | Cả hai đạt | Xác nhận build được, chưa xác nhận mọi hành vi runtime. |
| `npm run thu-tich-hop:deterministic` | 14/14 | Tích hợp tất định, không thay thế Devnet live. |
| `npm run thu-goi` | Đạt; 10/10 bẫy đối kháng, 3 đối chứng, 6/6 bước CLI, 7/7 API boundary | Gói cài được từ ngoài monorepo. Không phải pilot bên thứ ba. |
| `npm run replay-rpc` | 19/29 có fixture; 0 hỏng; 10 chưa có fixture | Chênh lệch với Facts cũ là do schema/decoder và trạng thái account trôi; không diễn giải 19/29 thành tỷ lệ phát hiện. |
| Chromium + Playwright + axe, 375×812 và 1440×900 | 40/45 check đạt; 0 vi phạm axe trong phạm vi probe | [Bản đầy đủ](browser-full.json), [probe tập trung](probe-ui.json). Hai check là kỳ vọng số liệu cũ, hai check do 404 API tùy chọn, một check phơi ra lỗi bàn giao thật. Không đồng nghĩa “UI hoàn hảo”. |
| `npm audit --json` | 5 high, 0 critical | Liên quan `@solana/buffer-layout-utils`, `@solana/spl-token`, `bigint-buffer`, `image-size`, `pptxgenjs`. Cần phân luồng runtime/tooling và kiểm bản vá; **không chạy `npm audit fix` bừa** vì gợi ý thay đổi major/downgrade. |
| `npm run nop-bai-strict`; `npm run kiem-san-pham` | Chưa đạt trong lượt thử | Bị lẫn cây làm việc đang dirty, bằng chứng cũ, registry/GitHub không truy cập từ sandbox và lỗi khoá `.git/index.lock` khi script đồng bộ README. Không được gọi đây là 7 lỗi sản phẩm; chạy lại trên release candidate sạch, môi trường có mạng, rồi xử lý từng nguyên nhân. |

### Lỗi P0: bàn giao tấn công sang ví không tạo được bằng chứng mong muốn

- **Quan sát:** chạy kịch bản trực tiếp trong ví cho mức **Nguy hiểm**, số dư USDC-demo `490,0 → 240,0` và đổi chủ tài khoản. Cùng hiện trường, bấm từ trang tấn công sang ví cho “Chưa đọc hiểu hết”, coverage `0/3`, ba tài khoản không đọc được trạng thái sau. Chi tiết trong [probe-ui.json](probe-ui.json).
- **Gốc lỗi đã xác minh:** `apps/trang-tan-cong/src/App.tsx:155–163` lấy `BigInt(ht.soLuong)` = `500000000` từ `apps/demo-wallet/public/hien-truong.json`. Trạng thái Devnet thực của tài khoản nguồn là `490000000`. `Connection.simulateTransaction` trả `InstructionError [1, Custom 1]`, log `Error: insufficient funds`. Trong khi đó `apps/demo-wallet/src/kichBan.ts:316–340` đã sửa ca tương đương thành nửa lượng cấu hình. Không có ký/gửi giao dịch trong phép xác minh.
- **Sửa đề xuất:** giao một nguồn chung cho việc dựng giao dịch demo; đọc số dư nguồn Devnet hiện tại, chọn lượng chuyển dương không vượt số dư với biên dự phòng, và kiểm preflight. Nếu không đủ điều kiện, báo rõ “hiện trường Devnet không sẵn sàng”, không biến simulation failure thành bằng chứng tấn công. Tránh chép thêm hằng số `500` hoặc chỉ đổi assertion thành “bất kỳ cảnh báo nào”.
- **Nghiệm thu:** bấm từ trang tấn công tới ví trên mobile và desktop; kết quả `danger`, có reason code cáo buộc phù hợp, diff đổi chủ và số dư **khớp số tiền thật của giao dịch**; trạng thái không bị gửi on-chain; lặp lại sau reload/đổi tab; lỗi RPC/thiếu tiền có thông điệp riêng. Bắt buộc test hồi quy liên thông hai app.

### P1: nhánh phỏng vấn có cùng nguy cơ

`apps/demo-wallet/src/PhongVan.tsx:117–126` vẫn dùng `BigInt(ht.soLuong)` để dựng giao dịch. Đây là **suy luận từ mã, chưa tái hiện UI riêng**, nhưng cùng dữ liệu Devnet 490 triệu thì có nguy cơ lỗi thiếu tiền. Claude cần chạy màn hình này trước khi sửa và đưa nó dùng chung bộ chọn lượng chuyển/preflight với hai luồng trên. Phân biệt màn hình nghiên cứu người dùng với demo sân khấu.

### P1: kiểm tra AI tùy chọn gây 404 trong môi trường Vite

`apps/demo-wallet/src/goiAiQuaServer.ts:93–130` dò `/api/dien-giai`; Vite local không phục vụ serverless endpoint nên browser nhận 404. Verdict lõi vẫn được tạo và rơi về diễn giải tất định; đây **không phải mất chức năng chặn của L2**. Nhưng console bẩn, probe thất bại, và rất dễ demo nhầm “AI thật đang chạy” khi backend chưa được cấu hình. Cần quyết định rõ chế độ: endpoint có sẵn/không có, nhãn UI đúng với chế độ thực, khoá chỉ ở server; kiểm tra trên host sẽ dùng trình bày, không chỉ dev server.

### P1/P2: bằng chứng, dữ liệu, nội dung bị trôi

- `scripts/kiem-trinh-duyet/soi-trinh-duyet.py` còn đòi `500 → 0` trong hai check. Số dư thực hiện là `490 → 240` với ca demo hiện tại. Hãy khẳng định **quan hệ giao dịch–diff–verdict**, không cố định số sẽ trôi. `apps/demo-wallet/src/SoLieu.tsx:235` còn câu `500 → 0`; cần xác định đó là minh họa lịch sử hay mô tả ca Devnet hiện tại và sửa chữ nếu dễ gây hiểu nhầm.
- `data/tich-hop/ket-qua.json` ghi lượt live Devnet đạt từ 18/09 ở source commit khác HEAD; sau sửa P0 phải chạy lại và lưu bằng chứng mới. `npm run replay-rpc` còn 10 fixture chưa có; ưu tiên fixture của ca sẽ trình diễn trước, rồi mới mở rộng corpus.
- `npm audit` có 5 high. Phân loại đường nào đi vào bundle/runtime, đường nào chỉ dựng slide; lập kế hoạch vá từng dependency và chạy lại `npm run check`, build, package, demo. Không đưa số “0 lỗ hổng” vào deck.
- Repo cũ ghi **20 người dùng được hỏi, 13/20 nêu đúng hậu quả** trong `docs/NGHIEM-THU-VA-BAN-GIAO.md`; đây không phải 20 khách hàng mua hoặc pilot. Hồ sơ hiện còn **0 phỏng vấn người mua, 0 tích hợp bên thứ ba**. Chỉ công bố số liệu khi đối chiếu hồ sơ gốc và bối cảnh thử; không bịa market size, traction hay tỷ lệ false positive. Cohort 20 giao dịch: 0 bị **cáo buộc**, 7 **gắn cờ**, chưa đo được **báo nhầm** — xem `docs/BENCHMARK.md`.

### P0 về hồ sơ thi: track và lịch chưa đồng bộ

Theo [Learning Hub chính thức](https://unihackfest.vn/learn/), vòng loại toàn quốc **Best Product & Business 02/10/2026**, **Best Technical Build 03/10/2026**, chung kết toàn quốc **10/10/2026**. Nhóm báo có mentor 1:1 **28/09**; trang công khai cũng ghi 28/09 là hạn đội độc lập nộp bài, **không xác nhận thông tin mentor riêng của nhóm**. `docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md` vẫn ghi mốc cấp trường 19/09 và hai lịch chung kết cũ mâu thuẫn. `docs/adr/0001-doi-huong-technical-build.md` nói hướng phát triển Technical đã chốt nhưng **chưa có bằng chứng form BTC đổi track**. Chủ nhóm cần xác nhận bằng thông báo/biểu mẫu, rồi cập nhật nguồn lịch quyết định trong repo cùng test guard liên quan; không sửa tài liệu lịch sử thành như thể nó vốn biết ngày mới.

## Đánh giá theo góc nhìn giám khảo khó tính

**Ước lượng nội bộ cho track Technical: khoảng 6,5–7,5/10 ở trạng thái kiểm tra này**, **không phải điểm BGK hay dự báo giải**. Lõi thuật toán, ranh giới tin cậy và SDK là điểm mạnh. Điểm mất nhiều nhất nằm ở demo liên thông chưa ổn, bằng chứng Devnet cũ, và câu hỏi 25% kiến trúc/smart contract khi dự án cố ý không có contract. Nếu sửa P0, cho BGK thấy giao dịch, diff, reason code, giới hạn coverage và bài đo hiệu năng ngay trong 4 phút, khả năng bảo vệ điểm kỹ thuật sẽ tốt hơn. Nếu chỉ thêm animation hoặc nhiều loại tấn công mà luồng chính còn vỡ, rủi ro trình bày tăng.

## Thứ tự nâng cấp đề nghị

| Cổng | Việc phải xong | Điều kiện qua cổng |
|---|---|---|
| Trước mentor 28/09 | Sửa và test P0 bàn giao; kiểm màn phỏng vấn; chạy demo trên đúng host/thiết bị; gói 60–90 giây video dự phòng; một trang kiến trúc + 3 câu hỏi mentor quan trọng | Demo A/B và luồng tấn công→ví lặp lại được; số trong diff khớp giao dịch; có đường lui khi RPC lỗi. |
| Sau mentor, trước vòng loại Technical dự kiến 03/10 | Chốt track và format BTC; chạy lại live Devnet, browser, package, release gate trên cây sạch; sửa AI endpoint/nhãn; xử lý security có thể làm an toàn; cập nhật deck/video/README theo bằng chứng mới | Một release candidate có mã commit, lệnh chạy, artifact và video cùng phiên bản; không còn tuyên bố vượt bằng chứng. |
| Trước chung kết 10/10 nếu đi tiếp | Diễn tập end-to-end nhiều mạng/thiết bị; chuẩn bị booth/expo nếu BTC yêu cầu; tối ưu thời gian demo và phản biện; thêm một ca tấn công có giá trị **chỉ khi** có ca đối chứng và chạy thật | Người khác trong nhóm có thể trình bày, reset hiện trường, chạy demo và giải thích “vì sao Solana, vì sao AI, vì sao không contract” không cần người viết code. |

**Ưu tiên nâng cấp kỹ thuật sau khi ổn định:** bộ dựng transaction dùng chung và kiểm số dư thời gian chạy; ca demo chống RPC lỗi/rate limit với chế độ fallback được gắn nhãn; bằng chứng state-diff cho CPI/ALT/Token-2022, mỗi ca có đối chứng an toàn; bản chứng minh hiệu năng từ dữ liệu đo được; tài liệu tích hợp SDK tối giản. Không mở rộng luật/AI chỉ để tăng số lượng.

## Bộ câu hỏi mang vào mentor 1:1

1. Nhóm đã được BTC chuyển **form chấm** sang Best Technical Build chưa? Nếu chưa, thao tác và hạn cuối cụ thể là gì? Vòng 03/10 có áp dụng cho nhóm thắng vòng trường không?
2. Với SDK **không có smart contract** và không ghi chain, giám khảo chấm ô “on-chain/off-chain architecture and smart contract quality” như thế nào? Bằng chứng nào thuyết phục hơn một contract phụ không có nhu cầu sản phẩm?
3. Thời lượng, hình thức, video dự phòng, yêu cầu nộp/deck/booth chính thức của 03/10 và 10/10 là gì? Có yêu cầu demo AI gọi model thật trực tiếp không, hay một live eval có log cộng với fallback rõ ràng là đủ?
4. Với 0 pilot bên thứ ba và không có dữ liệu người mua, cách kể đúng trọng tâm Technical nào BGK muốn thấy? Đội nên chứng minh chiều sâu của state-diff/CPI/ALT/Token-2022 theo format nào?
5. Có phản hồi cụ thể nào từ giám khảo vòng trường về độ rõ problem, khác biệt với ví hiện có, và phần Q&A không? Xin ghi nguyên văn, không suy diễn.

Mang theo link repo công khai, bản build thật, giao dịch Devnet có thể kiểm, video dự phòng chạy offline, sơ đồ kiến trúc một trang và bảng “đã đo / chưa đo”. Không trình diễn video như thể đó là live, không công bố AI đang chạy nếu endpoint chưa hoạt động.

## Ranh giới của lượt rà soát

Lượt này chưa kiểm trực tiếp bản GitHub Pages production sau deploy, chưa chạy lại toàn bộ live Devnet release gate, chưa kiểm thử người dùng mới, chưa xem phản hồi giám khảo vòng trường và chưa chứng minh đã đổi track trong form BTC. Các lần chạy sandbox bị hạn chế mạng/quyền ghi Git đã được phân biệt khỏi lỗi mã. Mọi kết luận mới sau khi sửa phải gắn với commit, môi trường, ngày đo và artifact tương ứng.
