# Báo cáo tổng — đã làm gì, và còn thiếu gì

**Viết ngày 06/09/2026** · 40 commit kể từ `e09569e` · dành cho người cần nắm nhanh
trạng thái thật của repo.

> Số trong trang này **sinh từ dữ liệu**, không gõ tay. Chạy `npm run so-lieu` rồi
> `npm run nop-bai -- --strict` để tự kiểm.

---

## 1 · Trạng thái một dòng

Lõi kỹ thuật **đã sẵn sàng nộp**. Bằng chứng thị trường thì **chưa** — và repo nói
thẳng điều đó ở mọi nơi con số xuất hiện, thay vì để giám khảo moi ra.

| | |
|---|---|
| Test tự động | **367** pass · 0 fail |
| Luật tất định | **14** — 9 luật có ca đối chứng gần giống |
| Mẫu kiểm thử gắn nhãn | **33** |
| Bẫy đối kháng AI bị chặn | **13/13** |
| Tích hợp từ ngoài monorepo | **7,2 giây** tới kết quả đầu · **29 dòng** · **663 ms** một lượt |
| Phỏng vấn người dùng thật | **20** — 13 đúng · 5 một phần · 2 sai |
| Phỏng vấn **người mua** | **0** |
| Bên thứ ba tích hợp | **0** |
| Lỗ hổng phụ thuộc | **11** — 5 high · 6 moderate (9 runtime, 2 dev) |
| Checklist nộp bài (strict) | **6/12** — `CHƯA SẴN SÀNG NỘP` |

---

## 2 · Đã sửa được gì

### 2.1 · Lỗ hổng bảo mật đã phát hành ra ngoài

`@custos-solana/ai@0.1.2` **đang nằm trên npm** và **thiếu neo grounding** — tôi tải
tarball về soi: nó có `soiDauRa(tho)` một tham số, không có `dungNeo`, không có
`DIA_CHI_DAY_DU`. Nghĩa là ai `npm install` hôm nay đều nhận bản mà **mô hình chèn
được địa chỉ ví bịa** vào câu người dùng đọc trước khi ký.

Nguyên nhân: bản đó lên registry **trước** khi bản vá được thêm. Source đúng, tarball
local đúng, mọi test xanh — chỉ thứ đã gửi đi là sai. Không đọc code nào phát hiện
được: cả hai phía đều đúng, chỉ lệch **thời điểm**.

Đã bump `0.2.0` và thêm bước **soi artifact trước khi đóng gói**: thiếu dấu ấn bản vá
thì `exit 1`. Kiểm ngay tại chỗ tạo artifact, trên chính file sẽ được gửi đi.

**Chưa publish** — `npm whoami` trả E401.

### 2.2 · Ba neo giữ AI trong hàng rào

| Neo | Chặn được gì |
|---|---|
| **Địa chỉ** | Mô hình không bao giờ nhận địa chỉ đầy đủ → mọi base58 dài trong đầu ra là bịa. Cả dạng **viết tắt** cũng phải có căn cứ |
| **Số** | Chỉ số có trong dữ liệu đã gửi, hoặc số câu mẫu tất định cũng in ra |
| **Chiều tài sản** | Facts biết số dư người ký tăng hay giảm. Tài sản đi **ra** mà lời văn nói người ký **nhận** thì vứt |

Neo thứ ba là lớp khó nhất. *"Ví lạ sẽ chuyển token vào ví của bạn"* không bịa giá trị
nào — nó chỉ **đảo chiều**, và hai neo đầu mù trước loại sai đó.

`detectedPrimaryAction` cũng đã được neo: trước đây khi lõi tất định không nhận ra
hành động chính, giá trị của **mô hình** đi thẳng vào kết quả và giao diện hiển thị
nó dưới nhãn *"hành động chính được nhận diện"* — tức trình bày như một fact đã đo.

### 2.3 · Quyền riêng tư của 20 người tham gia

Consent là **tham gia nghiên cứu để lấy số liệu**. Không bao gồm công bố tuổi chính
xác và nghề cụ thể lên repo công khai.

Đo trước khi sửa: **8/20** bản ghi mang đồng thời tuổi chính xác + nghề rất cụ thể +
câu nguyên văn. Trong vòng quen biết của chính người phỏng vấn, tổ hợp đó đủ để nhận
ra người. Sau khi sửa: **0/20**.

**Câu trả lời nguyên văn giữ nguyên** — đã soi và xác nhận chúng không chứa thông tin
cá nhân nào; chúng là phản ứng với màn hình. Giữ chúng là giữ đường kiểm chứng cho
con số 13/20. **Không tỉ lệ nào đổi.**

### 2.4 · Mọi con số chảy từ một nguồn

Bốn artifact từng nói bốn con số khác nhau: deck ghi 348, PITCH ghi 9 lỗ hổng,
release notes trỏ sai SHA, checklist ghi cứng "5/5" khi dữ liệu có 8 check.

Nay `npm run so-lieu` đồng bộ tất cả, và có guard cho từng surface — **kể cả deck**,
một file zip mà mọi guard văn bản trước đó không với tới.

---

## 3 · Lỗi của chính tôi, và cách chúng lộ ra

Phần này quan trọng hơn phần trên: nó cho biết **cái gì đã suýt lọt**.

| Lỗi | Lộ ra nhờ |
|---|---|
| Guard tự tha cho thứ nó sinh ra để bắt — **4 lần**, ở 4 file | Chèn câu bịa vào pitch rồi xem guard có đỏ không |
| Guard deck **báo xanh giả**: dùng `tar` mở file `.pptx` (vốn là zip), lỗi bị `catch` nuốt | Đặt deck cũ cạnh số liệu mới, thấy test vẫn xanh |
| Bước dàn gói **làm rơi subpath** `./anthropic` ngay sau khi tôi viết rằng đó là "đường duy nhất" | `npm run thu-goi` — bài kiểm đóng vai **người ngoài** |
| Ảnh dự phòng tên *"cảnh báo nguy hiểm"* nhưng **không có cảnh báo** | **Mở ảnh ra xem**, thay vì tin tên file |
| Bộ đếm "bịa số" tố oan đường **tất định** 27/33 ca | Đường đó không thể bịa — nên bộ đếm sai |
| Phép đo tự thổi phồng: "tới kết quả đầu" cộng cả 5 lượt benchmark | So hai lần chạy liên tiếp |
| Tôi tự thêm `pptxgenjs` → **+2 lỗ hổng high** | Chạy lại `npm audit` trong vòng review |
| Ghi đè `cohort-ket-qua.json` bằng dữ liệu 0 mẫu, rồi số 0 chảy vào 4 tài liệu | Đọc lại git diff |
| Cổng `--strict` tôi vừa viết chứa **hai ô loại trừ nhau** — không bao giờ mở được | Chạy nó thật, đọc từng dòng đỏ |

Dòng cuối đáng nói riêng. `--strict` bản đầu đòi release notes ghi đúng SHA của
`HEAD`, đồng thời đòi cây làm việc sạch. Release notes **không thể** chứa SHA của
chính commit tạo ra nó: sinh xong thì cây bẩn, commit vào thì SHA lệch một bước. Hai
ô máy-kiểm triệt tiêu nhau ⇒ cổng vĩnh viễn đỏ vì lý do không ai sửa được — và một
cổng như thế dạy người đọc bỏ qua nó, tệ hơn không có cổng.

Nay ô đó hỏi đúng điều cần hỏi: SHA phải là **tổ tiên** của `HEAD`, và mọi commit từ
đó tới `HEAD` chỉ được đụng vào **chính file release notes**. Chạm code hay tài liệu
khác thì notes đang nói về bản cũ — lúc đó mới chặn.

Bốn phát hiện lớn nhất đều đến từ **công cụ đóng vai người ngoài**, **mở artifact ra
xem**, hoặc **chạy thật thứ mình vừa viết**, không từ việc đọc code. Đó là bài học
đáng giữ.

---

## 4 · Còn thiếu gì — và ai làm được

### Chỉ người làm được

| Việc | Vì sao gấp |
|---|---|
| **Video demo dự phòng** | Thể lệ BTC ghi là **BẮT BUỘC**. Sự cố kỹ thuật mà không có video là **mất lượt** |
| **Publish `@custos-solana/ai@0.2.0`** | Hôm nay `npm install` vẫn lấy `0.1.2` — bản có lỗ hổng |
| **4 câu hỏi BTC** | Giờ thi, hình thức, thời lượng pitch, chung kết 23/09 hay 26/09 |
| **Release tag** | Chờ ba việc trên |

### Đã đóng theo quyết định của đội

- **Phỏng vấn người mua** — đội quyết định không làm kỳ này. Bộ câu hỏi vẫn ở
  `docs/PHONG-VAN-NGUOI-MUA.md` như một **kế hoạch**, không phải kết quả.
- **Bên thứ ba tích hợp** — chưa có. Ví dụ ở `vi-du-tich-hop/` **do chính đội dựng**;
  nó đo ma sát tích hợp, không đo nhu cầu thị trường. Có guard chặn mọi câu gọi nó là
  bằng chứng bên ngoài.

### Chưa chạy

- Usability vòng 2 trên giao diện hiện tại — giao thức đã khoá ở
  `docs/GIAO-THUC-PHONG-VAN-VONG-2.md`, chưa có người tham gia.
- Eval với mô hình thật — `BLOCKED_BY_SECRET`, cần `ANTHROPIC_API_KEY`.

---

## 5 · Điều mô hình thị trường thật sự nói

`docs/QUY-MO-THI-TRUONG.md` — **7/8 biến là giả định**, chỉ một biến tra được
(Solana dApp Store vượt 1 000 app, nguồn solana.com 06/2026).

Kết quả gốc: TAM 700 đội (~$412k/năm) · SAM 34 đội · **SOM 1,8 đội (~$1 058/năm)**.

Con số nhỏ, và để nguyên. TAM tính trên tập **đếm được**, tức cận dưới — một TAM lớn
dựng từ giả định chồng giả định sập ở câu hỏi thứ hai.

Điều mô hình nói ra mới đáng giá: **ràng buộc không phải quy mô thị trường** (kịch bản
cao SAM cũng chỉ 143 đội) mà là **năng lực tiếp cận**. Ba biến quyết định kết quả đều
đo được bằng đúng một việc — nói chuyện với người mua.

---

## 6 · Khuyến nghị

**`DO NOT FREEZE`** — chưa tạo release tag.

Ba cổng còn thiếu: video demo (bắt buộc theo thể lệ), `0.2.0` chưa lên registry, và
lịch thi chưa xác nhận. `npm run nop-bai -- --strict` sẽ chuyển sang xanh khi cả ba
đóng lại.

Về mặt kỹ thuật, repo **nộp được ngay hôm nay**: clone sạch từ GitHub chạy được toàn
bộ, CI xanh, không có khoá trong bundle, runtime chỉ Devnet.

---

## 7 · Lệnh cần nhớ

```bash
npm run check                  # 367 test + typecheck
npm run so-lieu                # đo lại và đồng bộ mọi tài liệu
npm run nop-bai -- --strict    # cổng trước khi tạo tag
npm run thu-goi                # cài gói như người ngoài
npm run thu-tich-hop           # dApp mẫu chạy thật trên Devnet
npm run eval-ai                # 13 bẫy đối kháng
npm run soi-rieng-tu           # soi nguy cơ tái định danh
npm run thi-truong             # mô hình TAM/SAM/SOM
```
