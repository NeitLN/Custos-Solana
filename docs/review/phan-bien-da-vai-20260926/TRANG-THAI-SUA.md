# Trạng thái sửa — phản biện sáu vai 26/09/2026

Báo cáo gốc [`BAO-CAO.md`](BAO-CAO.md) giữ nguyên văn làm mốc. ID dưới đây là ID trong báo cáo đó, không
phải ID của `docs/review/national-20260925/FINDINGS.md`.

Trước khi sửa, từng finding được kiểm lại: 6/6 test hồi quy của Codex đỏ trên mã lúc đó, và probe dựng
đúng tình huống (`inspect()` thật, RPC giả có trạng thái trước/sau), không phải gọi tắt một hàm riêng lẻ.
Mỗi bản sửa đi kèm test đỏ trên mã cũ; những chỗ dễ sửa nhầm có thêm phép đột biến.

| ID | Mức | Trạng thái | Sửa ở đâu | Test |
|---|---|---|---|---|
| F-01 | P0 | **ĐÃ SỬA** | `facts.ts` thêm `delegatedAmountBefore` + `quyenRutMoRong()`; `fetch.ts` ghi hạn mức trước; luật 3, `diff.ts`, `nhanDien.ts` cùng dùng một hàm | `packages/core/test/hanMucUyQuyen.test.ts` (6) |
| F-08 | P0 | **ĐÃ SỬA** | `fetch.ts` ghi `mintKhongDoc`; `evaluate.ts` đưa vào fail-safe `TRANG_THAI_DO_KHUYET`; `diff.ts` hiện "đơn vị gốc", bỏ `soLieu` khi chưa biết decimals; `templates.ts` có câu riêng | `packages/core/test/mintKhongDoc.test.ts` (6) |
| F-07 | P1 | **ĐÃ SỬA** | `fetch.ts`: vị trí vắng trong `accounts` là chưa đo, `null` có mặt vẫn là account đã đóng | `packages/core/test/do-khuyet.test.ts` (+4) |
| F-04 | P0 | **ĐÃ SỬA** — hai lớp | (1) `moHinh.ts`: chuẩn hoá NFC + bỏ ký tự vô hình; chặn câu phán quyết và câu xúi ký (danh sách đen). (2) **Neo đủ** `boSotHauQua()`: mỗi hậu quả lõi tất định đã nêu phải được lời mô hình nhắc tới, không thì rơi về câu tất định | `moHinh.test.ts` (+5) |
| F-02 | P1 | **ĐÃ SỬA** | `inspect.ts`: interpreter nhận bản sao `facts`, `reasonCodes`, `options` | `packages/core/test/inspect.test.ts` (+1) |
| F-03 | P1 | **ĐÃ SỬA** | Helper, README SDK, bản sao trong `readme.test.ts`: `aiAdvisory` ⇒ `hoi` / `de_nghi_kiem_tra`. Màn thực thi: `canBoQua()` dùng chung cho nút và cổng `execute()` — có đề nghị kiểm tra thì phải xác nhận chủ động; nhật ký quyết định ghi `aiAdvisory`; `level` không đổi | `tichHopShim.test.ts` (+2), `liveSession.test.ts` (+2) |
| F-05 | P1 | **ĐÃ SỬA** | `WalletExecution.tsx`: bỏ chế độ ví khách; URL `guest`/`wallet` bị bỏ qua | `apps/demo-wallet/test/viDemoCoDinh.test.ts` (+1) + probe trình duyệt |
| F-06 | P2 | **ĐÃ SỬA** | Quyền đọc ở slot muộn hơn chỉ được đối chiếu khi QUY ĐƯỢC cho giao dịch: sau lúc đọc trạng thái, chữ ký mới nhất chạm tài khoản nguồn vẫn là của giao dịch này (`quyChoGiaoDich()`, `getSignaturesForAddress`). Không quy được ⇒ `unknown` + nhãn "chưa quy được"; số dư theo metadata vẫn đối chiếu | `liveDemo.test.ts` (+4) |

## Bằng chứng sau sửa

- `npm run check`: **1109/1109** lúc đóng 8 finding; **1128/1128** sau các sửa theo review toàn diện cùng ngày
  (`docs/review/REVIEW-TOAN-DIEN-20260926.md`), typecheck sạch.
- Test hồi quy của Codex (`bang-chung/regression.test.mjs`): **6/6 xanh**. Log đỏ gốc `regression-red.log` giữ nguyên.
- Đỏ trên mã cũ, chạy trước khi sửa: F-01 (1 bài), F-08 (4), F-07 (3), F-04 (1), F-02 (1), F-03 (1),
  F-05 (1), F-06 (1). Đột biến sau khi sửa: F-07 đưa vị trí vắng về `null` ⇒ 3 đỏ · F-02 truyền tham chiếu ⇒ 1 đỏ.
- Mô phỏng Devnet 9 kịch bản: **9/9, 0 lệch** — mint thật đọc được nên F-08 không sinh cảnh báo thừa.
- Replay offline: **19/29**, không đổi (lúc sửa F-xx). 26/09 thêm 10 fixture mainnet ⇒ **29/29** — xem `REVIEW-TOAN-DIEN-20260926.md` mục "Việc làm thêm". Tích hợp tất định **14/14**, ví dụ tích hợp Devnet **8/8**.
- Trình duyệt, màn thực thi: không query, `?guest=1`, `?guest=1&wallet=724Me…`, `?guest=1&wallet=khong-hop-le`
  ⇒ cả bốn hiện `AqX3FmDzuU1a…`, không còn chữ "ví khách", không lỗi trang.

## Hệ quả cần biết

- **Số dòng tích hợp 30 → 31.** Nhánh `aiAdvisory` là phần bắt buộc của một tích hợp đúng. Đã đo lại
  (`thu-tich-hop:devnet`), đồng bộ bằng `npm run so-lieu`, sửa tay ba câu hiện hành trong README và dòng bằng
  chứng của ADR-0001. Dòng lịch sử (roadmap, bảng sửa claim cũ) giữ nguyên.
- **Fixture `do-khuyet.test.ts` "đo đủ" được bổ sung mint.** Trước đây RPC giả trả tài khoản hệ thống rỗng
  cho địa chỉ mint; từ F-08 đó đúng là dữ liệu khuyết. Assert giữ nguyên.
- **Báo cáo gốc được gắn nhãn "TÀI LIỆU LỊCH SỬ"** ở đầu: guard ngày gõ cứng bắt nhầm câu "deadline … 25/09"
  của Codex. Nội dung không đổi.
- **Mã chạm ranh giới vai:** F-01/F-02/F-07/F-08 thuộc A; F-01 (phần L3)/F-04/F-08 (câu mẫu) thuộc C;
  F-05/F-06 thuộc B và nằm trong mã **chưa commit** của luồng thực thi Devnet.

- **Dữ liệu gửi mô hình** (`duLieuChoMoHinh`): thiếu mint ⇒ "đơn vị gốc" như bảng chênh lệch, thay vì
  `decimals ?? 0`; `delegateMoi` dùng `quyenRutMoRong()` như luật 3. Test: `moHinh.test.ts` (+1).
- **Fixture ghép quyền biên nhận:** bài `live receipt: compare actual metadata…` đọc quyền ở slot 13 > 12 và mong
  `match`; nay fixture ghi rõ `rightsAttributable: true` — điều kiện để phép so đó hợp lệ.

## Phát hiện thêm trong lúc sửa

**CLI kiểm `--receipt` SAU lời gọi mạng — ĐÃ SỬA.** Khi Devnet công cộng ngừng trả `getMultipleAccounts`
(26/09), `custos-soi --receipt rieng` đợi 20 giây rồi báo "lỗi hạ tầng" (mã 4) cho một lỗi gõ lệnh (phải là mã
3). Hai bài CU-11 cũ không bắt được vì chỉ tới được đó khi mạng tốt. Phép kiểm chuyển lên trước mọi lời gọi
mạng, cùng chỗ với `--policy`/`--han`; bài mới trỏ `--rpc` vào cổng không ai nghe và vẫn đòi mã 3 (đột biến
tắt phép kiểm ⇒ đỏ). Nay trả mã 3 sau 0,3 giây.

## Quyết định cho F-04 — vì sao không thiết kế lại L3

Codex đề xuất hướng bền: mô hình chỉ chọn và diễn đạt các mệnh đề hậu quả đã định danh. **Không làm**, vì:

- Phần người dùng đọc để quyết định đã tất định sẵn: nhãn mức (L2), câu tóm tắt in đậm (`tomTat()`, dựng từ
  bảng chênh lệch) và bảng chênh lệch không đi qua mô hình. Lời mô hình chỉ là đoạn diễn giải bên dưới.
- Rủi ro còn lại của đoạn đó có hai dạng: nói sai và **nói thiếu**. Đo được một ca nói thiếu lọt tới người dùng:
  giao dịch vừa chuyển tiền vừa đổi chủ, mô hình chỉ kể phần chuyển tiền. Danh sách đen không bao giờ bắt được
  kiểu này.
- **Neo đủ** bịt đúng dạng đó mà vẫn giữ quyền diễn đạt của mô hình: nó suy từ dữ kiện, không từ danh sách chữ.
  Cùng với neo có sẵn "không nói về hành vi L2 chưa gắn mã", lời mô hình bị kẹp hai phía — nói đủ và không nói
  quá những gì dữ kiện chứng minh.

## Còn mở

- **F-04, phần danh sách đen:** vẫn luôn thiếu với câu phán quyết/xúi ký viết kiểu mới. Chưa có tập giữ lại độc
  lập để đo tỉ lệ chặn nhầm / cho lọt; một tập do chính người viết bộ lọc soạn sẽ thiên lệch.
- Mục 6 của báo cáo gốc (clean install ngoài monorepo, `npm audit`, mô hình thật, CPI nhiều tầng,
  screen reader) vẫn chưa kiểm.
