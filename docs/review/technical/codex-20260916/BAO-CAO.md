# Kết quả xử lý bàn giao Custos — 16/09/2026

Đã xử lý phần phát triển và hồ sơ cục bộ trong bàn giao Claude. Đây là **bản review**, chưa phải bản phát hành đã nghiệm thu toàn bộ. Trạng thái từng thẻ chỉ nằm ở [TIEN-DO.md](../../../roadmap/TIEN-DO.md).

## 1. Những lỗi tìm thấy và đã sửa

- **P1 — Neo được tạo quá muộn trong consumer mẫu.** `ky.js` tạo neo khi bấm ký nên kết quả cũ và transaction bị sửa tại chỗ vẫn có thể gọi signer. Đã tái hiện hai trường hợp, rồi yêu cầu consumer truyền neo giữ từ lượt kiểm; thiếu neo bị từ chối. `ky-red.log` và `ky-green.log` ghi trước/sau. README hướng dẫn kiểm một snapshot, giữ neo cùng kết quả trong state tin cậy của ví. Đây là sửa hợp đồng consumer mẫu, không thêm quyền cưỡng chế cho SDK.
- **P2 — Cổng Mainnet báo nhầm.** Phép grep coi khai báo kiểu `Cluster` và chú thích là runtime. Đã chuyển sang bóc kiểu TypeScript và bỏ chú thích trước khi dò chuỗi; bỏ `.d.ts`. Regression có cả đối chứng endpoint thật và `clusterApiUrl`. Xem `runtime-red.log`, `runtime-green.log`. Đây vẫn là kiểm tĩnh, không chứng minh phát hiện được mọi URL dựng động.
- **P2 — Pitch hứa trace quá rộng.** Thu hẹp: rule/reason có sẵn, `bangChung` có cấu trúc mới phủ 2/14 luật. Ca đổi owner phát luật 1 chưa có trace dữ kiện chi tiết. Đã sửa pitch, ghi chú diễn giả và slide kết.
- **P2 — Biên bản UI thiếu tổng lỗi chức năng.** Có thể `dat=false` với `viPham=[]` vì lỗi luồng thao tác, trong khi test coi mảng vi phạm axe là mọi lỗi. Script nay ghi `soHong` từ toàn bộ ca kiểm. Không sửa kết quả thất bại thành đạt. Runner portable cũng sửa địa chỉ kỳ vọng từ cổng dev sang URL `/#tx=` thực tế; log lượt lệch URL được giữ lại.

## 2. Bằng chứng và phạm vi

| Phép kiểm | Kết quả và giới hạn | Artifact |
|---|---|---|
| Typecheck + unit/integration | 719 pass, 0 fail; không suy thành accuracy | `check.log` |
| Hợp đồng ký mẫu | 13/13, signer stub, không ký thật | `ky-green.log` |
| Devnet B07 | 13/13 kiểm tra; 3 giao dịch chưa ký + 1 fault injection | `b07.json`, `b07-rpc.json`, `b07.log` |
| Consumer ngoài repo | Cài tarball thật và chạy ca Devnet; lần cuối trong artifact gốc | `tich-hop-live.log`, `../../../../data/tich-hop/ket-qua.json` |
| Bộ portable | 12/12: 4 trang mount, không console error hoặc asset lỗi | `portable-browser.log` |
| UI desktop/mobile | 40/40, không vi phạm axe; Chromium giả lập, không thiết bị thật | `../../../../data/a11y/ket-qua.json` |
| Phụ thuộc | 5 high, 0 moderate, 0 critical; còn rủi ro, không gọi đã vá | `audit.json`, `../../../PHU-THUOC.md` |
| Deck | 12 slide, native PowerPoint render; kiểm cấu trúc đạt | `pptx-validate.log` |
| Video | 79,8 giây, MP4 thao tác thật có caption; đã phát offline bằng Chromium | `../../../nop-bai/video/CUSTOS-DEMO.mp4`, `video-events.json` |

DNS hệ thống đã phân giải được Devnet trong phiên này; không đổi DNS Windows. Lượt tích hợp lỗi cũ được giữ ở `tich-hop-truoc.json`, không xóa bằng chứng hỏng.

B07 là suite live mới, **không** biến 19 fixture benchmark lịch sử thành 19 fixture đã capture live. Không có lệnh broadcast trong harness. Không chạy thêm LLM trả phí, phỏng vấn hoặc nghiên cứu thị trường giả.

ZIP đã giải nén ngoài repo, 4 trang mount không lỗi và video phát offline: `zip-independent.json`. Manifest của gói ghi hash từng file; đường dẫn máy cá nhân trong log đóng gói được thay bằng `<workspace>`/`<home>`, log gốc trong repo giữ nguyên.

Cổng cuối `kiem-san-pham`: **9 đạt, 1 hỏng (working tree chưa commit), 1 chưa rõ (live đo trên mã chưa commit)**. `nop-bai-strict` còn 4/13 ô: cây sạch, bằng chứng trên nguồn sạch, xác nhận BTC và tag. Video đã được gate nhận diện. Không bỏ các điều kiện này để làm xanh kết quả.

## 3. Chấm lại dưới vai giám khảo khó

Điểm tự đánh giá có điều kiện theo rubric lưu trong ADR-0001; không phải điểm BTC. Chưa quan sát đội thuyết trình thật.

| Tiêu chí | Trọng số | Điểm /10 | Lý do còn trừ |
|---|---:|---:|---|
| Chiều sâu kỹ thuật | 30% | 8,0 | Ranh giới facts/rules/consumer rõ; semantics và trace còn hẹp, chưa có đánh giá độc lập |
| Kiến trúc on/off-chain, contract | 25% | 7,0 | SDK có lý do đặt ở ví, nhưng BTC chưa xác nhận cách chấm phần contract cho dự án không có contract riêng |
| Solana, composability, hiệu năng | 25% | 8,0 | Có tarball consumer và live simulation; số đo nhỏ, phụ thuộc RPC, không có kiểm tải đại diện |
| Demo và trình bày | 20% | 8,0 | Deck Technical, video và gói local cụ thể; chưa kiểm thiết bị sân khấu và phần nói của đội |

**Tổng có trọng số: 7,75/10 (làm tròn 7,8).** So với snapshot 7,4, phần tăng đến từ live evidence, sửa hợp đồng ký và hồ sơ trình diễn cụ thể; không đến từ số thẻ DONE. Điểm có thể giảm đáng kể nếu BTC yêu cầu contract riêng ở mục 25%. Không đủ dữ liệu để ước lượng xác suất đạt giải.

Tiếp tục Technical là hướng hợp lý với phạm vi nhóm hiện có, nhưng cần chốt cách áp rubric. Không thêm contract chỉ để đủ tên hạng mục; chỉ phát triển khi có trách nhiệm on-chain cần thiết và phép kiểm cụ thể.

## 4. Bốn kết luận riêng

1. **Sản phẩm kỹ thuật:** đã sửa các lỗi xác định được và có test hồi quy. Năm advisory high vẫn theo quyết định chấp nhận có điều kiện, không bằng không rủi ro.
2. **Chất lượng bằng chứng:** có live suite và package test; chưa có nhãn độc lập, bên thứ ba tích hợp hoặc bằng chứng lợi ích AI vượt template. Mã sửa đang ở working tree, nên gate nguồn sạch vẫn chưa đạt.
3. **Hồ sơ cục bộ:** có pitch Technical, deck, video và gói review. Demo tương tác cần mạng; khi mất mạng phát video hoặc xem deck. Chưa gọi gói này là release candidate đã nghiệm thu toàn diện.
4. **Phát hành/nộp:** chưa commit, push, tag, publish, deploy hoặc nộp. TB-H01/H02 còn mở: đăng ký track, cách áp mục contract, thời lượng/lịch chính thức và remote CI trên revision ứng viên.

## 5. Cách mở và tiếp tục

- Giải nén `docs/nop-bai/CUSTOS-REVIEW.zip` ra thư mục ngoài repo; vào `demo`, chạy `node phuc-vu.mjs 8099`; mở `http://localhost:8099/`. Không cần npm install, vẫn cần Node và mạng cho simulation.
- Xem `CUSTOS-PITCH.pptx`, `video/CUSTOS-DEMO.mp4` và `DOC-TRUOC.md` trong gói. `MANIFEST.json` ghi SHA-256 từng file và dấu vết mã/UI.
- Sau khi chủ dự án review và commit thay đổi: chạy lại `npm run thu-tich-hop:devnet`, `npm run so-lieu`, `npm run release-notes`, dựng lại deck/gói nếu nội dung đổi, rồi `npm run check`, `npm run kiem-san-pham`, `npm run nop-bai-strict`. Không xóa cờ dirty của artifact để làm gate xanh.
- Khi được giao quyền phát hành: chạy remote CI trên đúng revision, ghi URL run và kết quả vào TB-H02. Đăng ký BTC không tự cập nhật khi sửa tài liệu trong repo.

Các bước phát triển ưu tiên tiếp theo: mở rộng trace cho luật đổi owner có kiểm đối chiếu dữ kiện; kiểm browser/thiết bị sân khấu; xem lại advisory trước nộp; giải quyết cách chấm contract với BTC. Nghiên cứu người mua/usability vẫn hoãn theo phạm vi đã được nhóm chọn.
