# Nghiệm thu cuối — roadmap sau mentor (04/10/2026)

> Việc F2–F5 trong [`ROADMAP-SAU-MENTOR.md`](../../roadmap/ROADMAP-SAU-MENTOR.md).
> Mọi dòng dưới đây có artifact đi kèm. Dòng nào không có artifact thì được ghi rõ là **chưa đo**.

## Bản được nghiệm thu

- Commit `22e04f9` trên `main`, đã push.
- Vercel production `custos-solana.vercel.app` và alias SolBonus `solbonus-custos.vercel.app` cùng trỏ
  vào deployment `custos-solana-70j8wsfpf-style-hub.vercel.app`. Đây là **hai origin** do trình duyệt
  cách ly, không phải hai hạ tầng độc lập.
- Deploy chạy từ một git worktree sạch (chỉ gồm file đã commit).
- `npm run check`: **1354 test pass, 0 fail**, typecheck sạch.

## Kết quả

| # | Hạng mục | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Hai origin HTTPS: SolBonus → ví Custos, **chặn** bản độc | ĐẠT. Tự dò 5 tài khoản DEMO → cửa sổ ví hiện **Nguy hiểm** (`SPL_SET_AUTHORITY__ACCOUNT_OWNER`, 500 → 250, chủ "Bạn → 7oGP…AQFm") → Chặn → **0** `sendTransaction` | [`solbonus/report.json`](solbonus/report.json), ảnh `wallet-danger.png` |
| 2 | Bản lành cùng luồng | ĐẠT: **An toàn**, phủ 1/1 lệnh, không có mã lý do | như trên |
| 3 | Đóng cửa sổ ví → adapter ngắt → kết nối lại được | ĐẠT | như trên |
| 4 | Chữ ký treo sống qua reload, nút gửi bị khoá | ĐẠT. Đây là **tiêm lỗi**, không phải giao dịch thật đang treo | như trên |
| 5 | SolBonus 390px: không tràn ngang; axe | ĐẠT: 0 vi phạm | như trên |
| 6 | Nhánh **Vẫn ký** bản độc, đối chiếu chain | ĐẠT ngày 29/09 (chưa chạy lại hôm nay, để không tiêu thêm token DEMO). Biên nhận khớp 3/3, chain: 499 → 249,5 DEMO, chủ `AqX3…` → `EicA…` | [`../ck-20260929/B5-VAN-KY.json`](../ck-20260929/B5-VAN-KY.json) |
| 7 | Trang giới thiệu: dải hành trình ký | ĐẠT: 4 bước, đúng hai liên kết (SolBonus, Tích hợp) | [`gd2-vercel.json`](gd2-vercel.json) |
| 8 | Trang Tích hợp: chạy thử chính `kiemTruocKhiKy` | ĐẠT: tấn công ⇒ **Chặn**/`phat_hien`, phủ 2/3 lệnh; lành ⇒ **Cho ký**, phủ 1/1. Phát lại dữ liệu Devnet đã ghi; phần phân tích không gọi RPC hay AI, không ký | [`gd2-vercel.json`](gd2-vercel.json) |
| 9 | Trang Tích hợp 390px + axe | ĐẠT: không tràn, 0 vi phạm | [`gd2-vercel.json`](gd2-vercel.json) |
| 10 | Không lộ bí mật trên production | ĐẠT: `/.devnet/vi-demo.json` trả 404; file cá nhân trong thư mục làm việc trả 404; `/api/dien-giai` trả **403** với prompt lạ; dò khoá trên toàn bộ output build: sạch | lệnh `curl` và log `build-vercel.sh` |
| 11 | CI GitHub Pages + bản Pages | ĐẠT: run `37185545753` build/goi-sdk/deploy success (run trước `37185315973` đỏ đúng vì tài liệu còn số test cũ, đã sửa ở `22e04f9`). Trên `neitln.github.io/Custos-Solana/`: dải hành trình 4 bước, link Tích hợp đúng base, chạy thử Chặn/Cho ký, axe 0 | [`gd2-pages.json`](gd2-pages.json) |

## Đối chiếu tuyên bố (F4)

| Tuyên bố | Ở đâu | Kết luận |
|---|---|---|
| "1354 test" | README, CLAUDE.md, PITCH, ADR, RELEASE-NOTES | Sinh từ phép đo (`npm run so-lieu`). Guard `claim.test.ts` canh |
| "31 dòng mã" tích hợp | trang Tích hợp (máy đếm), `vi-du-tich-hop/README.md` | Khớp. Trang tự đếm trên chính đoạn hiển thị, không gõ tay |
| "dApp không gọi Custos, chỉ đăng ký ví" | landing, trang Tích hợp, banner SolBonus | Khớp mã. Guard `solbonus.test.ts` và `spikeKetNoi.test.ts`: chỉ import `@custos-solana/connector`, không có `inspect(` |
| "chưa phải pilot của bên thứ ba" | trang Tích hợp, ADR-0004 | Đúng: D1 chưa có |
| Lighthouse "bổ trợ, chưa tích hợp" | `docs/nghien-cuu/LIGHTHOUSE.md` | Có nguồn chính thức. Kết luận so sánh có điều kiện; program đo trên chain ([`lighthouse-program.json`](../ck-20260929/lighthouse-program.json)) |

## Review (F2)

Codex đã review **từng giai đoạn**, chỉ đọc: GĐ0+GĐ1 (4 finding, đã sửa), GĐ2 (7 finding, đã sửa).
Từ sau lượt review GĐ2 chỉ còn thay đổi về số liệu và tài liệu, không đổi mã. Mã đường ký không đổi
từ commit B5 (`git diff 2728fe9 HEAD` trên connector, cửa sổ ký, `ky.js`, `giaoDich.ts`: rỗng).

## Chưa làm / chưa đo

- **D1**: chưa có người ngoài đội tự tích hợp. Không gọi việc tự tích hợp là pilot.
- Chỉ đo trên **Chromium**. Firefox và Safari chưa đo.
- Nhánh "Vẫn ký" không chạy lại trên bản deploy hôm nay. Bằng chứng là lượt chạy 29/09 trên cùng
  mã đường ký; các commit sau đó chỉ đổi chữ, nhãn và trang mới.
