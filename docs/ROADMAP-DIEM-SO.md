# Roadmap vòng 2 — build theo điểm, không build theo hứng

**Lập 23/08/2026, từ `docs/CHAM-DIEM-GIA-DINH.md`** · commit gốc `9e5e0f3`

`ROADMAP-BUILD.md` đã xong hết (P0-A → P2-F). Roadmap này khác hẳn nó ở tiêu chí
chọn việc:

| | Roadmap 1 | Roadmap này |
|---|---|---|
| Chọn việc theo | Lỗ hổng kỹ thuật tìm ra khi audit | **Ô điểm đang trống trong rubric** |
| Câu hỏi trước mỗi mục | "Cái này có sai không?" | "Cái này đổi được mấy điểm?" |
| Mục nào bị loại | Cái không sửa lỗi thật | **Cái không ai chấm** |

**Quy tắc cứng của vòng này:** không viết thêm một luật nào, không thêm một chương
trình nào vào danh sách xác minh, không nâng coverage. Ô *Giải pháp & demo* đang
8,5/10 — đưa coverage 80 % lên 85 % đổi được khoảng **0 điểm**. Mọi mục dưới đây
phục vụ ô *Mô hình kinh doanh* (25 %) hoặc phần Expo của ô *Demo* (30 %).

---

## Thứ tự thực thi

```
B1  đo chi phí một lượt kiểm tra      <- làm trước, đắt điểm nhất
B2  chế độ "nếu không có Custos"      <- vá chỗ hở lớn nhất của bản public
B3  trang số liệu công khai
B4  bộ đo phỏng vấn                   <- tuỳ chọn, chỉ làm nếu B1-B3 xong sớm
```

Sau mỗi mục: `npm run check` + tự review. Không sang mục sau khi mục trước chưa xanh.

---

## B1 · Đo chi phí một lượt kiểm tra — ĐO, không ước lượng

**Ô điểm:** Mô hình kinh doanh 25 % · **Ước:** 3 giờ · **Đổi được:** ~+0,5 tổng

Đây là mục đắt nhất trong cả roadmap, và nó không cần hỏi ai.

### Vì sao phải đo chứ không nhẩm

Trong bản chấm tôi viết *"khoảng 4–6 lượt gọi RPC"* — con số đó **đọc bằng mắt từ
code**, và nó không đủ tốt để lên slide. Nó bỏ qua:

- số bảng ALT thay đổi theo từng giao dịch (7/10 mẫu mainnet có dùng ALT)
- `getMultipleAccounts` chia lô 100 địa chỉ — giao dịch to tốn nhiều lượt hơn
- `ten-token.ts` chỉ gọi thêm khi có mint chưa biết ký hiệu

Nghĩa là chi phí thật là một **phân bố**, không phải một số. Và đội đã có sẵn kỷ luật
đúng cho chuyện này: đo trên cohort thật, báo trung vị và biên, không làm tròn lên.

> Nếu lên sân khấu nói *"khoảng 5 lượt gọi"* rồi bị hỏi *"đo trên bao nhiêu giao
> dịch?"* thì mất nhiều hơn được. Nói *"trung vị 6, cao nhất 11, đo trên 14 giao dịch
> mainnet thật"* thì không ai hỏi tiếp.

### Cách làm

`scripts/do-chi-phi.ts` — bọc `Connection` trong một Proxy đếm lượt gọi theo tên
phương thức, chạy `inspect()` trên đúng cohort 14 chữ ký đã lưu ở
`data/seed/cohort-audit.json`, in ra bảng.

```
phương thức              trung vị   thấp   cao
getMultipleAccountsInfo      2       1      4
simulateTransaction          1       1      1
getAddressLookupTable        1       0      3
getFeeForMessage             1       1      1
------------------------------------------------
tổng lượt gọi RPC            ?       ?      ?
```

**Không được tự chế trọng số credit.** Helius tính theo *credit*, và mỗi phương thức
có trọng số riêng trong bảng của họ. Script chỉ in **số lượt gọi đo được**; phần quy
ra tiền ghi rõ giả định và bắt phải tra bảng trước khi lên slide.

### Phần token mô hình

Chi phí thứ hai là lượt gọi mô hình ngôn ngữ. Đo được từ trường `usage` mà API trả
về — nhưng chạy được thì cần khoá, và bản công khai cố ý không có khoá.

**Xử lý:** ghi lại `usage` mỗi lần mô hình chạy thật vào một file kết quả, và nếu
chưa có file đó thì script in `CHƯA ĐO — cần chạy với khoá`, **không** đoán. Đội đã
chạy mô hình thật một lần rồi (`docs/bao-mat/DANH-GIA-claude-haiku-*.md`), nên chỉ
cần chạy lại một lượt là có số.

### Đầu ra

`docs/DON-VI-KINH-TE.md` — một trang, đủ dựng một slide:

> Trung vị **N lượt gọi RPC** + **T token mô hình** cho một lượt kiểm tra, đo trên
> 14 giao dịch mainnet thật. Ở giá công khai hiện tại ⇒ chi phí biên ≈ **$X**.
> Tầng $49/tháng của thị trường tương đương **M lượt** ⇒ biên gộp **Y %**.

**Xong khi:** con số nào cũng truy được về một phép đo hoặc một trang giá công khai
có link. Không có ô nào là phỏng đoán.

---

## B2 · Chế độ "nếu không có Custos" cho bản công khai

**Ô điểm:** Demo 30 %, phần Expo · **Ước:** 3 giờ · **Đổi được:** ~+0,3 tổng

### Chỗ hở

Kịch bản demo có hai nhịp, và **sức thuyết phục nằm ở nhịp 1** — ký, rồi thấy 500
USDC về 0. Bản deploy công khai không nhúng khoá ký, nên người bấm link chỉ xem được
nhịp 2: một cảnh báo về mối nguy họ chưa từng thấy xảy ra.

Thể lệ: *"Đội trực booth trong giờ Expo để giám khảo và khách trải nghiệm sản phẩm
chạy thật; điểm Expo cộng vào tiêu chí sản phẩm tương ứng."* Một giám khảo tự bấm mà
không thấy hậu quả sẽ chấm thấp hơn hẳn người ngồi xem đội trình diễn.

### Cách làm — không cần khoá, không dàn dựng

`simulateTransaction` **đã trả về trạng thái sau**. Toàn bộ dữ liệu để hiện hậu quả
đã nằm trong `diff` — cột `after` chính là nó.

Thêm một màn: **"Nếu bạn ký mà không có Custos"** — dựng lại màn hình ví ở trạng
thái *sau*, đọc từ cùng kết quả mô phỏng đang có. Không ký, không giao dịch thật.

### Ba ràng buộc không được vi phạm

1. **Nhãn phải nói rõ đây là mô phỏng**, không phải chuyện đã xảy ra. Thể lệ:
   *"demo dàn dựng sai sự thật bị trừ điểm hoặc loại."* Chữ trên màn hình phải là
   *"kết quả mô phỏng"*, không bao giờ là *"đã xảy ra"*.
2. **Chỉ hiện những gì `diff` có.** Nếu giao dịch chỉ đổi chủ mà không chuyển tiền
   thì màn này **không** được hiện 500 → 0. Đây đúng là luật đã khoá số 7 trong
   `CLAUDE.md`, và nó áp dụng cho màn mới y như bảng chênh lệch.
3. **Không thêm đường ký nào vào bản công khai.** Ràng buộc bảo mật giữ nguyên.

**XONG 23/08.** Và hoá ra chỗ hở nặng hơn mô tả ban đầu: ở bản công khai, tắt
Custos rồi bấm nút thì `kyVaGui` chạy vào **ngõ cụt** — báo lỗi trong nhật ký, người
xem không thấy gì. Không chỉ thiếu nhịp 1, mà là một nút bấm vào thì hỏng.

Mô phỏng không cần chữ ký, nên hậu quả vẫn tính ra được thật. Nhánh không-có-khoá
giờ chạy `inspect()` rồi hiện trạng thái sau, dán nhãn **"Kết quả mô phỏng"**.

Thêm `?khongkhoa=1` để giả lập bản công khai **trên máy có khoá**: không có nó thì
máy của đội luôn đi đường ký thật, nên màn mà mọi người bấm link sẽ thấy lại là màn
không ai trong đội xem được lúc tập. Cờ này chỉ đi một chiều — bắt chặt hơn, không
bao giờ mở khoá ký ở nơi không có khoá.

Nút **"Xem Custos chặn nó"** chạy lại đúng giao dịch đó với Custos bật — hai nhịp
của kịch bản gói vào một cú bấm, đúng thứ cần cho giờ Expo.

**Files:** `packages/ai/src/hauQua.ts`, `HauQua.tsx`, `App.tsx`, `vi.ts`, test
**Thực tế:** ~2 giờ

---

## B3 · Trang số liệu công khai

**Ô điểm:** Demo 30 % + Bài toán 25 % · **Ước:** 2 giờ · **Đổi được:** ~+0,15 tổng

Mọi con số của đội đang nằm trong repo: 232 test, coverage 80 %, 0 cáo buộc sai trên
14 giao dịch mainnet, 29 mẫu, 14 luật. Giám khảo bấm link demo thì **không thấy cái
nào**, và phần lớn giám khảo sẽ không mở repo.

Một trang `/so-lieu` trên chính bản deploy, mỗi con số kèm **cách đo và ngày đo**.
Sinh từ file kết quả đã có chứ không gõ tay — số gõ tay là số sẽ lệch sau hai lần sửa code.

**XONG 23/08** tại `/so-lieu.html`, entry Vite riêng nên có URL gửi được cho giám
khảo và không kéo theo `@solana/web3.js`.

Để làm được, `do-cohort.ts` phải **ghi kết quả ra file** — trước đây nó chỉ in ra
màn hình, nên mọi con số muốn dùng chỗ khác đều phải có người chép tay.

Số test thì **chạy bộ test thật rồi đọc kết quả**, không đếm file — một file có thể
chứa 1 hay 20 ca. CI sinh lại số liệu trước mỗi lần build, nên con số trên trang
luôn là con số của chính commit đang deploy.

**Phép đo lần này lòi ra một chuyện phải nói ra chứ không được giấu:** cohort đã già
đi — 8/20 mẫu không còn mô phỏng được, nên coverage tụt 80 % → 77 % **vì mẫu rụng,
không phải vì code kém đi**. Trang ghi rõ điều đó ngay dưới con số. Giấu đi là tự
đặt bẫy cho chính mình ở phần Q&A.

---

## B4 · Bộ đo phỏng vấn — *tuỳ chọn, chỉ làm nếu B1–B3 xong sớm*

**Ô điểm:** Bài toán 25 % · **Ước:** 2 giờ

`docs/VIEC-CUA-BAN.md` mục 2 đã thiết kế phép đo rất chuẩn: chiếu màn hình, không
giải thích, hỏi *"nếu bạn bấm ký thì chuyện gì xảy ra"*, chấm ĐÚNG/SAI/KHÔNG CHẮC.

Rủi ro là 4 người hỏi 12 người theo 4 kiểu khác nhau, rồi con số công bố không có
nghĩa. Một trang chỉ hiện **đúng màn cảnh báo** + một ô nhập câu trả lời nguyên văn,
lưu `localStorage`, xuất JSON — làm phép đo đồng nhất và giữ được nguyên văn để đối chiếu.

> **Đây là mục dễ bị cám dỗ làm trước vì nó vui.** Đừng. Nó chỉ hỗ trợ việc của
> người, không thay được việc của người: 12 cuộc trò chuyện vẫn phải có người đi hỏi.

---

## Cố ý KHÔNG làm ở vòng này

| Việc | Vì sao |
|---|---|
| Thêm luật thứ 15 | Ô demo đã 8,5/10. Luật mới đổi ~0 điểm, và mỗi luật là một nguồn cáo buộc sai mới |
| Nâng coverage 80 % → 85 % | Cùng lý do. Con số 80 % đã đủ để kể câu chuyện *"nó khai phần nó chưa hiểu"* |
| Decoder cho chương trình DEX | Việc lớn, ô điểm đã gần trần |
| Bảng điều khiển tổ chức, extension | `CUSTOS.md` mục 08 đã xếp "sau cuộc thi". Giữ nguyên |
| Bất cứ thứ gì on-chain | Quyết định đã khoá số 5 |

---

## Việc KHÔNG phải build — vẫn đắt điểm hơn mọi mục trên

Ghi ở đây để không bị quên khi nhìn roadmap toàn mục kỹ thuật:

| Việc | Ai | Đổi được |
|---|---|---:|
| Phỏng vấn 12 người dùng thật | Cả 4 | **+0,6** |
| Nhắn 8 ví/dApp, ghi lại phản hồi | 1 người, 1 tối | **+0,3** |
| Câu build-vs-buy + 2 câu Q&A còn thiếu | 1 người, 1 giờ | **+0,2** |
| Sửa mục 13 `CUSTOS.md` về số trung thực | 30 phút | *chống mất điểm* |
| Video 60–90 giây · slide · tập 5 lượt | Cả 4 | *thiếu là loại hồ sơ* |

**Phỏng vấn 12 người vẫn là việc đắt điểm nhất trong toàn bộ dự án**, và không dòng
code nào thay được nó. B1–B3 cộng lại đổi được ~0,95 điểm; riêng B1 và phỏng vấn
cộng lại đổi được ~1,1.

---

## Trạng thái

| | |
|---|---|
| B1 chi phí một lượt kiểm tra | **PASS** — đo được, và lòi ra một khoản chi phí không ai để ý |
| B2 chế độ "nếu không có Custos" | **PASS** — 7 ca test, và vá một ngõ cụt của bản công khai |
| B3 trang số liệu | **PASS** — sinh từ phép đo, CI tự cập nhật số test |
| B4 bộ đo phỏng vấn | TUỲ CHỌN |
