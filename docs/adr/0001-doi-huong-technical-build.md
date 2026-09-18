# ADR-0001 · Phát triển theo hướng Best Technical Build

**Trạng thái:** đã quyết cho **hướng phát triển**; **đăng ký BTC chưa xác nhận cập nhật**
**Ngày:** 13/09/2026 · **Vai:** Lead, Judge/Docs
**Việc TB-G02 của [`ROADMAP-TECHNICAL-CUSTOS.md`](../../ROADMAP-TECHNICAL-CUSTOS.md)**

---

## 1 · Hai thứ khác nhau, và trang này không được gộp chúng

| | Trạng thái |
|---|---|
| **Hướng phát triển** của đội từ 12/09 | **Best Technical Build** — đã quyết, đang thực thi |
| **Đăng ký với BTC** | **Best Product & Business** — form nộp 24/08, **chưa có bằng chứng đã cập nhật** |

Chủ dự án cho biết BTC **cho phép** đổi track. Được phép đổi **không** đồng nghĩa
biểu mẫu đã đổi. Trang này ghi đúng khoảng cách đó thay vì tuyên bố đã đổi xong —
xem [TB-H01](../roadmap/TIEN-DO.md).

**Chủ đề giữ nguyên: AI × Web3.** Track và chủ đề là hai lựa chọn khác nhau; chưa có
căn cứ nào cho rằng BTC đồng ý đổi chủ đề. Quyết định số 1 (AI không tạo `level`)
không đổi, và mô tả về AI vẫn phải nói đúng giới hạn đã đo được.

**Thể lệ trong repo vẫn gọi Custos là "Track 1 — Best Product & Business".** Đó là
nguồn gốc và `lichThi.test.ts` canh nó. Trang này **không** sửa thể lệ và **không**
sửa `THONG-TIN-VONG-HIEN-TAI.md` mục "Track đăng ký" — hai chỗ đó chép từ văn bản
BTC, không chép từ ý định của đội.

## 2 · Rubric Technical — nguyên văn từ thể lệ

Lấy từ [`Thể lệ UniHackfest 2026.md`](../cuoc-thi/Thể%20lệ%20UniHackfest%202026.md)
dòng 141–148, BTC cập nhật 21/07/2026.

| Tiêu chí | Trọng số |
|---|---:|
| Độ khó và chiều sâu kỹ thuật của giải pháp | **30 %** |
| Kiến trúc on-chain/off-chain, chất lượng smart contract | **25 %** |
| Mức tận dụng Solana stack, composability, hiệu năng | **25 %** |
| Độ hoàn thiện demo và khả năng trình bày | **20 %** |

Đối chiếu track cũ: 25 % thị trường · 30 % demo · 25 % kinh doanh/GTM · 20 % trình bày.
**50 % của track cũ hỏi những câu đội không thể bổ sung bằng chứng** (thị trường,
người mua). Đó là lý do đổi hướng — không phải vì phần kỹ thuật đã mạnh hơn.

> **Mục 25 % có chữ "smart contract", và Custos KHÔNG có smart contract.** Đây là
> rủi ro lớn nhất của quyết định này, và nó chưa được giải. Câu hỏi cho BTC đã soạn
> ở TB-H01. **Không** thêm on-chain program để lấp chỗ đó: quyết định thiết kế số 5
> đã loại Anchor program khỏi bản thi, và thêm một contract chỉ để có contract trong
> sơ đồ là đúng thứ review 12/09 cảnh báo.

## 3 · Một mô tả thống nhất — dùng ở mọi nơi

> **Custos là SDK phân tích giao dịch Solana chạy phía client.** Nó mô phỏng giao
> dịch **trước khi người dùng ký**, đối chiếu trạng thái tài khoản trước/sau, rồi chỉ
> ra những hậu quả **không thuộc về hành động chính** — và giải thích bằng tiếng Việt.

| | |
|---|---|
| **Người tích hợp** | ví và dApp Solana (họ cài SDK, họ thực thi chính sách ký) |
| **Người thụ hưởng** | người dùng cuối — họ **không** cài gì, **không** trả tiền |
| **Hình dạng** | SDK/API off-chain, không smart contract, không ghi lên chain |
| **Mạng** | Devnet |

**Điểm khó kỹ thuật — nguyên tắc kiến trúc, không phải danh sách tính năng:**

> Ưu tiên phát hiện qua **thay đổi trạng thái**, không qua **đọc instruction**.

Kẻ tấn công giấu được instruction — bọc trong CPI, gói trong program riêng, nén địa
chỉ vào ALT. Nhưng **không giấu được hậu quả**: quyền sở hữu đổi chủ thì trạng thái
sau mô phỏng khác trước, bất kể instruction nào gây ra. Đây là bài học từ ca Coinspect
(mô phỏng bỏ lọt vì đọc instruction, không đối chiếu trạng thái) —
[`DAC-TA-CORE.md`](../../DAC-TA-CORE.md) mục 1.

## 4 · Bằng chứng theo từng mục rubric — số đo được, không hứa

Mọi con số dưới đây sinh từ `npm run so-lieu` hoặc artifact trong repo. **Không** con
số nào gõ tay.

### 30 % · Độ khó và chiều sâu

| Bằng chứng | Số |
|---|---|
| Luật L2, mỗi luật có ca dương **và** ca đối chứng | **14** |
| Test tự động, offline | **862** |
| Mẫu đã gắn nhãn | **38** |
| Xử lý đặc thù Solana | CPI/inner instruction · ALT · Token-2022 (Permanent Delegate, Transfer Hook) · nhiều signer, phân biệt người dùng với fee payer |
| Phân tầng tin cậy | 8 rủi ro có cơ chế hoặc khai là giới hạn — [`THREAT-MODEL.md`](../bao-mat/THREAT-MODEL.md) |

**Không hứa tỷ lệ phát hiện.** Chưa có ground truth cho cohort nên **chưa đo được**
tỉ lệ báo nhầm — `SEED-DATASET.md` mục 0b3/0b4.

### 25 % · Kiến trúc on-chain/off-chain

Ba lớp, ranh giới **cưỡng chế bằng kiểu dữ liệu**, không bằng quy ước:

| Lớp | Việc | Ai sinh `level` |
|---|---|---|
| **L1** | mô phỏng + bóc tách trạng thái trước/sau | — |
| **L2** | 14 luật trên `Facts` | **chỉ L2** |
| **L3** | diễn giải tiếng Việt, `aiAdvisory` | **không bao giờ** |

`InspectResult` đóng băng làm giao thức phối hợp giữa bốn người.
**Off-chain có chủ ý:** Custos đọc và mô phỏng; lớp thực thi "có cho ký hay không"
là **chính ví** — [`THREAT-MODEL.md`](../bao-mat/THREAT-MODEL.md) mục 3.8. SDK không
nằm giữa người dùng và khoá, và không hứa là có.

### 25 % · Solana stack, composability, hiệu năng

| Bằng chứng | Số |
|---|---|
| Chương trình đọc hiểu được qua **IDL công bố trên chuỗi** | **7** · **245** mã lệnh |
| Lệnh đọc hiểu được trên cohort | **63** |
| Coverage trung bình | **82 %** trên 9/20 mẫu còn mô phỏng được |
| Lượt gọi RPC mỗi lượt kiểm | trung vị **6,5** (dải 4–9) |
| Cài từ ngoài repo tới kết quả đầu | **11,7 s** · **30** dòng mã tích hợp |
| Một lượt `inspect()` | **596 ms** |
| Ngân sách RPC và thời hạn từng chặng | [`NGAN-SACH-RPC.md`](../NGAN-SACH-RPC.md) |

**Composability đo bằng consumer ngoài repo**, không bằng lời: 10/10 bẫy bị chặn trên
gói cài **từ registry**, kèm 3/3 đối chứng dương.

### 20 % · Độ hoàn thiện demo và trình bày

| Bằng chứng | Số |
|---|---|
| Vi phạm axe | **0/40** — 4 trang × 2 khung, `wcag2a/aa · wcag21a/aa` |
| Vùng bấm ≥44 px | **26/26** ở 375 px |
| Bàn phím · zoom · chữ dài | **16/16** |
| First Contentful Paint | **116 ms** · 173 KB qua dây |
| Bấm → thẻ kết quả | **n=30**, 0 lượt hỏng · trung vị **1916 ms** · p95 quan sát **3959 ms** · dải **866–5487 ms** (dao động 6,3×). Số cũ ~850 ms đo trên 4 lượt |
| Demo công khai | hai trang, CI dựng lại mỗi lần push, chặn rò rỉ khoá |

**Chưa có:** video demo dự phòng (BTC **bắt buộc**). Phạm vi mọi số giao diện:
**Chromium headless, viewport giả lập** — chưa kiểm WebKit/Firefox/thiết bị thật.

## 5 · Điều ADR này KHÔNG làm

1. **Không chấm lại điểm cũ.** `CUSTOS.md` mục 13 giữ **6,95** và mục đó cấm tự nâng
   điểm cho khớp tin mới. Review 12/09 tạm chấm **7,4/10** theo rubric Technical —
   đó là **một ảnh chụp riêng, của một người chấm khác, theo một rubric khác**, không
   thay điểm cũ và không phải điểm BTC.
2. **Không đòi thị trường hay phỏng vấn mới.** Mục 1.3 roadmap Technical đã hoãn
   buyer interview và usability vòng 2 theo phạm vi. Dữ liệu 20 cuộc phỏng vấn thật
   (29–30/08) **giữ nguyên**, không đổi thành synthetic.
3. **Không xoá nội dung kinh doanh.** `QUY-MO-THI-TRUONG.md`,
   `MO-HINH-DOANH-THU.md`, `DON-VI-KINH-TE.md` còn nguyên — chúng vẫn đúng, chỉ
   không còn là trọng tâm ghi điểm. `DON-VI-KINH-TE.md` đặc biệt vẫn cần cho mục
   25 % hiệu năng (chi phí RPC mỗi lượt).
4. **Không sửa thể lệ hay nguồn lịch.** Hai file đó chép từ văn bản BTC.
5. **Không thêm smart contract.** Xem mục 2.

## 6 · Cái gì phải đổi trong tài liệu, và cái gì không

| File | Đổi gì |
|---|---|
| `README.md` | Thêm hướng phát triển Technical **cạnh** track đăng ký; đưa bảng bằng chứng kỹ thuật lên trước phần "Ai mua" |
| `CLAUDE.md` | Ghi cả hai: track đăng ký (BTC) và hướng phát triển (đội) |
| `docs/nop-bai/README.md` | Ghi rõ form 24/08 nộp theo track cũ, và trạng thái cập nhật chưa xác nhận |
| `PITCH-VA-PHAN-BIEN.md` | **Chưa đổi ở thẻ này** — thuộc TB-D02, phụ thuộc TB-X03 |
| `CUSTOS.md` · thể lệ · `THONG-TIN-VONG-HIEN-TAI.md` | **Không đổi** (mục 5) |
