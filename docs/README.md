# Mục lục tài liệu

Thư mục này có hơn 80 tài liệu. Trang này nói **đọc cái nào trước**.

---

## Nếu bạn đang chấm điểm dự án

| # | Tài liệu | Trả lời câu hỏi |
|---|---|---|
| 1 | [**CUSTOS.md**](CUSTOS.md) | Nguồn quyết định duy nhất về sản phẩm — phạm vi đã khoá |
| 2 | [**adr/0001**](adr/0001-doi-huong-technical-build.md) | Vì sao đổi hướng Technical Build, bằng chứng theo từng mục rubric — và **năm điều ADR đó KHÔNG làm** |
| 3 | [**bao-mat/THREAT-MODEL.md**](bao-mat/THREAT-MODEL.md) | Ai nói dối được với Custos — 8 rủi ro, và **6 điều SDK không kiểm soát** |
| 4 | [**BENCHMARK.md**](BENCHMARK.md) | **Vì sao chưa có confusion matrix**, ba corpus và ba phạm vi |

Muốn xem thẳng code: [`packages/core/src/l2/rules.ts`](../packages/core/src/l2/rules.ts) — 14 luật, trái tim sản phẩm.

## Nếu bạn muốn tích hợp SDK

| Tài liệu | Vai trò |
|---|---|
| [`packages/core/README.md`](../packages/core/README.md) | **Tài liệu tích hợp chính.** Ví dụ trong đó có test chạy thật |
| [PILOT-TU-LAM.md](PILOT-TU-LAM.md) | Từ thư mục trống tới `inspect()` đầu tiên, bốn đường lỗi |
| [NGAN-SACH-RPC.md](NGAN-SACH-RPC.md) | Bảy chặng RPC — và vì sao **ngừng chờ ≠ huỷ request** |

---

## Theo chủ đề

**Đặc tả và quyết định**

| | |
|---|---|
| [CUSTOS.md](CUSTOS.md) | Nguồn quyết định duy nhất về sản phẩm |
| [DAC-TA-CORE.md](DAC-TA-CORE.md) | Trình tự L1, ranh giới L2/L3, luật theo nguồn dữ liệu |
| [DAC-TA-L3.md](DAC-TA-L3.md) | Đặc tả L3 và toàn bộ chữ tiếng Việt: từ vựng chốt, prompt |
| [adr/](adr/) | Ba quyết định kiến trúc, mỗi cái ghi rõ điều nó **không** làm |

**Bảo mật**

| | |
|---|---|
| [bao-mat/THREAT-MODEL.md](bao-mat/THREAT-MODEL.md) | 8 rủi ro kèm cơ chế đã đọc trong code |
| [bao-mat/MA-TRAN-HANH-VI.md](bao-mat/MA-TRAN-HANH-VI.md) | 19 họ ca kiểm thử |
| [bao-mat/DANH-GIA-KICHBAN-2026-09-19.md](bao-mat/DANH-GIA-KICHBAN-2026-09-19.md) | Chạy mô hình thật trên 9 kịch bản — kèm **một kết quả chưa sửa, ghi lại thay vì giấu** |

**Bằng chứng**

| | |
|---|---|
| [BENCHMARK.md](BENCHMARK.md) | Ba corpus, tập giữ lại, số đo suy giảm cohort |
| [SEED-DATASET.md](SEED-DATASET.md) | **Vì sao không được gọi kết quả trên tập âm là tỉ lệ false positive** |
| [PHONG-KICH-BAN-VA-AI-THAT.md](PHONG-KICH-BAN-VA-AI-THAT.md) | Phòng kịch bản và đường AI thật — kèm **bốn lỗi tìm được bằng đo** |
| [NGHIEM-THU-V01.md](NGHIEM-THU-V01.md) | Ma trận nghiệm thu 10 bề mặt |

**Kinh doanh**

| | |
|---|---|
| [MO-HINH-DOANH-THU.md](MO-HINH-DOANH-THU.md) | Ai trả, trả cho gì — **và giá nào là giả định** |
| [QUY-MO-THI-TRUONG.md](QUY-MO-THI-TRUONG.md) | Mô hình bottom-up, 7/8 biến là giả định |
| [BANG-CLAIM.md](BANG-CLAIM.md) | Mỗi tuyên bố kèm bằng chứng hoặc nhãn giả định |

**Cuộc thi**

| | |
|---|---|
| [cuoc-thi/](cuoc-thi/) | Thể lệ và lịch chính thức của BTC |
| [PITCH-VA-PHAN-BIEN.md](PITCH-VA-PHAN-BIEN.md) | Cấu trúc pitch, câu hỏi khó — và **danh sách câu không được nói** |
| [nop-bai/](nop-bai/) | Hồ sơ nộp: deck, video demo, ảnh, logo |

**Đang làm — vòng toàn quốc:** [review/national-20260925/FINDINGS.md](review/national-20260925/FINDINGS.md) bảng finding trước/sau · [MENTOR-28-09.md](review/national-20260925/MENTOR-28-09.md) gói mentor · lịch ở [cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md](cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md).

**Lưu trữ** — không cần đọc: [review/](review/) 96 biên bản qua các phiên · [roadmap/](roadmap/) trạng thái từng việc.

---

## Nguyên tắc viết tài liệu ở đây

**Mọi con số phải chạy lại được.** Không con số nào gõ tay; chúng sinh từ `npm run so-lieu` hoặc từ artifact trong repo, và có guard kiểm tài liệu không mang số cũ.

**Ba chữ, ba nghĩa — dùng lẫn là nói sai về chính mình:**

| Chữ | Nghĩa |
|---|---|
| bị **cáo buộc** | có mã lý do buộc tội một hành vi cụ thể |
| bị **gắn cờ** | verdict khác Xanh, gồm cả cờ vì thiếu thông tin |
| **báo nhầm** | gắn cờ SAI — cần ground truth mới nói được |

**Điều chưa đo được thì ghi là chưa đo được**, không ghi là đã pass.
