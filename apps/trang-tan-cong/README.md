# SolBonus — B3

Đạo cụ nhận thưởng trên **Solana Devnet**, dùng ví cố định
`AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`.

Luồng: dApp đọc chain → dựng giao dịch → `useWallet().signTransaction()` → cửa sổ ví
kiểm bằng Custos và hỏi người dùng → trả bytes đã ký → dApp gửi đúng bytes đó.
Chỉ import `@custos-solana/connector` để đăng ký ví mẫu; không dùng core, AI hoặc mã nguồn ví.

## Thử cục bộ

```powershell
npm install
npm run vi
# Terminal thứ hai:
npm run tan-cong
```

Mở `http://localhost:5189/`, chọn **Custos Wallet → Kết nối ví → Cho kết nối**.
Giữ cửa sổ ví ở cổng 5188 mở.

- **Có điều kiện ẩn:** bấm **Tìm token DEMO trên Devnet**, chọn phiên, bấm nhận thưởng.
  Ví phải hiện kết quả thật cho chuyển nửa số DEMO + đổi chủ tài khoản. Bấm **Chặn giao dịch**
  để kết thúc mà không gửi. Nếu chủ động **Vẫn ký**, hành vi có hiệu lực trên Devnet.
- **Phiên bản lành:** cùng luồng, chỉ chuyển 0 lamport cho chính ví; vẫn mất phí mạng.
- Nếu chưa có DEMO: mở màn tạo phiên trong ví, nạp file `.devnet/vi-demo.json` tại ví,
  tạo phiên 500 DEMO, chờ xác nhận rồi quay lại quét. **Không nạp khoá ở SolBonus.**

Mặc định production kết nối `https://custos-solana.vercel.app/ket-noi.html`.
SolBonus công khai: https://solbonus-custos.vercel.app/tan-cong/ (origin khác ví).
Sau mỗi lần `vercel deploy --prod --yes`, gán alias SolBonus sang deployment mới bằng
`vercel alias set <deployment-url> solbonus-custos.vercel.app`; kiểm lại bằng probe HTTPS.
`VITE_CUSTOS_KET_NOI` chỉ thay địa chỉ popup khi cần môi trường khác.
`VITE_RPC` chỉ được đọc trong chế độ development. Production dùng RPC Devnet công cộng.

## Cách nhận diện DEMO

`getTokenAccountsByOwner` tìm SPL Token của ví cố định. Tiếp đó xác minh mint
(6 decimals, supply 500 triệu đơn vị nhỏ nhất, không còn mint/freeze authority) và
giao dịch phát hành thành công do ví cố định ký: initialize mint/account, mintTo 500 DEMO,
thu hồi mint authority. Tài khoản nhận và chủ mới lấy từ cùng giao dịch tạo phiên.

Không đoán token chỉ từ tên hoặc decimals; không đọc manifest hay localStorage của ví.
Trước yêu cầu ký, đọc lại source, target và mint để chặn phiên đã đổi chủ/hết số dư.
Tối đa 5 phiên hợp lệ/lượt, tra tối đa 20 signature/mint. Lịch sử không còn trên RPC
có thể khiến phiên cũ không được tìm thấy; tạo phiên mới nếu cần.

## Kiểm thử

```powershell
node --test --experimental-strip-types apps/trang-tan-cong/test/*.test.ts
python apps/trang-tan-cong/tools/probe-solbonus.py
# Chỉ khi muốn ký và gửi một giao dịch bản lành Devnet thật:
python apps/trang-tan-cong/tools/probe-solbonus.py --allow-devnet-send
```

Probe mặc định chỉ đọc và từ chối ký. Cờ opt-in nạp file khoá vào input của **ví**,
ký self-transfer 0 lamport và kiểm xác nhận. Không có trường hợp tự ký bản điều kiện ẩn.

Chữ ký được lưu vào sessionStorage **trước khi gửi**, không lưu khoá hoặc bytes đã ký.
Reload cùng tab tiếp tục tra cứu chữ ký. Khi chưa rõ kết quả, nút gửi khoá; không retry.
Các tab độc lập chưa có khoá phối hợp toàn origin — không chạy cùng phiên đồng thời.

Probe bàn giao dApp cũ `probe-live-handoff.py` không còn mô tả SolBonus B3;
dùng `probe-solbonus.py`. Luồng kịch bản nội bộ ví vẫn giữ cho đối chứng.
