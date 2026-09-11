# Nghiệm thu sản phẩm — ma trận V01 chạy trên bản cuối

**Việc V01 của [`ROADMAP-CLAUDE.md`](../ROADMAP-CLAUDE.md).** Chạy **11/09/2026**.

> **V01 KHÔNG đóng toàn diện, và đó là kết luận đúng chứ không phải thiếu sót.**
> Roadmap nói rõ: *"Nếu S02/D03 chờ, báo nghiệm thu có phần còn mở, không ghi V01
> DONE toàn diện."* **S02 đang chờ** — mục 3 nói vì sao nó sẽ không tự thông.
>
> Trang này đóng **phần kiểm khả dụng**, theo ngoại lệ mục 2.4.

---

## 1 · Ma trận nghiệm thu — mười bề mặt

Mỗi dòng chạy thật trên bản mã hiện tại, **đọc output và mã thoát**, không tin
checklist cũ.

| Bề mặt | Ca đã kiểm | Kết quả | Chạy bằng |
|---|---|---|---|
| **Engine** | Đỏ · xanh · khuyết dữ liệu · RPC chết/treo · L3 lỗi | **14/14** · mã thoát 0 | `thu-tich-hop:deterministic` |
| **Mobile** | 320 · 375 · 768 px · chữ lớn | kết quả trong luồng đọc, focus đúng | `soi-ket-qua-trong-tam-nhin` |
| **Desktop** | 1440 px · bàn phím | Tab đủ luồng, vòng focus thấy được, Enter/Space mở được | `soi-ban-phim-va-phong-to` **16/16** |
| **Mọi mức cảnh báo** | Đỏ/vàng/xanh/khuyết coverage · mở chi tiết · sau chuyển cảnh | axe **40/40 · 0 vi phạm** | `soi-trinh-duyet` |
| **Handoff** | payload đúng/sai · popup chặn · URL local/subpath | **5/5** · tab mới không phải chính trang tấn công | `soi-handoff` · `soi-yeu-cau-va-huy` |
| **Gửi** | RPC từ chối · hết hạn · mất phản hồi sau gửi | sáu pha, `chuaRo` tách khỏi `thatBai` | `gui.test.ts` trong `npm run check` |
| **Phỏng vấn** | mạng treo · data cũ/hỏng · lỗi ghi storage · export | **15/15** + treo dừng sau **15,6 s** có nút Thử lại | `soi-phong-van-vong-2` · `soi-phong-van-treo` · `soi-kho-phong-van` |
| **SDK** | consumer ngoài repo · JS + TS · optional adapter · bẫy/đối chứng | **10/10 bẫy · 3/3 đối chứng** · mã thoát 0 | `thu-goi` |
| **Bản build** | base path · startup độc lập · scanner | **12/12** · 0 lỗi console · 0 tài nguyên 404 | `soi-ban-trinh-dien` |
| **Claim** | README/deck/số liệu/registry/eval | mọi tài liệu khớp một nguồn | `kiem-san-pham` ô 6 |
| **Hồ sơ** | video · slide · nguồn repo · thông tin BTC | **10/13** — xem mục 4 | `nop-bai-strict` |

**Cổng đầy đủ, chạy một lần cuối trên cùng bản mã:**

```
npm run check          → 478 pass · 0 fail
npm run kiem-san-pham  → 11 đạt · 0 hỏng · 0 chưa rõ
```

### Vùng bấm — kiểm riêng vì bài a11y cũ không nhìn vào nó

**26/26 ≥ 44 px** ở 375 px, ngữ cảnh cảm ứng. Tách thành bài riêng vì nhóm A của bộ
axe chọn `button.nut`, nên bốn nút cao 19 px chưa bao giờ nằm trong tập được chọn —
xem [`BAN-GIAO.md`](roadmap/BAN-GIAO.md).

---

## 2 · Phạm vi trình duyệt — nói trước khi bị hỏi

Toàn bộ số ở mục 1 đo trên **Chromium headless, viewport giả lập**, máy Windows của
đội.

**Chưa kiểm:** WebKit · Firefox · thiết bị thật · mạng bị bóp.

Đây **không** phải "đã kiểm đa trình duyệt". Roadmap nói đúng chữ: *"Nếu chưa có, ghi
phạm vi Chromium/viewport giả lập; không khẳng định kiểm đa trình duyệt hoàn chỉnh."*

---

## 3 · Nhánh còn mở — liệt kê, không tự bỏ qua

| Nhánh | Vì sao còn mở | Tự thông được không |
|---|---|---|
| **S02** — vá dependency | 5 advisory high, **không cái nào có bản vá ở thượng nguồn**. `image-size` mới nhất **2.0.2** vẫn nằm trong dải bị ảnh hưởng; `bigint-buffer` **1.1.5** cũng vậy | ❌ **không** — chờ không giải quyết được |
| ~~**A02** — eval mô hình thật~~ | ✅ **đóng 12/09** — khoá đã có, 7 lượt live. Kết luận: **không đo được lợi ích của lớp AI**, số bất lợi giữ nguyên | — |
| **B03 · H01** — usability vòng 2 | cần người tham gia mới | ❌ cần người |
| **H02 · H03** — người mua, đối tác | cần bên ngoài | ❌ cần người |

**Hệ quả cho V01:** vì S02 không tự thông, V01 **không đóng được bằng cách chờ**. Nếu
muốn đóng, đó là một quyết định: chấp nhận rủi ro đã ghi ở [`PHU-THUOC.md`](PHU-THUOC.md)
và cho V01 chạy trên phần còn lại.

Không nhánh nào trong bảng này bị đánh dấu xanh vì "phần còn lại đã xong".

---

## 4 · Hồ sơ nộp — 10/13 ở chế độ nghiêm

`npm run nop-bai-strict`. Ba ô đỏ, **không ô nào là [máy]**:

| | Ô | Ai làm được |
|---|---|---|
| ✗ | Video demo dự phòng | người |
| ✗ | Release tag cố định | người |
| ✗ | Lịch thi xác nhận đủ | bên ngoài |

Ô [máy] cuối cùng — *"release notes mô tả đúng bản sắp gắn tag"* — đã xanh trong lượt
nghiệm thu này: notes được sinh lại và commit riêng, nên từ SHA trong notes tới HEAD
không commit nào đụng thứ khác.

---

## 5 · Kết luận

**Luồng cốt lõi không còn lỗi đã xác nhận.** Mười một lỗi F01–F11 của báo cáo đánh
giá: mười đã sửa và đo lại, một (**F11**) đã đánh giá và ghi quyết định chấp nhận có
điều kiện vì không có bản vá để áp.

**Mọi kiểm bắt buộc qua trên bản cuối**, cùng một bản mã, mã thoát 0.

**Rủi ro chưa xử lý đều có quyết định rõ** — [`PHU-THUOC.md`](PHU-THUOC.md) cho
advisory, mục 3 ở trên cho nhánh còn mở.

Bốn nhóm kết luận tách riêng nằm ở [`NGHIEM-THU-VA-BAN-GIAO.md`](NGHIEM-THU-VA-BAN-GIAO.md).

---

## 6 · Chạy lại

```powershell
npm run check
npm run thu-tich-hop:deterministic
npm run thu-goi
npm run kiem-san-pham
npm run nop-bai-strict

npm run vi ; npm run tan-cong          # rồi:
python scripts/kiem-trinh-duyet/soi-trinh-duyet.py
python scripts/kiem-trinh-duyet/soi-vung-bam.py
python scripts/kiem-trinh-duyet/soi-ban-phim-va-phong-to.py
python scripts/kiem-trinh-duyet/soi-handoff.py
python scripts/kiem-trinh-duyet/soi-phong-van-vong-2.py
python scripts/kiem-trinh-duyet/soi-cau-hinh-hong.py <đường-dẫn-bản-sao>
```

`soi-cau-hinh-hong.py` **ghi đè** `hien-truong.json` nên nó đòi đường dẫn bản sao và
khôi phục trong `finally`. Lượt này đã kiểm: hash trước và sau khớp nhau.
