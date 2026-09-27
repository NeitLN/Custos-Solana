# Lượt 3 nghiệm thu live CK-05/06/07 — 27/09/2026 (dừng ở chặng chuẩn bị)

- **Đã gửi 1 giao dịch — tạo phiên:** `ovfJ9GZJUjK96rANz4A4QiCJrVf8DAmkWP8ti1YFMqxzU1nKZDkcApFq6dXK7YSFnRRT6CkMZbdzKKCCbCZ7yBT` (slot, err: `504520573 None`).
- Chặng chuẩn bị chuyển 12,5 DEMO: 3 lần thử lại vì RPC (429/quá hạn, xem `browser.json → retries`), lần 4
  treo "Custos đang mô phỏng trước khi ký…" quá 90 s — **lỗi sản phẩm thật**: lượt kiểm của phiên live không có hạn.
  Đã sửa (`CAU_HINH_LIVE.hanKiemMs` = 15 s, test đỏ trước trong `liveSession.test.ts`).
- Không có giao dịch chưa rõ; không gửi lại gì. KHÔNG tính là nghiệm thu CK-05/06/07.
