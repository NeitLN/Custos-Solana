# Tích hợp Custos từ số không

dApp mẫu gọi `inspect()` **trước khi ký**. Cài SDK như một người ngoài — từ tarball,
bằng JavaScript thuần, không cờ biên dịch.

> ⚠️ **Ví dụ này do chính đội Custos viết.** Nó chứng minh SDK cài được và dùng được
> từ ngoài monorepo, và đo được tích hợp tốn bao lâu. Nó **không** chứng minh có bên
> thứ ba nào đã chọn dùng Custos. Xem `data/tich-hop/ket-qua.json` — trường `doiTac`
> còn là `null`.

## Chạy

```bash
node scripts/thu-tich-hop.mjs      # từ gốc monorepo: dàn ra thư mục tạm rồi chạy thật
```

Hoặc tự dựng, đúng cách một bên tích hợp làm:

```bash
npm install @custos-solana/core @custos-solana/ai @solana/web3.js @solana/spl-token
node src/chay.js hien-truong.json
```

`hien-truong.json` đóng vai **cấu hình của chính dApp** (mint, tài khoản token). Một
dApp thật đã có sẵn những địa chỉ đó; nó không lấy chúng từ Custos.

## Đo được (Devnet, 04/09/2026)

| | |
|---|---|
| Cài đặt → kết quả đầu tiên | **10,8 giây** |
| Dòng mã tích hợp | **29** (`src/tich-hop.js`) |
| Một lượt `inspect()` | **1 247 ms** |
| Cần khoá riêng | **không** — `inspect()` mô phỏng, mô phỏng không đòi chữ ký |
| Cần khoá API mô hình | **không** — đường tất định `dienGiaiKhongAI` |

## Ba kịch bản

| | Kỳ vọng | Kết quả |
|---|---|---|
| Chuyển 0,01 SOL | không bị cản vô lý | `safe` → ký |
| dApp khai "airdrop", thật ra rút token + đổi chủ tài khoản | bị chặn | `danger` · `SPL_SET_AUTHORITY__ACCOUNT_OWNER` · đọc hiểu 2/2 |
| RPC chết | **không** được thành ký được | chặn, kèm lý do kỹ thuật |

## Ba ràng buộc bên tích hợp phải giữ

Tất cả nằm trong `src/tich-hop.js` — 29 dòng, đọc hết được.

1. **`nguoiDung` lấy từ VÍ, không từ dApp.** Để dApp khai hộ địa chỉ người ký là mở
   đúng cái cửa mà trường này sinh ra để đóng.
2. **`expectedAction` là điều dApp KHAI.** Khớp thì không hạ mức; lệch thì nâng nghi
   ngờ. Ngữ cảnh chỉ được làm sản phẩm thận trọng hơn, không bao giờ dễ dãi hơn.
3. **Fail closed.** Lỗi, quá hạn, mất mạng đều không được thành "an toàn".

## Cái bẫy đã sập một lần

Bản đầu của ví dụ này **suy tài khoản token từ ATA**. Sai: sau một lần `SetAuthority`,
ATA cũ đã đổi chủ nên phải tạo tài khoản mới — hiện trường devnet đang đúng tình trạng
đó.

Hậu quả không ồn ào. Giao dịch trỏ vào tài khoản không tồn tại, mô phỏng hỏng, và
Custos trả `warning` + `MO_PHONG_HONG` thay vì `danger`. Fail-safe chạy đúng, nhưng
kịch bản tấn công thì **không được kiểm** — và bài test vẫn có thể xanh nếu người viết
nó chỉ khẳng định "không phải safe".

**Bên tích hợp: truyền tài khoản token bạn đang dùng, đừng suy ra.**
