# Tự thử Custos trong một buổi — không cần hỏi đội Custos

**Việc B02 của [`ROADMAP-CLAUDE.md`](../ROADMAP-CLAUDE.md).** Dành cho một đội ví hoặc
dApp muốn tự đánh giá, không phải cho người trong monorepo.

> **Bộ này hoàn tất KHÔNG có nghĩa đã có đối tác dùng.** Tính tới lúc viết,
> `data/tich-hop/ket-qua.json` có `doiTac: null` và chưa bên thứ ba nào tích hợp.
> Nếu bạn là người đầu tiên, đội Custos sẽ nói đúng như vậy chứ không gọi bạn là
> "khách hàng".

---

## 0 · Custos nằm ở đâu trong hệ thống của bạn

Đọc mục này trước, vì nó quyết định bộ kit có hợp với bạn không.

```
người dùng  →  dApp  →  [VÍ CỦA BẠN]  →  ký  →  mạng
                          ↑
                    Custos ở ĐÂY
```

**Custos chạy trong ví, trước màn hình ký.** Nó đọc giao dịch, mô phỏng, và trả về
`level` + lời giải thích. **Ví của bạn quyết định** chặn, hỏi, hay cho ký — SDK không
tự chặn gì cả.

Hệ quả phải nói thẳng:

- Nếu dApp gửi giao dịch **thẳng tới mạng** không qua ví bạn, Custos không thấy nó.
- **dApp độc hại không phải nơi cưỡng chế bảo vệ.** Không ai cài lớp kiểm tra vào
  chính bên đang lừa mình. Chỗ cưỡng chế được là ví — bên người dùng đã tin.
- Custos **không có smart contract**, không ghi gì lên chain. Nó là lớp đọc và mô
  phỏng, chạy ở client hoặc backend của bạn.

Nếu sản phẩm của bạn không có luồng ký do bạn kiểm soát, dừng ở đây — bộ này không
giúp được gì, và đội Custos sẽ nói vậy thay vì cố bán.

---

## 1 · Từ thư mục trống tới kết quả đầu tiên

Các bước dưới đây **đã được chạy thật** trên một thư mục trống, cài từ npm registry
công khai, không dùng gì trong monorepo.

```bash
mkdir pilot-custos && cd pilot-custos
npm init -y
npm i @custos-solana/core @custos-solana/ai @solana/web3.js
```

### ⚠️ Bẫy 1 — `npm init -y` KHÔNG đặt `"type": "module"`

Mọi ví dụ ở đây dùng `import`. Thiếu dòng đó thì Node ném:

```
SyntaxError: Cannot use import statement outside a module
```

Sửa: thêm `"type": "module"` vào `package.json`. (Hoặc đổi đuôi file thành `.mjs`.)

### Ba mươi dòng gọi `inspect()` trước khi ký

```js
import { Connection, Keypair, PublicKey, SystemProgram,
         TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const nguoiKy = Keypair.generate();
const { blockhash } = await conn.getLatestBlockhash();

const tx = new VersionedTransaction(
  new TransactionMessage({
    payerKey: nguoiKy.publicKey,
    recentBlockhash: blockhash,
    instructions: [SystemProgram.transfer({
      fromPubkey: nguoiKy.publicKey, toPubkey: PublicKey.default, lamports: 1000,
    })],
  }).compileToV0Message(),
);

const r = await inspect(
  { connection: conn, interpret: boiThoiHan(dienGiaiKhongAI) },
  tx,
  { locale: "vi", nguoiDung: nguoiKy.publicKey.toBase58() },
);

// QUYẾT ĐỊNH KÝ LÀ CỦA VÍ BẠN, không phải của SDK.
if (r.level === "danger") return chan(r);
if (r.level === "warning") return hoiNguoiDung(r);
return choKy(r);
```

### ⚠️ Bẫy 2 — lượt chạy đầu tiên ra `warning`, và đó KHÔNG phải lỗi

Ví vừa `Keypair.generate()` chưa có SOL nào, nên mô phỏng thất bại. Kết quả thật:

```
level      : warning
reasonCodes: MO_PHONG_HONG, TRANG_THAI_DO_KHUYET
coverage   : 0/1
explanation: Chúng tôi không chạy thử được giao dịch này, nên không biết nó sẽ làm gì…
```

Đó là **fail-safe đang hoạt động**: không đủ dữ liệu thì ra `warning`, không bao giờ
ra `safe`. Nếu bạn thấy `safe` ở đây thì mới là lỗi — báo ngay.

Muốn thấy đường `safe`, dùng một ví đã có SOL trên Devnet
(`solana airdrop 1 <địa-chỉ> --url devnet`).

---

## 2 · Bốn đường lỗi phải thử trước khi kết luận

Một tích hợp chỉ thử đường thành công là một tích hợp chưa thử gì.

| Thử | Cách dựng | Phải xảy ra |
|---|---|---|
| **RPC chết** | trỏ `Connection` vào host không tồn tại | `inspect()` ném hoặc trả `warning`; **không bao giờ** `safe` |
| **Mô phỏng hỏng** | ví chưa có SOL (mặc định ở trên) | `warning` + `MO_PHONG_HONG` |
| **L3 ném lỗi** | `interpret: () => { throw new Error("x") }` | vẫn có `explanation`, `level` không đổi |
| **L3 treo** | `boiThoiHan(() => new Promise(() => {}), 300)` | lui về câu tất định sau ~300 ms |

Ba đường cuối đã có bài kiểm chạy thật trong repo Custos
([`scripts/tieu-thu-doi-khang.mjs`](../scripts/tieu-thu-doi-khang.mjs)) — nhưng hãy
tự chạy trên hệ thống của bạn, vì thứ đáng kiểm là **ví của bạn** phản ứng thế nào.

**Tiêu chí "chạy được" của một pilot:** không đường lỗi nào biến thành `safe`, và
không đường lỗi nào làm màn hình ký của bạn trắng hoặc treo.

---

## 3 · Nếu muốn cắm mô hình ngôn ngữ

Lớp AI là **tuỳ chọn**. Đường tất định (`dienGiaiKhongAI`) chạy đủ, không cần khoá.

Cắm mô hình mà chưa cài SDK nhà cung cấp thì lỗi nói rõ phải làm gì:

```
Adapter Anthropic cần gói '@anthropic-ai/sdk' mà project chưa cài.
Chạy `npm i @anthropic-ai/sdk`, hoặc dùng `dienGiaiKhongAI`.
```

Ba điều lớp AI **không bao giờ** được làm, và SDK cưỡng chế điều đó:

1. Không tạo và không sửa `level` — `level` chỉ do engine luật sinh ra.
2. Không xác nhận giao dịch an toàn.
3. Không kết luận giao dịch nguy hiểm. Nó chỉ được đề nghị kiểm tra thủ công.

Đầu ra mô hình đi qua một lớp neo: số và địa chỉ không có trong dữ liệu giao dịch bị
vứt, câu nói ngược chiều tài sản bị vứt, và câu bị vứt thì người dùng nhận lại câu
tất định.

---

## 4 · Gửi lỗi cho đội Custos mà KHÔNG lộ bí mật

Đừng gửi khoá, seed phrase, hay log thô. Gửi đúng bốn thứ:

```js
console.log(JSON.stringify({
  phienBan: { core: "0.1.1", ai: "0.2.0", web3: "1.99.0" },  // đọc từ package-lock
  chuKyGiaoDich: "<signature nếu đã lên chain — CÔNG KHAI, gửi được>",
  ketQua: { level: r.level, reasonCodes: r.reasonCodes, coverage: r.coverage },
  mongDoi: "chúng tôi nghĩ phải ra <X> vì <lý do>",
}, null, 2));
```

**Không bao giờ gửi:** `Keypair`, `secretKey`, biến môi trường, URL RPC có API key
nhúng trong đường dẫn, ảnh chụp có địa chỉ ví thật của người dùng.

`explanation` an toàn để gửi — nó chỉ chứa dữ liệu đã có trong chính giao dịch. Nhưng
nếu giao dịch là của người dùng thật, hỏi họ trước.

---

## 5 · Mẫu biên bản tích hợp

Điền cái này rồi gửi lại, hoặc giữ cho mình — nó là thứ trả lời được câu "có nên dùng
không", khác với cảm giác sau một buổi thử.

```
Đội / sản phẩm : ...........................  Ngày: ..........
Phiên bản SDK  : core ......  ai ......
Môi trường     : [ ] devnet  [ ] mainnet-fork  [ ] khác: ......

1. Bao lâu từ thư mục trống tới kết quả `inspect()` đầu tiên?   ...... phút
2. Kẹt ở bước nào lâu nhất?                                     ..............
3. Bốn đường lỗi ở mục 2 — có đường nào ra `safe` không?        [ ] không  [ ] CÓ: ....
4. Thêm bao nhiêu mili-giây vào luồng ký của bạn?               ...... ms (trung vị / n)
5. Điều gì khiến bạn KHÔNG đưa cái này lên production?          ..............
6. Thiếu gì để bạn thử tiếp một tuần nữa?                       ..............
```

Câu 5 là câu quý nhất. Một lời khen không sửa được gì; một blocker cụ thể thì sửa được.

---

## 6 · Bước nào cần đội Custos hỗ trợ

Tự làm được hết mục 1–3. Bốn việc dưới đây thì không:

| Việc | Vì sao cần đội |
|---|---|
| Luật mới cho chương trình của riêng bạn | engine luật nằm trong `@custos-solana/core` |
| Đọc hiểu một chương trình chưa có IDL công bố | cần viết decoder |
| Đổi câu chữ tiếng Việt cho ngữ cảnh của bạn | câu mẫu nằm trong `@custos-solana/ai` |
| Đưa Custos vào luồng mainnet | runtime hiện **chỉ Devnet** — đây là ràng buộc đã khoá của bản thi, không phải giới hạn kỹ thuật |

Dòng cuối quan trọng: **đừng chạy pilot production trên mainnet với bản này.**

---

## 7 · Điều bộ kit này KHÔNG chứng minh

- Không chứng minh có đối tác nào đang dùng Custos. `doiTac` vẫn `null`.
- Không chứng minh Custos phát hiện đúng bao nhiêu phần trăm — chưa có ground truth
  độc lập, xem [`BENCHMARK.md`](BENCHMARK.md).
- Việc đội Custos tự chạy bộ này **không phải** một pilot bên thứ ba. Pilot cần một
  đội khác, trên hệ thống của họ, với dữ liệu của họ.
