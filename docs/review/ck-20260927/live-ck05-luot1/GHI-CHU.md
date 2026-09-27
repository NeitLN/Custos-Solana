# Lượt 1 nghiệm thu live CK-05/06/07 — 27/09/2026 (dừng ở chặng chuẩn bị)

- Ví: `AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ` (ví demo cố định). Chỉ SOL Devnet và token thử nghiệm của phiên.
- **Đã gửi 1 giao dịch — tạo phiên:** `AkidXCET7NunhjMEzEq8J2JMsLB3hWhqk5Bfg2JsJu6RR8siT6naqcGhBfaurH6K6w7hxnXi612xwZrvsek3rv4`,
  slot 504518325, `err: null` (tra bằng `getSignaturesForAddress` của ví). Explorer:
  https://explorer.solana.com/tx/AkidXCET7NunhjMEzEq8J2JMsLB3hWhqk5Bfg2JsJu6RR8siT6naqcGhBfaurH6K6w7hxnXi612xwZrvsek3rv4?cluster=devnet
- **Dừng ở chặng CHUẨN BỊ chuyển token** (trước bước ký): `failed to get info about account … signal timed out`.
  Ba endpoint Devnet cùng quá hạn/429 khi đọc account từ máy chạy. Không có giao dịch nào ở trạng thái chưa rõ;
  không gửi lại gì.
- `browser.json` là biên bản của probe; `failure.png` là màn hình lúc dừng.
- Lượt này KHÔNG được tính là nghiệm thu CK-05/06/07 — chỉ chứng minh tạo phiên thật trên ví cố định.
