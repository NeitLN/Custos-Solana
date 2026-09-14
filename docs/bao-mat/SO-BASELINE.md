# Custos thêm được gì — so với hai cách làm đơn giản hơn

**Việc TB-B06.** Chạy lại: `npm run so-baseline` (offline, trên Facts đã đóng băng).

Câu hỏi của trang này hẹp và dễ bị trả lời quá tay:

> **Một ví đã đọc được danh sách lệnh, hoặc đã tính được số dư ra vào — Custos còn
> thêm được gì?**

---

## 0 · Điều trang này KHÔNG nói, đặt lên đầu

Ba baseline dưới đây là **ba cách triển khai được mô tả trong chính
[`so-baseline-b06.ts`](../../scripts/ky-thuat/so-baseline-b06.ts)**, không phải ba sản
phẩm. Trang này **không** so Custos với Phantom, Blockaid hay bất kỳ ví nào — muốn nói
"hơn Phantom" thì phải chạy Phantom, và đội chưa làm điều đó.

Và thẻ cấm một thứ cụ thể: *"không cố tình làm hỏng baseline để tạo thắng lợi"*. Nên
hai baseline đầu được viết ở mức **tốt nhất mà phạm vi của chúng cho phép**:

| | Phạm vi | Được cho gì | Giới hạn DUY NHẤT |
|---|---|---|---|
| **B1** | đọc top-level instruction | **cả decoder của Custos** (`decoded.kind`) | không nhìn xuống inner instruction |
| **B2** | chỉ xem balance delta | **cả SOL lẫn token**, có trừ phí | không biết gì ngoài con số ra/vào |
| **B3** | pipeline Custos đầy đủ | `danhGia()` thật, không bản sao | — |

B1 **không** bị bịt mắt thành "chỉ thấy programId"; B2 **không** bị giới hạn còn mỗi
SOL. Làm yếu chúng thì bảng đẹp hơn và vô nghĩa hơn.

**Kỳ vọng đúng/sai lấy từ [`index.json`](../../data/seed/index.json)** — nơi người gán
nhãn viết tay. Bản đầu của bảng này suy nhãn từ chính `level` của Custos, tức một
oracle vòng tròn: Custos im thì bảng nói Custos đúng, kể cả khi nó im sai.

---

## 1 · Năm ca, năm câu hỏi khác nhau

| Ca | Mẫu | Tình huống | B1 | B2 | **B3 Custos** | Kỳ vọng người |
|---|---|---|---|---|---|---|
| B06-1 | `R01-pos` | đổi quyền sở hữu, **số dư không đổi** | im | im | **DANGER** | `danger` ✓ |
| B06-2 | `MN-02` | hành vi nằm ở **inner instruction** | cảnh báo | cảnh báo | WARNING | `khong-phai-danger` ✓ |
| B06-3 | `R09-pos` | **dữ liệu thiếu** — mô phỏng hỏng | cảnh báo | cảnh báo | WARNING | `warning` ✓ |
| B06-4 | `R04-neg` | giao dịch hợp lệ | im | **cảnh báo** | SAFE | `safe` ✓ |
| B06-5 | `R13-neg` | giao dịch hợp lệ (lệnh mua) | im | **cảnh báo** | SAFE | `safe` ✓ |

**Custos lệch kỳ vọng người gán ở 0/5 ca.** Thêm phát hiện ở **1** ca; baseline báo
nhầm ở **2** ca.

Một ca thắng trên năm nghe ít, và con số đó đúng hơn một con số cao. Ba ca giữa bảng
cho thấy cả ba cách đều nhận ra *có chuyện gì đó* — khác nhau ở chỗ nói được vì sao.

---

## 2 · B06-1 — ca duy nhất Custos một mình bắt được

`setAuthority` đổi chủ tài khoản token của người ký sang ví lạ:

```
token account 6GKSKEwGZ6…
  ownerBefore = 2EjYM7ShF9n1…  →  ownerAfter = HaVREgPPBxHH…
  amount      = 500000000      →  500000000        (KHÔNG ĐỔI)
solDelta      = { người ký: −5000 }                 (chỉ có phí)
```

**B1 đọc hiểu được lệnh** — nó in ra đúng chữ `setAuthority`, không phải "lệnh lạ". Nó
im vì nó không có **luật** nào nói rằng đổi authority sang ví lạ là nguy hiểm. Đọc
hiểu ≠ biết hậu quả.

**B2 mù hoàn toàn**: không một đơn vị token nào rời ví, không một lamport nào ngoài
phí. Một baseline hỏi "giao dịch này lấy đi bao nhiêu?" sẽ nhận câu trả lời *"không
lấy gì"* — và đó là câu trả lời đúng cho câu hỏi sai.

Đây đúng là nguyên tắc kiến trúc của Custos: **phát hiện qua thay đổi trạng thái, không
qua đọc instruction**. Ca này là ca nguyên tắc đó kiếm được điểm.

---

## 3 · B06-4 và B06-5 — hai ca baseline báo nhầm

Cả hai mẫu đều được người gán nhãn `safe`, và cả hai đều làm B2 kêu:

| Mẫu | Token ra | Token **vào** | SOL |
|---|---|---|---|
| `R04-neg` | 1.000.000 | 0 | −5.000 (phí) |
| `R13-neg` | 0 | **7.453.000.000** | −1.999.995.000 |

`R13-neg` là **lệnh mua**: 2 SOL đi ra, 7,45 tỉ đơn vị token đi vào. B2 chỉ cộng vế ra
nên nó thấy một ví đang mất 2 SOL. Luật 13 của Custos kiểm `coNhanLai` — vế người dùng
nhận được gì — nên nó im.

Ghi hai ca này không phải để khoe. Thẻ đòi *"lưu cả trường hợp Custos không thêm lợi
ích hoặc cảnh báo rộng hơn cần thiết"*, và bảng chỉ có ô thắng là bảng đã chọn ca.

---

## 4 · B06-3 — ca phải ghi bằng HAI con số

`R09-pos` là ca mô phỏng hỏng (`MissingRequiredSignature`). Bảng trên đọc Facts đóng
băng 21/08, nhưng L1 hôm nay cho kết quả khác, và khác biệt đó là một bản vá có thật:

| | Facts 21/08 | L1 hôm nay |
|---|---|---|
| `accounts` | 2, với `lamportsAfter: 0` | **0** |
| `solDelta` | 2 mục | **rỗng** |
| verdict | `warning` · `… SOL_ROI_VI, MO_PHONG_HONG` | `warning` · `MO_PHONG_HONG, TRANG_THAI_DO_KHUYET` |

Bản cũ phát `SOL_ROI_VI` — một cáo buộc dựng trên **trạng thái sau của một mô phỏng đã
hỏng**, tức một con số không có thật. Cổng `coDuLieuAccount` trong
[`l1/fetch.ts`](../../packages/core/src/l1/fetch.ts) nay chặn việc nạp trạng thái sau
khi mô phỏng không trả dữ liệu account.

Ghi mỗi bản đóng băng là **tố sản phẩm một lỗi đã vá**. Ghi mỗi bản mới là **giấu mất**
một ca mà baseline thắng Custos bản cũ. Nên ghi cả hai.

---

## 5 · Tái lập

```bash
npm run so-baseline     # 5 ca, offline, in bảng trên
npm run check           # guard soBaselineB06.test.ts — 10 bài
```

Guard canh những thứ không đọc được từ đầu ra: B1 còn đọc `decoded`, B2 còn đọc cả
token, kỳ vọng còn lấy từ `index.json`, nhãn khoảng `khong-phai-danger` còn so bằng bất
đẳng thức, và câu *"không phải tuyên bố hơn Phantom"* còn trong docstring.
