# Phòng kịch bản và đường AI thật — bàn giao

Triển khai `docs/PROMPT-DEMO-NHIEU-KICH-BAN-VA-AI-THAT.md`. Tài liệu này ghi **cái
đã chạy được, cái chưa, và cấu hình còn thiếu** — không ghi dự định.

---

## 1 · Audit hiện trạng (mục 2 của brief)

Năm điều đã tra trong mã trước khi sửa dòng nào:

1. **Luồng giao dịch.** Trang tấn công (`:5189`) dựng `VersionedTransaction`, mã
   base64 vào `#tx=` trên URL ví, kèm lời khai gian `khai={"type":"airdrop"}`. Ví
   đọc bằng `docYeuCauNgoaiChiTiet()` rồi gọi `inspect()`, mô phỏng thật qua RPC
   Devnet. **Facts đến từ `simulateTransaction`, không phải fixture.**
2. **Hành vi engine đọc được.** **19 mã lý do** trong `packages/core/src/constants.ts`,
   sinh bởi **14 luật** (4 Đỏ, 10 Vàng).
3. **Kịch bản dựng được vs chỉ có fixture.** Trước khi làm: `scripts/tan-cong.ts`
   chỉ có **hai** hàm dựng, và ví có `type Kich = "tanCong" | "lanhTinh"`. Năm
   trong bảy nhóm brief yêu cầu **chưa có hàm dựng nào**.
4. **AI được gọi ở đâu.** `App.tsx` truyền `boiThoiHan(dienGiaiKhongAI)` — đường
   **tất định**. `dienGiaiBangMoHinh` đã có đủ bộ soi đầu ra nhưng
   `dungGoiAnthropic` đọc `process.env` và nạp SDK Node ⇒ **không chạy được trên
   trình duyệt**. Không có gì nối giao diện với mô hình.
5. **Phần cần backend.** Site là tĩnh (GitHub Pages). **Không có** hàm serverless,
   **không có** `.env.example`, chỉ có `deploy.yml`.

## 2 · Đã làm

### 2.1 · Sổ đăng ký kịch bản

`apps/demo-wallet/src/kichBan.ts` — **9 kịch bản, 5 nhóm rủi ro phân biệt**, cộng
nhóm đối chứng và nhóm dữ liệu khuyết. Mỗi bản ghi mang ID ổn định, tiêu đề, lời
mời, tiền điều kiện, mức hỗ trợ, hàm dựng, và `bangChungMongDoi`.

`bangChungMongDoi` là **kỳ vọng, không phải kết quả**. Có guard đọc mã cấm nó xuất
hiện trong `App.tsx` — trình bày kỳ vọng như bằng chứng là thứ thể lệ BTC trừ điểm.

| Nhóm | Kịch bản | Luật nhắm tới |
|---|---|---|
| thưởng-mất-token | `thuong-gia-mat-token` | (cố ý không mã Đỏ nào) |
| đổi chủ | `doi-chu-tai-khoan`, `tan-cong-day-du` | luật 1 |
| cấp quyền | `cap-quyen-vuot-so-du` | luật 3 |
| chuyển thêm | `chuyen-them-ngoai-hanh-dong` | — |
| quyền đóng | `trao-quyen-dong` | luật 2 |
| đối chứng | `cap-quyen-vua-du`, `lanh-tinh` | **phải im** |
| dữ liệu khuyết | `thieu-du-lieu` | luật 14 |

Giao diện **duyệt sổ**, không gõ tay từng nút. Thêm bản ghi là nút hiện ra và chạy
đúng hàm dựng của bản ghi đó.

### 2.2 · Cặp dương/âm — bằng chứng engine có ngưỡng thật

`cap-quyen-vuot-so-du` và `cap-quyen-vua-du` dùng **cùng một instruction Approve,
cùng delegate**, chỉ khác hạn mức. Chạy 14 luật trên hai `Facts`:

```
VƯỢT số dư (1 010 000 000)  ⇒ 1 hit: SPL_APPROVE_DELEGATE_LON
VỪA ĐỦ    (  500 000 000)  ⇒ 0 hit
```

Đây là cách duy nhất chứng minh Custos **không gắn cờ theo tên instruction**.

### 2.3 · Đường AI thật, khoá nằm ở server

- `api/dien-giai.ts` — hàm server, **nơi duy nhất** thấy `ANTHROPIC_API_KEY`.
- `apps/demo-wallet/src/goiAiQuaServer.ts` — bản `GoiMoHinh` phía trình duyệt.
- `.env.example` — chỉ placeholder.

**Ranh giới giữ nguyên:** server trả về **một chuỗi văn bản thô**. Mọi phép soi đầu
ra (`soiDauRa`, `dungNeo`, `nguocChieu`) vẫn chạy **phía client** trong
`dienGiaiBangMoHinh`. Server bị chiếm cũng không đổi được `level`, vì `level` không
đi qua đó.

### 2.4 · Hai chiều trạng thái trực giao

Giao diện tách **chiều phân tích** khỏi **chiều diễn giải**, và hiện nhãn nguồn câu
chữ ngay dưới câu: `moHinh` · `tatDinh` · `moHinhLoi` · `chuaCauHinh`. Gộp hai
chiều thành một nhãn "live" là nói quá về sản phẩm.

---

## 3 · Đã chạy thật — số đo, không ước lượng

### 3.1 · Mô hình thật trên 7 kịch bản

`scripts/ky-thuat/chay-kichban-that.ts`, `claude-haiku-4-5-20251001`:

| Chỉ số | Giá trị |
|---|---|
| Độ trễ trung vị | **2 114 ms** |
| Độ trễ cao nhất | 3 063 ms |
| Token vào / ra | 4 754 / 1 193 |
| Lỗi API | 0 |

Biên bản đầy đủ: `docs/bao-mat/DANH-GIA-KICHBAN-2026-09-19.md`.

### 3.2 · Bộ kiểm

**999 test, 0 đỏ** (`npm run check`). Trong đó mới thêm: 11 ca sổ đăng ký, 10 ca
hàm server, 7 ca đường gọi client, 3 ca đối kháng.

**Mọi guard mới đã được chứng minh ĐỎ bằng đột biến** — xanh mà chưa từng đỏ thì
chưa biết nó canh cái gì:

| Đột biến | Guard đỏ? |
|---|---|
| Đối chứng Approve cấp vượt số dư | ✓ |
| Ca xấu tụt xuống bằng số dư | ✓ |
| Kịch bản thiếu dữ liệu còn 1 chữ ký | ✓ |
| Gộp nhóm cho còn dưới 5 | ✓ |
| Chuyển tiếp nguyên văn lỗi nhà cung cấp | ✓ |
| Bỏ chốt `ANTHROPIC_API_KEY` | ✓ |
| Gỡ `soiDauRa` khỏi `dienGiaiBangMoHinh` | ✓ |
| Bỏ cache `coAiKhong` | ✓ |
| Coi 404 là "có AI" | ✓ |

### 3.3 · Mô phỏng THẬT trên Devnet — 9/9 kịch bản

`scripts/ky-thuat/mo-phong-kichban-devnet.ts`. Chỉ `simulateTransaction`, **không
gửi gì lên chain**.

| Kịch bản | level | Mã lý do |
|---|---|---|
| `thuong-gia-mat-token` | safe | (không) |
| `doi-chu-tai-khoan` | **danger** | `SPL_SET_AUTHORITY__ACCOUNT_OWNER` |
| `cap-quyen-vuot-so-du` | **danger** | `SPL_APPROVE_DELEGATE_LON` |
| `cap-quyen-vua-du` ⟵ đối chứng | **safe** | **(không)** |
| `trao-quyen-dong` | **danger** | `SPL_SET_AUTHORITY__CLOSE_OR_FREEZE` |
| `chuyen-them-ngoai-hanh-dong` | safe | (không) |
| `thieu-du-lieu` | warning | `NGUOI_DUNG_KHONG_RO` ⟵ *đo lại 25/09 sau khi sửa; xem đính chính dưới* |
| `lanh-tinh` ⟵ đối chứng | safe | (không) |
| `tan-cong-day-du` | **danger** | `SPL_SET_AUTHORITY__ACCOUNT_OWNER` |

**0 lỗi dựng/mô phỏng · 0 lệch kỳ vọng.**

Cặp `cap-quyen-vuot-so-du` (danger) và `cap-quyen-vua-du` (safe) là bằng chứng
chạy thật rằng engine phân biệt theo **ngưỡng**, không theo tên instruction.

> **ĐÍNH CHÍNH 25/09 — đoạn cũ ở đây SAI.** Bản 19/09 ghi: *"`thieu-du-lieu` có
> `MO_PHONG_HONG` là đúng, không phải lỗi: giao dịch cần hai chữ ký nên không mô phỏng
> trọn được."* Mô phỏng chạy với `sigVerify:false`, không cần chữ ký nào. Nguyên nhân
> thật (đo lại): người trả phí là ví kẻ tấn công, ví đó **0 SOL**, `simulateTransaction`
> trả `AccountNotFound`. Cảnh báo Vàng khi ấy đến từ **hiện trường hỏng**, không phải
> từ luật 14.
>
> Tệ hơn: ví luôn khai `nguoiDung: ht.nanNhan`, nên luật 14 **không bao giờ bật trên
> giao diện**; script Devnet bỏ `nguoiDung` nên script "qua" trong khi UI hiện thứ khác.
>
> Đã sửa: người trả phí là ví có SOL, chữ ký thứ hai là người uỷ quyền trên tài khoản
> của chính họ; ví và script cùng đọc cờ `khongKhaiNguoiDung` trong sổ. Đo lại trên
> Devnet và trên trình duyệt: chỉ còn `NGUOI_DUNG_KHONG_RO`, mô phỏng đạt. Chi tiết:
> [`review/national-20260925/FINDINGS.md`](review/national-20260925/FINDINGS.md) mục F-03.

### 3.4 · Kiểm trên trình duyệt

Node test không thấy lỗi chỉ xảy ra trên trình duyệt — bài học `node:crypto`. Nên
đã đo bằng Playwright trên trang đang chạy:

- **9/9 nút kịch bản hiện đúng nhãn**, body 2 078 ký tự (không trắng trang);
- bấm nút không sinh lỗi console;
- **0 lỗi JavaScript.**

### 3.5 · Khoá không rò

Đối chiếu **khoá thật trong môi trường** với **toàn bộ 52 file** trong `dist`:
không file nào chứa khoá, không chuỗi nào khớp mẫu `sk-ant-…`. `npm run soi-khoa`
sạch.

---

## 4 · Bốn lỗi thật tìm được khi làm — và cả bốn đều do ĐO, không do đọc

### 4.1 · Bộ kiểm chạy khác nhau giữa máy dev và CI

Ca "thiếu khoá ⇒ 503" đỏ trên máy có `ANTHROPIC_API_KEY` thật: test chỉ dọn biến ở
`afterEach` và ngầm giả định môi trường khởi đầu sạch. Nó đọc phải khoá thật và
nhận 200.

Nghiêm trọng hơn một test hỏng: **màu xanh của bộ kiểm phụ thuộc môi trường bên
ngoài thì không mang thông tin**. Đã sửa bằng `beforeEach`.

### 4.2 · Dò AI gọi mạng hai lần mỗi lần mở trang

Probe trình duyệt thấy `/api/dien-giai` bị gọi **2 lượt**. StrictMode chạy effect
hai lần, và cờ `huy` trong cleanup chỉ chặn `setState` — **nó không rút lại request
đã bay đi**. Đã giữ lời hứa lại; đo lại còn **1 lượt**.

Cùng lúc phát hiện nhánh 404 trả `false` **vì rơi vào `r.ok === false`**, tức đúng
kết quả vì lý do sai. Đã đọc mã trạng thái tường minh.

### 4.3 · HIỆN TRƯỜNG ĐÃ TRÔI — hai kịch bản hỏng trên Devnet thật

Lỗi này **chỉ hiện ra khi mô phỏng thật**. 999 test Node vẫn xanh suốt lúc nó tồn tại.

```
ht.soLuong  (file cấu hình)  = 500 000 000
số dư THẬT  (trên chuỗi)     = 490 000 000   ← đã trôi sau một lượt diễn
```

Hai kịch bản giả định hai con số đó bằng nhau:

| Kịch bản | Triệu chứng | Hậu quả |
|---|---|---|
| `cap-quyen-vua-du` | cấp 500 000 000 > số dư thật | ca **ĐỐI CHỨNG** trả `danger` — nó tự phản bác chính mình |
| `tan-cong-day-du` | `Custom(1)` *insufficient funds* | mô phỏng hỏng ⇒ mất luôn `SPL_SET_AUTHORITY__ACCOUNT_OWNER`, mã quan trọng nhất của demo |

**Cả hai đều KHÔNG phải lỗi engine.** Luật 3 đúng khi gắn cờ 500 > 490; fail-safe
đúng khi đẩy lên Vàng lúc mô phỏng hỏng. Lỗi nằm ở **giả định của kịch bản**.

Bản 19/09 sửa bằng cách dùng **một nửa số cấu hình** — tức vẫn tin một con số đã
trôi, và chỉ vá được sổ kịch bản; trang tấn công và màn phỏng vấn vẫn hỏng (rà soát
25/09, P0). **Nay số lượng tính từ số dư đọc trên chuỗi lúc chạy** qua
`scripts/hienTruongSong.ts`, dùng chung cho cả ba luồng.

### 4.4 · Bảng đối chiếu tự cho điểm mình quá cao

Bảng kết quả bản đầu **chỉ kiểm mã THIẾU**. Ca `cap-quyen-vua-du` có `maMongDoi`
rỗng, nên "không thiếu mã nào" ⇒ in dấu `✓` — **trong khi nó đang trả `danger`**.

Một bảng chỉ kiểm một chiều luôn cho ca âm tính điểm tuyệt đối, kể cả khi ca đó
hỏng hoàn toàn. Nay kiểm cả mã **thừa** và cờ riêng `DOI-CHUNG BI GAN DO`.

## 5 · CẤU HÌNH CÒN THIẾU — phải có người làm

**Bản deploy hiện tại KHÔNG chạy AI.** Nói khác đi là nói sai.

| Cần | Trạng thái | Ai làm được |
|---|---|---|
| `ANTHROPIC_API_KEY` trong môi trường server | **CHƯA CÓ** | người có khoá |
| Hạ tầng chạy `api/dien-giai.ts` | **CHƯA CÓ** | GitHub Pages là tĩnh, không chạy được hàm |
| `CUSTOS_CHO_PHEP` nếu ví và hàm khác origin | chưa đặt | người triển khai |

**GitHub Pages không chạy được hàm serverless.** Muốn bản công khai có AI thì phải
có một nơi chạy hàm (Vercel/Netlify/Cloudflare Workers) và ví trỏ tới đó.

Trong lúc chưa có: giao diện hiện nhãn **"chưa cấu hình mô hình ngôn ngữ"** và chạy
đường tất định. **Sản phẩm vẫn dùng được đầy đủ** — chỉ câu chữ là do lõi xác định
viết thay vì mô hình. Điều này đúng với ràng buộc "không nhúng khoá vào bản public".

---

## 6 · Việc còn mở

1. **`aiAdvisory` ở ca đối chứng Approve.** L3 (`nhanDien.ts:82`) ghi nhận
   `cap_quyen_rut` khi thấy **delegate mới bất kỳ**, không xét hạn mức — nên ca
   đối chứng có verdict sạch nhưng câu chữ vẫn nói tới "cấp quyền rút". **`level`
   đúng ở cả hai ca.** Chưa sửa vì `nhanDien.ts` thuộc vai C, và vì đây **có thể là
   hành vi đúng** (delegate mới là việc nên biết). Cần ca kiểm riêng trước khi đổi.
2. **Lượt chạy MÔ HÌNH dùng `Facts` dựng sẵn**, nên nó đo phần diễn giải chứ
   không đo phần bóc tách. (Phần bóc tách đã được đo riêng bằng mô phỏng Devnet
   thật ở mục 3.3 — nhưng hai lượt đó chưa chạy nối nhau trong một đường.)
3. **MN-10** — danh sách trắng cần tập phép dẫn xuất khai trước (`total − analyzed`).
4. ~~Hiện trường sẽ còn trôi tiếp~~ — **đã làm 25/09**: `dungTx` nhận số dư sống;
   hiện trường hỏng (đổi chủ, cạn tiền, mô phỏng thất bại) báo "chưa sẵn sàng" thay vì
   đưa giao dịch hỏng qua engine.
