# Hiệu năng — đo ở chỗ người dùng đứng

**Việc D03 của [`docs/roadmap/ROADMAP-CLAUDE.md`](roadmap/ROADMAP-CLAUDE.md).**

Repo đã có số đo độ trễ, nhưng chúng đo **Node gọi thư viện**. Người dùng không sống
ở đó: họ mở một trang, bấm một cái nút, và chờ một tấm thẻ hiện ra.

Trang này đo ba thứ đó, trên **bản dựng production**, và tách chúng ra vì chúng hỏng
vì lý do khác nhau.

---

## 1 · Hai tầng đo, đừng lẫn

| | Đo cái gì | Nguồn |
|---|---|---|
| **SDK** | `npm install` → kết quả đầu, một lượt `inspect()`, từng chặng blockhash/mô phỏng | `data/tich-hop/ket-qua.json` |
| **Trình duyệt** | tải trang, bấm → thẻ kết quả hiện ra, số lượt RPC mỗi lần kiểm | `data/hieu-nang/do-tre.json` |

Số của tầng dưới **không** thay được số của tầng trên. Một lượt `inspect()` 680 ms
không có nghĩa người dùng thấy kết quả sau 680 ms — còn tải bundle, dựng màn hình, và
những lượt RPC mà tầng SDK không đếm.

---

## 2 · Đo được

**Bản dựng production** (`vite build` + `vite preview`), Chromium headless, mạng thật
của máy chạy, không bóp băng thông.

### Tải trang

Số dưới đây lấy từ `data/hieu-nang/do-tre.json` của phiên **25/09** — đo trên cây làm việc
CHƯA commit (artifact ghi `sourceCommit` là HEAD `0c1b96d`, nhưng mã đã gồm bản sửa hiện trường
sống và bản gộp lời gọi ở mục 2b).

| | Nguội | Ấm |
|---|---|---|
| First Contentful Paint | **88 ms** | 88 ms |
| DOMContentLoaded | 43 ms | 40 ms |
| JS qua dây | **191 KB** (6 tệp) | 2 KB — cache |
| JS sau giải nén | **604 KB** | 604 KB |

*Nguội* = context trình duyệt mới, chưa cache gì. *Ấm* = tải lại trong cùng context.

Cả hai đều **sau một lượt làm nóng bị bỏ đi**. Lần vẽ đầu tiên của một tiến trình
Chromium tốn thêm ~2,3 s để khởi tạo GPU/compositor, và chi phí đó thuộc về máy chạy
bài đo chứ không thuộc về sản phẩm — đo được: cùng một tiến trình, lượt đầu 2364 ms
rồi ba lượt sau 104 · 100 · 104 ms. Không bỏ lượt đó thì con số "nguội" nhảy
104 → 2404 ms giữa hai phiên mà mã không đổi một dòng.

557 KB sau giải nén là con số đáng nhìn: phần lớn nằm ở **một chunk 345 KB** —
`@solana/web3.js`. Đó là thứ tối ưu được, khác với độ trễ RPC vốn nằm ngoài tay đội.

### Bấm → thẻ kết quả hiện ra

Đo tới lúc **phần tử xuất hiện**, không phải tới lúc promise resolve: người dùng tin
vào thứ họ nhìn thấy.

**Đo lại 25/09/2026 — 30 lượt.** Bảng dưới là lượt mới nhất; các cột sau giữ lại để
thấy con số này dao động thế nào giữa các phiên đo.

| | 30 lượt · **25/09** | 30 lượt · 17/09 | 30 lượt · 15/09 | 30 lượt · 14/09 | 5 lượt · 08/09 |
|---|---|---|---|---|---|
| Lượt hoàn tất | **30/30**, 0 hỏng | 30/30, 0 hỏng | 30/30, 0 hỏng | 30/30, 0 hỏng | 5/5 |
| Trung vị (cả 30 lượt) | **890 ms** | 1916 ms | 1351 ms | 1596 ms | ~850 ms *(bỏ lượt đầu)* |
| Trung vị bỏ lượt đầu | 893 ms | 1926 ms | 1351 ms | 1351 ms | ~850 ms |
| Lượt đầu | 884 ms | 1398 ms | 838 ms | 2352 ms | 1348 ms |
| Thấp nhất | 853 ms | 866 ms | 838 ms | 834 ms | 837 ms |
| **Percentile 95 quan sát** | **6005 ms** | 3959 ms | 5359 ms | 3874 ms | chưa đo được với n=5 |
| Cao nhất | **8579 ms** | 5487 ms | 8896 ms | 3877 ms | 3352 ms |
| Dao động (max/min) | **10,1×** | 6,3× | 10,6× | 4,6× | 4,0× |
| Lượt gọi RPC mỗi lần kiểm | **7** (trung vị), cao nhất **15** | 8, cao nhất 11 | 7, cao nhất 17 | 7, cao nhất 11 | 7, cao nhất 10 |

### 2b · Gộp hai lời gọi sau mô phỏng — và điều bản gộp KHÔNG làm được (25/09)

Đếm ở tầng mạng một lần kiểm ca tấn công chuẩn: **8 lời gọi**, trong đó lượt 6 và 7 là hai
`getMultipleAccounts` một phần tử liền nhau — mint (lệnh `Transfer` thường không mang mint) và
PDA metadata Metaplex của chính mint đó. Địa chỉ PDA suy từ địa chỉ mint, nên L1 nay đọc cả hai
trong **một** lời gọi. Đo lại: **7 lời gọi**. Guard: `packages/core/test/nganSachGoiMint.test.ts`
(đỏ trên `fetch.ts` cũ).

Hai điều phải nói cùng lúc, vì gộp lại là tự khen:

1. **Khi RPC không bị giới hạn tốc độ, độ trễ gần như không đổi**: ~868 ms với 8 lời gọi, ~870–890 ms
   với 7. Bớt một vòng RTT không lộ ra được trên nền mô phỏng.
2. **Trung vị 1916/2938 → 890 ms phần lớn KHÔNG do bản gộp.** Cùng ngày 25/09, một lượt đo TRƯỚC khi
   gộp cho trung vị 2938 ms với trung vị 12 lời gọi — RPC công cộng đang giới hạn tốc độ nặng sau hàng
   loạt probe chạy liền trước. Lượt sau gộp rơi vào lúc RPC thoáng hơn.

Lợi ích thật: mỗi lần kiểm bớt 1/8 số lời gọi, tức bớt một cơ hội chạm 429 khi nhiều người bấm liên
tục (ví dụ ở booth). Độ trễ bậc thang ~500 ms mỗi lời gọi thừa (868 → ~1390 → ~1900 → ~2930 ms ứng với
8 → 9 → 10 → 12 lời gọi) là dấu vết của web3.js chờ 500 ms rồi thử lại sau mỗi 429 — xem mục 3. Cách
duy nhất gỡ hẳn là một endpoint RPC riêng cho máy trình diễn (`VITE_RPC`, chỉ nạp ở chế độ dev).

**Bốn phiên đo, bốn con số đuôi khác hẳn nhau — và đó mới là phát hiện.** Cao nhất đi
3352 → 3877 → 8896 → 5487 ms; dao động 4,0× → 4,6× → 10,6× → 6,3×. Cùng một bản mã,
cùng một máy. Thứ đổi là **RPC công cộng**, và nó nằm ngoài tay đội.

Phiên 17/09 có trung vị cao hơn hẳn (1916 so với 1351), và số RPC giải thích được:
trung vị **8 lượt RPC** thay vì 7, với 11 lượt cuối phiên đều gọi 10–11 lượt RPC.
Nhiều retry hơn thì chậm hơn — cùng cơ chế mục 3 mô tả, chỉ khác là lần này nó chạm
vào cả phần giữa của phân bố chứ không riêng phần đuôi.

Hệ quả cho cách nói: **trung vị là con số dùng được; đuôi thì không hứa được.** Một
tài liệu công bố "p95 quan sát 3874 ms" như một thuộc tính của sản phẩm là đang mô tả
một buổi chiều cụ thể của `api.devnet.solana.com`.

> `p95QuanSat` là **percentile quan sát trên 30 lượt của một phiên**, không phải p95
> của người dùng thật. Nói "95 % người dùng thấy kết quả dưới 5359 ms" là sai — phép
> đo này không đỡ được câu đó, và hai phiên cách nhau một ngày cho 3874 với 5359 là
> bằng chứng thẳng cho điều đó.

---

## 3 · Điểm ngoại lai là RETRY, không phải khởi động nguội

Đây là phần tôi suýt kết luận sai, và cách nó được sửa đáng ghi lại.

Lượt chạy đầu cho `[6926, 836, 839]` ms. Con số 6926 nằm ở lượt bấm **đầu tiên** —
vừa đủ để viết "khởi động nguội chậm vì bắt tay TLS với RPC". Tôi đã định viết đúng
câu đó.

Lượt chạy sau bác bỏ ngay: `[1348, 1347, 1354]`. Lượt đầu không chậm hơn chút nào.

Ghép thời gian với số lượt RPC của **cùng một lượt bấm** thì nguyên nhân thật hiện ra:

```
868/7 · 852/7 · 844/7 · 845/7 · 6386/17
```

Lượt chậm gấp bảy lần cũng là lượt gọi RPC gấp hơn hai lần. Ba lượt chạy đều cho cùng
hình dạng, và điểm ngoại lai rơi vào **vị trí khác nhau mỗi lần** — nên nó là RPC công
cộng trả lỗi rồi client thử lại, không phải khởi động nguội.

**Đo lại trên n=30 thì kết luận đó có số, không còn là đọc bằng mắt.** Tách 30 lượt
theo số RPC của chính lượt đó — phiên **17/09**, mốc tách là trung vị RPC (8):

| Nhóm | Số lượt | Trung vị |
|---|---|---|
| **dưới mốc RPC** — không retry | 17 | **1406 ms** |
| **từ mốc RPC trở lên** — có retry | 13 | **2984 ms** |

Chênh **2,1×**. Phiên 15/09 cho cùng hình dạng với biên độ lớn hơn — 19 lượt ở
**852 ms** so với 11 lượt ở **2875 ms**, chênh **3,4×**, tương quan Pearson giữa thời
gian và số lượt RPC là **r = 0,84**, và lượt chậm nhất phiên đó (8896 ms) cũng là lượt
gọi **17** lượt RPC.

Hai phiên khác biên độ nhưng cùng kết luận: **thời gian đi theo số lượt RPC, không đi
theo thứ tự lượt bấm.** Đó là điều cần chứng minh.

Phép tách này nay nằm trong `scripts/tao-so-lieu.ts` (`tachTheoRetry`), nên mỗi lượt
đo sau đều tự có con số ấy thay vì phải kể lại chuyện cũ.

**Kết luận này chỉ rút ra được vì hai con số nằm cạnh nhau.** Hai danh sách rời nhau
chỉ cho biết *"có một lượt chậm"* và *"có một lượt gọi nhiều"*, không cho biết đó là
một.

> Hệ quả cho buổi demo: dùng RPC riêng, đừng dùng endpoint công cộng. `VITE_RPC` có
> sẵn cho việc đó — và từ U07 thì **cả hai app** đều nghe nó, trước đó chỉ ví nghe.

---

## 4 · Lỗi tìm ra khi dựng phép đo này

### `npm run preview` phục vụ một trang TRẮNG — và trả mã 200

`vite.config.ts` đặt base theo `command`:

```ts
base: command === "build" ? "/Custos-Solana/" : "/"   // TRƯỚC
```

`vite preview` chạy với `command === "serve"`. Nên nó nhận base `/` trong khi HTML đã
build trỏ `/Custos-Solana/assets/…`. Máy chủ không khớp đường dẫn nào, rơi hết xuống
SPA fallback, và trả `index.html` cho **mọi** file JS và CSS.

Trình duyệt từ chối chúng vì sai MIME, `#root` rỗng, trang trắng hoàn toàn.

**Không có gì báo lỗi.** Máy chủ trả 200. Tôi tự dính đúng cái bẫy đó: kiểm bằng
`Invoke-WebRequest`, thấy `200`, kết luận là ổn — phải đọc tới `Content-Length` mới
thấy cả ba file JS đều ra **859 byte**, đúng bằng `index.html`.

Sửa: `base: command === "build" || isPreview ? "/Custos-Solana/" : "/"`, cả hai app.

Hệ quả: cách **duy nhất** xem bản production trước khi deploy đã hỏng, và không ai
biết.

### Guard đầu tiên của chính bài đo cũng hỏng, theo đúng kiểu nó định chặn

Nó kiểm `byteJsQuaDay == 0`. Nhưng máy chủ đâu trả 0 byte — nó trả 859. Điều kiện
không bao giờ đúng, và dòng in ra còn ghi *"0 KB"* vì `859 // 1024 == 0`: con số duy
nhất lộ ra sự thật lại bị phép chia làm tròn mất.

Nay guard hỏi thẳng thứ cần biết: **React có mount không** (`#root` có nội dung
không), cộng một ngưỡng byte rộng rãi. Đừng hỏi *"có bằng 0 không"*, hỏi *"có đủ
không"* — và tốt hơn cả là hỏi đúng thứ mình quan tâm.

---

## 5 · Chưa đo

Ghi ra để không ai đọc mục 2 thành một bức tranh đầy đủ.

| Chưa đo | Vì sao |
|---|---|
| **p95 của TỔNG THỂ** | nay có `p95QuanSat` trên n=30, nhưng đó là percentile **quan sát** trong một phiên trên một máy. p95 của người dùng thật cần nhiều phiên, nhiều máy, nhiều mạng |
| **Mạng bị bóp** (3G/4G) | chưa dựng cấu hình throttle; mọi số ở đây là mạng thật của máy dev |
| **Thiết bị thật** | Chromium headless trên máy dev, không phải điện thoại |
| **Trang phỏng vấn và trang số liệu** | mới đo trang ví |

Chưa tối ưu gì cả: D03 nói *"chỉ tối ưu sau khi xác định nút thắt"*, và nút thắt vừa
mới xác định được ở mục 3. Chunk 345 KB là ứng viên rõ ràng tiếp theo, nhưng tách nó
ra là một thay đổi có rủi ro hồi quy riêng — không gộp vào việc dựng phép đo.

Không có cache verdict nào trong sản phẩm, nên ràng buộc *"không cache verdict giữa
các giao dịch khác nhau"* thoả theo cấu tạo, không phải nhờ một guard.

---

## 6 · Tái lập

```bash
npm run build -w @custos-solana/demo-wallet
npm run preview -w @custos-solana/demo-wallet -- --port 4173 --strictPort
python scripts/kiem-trinh-duyet/soi-do-tre.py
```

Bài đo **dừng ngay** nếu trang không dựng được, thay vì ghi số của một trang trắng
vào bằng chứng.

## Module mới (CU-11/12/14/15/18/20/21) — phần TẤT ĐỊNH

Sinh bằng `npm run do-hieu-nang`. Chạy lại cho số mới; đừng sửa tay bảng dưới.

**Phạm vi:** không chạm mạng. Đây là chi phí của chính các phép tính, KHÔNG phải
độ trễ người dùng cảm nhận — lượt thật có RPC mất khoảng 600 ms, đo ở
`npm run thu-tich-hop:devnet`.

```
CU-23 · hiệu năng module tất định · 200 lượt, bỏ 5 lượt đầu
Node v24.12.0 · win32
Fixture: R01-pos — 1 lệnh, 1 token account

phép đo                                cold   trung vị        p95
─────────────────────────────────────────────────────────────────
L2 · danhGia(facts)                0.047 ms   0.004 ms   0.013 ms
CU-11 · dựng biên lai rieng        0.371 ms   0.087 ms   0.222 ms
CU-11 · đọc + kiểm toàn vẹn        0.244 ms   0.050 ms   0.081 ms
CU-12 · chạy lại từ biên lai      10.009 ms   0.105 ms   0.173 ms
CU-14 · tính phí chuyển            0.119 ms   0.000 ms   0.000 ms
CU-15 · tóm tắt quyền              0.139 ms   0.000 ms   0.001 ms
CU-18 · quyết định policy          0.103 ms   0.000 ms   0.001 ms
CU-20 · so sánh cấu trúc           0.170 ms   0.001 ms   0.006 ms
CU-21 · xét lô 20 giao dịch        0.305 ms   0.033 ms   0.047 ms

Cỡ mẫu warm: n=195 cho mỗi phép đo.

Đây là phần TẤT ĐỊNH, không chạm mạng. Độ trễ đầu-cuối có RPC đo ở
`npm run thu-tich-hop:devnet`, và độ trễ trình duyệt ở `docs/HIEU-NANG.md`.
```

**Vì sao `cold` của CU-12 cao gấp ~85 lần trung vị:** đã đo từng lượt — lượt 0
mất 10,4 ms, lượt 1 đã về 0,46 ms và ổn định từ đó. Đó là hình dạng của JIT
warm-up, không phải chi phí tăng dần hay rò rỉ. Cột `cold` giữ lại đúng để không
ai trộn nó vào trung vị.

**Vì sao một số dòng ghi p95 mà một số có thể ghi `—`:** với n < 20, phân vị 95
rơi đúng vào phần tử lớn nhất, nên in nó ra dưới tên *p95* là trình bày cực trị
của mẫu nhỏ như một thống kê. Script từ chối làm vậy.
