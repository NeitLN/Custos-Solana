# Decoder tiếp theo nên viết cho ai

**Trả lời: chưa nên viết cái nào.** Đây là kết luận từ số đo, và nó ngược với giả
định đang ghi trong `CLAUDE.md`.

```bash
npm run thong-ke-chuong-trinh      # đọc data/seed/tx/*.base64, không chạm mạng
```

---

## 1 · Số đo trên 29 giao dịch mainnet lưu offline

| | |
|---|---|
| Tổng lệnh | **75** |
| Đọc hiểu được | **63** — 7 chương trình |
| Chưa có decoder | **12** — 6 chương trình |
| Không phân giải được | **0** |

Cùng cohort mà con số coverage 82 % được đo, nên hai phép đo nói về cùng một tập.

---

## 2 · Xếp hạng phần chưa đọc hiểu

| Số lệnh | Số tx | Chương trình |
|---:|---:|---|
| 5 | **1** | `MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA` |
| 2 | 2 | `2VSNUquk7FqkbS27WJpm6J1175EhoLcGtxuExu3wrzVz` |
| 2 | 2 | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` — SPL Memo |
| 1 | 1 | `BYdq7NJXWHnTzzCogT6VByrPXvUQwkD5PuZQLS8JvZtw` |
| 1 | 1 | `3QUnrcMqCQoiGB73s1A6uDzxziywaNFpTLiZiiZbEUoN` |
| 1 | 1 | `Duc1NDjQzUPv8HZkB27TSwddPwAd4EiEBj1Nxe2QonYN` |

Chương trình đứng đầu có 5 lệnh nhưng **chỉ trong một giao dịch duy nhất**. Viết
decoder cho nó là tối ưu hoá cho một mẫu.

---

## 3 · Vì sao "chưa có decoder cho DEX" không còn là khoảng trống

`CLAUDE.md` liệt kê *"chưa có decoder cho chương trình DEX"* ở mục **Chưa có**. Số đo
nói khác:

| Số lệnh | Số tx | Chương trình đã đọc hiểu |
|---:|---:|---|
| 19 | 15 | SPL Token |
| 19 | 10 | Compute Budget |
| 11 | 11 | System |
| 6 | 4 | Associated Token Account |
| **4** | **4** | **Anchor `pAMMBa…` — IDL trên chuỗi** |
| 3 | 3 | Token-2022 |
| **1** | **1** | **Anchor `JUP6Lk…` — IDL trên chuỗi** |

Hai chương trình DEX xuất hiện trong cohort — Jupiter và Pump AMM — **đã đọc hiểu
được**, qua đường IDL công bố trên chuỗi chứ không phải qua decoder viết tay. Đường
đó đã dựng xong; nó tự phủ chương trình Anchor mới mà không cần thêm mã.

Nói cách khác: khoảng trống đã được lấp bằng một cơ chế tổng quát, và mục "Chưa có"
trong `CLAUDE.md` là câu chưa cập nhật.

---

## 4 · SPL Memo — thấy được, nhưng không nên vội

`MemoSq4gq…` xuất hiện 2 lệnh / 2 tx và **giải mã rất dễ**: dữ liệu lệnh chỉ là văn
bản UTF-8.

Nhưng nội dung memo là **chuỗi do người tạo giao dịch đặt** — tức dữ liệu không đáng
tin, đúng nhóm với `kyHieu` của token mà repo này đã phải dựng `kyHieuAnToan()` để
lọc. Đọc được memo mà hiển thị thẳng là mở một bề mặt chữ do kẻ tấn công điều khiển,
ngay trên màn hình người dùng đọc trước khi ký.

Nếu làm, phải làm cùng lúc ba việc: giải mã, lọc qua cùng bộ lọc hình dạng, và một
ca đối chứng cho memo mang chữ giả dạng cảnh báo của Custos. **Không tính là việc
nhỏ.**

---

## 5 · Điều số đo này KHÔNG nói

- **Không nói coverage sẽ luôn là 84 %.** 29 giao dịch không đại diện cho traffic
  mainnet; chúng là mẻ mẫu đội bắt được ở một thời điểm.
- **Không nói không có DEX nào cần decoder.** Nó nói: trong *cohort này*, DEX xuất
  hiện đều đã đọc được qua IDL. Một mẻ mẫu khác có thể lộ ra chương trình khác.
- **Không phải phép đo độ chính xác.** Đây là đếm phạm vi đọc hiểu, không phải đo
  đúng/sai.

Muốn kết luận mạnh hơn thì cần mẻ mẫu lớn hơn — `scripts/khao-sat-chuong-trinh.ts`
làm được điều đó trên mainnet, nhưng nó cần chủ dự án mở cổng `CUSTOS_MAINNET_RPC`.
