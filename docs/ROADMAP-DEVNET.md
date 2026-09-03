# Roadmap hoàn thiện — Devnet-only

**Cập nhật 31/08/2026.** Hạn nộp tự đặt **04/09**, thi **05/09 08:00**.

Quyết định phạm vi: **sản phẩm dự thi vận hành hoàn toàn trên Devnet.** Đã gỡ toàn bộ
đường mainnet (trang soi, chế độ tiền thật, rút SOL thật) để branch nhỏ hơn, dễ giải
thích, ít rủi ro. Dataset mainnet chỉ còn ở dạng **dữ liệu offline lịch sử** để kiểm
engine — không phải runtime.

## Ranh giới cứng — không làm

- Không mainnet trong runtime demo.
- Không smart contract, không wallet adapter.
- Không thêm decoder, không thêm luật, không sửa giao diện lớn.

## Giữ lại từ nhánh (đã xong, có giá trị)

- Giao dịch lành tính không còn bị cảnh báo oan (mint authority thu hồi + sửa hiển thị).
- Fail-safe khi mô phỏng không trả trạng thái account.
- Nhãn "Custos đề nghị" thay "AI đề nghị".
- Phân biệt Warning-do-thiếu-coverage với cáo buộc hành vi.
- Sửa claim Blowfish/Blockaid.
- MIT License · SDK publish npm (`@custos-solana/*`).
- Đo latency Devnet · bảng phân loại 4 loại bằng chứng.

---

## Giai đoạn 1 — Đóng phạm vi ✅

Gỡ mainnet xong. `apps/` sạch chuỗi `mainnet`/`?that=1`; build công khai không chứa
mainnet; soi khoá sạch.

## Giai đoạn 2 — Nghiệm thu kỹ thuật (từ fresh clone)

- [x] `npm ci` từ fresh clone
- [x] `npm run check` — **250/250**
- [ ] Build ví mẫu + trang tấn công, gộp `site/`, soi khoá
- [ ] Không còn chuỗi `mainnet` / `?that=1` / `dungGiaoDichTanCongSol` / `hien-truong-mainnet`
      trong bản build *(ngoại lệ: `scripts/` đo offline và dataset — không vào build)*

## Giai đoạn 3 — Smoke test Devnet (≥5 vòng)

- [ ] Tấn công → **Danger**, bảng **500 → 0**, đổi chủ đúng, coverage **2/3**
- [ ] Huỷ giao dịch hoạt động
- [ ] Lành tính → **Bình thường**, KHÔNG trình bày như thiếu coverage
- [ ] Dựng lại hiện trường thành công
- [ ] RPC riêng không lộ vào build

> Ghi **median và lần chậm nhất** (với 8 mẫu dùng "median/max", KHÔNG dùng "p95").

## Giai đoạn 4 — Merge & deploy

- [ ] Merge `ban-that` → `main`, đợi CI xanh
- [ ] Mở link công khai bằng cửa sổ ẩn danh, thử cả ví và trang tấn công
- [ ] Trang số liệu hiện **255 test**
- [ ] Xác nhận xong **mới quay video**

## Giai đoạn 5 — Tăng điểm Product & Business (việc của đội)

- [ ] 3 usability test thật *(gọi đúng tên, không phải market validation)*
- [ ] 3 phản hồi từ dev/product owner ví hoặc dApp *(gọi là pilot interest)*
- [ ] Kế hoạch pilot 90 ngày
- [ ] Slide team + đóng góp thật
- [ ] Slide "đã học gì từ người dùng"

> Không có phản hồi khách hàng thì **nói thẳng pricing vẫn là giả thuyết**.

---

## Việc còn treo cần OTP của bạn

- `npm run publish-sdk` → publish `@custos-solana/ai@0.1.2` (types/core đã có, tự bỏ qua).
- `npm deprecate @custos-solana/{types,core,ai}@0.1.0 "..."` — đánh dấu bản 0.1.0 hỏng.

## Cấu trúc pitch Devnet-only

1. Người dùng tưởng đang nhận quà.
2. Giao dịch **Devnet thật** chứa transfer + đổi owner.
3. Không có Custos: mô phỏng cho thấy tài sản biến mất.
4. Có Custos: Danger, bảng chênh lệch, coverage.
5. SDK cài bằng npm, một lời gọi tích hợp.
6. AI không quyết định verdict.
7. Ai trả tiền + pilot tiếp theo.
8. Giới hạn: chưa tích hợp ví thật, chưa có market validation đầy đủ.

> Câu nên nói: *"Toàn bộ demo chạy trên Solana Devnet để không dùng tài sản thật.
> Nhưng bảng chênh lệch, verdict và coverage đều tạo trực tiếp từ kết quả mô phỏng,
> không phải số viết sẵn."*
