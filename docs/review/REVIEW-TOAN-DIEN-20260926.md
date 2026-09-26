# Review toàn diện Custos — 26/09/2026

Phạm vi: **chỉ sản phẩm** — SDK (L1/L2/L3), CLI, ví mẫu, trang tấn công, luồng thực thi Devnet, gói phát hành,
kiểm thử. Mọi nhận định dưới đây đi kèm lệnh đã chạy hoặc vị trí trong mã. HEAD `e4973af` cộng 72 file chưa
commit (gồm các sửa theo phản biện Codex và luồng thực thi Devnet đang làm dở).

## 1. Kết luận

**Lõi sản phẩm vững và được canh tốt.** Ranh giới L1 → L2 → L3 được giữ trong mã thật (không chỉ trong tài
liệu), có test đột biến chứng minh; fail-safe hoạt động đúng ngay trong sự cố Devnet có thật hôm nay; gói SDK
cài được từ ngoài monorepo và chặn 10/10 bẫy đối kháng.

**Rủi ro lớn nhất nằm ở lớp trình diễn mới, không ở lõi.** Màn chính mới của ví (luồng thực thi, chưa commit)
là ngõ cụt với người không có khoá, làm hỏng 2/3 probe trình duyệt của CI, và dùng một cơ chế ký khác với phần
còn lại của ví. Thứ hai: toàn bộ luồng live phụ thuộc một endpoint RPC công cộng duy nhất — hôm nay nó ngừng
trả dữ liệu tài khoản hơn một giờ và mọi luồng live đều dừng.

## 2. Đã chạy gì, kết quả ra sao

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| `npm run typecheck` | **PASS** | |
| `npm test` | **1116–1117/1119** qua hai lượt | 2–3 bài CLI CU-18 gọi Devnet thật — đỏ vì sự cố Devnet, số bài đỏ đổi theo lượt (mục 3.4) |
| `thu-tich-hop:deterministic` | **14/14** | |
| `replay-rpc` (offline) | **19/29**, 0 hỏng | 10 mẫu mainnet chưa bao giờ có fixture |
| `doi-khang` (fuzz + 4 probe) | **đạt**, "không còn lỗi ngoài dự kiến" | 1 ca cố ý sai (mô phỏng người gọi cũ) |
| `thu-goi` — cài SDK từ ngoài monorepo | **đạt** · 10/10 bẫy đối kháng · CLI: `--help`→0, đầu vào sai→3 | core **0.1.1**, ai 0.2.0, types 0.1.1 |
| Build production 2 ứng dụng | **đạt** · quét rò rỉ khoá: 0/27 file | chunk trang tấn công 503 kB (cảnh báo Vite) |
| `npm audit` | 5 high, 0 critical | đã có xử trí ghi trong repo; gợi ý "sửa" của npm là hạ spl-token về 0.1.8 — không dùng được |
| Probe CI `soi-trinh-duyet.py` | **HỎNG** | bấm "Nhận quà tặng" — thẻ này nay bị khoá trên màn chính mới |
| Probe CI `soi-vung-bam.py` | **HỎNG** | cùng lý do |
| Probe CI `soi-boi-canh-x02.py` | **đạt** | lỗi in tiếng Việt trên console Windows là cục bộ |
| Duyệt tay 6 trang × desktop/mobile | 0 lỗi JS, 0 tràn ngang | ảnh chụp trong phiên review |
| Luồng live (mô phỏng 9 kịch bản, tấn công → ví) | **CHƯA KIỂM lại** | Devnet không trả `getAccountInfo`/`getMultipleAccounts` suốt lượt review; sáng cùng ngày: 9/9 và 4/4 |

## 3. Vấn đề cần sửa

Mức: **P1** hỏng luồng chính hoặc CI · **P2** nên sửa sớm · **P3** đánh bóng.

### 3.1 · P1 · Màn chính mới của ví là ngõ cụt với người không có khoá

`apps/demo-wallet/src/WalletExecution.tsx` (chưa commit) giờ là màn mặc định. Mở trang mà không có file khoá
(tức mọi người xem bản công khai): số dư "Chưa đo", "Gửi DEMO", "Ký tạo phiên thử nghiệm", "Nhận quà tặng",
"Mở dApp của phiên này" đều bị khoá; giữa màn là ô chọn file `.devnet/vi-demo.json`. Thứ Custos làm — đọc giao
dịch và cảnh báo trước khi ký — không thấy được ở màn đầu tiên. Kịch bản phân tích vẫn còn, nhưng nằm sau tab
"Phòng phân tích".

**Sửa:** không có khoá thì mở mặc định vào luồng phân tích (không cần ký), hoặc cho màn thực thi một chế độ
"xem trước" chạy `inspect()` trên giao dịch dựng sẵn mà không cần mở quyền ký. Chỉ hiện ô nạp khoá khi người
dùng chủ động chọn "thực thi thật".
**Nghiệm thu:** mở bản build không có khoá, bấm một lần là thấy một thẻ Custos có kết quả.

### 3.2 · P1 · Commit luồng thực thi như hiện tại sẽ làm đỏ CI

`deploy.yml` chạy `soi-trinh-duyet.py` và `soi-vung-bam.py` sau khi deploy. Cả hai bấm thẻ "Nhận quà tặng"
trên màn mặc định — thẻ đó nay bị khoá, và probe dừng sau 30 giây. **Sửa:** cập nhật hai probe cho màn mới
(hoặc cho chúng vào thẳng "Phòng phân tích"), chạy xanh trên máy rồi mới commit phần giao diện.

### 3.3 · P1 · Mọi luồng live phụ thuộc một endpoint RPC công cộng duy nhất

Đo trong lượt này: `api.devnet.solana.com` trả `getBalance` sau 0,16 giây nhưng **`getAccountInfo` và
`getMultipleAccounts` quá hạn liên tục hơn một giờ**; endpoint Devnet miễn phí khác đòi khoá hoặc trả 429.
Custos cần đọc tài khoản ở mọi lượt kiểm, nên ví, trang tấn công, CLI, ví dụ tích hợp đều dừng.

Cách sản phẩm xử lý **đúng**: ví báo "Không thể kiểm tra giao dịch… chưa thể kết luận giao dịch này an toàn"
sau 12 giây kèm Thử lại; trang tấn công báo "Devnet không trả lời… không phải kết luận gì về giao dịch" sau
9 giây kèm "Xem dữ liệu mẫu dự phòng". Không có đường nào ra "Bình thường".

**Sửa:** hỗ trợ danh sách RPC dự phòng (thử endpoint kế tiếp khi quá hạn); dùng một endpoint có khoá cho máy
trình diễn (`VITE_RPC` đã có sẵn); ví mẫu nên có đường lui dữ liệu mẫu giống trang tấn công.

### 3.4 · P2 · `npm test` không kín

`packages/core/test/cli.test.ts` (CU-18) gọi Devnet thật. Khi Devnet hỏng, bộ test đơn vị đỏ và chậm thêm
40 giây — không phân biệt được lỗi mã với lỗi mạng. **Sửa:** tách bài cần mạng sang `npm run test:live`, hoặc
cho CLI nhận `--rpc` trỏ tới RPC giả trong test. (Đã sửa một phần: lỗi đầu vào của CLI nay báo trước mọi lời gọi
mạng, có bài test chạy offline.)

### 3.5 · P2 · Hai cơ chế ký cho cùng một ví demo

- "Phòng phân tích" (`App.tsx` → `vi.ts`) ký bằng `VITE_DEMO_SECRET` trong `.env.development.local`.
- Màn thực thi (`WalletExecution.tsx`) ký bằng file keypair người dùng chọn trong trình duyệt.

`scripts/demo-wallet-config.ts` ghi *"Never put a secret key in … VITE_* env"* — trái với cơ chế đầu. Hai đường
nghĩa là hai bề mặt rò khoá và hai hành vi khác nhau cho cùng một nút "Ký". **Sửa:** chọn một. Đề xuất: bỏ
`VITE_DEMO_SECRET`, dùng một công cụ ký cục bộ tách khỏi trang, hoặc chỉ giữ cách nạp file.

### 3.6 · P2 · Nạp khoá riêng thô vào một trang web

Màn thực thi yêu cầu chọn file khoá riêng JSON. Trang có ghi "đọc tại trình duyệt, không gửi đi", và đây là
Devnet — nhưng một sản phẩm bảo mật dạy người dùng thả file khoá riêng vào trang web là thông điệp ngược với
chính nó. **Sửa:** tối thiểu, đặt cảnh báo "chỉ dùng ví Devnet cố định của đội; không bao giờ làm việc này với
ví thật" ngay tại ô chọn file; tốt hơn là mục 3.5.

### 3.7 · P2 · Mã luồng thực thi khó bảo trì

`WalletExecution.tsx` có 31 dòng dài hơn 200 ký tự (dòng dài nhất **1218** ký tự), `live/session.ts` có 24 dòng,
`LiveAttack.tsx` có một dòng 1605 ký tự; `WalletExecution.tsx` lẫn đuôi dòng CRLF và LF. Mã lõi thì không có
dòng nào quá 150 ký tự. `session.ts` gộp setup, đồng ý, ký, lưu trữ, khôi phục RPC và đối chiếu trong một
lớp. **Sửa:** định dạng lại (Prettier) rồi tách theo trách nhiệm — sau khi đã có đủ test hành vi.

### 3.8 · P2 · Số phiên bản gói core không phản ánh thay đổi

Hôm nay core thêm export (`cungLoaiHanhDong`, `quyenRutMoRong`) và đổi hành vi (luật 3 bắt nâng hạn mức, mint
không đọc được ⇒ `warning`, interpreter nhận bản sao). Gói vẫn là **0.1.1**. **Sửa:** nâng lên 0.2.0 và ghi
thay đổi hành vi trước lần phát hành kế tiếp — một đội ví đang ghim 0.1.1 cần biết verdict có thể đổi.

### 3.9 · P2 · Bundle lớn

Trang tấn công: một chunk **503 kB** (Vite cảnh báo). Ví: chunk `CanhBao` **351 kB** (web3.js). **Sửa:** tải
trễ phần cần web3.js; trang tấn công không cần toàn bộ SDK để hiện lời mời.

### 3.10 · P3 · Thời gian chờ trước khi báo lỗi mạng

12 giây (ví) và 9 giây (trang tấn công) trước khi người dùng biết mạng hỏng. Nên có dòng trạng thái tiến độ
sau 3–4 giây ("Devnet đang chậm…") thay vì im lặng tới lúc hết hạn.

### 3.11 · P3 · Điều hướng và trình bày

- Trang ví có hai thanh điều hướng chồng nhau ("Ví của bạn / Phòng phân tích" và "Giới thiệu / Ví mẫu /
  Inspector / Số liệu") cộng dải xanh; các trang khác không có — thiếu nhất quán.
- Bản điện thoại của ví dài **3206 px**; khối "Custos bên cạnh bạn" (giải thích sản phẩm làm gì) nằm cuối trang.
- Ô chọn file dùng điều khiển gốc của trình duyệt, hiện chữ tiếng Anh "Choose File / No file chosen".

### 3.12 · P3 · Tài liệu nhiều và số dễ trôi

86 file Markdown trong `docs/`. Số test ghi trong tài liệu là **1109**, thực tế **1119** — `npm run so-lieu`
đồng bộ được nhưng cần Devnet để chạy đủ. Nên chạy lại khi Devnet trở lại, trước khi commit.

### 3.13 · Còn mở từ trước

- 10 mẫu mainnet chưa có fixture replay (cần quyền đọc mainnet).
- F-04: danh sách cấm cho lời văn mô hình luôn thiếu với cách viết mới; đã có thêm neo đủ, chưa có tập giữ lại
  độc lập để đo tỉ lệ chặn nhầm / cho lọt.
- 5 lỗ hổng high trong phụ thuộc, 3 trên đường runtime (`@solana/spl-token` → `bigint-buffer`).

## 4. Điểm mạnh — đã kiểm, không phải cảm nhận

- **Fail-safe đúng trong sự cố thật.** Devnet ngừng trả dữ liệu tài khoản: ví và trang tấn công đều báo "chưa kết
  luận được", không đường nào ra "Bình thường".
- **Ranh giới L2/L3 là mã, không phải lời hứa.** Interpreter nhận bản sao dữ kiện; `level` chỉ từ L2; đột biến
  các ranh giới này làm test đỏ (4/4 phép đột biến của Codex, cộng các phép đột biến trong lượt sửa).
- **SDK dùng được từ ngoài.** Cài từ tarball trong thư mục trống, import bằng JS thuần, 10/10 bẫy đối kháng.
- **Lưu trữ trình duyệt sạch.** localStorage chỉ giữ địa chỉ công khai, kiểm hình dạng chặt lúc đọc lại; khoá
  của ứng dụng thử nghiệm chỉ nằm trong bộ nhớ; có khoá chống hai tab cùng ghi.
- **Không lộ khoá trong bản build** (27 file đã quét), và ví demo được khoá cố định bằng guard.

## 5. Trạng thái sửa — cùng ngày, sau review

| Mục | Trạng thái | Đã làm | Bằng chứng |
|---|---|---|---|
| 3.1 màn mặc định | **ĐÃ SỬA** | Mặc định mở "Phòng phân tích" (chạy không cần khoá); màn thực thi chỉ mở khi `?thucThi=1`; tab phân tích đứng trước | `walletSurface.test.ts` (3 bài); trình duyệt: tab mặc định "Phòng phân tích", 9 thẻ bấm được, 0 lỗi JS |
| 3.2 probe CI | **ĐÃ SỬA phần bấm** · chạy trọn chờ Devnet | Phòng phân tích đứng trước màn thực thi trong DOM, nên `.first` của probe trúng thẻ đúng | `soi-vung-bam.py` qua bước bấm; phần còn lại cần Devnet |
| 3.3 một RPC | **ĐÃ SỬA** | `scripts/rpcDuPhong.ts`: danh sách endpoint (`VITE_RPC_DU_PHONG`, chỉ DEV), chỉ lệnh ĐỌC chuyển endpoint, ưu tiên endpoint vừa tốt, mọi endpoint 429 thì trả 429 cho web3.js tự chờ. Nối vào ví, phỏng vấn, trang tấn công và luồng thực thi (dưới lớp thử-lại-429). Ví có thêm "Xem một thẻ mẫu đã ghi sẵn" khi lỗi mạng | `rpcDuPhong.test.ts` (7); đột biến "cho lệnh ghi chuyển endpoint" ⇒ đỏ |
| 3.4 test không kín | **ĐÃ SỬA** | Bài CU-18 chạy CLI qua RPC giả tại chỗ phát lại fixture `R01-pos` (`test/rpcGiaHttp.ts`) | `npm test` **1128/1128 trong 8 s khi Devnet đang hỏng** (trước: đỏ, 87 s) |
| — CLI sập khi thoát | **ĐÃ SỬA** (phát hiện khi làm 3.4) | `process.exit()` lúc kết nối keep-alive còn đóng làm Node/Windows sập ở libuv, mã thoát 3221226505 (6/6 lượt). Nay đặt `exitCode`, lưới an toàn 2 s | 6/6 lượt ra đúng mã 2 |
| 3.5 hai cách ký | **ĐÃ SỬA** | `vi.ts` thôi đọc `VITE_DEMO_SECRET` (khoá gỡ khỏi `.env.development.local`); ký thật chỉ ở màn thực thi bằng file. Mã gửi chết của phòng phân tích (`kyVaGui`, trạng thái gửi, `neoRef`) đã **gỡ khỏi `App.tsx`: 1476 → 1221 dòng**; nút ký tắt cứng, bật lại thì ném. 9 guard từng canh mã đó được **chuyển sang canh đường ký thật** (`live/session.ts`, `live/policy.ts`) thay vì xoá; thêm 2 bài chạy thật (neo quá cũ lúc ký bằng đồng hồ giả; đồng ý dùng một lần). `txCho` còn giữ vì nằm trong guard nhất quán của lượt kiểm | `viDemoCoDinh`, `c03Race`, `neo.test`, `liveDemo`; đột biến "bỏ kiểm quá cũ lúc ký" ⇒ đỏ |
| — T02 mất ở đường ký mới | **ĐÃ SỬA** (phát hiện khi chuyển guard) | `live/session.ts` tự đọc `maBase58(t.signatures[0]!)` ở cả hai chỗ gửi — mất bản vá T02: giao dịch chưa ký đủ sẽ ra ID toàn "1". Nay dùng `chuKyDauTien()` chung trong `gui.ts` | `gui.test.ts`: hàm trả `null` với chữ ký toàn 0; mọi `guiGiaoDich` trong session dùng nó |
| 3.6 nạp khoá vào web | **ĐÃ GIẢM** | Cảnh báo ngay tại ô chọn file: chỉ ví Devnet cố định, không bao giờ ví thật | trình duyệt |
| 3.7 mã đặc | **ĐÃ SỬA** | Prettier một lần trên các file luồng thực thi (chưa từng commit): dòng dài nhất 1218 → 208, 1605 → 143 ký tự; bỏ lẫn CRLF/LF. Tách logic thuần khỏi `LiveSession` sang `live/quanSat.ts` (dựng dự báo, dựng quan sát, quy quyền cho giao dịch); `canBoQua` về `live/policy.ts`. `session.ts` 908 → 812 dòng; hai hàm vốn không có test riêng nay có 5 bài | `quanSat.test.ts`; đột biến "quy quyền khi chưa đọc được tài khoản" ⇒ đỏ |
| — `txCho` | **ĐÃ GỠ** | Trạng thái "giao dịch nút Ký sẽ ký" không còn ai dùng sau khi gỡ đường ký. Guard C03 giữ nguyên ý định cho `ketQua`: chỉ ghi từ lượt hiện tại, không gì xen giữa | `c03Race.test.ts` |
| 3.8 phiên bản | **ĐÃ SỬA** | core 0.1.1 → **0.2.0**, ai 0.2.0 → **0.3.0**, ai phụ thuộc core `^0.2.0` (ai nay dùng `quyenRutMoRong` — phát hành với `^0.1.0` sẽ hỏng lúc import); CHANGELOG cho hai gói | `thu-goi`: cài 0.3.0 + 0.2.0 từ ngoài, 10/10 bẫy |
| 3.9 bundle | **ĐÃ SỬA** | Trang tấn công tách `@solana` ra chunk riêng: 503 kB → 219 + 282 kB, hết cảnh báo. Lần tách đầu (cả `buffer`, `bn.js`) làm **trắng trang** — bắt được nhờ chạy bản build thật | bản build: nút hiện, 0 lỗi JS |
| 3.10 chờ im lặng | **ĐÃ SỬA** | Sau 4 s chờ, ví và trang tấn công hiện "Devnet đang trả lời chậm…" | bản build trang tấn công: dòng hiện sau 6 s chờ |
| 3.11 trình bày | **ĐÃ SỬA** | Ô chọn file: nút tiếng Việt, viền focus bàn phím. Thanh "Phòng phân tích / Ví của bạn" không còn tràn toàn chiều rộng trên header: nay là bộ chuyển trong trang, ngay dưới header — trang ví có một header như mọi trang. Điện thoại: khi có yêu cầu ký hoặc kết quả, cột xem xét lên TRƯỚC cột ví; lúc rảnh bỏ hình trang trí (3206 → 3125 px — phần dài còn lại là cột ví, nội dung thật) | trình duyệt 1440/375 px × hai màn: bộ chuyển dưới header, 0 tràn ngang, 0 lỗi JS |
| 3.12 số trôi | **ĐÃ SỬA** | `npm run so-lieu`, release notes, deck: 1128 test | guard số liệu xanh |
| Luồng live | **ĐÃ KIỂM** qua endpoint Devnet thay thế | `api.devnet.solana.com` treo `getAccountInfo`/`getMultipleAccounts` **hơn 18 giờ** với máy này, trong khi endpoint Devnet khác (OnFinality public) trả `getMultipleAccounts` sau 0,6 s và testnet bình thường ⇒ nhiều khả năng giới hạn theo IP, không phải Devnet sập. Kiểm bằng `CUSTOS_RPC`/`VITE_RPC` trỏ endpoint đó (chỉ đặt cho tiến trình, không ghi vào repo). `mo-phong-kichban-devnet.ts` nay nhận `CUSTOS_RPC` | Mô phỏng Devnet **9/9, 0 lệch** · trang tấn công → ví **4/4** + 2 ca lỗi · `soi-trinh-duyet`: 22 PASS; 11 FAIL đều quy được về endpoint thay thế (429 khi probe bấm dồn; probe chặn đích danh `api.devnet` nên ca "mất mạng" không bị chặn). Đo tay đúng ca đó với host đang dùng: RPC treo ⇒ "Devnet chậm" sau 4,2 s, thẻ lỗi sau 12,4 s, không bao giờ "Bình thường" · `soi-boi-canh-x02` đạt · `soi-vung-bam` chưa chạy trọn (429). Chạy lại ba probe CI trên endpoint không bị giới hạn là việc còn mở |

### Việc làm thêm sau review

| Việc | Kết quả | Bằng chứng |
|---|---|---|
| **Ca CPI đầu-cuối** (hậu quả giấu trong CPI của chương trình lạ) | Giao dịch nhìn từ ngoài chỉ có MỘT lệnh tới chương trình lạ; `SetAuthority` nằm trong CPI ⇒ **Nguy hiểm**, bảng có dòng đổi chủ, nói có chương trình chưa xác minh. Đối chứng: cùng chương trình lạ, CPI chỉ chuyển 1 token ⇒ **Cần xem kỹ**, không cáo buộc. RPC giả — ghi rõ giới hạn trong test | `packages/core/test/cpiDauCuoi.test.ts`; đột biến "luật 1 chỉ bắt khi lệnh ngoài cùng đọc được" ⇒ đỏ |
| **Ca CPI thật trên Devnet** (lành, không viết chương trình nào) | Associated Token tạo tài khoản: 4 lệnh lồng (`getAccountDataSize`, `createAccount`, `initializeImmutableOwner`, `initializeAccount3`) — đọc hiểu cả 4, coverage 5/5, **Bình thường**. Chỉ mô phỏng, không ký, không gửi | `npm run cpi-devnet` → `CPI-DEVNET-OK` |
| **Fixture mainnet** (chủ dự án cho phép đọc mainnet, 26/09) | 10 mẫu `MN-01…10` capture bằng endpoint mainnet, chỉ đọc + mô phỏng ⇒ replay **29/29**, 0 hỏng, tất định. Cả 10 mô phỏng HỎNG hôm capture (ALT đã đóng / `AccountNotFound` / lỗi chương trình) — fixture ghi đúng sự thật đó. Runner sửa một lỗi thật: phép kiểm độ nhạy `__loi` chỉ đổi bản ghi lỗi ĐẦU TIÊN, nên mẫu có lỗi ALT trước lỗi mô phỏng bị báo "không nhạy" oan — nay mỗi bản ghi lỗi một biến thể. Tập tính chất B05 đo lại hai mutation: P1 14/14 → 5/14, P2 14/14 → 0/14; P3 vẫn **CHƯA** chứng minh | `npm run replay-rpc` · `npm run danh-gia-b05` · guard cụm cluster trong `replayRpc.test.ts` nay đòi mẫu mainnet ↔ endpoint mainnet |
| **Trang điện thoại** | Lúc rảnh ẩn thêm danh sách ba bước (trùng thanh bước 01–02–03): **3206 → 3057 px**. Phần còn lại là việc người dùng phải làm (nạp SOL, mở quyền ký, tạo phiên) — không giấu | đo từng khối ở 375 px |

## 6. Thứ tự đề xuất (bản gốc, trước khi sửa)

1. Sửa 3.2 (probe CI) và 3.1 (màn mặc định cho người không có khoá) **trước khi** commit luồng thực thi.
2. 3.3: thêm RPC dự phòng / endpoint có khoá cho máy trình diễn; đường lui dữ liệu mẫu cho ví.
3. 3.5 + 3.6: gộp về một cơ chế ký.
4. 3.4: tách test cần mạng.
5. 3.8: nâng phiên bản core trước lần phát hành kế tiếp.
6. 3.7, 3.9, 3.10, 3.11 khi đã ổn định.
