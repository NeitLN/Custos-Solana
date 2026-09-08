# Bàn giao phiên thực thi Custos

Đọc [roadmap](../../ROADMAP-CLAUDE.md) và [tiến độ](TIEN-DO.md) trước khi làm. File này giữ ngữ cảnh có thể mất giữa các phiên; trạng thái từng thẻ chỉ sửa ở TIEN-DO.md.

## Hiện trạng

- Bắt đầu phiên ở `55388d6`; đã nghiệm thu **R00, R01, R02, U01–U07, I01–I03, S01, S03, A01, B01, B02, D01, D02, D03**.
- **Tám lỗi** đã sửa: **F01, F02, F03** (P1) và **F04, F05, F06, F07, F08, F09** (P2). Mỗi lỗi được **tái hiện trước khi sửa** và **đo lại sau khi sửa**.
- Bộ test: **451 pass, 0 fail**. Eval AI: 13/13 bẫy chặn · 3/3 đối chứng qua. axe: **40/40, 0 vi phạm** trên bản dựng sau thay đổi.
- Chưa push. Roadmap, báo cáo đánh giá và thư mục bằng chứng đã được commit vào repo.
- Quyền đã được cấp: đọc/sửa file trong phạm vi, chạy kiểm thử, build, tạo artifact cục bộ, commit cục bộ. **Chưa được** push, publish, deprecate gói, hoặc liên hệ bên ngoài.

## Đối chiếu F01–F11 sau phiên này

| Mã | Trạng thái | Căn cứ |
|---|---|---|
| F01 | **đã sửa** | 320/375/768 px: kết quả ở `top=9/9/154`, focus vào khối kết quả. Trước đó `y≈1241` với `scrollY=0`. |
| F02 | **đã sửa** | Sáu pha ký/gửi; `chuaRo` tách khỏi `thatBai`. 5 bài kiểm bằng stub. |
| F03 | **đã sửa** | Xác thực từng trường; 5 ca cấu hình hỏng đều không trắng trang và không tạo nút Ký. |
| F04 | **đã sửa** | Hạn 15 s bọc cả chuỗi. Treo RPC thật: dừng sau 15,3 s, có nút Thử lại. |
| F05 | **đã sửa** | Kho hỏng được GIỮ nguyên văn + nút tải bản sao; bắt cả lỗi ghi. Không tự xoá biên bản. |
| F06 | **đã sửa** | Union ba nhánh + giới hạn độ dài. Payload hỏng không sinh khối kết quả, không hiện nhãn phán quyết. |
| F07 | **đã sửa** | `role=status` nói rõ giao dịch chưa được gửi và sẽ không được gửi. |
| F08 | **đã sửa** | Đo 375px cảm ứng: 4 nút cao 19px (dưới cả ngưỡng AA 24px), link Số liệu 42×34px. Sửa ở lớp `.lien-ket`, không vá từng nơi gọi. 26/26 đạt 44px. |
| F09 | **đã sửa** | `scripts/docZip.ts`; PowerShell không có `unzip` → 403/403. **Chưa kiểm Linux trong phiên này.** |
| F10 | **đã sửa** | Bảng claim ở `docs/BANG-CLAIM.md`. Sáu dòng báo cáo nêu đích danh đều đã xử: ba lệch số vào generator, ba câu thu hẹp, checklist registry cập nhật. |
| F11 | **đã đánh giá; không có bản vá để áp** | Tra registry: không advisory high nào có bản đã vá (`image-size` mới nhất vẫn trong dải bị ảnh hưởng). Bốn điều kiện chấp nhận rủi ro nay là test có kiểm phủ định. |

## Điều dễ đọc nhầm ở phiên sau

- **`npm run check` trên PowerShell từng cho 402/403.** Nguyên nhân là thiếu `unzip`, đã sửa. Nếu lại thấy 402, đọc lỗi thật chứ đừng cho rằng là lỗi cũ.
- **Build xanh không phải typecheck xanh.** esbuild không kiểm kiểu; trong phiên này một lỗi `TS2448` lọt qua build và chỉ `npm run typecheck` bắt được.
- **`data/a11y/ket-qua.json` gắn với bản dựng.** Sửa `apps/*/src` là nó cũ; cổng sản phẩm sẽ báo `CU`. Chạy lại `scripts/kiem-trinh-duyet/soi-trinh-duyet.py` với **cả hai** server (5188 và 5189) đang bật.
- **Hai bài trình duyệt mới ghi đè file thật.** `soi-cau-hinh-hong.py` ghi đè `hien-truong.json` nên nó đòi đường dẫn bản sao và khôi phục trong `finally`. Đừng chạy khi chưa sao lưu.
- **Ngày gõ cứng trong tài liệu hết hiệu lực trong im lặng.** Một mục «cửa quyết định» gắn ngày cụ thể đã trôi qua mà không ai biết. Guard lịch cũ chỉ quét 4 file và vài từ khoá nên không thấy; nay quét MỌI `.md` và tìm ngày đứng cạnh từ chỉ cửa/hạn. Ngày ĐO ĐƯỢC vẫn giữ nguyên — chỉ ngày làm CỬA mới bị chặn.
- **Đối chứng dương phải khác câu nền, nếu không nó không phân biệt được gì.** Bản cũ gửi vào chính `moc.explanation`: bộ chắn cho đi qua và bộ chắn vứt sạch đều trả về đúng chuỗi đó. Mutation (`explanation: nen.explanation`) cho thấy 10/10 bẫy vẫn xanh trong khi lớp AI đã chết hẳn.
- **Playwright `has-text` KHÔNG phân biệt hoa thường.** `has-text("HUỶ")` bắt trúng cả nút "Chặn & huỷ giao dịch", nên bài kiểm bấm nhầm nút của người tham gia rồi tưởng người phỏng vấn chưa chấm. Dùng `text-is` cho nhãn ngắn, và thu hẹp theo `details` cho khối vòng 2.
- **`npm run preview` TỪNG phục vụ trang trắng với mã 200.** `vite preview` chạy với `command === "serve"` nên nhận base `/` trong khi HTML build trỏ `/Custos-Solana/`; mọi asset rơi xuống SPA fallback. Đã sửa bằng `isPreview` ở cả hai app. Kiểm bằng `Content-Length`, đừng kiểm bằng mã trạng thái.
- **Chạy `eval-ai` offline KHÔNG còn xoá lượt live.** Trước đây có, và đã xảy ra: biên bản live 22/08 còn trong `docs/bao-mat/` nhưng `data/eval/ai-ket-qua.json` thì đã bị ghi đè thành `BLOCKED_BY_SECRET`. Lượt live nay sống trong `liveGanNhat`.
- **Cohort mainnet tự phân hủy.** 25/08 đo được 9/20; 08/09 chỉ còn 4/20, toàn bộ vì trạng thái chuỗi đã đi qua (ALT đóng, tài khoản đóng). Chạy `do-cohort.ts` kèm `--khong-ghi` để kiểm mà KHÔNG ghi đè số đã công bố — bỏ cờ đó là `so-lieu` rải số mới khắp README, CLAUDE.md và deck.
- **`localhost` và `127.0.0.1` KHÔNG thay nhau được trên máy này.** Vite gắn vào `localhost`, mà Windows phân giải nó ra `::1` trước — nên `127.0.0.1` từ chối kết nối ở cả 5188 lẫn 5189. Bài kiểm trình duyệt nào mở `127.0.0.1` sẽ đỏ vì môi trường, không vì sản phẩm.
- **"npm đề xuất hạ cấp" KHÔNG chứng minh "thượng nguồn chưa có fix".** npm đề xuất hạ cấp cả khi có bản vá mà cây phụ thuộc không với tới. Phải tra registry: `npm view <gói> version` so với dải bị ảnh hưởng trong `npm audit --json`.
- **`sourceCommit` KHÔNG nói gì về thay đổi chưa commit.** Bằng chứng nào cũng phải ghi `dauVet` (xem `scripts/dau-vet.ts`); thiếu nó mà cây đang bẩn thì cổng trả KHÔNG KIỂM ĐƯỢC, không trả ĐẠT.
- **Sửa file trong `packages/` làm bằng chứng live hết hiệu lực**, kể cả khi chỉ thêm một file test. `laMa` cố ý rộng. Chạy lại `npm run thu-tich-hop:devnet` rồi `npm run so-lieu`.
- **`outline-width` KHÔNG cho biết vòng focus có thấy được không.** Chromium giữ bề rộng đã khai báo kể cả khi `outline-style: none`, nên một phép kiểm chỉ đọc bề rộng sẽ xanh vĩnh viễn. Phải đọc cả `outline-style`. Bài `soi-ban-phim-va-phong-to.py` đã dính đúng lỗi này ở bản đầu và chỉ kiểm phủ định mới lộ ra.
- **Ký thật đòi `VITE_DEMO_SECRET`.** Không tạo khoá để kiểm; luồng gửi đã tách ra `src/gui.ts` chính vì lý do đó.

## Bước tiếp theo

**Cả mười một lỗi F01–F11 của báo cáo đánh giá đã đóng.** Việc còn lại là roadmap, không phải báo cáo: U06 xong nên **U07**, **I03**, **B03** đủ phụ thuộc; R02 xong nên **D02**, **D03**, **A01**; S01 xong nên **S02** — nhưng S02 hiện không có gì để vá, xem `PHU-THUOC.md` mục 0.

Năm lỗi vừa sửa cùng MỘT lớp: **dữ liệu từ ngoài vào không được xác thực, và hỏng thì im lặng**. `hien-truong.json`, payload dApp, kho localStorage, phản hồi RPC — cả bốn đều từng ép kiểu hoặc nuốt lỗi. Cách sửa giống nhau: union phân biệt trạng thái, nói ra lý do, và không bao giờ diễn giải "không đọc được" thành "không có vấn đề".
