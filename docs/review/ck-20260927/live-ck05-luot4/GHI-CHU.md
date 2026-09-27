# Lượt 4 nghiệm thu live CK-05/06/07 — 27/09/2026 (dừng ở chặng chuẩn bị)

- **Đã gửi 1 giao dịch — tạo phiên:** `3W1WTLd9gzsBe4EjawrrNMyKvcPkJwPYSN6GwkkhQd4LasJDt4ocavXRS228ZEQcgNHL8jAnrbZ4JzBkyWewhR3y`,
  slot 504522562, `err: null`.
- Bản đã sửa hạn kiểm 15 s + lỗi tiếng Việt: chặng chuẩn bị dừng TRONG HẠN và nói đúng lý do. 6 lần chuẩn bị trong
  ~5 phút đều hỏng: "RPC Devnet không trả lời trong hạn khi đọc tài khoản (quá hạn)". Không có giao dịch chưa rõ;
  không gửi lại gì.
- Tổng 4 lượt: 4 giao dịch tạo phiên, **0,026228 SOL** (9,928786680 → 9,902558200 SOL). Không bước nghiệp vụ nào
  (chuyển, huỷ, override, cấp quyền, actor, thu hồi) được thực thi ⇒ **CK-05/06/07 CHƯA nghiệm thu live**.
- Nguyên nhân: đọc account từ IP máy chạy bị giới hạn (api.devnet/rpcpool treo, onfinality 429). CI trên máy GitHub
  đọc account bình thường cùng ngày — không phải lỗi phía Devnet toàn cục.
