# Custos — bối cảnh dự án

Transaction-intelligence SDK cho ví và dApp Solana: phát hiện hậu quả **không thuộc về hành động chính** của một giao dịch, và giải thích bằng tiếng Việt trước khi người dùng ký.

Dự thi **UniHackfest 2026**, track **Best Product & Business**, chủ đề **AI × Web3**.
**Hạn tiếp theo: 19/09/2026** — giờ và tên vòng CHƯA xác nhận.
Lịch nằm ở `docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md`, không ghi ngày ở chỗ khác.
Mốc 05/09 tại Văn Lang không còn là mốc hiện tại; hai văn bản BTC trong repo còn
mâu thuẫn về chung kết (23/09 UEF hay 26/09 SIHUB) — chưa được chọn bừa một cái.

## Tài liệu

| File | Vai trò |
|---|---|
| `CUSTOS.md` | **Nguồn quyết định duy nhất về sản phẩm.** Đã qua 5 vòng phản biện giám khảo (8,2 → 9,0/10). Phạm vi đã khoá |
| `NGHIEN-CUU-21-08.md` | Khử rủi ro trước build: đường đi giao dịch devnet đã tra cứu, bẫy Web3.js v2, và bản sửa tuyên bố về đối thủ |
| `SEED-DATASET.md` | Quy cách bộ kiểm thử: định dạng JSON, nguồn gốc từng mẫu, và vì sao KHÔNG được gọi kết quả trên tập âm là tỉ lệ false positive |
| `PITCH-VA-PHAN-BIEN.md` | Cấu trúc 4 phút, 9 câu hỏi khó có sẵn câu trả lời, danh sách câu không được nói |
| `DAC-TA-CORE.md` | Đặc tả kỹ thuật: trình tự L1, ranh giới L2/L3, luật theo nguồn dữ liệu (đặc tả 12, đã thực thi **14**), lịch làm của vai A |
| `DAC-TA-L3.md` | Đặc tả L3 và toàn bộ chữ tiếng Việt: từ vựng chốt, câu mẫu dự phòng, prompt, cách đo mức độ hiểu |
| `packages/core/README.md` | **Tài liệu tích hợp SDK** — thứ bên ngoài đọc để quyết định có dùng không. Ví dụ trong đó có test chạy thật (`readme.test.ts`) |
| `docs/cuoc-thi/` | Thể lệ và lịch chính thức của BTC |

> **Tài liệu lập kế hoạch đã hoàn thành nằm trong lịch sử git, không ở HEAD.**
> `KE-HOACH-15-NGAY.md`, `KHOI-DONG-22-08.md`, `ROADMAP-BUILD.md`, `ROADMAP-DIEM-SO.md`,
> `IMPROVEMENT-ROADMAP.md`, `CHAM-DIEM-GIA-DINH.md` — tất cả đã đóng 100 % mục. Xoá khỏi
> HEAD để thứ đang dùng không bị chôn; `git log` vẫn giữ nguyên quá trình.

## Trạng thái: ĐANG BUILD — cả hai cổng đã mở

Cổng 1 (`CHỐT Ý TƯỞNG`) và cổng 2 (`DUYỆT KẾ HOẠCH – BẮT ĐẦU BUILD`) đã qua.
Không cần xin duyệt để viết code nữa.

**Đã có:** L1 bóc tách + L2 mười bốn luật + SDK **đóng gói được** (`scripts/dong-goi-sdk.mjs`) · ví mẫu · trang tấn công giả ·
hiện trường devnet thật · 33 mẫu dữ liệu · 362 test · lớp mô hình ngôn ngữ cho
L3 (bên tích hợp tự cắm mô hình) · CI deploy công khai lên GitHub Pages kèm
bước chặn rò rỉ khoá.

**Chưa có:** video demo · phỏng vấn người dùng · decoder cho chương trình DEX.
Deck đã có ở `docs/nop-bai/CUSTOS-PITCH.pptx`.

Lớp mô hình ngôn ngữ đã dựng xong, có test đối kháng, và **đã chạy với mô hình thật**
một lượt — biên bản ở `docs/bao-mat/DANH-GIA-claude-haiku-4-5-20251001-2026-08-22.md`.
Chưa đo được số token thật vì cần khoá API; bản demo công khai cố ý không nhúng khoá.

Đo được, không ước lượng — cohort **neo lại 25/08**, 20 giao dịch, **9 mẫu còn mô phỏng
được**: **0 giao dịch bị gắn mã CÁO BUỘC** (7 giao dịch ở mức Cần xem kỹ — gắn cờ vì
thông tin hoặc coverage khuyết, KHÔNG phải buộc tội); coverage trung bình 82 %; lệnh
chạm tài sản người ký đọc
hiểu được 65 % (13/20).

Cohort cũ (21/08) giữ trong repo để đối chiếu, **không so sánh trực tiếp** với cohort mới —
hai mẻ mẫu khác nhau. Xem `SEED-DATASET.md` mục 0b5.

Ba chữ, ba nghĩa khác nhau — dùng lẫn là nói sai về chính mình:

| Chữ | Nghĩa | Số hiện tại |
|---|---|---|
| **bị cáo buộc** | có mã lý do BUỘC TỘI một hành vi cụ thể | **0** |
| **bị gắn cờ** | verdict khác Xanh, gồm cả cờ vì thiếu thông tin | **7** |
| **báo nhầm** | gắn cờ SAI — cần ground truth mới nói được | **chưa đo được** |

Nói *"0 giao dịch bị gắn cờ"* là SAI: 7 giao dịch đã bị gắn cờ. Con số 0 là số
**cáo buộc**. Và không được gọi nó là *"báo nhầm"*: chưa kiểm chứng từng giao dịch
trong cohort là lành nên chưa có ground truth. Xem `SEED-DATASET.md` mục 0b3 và 0b4, và
`docs/review/UPDATE-REPORT.md` mục 4 về việc cohort đang rụng mẫu.

## Quyết định thiết kế đã khoá — không tự ý đảo lại

Những điều dưới đây đến từ 5 vòng phản biện. Mỗi điều đã sửa một lỗi thật. **Không được "cải tiến" ngược lại.**

1. **`level` chỉ do L2 (engine luật) tạo ra. AI tuyệt đối không tạo và không sửa `level`.** L3 có trường riêng `aiAdvisory`. Tuyên bố chuẩn: *AI không được xác nhận giao dịch an toàn, cũng không được kết luận giao dịch nguy hiểm — chỉ được yêu cầu kiểm tra thủ công.*
2. **`detectedPrimaryAction` (suy từ giao dịch) ≠ `expectedAction` (ngữ cảnh do ví/dApp cung cấp).** Giao diện nói *"hành động chính được nhận diện"*, không nói *"ý định thật của người dùng"*.
3. **Quy tắc bất đối xứng của `expectedAction`:** khớp ⇒ **không** giảm verdict, **không** tắt cảnh báo nào (dApp độc hại có thể khai đúng để trông vô hại). Chỉ lệch mới nâng nghi ngờ. Ngữ cảnh chỉ được làm sản phẩm thận trọng hơn, không bao giờ dễ dãi hơn.
4. **Fail-safe:** không đủ dữ liệu ⇒ `warning`, không bao giờ `safe`.
5. **Không có smart contract, không ghi gì lên chain.** Custos là lớp đọc và mô phỏng. Anchor program, memo on-chain, registry đặt cọc đều đã bị loại khỏi bản thi.
6. **Không phóng đại mối đe doạ.** Token-2022 Permanent Delegate, Transfer Hook, và Address Lookup Table đều là **năng lực hợp lệ của giao thức**, có ca dùng chính đáng. Chỉ gắn cờ khi kết hợp hành vi cụ thể trong chính giao dịch đang xét. Gắn Đỏ cho sự tồn tại của một tính năng là cách nhanh nhất tạo false positive.
7. **Demo phải trung thực.** Bảng chênh lệch hiển thị đúng những gì giao dịch làm. `SetAuthority` chỉ lấy *quyền kiểm soát*, không rút tiền — nếu hiển thị 500 → 0 thì giao dịch phải thật sự chứa `Transfer`. Thể lệ BTC: trình bày sai về mức hoàn thiện bị trừ điểm hoặc loại.

## Giao kèo kiểu dữ liệu — đóng băng, không đổi

Bốn người vibe code trên cùng một repo. Kiểu này là giao thức phối hợp:

```ts
type InspectResult = {
  level: "safe" | "warning" | "danger";        // CHỈ L2 — vai A
  aiAdvisory: "review_required" | null;         // CHỈ L3 — vai C
  detectedPrimaryAction: { type: string; from?: string; to?: string } | null;  // C
  diff: Array<{ label: string; before: string; after: string; severity: string }>;  // A
  reasonCodes: string[];                        // A
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };    // A
  explanation: string;                          // C
};
```

## Đội và ranh giới

4 người, vibe code hoàn toàn bằng Claude Code.

| Vai | Sở hữu |
|---|---|
| **A** | Custos Core: L1 bóc tách + L2 mười bốn luật + SDK |
| **B** | Demo Wallet · trang tấn công giả · giao dịch devnet · deploy |
| **C** | L3: nhận diện hành động chính, diễn giải, `aiAdvisory`, toàn bộ chữ tiếng Việt |
| **D** | Seed dataset · liên hệ ví/dApp · phỏng vấn · deck · video · nộp hồ sơ |

Mỗi vai một thư mục. **Không sửa chéo** — muốn đổi thứ của người khác thì nhắn.

## Quy tắc làm việc

- **Không tự chạy `git commit` hoặc `git push`.** Người dùng tự commit và push. Claude chỉ chuẩn bị thay đổi.
- **Commit mỗi ngày, mỗi người, từ 22/8.** BTC yêu cầu repo public có lịch sử commit thể hiện quá trình build thật — dồn vào hai commit cuối là tự bắn vào chân.
- **Seed dataset chính là bộ test.** Một luật chưa có ca nguy hiểm + ca an toàn tương tự thì chưa tính là xong.
- **Không phóng đại số liệu.** Nếu dataset chỉ có 15 mẫu thì nói 15.

## Môi trường

- Windows 11 · Node v24.12.0 · `rustc` 1.97.1 có sẵn
- **Solana CLI và Anchor chưa cài** — và **không cần** cho P0. Toàn bộ P0 nằm trong TypeScript/React
- ⚠️ **Bẫy thư mục cha:** `C:\Users\Viet Tien\` là một git repo khác (UniPilot-AI) và có `postcss.config.mjs` riêng. Thư mục này phải `git init` riêng, và khi scaffold Vite cần đặt `css: { postcss: {} }` trong `vite.config.ts` để Vite không leo cây thư mục bắt nhầm config của repo cha.
