# Bàn giao phiên thực thi Custos

Đọc [roadmap Technical](../../ROADMAP-TECHNICAL-CUSTOS.md) — **đang thực hiện** — và
[tiến độ](TIEN-DO.md) trước khi làm. File này giữ ngữ cảnh có thể mất giữa các phiên;
trạng thái từng thẻ chỉ sửa ở TIEN-DO.md.

## Hiện trạng — phiên Technical, HEAD `780cf6d`

**Đang làm roadmap Technical** sau khi chủ dự án cho biết BTC đã cho phép đổi track.
Roadmap trước (`ROADMAP-CLAUDE.md`) đã đóng phần khả dụng; lịch sử giữ nguyên.

- **Bộ test: 707 pass, 0 fail** (đo 15/09; lượt 12/09 ở [g00](../review/technical/g00-20260912-024738/BAO-CAO.md) cho 690).
  Con số **451** ở bản trước của dòng này là số của một lượt đo cũ và đã lạc hậu — đó
  chính là **T04-c**. Số lịch sử chỉ được giữ khi gắn rõ bản mã/ngày.
- **Bốn lỗi mới đang mở: T01–T04.** Đều đã **tái hiện lại** ở G00 chứ không chép kết
  luận của review. Probe theo Git: `scripts/ky-thuat/probe-gui-t01-t02.ts` —
  **2/5 ca nói đúng sự thật**.
- Đã nghiệm thu ở roadmap Technical: **TB-G00, G01, G02, C01–C06, L01, D01, S01–S03, B01–B06, X01–X03, I01–I03, P01–P02** — 28 thẻ, trong đó **I03 chỉ đóng phần local**. **Nhánh G, C, S, X, P đóng hết; nhánh I đóng hết phần Claude làm được; nhánh B chỉ còn B07 (cần Devnet).**
- **Việc tiếp theo: TB-D02** (pitch Technical) — phụ thuộc `D01, X03, I02` đều đã DONE.
  **TB-B07** cần Devnet · **TB-H01/H02** cần chủ dự án · phần remote CI của I03 nằm
  trong H02 · **TB-V01** còn thiếu B07, và D03/D04/V02 đứng sau nó.
- **Tôi đã viết nhầm "không còn thẻ nào Claude làm một mình được" vào cả hai sổ**, rồi
  tự bắt lại khi đếm thẻ chưa DONE. Sai vì đọc bảng thay vì đọc thẻ — đúng cách mà cùng
  câu đó đã sai hồi 12/09. Xem cảnh báo ở `TIEN-DO.md`.
- **TB-P02 xong, và kết luận không phải "đã tối ưu".** Bottleneck lớn nhất — retry của
  RPC công cộng, 3,4× và r = 0,84 — **ngoài tay đội**. Thứ sửa được là một vòng RTT
  thừa: `fetch.ts` đọc `AccountInfo` của mint thiếu bằng một lượt RPC rồi **vứt đi**,
  vì phần ký hiệu token tra `allKeys.findIndex(...)` mà đúng nhóm mint ấy theo định
  nghĩa không có trong `allKeys` (14/14 fixture xác nhận). Kết quả: **93 → 81** lượt
  RPC (−12,9 %), và mint Token-2022 đọc được ký hiệu ngay thay vì rơi xuống PDA
  Metaplex nơi nó thường trống — **nhanh hơn VÀ đúng hơn**.
- **`maxRetries` nay tường minh** (`RETRY_MAC_DINH = 2`), đóng việc `NGAN-SACH-RPC.md`
  tự ghi là "chưa làm". **Không hạ giá trị** — guard canh cả hai chiều, vì hạ nó xuống
  0 làm số chi phí đẹp hơn và sản phẩm kém chịu lỗi hơn đúng lúc gặp 429.
- **`so-baseline` chạy lại SAU khi sửa** (0/5 lệch), không chép số của lượt trước. Đây
  là thứ tôi suýt bỏ qua — ghi lại vì nó đúng loại lỗi phiên này đã gặp ba lần.
- **TB-X03 xong: 10 probe trình duyệt chạy lại trên mã hiện tại**, tất cả PASS, dấu vết
  giao diện `c90436fd`. Bằng chứng cũ đo trên `780cf6d` đã lạc hậu vì phiên này sửa
  `SoLieu.tsx` và `locNhatKy.ts` — **phải chạy lại, không tin số cũ**, đúng bài học I01.
- **Lỗ bằng chứng của X03, và bản vá tự sinh lỗi mới.** Bốn probe chỉ `print` rồi thoát,
  không để lại biên bản nào. Thêm `ghi_bang_chung` cho cả bốn — rồi
  `soi-yeu-cau-va-huy.py` ghi ra `soKiem: 0` kèm `dat: true`, vì nó in trực tiếp ở hai
  khối thay vì đi qua hàm gom. **Một biên bản nói "đạt" với 0 phép kiểm tệ hơn không có
  biên bản:** không có thì người đọc biết là chưa đo, có mà rỗng thì cổng xanh và câu
  hỏi tắt luôn. Guard `bangChungA11y.test.ts` quét cả thư mục nên probe thứ 11 tự được canh.
- **SỐ ĐỘ TRỄ TRÔI LẦN THỨ HAI.** P01 sửa `~850 ms` → 1596/3874/3877; lượt đo 15/09 cho
  trung vị **1351 ms**, p95 quan sát **5359 ms**, cao nhất **8896 ms**, dao động **10,6×**.
  Cùng bản mã, cùng máy — thứ đổi là RPC công cộng. **Trung vị ổn định (1351 ở cả hai
  phiên n=30); phần đuôi thì không hứa được.** Gốc là ba chỗ công bố đều gõ tay, **0 neo**.
  Đã thêm trường `hieuNang` vào `so-lieu.json` + 6 mốc đồng bộ + 6 neo `NEO_DONG_BO`.
- **"Điểm ngoại lai là retry" nay có số, không còn đọc bằng mắt:** tách 30 lượt theo số
  RPC — 19 lượt 7 RPC trung vị **852 ms**, 11 lượt >7 RPC trung vị **2875 ms**, chênh
  **3,4×**, Pearson **r = 0,84**. Phép tách nằm trong `tao-so-lieu.ts` nên mỗi lượt đo
  sau tự có con số ấy.
- **Bốn file mã nguồn bị Git coi là NHỊ PHÂN** (`Bin 0 -> 4454 bytes`): `locNhatKy.ts`,
  `locNhatKy.test.ts`, `fuzz-s02.ts` mang byte điều khiển **thô** trong fixture — đúng
  chủ ý vì chúng kiểm việc lọc đầu vào xấu, nhưng NUL làm Git phân loại cả file là nhị
  phân ⇒ không diff, không review trên GitHub được. Đổi 13 byte sang escape; ngữ nghĩa
  lúc chạy không đổi, test vẫn 6/6.
- **TB-I03 đóng phần LOCAL, phần remote để mở** — đúng quy tắc trạng thái thẻ định
  trước, không gộp hai thứ vào một ô DONE. CI nay ba tầng: **tất định** (`check` ·
  `replay-rpc` · `doi-khang` · `thu-tich-hop:deterministic` · chặn rò rỉ khoá — chặn
  deploy) · **browser** và **live Devnet** (cả hai `workflow_dispatch`, chạy tay).
  Tách vì hai tầng sau đỏ được vì lý do KHÔNG phải lỗi sản phẩm: Chromium tải hỏng,
  RPC công cộng chậm. Rà trước: **5/14 tiêu chí thiếu**; sau: **14/14**.
  **Chưa chạy remote lần nào** — chưa có quyền push, nên không có URL run nào để dẫn.
- **Hai lần trong phiên này tôi viết guard ĐỎ VÌ LÝ DO SAI**, cùng một hình dạng:
  neo vào một mẫu chung thay vì vào đúng vùng cần soi. (a) `indexOf("<GioiHan")` bắt
  khối đầu trong **sáu** khối của `SoLieu.tsx` — khối nói về cohort, cách mục eval 190
  dòng. (b) `/^  [a-z0-9-]+:$/` trên cả `deploy.yml` bắt trúng `  push:` trong khối
  `on:`, và `indexOf("npm run check")` bắt trúng **chú thích giải thích thứ tự** thay
  vì bước thật — ba bài đỏ, không bài nào chỉ vào lỗi có thật.
  **Guard đỏ vì lý do sai nguy hiểm ngang guard không đỏ được:** người sửa sẽ chiều nó
  ở đúng chỗ nó chỉ, tức làm hỏng một chỗ vô can, hoặc xoá lời giải thích thay vì sửa lệnh.
- **Bộ test nay 707** (thêm 6 bài `evalMoHinhThat` + 11 bài `ciBaTang`). Deck, release
  notes và `so-lieu.json` đã sinh lại; `npm run so-lieu` chạy trọn vẹn và **idempotent**
  (lượt thứ hai không đổi file nào).
- **HEAD `780cf6d` ĐỎ 11 TEST — phát hiện 15/09, đã sửa, chưa commit.** Tái hiện: khôi
  phục `apps/demo-wallet/public/so-lieu.json` bản HEAD rồi chạy test ⇒ **11 bài đỏ**
  (số xanh của lượt tái hiện đó cố ý không ghi ra đây: một con số "N pass" của một
  lượt dựng lại lỗi sẽ bị đọc thành số hiện tại — đúng hình dạng T04-c).
  Nguyên nhân là **lỗi thứ tự** trong `a0f2c91`: file số liệu sinh TRƯỚC khi
  tài liệu cập nhật, nên nó giữ ảnh chụp cũ (`test.pass: 487`, `msMotLuot: 664`,
  `moHinhThat: "BLOCKED_BY_SECRET"`) trong khi README/ADR/PITCH/deck đã nói số mới.
  Chú thích `deploy.yml:53-63` cảnh báo đúng bẫy này nhưng chỉ ép thứ tự **trong CI**.
  Cách chạy đúng là `npm run so-lieu` (đo rồi mới đồng bộ), không gọi lẻ từng script.
- **Năm bề mặt nói ĐỘI CHƯA làm một việc đội ĐÃ làm** — lượt eval mô hình thật chạy
  11/09 (`moHinhThat.trangThai: "đã đo"`), nhưng `SoLieu.tsx` (trang công khai),
  `AI-EVALUATION.md`, `README.md`, `kiem-nop-bai.ts` và `docs/nop-bai/README.md` đều
  gõ tay "chưa đo". Trang số liệu tự mâu thuẫn cách nhau hai dòng: *"Chưa đo với mô
  hình thật … đánh dấu `đã đo` trong dữ liệu"*. Hướng sai là **nói giảm** — nhưng thể
  lệ phạt "trình bày sai" không phân biệt chiều, và ô trống giả trong checklist nộp
  bài dẫn tới quyết định sai của chính đội. Đã sửa cả năm; guard mới
  `packages/core/test/evalMoHinhThat.test.ts` (6 bài, **mutation 5 hướng đều đỏ**).
- **Một mốc đồng bộ gãy vì chính tôi.** Sửa câu *"Tất cả nằm trong `src/tich-hop.js`"*
  (nay sai do I02) mà không tra ai neo nó — đó là mốc regex của
  `dong-bo-so-tai-lieu.mjs:243`, và `NEO_DONG_BO` không có dòng này nên `check` vẫn
  xanh. Lượt `npm run so-lieu` kế tiếp ném lỗi **giữa chừng, sau khi đã ghi
  `README.md`** — một lượt đồng bộ ghi nửa vời, không dấu hiệu nào trên cây làm việc.
  **Bài học dùng lại được: trước khi sửa một dòng tài liệu, grep xem script nào neo nó.**
- **Số hiện tại sau khi đồng bộ đúng thứ tự:** **707 test · 0 fail** · `inspect()`
  **656 ms** (trung vị 10 lượt, `lichSuPass`) · cài→kết quả đầu **12 giây** ·
  `moHinhThat: "đã đo"`. Deck và release notes đã sinh lại cho 696.
  Dấu vết: `so-lieu.json` `087c34ff` → sau sync đổi tiếp · guard `b48b1429`.
- **Consumer nay có HỢP ĐỒNG KÝ** (I02): `vi-du-tich-hop/src/ky.js`. Trước đó `tich-hop.js` dừng ở
  quyết định `cho`/`lyDo` — không có ai ký, nên câu "signer không được gọi khi chặn" không kiểm được.
- **Năm chốt trước khi signer được chạm vào:** CHẶN · HỎI chưa đồng ý · `khopNeo` (dApp tráo giao
  dịch giữa lúc kiểm và lúc ký) · `quaCu` · rồi mới ký. `nguoiDungDongY` mặc định `false` — quên
  truyền cờ thì KHÔNG ký.
- **Hợp đồng ký ở file riêng có chủ ý:** `dongMaTichHop` đếm đúng `tich-hop.js` và công bố ở sáu
  chỗ; `tich-hop.js` giữ nguyên **30 dòng**. Policy là của consumer, SDK chỉ trả thông tin.
- **SỐ HIỆU NĂNG CÔNG BỐ ĐÃ SAI VÀ ĐÃ SỬA** (P01): `~850 ms` là trung vị của **4 lượt** sau khi
  bỏ lượt đầu. Đo lại 30 lượt cho **trung vị 1596 ms**, p95 quan sát **3874 ms**, dải 834–3877 ms
  (dao động 4,6×). Sửa ở `HIEU-NANG.md`, `README.md`, `ADR-0001` — ba chỗ đều gõ tay, không có
  anchor đồng bộ, nên chúng trôi im lặng.
- **Lượt hỏng từng biến mất khỏi phép đo:** vòng đo `continue` im lặng khi timeout. Nay ghi
  `luotHong` kèm lý do và `tyLeHoanTat` — lượt 14/09 đạt 30/30, 0 hỏng.
- **Playwright + Chromium 149 đã cài trong phiên này** — 16 probe trình duyệt của repo nay chạy được.
- **`npm run thu-goi` xanh 6/6 trên mã hiện tại** (I01): JS thuần chạy bằng `node` trần, `tsc` với
  `strict`+`skipLibCheck:false` OK, **10/10 bẫy đối kháng bị chặn**, 3 ca đối chứng đi lọt đúng.
  Bằng chứng cũ đo 12/09 **không phủ** mã phiên này, nên phải chạy lại — không tin số cũ.
- **Probe X02 đã chạy trên Chromium thật và xanh**, mutation 3 hướng đều đỏ. Nó bắt được ba lỗi,
  và **cả ba là của chính probe** — đó là lý do phải chạy thật thay vì tin bài đọc mã.
- **Probe X02 đã viết:** `scripts/kiem-trinh-duyet/soi-boi-canh-x02.py` — chạy offline bằng
  `?mock=danger` và `?mock=safe`, không cần Devnet. Kiểm: khối bối cảnh đóng sẵn, mock KHÔNG
  được dán nhãn "chạy thật", dòng Dấu vết tới được người xem, ca đối chứng không hiện Nguy hiểm,
  nút huỷ mobile ≥44px.
- **`npm audit` đã chạy lại 14/09:** 0 critical · **5 high** · 0 moderate — khớp nguyên văn
  `docs/PHU-THUOC.md`. Cả 5 high đều dải `*` hoặc dải mở, tức **chưa có bản vá thượng nguồn**;
  6 moderate đã biến mất nhờ `overrides`. Không chạy `npm audit fix --force`.
- **Chưa kiểm trong phiên này:** Devnet live (TB-B07), thiết bị thật,
  WebKit/Firefox. Bộ axe đã chạy lại trên mã hiện tại: **PASS toàn bộ**.
- Chưa push. Quyền đã được cấp trong phiên: đọc/sửa code/UI/test/script/tài liệu,
  chạy kiểm thử, build, tạo artifact cục bộ, commit cục bộ. **Chưa được** push,
  publish, deploy, liên hệ bên ngoài, gọi API tính phí, ký/gửi giao dịch thật.

### Bốn lỗi T01–T04 — ĐÃ ĐÓNG HẾT trong phiên 12/09

Mỗi lỗi có **tái hiện trước khi sửa** và **phép đo sau khi sửa**, không chép kết luận
của review.

| Mã | Vấn đề | Bản sửa | Bằng chứng |
|---|---|---|---|
| **T01** | Xác nhận chứa `err` vẫn báo `thanhCong`; response sai cấu trúc cũng vậy | pha `thatBaiXacNhan` + `docKetQuaXacNhan()` đọc **nội dung** phản hồi | probe 2/5 → 6/7 ca đúng; đột biến 5 bài đỏ |
| **T02** | Mất phản hồi gửi bị khẳng định là "chưa gửi đi" | `chuKy?` lấy chữ ký **trước** khi gửi; `maBase58` tự viết | 200 mẫu đối chiếu `bs58`/`PublicKey`, 0 lệch |
| **T03** | `npm run check` ghi đè `data/eval/ai-ket-qua.json` | tách `scripts/eval-ai-so.ts` (module thuần) | hash **không đổi** quanh `check`, exit 0 |
| **T04** | Bốn phát biểu tài liệu mạnh hơn bằng chứng | tách 1 trường thành 3; bỏ đếm lượt bằng tay; 451→520 | `t04Claim.test.ts` 5 bài, đã kiểm phủ định |

**Thêm TB-C03** (không thuộc T01–T04, roadmap yêu cầu): ba khoá `ref` chống race và
gửi lặp. Ba tầng bằng chứng — cơ chế, đường dây, hành vi thật trên Chromium.

### Bốn sai số của chính tôi trong phiên này — ghi lại vì chúng dễ lặp

1. **Suýt viết một lỗi im lặng.** Chỗ mã base58, bản đầu ghép hai `PublicKey` 32 byte
   — sai, base58 không mã hoá theo khối. Chữ ký sinh ra không tra được trên Explorer,
   và nhánh đó **chỉ chạy khi mạng hỏng** nên gần như không ai phát hiện.
2. **Guard theo chuỗi hỏng lần thứ tư.** Bài "module thuần không dùng `process.exit`"
   đỏ vì chính dòng chú thích ghi quy tắc. Một phép kiểm theo chuỗi không phân biệt
   được "dùng X" với "cấm X".
3. **Guard không đỏ được, lần thứ năm.** Bài đếm số test dùng regex `**487 pass`
   trong khi dòng thật là `**Bộ test: 487 pass` — quét một mẫu không tồn tại, luôn
   xanh. Regex viết theo **trí nhớ** về định dạng thay vì theo dòng thật.
4. **Kết luận sai vì đột biến không được áp dụng.** `.Replace()` với chuỗi chứa
   `\r\n` trong khi file lưu LF ⇒ không khớp, và tôi kết luận nhầm "probe không đỏ
   được" trong khi chưa đo gì. **Khi phép kiểm phủ định cho kết quả bất ngờ, việc đầu
   tiên là xác minh đột biến có thật sự vào file.** (Gặp lại lần hai ở TB-S01, lần đó
   `perl` không khớp và tôi kiểm ngay thay vì đoán.)
5. **Nói sai về thư viện.** Bản đầu `NGAN-SACH-RPC.md` viết *"web3.js v1 không nhận
   `AbortSignal`"*. `grep` ra **hai** chỗ có — chỉ là ở `confirmTransaction` strategy
   và `sendAndConfirmTransaction`, không ở chặng nào Custos gọi. Kết luận cuối không
   đổi nhưng lý do phải đúng: một phát biểu sai về thư viện bị bác trong ba giây, và
   lúc đó cả trang mất uy tín chứ không chỉ một dòng.

### Hai phát hiện đáng ghi từ việc ĐỌC code

- **IDL giả không phải đường tấn công runtime** (TB-S01). Bảng mã lệnh đóng băng lúc
  build; lúc chạy không có lượt tải IDL nào để đầu độc. Rủi ro chuyển sang chuỗi cung
  ứng ở thời điểm build, và nó có mốc thời gian ghi trong file.
- **`boiThoiHan` rò rỉ timer** (TB-C05). 10 lượt để lại **đúng 10** handle `Timeout`.
  Không làm gì hỏng ngay, nhưng giữ event loop sống nên tiến trình CLI không thoát
  được. `coHan` đã dọn đúng từ đầu — hai hàm cùng mục đích, một cái sạch một cái
  không, và chỉ phép đo mới thấy.

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
- **Đừng gõ `\` vào regex qua heredoc của Bash.** Một tầng shell nuốt mất nó ba lần trong phiên này: hai lần làm script không parse (thấy ngay), một lần biến regex thành thứ không bao giờ khớp (KHÔNG thấy — guard xanh vĩnh viễn). Dựng bằng `String.fromCharCode(92)`, hoặc sửa bằng công cụ Edit.
- **Thể lệ có BA định dạng pitch khác nhau**, không phải một: Zoom 5+2 · Vòng Loại Toàn Quốc 4+2+1 · Chung kết 5+3 (đèn vàng phút 4). Tôi đã suýt «sửa» bản 4 phút thành sai vì đọc nhầm một dòng — `PITCH-VA-PHAN-BIEN.md` mục 2 nay có bảng cả ba.
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
