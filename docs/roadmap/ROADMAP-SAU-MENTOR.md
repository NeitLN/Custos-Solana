# Lộ trình build sau buổi mentor 1:1 — 29/09 → 10/10/2026

> Soạn 29/09/2026. Đầu vào: góp ý mentor 1:1 (8 điểm), đọc mã hiện tại, và một lượt
> phản biện read-only của Codex. Mục 9 ghi rõ điểm nào của Codex được nhận, điểm nào không.
> Tài liệu này là **kế hoạch**, không phải bằng chứng đã làm. Trạng thái thật ghi ở `TIEN-DO.md`.
> Chỉ nói về sản phẩm. Video, pitch và hồ sơ do chủ dự án tự lo, nên không nằm trong lộ trình này.

---

## 0. Quyết định trong một đoạn

Định vị Custos là **SDK bảo mật giao dịch chạy trước lúc ký, dành cho nhà phát triển ví (chính) và dApp (phụ)**.
Người dùng cuối không mở Custos. Họ được bảo vệ vì ví của họ đã tích hợp Custos.

Để chứng minh điều đó, ví mẫu của Custos trở thành **một ví theo chuẩn Wallet Standard**. SolBonus được viết lại
thành **một dApp độc hại mô phỏng**, dùng `@solana/wallet-adapter` như mọi dApp Solana, không import mã Custos và
không biết Custos tồn tại. Nó tự dựng giao dịch rồi gọi `signTransaction`. Yêu cầu đi vào ví, ví chạy `inspect()`,
người dùng thấy cảnh báo và tự quyết định. Mọi chữ ký đều phải đi qua bước này.

Không làm trước chung kết:

- browser extension;
- MCP hay AI-trader;
- chạy Lighthouse runtime;
- mainnet.

---

## 1. Mentor nói gì, và mã hiện tại xác nhận ra sao

| # | Góp ý | Trong repo hôm nay (đã đọc 29/09) | Phải đổi |
|---|---|---|---|
| 1 | Journey không rõ, trông giống trang quét | Luồng chính mở vào "Phòng phân tích": dán giao dịch rồi xem kết quả. Đó đúng là hình ảnh một scanner | Luồng chính phải là **dApp → ví → Custos → quyết định**. Phòng phân tích lùi về thành "công cụ cho nhà phát triển" |
| 2 | SolBonus phải là dApp độc hại mô phỏng | Landing và nhãn chưa nói rõ. Người xem dễ hiểu là "Custos nhận ra web lừa đảo" | Mọi nơi gọi đúng tên: *dApp độc hại mô phỏng — không biết Custos tồn tại*. Custos **không** xét URL |
| 3 | Chứng minh SDK nằm trong signing flow | `apps/trang-tan-cong/src/LiveAttack.tsx:2` import `buildLiveHandoff` **từ mã ví**. `session.ts:615` **chỉ nhận** giao dịch khớp kịch bản ví tự dựng. Tức là ví kiểm giao dịch *của chính nó*, không phải giao dịch dApp đưa vào | Ví phải nhận **giao dịch bất kỳ** qua chuẩn. dApp không dùng chung một dòng mã nào với ví |
| 4 | Mới tự tích hợp, chưa có bên thứ ba | `data/tich-hop/ket-qua.json` đang để `doiTac: null` | Có một người ngoài đội tự tích hợp theo `PILOT-TU-LAM.md`. Không gọi việc tự tích hợp là pilot |
| 5 | Lighthouse là related work | Chưa có | Viết tài liệu so sánh. Chưa chạy runtime (mục 6) |
| 6 | Product thật hay MVP | SDK trên npm và giao dịch Devnet đã thật; phần đường nối giữa dApp và ví thì chưa | Chính là việc ở dòng 3 |
| 7 | Extension chỉ đáng làm nếu chặn được thật | — | Không làm. Popup theo Wallet Standard cho ra cùng ranh giới ký mà rẻ hơn nhiều |
| 8 | MCP/AI-trader là hướng mở rộng | — | Chỉ ghi vào hướng phát triển, không build |

Codex còn tìm ra một lỗi thật, và tôi đã đọc lại để xác nhận. Trong `vi-du-tich-hop/src/ky.js:176-190`, nếu signer
resolve `undefined` hoặc một object không có `message`, thì `byteTraVe = null`, phép đối chiếu bị **bỏ qua**, và hàm
vẫn trả `daKy: true`. Ví dụ tích hợp đang khai là đã ký khi không có bằng chứng nào của chữ ký.

---

## 2. Kiến trúc đích

```
  Origin 1: neitln.github.io                    Origin 2: custos-solana.vercel.app
 ┌───────────────────────────────┐             ┌───────────────────────────────────────┐
 │ SolBonus — dApp độc hại mô    │             │ Ví mẫu Custos (cửa sổ ví)             │
 │ phỏng                         │             │                                       │
 │  @solana/wallet-adapter-react │  postMessage│  nhận bytes ─► snapshot ─► inspect()  │
 │  tự dựng tx (đọc chain tìm    │ ──────────► │  ─► L2 level ─► thẻ cảnh báo          │
 │  token account của nạn nhân)  │  (origin +  │  ─► người dùng: Chặn / Vẫn ký         │
 │  gọi signTransaction(tx)      │  nonce +    │  ─► khopNeo(bytes) ─► ký bằng ví cố   │
 │                               │  requestId) │     định AqX3…BCLZ                    │
 │  + connector Custos (1 lệnh   │ ◄────────── │  trả bytes đã ký HOẶC lỗi từ chối     │
 │    registerCustosWallet())    │             │  theo dõi signature ─► biên nhận      │
 └───────────────────────────────┘             └───────────────────────────────────────┘
```

**Phần giữ nguyên:**

- L1, L2 và L3; `InspectResult` giữ nguyên kiểu;
- ví cố định; khoá chỉ nằm ở `.devnet/vi-demo.json` và chỉ được nạp trong cửa sổ ví;
- Web Locks, gate, `khopNeo`, cơ chế "không gửi lại khi chưa rõ";
- khung "Nếu bạn ký giao dịch này";
- mọi quyết định đã khoá (ví dụ: AI không tạo `level`; không có smart contract).

**Phần đổi:**

1. **Ví nhận giao dịch tổng quát.** Đây là thay đổi cốt lõi, và làm ở **cả hai nhánh go/no-go**.
   - Ví deserialize bytes do dApp gửi, chụp snapshot, rồi `inspect()` chính các bytes đó.
   - Ví không còn so với `buildLiveHandoff`.
   - Luồng kịch bản cũ giữ lại làm đối chứng nội bộ, nhưng không còn là đường dẫn của dApp.
2. **Connector theo Wallet Standard.** Gói nhỏ trong `packages/connector` (tên chốt ở ADR-0004).
   - Chạy trong trang dApp và gọi `registerWallet()`.
   - Khai các feature `standard:connect`, `standard:disconnect`, `standard:events` và `solana:signTransaction`.
   - Chain là `solana:devnet`. `supportedTransactionVersions` chỉ ghi những gì đã nghiệm thu.
3. **Cửa sổ ví mở một lần, lúc connect**, ngay trong thao tác bấm của người dùng, trước mọi `await`. Những lần ký
   sau gửi postMessage tới cửa sổ đã mở và gọi `focus()`. Làm vậy tránh việc trình chặn popup chặn mỗi lần ký, và
   khoá chỉ phải nạp một lần.
4. **Chỉ có `signTransaction`, không có `signAndSendTransaction`.** Wallet-adapter sẽ tự
   `sendRawTransaction` khi ví chỉ khai `signTransaction` (phép thử T1 xác nhận điều này).
   - Ví biết signature từ bytes đã ký nên tự theo dõi `getSignatureStatuses`.
   - Nhờ vậy ví **vẫn lập được biên nhận và đối chiếu dự báo với thực tế** mà không phải tự gửi.
5. **dApp không có quyền gì với Custos.** Thông điệp từ dApp chỉ chứa bytes, requestId và nonce. dApp không thể
   truyền `protected=false`, verdict, sự đồng ý hay `expectedAction`. Nút tắt Custos chỉ nằm trong UI của ví, và
   bản trình diễn khoá nó ở chế độ bảo vệ.
6. **SolBonus tự làm những gì một dApp độc hại thật sẽ làm.**
   - Đọc chain bằng `getTokenAccountsByOwner` để tìm token DEMO của nạn nhân.
   - Tự dựng lệnh "chuyển nửa số token và đổi chủ tài khoản".
   - Chỉ giữ một đường dẫn cho phép chọn "phiên bản lành" để làm đối chứng: cùng giao diện, giao dịch không lấy gì.

**Nói rõ giới hạn**, ghi trong README và UI:

- đây là ví web tham chiếu, không phải Phantom;
- dApp vẫn phải gọi một lệnh `registerCustosWallet()`, giống cách dApp thêm Mobile Wallet Adapter. Ngoài lệnh đó,
  dApp không gọi `inspect` và không import mã ví;
- chỉ chạy trên Devnet.

---

## 3. Những thứ KHÔNG làm, kèm lý do

| Việc | Lý do |
|---|---|
| Extension MV3 | Muốn làm phải xử lý thêm injection, messaging của service worker, vòng đời và quản lý khoá. Ranh giới ký chứng minh được thì y hệt popup. Mentor cũng nói extension chỉ đáng làm nếu *thật sự chặn được* |
| Guard phía dApp quanh Phantom | Chỉ chứng minh được *dApp tử tế* tự kiểm giao dịch. Không chứng minh Custos nằm trong ví. Là việc tuỳ chọn, chỉ làm khi mọi thứ đã xanh (mục 4, GĐ2) |
| Chạy Lighthouse runtime | Phải chèn lệnh vào giao dịch của người dùng, trái với quyết định khoá số 5 (Custos chỉ đọc và mô phỏng). Còn vướng interop giữa web3.js v1 và `@solana/kit`, và ngân sách 1.232 byte. Xem mục 6 |
| `signAndSendTransaction` | Chưa có đường kiểm tương ứng thì không khai |
| Publish `core 0.3.0` bắt buộc | Không nằm trên đường chính. Chỉ publish khi hợp đồng signer (A2) đã khoá |
| MCP / AI-trader | Mentor xếp vào mở rộng |

---

## 4. Lộ trình theo giai đoạn

Vai: **A** Core/SDK · **B** ví + dApp + deploy · **C** journey, chữ tiếng Việt, L3 · **D** bên thứ ba + related work + đối chiếu tuyên bố.

### GĐ0 — Chứng minh kiến trúc trước khi xây (29 → 30/09, go/no-go tối 30/09)

| Mã | Vai | Việc | Nghiệm thu |
|---|---|---|---|
| G0-1 | B | **Spike** trên hai origin thật (Pages và Vercel preview): trang dApp tối giản dùng wallet-adapter, connector đăng ký "Custos Demo Wallet", cửa sổ ví ký một giao dịch chuyển 1 lamport do dApp dựng, trả bytes, dApp tự gửi | Có signature trên Explorer Devnet, được tạo từ một giao dịch mà ví **không** tự dựng |
| G0-2 | A+B | Chạy 5 phép thử rủi ro (mục 5) và ghi kết quả vào `docs/review/ck-20260930/SPIKE-CONNECTOR.md` | Mỗi phép có kết luận ĐẠT hoặc KHÔNG, kèm bằng chứng |
| G0-3 | A | **ADR-0004**: định vị (ví là chính, dApp là phụ), kiến trúc connector, hợp đồng thông điệp dApp↔ví, những gì dApp KHÔNG được truyền, lý do bỏ extension và Lighthouse runtime | ADR được merge. Không mâu thuẫn với 8 quyết định đã khoá |
| G0-4 | A | **Sửa hợp đồng signer** trong `ky.js`. Signer phải trả một giao dịch có chữ ký hợp lệ của `viNguoiDung` trên đúng bytes đã kiểm (dùng `nacl`/`ed25519` verify). `undefined`, object lạ, hoặc chữ ký rỗng ⇒ `chua_ro` với lý do `signer_khong_tra_chu_ky`. Thêm ba test đối kháng | Test đỏ trên mã cũ, xanh sau khi sửa |
| G0-5 | C | Vẽ **journey 7 trạng thái**: kết nối → yêu cầu ký → đang kiểm → cảnh báo/an toàn → chặn \| vẫn ký → đã gửi/xác nhận \| chưa rõ → lỗi (popup bị chặn, ví đóng, RPC lỗi, hết hạn blockhash). Mỗi trạng thái có đúng một câu tiếng Việt | Bảng trạng thái nằm trong ADR-0004 để B xây đúng ngay từ đầu |
| G0-6 | D | Tìm **một người ngoài đội** (dev ví hoặc dApp, hay sinh viên ngành khác) sẵn lòng làm theo `PILOT-TU-LAM.md` trong khoảng 03–05/10 | Có tên và lịch hẹn. Không hứa trước kết quả |

**Go/no-go 30/09:**

- **Đạt** G0-1 và 4 trên 5 phép thử (bắt buộc đạt T2 và T4) ⇒ đi nhánh **Chuẩn**.
- **Không đạt** ⇒ nhánh **Dự phòng**:
  - giữ postMessage riêng hiện có;
  - SolBonus **bỏ import mã ví** và tự dựng giao dịch như ở nhánh Chuẩn;
  - ví vẫn nhận giao dịch tổng quát (B1).

  Mất phần "chuẩn Wallet Standard" nhưng vẫn giải quyết góp ý 3 và 6 của mentor. **Không chuyển sang MV3.**

### GĐ1 — Đường ký thật (01 → 03/10)

| Mã | Vai | Việc | Nghiệm thu |
|---|---|---|---|
| B1 | B | **Ví nhận giao dịch tổng quát.** Chạy `inspect()` trên đúng bytes nhận được; bỏ điều kiện `serialized !== buildLiveHandoff(offered)`; giữ gate, Web Locks và neo. Nếu `feePayer`/signer không phải ví ⇒ từ chối với lý do rõ. Nếu giao dịch đã có chữ ký của bên khác ⇒ giữ nguyên các chữ ký đó | Test: một transfer do dApp dựng, cùng các biến thể amount/recipient, đều ra kết quả đúng luật. Giao dịch v0 có ALT ra đúng kết quả; nếu chưa hỗ trợ thì từ chối và nói rõ |
| B2 | B | **Connector** (nhánh Chuẩn):<br>• kiểm `event.origin`, `event.source`, schema, requestId và nonce dùng một lần;<br>• mỗi promise luôn có kết cục: đã ký / từ chối / hết hạn / cửa sổ đóng;<br>• `window.open` trả `null` ⇒ báo "Trình duyệt chặn cửa sổ ví" | Test đơn vị cho từng nhánh. Không có promise nào treo quá hạn |
| B3 | B | **Viết lại SolBonus** trên wallet-adapter thuần:<br>• xoá import `demo-wallet`;<br>• tìm token DEMO bằng cách đọc chain;<br>• có công tắc "phiên bản lành" để đối chứng;<br>• deploy lên origin khác với ví | Chạy `grep -r "demo-wallet" apps/trang-tan-cong/src` phải ra 0 kết quả. Guard test giữ điều này |
| B4 | B | **Biên nhận khi dApp tự gửi**: ví theo dõi signature đã ký, rồi đối chiếu số dư dự báo với thực tế như CK-05. Không bao giờ tự gửi lại | Một lượt "vẫn ký" trên Devnet có biên nhận mang signature thật |
| A1 | A | Đưa **hợp đồng signer** (bản đã sửa ở G0-4) vào vị trí ví dùng: ví mẫu gọi cùng một hàm với ví dụ tích hợp, không giữ hai bản logic | Một nguồn duy nhất, có test ở cả hai phía |
| A2 | A | Test đối kháng cho đường ký mới: tráo bytes giữa kiểm và ký, đổi blockhash, gọi ký hai lần, dApp gọi thẳng feature mà bỏ qua UI, batch nhiều giao dịch, reject hoặc timeout giữa chừng | Không có chữ ký nào được tạo trước khi người dùng đồng ý, và không ký hai lần |
| C1 | C | Chữ tiếng Việt cho 7 trạng thái (G0-5) trong cửa sổ ví. Phân biệt rõ **"thiếu dữ liệu"** với **"phát hiện hành vi nguy hiểm"** | Guard từ vựng (`DAC-TA-L3`) xanh |

### GĐ2 — Journey và bề mặt cho nhà phát triển (03 → 05/10)

| Mã | Vai | Việc | Nghiệm thu |
|---|---|---|---|
| C2 | C | **Viết lại landing theo journey.**<br>• Hero là sơ đồ dApp → ví (Custos bên trong) → quyết định.<br>• CTA chính: "Thử như người dùng" (mở SolBonus) và "Tích hợp vào ví của bạn" (trang dev).<br>• Câu định vị: *"Custos không phải trang quét link. Custos chạy trong ví, trên đúng giao dịch sắp ký."* | Người chưa từng xem, sau 30 giây, trả lời đúng "Custos nằm ở đâu" (thử với 3 người, ghi lại câu trả lời) |
| C3 | C | **SolBonus mang nhãn cố định**: "dApp độc hại mô phỏng — không biết Custos tồn tại, không có mã Custos". Phòng phân tích đổi tên thành "Công cụ nhà phát triển: kiểm một giao dịch bất kỳ" và lùi khỏi luồng chính | Không còn câu nào ngụ ý Custos xét URL hay tên miền (guard grep) |
| A3 | A+C | **Trang "Tích hợp"** trên site:<br>• bên trái: `npm install @custos-solana/core` và khoảng 20 dòng (`inspect` → policy → hỏi → `kySauKhiKiem`);<br>• bên phải: chạy **chính đoạn mã đó** trên giao dịch SolBonus và in `InspectResult`;<br>• số dòng lấy từ đếm máy, không gõ tay | Đoạn mã hiển thị trùng byte với file có test chạy thật (như `readme.test.ts`) |
| B5 | B | **Probe E2E hai origin** (Playwright), dùng production origins và ví cố định:<br>• connect → SolBonus bản độc → "Nguy hiểm" → Chặn: không gửi gì;<br>• bản độc → Vẫn ký: có biên nhận;<br>• bản lành: kết quả không bị cáo buộc;<br>• thêm các ca popup bị chặn, cửa sổ ví đóng giữa chừng, hai tab | Thay bộ 13/13 cũ bằng bộ mới. Số liệu ghi vào `docs/review/ck-2026100x/` |
| D1 | D | Hỗ trợ người ngoài đội tự tích hợp (G0-6), ghi lại **mức hỗ trợ thật** (câu hỏi họ gặp, thời gian, lỗi) vào `data/tich-hop/ket-qua.json` | Có bản ghi thật, hoặc ghi rõ "chưa có". Không gọi việc tự tích hợp là pilot |
| D2 | D | **Related work Lighthouse** (mục 6), đặt ở `docs/nghien-cuu/LIGHTHOUSE.md` | Mọi tuyên bố về Lighthouse đều có link nguồn chính thức |
| A4 (tuỳ chọn) | A | Chỉ làm nếu B5 xanh trước 04/10: ví dụ **guard phía dApp** bọc `signTransaction` của Phantom Devnet, dưới 1 ngày công | Chạy được với Phantom thật. README nói rõ đây là lớp bảo vệ phía dApp, không phải lớp phía ví |

### GĐ3 — Đóng băng và nghiệm thu (06 → 08/10)

| Mã | Vai | Việc | Nghiệm thu |
|---|---|---|---|
| F1 | cả đội | **06/10 đóng băng tính năng.** Sau mốc này chỉ sửa lỗi về bảo mật, tính đúng, hoặc thứ làm demo không chạy | — |
| F2 | A | Codex review read-only toàn bộ diff từ 29/09 và sửa theo finding | Không còn finding mức cao |
| F3 | B | Nghiệm thu live cuối trên production (bộ B5), lưu signature | Bản `NGHIEM-THU-LIVE` mới |
| F4 | D | Đối chiếu **từng tuyên bố** trên landing, trang tích hợp và README với artifact thật: số test, số dòng, "dApp không import Custos", "pilot" | Tuyên bố nào không có artifact thì sửa chữ, không sửa số |
| F5 | A | Cập nhật `TIEN-DO.md`, `BAN-GIAO.md`, `CLAUDE.md` (mục Đã có/Chưa có), `packages/core/README.md` | `npm run check` xanh |

**09 → 10/10:** chỉ sửa lỗi chặn. Kiểm Devnet, RPC và số dư ví cố định trước giờ chạy.

---

## 5. Năm phép thử trong 48 giờ đầu (G0-2)

| # | Giả định | Cách thử | Đạt khi |
|---|---|---|---|
| T1 | Wallet-adapter tự nhận connector | Trang tối giản; thử connect, disconnect, reload trước và sau khi nạp connector; gọi `sendTransaction` khi ví chỉ khai `signTransaction` | Ví xuất hiện trong danh sách; tài khoản cập nhật qua `standard:events`; adapter tự ký rồi gửi |
| T2 | Popup cách ly đúng origin | Hai origin HTTPS thật; thử sai origin, sai nonce, replay nonce cũ, hai yêu cầu đồng thời, popup bị chặn, đóng giữa chừng | Không có chữ ký nào ngoài sự đồng ý; mọi promise đều có kết cục |
| T3 | Đường ký hiện tại dùng lại được cho giao dịch tổng quát | Transfer v0 do dApp dựng, biến thể amount/recipient, một ca có ALT | Không phụ thuộc `buildLiveHandoff`; chữ ký hợp lệ; chữ ký sẵn có được giữ |
| T4 | Mọi đường ký đều đi qua Custos | Gọi feature trực tiếp mà bỏ qua UI dApp; batch; tráo bytes; đổi blockhash; timeout hoặc reject | Không ký trước khi người dùng đồng ý, không ký hai lần; `signTransaction` không tự gửi |
| T5 | Demo công khai chịu được RPC thật và tốc độ đọc của con người | Production origin và RPC; để người dùng chờ lâu trước khi đồng ý; ngắt RPC; để blockhash hết hạn | Không tự chuyển sang "an toàn"; không tự ký hay gửi lại; blockhash hết hạn ⇒ báo và yêu cầu dApp dựng lại |

---

## 6. Lighthouse: related work, chưa tích hợp

- **Là gì.** Theo tài liệu công khai tại github.com/Jac0xb/lighthouse, Lighthouse là một program Solana cho phép chèn
  **assertion** vào giao dịch, ví dụ "số dư sau lệnh ≥ X" hay "chủ tài khoản vẫn là Y". Assertion sai thì **cả giao
  dịch thất bại**.
  - Đã kiểm 29/09: program `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95` có mặt và executable trên cả Devnet lẫn
    mainnet; client là `lighthouse-sdk` 2.1.0, dựng trên `@solana/kit`.
  - Mentor gọi nó là "Phantom Lighthouse". D phải tìm nguồn chính thức về quan hệ giữa Lighthouse và Phantom trước
    khi nói điều đó ra ngoài.
- **Quan hệ với Custos: hai lớp bổ trợ cho nhau.**
  - Custos **giải thích trước khi ký**: hậu quả phụ nào, bằng tiếng Việt, cho người dùng quyết định.
  - Lighthouse **cưỡng chế lúc thực thi**: chặn trường hợp trạng thái on-chain đổi giữa lúc mô phỏng và lúc chạy
    (TOCTOU).
  - Custos không chặn được TOCTOU; Lighthouse không giải thích được cho người dùng.
- **Vì sao chưa tích hợp:**
  1. Phải chèn lệnh vào giao dịch người dùng, chạm quyết định khoá số 5.
  2. Custos dùng web3.js v1, còn Lighthouse 2.x dùng `@solana/kit`; client legacy ghim web3.js 1.91.7, chưa kiểm
     được là tương thích.
  3. Thêm lệnh thì tăng bytes, accounts và compute trong ngân sách 1.232 byte.
  4. Sửa message thì mọi chữ ký có sẵn mất hiệu lực, và phải mô phỏng lại **đúng bytes cuối**, vì `neo.ts` coi đổi
     blockhash là đổi message.
  5. Assertion sai điều kiện (ví dụ "số dư ≥ dự báo" khi chính dự báo đã bao gồm khoản bị rút) vẫn để mất tiền.
     Và thất bại ở bước mô phỏng thì không được gọi là "đã chặn on-chain".
- **Hướng sau chung kết:** nếu làm thì làm qua ADR riêng. Mặc định tắt, ví tự chọn bật, và chỉ dùng assertion suy ra
  từ **điều người dùng đã thấy trên thẻ cảnh báo** (ví dụ "chủ tài khoản token vẫn là bạn").

---

## 7. Câu chữ định vị (C dùng cho landing và README)

- **Một câu:** *Custos là SDK cho ví và dApp Solana. Nó đọc và mô phỏng đúng giao dịch sắp ký, rồi nói bằng tiếng
  Việt những hậu quả nằm ngoài hành động chính, trước khi người dùng bấm ký.*
- **Ai dùng:** nhà phát triển ví (chính) và dApp (phụ). Người dùng cuối được bảo vệ qua ví đã tích hợp.
- **Không phải:** trang quét link, danh sách đen tên miền, hay một ví mới cạnh tranh với Phantom.
- **Bằng chứng tích hợp sau GĐ2:**
  - một dApp không có mã Custos, gọi ví qua chuẩn Wallet Standard, và mọi chữ ký đều đi qua `inspect()`;
  - một ví dụ `npm install` → khoảng 20 dòng, có test chạy thật;
  - bản ghi của người ngoài đội tự tích hợp (nếu có). Không có thì ghi "chưa có".

---

## 8. Rủi ro và đường lui

| Rủi ro | Dấu hiệu | Đường lui |
|---|---|---|
| Connector trượt go/no-go | T1, T2 hoặc T4 không đạt ngày 30/09 | Nhánh Dự phòng (GĐ0). B1 và B3 vẫn làm; chỉ đổi lớp vận chuyển |
| Trình chặn popup trên máy trình diễn | T2 hoặc T5 | Mở cửa sổ ví lúc connect, trước khi ký; thêm hướng dẫn "cho phép cửa sổ" trong chính dApp |
| Devnet hoặc RPC chập chờn | Bộ đo `do-chang` | RPC riêng khi DEV (đã có); probe chia theo phân đoạn; chế độ phát lại cho phần phân tích |
| Hết SOL ví cố định | Số dư dưới 1 SOL | Nạp faucet vào **đúng** `AqX3…BCLZ`. Không tạo ví mới |
| B quá tải (B1–B5) | Trễ quá 1 ngày so với bảng | A nhận B2 (connector là mã thuần, không có UI); cắt A4 trước |
| Không có người ngoài tự tích hợp | Hết 05/10 | Ghi "chưa có". Không đổi tên việc tự tích hợp thành pilot |

---

## 9. Phản biện của Codex: đã nhận gì, sửa gì

| Codex nói | Xử lý |
|---|---|
| Popup theo Wallet Standard là lựa chọn đúng; extension thì cắt | Nhận |
| Go/no-go phải sớm (30/09), không để đến 03/10 | Nhận |
| Cần spike hai origin thật trước khi chốt ADR | Nhận (G0-1). Hai origin sẵn có: GitHub Pages và Vercel |
| "Không một dòng code Custos" là nói quá, vì dApp vẫn phải nạp connector | Nhận. Sửa thành "dApp chỉ gọi `registerCustosWallet()`, không gọi `inspect`, không import mã ví" |
| `ky.js` trả `daKy: true` khi signer trả `undefined` | **Đã xác minh** ở dòng 176–190 ⇒ G0-4 |
| Chỉ làm `signTransaction`; chain là `solana:devnet` | Nhận. Bổ sung B4: ví vẫn lập biên nhận bằng cách theo dõi signature |
| dApp không được truyền `protected`, verdict hay sự đồng ý | Nhận (mục 2, điểm 5) |
| Journey UX làm sớm, không để GĐ2 | Nhận (G0-5). Phần landing vẫn ở GĐ2 vì nó phụ thuộc luồng đã chạy |
| Lighthouse chỉ làm related work, spike tối đa nửa ngày, không đưa vào demo | Nhận phần related work. **Bỏ luôn spike** trước chung kết, vì nửa ngày không đủ giải interop web3.js v1 và kit |
| Kế hoạch 20 mục của Codex có video, tổng duyệt và pitch | Không đưa vào: chủ dự án tự lo phần đó |
| Bộ nghiệm thu 13/13 hiện tại không chứng minh đường connector | Nhận ⇒ B5 thay bộ cũ |
