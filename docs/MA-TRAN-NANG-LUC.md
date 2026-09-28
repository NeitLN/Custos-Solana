# Ma trận năng lực — Custos đọc hiểu được đến đâu

> **TỆP NÀY ĐƯỢC SINH RA.** Sửa tay sẽ bị ghi đè ở lần chạy sau.
> Nguồn: `packages/core/src/l1/nang-luc.ts` · sinh bằng
> `node --experimental-strip-types scripts/tao-ma-tran-nang-luc.ts`

## Hai mức, và chúng không thay nhau được

| | Nghĩa | Custos làm được gì |
|---|---|---|
| **đọc được tên** | biết lệnh tên là gì | hiện tên lệnh, biết nó thuộc program nào |
| **hiểu hậu quả** | biết ai mất gì, cho ai | phân biệt *chủ tài khoản tự chuyển* với *delegate ra tay* |

Đọc được `"swap"` từ IDL của một DEX **không** có nghĩa Custos biết swap đó lấy bao
nhiêu của ai. Gộp hai mức lại là nói quá về mức hoàn thiện.

## Số đo

| | |
|---|---|
| Chương trình đọc được tên lệnh | **13** |
| Chương trình hiểu được hậu quả | **2** |
| Lệnh đọc được tên | **377** |
| Lệnh hiểu được hậu quả | **8** |

Khoảng cách giữa 377 và 8 là phần Custos **chưa**
hiểu, và nó là phần lớn.

## Bảng đầy đủ

| Program | Tên | Mức | Lệnh đọc tên | Lệnh hiểu hậu quả | Nguồn nhận dạng |
|---|---|---|---|---|---|
| `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` | Anchor LBUZKh… (IDL trên chuỗi) | đọc được tên | 77 | 0 | IDL trên chuỗi |
| `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | SPL Token | **hiểu hậu quả** | 44 | 4 | bảng trong repo |
| `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` | Token-2022 | **hiểu hậu quả** | 44 | 4 | bảng trong repo |
| `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P` | Anchor 6EF8rr… (IDL trên chuỗi) | đọc được tên | 41 | 0 | IDL trên chuỗi |
| `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK` | Anchor CAMMCz… (IDL trên chuỗi) | đọc được tên | 39 | 0 | IDL trên chuỗi |
| `pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ` | Anchor pfeeUx… (IDL trên chuỗi) | đọc được tên | 30 | 0 | IDL trên chuỗi |
| `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA` | Anchor pAMMBa… (IDL trên chuỗi) | đọc được tên | 28 | 0 | IDL trên chuỗi |
| `DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH` | Anchor DF1ow4… (IDL trên chuỗi) | đọc được tên | 19 | 0 | IDL trên chuỗi |
| `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` | Anchor JUP6Lk… (IDL trên chuỗi) | đọc được tên | 18 | 0 | IDL trên chuỗi |
| `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc` | Orca Whirlpool | đọc được tên | 17 | 0 | bảng trong repo |
| `11111111111111111111111111111111` | System | đọc được tên | 13 | 0 | bảng trong repo |
| `ComputeBudget111111111111111111111111111111` | Compute Budget | đọc được tên | 4 | 0 | bảng trong repo |
| `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | Associated Token Account | đọc được tên | 3 | 0 | bảng trong repo |

## Người dùng làm gì với phần chưa hỗ trợ

| Tình huống | Làm được gì |
|---|---|
| Chương trình **không biết** | Xem địa chỉ program đầy đủ trong phần chẩn đoán, tự tra trên explorer |
| Chương trình **đọc được tên** | Đọc tên lệnh để đối chiếu với thứ dApp nói nó sẽ làm |
| Lượt kiểm **thiếu dữ liệu RPC** | Kiểm lại khi mạng ổn định — đây là thiếu tạm thời, không phải chưa hỗ trợ |

## Cặp đối chứng — hiểu hậu quả nghĩa là phân biệt được hai ca gần giống nhau

Sinh từ `data/doi-chung/ck10.json`. Mỗi ca chạy được (phát lại, seed) được test so **cả mã
thiếu lẫn cáo buộc thừa**; ca fixture trỏ tới test có thật. Nhãn do: Claude Code (phiên 28/09/2026) theo ngữ nghĩa từng giao dịch; chủ dự án CHƯA duyệt từng nhãn.

| Điều cần chứng minh | Ca kích hoạt | Ca đối chứng | Giới hạn |
|---|---|---|---|
| Không chỉ xét địa chỉ delegate: cùng người được uỷ quyền mà hạn mức tăng vọt vẫn là mở rộng quyền rút. | `cung-delegate-1-len-max` (fixture trong test) | `cung-delegate-giu-nguyen` (fixture trong test) | Hai ca dựng bằng RPC giả trong test, không ghi từ Devnet. |
| Phân biệt tài sản và quyền: chuyển token thường không bị cáo buộc; chuyển kèm đổi chủ tài khoản thì bị; chỉ đổi chủ thì không hiện số dư giảm. | `tan-cong-day-du` (phát lại Devnet)<br>`doi-chu-tai-khoan` (phát lại Devnet) | `lanh-tinh` (phát lại Devnet) | Phản hồi RPC ghi từ Devnet trên hiện trường của ví cố định; phát lại không phải giao dịch mới. |
| Không gắn đỏ mọi approve: cấp quyền đúng bằng số dư là hành vi sàn giao dịch bình thường; vượt số dư mới là mở quyền rút không giới hạn thực tế. | `cap-quyen-vuot-so-du` (phát lại Devnet)<br>`R03-pos` (seed) | `cap-quyen-vua-du` (phát lại Devnet)<br>`R03-neg` (seed) | Ngưỡng 'vượt số dư' là quy ước của luật 3, không phải chân lý; seed R03 là tổng hợp. |
| Hậu quả lồng trong CPI có bằng chứng; CPI lành của chương trình đã xác minh không bị cáo buộc; thiếu stack thì không dựng cây giả. | `cpi-doi-chu-giau` (fixture trong test) | `cpi-ata-devnet` (mô phỏng Devnet)<br>`cpi-la-chi-chuyen` (fixture trong test) | Ca CPI NGUY HIỂM là fixture (RPC giả) — không viết chương trình on-chain đạo cụ (quyết định khoá số 5). Ca lành là mô phỏng Devnet thật, chạy tay, có biên bản. |
| Thiếu mint hoặc thiếu vị trí account trong kết quả mô phỏng thì KHÔNG giả số 0 / decimals 0 và không bịa mất mát; mức không bao giờ An toàn. | `thieu-mint` (fixture trong test)<br>`mang-mo-phong-ngan` (fixture trong test) | `doc-duoc-mint` (fixture trong test)<br>`null-dung-vi-tri` (fixture trong test) | Lỗi RPC dựng trong test; chưa có fixture ghi từ một lượt RPC thật trả thiếu. |
| Address Lookup Table giải đủ thì định danh account đúng, không gắn cờ; giải không được thì coverage nói thật và chỉ cảnh báo, không cáo buộc. | `R10-pos` (seed) | `R10-neg` (seed) | Seed tổng hợp (synthetic-devnet). ALT là năng lực hợp lệ của giao thức — chỉ thiếu dữ liệu mới gắn cờ (quyết định khoá số 6). CẶP NÀY LẪN BIẾN: cả hai giao dịch chuyển ~4,84 SOL khỏi ví (dựng 21/08, trước khi có luật 13 ngày 03/09), nên cả hai mang cáo buộc SOL_ROI_VI đúng sự thật; cặp chỉ phân biệt ALT đủ/thiếu qua mã ALT_KHONG_GIAI_DUOC. Việc còn mở: một cặp ALT không chuyển SOL. |

## Ba điều bảng này KHÔNG nói

1. **Không** nói program nào đáng tin. *Known program* ≠ *trusted program*.
2. **Không** nói "đã hỗ trợ protocol X" — chỉ nói đọc được tên hay hiểu được hậu quả.
3. **Không** nói giao dịch nào an toàn. Mức năng lực mô tả **Custos**, không mô tả
   giao dịch.
