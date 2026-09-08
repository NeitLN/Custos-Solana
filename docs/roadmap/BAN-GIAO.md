# Bàn giao phiên thực thi Custos

Đọc [roadmap](../../ROADMAP-CLAUDE.md) và [tiến độ](TIEN-DO.md) trước khi làm. File này giữ ngữ cảnh có thể mất giữa các phiên; trạng thái từng thẻ chỉ sửa ở TIEN-DO.md.

## Hiện trạng

- Bắt đầu phiên ở `55388d6`; đã nghiệm thu **R00, R01, U01, U02, U03**.
- Ba lỗi P1 của báo cáo đánh giá (**F01, F02, F03**) và **F09** đã sửa. Mỗi lỗi được **tái hiện trước khi sửa** và **đo lại sau khi sửa**.
- Bộ test: **415 pass, 0 fail**. axe: **40/40, 0 vi phạm** trên bản dựng sau thay đổi.
- Chưa push. Các file roadmap và báo cáo do chủ dự án đưa vào vẫn untracked ở thời điểm ghi sổ này.
- Quyền đã được cấp: đọc/sửa file trong phạm vi, chạy kiểm thử, build, tạo artifact cục bộ, commit cục bộ. **Chưa được** push, publish, deprecate gói, hoặc liên hệ bên ngoài.

## Đối chiếu F01–F11 sau phiên này

| Mã | Trạng thái | Căn cứ |
|---|---|---|
| F01 | **đã sửa** | 320/375/768 px: kết quả ở `top=9/9/154`, focus vào khối kết quả. Trước đó `y≈1241` với `scrollY=0`. |
| F02 | **đã sửa** | Sáu pha ký/gửi; `chuaRo` tách khỏi `thatBai`. 5 bài kiểm bằng stub. |
| F03 | **đã sửa** | Xác thực từng trường; 5 ca cấu hình hỏng đều không trắng trang và không tạo nút Ký. |
| F04 | **còn** | Trang phỏng vấn chưa có deadline bao quanh `getLatestBlockhash()`/`inspect()`. Việc I01. |
| F05 | **còn** | localStorage khác schema làm hỏng trang phỏng vấn. Việc I02. |
| F06 | **còn** | Payload dApp hỏng bị bỏ qua im lặng. Việc U04 — nay đủ phụ thuộc vì U03 đã xong. |
| F07 | **còn** | Huỷ xong chưa có xác nhận kết quả. Việc U05. |
| F08 | **còn** | Vùng bấm nhỏ trên mobile. Việc U06. |
| F09 | **đã sửa** | `scripts/docZip.ts`; PowerShell không có `unzip` → 403/403. **Chưa kiểm Linux trong phiên này.** |
| F10 | **cần rà lại** | Nhiều claim đã được đồng bộ tự động ở các phiên trước (`npm run so-lieu`). Phải đối chiếu lại danh sách cụ thể của báo cáo trước khi đóng. Việc D01. |
| F11 | **đã phân loại, chưa vá** | `docs/PHU-THUOC.md` có phân tích phơi nhiễm từng advisory và quyết định chấp nhận có điều kiện. Việc S01 nên rà theo khung roadmap thay vì làm lại từ đầu. |

## Điều dễ đọc nhầm ở phiên sau

- **`npm run check` trên PowerShell từng cho 402/403.** Nguyên nhân là thiếu `unzip`, đã sửa. Nếu lại thấy 402, đọc lỗi thật chứ đừng cho rằng là lỗi cũ.
- **Build xanh không phải typecheck xanh.** esbuild không kiểm kiểu; trong phiên này một lỗi `TS2448` lọt qua build và chỉ `npm run typecheck` bắt được.
- **`data/a11y/ket-qua.json` gắn với bản dựng.** Sửa `apps/*/src` là nó cũ; cổng sản phẩm sẽ báo `CU`. Chạy lại `scripts/kiem-trinh-duyet/soi-trinh-duyet.py` với **cả hai** server (5188 và 5189) đang bật.
- **Hai bài trình duyệt mới ghi đè file thật.** `soi-cau-hinh-hong.py` ghi đè `hien-truong.json` nên nó đòi đường dẫn bản sao và khôi phục trong `finally`. Đừng chạy khi chưa sao lưu.
- **Ký thật đòi `VITE_DEMO_SECRET`.** Không tạo khoá để kiểm; luồng gửi đã tách ra `src/gui.ts` chính vì lý do đó.

## Bước tiếp theo

Theo phụ thuộc, các việc đã đủ điều kiện: **U04** (F06), **I01**/**I02** (F04/F05), **R02**, **S01** (rà `docs/PHU-THUOC.md` theo khung roadmap), **D01** (F10).

U04 nên làm trước trong nhóm ví: nó cùng lớp với F03 vừa sửa — dữ liệu ngoài vào mà không được xác thực — nên phần lớn cách làm đã có sẵn mẫu.
