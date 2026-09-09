# Nghiệm thu và bàn giao — bốn nhóm kết luận, không gộp làm một

**Việc V02 của [`ROADMAP-CLAUDE.md`](../ROADMAP-CLAUDE.md).** Lập ngày **09/09/2026**.

Trang này tách bốn thứ mà một bảng "tiến độ" gộp lại sẽ nói sai:

| Nhóm | Trạng thái |
|---|---|
| 1 · **Sản phẩm đã kiểm** | ✅ có bằng chứng chạy lại được |
| 2 · **Bằng chứng người dùng / người mua** | ⚠️ một nửa — người dùng có, người mua **không** |
| 3 · **Hồ sơ nộp** | ⚠️ 7/10, thiếu video |
| 4 · **Hành động phát hành** | ⏸️ chờ quyền chủ dự án |

> **Không hứa giải thưởng.** Trang này không dự đoán kết quả thi. Và **23 việc
> roadmap đã xong không tự nâng điểm nào** — rubric chấm bằng chứng, không chấm số
> lượng việc.

---

## 1 · Sản phẩm đã kiểm

Mọi con số dưới đây chạy lại được bằng một lệnh, và mỗi artifact mang `sourceCommit`
cùng dấu vết nội dung (xem [`R02`](roadmap/TIEN-DO.md)).

| Bề mặt | Kết quả | Lệnh |
|---|---|---|
| Bộ test | **473 pass · 0 fail** | `npm run check` |
| Cổng sản phẩm | **11 đạt · 0 hỏng · 0 chưa rõ** | `npm run kiem-san-pham` |
| Gói cài từ ngoài repo | tarball + JS + TypeScript | `npm run thu-goi` |
| Bẫy đối kháng trên gói | **10/10 chặn · 3/3 đối chứng** | `npm run thu-goi` |
| Bẫy trên gói **registry** | **10/10 chặn · 3/3 đối chứng** | `npm run thu-goi-registry` |
| Bẫy đối kháng AI (nguồn) | **13/13 chặn · 3/3 đối chứng** | `npm run eval-ai` |
| axe (4 trang × 2 khung) | **40/40 · 0 vi phạm** | `soi-trinh-duyet.py` |
| Vùng bấm cảm ứng | **26/26 ≥ 44 px** | `soi-vung-bam.py` |
| Bàn phím · zoom · chữ dài | **16/16** | `soi-ban-phim-va-phong-to.py` |
| Handoff tấn công → ví | **5/5** | `soi-handoff.py` |
| Công cụ phỏng vấn vòng 2 | **15/15** | `soi-phong-van-vong-2.py` |
| Bộ mang đi (ngoài repo) | **12/12** | `soi-ban-trinh-dien.py` |

### F01–F11 trước và sau

Mười một lỗi của báo cáo đánh giá 08/09. **Mỗi lỗi được tái hiện trước khi sửa và đo
lại sau khi sửa** — bảng đầy đủ ở [`roadmap/BAN-GIAO.md`](roadmap/BAN-GIAO.md).

| | Số | Ghi chú |
|---|---:|---|
| Đã sửa và đo lại | **10** | F01–F10 |
| Đã đánh giá, **không có bản vá để áp** | **1** | F11 — xem mục 5 |

Ba lỗi đáng kể nhất, vì cả ba đều **im lặng**:

- **F03** — `hien-truong.json` sai cấu trúc làm trắng trang. `as` cast không phải xác thực.
- **F05** — kho phỏng vấn hỏng bị `catch { return [] }` xoá sạch. Hai mươi biên bản gõ tay, không bản sao.
- **F08** — bốn nút cao 19 px, dưới cả ngưỡng WCAG AA. Bài a11y cũ vẫn xanh vì nó chỉ chọn `button.nut`.

### Điều KHÔNG nằm trong mục này

Bộ test **không** đo độ chính xác phát hiện. Nó đo **không hồi quy**. Vì sao chưa có
confusion matrix: [`BENCHMARK.md`](BENCHMARK.md) mục 1.

---

## 2 · Bằng chứng người dùng và người mua

Đây là nhóm mà số lượng việc đã làm **không** thay thế được.

| | Có | Số |
|---|---|---|
| Phỏng vấn người dùng | ✅ **thật** | **20 người**, 29–30/08/2026 |
| — nêu đúng hậu quả | | 13/20 (một phần 5 · sai 2) |
| — hiểu đúng mà **vẫn ký** | | **2** — số bất lợi, giữ nguyên |
| Usability vòng 2 | ❌ chưa chạy | công cụ đã sẵn (I03) |
| **Phỏng vấn người mua** | ❌ **0** | bộ đồ nghề đã sẵn (B01) |
| **Bên thứ ba tích hợp** | ❌ **0** | bộ pilot đã sẵn (B02) |

**Bốn ô ❌ đó không đóng được bằng code.** Chúng cần người, và roadmap gọi tên riêng:
H01–H03.

> Ví dụ tích hợp trong repo **do chính đội dựng**. Nó chứng minh SDK dùng được từ
> ngoài monorepo — nó **không** chứng minh có ai chọn dùng Custos.

---

## 3 · Hồ sơ nộp — 7/10

Chạy `npm run nop-bai`. Đọc từng mục, **không đồng nhất `exit 0` với đủ bằng chứng**:

| | Mục | Trạng thái |
|---|---|---|
| ✓ | Bộ test xanh | 473 pass |
| ✓ | Cây làm việc sạch | |
| ✓ | Ví dụ tích hợp chạy được | 8/8 kịch bản |
| ✓ | Deck dựng lại được từ dữ liệu | |
| ✓ | Ảnh dự phòng máy tính + điện thoại | 8 ảnh |
| ✓ | Gói AI có bản vá trên registry | 0.2.0 · 10/10 |
| ✓ | Metadata repo | |
| ✗ | **Video demo dự phòng** | **thể lệ ghi là BẮT BUỘC** |
| ✗ | Lịch thi xác nhận đủ | 4 câu chưa hỏi BTC |
| ✗ | Release tag cố định | chưa có tag |

**Video là mục nặng nhất trong ba mục thiếu.** Thể lệ ghi nó là bắt buộc; thiếu nó là
mất lượt nếu sự cố kỹ thuật xảy ra trên sân khấu.

### Hướng dẫn chạy bản nộp

```bash
node scripts/dong-goi-ban-trinh-dien.mjs   # ra thư mục ban-trinh-dien/
cd ban-trinh-dien && node phuc-vu.mjs 8080 # hoặc bấm đúp CHAY.cmd
```

Mở `http://localhost:8080/`. **Cần mạng** — màn hình cảnh báo dựng bằng mô phỏng thật
trên Devnet. Đọc `DOC-TRUOC.md` trong thư mục trước khi mang đi.

Đã kiểm: chép ra ngoài repo, phục vụ bằng chính `phuc-vu.mjs`, mở cả bốn trang —
**12/12, 0 lỗi console, 0 tài nguyên 404**, không đường dẫn cá nhân nào trong 21 file.

---

## 4 · Hành động phát hành — chờ quyền chủ dự án

Không việc nào dưới đây được thực thi. Lệnh để sẵn dạng nháp.

| Việc | Lệnh nháp | Vì sao chờ |
|---|---|---|
| Tạo release tag | `git tag -a v0.2.0 -m "…"` · `git push origin v0.2.0` | Tag là cam kết công khai |
| Gỡ `@custos-solana/ai@0.1.2` | `npm deprecate @custos-solana/ai@0.1.2 "…"` | Cần đăng nhập npm. `0.1.2` vẫn cài được và vẫn để 9/10 bịa đặt lọt |
| Eval mô hình thật | `ANTHROPIC_API_KEY=… npm run eval-ai -- --that` | Cần khoá — **đặt biến môi trường, đừng dán vào chat** |
| Nhắn ví/dApp | — | Roadmap cấm Claude tự gửi tin |

Trước khi tạo tag: `npm run nop-bai -- --strict`.

---

## 5 · Rủi ro còn lại

| Rủi ro | Mức | Trạng thái |
|---|---|---|
| **5 advisory high không có bản vá** | cao | `image-size` mới nhất **2.0.2** vẫn trong dải bị ảnh hưởng; `bigint-buffer` **1.1.5** cũng vậy. Không phải chưa nâng — **thượng nguồn chưa sửa**. Phân tích phơi nhiễm + 4 điều kiện xem lại: [`PHU-THUOC.md`](PHU-THUOC.md) |
| **Cohort mainnet tự phân hủy** | trung bình | 25/08 đo được 9/20; 08/09 chỉ còn **4/20**, toàn bộ vì trạng thái chuỗi đã đi qua. Tới ngày nộp có thể còn ít hơn — phải viết đúng `N/20` kèm lý do, không im lặng thu nhỏ mẫu số |
| **Chưa có video** | cao | Thể lệ ghi bắt buộc |
| **Chưa ai ngoài đội tích hợp** | trung bình | Ô 30 % rubric bị trừ vì điều này |
| **Chưa biết ai duyệt chi** | trung bình | Ô 25 % rubric. Câu đầu tiên buyer interview trả lời |
| Chưa kiểm bộ test trên Linux | thấp | CI Linux xanh, nhưng F09 sửa trên Windows |

---

## 6 · Chấm lại theo rubric — và một ranh giới phải giữ

> ⚠️ **Đây KHÔNG phải bản chấm lại điểm 6,95 của `CUSTOS.md` mục 13.**
>
> Mục đó nói rõ: *"Điểm 6,95 KHÔNG được chấm lại ở đây. Chấm lại cần cùng rubric và
> cùng người chấm; tự nâng điểm cho khớp tin mới là đúng thứ mục này sinh ra để
> chống."* Ranh giới đó **giữ nguyên** — con số 6,95 trong `CUSTOS.md` không bị sửa.
>
> Bảng dưới đây là **ảnh chụp mới, ngày mới, người chấm là Claude** — một bên tự
> chấm. Nó ghi *lý do trừ điểm nào còn đúng và lý do nào đã hết hiệu lực*, chứ không
> tuyên bố một con số thay thế.

| Tiêu chí | Trọng số | Lý do trừ 23/08 | Còn đúng không |
|---|---:|---|---|
| Bài toán thị trường & người dùng | 25% | *"0 người dùng thật đã được hỏi"* | ❌ **hết hiệu lực** — đã hỏi 20 người thật, 29–30/08 |
| Giải pháp, demo, trải nghiệm | 30% | *"chưa ai ngoài đội tích hợp SDK"* | ✅ **vẫn đúng** |
| Mô hình kinh doanh & GTM | 25% | *"thiếu giá bán của Custos, 0 cuộc trò chuyện với khách hàng"* | ⚠️ **một nửa** — mô hình + giả thuyết giá đã có ([`MO-HINH-DOANH-THU.md`](MO-HINH-DOANH-THU.md)); 0 cuộc trò chuyện **vẫn đúng** |
| Trình bày & phản biện | 20% | *"chưa có slide, chưa có video, chưa tập lần nào"* | ⚠️ **một phần** — deck có; video và tập nói **vẫn thiếu** |

**Ô trình bày chỉ là TẠM CHẤM.** Chưa ai thấy đội trình bày, kể cả Claude. Không kết
luận được gì về ô 20 % đó ngoài việc liệt kê thứ đã có và chưa có.

**Không nâng điểm vì đã làm 23 việc.** Rubric chấm bằng chứng: một ô có 12 bài kiểm
tự động vẫn bị trừ nếu chưa bên thứ ba nào tích hợp — vì tiêu chí hỏi điều đó, không
hỏi số lượng test.

---

## 7 · Cập nhật trang này khi nào

Khi bất kỳ đầu vào nào đổi: **H01–H04** có dữ liệu, **A02** chạy được với khoá,
**P02** có video, hoặc **S02** có bản vá thượng nguồn.

Trang này chỉ đóng **phần lập báo cáo**. Các ô ❌ vẫn đỏ cho tới khi có bằng chứng
thật — không tick trước, không đoán.
