# Giao thức phỏng vấn vòng 2 — đo trên giao diện HIỆN TẠI

> **Chốt trước khi hỏi người đầu tiên.** Sửa giao thức sau khi đã thấy vài câu trả
> lời là cách chắc chắn nhất để ra một con số đẹp và vô nghĩa.
>
> Khung chấm **giữ nguyên vòng 1** — xem `GIAO-THUC-PHONG-VAN.md` mục 4. Đổi thước
> đo giữa hai vòng thì so trước/sau là so hai thứ khác nhau.

## 0 · Vì sao phải có vòng 2

Vòng 1 hỏi 20 người ngày 29–30/08 và cho **13/20 nêu được hậu quả**. Nhưng tấm cảnh
báo **đã được thiết kế lại** ngày 01/09 và 04/09. Con số 13/20 vì thế đo trên một
giao diện không còn tồn tại.

Đó là giới hạn đội đã tự ghi ra ở mọi chỗ con số này xuất hiện. Vòng 2 tồn tại để
gỡ đúng giới hạn đó — và để kiểm hai chỗ sản phẩm đã thất bại thật:

| Chỗ hỏng ở vòng 1 | Câu hỏi vòng 2 |
|---|---|
| 2 người nhìn **phí nhỏ** rồi tưởng chỉ mất phí | Còn ai đọc phí thành tổng thiệt hại không? |
| Có người thấy chữ **"demo"** rồi coi nhẹ cảnh báo | Chữ "demo" còn làm nhẹ cảnh báo không? |

## 1 · Ghi PHIÊN BẢN GIAO DIỆN — điều vòng 1 đã quên

```bash
git rev-parse --short HEAD    # chép vào `phienBanUi` trước khi hỏi người đầu tiên
```

Vòng 1 không ghi lại, nên phải truy ngược bằng `git log` mới biết giao diện lúc đó
là bản nền tối. **Không lặp lại.** Nếu giao diện đổi giữa chừng thì dừng, ghi rõ, và
**không trộn** hai nhóm.

## 2 · Người tham gia

- **12 người**, tối thiểu.
- **Không trùng** 20 người vòng 1. Người đã xem rồi thì đang nhớ, không phải đang đọc.
- Ghi kênh cho từng người: `video` · `goi thoai` · `truc tiep` · `tin nhan`.
- **Chỉ đo thời gian đọc** ở nhóm video/trực tiếp. Qua tin nhắn thì họ có thời gian
  tra cứu, và thời gian đo được là thời gian gõ phím.

## 3 · Bốn câu — hỏi TÁCH NHAU, đúng thứ tự

Hai câu đầu **giữ nguyên vòng 1** để so được. Hai câu sau là mới.

1. *"Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?"* — hỏi trước, im lặng, chép
   nguyên văn **trước khi** chấm.
2. *"Bạn sẽ làm gì, vì sao?"* — hỏi **sau** khi đã chép xong câu 1. Hỏi cùng lúc thì
   chính câu này đã mách rằng có gì đó đáng huỷ.
3. **MỚI** — chỉ vào dòng *"đã đọc hiểu 2 trên 3 lệnh"*: *"dòng này nói gì với bạn?"*
4. **MỚI** — *"phí giao dịch ở đây là bao nhiêu, và nó có liên quan gì tới số tiền
   bạn có thể mất không?"*

Câu 3 đo một thứ vòng 1 chưa đo: người dùng có hiểu **coverage** là mức đọc hiểu,
hay tưởng nó là điểm an toàn. Hiểu nhầm nó thành "2/3 an toàn" là hiểu ngược.

## 4 · Khung chấm

**Hai trục đầu giữ nguyên vòng 1** — `GIAO-THUC-PHONG-VAN.md` mục 4. Không sửa một chữ.

Hai trục mới:

| Hiểu coverage | Khi nào |
|---|---|
| **ĐÚNG** | Nói được đây là phần hệ thống **đã đọc hiểu**, còn phần chưa hiểu |
| **SAI** | Hiểu thành điểm an toàn, tỉ lệ an toàn, hoặc "2/3 ổn rồi" |
| **KHÔNG BIẾT** | Không đoán được dòng đó nói gì |

| Đọc nhầm phí | Khi nào |
|---|---|
| **CÓ** | Nói phí là khoản mất, hoặc dùng phí để kết luận thiệt hại nhỏ |
| **KHÔNG** | Tách được phí khỏi tài sản có thể mất |

## 5 · Ngưỡng — chốt TRƯỚC, không sửa sau khi thấy kết quả

| Chỉ số | Ngưỡng |
|---|---|
| Nêu được **mất tài sản** | ≥ 80 % |
| Nêu được **mất quyền kiểm soát** (đúng hoặc gần đúng) | ≥ 70 % |
| Hiểu coverage thành điểm an toàn | ≤ 10 % |
| Ký nhầm **chỉ vì** đọc nhầm phí nhỏ | **0 người** |

Không đạt thì **sửa đúng chỗ hỏng** rồi chạy thêm 3–5 buổi kiểm chứng. Không thay
toàn bộ thiết kế, và **không hạ ngưỡng**.

## 6 · So với vòng 1 — câu được nói và câu không

**Được nói:**

> *"Vòng 1 trên giao diện cũ: 13/20 nêu được hậu quả. Vòng 2 trên giao diện hiện tại:
> X/Y. Hai vòng khác mẫu người và khác cách hỏi, nên đây là tín hiệu về hướng đi, không
> phải một phép thử thống kê."*

**Không được nói:**

- *"Tăng X % có ý nghĩa thống kê"* — 12 và 20 người thì không nói được câu đó.
- *"AI cải thiện Y %"* nếu hai nhóm không được chia ngẫu nhiên từ trước.
- *"Tỉ lệ chuyển đổi"* cho quyết định huỷ. Huỷ giao dịch không phải conversion.

## 7 · Nhánh A/B cho AI — chỉ làm nếu đủ ≥ 20 người mới

Nếu tuyển được ≥ 20 người: 10 người xem lời giải thích **câu mẫu tất định**, 10 người
xem lời giải thích **từ mô hình**. Giữ nguyên verdict, bảng chênh lệch, coverage và
bố cục — chỉ đổi đoạn diễn giải.

- Chia nhóm **ngẫu nhiên, trước khi hỏi**. Không đổi người giữa chừng.
- Ghi `nhomAI` cho từng bản ghi.
- Đây là **exploratory**. n nhỏ, không tuyên bố ý nghĩa thống kê.

Chưa đủ 20 người thì **bỏ nhánh này**, đừng chia 6/6. Sáu người mỗi nhánh không nói
lên gì, và một con số không nói lên gì vẫn sẽ bị đọc như thể nó có nghĩa.

## 8 · Ghi kết quả

Vòng 2 ghi vào **file riêng** — `data/seed/phong-van-vong-2.json`:

```json
{
  "phienBan": 1,
  "vong": 2,
  "phienBanUi": "cf42a18",
  "nguonGoc": { "khoangPhongVan": "…", "aiHoi": "…", "cachHoi": "…" },
  "ban": [ /* … */ ]
}
```

> **Không gộp vào `phong-van.json`.** Hai vòng đo trên hai giao diện khác nhau với
> hai mẫu người khác nhau. Gộp lại là tạo ra một con số không đo được gì cả — và là
> lỗi mà `packages/core/test/phongVanVong2.test.ts` chặn sẵn.

Đếm bằng đúng bộ đếm của vòng 1, không viết bộ thứ hai:

```bash
node --experimental-strip-types scripts/kiem-phong-van.ts data/seed/phong-van-vong-2.json
```
