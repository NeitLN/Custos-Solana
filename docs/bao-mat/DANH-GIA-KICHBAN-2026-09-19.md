# Lượt chạy MÔ HÌNH THẬT trên phòng kịch bản — 19/09/2026

Chạy lớp L3 với `claude-haiku-4-5-20251001` trên **7 kịch bản mới** của phòng kịch
bản (`apps/demo-wallet/src/kichBan.ts`). Khoá đọc từ biến môi trường; bản deploy
công khai **không** mang khoá.

Script: `scripts/ky-thuat/chay-kichban-that.ts`.

## 1 · Số đo thật

| Chỉ số | Giá trị |
|---|---|
| Số ca | 7 |
| Độ trễ **trung vị** | **2 114 ms** |
| Độ trễ cao nhất | 3 063 ms |
| Token vào | 4 754 |
| Token ra | 1 193 |
| Lỗi API | 0 |

Độ trễ cao nhất 3 063 ms nằm dưới `hanMacDinhMs` 4 000 ms, nên lượt này **không ca
nào bị cắt**. Lượt 18/09 có một ca 4 307 ms — tức ngưỡng đó không dư nhiều như con
số trung vị gợi ý.

## 2 · Phạm vi — điều lượt này KHÔNG chứng minh

Lượt này chạy L3 trên `Facts` **dựng sẵn**, không mô phỏng qua RPC. Nó đo phần
diễn giải, không đo phần bóc tách. Cụ thể nó KHÔNG nói gì về:

- độ chính xác của L1 trên giao dịch thật;
- hành vi khi Devnet chậm hoặc trả lỗi;
- `level` — do L2 sinh, không đi qua mô hình.

## 3 · Một kết quả gây chú ý ở ca đối chứng — và nó KHÔNG phải lỗi mô hình

Ca `cap-quyen-vua-du` là **đối chứng**: cấp quyền rút đúng bằng số dư, engine phải
im. Nhưng đầu ra có `aiAdvisory: review_required`.

**Đã tra lại, và thủ phạm không phải mô hình.** Chạy riêng đường tất định
(`dienGiaiKhongAI`) trên cùng `Facts` cho ra **cùng một** `review_required`. Nguồn
nằm ở `packages/ai/src/nhanDien.ts:82`: L3 ghi nhận `cap_quyen_rut` khi thấy
**delegate mới bất kỳ**, không xét hạn mức.

**Và L2 thì phân biệt đúng.** Chạy trực tiếp 14 luật trên hai `Facts`:

```
VƯỢT số dư (1 010 000 000)  ⇒ 1 hit: SPL_APPROVE_DELEGATE_LON
VỪA ĐỦ    (  500 000 000)  ⇒ 0 hit
```

Nghĩa là `level` — thứ duy nhất được gọi là verdict — **đúng ở cả hai ca**. Cặp
dương/âm vẫn chứng minh được điều nó sinh ra để chứng minh.

Cái lệch nằm ở tầng **lời khuyên**, không ở tầng **phán quyết**. Người xem ca đối
chứng thấy verdict sạch nhưng đọc được một câu nói tới "cấp quyền rút".

### Vì sao KHÔNG sửa trong lượt này

Ba lý do, và không lý do nào là "để sau cho nhanh":

1. **Đây có thể là hành vi đúng.** Một delegate mới là việc người dùng nên biết,
   kể cả khi hạn mức hợp lệ. L3 khuyên *xem kỹ*; nó không kết luận nguy hiểm. Bất
   đối xứng giữa "khuyên xem" và "kết tội" là thiết kế đã khoá, không phải lỗi.
2. **`nhanDien.ts` thuộc vai C.** docs/CUSTOS.md: không sửa chéo thư mục người khác.
3. **Sửa mà không có ca kiểm riêng là mở một lỗ khác.** Nếu L3 im khi hạn mức bằng
   số dư, nó sẽ im cả khi delegate là ví lạ trong một giao dịch mà L2 chưa phủ.

Ghi lại làm việc còn mở, **không im lặng chỉnh cho báo cáo đẹp hơn**.

## 4 · Bộ chắn đối kháng trên đường kịch bản

`apps/demo-wallet/test/kichBanDoiKhang.test.ts` — 3/3 chặn, và cả ba **đã được
chứng minh đỏ** bằng đột biến (gỡ `soiDauRa` khỏi `dienGiaiBangMoHinh`):

| Ca | Kết quả | Đột biến làm nó đỏ? |
|---|---|---|
| Mô hình bị chiếm hoàn toàn, trả câu trấn an + `level: "safe"` | CHẶN | ✓ đỏ |
| Mô hình bịa địa chỉ ví | CHẶN | ✓ đỏ |
| Ký hiệu token độc hiện nguyên văn | CHẶN | — (đường tất định) |

Ca thứ nhất đáng nói riêng: mô hình trả về cả trường `level`. Kiểu `Interpreter`
không có trường đó, nên nó bị bỏ — L3 **không chạm được** vào verdict kể cả khi mô
hình cố tình gửi lên.

## 5 · Trạng thái khoá

Đã đối chiếu **khoá thật trong môi trường máy dev** với toàn bộ 52 file trong
`apps/demo-wallet/dist`: không file nào chứa khoá, và không có chuỗi khớp mẫu
`sk-ant-…`. `npm run soi-khoa` cũng sạch trên 17 file của "site".

Khoá chỉ được đọc ở `api/dien-giai.ts`, phía server.
