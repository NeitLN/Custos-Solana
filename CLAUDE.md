# Custos — bối cảnh dự án

Transaction-intelligence SDK cho ví và dApp Solana: phát hiện hậu quả **không thuộc về hành động chính** của một giao dịch, và giải thích bằng tiếng Việt trước khi người dùng ký.

Dự thi **UniHackfest 2026**, track **Best Product & Business**, chủ đề **AI × Web3**.
**Hạn cứng: 05/09/2026, 08:00** — vòng loại cấp trường tại Đại học Văn Lang.

## Tài liệu

| File | Vai trò |
|---|---|
| `CUSTOS.md` | **Nguồn quyết định duy nhất về sản phẩm.** Đã qua 5 vòng phản biện giám khảo (8,2 → 9,0/10). Phạm vi đã khoá |
| `KE-HOACH-15-NGAY.md` | Lịch thực thi 22/8 → 5/9, chia việc 4 người, 4 cổng cắt bỏ |
| `KHOI-DONG-22-08.md` | Gói khởi động Ngày 1: câu hỏi BTC, tin nhắn ví/dApp, spike devnet, cấu trúc thư mục và ranh giới sở hữu |
| `NGHIEN-CUU-21-08.md` | Khử rủi ro trước build: đường đi giao dịch devnet đã tra cứu, bẫy Web3.js v2, và bản sửa tuyên bố về đối thủ |
| `SEED-DATASET.md` | Quy cách bộ kiểm thử: định dạng JSON, danh sách 25 mẫu phải đi tìm, quy tắc đo false positive |
| `PITCH-VA-PHAN-BIEN.md` | Cấu trúc 4 phút, 9 câu hỏi khó có sẵn câu trả lời, danh sách câu không được nói |
| `DAC-TA-CORE.md` | Đặc tả kỹ thuật: trình tự L1, ranh giới L2/L3, 12 luật theo nguồn dữ liệu, lịch làm của vai A |
| `DAC-TA-L3.md` | Đặc tả L3 và toàn bộ chữ tiếng Việt: từ vựng chốt, câu mẫu dự phòng, prompt, cách đo mức độ hiểu |
| `packages/core/README.md` | **Tài liệu tích hợp SDK** — thứ bên ngoài đọc để quyết định có dùng không. Ví dụ trong đó có test chạy thật (`readme.test.ts`) |
| `docs/cuoc-thi/` | Thể lệ và lịch chính thức của BTC |

## Trạng thái: ĐANG BUILD — cả hai cổng đã mở

Cổng 1 (`CHỐT Ý TƯỞNG`) và cổng 2 (`DUYỆT KẾ HOẠCH – BẮT ĐẦU BUILD`) đã qua.
Không cần xin duyệt để viết code nữa.

**Đã có:** L1 bóc tách + L2 mười bốn luật + SDK · ví mẫu · trang tấn công giả ·
hiện trường devnet thật · 29 mẫu dữ liệu · 188 test · lớp mô hình ngôn ngữ cho
L3 (bên tích hợp tự cắm mô hình) · CI deploy công khai lên GitHub Pages kèm
bước chặn rò rỉ khoá.

**Chưa có:** deck · video demo · phỏng vấn người dùng · decoder cho chương
trình DEX (coverage đang 46 %).

Lớp mô hình ngôn ngữ đã dựng xong và có test đối kháng, nhưng **chưa chạy với
mô hình thật lần nào** — cần khoá API, và bản demo công khai cố ý không nhúng khoá.

Đo được, không ước lượng: 0 verdict Đỏ sai trên 20 giao dịch SPL mainnet ngẫu
nhiên; coverage trung bình 46 % (trước khi mở rộng decoder là 4 %). Lệnh chạm
tài sản người ký mới đọc hiểu được 21 %. Xem `SEED-DATASET.md` mục 0b3 và 0b4.

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
