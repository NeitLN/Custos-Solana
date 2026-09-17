# Bàn giao phiên thực thi Custos

Đọc [roadmap Technical](../../ROADMAP-TECHNICAL-CUSTOS.md) — **đang thực hiện** — và
[tiến độ](TIEN-DO.md) trước khi làm. File này giữ ngữ cảnh có thể mất giữa các phiên;
trạng thái từng thẻ chỉ sửa ở TIEN-DO.md.

## Hiện trạng — 18/09/2026 (lát cắt A + CU-10/13/16/17/22/24)

**828 pass, 0 fail.** Cổng `kiem-san-pham` **11 đạt · 0 hỏng · 0 chưa rõ**;
`nop-bai --strict` **11/13**. 49 commit chưa push.

**DONE:** CU-00 · 05 · 08 · 09 · 10.
**PARTIAL:** CU-01 · 02 · 03 · 04 · 06 · 07 · 13 · 16 · 17 · 22 · 24.

### Ba lỗi THẬT tìm ra trong lượt này, không phải tính năng mới

1. **7 fixture đối chứng gán nhãn NGƯỢC** (CU-24). `R03/05/06/07/09/10/11-neg` ghi
   `cuc: "duong"` trong khi `kyVong.khongCoMa` nói rõ là đối chứng. **Test vẫn xanh**
   vì chúng đọc `kyVong`; hậu quả là manifest báo *"7 luật không có ca đối chứng"*
   trong khi cả 7 đều có. Cách tìm ra: phép đếm của tôi (theo `cuc`) mâu thuẫn với
   bài `capLuat` đang xanh (theo `kyVong`) — hai điều không thể cùng đúng.
2. **Lệch claim trong `DAC-TA-CORE.md`** (CU-17). Liệt kê **6 program** đã xác minh
   và có **SPL Memo**; registry thật **13 program**, **không có Memo** — sai cả hai
   hướng. Danh sách gõ tay lúc registry còn 6 rồi không ai sửa.
3. **`Buffer.from(s, "base64")` không bao giờ ném** (CU-10) — nó bỏ ký tự lạ, nên
   `"rác!!!"` báo nhầm thành *"không phải giao dịch Solana"*.

### Con số đo được

| | |
|---|---|
| Lệnh đọc được TÊN / hiểu HẬU QUẢ | **377 / 8** — khoảng cách là phần chưa hiểu |
| Program đọc tên / hiểu hậu quả | **13 / 2** |
| Luật có cả hai cực (sau sửa nhãn) | **14/14** |
| Coverage tách nhóm | 36 hiểu · **58 quen-chưa-đọc** · 12 lạ |
| Đầu vào sai chạm RPC | **0 lời gọi** |

### Bẫy mới, thêm vào danh sách cũ

- **Guard đọc mã phải tách chú thích** — tôi mắc lại đúng bẫy đã ghi: chú thích kể
  lại lỗi cũ bằng chính chuỗi bị cấm, guard khớp phải nó.
- **Không nhận diện thứ gì bằng số lượng** — bản đầu của CU-13 nhận diện SPL Token
  bằng `soLenh === 44`: đúng hôm nay, sai im lặng khi bảng đổi.
- **`n/n` trong tài liệu có thể là tỉ lệ, không phải ngày** — guard `lichThi` đỏ vì
  `deadline` + `5/5`.
- **Đọc hàm trước khi dựng đầu vào cho nó** — `tinhTienDatCoc` đọc lamports từ
  `facts.accounts`, không từ `tokenAccounts`.

**Thẻ tiếp theo đủ phụ thuộc:** CU-11 (receipt, cần CU-04+08+10 ✓) · CU-12 (replay,
cần CU-11) · CU-14/15 (Token-2022, cần CU-13 ✓) · CU-18 (policy, cần CU-02+07+17 ✓).

---

## Lịch sử — 18/09/2026 (lát cắt A đóng, CU-22)

**791 pass, 0 fail.** Cổng `kiem-san-pham` **11 đạt · 0 hỏng · 0 chưa rõ**;
`nop-bai --strict` **11/13**. 32 commit chưa push.

**DONE:** CU-00 · CU-05 · CU-08 · CU-09 (cổng lát cắt A).
**PARTIAL:** CU-01 · 02 · 03 · 04 · 06 · 07 · 22.

**Lát cắt A chạy được từ đầu đến cuối:** dán tx bất kỳ vào `soi.html` → mô phỏng
Devnet → hậu quả + coverage theo năng lực → bấm cảnh báo → thấy dữ kiện thật kèm
nguồn của nó. `soi-inspector.py` **26/26 PASS** trên Chromium thật.

**Con số đo được, không ước lượng:**

| | |
|---|---|
| Luật khai `bangChung` | **2/14 → 13/14** |
| Bằng chứng treo lơ lửng | **0/38 fixture**, phép kiểm đỏ được |
| Hit qua đường lui dò chuỗi | **1/75** (luật 14, không nhắc địa chỉ nào) |
| Dòng bảng có số thô | **48/56** |
| Coverage tách nhóm | 36 hiểu · **58 quen-chưa-đọc** · 12 lạ |
| Đầu vào sai chạm RPC | **0 lời gọi** (đếm bằng `page.on("request")`) |

**Năm lần tôi tự sai trong phiên, và cách bắt được — phần đáng đọc nhất:**

1. **Giả thuyết lifetime.** `replacementBlockhash` khác gốc trông như đo được
   blockhash hết hạn. Đếm 8 lượt blockhash tươi: **6 giống, 2 khác**. Nếu tin lượt
   đo đầu, Custos báo "hết hạn" cho 2/8 giao dịch bình thường.
2. **Một dòng code thừa** kèm chú thích nói sai nguyên nhân (`p.catch`). Đột biến:
   xoá đi không bài nào đỏ.
3. **Guard chỉ đỏ với một thứ tự đầu vào** — `chamTaiSan` thử lệnh chạm ở cuối.
4. **Heredoc ghi byte NUL thật** vào source ⇒ file thành binary với Git.
5. **Chép regex theo trí nhớ** — `"The operation was aborted"` trong khi Node 24 ném
   `"This"`. Test đỏ ngay.

**Hai lần probe sai, không phải sản phẩm sai:**
- chạy `?mock=` (file mock không có `chanDoan`) rồi kết luận trace hỏng;
- đòi trace hiện khi 0 cảnh báo, trong khi `Trace` trả `null` là **cố ý**.

**Một guard đỏ vì lý do sai:** `lichThi` khớp `deadline` rồi đọc tỉ lệ `5/5` thành
ngày. Nới **mẫu** (n/n hai vế bằng nhau là tỉ lệ), **không** nới điều kiện — và
chứng minh vẫn bắt được `19/09/2026` lẫn `5/9`.

**Bẫy kỹ thuật:**
- Dùng Write tool cho mọi chuỗi có escape; heredoc và chuỗi Python nuốt chúng.
- `VERIFIED_PROGRAMS` là **Map**, không phải Set.
- Guard đọc mã phải **tách chú thích trước khi tìm**.
- Guard gắn cứng con số phải đổi sang **đếm từ mã**.
- Nhật ký trong `<details>` đóng: `inner_text` không thấy cho tới khi mở.
- Thứ tự: sửa → commit → đo → commit biên bản → sinh release notes.

**Thẻ tiếp theo đủ phụ thuộc:** CU-10 (CLI, cần CU-08 ✓) · CU-11 (receipt, cần
CU-04+08+10) · CU-13 (registry decoder, cần CU-04+07 ✓) · CU-16 (SOL/phí, cần
CU-03+06 ✓) · CU-24 (corpus, cần CU-04 ✓).

---

## Lịch sử — 18/09/2026 (qua CU-07)

**775 pass, 0 fail.** Cổng `kiem-san-pham` **11 đạt · 0 hỏng · 0 chưa rõ**;
`nop-bai --strict` **11/13**. 19 commit chưa push.

**CU-00 DONE · CU-05 DONE · CU-01/02/03/04/06/07 PARTIAL.** Còn CU-08 (Inspector)
và CU-09 (UI bấm từ cảnh báo tới dữ kiện) để đóng lát cắt A.

**Con số đáng nhớ, tất cả đo được:**

| | |
|---|---|
| Luật khai `bangChung` | **2/14 → 13/14** (luật 14 là ngoại lệ có lý do) |
| Bằng chứng treo lơ lửng | **0** trên 38 fixture — và phép kiểm đỏ được |
| Hit đi qua đường lui dò chuỗi | **1/75** (luật 14, và nó không nhắc địa chỉ nào) |
| Dòng bảng có số thô | **48/56** |
| Coverage tách nhóm | 36 hiểu · **58 quen-chưa-đọc** · 12 chương trình lạ |

**Ba lần tôi tự sai trong phiên này, và cách bắt được:**

1. **Giả thuyết lifetime** — `replacementBlockhash` khác gốc trông như đo được
   blockhash hết hạn. Đếm 8 lượt blockhash tươi: **6 giống, 2 khác**. Cùng điều
   kiện, hai kết quả. Nếu tin lượt đo đầu, Custos báo "hết hạn" cho 2/8 giao dịch
   bình thường.
2. **Một dòng code thừa** — `p.catch(() => {})` kèm chú thích nói sai nguyên nhân.
   Đột biến: xoá đi không bài nào đỏ.
3. **Guard chỉ đỏ với một thứ tự đầu vào** — bài `chamTaiSan` thử lệnh chạm ở cuối,
   nên đột biến `ix.cham` (chỉ lấy lệnh cuối) lọt. Thêm ca lệnh chạm ở đầu.

**Bẫy kỹ thuật cần nhớ:**
- **Heredoc ghi byte NUL thật** vào source ⇒ file thành binary với Git, `grep` mù.
  Dùng Write tool cho mọi chuỗi có escape.
- `VERIFIED_PROGRAMS` là **Map**, không phải Set.
- Guard đọc mã phải **tách chú thích trước khi tìm**.
- Guard gắn cứng con số (`2/14`) phải đổi sang **đếm từ mã** — gắn cứng thì mỗi lần
  đổi lại sửa tay hai nơi, quên một nơi là đỏ vì lý do sai.
- Thứ tự: sửa → commit → đo → commit biên bản → sinh release notes.

**Thẻ tiếp theo đủ phụ thuộc:** CU-08 (Inspector) — cần CU-02/03/06/07, cả bốn đã có
phần dùng được.

---

## Lịch sử — 18/09/2026 (CU-00…CU-03)

**749 pass, 0 fail.** Cổng `kiem-san-pham` **11 đạt · 0 hỏng · 0 chưa rõ**;
`nop-bai --strict` **11/13**. Đang thực thi [`UPDATE-CUSTOS.md`](../../UPDATE-CUSTOS.md);
trạng thái từng thẻ ở bảng CU của [TIEN-DO.md](TIEN-DO.md).

**Đã xong:** CU-00 (baseline). **PARTIAL:** CU-01, CU-02, CU-03.

**Bốn lỗ hổng bảo mật thật, tất cả tái hiện trước khi sửa:**

1. **TOCTOU trong ví** — đọc `tx.message.serialize()` SAU khi `inspect()` await xong.
   Tái hiện: thay `serialize` trong cửa sổ await ⇒ neo ghi đúng bản tráo, và
   `khopNeo` lúc ký trả KHỚP (so bản tráo với chính nó). Sửa: chụp bytes ngay khi
   tx sinh ra, neo bằng bytes đã chụp, so bytes cuối lượt.
2. **`quaCu()` sống vô hạn** — `msToiDa` NaN/Infinity, và `kiemLuc` ở tương lai
   (tuổi âm không bao giờ > hạn). Cùng loại dữ liệu xấu với `Date.parse` NaN ngay
   trên, chỗ kia fail-safe còn chỗ này fail-open.
3. **Signer đồng bộ trong consumer tham chiếu** — ví từ chối ⇒ `daKy: true`; signer
   treo ⇒ `daKy: true`; double-click ⇒ signer chạy 2 lần; reject muộn ⇒ **sập tiến
   trình**. Sửa theo [ADR-0003](../adr/0003-signer-bat-dong-bo-va-phien-ky.md): async,
   **ba kết cục** (`da_ky`/`tu_choi`/`chua_ro`), khoá phiên đồng bộ trước await.
4. **Ngữ cảnh RPC nén thành một bit** — `simulationOk` không phân biệt được mô phỏng
   chạy trên blockhash nào. Thêm `Facts.nguCanh`.

**Hai lần tôi tự sai, và cách bắt được:**

- **Giả thuyết lifetime bị phép đo bác bỏ.** Lần đo đầu: blockhash tươi ⇒
  `replacementBlockhash` giống gốc; slot −300 ⇒ khác. Trông như phép đo lifetime hoàn
  hảo, suýt xây tính năng cảnh báo lên trên. Đếm lại **8 lượt blockhash tươi: 6 giống,
  2 khác** — cùng điều kiện, hai kết quả. Nếu tin lượt đầu, Custos báo "blockhash hết
  hạn" cho 2/8 giao dịch bình thường. **Một con số không lặp lại được thì không phải
  một con số.**
- **Một dòng code thừa kèm chú thích nói sai.** Tôi thêm `p.catch(() => {})` và giải
  thích "không có nó thì sập". Đột biến: xoá đi **không bài nào đỏ**. `Promise.race`
  đăng ký handler lên cả hai nhánh, và người gọi `await` trong try/catch cũng là
  handler. Lỗi thật là **không await gì cả**. Bỏ dòng thừa, sửa guard canh *tính chất*
  thay vì *cách làm*.

**Bẫy cần nhớ cho phiên sau:**
- Guard đọc mã phải **tách chú thích trước khi tìm** — bài "phiên đã tiêu" khớp phải
  chính câu văn nói rằng không chỗ nào gọi `daTieu.delete`.
- Chèn nhánh vào giữa `conDung()` và hai `setState` làm `c03Race` đỏ, và nó **đỏ
  đúng**. Phép kiểm mới phải đặt trước `conDung()`.
- Thứ tự đúng: sửa → commit → đo → commit biên bản → sinh release notes.

**Đo được cho CU-05:** `bangChung` mới có ở **2/14 luật**; `diff.ts:136` còn giữ
`detail.includes` làm đường lui cho 12 luật kia.

**Thẻ tiếp theo đủ phụ thuộc:** CU-04 (evidence graph) — cần CU-02+CU-03, cả hai đã
có phần dùng được.

---

## Hiện trạng — 17/09/2026 (sau merge giao diện)

**726 pass, 0 fail.** HEAD `516f744`, **cây sạch**, **34 commit chưa push**.
Cổng `kiem-san-pham` **11 đạt · 0 hỏng · 0 chưa rõ**; `nop-bai --strict` **11/13**, hai
ô còn lại đều không phải việc của máy: 4 câu chưa hỏi BTC, và chưa tạo tag.

**Đã pull 3 commit giao diện của Duy Anh** (`7493f07`, `2251d8f`, `27230a3` — 277 dòng
CSS, `App.tsx` +15/−15). Merge tự động sạch, thay đổi hai bên còn nguyên. Nhưng đó là
lần đầu người khác đụng vào bề mặt được đo, và nó lộ ra hai thứ:

**1 · Phép đo tràn ngang ĐỎ VÌ LÝ DO SAI.** 6 phép kiểm FAIL cùng lúc, cả bốn trang,
cả 375px lẫn 1440px, tất cả cùng đúng `-15px`. Con số giống hệt nhau ở mọi trang là
dấu hiệu không có gì tràn thật. Nguyên nhân: `scrollbar-gutter: stable` chừa chỗ thanh
cuộn bằng cách trừ vào `clientWidth`, `scrollWidth` không đổi — hiệu số thành **ÂM**, và
`soi-trinh-duyet.py` hỏi `tran == 0` nên gọi đó là tràn. Chứng minh bằng `add_style_tag`
tắt đúng một dòng CSS: cả bốn trang từ −15px về 0px.

Hai hướng sửa KHÔNG tương đương — bỏ `scrollbar-gutter` là làm sản phẩm xấu đi để phép
đo xanh. CSS của Duy Anh đúng; **phép đo của tôi sai**. Repo vốn đã có hai chuẩn cho
cùng một thứ: `soi-ban-phim-va-phong-to.py` hỏi `tran <= 0` cho đúng từ đầu. File chặt
hơn lại là file sai. Gom 4 chỗ gọi về `scripts/kiem-trinh-duyet/tran_ngang.py`, đột
biến xác nhận vẫn đỏ được kể cả tràn **1px**.

**2 · Một hồi quy thật, do probe bắt được:** `.address-pill { min-height: 34px }` cho
ra nút 150×38 — nút sao chép địa chỉ ví tụt từ **47px xuống 38px**. Trên ngưỡng cứng
WCAG 2.2 AA (24px) nên **axe vẫn xanh**, nhưng dưới mốc 44px dự án tự đặt. Nâng lên
44px → `soi-vung-bam` 26/26. Đây đúng là lý do bài này phải tách khỏi axe.

**3 · `toTien.ts` nói sai phạm vi.** Cổng in *"từ đó tới HEAD chỉ tài liệu đổi"* trong
khi ba commit vừa sửa CSS. Kết luận đúng (`laMa` cố ý không tính mã giao diện, vì lượt
live đo SDK gọi Devnet), nhưng câu chữ khai **mạnh hơn** thứ đã kiểm. Cùng họ với lỗi
`moHinhThat` và `BENCHMARK.md`. Sửa thành *"không đổi file nào trong phạm vi"*, kèm
`BAO-CAO-KIEM-CHUNG.md` vốn neo vào câu cũ.

**Bài học lặp lại lần nữa: test xanh không có nghĩa bằng chứng còn hiệu lực.** 726 test
xanh ngay sau merge, trong khi vùng bấm đã sập 9px. Không một test đơn vị nào chạm tới
được — chỉ trình duyệt thật mới thấy.

**Và: đo trên cây bẩn thì biên bản ghi sai SHA.** Lượt đầu đo khi CSS đã sửa nhưng chưa
commit, nên 10 biên bản ghi `sourceCommit` của bản CHƯA sửa. Dấu vết nội dung vẫn khớp
nên nội dung không sai, nhưng cổng báo CHƯA RÕ. Chạy lại cả 8 probe trên cây sạch, kết
quả y hệt — xác nhận dấu vết nói đúng. **Thứ tự đúng: sửa → commit → đo → commit biên
bản → sinh release notes.**

**Một lỗi trong chính công cụ đo, đã sửa.** `git()` ở `kiem-san-pham.ts` và `toTien.ts`
gọi `.trim()` trên toàn bộ output `git status --porcelain`, ăn mất khoảng trắng đầu
của **dòng đầu tiên**, nên `slice(3)` cắt vào tên file: `" M README.md"` thành
`"EADME.md"`. Hai hậu quả ngược nhau — cổng `git checkout` tên sai nên **không trả lại
file nó vừa làm bẩn**; còn `toTien.ts` đếm thiếu file mã bẩn nên có thể **nói giảm** về
mức bẩn của cây. Chỉ hỏng đúng một dòng (dòng đầu theo alphabet), nên tái hiện bằng
cách chạy lại không ra — phải đọc thẳng chuỗi trả về mới thấy. Guard
`tenFileBan.test.ts`, mutation 2 hướng đều đỏ.

**Bằng chứng UI phải chạy lại toàn bộ:** ba commit đổi giao diện làm dấu vết
`c90436fd → 7c7e5a44` (30 → 35 file). 8 probe chạy lại trên bản mới, tất cả PASS.
Hai biên bản `ban-trinh-dien` và `phong-van-vong-2` cố ý để lạc hậu — chúng thuộc
roadmap cũ, lạc hậu vì dấu vết đổi chứ không vì thứ chúng đo thay đổi.

**TB-V01 đóng phần local** (nguồn sạch); phần remote vẫn ở H02.

---

## Lịch sử — bàn giao Codex 16/09/2026

Bộ test: **719 pass, 0 fail** trên working tree sau bàn giao. HEAD `cdd53c1`; chưa commit/push.
Đọc [báo cáo hiện hành](../review/technical/codex-20260916/BAO-CAO.md) và bảng Technical trong TIEN-DO.md.
Đã có B07 live, pitch/deck Technical, video thật và gói review. TB-V01 vẫn PARTIAL do nguồn sạch; H01/H02 chờ chủ dự án/BTC.
Hai sửa code chính: consumer phải giữ neo từ lúc kiểm; cổng runtime bỏ qua khai báo kiểu/chú thích. Biên bản UI thêm số lỗi chức năng để phân biệt với vi phạm axe.
Các phần dưới là lịch sử, không phải hàng đợi hiện hành. Không dùng số lịch sử làm số hiện tại.

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

Review gói `docs/nop-bai/CUSTOS-REVIEW.zip` và thay đổi chưa commit. Sau commit chạy lại live/gates theo báo cáo hiện hành; xác nhận track/rubric/thời lượng với BTC. Không tự push/publish/nộp khi chưa được giao.
