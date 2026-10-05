# Roadmap: từ "đang thử một bản demo" sang "đang dùng một sản phẩm"

> Soạn 06/10/2026, Claude và Codex (gpt-5.5, chỉ đọc) đối chiếu với nhau. Đầu vào:
> - góp ý mentor 1:1 ngày 29/09;
> - lượt nhập vai giám khảo 05/10 ([DANH-GIA-GIAM-KHAO.md](../review/ck-20261005/DANH-GIA-GIAM-KHAO.md));
> - đọc mã hiện tại.
>
> Đây là **kế hoạch**. Trạng thái thật ghi ở `TIEN-DO.md`. Chung kết 10/10; dự án đang đóng băng tính năng.

---

## 1 · Vì sao người thử vẫn thấy "đang test demo"

Mười dấu hiệu, xếp theo mức phá cảm giác thật. Codex xếp hạng; Claude đã kiểm từng dòng trích dẫn.

| # | Dấu hiệu | Ở đâu |
|---|---|---|
| 1 | **Ví không phải của người thử.** "Ví của bạn" lại là ví demo cố định, phải nạp `.devnet/vi-demo.json` của đội | `WalletExecution.tsx:407, 445, 452` |
| 2 | **Chữ "Demo" nằm trong thương hiệu**: "Custos [Demo]", "Ví mẫu tích hợp Custos SDK", "Custos Demo 01" | `App.tsx:800, 817, 890` |
| 3 | **Phải "Ký tạo phiên thử nghiệm" trước** (tạo mint và 3 tài khoản token) thì mới làm được gì | `WalletExecution.tsx:461, 469` |
| 4 | **Banner SolBonus "dApp độc hại MÔ PHỎNG"** chiếm dòng đầu trang | `trang-tan-cong/src/App.tsx:111` |
| 5 | **Thẻ thưởng tự tố**: "DEMO · DEVNET", "Phần thưởng hư cấu" lặp dày | `trang-tan-cong/src/App.tsx:122-123` |
| 6 | **Luồng chính là chọn kịch bản**: "Chọn một giao dịch để thử", "Tấn công đầy đủ", "đối chứng" là ngôn ngữ phòng thí nghiệm | `App.tsx:923`, `kichBan.ts:311, 332` |
| 7 | **Bộ chọn "Devnet trực tiếp / Dữ liệu đã ghi"** nằm ngay trong luồng chính, khiến người xem thấy mình đang vận hành máy thử | `App.tsx:971, 1005` |
| 8 | **Inspector ghi "Solana Devnet"** dù ô RPC sửa được | `Inspector.tsx:44, 210, 302` |
| 9 | **Điều hướng gọi thẳng là "Ví mẫu", "Inspector"** | `ProductNavigation.tsx:8, 10` |
| 10 | **Tài liệu công khai tự đóng khung là thử nghiệm**, chưa tách "bản thi trên Devnet" khỏi "SDK tích hợp thật" | `README.md:37`, `packages/core/README.md:5` |

**Gốc rễ:** người thử **không mang theo thứ gì của chính họ**: không ví riêng, không giao dịch riêng, không dApp riêng. Họ bấm nút kịch bản có sẵn, trên ví chung, với token giả, trong một giao diện liên tục nhắc rằng đây là thử nghiệm.

## 2 · Nguyên tắc (không đổi)

1. **Trung thực vẫn khoá** (quyết định 7, mentor điểm 2). Không giấu Devnet, không giấu mô phỏng. Chỉ chuyển nhãn từ **"hô to ở mọi chỗ"** sang **"đúng chỗ, một lần, nhất quán"**: một dải phạm vi và một trang "Về thử nghiệm".
2. **"Thật" nghĩa là người thử mang dữ liệu, ví hoặc hành động của chính họ**, và sản phẩm phản ứng như một sản phẩm, không như sân khấu.
3. **Không gọi phát lại là live.** Dữ liệu đã ghi phải ghi rõ "đã ghi lúc…".

## 3 · Năm đòn bẩy, đã đánh giá

| Đòn bẩy | Cảm giác thật | Công | Rủi ro | Chạm quyết định khoá | Kết luận |
|---|---|---|---|---|---|
| **D. Ngôn ngữ sản phẩm**: bỏ "Demo" khỏi thương hiệu, gom nhãn Devnet/mô phỏng vào một dải | Cao | S | Thấp | 7 (giữ nhãn) | **Làm ngay** |
| **E. Luồng không kịch bản**: màn đầu là dApp → ví → quyết định; kịch bản dời vào "Thư viện tình huống" | Cao | M | Thấp | — | **Làm ngay**, phần chữ và thứ tự; giữ mọi nhãn mà probe dựa vào |
| **A. Giao dịch mainnet thật, phát lại**: 10 giao dịch `MN-01…10` cùng fixture đã có trong repo | Rất cao | M | Vừa | 7 (phải ghi rõ "đã ghi") | **Làm trước chung kết**, mức phát lại |
| **F. SolBonus giống dApp thật**: nhãn mô phỏng thành dải nhỏ, không chiếm hero | Vừa | S | Vừa | 7, nhãn mentor yêu cầu | **Làm**, nhãn vẫn nhìn thấy được |
| **A+. Blinks / Solana Actions mainnet**: dán link Action của dApp thật → Custos lấy giao dịch → kiểm (chỉ đọc) | Rất cao | M–L | Vừa | 5 không chạm (chỉ đọc) | **Sau chung kết**: cần proxy server có allowlist và giới hạn tần suất (CORS) |
| **B. Guard phía dApp quanh Phantom/Solflare** | Vừa | M | Vừa | 7 (dễ nói quá) | **Sau chung kết.** Chỉ chứng minh *dApp tử tế tự kiểm*, không chống dApp độc hại (ADR-0004 mục 4) |
| **C. Ví riêng cho từng người thử** (khoá sinh trong trình duyệt, nạp SOL Devnet) | Rất cao | M | Cao | **8** | **Chỉ khi chủ dự án đổi quyết định 8** |
| **G. Extension bọc ví thật** | Rất cao | L | Cao | 7 | **Sau chung kết.** Chỉ làm nếu chặn được thật |

## 4 · Lộ trình

### Giai đoạn 0 — 07 → 09/10 (an toàn với đóng băng, mỗi việc tự đứng được)

| # | Việc | File | Nghiệm thu |
|---|---|---|---|
| **R0-1** | **Bỏ "Demo" khỏi thương hiệu**: "Custos [Demo]" → "Custos" kèm nhãn nhỏ "Devnet"; "Ví mẫu tích hợp Custos SDK" → "Ví Custos · bản tham chiếu tích hợp SDK"; "Custos Demo 01" → "Tài khoản thử nghiệm" | `App.tsx`, `ProductNavigation.tsx` | Không còn chữ "Demo" trong thương hiệu; dải phạm vi Devnet vẫn hiện trên mọi màn; probe và guard xanh |
| **R0-2** | **Đổi ngôn ngữ phòng thí nghiệm thành ngôn ngữ người dùng**: "Chọn một giao dịch để thử" → "Thử một yêu cầu ký"; nhãn thẻ ghi lời mời trước ("Nhận quà tặng — ký để nhận"), tên kỹ thuật phụ sau. Bộ chọn nguồn dữ liệu dời vào mục "Tuỳ chọn" thu gọn | `App.tsx`, `PhongKichBan.tsx` | Các nhãn probe đọc vẫn còn (`Tấn công đầy đủ`, `Dữ liệu đã ghi`, …); nhìn lướt màn đầu không thấy chữ "kịch bản" hay "đối chứng" |
| **R0-3** | **"Giao dịch mainnet thật" bằng phát lại**: thẻ mới trong Inspector và Phòng phân tích liệt kê 10 giao dịch `MN-01…10` (nguồn, chữ ký Explorer); bấm vào thì Custos kiểm trên fixture RPC đã ghi, không gọi mạng. **Lưu ý:** 4 mẫu (`MN-01, 03, 05, 06`) nay mô phỏng hỏng vì Address Lookup Table đã bị đóng trên mainnet (BENCHMARK.md, ghi chú 26/09). Đưa cả 4 lên như chính nó: "giao dịch này không còn mô phỏng được: ALT đã đóng", tức Custos báo thiếu dữ liệu, không bịa kết quả. Đây là bằng chứng fail-safe chạy trên dữ liệu thật | `Inspector.tsx` (như `mauInspector.ts`), `data/seed/tx/MN-*.base64`, `data/benchmark/rpc/MN-*.json` | Mỗi kết quả ghi rõ *"Giao dịch mainnet thật, phát lại dữ liệu RPC ghi ngày 26/09; không phải trạng thái chuỗi hiện tại"*; có link Explorer mainnet của chữ ký gốc; test chạy cả 10 mẫu; 4 mẫu ALT đã đóng ra mức không-Xanh kèm lý do thiếu dữ liệu, không bao giờ "An toàn" |

> **R0-3 đổi nguồn dữ liệu (đo 06/10, Codex phản biện đồng ý).** Chạy `inspect()` đầy đủ trên fixture 26/09 thì **cả 10/10** mẫu `MN-*` ra `MO_PHONG_HONG`, đọc hiểu 0 lệnh — không phải 4/10: ngoài 4 ALT đã đóng, 6 mẫu còn lại hỏng vì `AccountNotFound`/lỗi chương trình (giao dịch đã thực thi từ 21/08, mô phỏng lại một tháng sau). Facts đóng băng 21/08 thì do L1 cũ trích (chưa đọc IDL Jupiter/Pump) — ghép với L2 mới là một lượt kiểm không có thật. Nên R0-3 dùng bộ MỚI: `scripts/capture-mainnet-phat-lai.ts` (cổng `CUSTOS_OFFLINE_MAINNET_RESEARCH=1`, chỉ đọc) lấy **10 giao dịch thành công đầu tiên** của SPL Token theo thứ tự RPC trả, không lọc theo kết quả, mô phỏng lại trong vài giây tới ~24 giây sau khi thực thi, ghi vào `apps/demo-wallet/public/replay/mainnet.json` (4,4 MB, gzip 1,4 MB, chỉ tải khi mở mục). Kết quả lúc ghi: 4 Bình thường (`safe`) · 6 Cần xem kỹ (4 vì mô phỏng hỏng: thiếu số dư/trượt giá/`AccountNotFound`) · 0 Nguy hiểm; 2 giao dịch bỏ qua vì phiên bản v1 web3.js chưa đọc, lý do ghi trong file. Inspector có mục "Giao dịch mainnet thật — phát lại"; guard `apps/demo-wallet/test/mainnetPhatLai.test.ts`. **Cách nói:** bằng chứng engine đọc message mainnet thật và fail-safe khi thiếu trạng thái — KHÔNG phải luồng ký mainnet, KHÔNG phải bảo vệ tài sản mainnet. `MN-01…10` giữ nguyên cho benchmark.
| **R0-4** | **SolBonus bớt sân khấu**: banner đỏ đầu trang thành dải chân trang nhỏ, vẫn luôn nhìn thấy ("Mô phỏng · Solana Devnet · Về thử nghiệm"); thẻ thưởng bỏ "Phần thưởng hư cấu" (giữ trong FAQ) | `trang-tan-cong/src/App.tsx` | Nhãn mô phỏng vẫn hiện ở mọi cỡ màn mà không cần cuộn; guard `nhanC3` cập nhật theo vị trí mới; không câu nào ngụ ý SOLB có thật |
| **R0-5** | **Mở đầu ví bằng hành trình, không bằng thiết lập**: ở "Ví của bạn" khi chưa có khoá, màn đầu là "Mở một ứng dụng để thử" (link SolBonus) cùng lịch sử giao dịch thật đã ký; thiết lập khoá và phiên dời vào mục "Dành cho người trình diễn" | `WalletExecution.tsx` | Người không có khoá thấy ngay một việc làm được; mọi id và nhãn probe (`#demo-keypair`, `Ký tạo phiên thử nghiệm`, …) vẫn giữ |
| **R0-6** *(tuỳ chọn)* | **Làm gọn `docs/BENCHMARK.md` mục `l1-replay`.** Codex gọi đây là "mâu thuẫn", nhưng Claude kiểm lại thì thấy ghi chú 26/09 ngay phía trên đã gắn nhãn đoạn "chưa có fixture" là bối cảnh cũ. Chỉ nên đưa đoạn cũ xuống dưới, ghi tiêu đề "Lịch sử", để người đọc nhanh không hiểu nhầm | `docs/BENCHMARK.md` | Đọc lướt không còn gặp câu "chưa có fixture" trước câu "đã capture" |

Thứ tự: R0-1, R0-4 (chữ, rủi ro thấp nhất) → R0-2 → R0-3 → R0-5 → R0-6 nếu còn thời gian. Mỗi việc chạy `npm run check`, probe giám khảo và `soi-vung-bam.py` rồi mới sang việc sau.
**09/10: đóng băng hẳn**, chỉ sửa lỗi.

### Giai đoạn 1 — sau chung kết (2–3 tuần)

- **A+ Blinks:** route `api/` lấy giao dịch từ Solana Action, có allowlist domain, giới hạn tần suất, không chuyển tiếp khoá; người thử dán link Action thật → kiểm chỉ đọc trên mainnet.
- **B Guard Phantom/Solflare:** mẫu "dApp tự kiểm trước khi gọi ví" dùng ví thật của người thử trên Devnet. Gọi đúng tên, không nói "Custos bảo vệ Phantom".
- **C (nếu chủ dự án đổi quyết định 8):** ví trình duyệt riêng cho từng người thử, nút nạp SOL Devnet, không cần file khoá. Viết ADR riêng trước khi code.
- **D1 Pilot bên thứ ba.**

### Giai đoạn 2

- **G Extension** bọc provider của ví thật, chỉ khi chặn được thật.
- **Lighthouse** như lớp cưỡng chế tuỳ chọn, ví tự bật (ADR riêng; chạm quyết định 5).

## 5 · Cần chủ dự án quyết

| # | Câu hỏi | Đề xuất |
|---|---|---|
| Q1 | Cho bỏ chữ "Demo" khỏi thương hiệu, giữ dải phạm vi Devnet? | **Có** |
| Q2 | Cho thêm "Giao dịch mainnet thật — phát lại" trước chung kết, nhãn rõ "đã ghi, không live"? | **Có** |
| Q3 | Cho thu banner "MÔ PHỎNG" của SolBonus thành dải nhỏ luôn nhìn thấy? | **Có**, nhưng nên báo lại mentor vì đây là yêu cầu của mentor |
| Q4 | Giữ tuyệt đối quyết định 8 (một ví cố định) tới hết chung kết? | **Có** (đổi lúc này rủi ro quá cao) |
| Q5 | Làm guard Phantom trước chung kết? | **Không**: nó chỉ chứng minh dApp tử tế, dễ bị hiểu thành nói quá |

## 6 · Không làm (sẽ trông giả hoặc nói quá)

- Giấu Devnet hay mô phỏng để "trông thật".
- Gọi dữ liệu phát lại là "live mainnet", "mainnet-ready", "bảo vệ tài sản mainnet".
- Tạo ví demo mới hoặc ví riêng cho từng người khi chưa đổi quyết định 8.
- Gọi guard phía dApp là "bảo vệ khỏi dApp độc hại".
- Extension nửa vời; Lighthouse hay ghi on-chain trước chung kết.
- Biến SolBonus thành "dApp độc thật" mà không có nhãn.
