# Lượt 5–6 nghiệm thu live CK-05 — 27/09/2026 (mạng quán cà phê, sau bản sửa genesis 429)

Ví cố định `AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`. Chỉ SOL Devnet + token thử nghiệm của phiên.

| Ca | Kết quả | Bằng chứng |
|---|---|---|
| Tạo phiên | ✓ `4v6fqXLP…YqAa` (slot 504800439) | `browser.json` |
| **AC03** chuyển 12,5 DEMO có Custos bật | ✓ probe xác nhận: nguồn 500 → 487,5; đích 0 → 12,5; so khớp | receipt `5w8U8A4w…wtKZnR` (lượt 6), `5aemVamZ…PEUF` (lượt 5) trong `browser.json` |
| **AC04** Custos bật → cảnh báo Nguy hiểm → huỷ | ✓ số lần gửi KHÔNG đổi | `browser.json` |
| **AC05** Custos bật → bỏ qua cảnh báo (override) | ✓ **trên chuỗi**, ✗ receipt của sản phẩm | `5AZWvhgHQ1n8…sSXfrCv` finalized, `err: null`, slot 504800847. Metadata (`tx-override-metadata.json`): nguồn 487,5 → **243,75** (đúng nửa, như dự báo), đích 12,5 → 256,25, `setAuthority accountOwner` → chủ nguồn đổi sang `5AqVwaG3…`. Probe dừng vì bước đọc biên nhận trong trình duyệt quá hạn — KHÔNG gửi lại. Đối chiếu dự báo/thực tế ở dòng này là làm tay từ metadata, chưa phải receipt tự động |

Nguyên nhân dừng: RPC đọc account quá hạn (api.devnet + rpcpool treo đọc account trên HAI mạng khác nhau ⇒ không phải chặn theo IP như ghi chú lượt 1–4 suy đoán; onfinality trả 429 khoảng nửa số lượt).
