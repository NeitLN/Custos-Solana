# @custos-solana/ai — thay đổi

## 0.3.0 — 26/09/2026

Cần `@custos-solana/core` **^0.2.0** (dùng `quyenRutMoRong`, chỉ có từ core 0.2.0).

- Giao dịch **chỉ** cấp quyền rút cho một ví trên một mint: cấp quyền là hành động chính
  (`"cấp quyền rút"`), không còn bị xếp là hậu quả lệch và không tự bật `aiAdvisory`.
- Lời văn mô hình bị từ chối (rơi về câu tất định) khi: kết luận "nguy hiểm"/"lừa đảo", xúi
  ký ("có thể ký", "không phải kiểm tra"), trấn an tuyệt đối; soi sau khi chuẩn hoá Unicode
  (bỏ ký tự vô hình, gộp dấu tổ hợp). Và khi **bỏ sót** một hậu quả lõi tất định đã xác định
  (đổi chủ, cấp quyền rút, trao quyền đóng, đổi chương trình) — `boSotHauQua`.
- Dữ liệu gửi mô hình ghi "đơn vị gốc" khi thiếu mint, không còn giả định `decimals = 0`.
- Câu tóm tắt cấp quyền rút: "Ví X sẽ được phép rút tới N TOKEN của bạn, bất cứ lúc nào".
