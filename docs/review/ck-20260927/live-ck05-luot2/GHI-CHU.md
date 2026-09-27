# Lượt 2 nghiệm thu live CK-05/06/07 — 27/09/2026 (dừng ở chặng chuẩn bị)

- **Đã gửi 1 giao dịch — tạo phiên:** `3P56Bu4P7thjpzcJ88Sm5gwzsavB3fQkZVDjuTzjKfDkxiwxkhqy86c1icpfNG9GiqX5fxkYoJCXeV5FWLvvDHUN`,
  slot 504519187, `err: null`. https://explorer.solana.com/tx/3P56Bu4P7thjpzcJ88Sm5gwzsavB3fQkZVDjuTzjKfDkxiwxkhqy86c1icpfNG9GiqX5fxkYoJCXeV5FWLvvDHUN?cluster=devnet
- Dừng ở chặng CHUẨN BỊ chuyển 12,5 DEMO: nhà cung cấp dự phòng trả `429 Too Many Requests` khi đọc tài khoản;
  probe chỉ chờ yêu cầu ký nên đứng đủ 90 s. Không có giao dịch chưa rõ; không gửi lại gì.
- Sửa sau lượt này: probe chờ "yêu cầu ký HOẶC thẻ lỗi" và thử lại chặng chuẩn bị (chỉ đọc) khi số lần gửi không
  đổi; màn thực thi dịch lỗi RPC thành câu tiếng Việt (`live/loiRpc.ts`) thay cho JSON gốc của nhà cung cấp.
- KHÔNG tính là nghiệm thu CK-05/06/07.
