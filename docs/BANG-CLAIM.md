# Bảng claim — mỗi con số nói được nó đo cái gì, ở đâu, và chưa đo cái gì

**Việc D01 của [`ROADMAP-CLAUDE.md`](../ROADMAP-CLAUDE.md).** Tiêu chí nghiệm thu:
*"người chỉ đọc một trong README/deck/trang số liệu vẫn hiểu cùng tình trạng; mọi mẫu
số và phiên bản rõ."*

File này không sinh ra số. Nó chỉ đi tìm câu trả lời cho một câu hỏi, cho từng con số
đội đang công bố:

> **Nếu giám khảo hỏi "cái này đo trên gì?", đội có câu trả lời trong ba giây không?**

Số thật nằm ở `apps/demo-wallet/public/so-lieu.json`, sinh bởi `npm run so-lieu`, và
chép sang tài liệu bằng `scripts/dong-bo-so-tai-lieu.mjs`. **Chỗ duy nhất được phép gõ
tay là không chỗ nào** — mọi con số trong bảng dưới đều có đường đồng bộ, trừ những
dòng ghi rõ là chưa có.

---

## 1 · Bốn con số dễ bị đọc sai nhất

Không phải vì chúng sai, mà vì tiếng Việt cho phép đọc chúng rộng hơn thứ đã đo.

| Con số | Nghĩa ĐÚNG | Cách đọc SAI phải chặn |
|---|---|---|
| **0 cáo buộc** | không giao dịch nào bị gắn mã lý do BUỘC TỘI | ~~"0 báo nhầm"~~ · ~~"0 giao dịch bị gắn cờ"~~ — 7 giao dịch ĐÃ bị gắn cờ |
| **7 gắn cờ** | verdict khác Xanh, gồm cả cờ vì thiếu thông tin | ~~"7 giao dịch nguy hiểm"~~ |
| **coverage 82 %** | tỉ lệ lệnh đọc hiểu được | ~~"an toàn 82 %"~~ — đây là mức ĐỌC HIỂU |
| **13/13 bẫy** | 13 hình dạng sai **đội tự nghĩ ra**, chặn hết | ~~"AI không bịa được"~~ — chỉ nói về 13 hình dạng đã nghĩ tới |
| **13/13 + 3/3** | chặn hết đầu ra xấu **và** cho đầu ra tốt đi qua | ~~"13/13"~~ một mình — bộ chắn vứt sạch cũng cho 13/13 |

Chi tiết ba chữ *cáo buộc · gắn cờ · báo nhầm*: [`SEED-DATASET.md`](../SEED-DATASET.md)
mục 0b3 và 0b4.

---

## 2 · Bảng claim

Cột **phạm vi** là cột quan trọng nhất. Một con số không có phạm vi thì không phải
bằng chứng, chỉ là một con số.

### Kỹ thuật — đo lại được bằng một lệnh

| Claim | Số | Nguồn | Phạm vi | Trạng thái |
|---|---|---|---|---|
| Test tự động | **483** | `npm run check` | offline, không mạng | ✅ hiện hành |
| Luật L2 | **14** | `data/seed/index.json` | mỗi luật có ca dương và ca đối chứng | ✅ |
| Mẫu đã gắn nhãn | **38** | `data/seed/` | gồm cả `synthetic-devnet` — **không** dùng làm tỉ lệ báo nhầm | ✅ |
| Bẫy đối kháng AI | **13/13** | `npm run eval-ai` | đường **tất định**, chưa gọi mô hình thật | ✅ |
| **Đối chứng dương** — câu ĐÚNG đi qua | **3/3** | `npm run eval-ai` | đọc KÈM dòng trên, không bao giờ tách | ✅ |
| Bẫy trên gói đã publish | **10/10** | `data/registry/ket-qua.json` | cài `@custos-solana/ai@0.2.0` **từ registry**, không từ repo | ✅ |
| — kèm 3 đối chứng: câu đúng đi lọt · L3 ném lỗi · L3 treo | **3/3** | `npm run thu-goi-registry` | đối chứng phải KHÁC câu nền, nếu không nó không phân biệt được gì | ✅ |
| Vi phạm axe | **0/40** | `data/a11y/ket-qua.json` | 4 trang × 2 khung, mức `wcag2a/aa · wcag21a/aa` | ✅ |
| Vùng bấm ≥44px | **26/26** | `data/a11y/vung-bam.json` | 375px, ngữ cảnh cảm ứng | ✅ |
| Bàn phím · zoom · chữ dài | **16/16** | `data/a11y/ban-phim-phong-to.json` | 320/375/640px | ✅ |
| Cài từ ngoài repo tới kết quả đầu | **12 giây** | `data/tich-hop/ket-qua.json` | trung vị 10 lượt, cài từ tarball ngoài repo — số bản dựng và dải nằm ở README, không chép lại ở đây | ✅ |
| Một lượt `inspect()` | **668 ms** | như trên | trung vị 10 lượt | ✅ |
| Dòng mã tích hợp | **30** | `vi-du-tich-hop/src/tich-hop.js` | đếm tự động, không gõ tay | ✅ |
| Lượt gọi RPC mỗi lượt kiểm | **6,5** trung vị (4–9) | `so-lieu.json` · 22/08 | 20 giao dịch công khai lưu offline | ✅ |

### Cohort — neo 25/08, **không** so trực tiếp với cohort 21/08

| Claim | Số | Phạm vi | Trạng thái |
|---|---|---|---|
| Giao dịch bị gắn mã cáo buộc | **0** | trên **9/20** mẫu còn mô phỏng được | ✅ |
| Giao dịch bị gắn cờ | **7** Vàng, **2** Xanh, **0** Đỏ | như trên | ✅ |
| Coverage trung bình | **82 %** | như trên | ✅ |
| Lệnh chạm tài sản người ký đọc hiểu được | **13/20** | cả 20, không chỉ 9 | ✅ |
| Mẫu rụng khỏi cohort | **11/20** | không mô phỏng lại được | ⚠️ ghi rõ, xem `docs/review/UPDATE-REPORT.md` mục 4 |
| **Tỉ lệ báo nhầm** | — | **chưa có ground truth** | ❌ **chưa đo được** — không được suy từ "0 cáo buộc" |

### Người dùng và người mua

| Claim | Số | Phạm vi | Trạng thái |
|---|---|---|---|
| Phỏng vấn người dùng | **20 người thật** | 29–30/08/2026, giao thức khoá trước | ✅ **thật, không phải synthetic** |
| — nêu đúng hậu quả | **13/20** (một phần 5, sai 2) | như trên | ✅ |
| — quyết định: huỷ / kiểm thêm / ký | **10 / 6 / 4** | như trên | ✅ |
| Hiểu đúng mà **vẫn ký** | **2** | như trên | ✅ — số bất lợi, giữ nguyên |
| Phỏng vấn **người mua** (ví, dApp) | **0** | — | ❌ **chưa làm** |
| Bên thứ ba tích hợp SDK | **0** | — | ❌ **chưa có** |
| Usability vòng 2 trên giao diện hiện tại | — | giao thức đã khoá | ❌ **chưa chạy** |

### Chi phí và mô hình kinh doanh

| Claim | Trạng thái |
|---|---|
| Token mô hình mỗi lượt | ❌ **BLOCKED_BY_SECRET** — cần khoá API, demo công khai cố ý không nhúng khoá |
| ~~"Trần cứng 400 token"~~ | ⚠️ **đã sửa** — `anthropic.ts` dùng `tuyChon.maxTokens ?? 400`, tức **mặc định**, bên tích hợp nâng được. Và 400 chỉ tính đầu **ra**. Xem [`DON-VI-KINH-TE.md`](DON-VI-KINH-TE.md) |
| Số lượt gọi mỗi lần kiểm | ⚠️ không phải luôn bằng 1 — SDK Anthropic mặc định `maxRetries = 2` |
| Neo giá $49/tháng | ✅ có nguồn: bảng giá Helius và QuickNode |
| ~~"Thị trường đã được chứng minh hộ"~~ | ⚠️ **đã thu hẹp** — thương vụ Phantom–Blowfish chứng minh năng lực này đáng tiền **với Phantom**, không xác thực khách hàng hay giá của Custos. Xem mục 3 |

---

## 3 · Ba claim đã bị thu hẹp trong vòng này, và vì sao

Cả ba đều **không phải lỗi số học**. Chúng là chỗ câu chữ đi xa hơn bằng chứng đúng
một bước — kiểu sai khó thấy nhất, vì mọi con số trong câu đều đúng.

### 3.1 · "Trần cứng 400 token" → "mặc định 400 token đầu ra"

`packages/ai/src/anthropic.ts` dùng `max_tokens: tuyChon.maxTokens ?? 400`. Đó là
**giá trị mặc định**, không phải trần: bên tích hợp truyền số lớn hơn là nó lớn hơn.

Sai hai lần trong một câu: 400 không chặn được ai, và nó chỉ tính token đầu **ra**
trong khi nhà cung cấp tính tiền cả đầu vào. Câu này đứng trên slide chi phí — đúng
chỗ giám khảo hỏi kỹ nhất.

### 3.2 · "Thị trường này đã được chứng minh hộ" → một người mua cụ thể đã trả tiền

Phantom mua Blowfish năm 2024 rồi đóng dịch vụ bán rời. Thương vụ đó **đọc được hai
cách**:

| Cách đọc | Có lợi cho đội? |
|---|---|
| Thị trường có thật — ví lớn chịu trả tiền cho lớp này | có |
| Năng lực này bị **mua về làm nội bộ**, không còn bán rời | không |

Deck cũ chỉ kể cách thứ nhất. Giám khảo mảng này nghĩ ra cách thứ hai trong ba giây,
nên nó phải nằm sẵn trên slide. Điểm dữ liệu đối lại: **Blockaid vẫn bán transaction
security cho ví khác** — mô hình bán rời chưa chết.

### 3.3 · "Ví hiện tại cho họ xem" → "dữ liệu giao dịch thô"

Slide 2 đặt câu đó trên một khối instruction thô, trong khi **slide 3 của chính deck**
thừa nhận ví lớn đã có mô phỏng và cảnh báo. Tự mâu thuẫn sau đúng một slide.

---

## 4 · Ba lệch số đã đồng bộ, và lỗ hổng chung của chúng

| Chỗ | Đang viết | Sự thật | Vì sao lệch |
|---|---|---|---|
| `README.md:38` · `PITCH:114` · `vi-du-tich-hop/README.md:47` | 29 dòng | **30** | dòng có hai số đo, generator chỉ neo số giây |
| `README.md:130` | 6/6 bẫy | **13/13** | số của một lượt đo cũ, không nằm trong đường đồng bộ |
| `CLAUDE.md:37` · `SEED-DATASET.md:6,30` | 33 mẫu | **38** | `CLAUDE.md` chỉ neo số test; `SEED-DATASET.md` chưa từng nằm trong đường đồng bộ |

**Cả ba cùng một hình dạng: một dòng mang nhiều con số, và chỉ một con số được neo.**
Guard cũ vẫn xanh vì nó canh đúng con số đã neo. Cách sửa không phải là sửa tay ba
chỗ — mà là thêm chúng vào `dong-bo-so-tai-lieu.mjs` **và** vào danh sách mốc trong
`packages/core/test/claim.test.ts`, để lần lệch sau không im lặng.

> Con số **25 mẫu** trong `SEED-DATASET.md` **không** đồng bộ: nó là mục tiêu kế hoạch
> ban đầu và chính đoạn đó nói rõ như vậy. Đồng bộ nó lên 38 là viết lại lịch sử.

---

## 5 · Vì sao guard không quét chung chữ "N mẫu"

Đã thử và đo: gần như toàn dương tính giả. Trong repo này *"9 mẫu"* là tập con còn mô
phỏng được, *"10 mẫu"* là tập âm, *"6 mẫu"* là một nhóm trong đặc tả, *"20 mẫu"* là
cohort. Chữ "mẫu" mang nhiều nghĩa, khác hẳn *"N test"* vốn chỉ có một nghĩa.

Một guard kêu sai hàng chục lần là guard sẽ bị tắt. Nên tổng dataset được canh **theo
vị trí dòng**, chính xác từng chỗ, thay vì quét cả file.

Xem `packages/core/test/claim.test.ts`.
