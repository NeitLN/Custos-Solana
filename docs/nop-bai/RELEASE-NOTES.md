# Custos — release candidate

**Commit:** `7d58dd55eec0e17411766927b276cc8bcbad6327`
**Gói:** `@custos-solana/core` · `@custos-solana/ai@0.1.3` · `@custos-solana/types`

Custos đọc một giao dịch Solana **trước khi người dùng ký**, mô phỏng hậu quả, và
giải thích bằng tiếng Việt. Engine luật tất định quyết định mức cảnh báo; mô hình
ngôn ngữ chỉ viết lời giải thích và **không bao giờ** được tạo, nâng hay hạ mức đó.

## Đo được

| | |
|---|---|
| Test tự động | **355** pass · 0 fail |
| Luật tất định | **14** — 9 luật có ca đối chứng gần giống |
| Mẫu kiểm thử đã gắn nhãn | **33** |
| Giao dịch bị gắn **mã cáo buộc** trên cohort công khai lưu offline | **0** |
| Coverage trung bình | **82 %** trên 9/20 mẫu |
| Lệnh chạm tài sản người ký đọc hiểu được | **13/20** |
| Người dùng thật nêu được hậu quả | **13/20** |
| Tích hợp từ ngoài monorepo | **12 giây** tới kết quả đầu · **29** dòng mã · **620 ms** một lượt |
| Bẫy đối kháng AI bị chặn | **12/12** máy bắt được |

> **`0` là số CÁO BUỘC, không phải "0 false positive".** Cohort chưa
> gán nhãn ground truth, nên đây không phải precision, recall hay tỉ lệ báo nhầm.

## Giới hạn — đọc trước khi dùng

- **Chưa phỏng vấn người mua nào.** Custos bán cho ví và dApp; đội mới hỏi người dùng cuối. Câu *"ai trả tiền"* chưa có dữ liệu.
- **Chưa bên thứ ba nào tích hợp.** Ví dụ ở `vi-du-tich-hop/` do chính đội dựng — nó đo ma sát tích hợp, không đo nhu cầu thị trường.
- **Số hiểu 13/20 đo trên giao diện lúc 29/08 và 30/08/2026**, đã thiết kế lại sau đó. Vòng 2 chưa chạy.
- **Chưa đánh giá với mô hình ngôn ngữ thật** — cần khoá API, bản demo công khai cố ý không nhúng khoá.
- **1 lớp bẫy AI máy không bắt được** (sai ngữ nghĩa, không sai giá trị) — cần người chấm, rubric ở `docs/AI-EVALUATION.md`.
- **Coverage 82 %** trên 9/20 giao dịch còn mô phỏng được. Chưa có decoder cho chương trình DEX.
- **9/14 luật** có ca đối chứng gần giống; năm luật còn lại kê tên trong `packages/core/test/capLuat.test.ts`.
- **Runtime và demo chỉ chạy Devnet.** Cohort là dữ liệu công khai lưu offline, không phải runtime gọi Mainnet.

## Bảo mật

- Không đủ dữ liệu ⇒ **cảnh báo**, không bao giờ `safe`. Lỗi RPC, quá hạn, mô phỏng
  hỏng đều fail-closed.
- Ngữ cảnh do dApp khai chỉ làm sản phẩm **thận trọng hơn**, không bao giờ dễ dãi hơn.
- Mô hình không nhận giao dịch thô, không nhận địa chỉ đầy đủ, và mọi số trong lời
  giải thích phải có căn cứ trong dữ liệu đã gửi.
- **`@custos-solana/ai@0.1.2` trên npm THIẾU neo grounding** — mô hình chèn được địa
  chỉ ví bịa. Dùng `0.1.3` trở lên.

## Chạy thử

```bash
npx npm@11.6.2 ci
npm run check
npm run thu-goi
```

Demo: https://neitln.github.io/Custos-Solana/
