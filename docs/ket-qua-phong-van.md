# Kết quả phỏng vấn người dùng — CHƯA THỰC HIỆN

**Trạng thái tính đến 24/08/2026: chưa phỏng vấn người dùng nào.**

Ghi rõ ở đây thay vì để file trống lửng lơ, vì một biên bản rỗng dễ bị đọc thành
"đã làm mà chưa chép". Chưa làm thì nói chưa làm.

---

## Điều này ảnh hưởng gì tới bài thi

Phỏng vấn **không** nằm trong 5 hạng mục nộp bài bắt buộc của thể lệ. Nó chỉ nuôi
tiêu chí *"Độ rõ ràng của bài toán thị trường và người dùng mục tiêu"*, và vì thiếu
nó nên `CUSTOS.md` mục 13 tự chấm ô đó **6,5/10** thay vì cao hơn.

**Câu trả lời khi bị hỏi trên sân khấu — nói thẳng, đừng vòng:**

> *"Chưa. Chúng em chưa phỏng vấn người dùng nào. Đó là khoảng trống lớn nhất còn
> lại của dự án, và chúng em biết nó nằm ở đâu: bộ đo đã dựng sẵn tại
> `/phong-van.html`, giao thức đã viết, chỉ chưa chạy kịp trước hạn."*

Trả lời như vậy mất một ít điểm ở ô đó. Nhưng nó **giữ nguyên** độ tin của mọi con
số khác — 242 test, 0 cáo buộc sai trên giao dịch mainnet thật, chi phí biên đo
được — và đó là phần lớn hơn nhiều.

---

## Nếu vẫn kịp làm trước hạn

Bộ đồ nghề còn nguyên, chạy được ngay:

| | |
|---|---|
| Công cụ | https://neitln.github.io/Custos-Solana/phong-van.html |
| Giao thức | `docs/GIAO-THUC-PHONG-VAN.md` |
| Đếm và soi | `node --experimental-strip-types scripts/kiem-phong-van.ts` |

**5 người cũng đủ.** Con số công bố là số thật đã hỏi, không phải số đã định hỏi:
*"5 người, không ai làm trong ngành, 4 nêu được hậu quả"* là câu dùng được.

Khi có kết quả, đổ vào `data/seed/phong-van.json` rồi chạy script — nó tự đếm và nêu
chỗ chấm lệch.

---

## Không được làm

Không dựng biên bản từ dữ liệu mô phỏng, dữ liệu role-play, hay trí nhớ không có
ghi chép. Thể lệ: *trình bày sai về tính năng, dữ liệu, mức hoàn thiện bị trừ điểm
hoặc loại* — và con số bịa kéo theo cả những con số thật xuống cùng.
