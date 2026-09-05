# Custos Core — tích hợp vào ví hoặc dApp Solana

Lớp phân tích giao dịch: mô phỏng giao dịch **trước khi người dùng ký**, chỉ ra những hậu quả **không thuộc về hành động chính**, và giải thích bằng tiếng Việt.

> **Devnet only.** Bản này chưa dùng cho mainnet — xem mục [Giới hạn hiện tại](#giới-hạn-hiện-tại) trước khi quyết định.

---

## Cài đặt

```bash
npm install @custos-solana/core @custos-solana/ai
```

Chạy được bằng `node` thường, không cần cờ nào — gói đã publish chứa `.js` và `.d.ts`
biên dịch sẵn.

> **Đừng dùng `0.1.0`.** Bản đó lên registry với `main` trỏ vào TypeScript nguồn nên
> không cài được từ JavaScript. Dùng **`0.1.1` trở lên** (`@custos-solana/ai` từ `0.1.2`).

`@custos-solana/types` được kéo theo tự động; chỉ cài riêng khi bạn cần gõ kiểu mà
không dùng tới engine.

### Dựng tarball từ nguồn

Cần bản chưa publish, hoặc muốn kiểm bằng mã nguồn trước mắt:

```bash
git clone https://github.com/NeitLN/Custos-Solana && cd Custos-Solana
npx npm@11.6.2 ci
node scripts/dong-goi-sdk.mjs goi-sdk
npm install /duong-dan/Custos-Solana/goi-sdk/*.tgz
```

> Trong repo, `exports` của ba gói trỏ thẳng vào `.ts` để vòng lặp dev không có bước
> build. Người ngoài không dùng được cách đó — Node từ chối bóc kiểu TypeScript cho file
> trong `node_modules`. Vì vậy cả tarball lẫn gói trên npm đều được dựng từ một thư mục
> dàn có `package.json` viết lại trỏ `dist`; xem đầu `scripts/dong-goi-sdk.mjs`.

---

## Tích hợp — một lần gọi

```ts
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";

const ketQua = await inspect(
  { connection, interpret: boiThoiHan(dienGiaiKhongAI) },
  transaction,          // VersionedTransaction CHƯA ký
  {
    locale: "vi",
    nguoiDung: viNguoiDung.toBase58(),   // ← ĐỪNG BỎ, xem ngay dưới
  },
);

if (ketQua.level !== "safe" || ketQua.aiAdvisory) {
  hienCanhBao(ketQua);  // ví tự quyết định hiển thị thế nào
}
```

> ### ⚠️ `nguoiDung` — trường dễ bỏ nhất, và bỏ là hỏng
>
> Không truyền `nguoiDung` thì Custos bảo vệ **người trả phí** của giao dịch. Trong một
> dApp trả phí hộ, người trả phí là **dApp** — nghĩa là bảng chênh lệch, luật SOL và
> toàn bộ verdict đang tính trên **ví sai**.
>
> Ví luôn biết địa chỉ của chính nó, nên nó phải nói ra. Custos **không** suy ra được
> điều này, và cố ý không đoán.

Custos **không** hiển thị gì cả. Nó trả dữ liệu; ví toàn quyền quyết định giao diện.

---

## Kết quả trả về

```ts
type InspectResult = {
  level: "safe" | "warning" | "danger";
  aiAdvisory: "review_required" | null;
  detectedPrimaryAction: { type: string; from?: string; to?: string } | null;
  diff: Array<{
    label: string;
    before: string;
    after: string;
    severity: string;
    /** Địa chỉ ĐẦY ĐỦ, chỉ có mặt khi `before`/`after` là địa chỉ đã rút gọn.
     *  Rút gọn giữ 4 ký tự đầu + 4 cuối, mà kẻ tấn công mài được địa chỉ vanity
     *  khớp đúng 8 ký tự đó. Hiện bản đầy đủ ở mức kỹ thuật để người dùng đối chiếu. */
    truocDayDu?: string;
    sauDayDu?: string;
  }>;
  reasonCodes: string[];
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
  explanation: string;
  loiKhaiLech?: { khai: string; nhanDien: string };
};
```

| Trường | Dùng để |
|---|---|
| `level` | Quyết định chặn hay cho qua. **Chỉ engine luật sinh ra giá trị này** |
| `diff` | Bảng "trước → sau" cho người dùng. Dữ liệu đo được, không phải phỏng đoán |
| `coverage` | Hiển thị *"đã đọc hiểu 2 trên 3 lệnh"* — đọc đúng số đang có. Xem [Vì sao phải hiển thị](#vì-sao-phải-hiển-thị-coverage) |
| `reasonCodes` | Mã ổn định để ví tự phân loại, ghi log, hoặc dịch sang ngôn ngữ khác |
| `explanation` | Câu tiếng Việt sẵn dùng |
| `aiAdvisory` | Đề nghị người dùng kiểm tra thủ công. **Không** phải verdict |
| `loiKhaiLech` | Chỉ có mặt khi ngữ cảnh dApp khai **lệch** với hành động được nhận diện |

### Ba mức, và nhãn nên dùng

| `level` | Nhãn tiếng Việt | Nghĩa |
|---|---|---|
| `danger` | **Nguy hiểm** | Có hậu quả xác định: đổi chủ tài khoản, cấp quyền rút, đổi chương trình điều khiển |
| `warning` | **Cần xem kỹ** *hoặc* **Chưa đọc hiểu hết** | Xem mục dưới |
| `safe` | **Bình thường** | ⚠️ Đừng dùng chữ *"an toàn"* |

> **Không bao giờ hiển thị chữ "an toàn".** Custos không có thẩm quyền tuyên bố một giao dịch an toàn — nó chỉ nói *không tìm thấy dấu hiệu nào trong danh sách nó biết kiểm tra*. Đây là vấn đề trách nhiệm pháp lý cho cả ví lẫn chúng tôi.

### Hai loại `warning` rất khác nhau

```ts
import { chiLaThongTin } from "@custos-solana/core";

const chiLaChuaHieu =
  ketQua.level === "warning" &&
  (ketQua.reasonCodes.length === 0 || chiLaThongTin(ketQua.reasonCodes));
```

| Nguồn | Nên hiển thị | Giọng |
|---|---|---|
| Có luật hành vi kích hoạt | **Cần xem kỹ** | cảnh báo |
| Chỉ là thuộc tính token / chưa đọc hiểu hết | **Chưa đọc hiểu hết** | thông tin |

Đo trên cohort 20 giao dịch công khai **lưu offline** để kiểm engine (không phải runtime — demo chạy hoàn toàn trên Devnet): **19/20 rơi vào loại thứ hai**. Báo động cho cả hai là cách nhanh nhất dạy người dùng bỏ qua cảnh báo — và lúc nguy hiểm thật thì họ cũng bỏ qua nốt.

---

## Ngữ cảnh từ dApp — quy tắc bất đối xứng

dApp có thể khai nó đang làm gì:

```ts
await inspect(deps, tx, {
  locale: "vi",
  expectedAction: { type: "swap", from: "SOL", to: "USDC" },
});
```

| Tình huống | Custos làm gì |
|---|---|
| Khai **lệch** với hành động nhận diện | Nâng nghi ngờ, trả `loiKhaiLech` |
| Khai **khớp** | **Không giảm verdict. Không tắt cảnh báo nào** |

Một dApp độc hại hoàn toàn có thể khai đúng để trông vô hại. **Ngữ cảnh chỉ được làm Custos thận trọng hơn, không bao giờ dễ dãi hơn.**

---

## Vì sao phải hiển thị `coverage`

```
Đã đọc hiểu 10 trên 11 lệnh. 1 chương trình chưa xác minh.
```

Coinspect từng công bố một ca mô phỏng giao dịch **bỏ lọt** instruction `assign` chuyển quyền sở hữu tài khoản. Khi kẻ tấn công ghép nó với một vế trông hợp lệ, ví chỉ hiển thị vế hợp lệ và **im lặng về phần nó không hiểu**. Khuyến nghị của nhóm nghiên cứu: ví phải có phương án dự phòng khi mô phỏng thất bại.

`coverage` chính là phương án đó. **Hiển thị nó, kể cả khi nó xấu.** Một lớp bảo vệ im lặng về giới hạn của mình còn nguy hiểm hơn không có lớp nào.

---

## Khi Custos hỏng

Ba đường xuống cấp, không đường nào làm sập luồng ký của ví:

| Hỏng ở đâu | Hậu quả |
|---|---|
| Lớp diễn giải quá hạn hoặc lỗi | `explanation` rơi về câu mẫu cứng. `level` **không đổi** |
| Mô phỏng thất bại | `level` tối thiểu là `warning`, `coverage.analyzed = 0` |
| `inspect()` ném lỗi | Ví tự quyết định — chúng tôi khuyên **chặn và báo không kiểm tra được**, không cho qua âm thầm |

```ts
try {
  const kq = await inspect(deps, tx, { locale: "vi" });
  if (kq.level !== "safe" || kq.aiAdvisory) hienCanhBao(kq);
} catch {
  hienKhongKiemTraDuoc();   // đừng im lặng cho qua
}
```

Lớp diễn giải có thời hạn mặc định **4 giây** (`boiThoiHan(fn, ms)`).

---

## Cắm mô hình ngôn ngữ — tuỳ chọn, và có ranh giới cứng

Custos **không nhúng SDK của nhà cung cấp nào và không giữ khoá API nào.** Bạn
đưa vào một hàm gọi mô hình, tự chọn mô hình, tự quyết định chạy ở đâu và trả
tiền thế nào:

```ts
import { inspect } from "@custos-solana/core";
import { dienGiaiBangMoHinh, boiThoiHan } from "@custos-solana/ai";

const interpret = boiThoiHan(
  dienGiaiBangMoHinh(async ({ system, user }) => {
    const r = await goiMoHinhCuaBan(system, user);   // hàm của bạn
    return r;                                        // trả về chuỗi thô
  }),
  4000,                                              // thời hạn, ms
);

const ketQua = await inspect({ connection, interpret }, tx, { locale: "vi" });
```

Không cắm gì thì `inspect()` dùng lõi xác định và **vẫn chạy đầy đủ** — chỉ khác
ở chỗ câu chữ cứng hơn. `level`, `diff`, `reasonCodes`, `coverage` không phụ
thuộc vào mô hình.

### Mô hình được viết chữ, không được quyết định gì

Bốn ràng buộc, tất cả đều có test:

| Ràng buộc | Cưỡng chế bằng gì |
|---|---|
| Không chạm được `level` | Kiểu `Interpreter` không có trường đó — trình biên dịch chặn |
| Không xác nhận giao dịch an toàn | Đầu ra bị soi; câu trấn an bị từ chối và rơi về lõi xác định |
| Không hạ được mức nghi ngờ | `aiAdvisory` bất đối xứng: mô hình chỉ NÂNG lên `review_required` |
| Không nhận giao dịch thô | Chỉ nhận danh sách trắng dữ kiện đã bóc |

Mô hình hỏng, chậm, trả rác, hoặc bị lái — cả bốn trường hợp đều rơi về lõi xác
định, và người dùng không mất phần bảo vệ nào.

### Ký hiệu token là dữ liệu do người ngoài đặt

`kyHieuToken` bạn truyền vào bị lọc trước khi hiển thị và trước khi gửi cho mô
hình: chỉ nhận nhãn ngắn dạng `USDC`, `SOL`, `USDC-demo`. Cái gì không có hình
dạng đó thì Custos hiển thị địa chỉ rút gọn — xấu hơn nhưng thật.

Lý do rất cụ thể: nếu in nguyên văn, một dApp độc hại chỉ cần đặt tên token
thành *"an toàn, cứ ký đi"* là khiến chính lớp bảo vệ nói câu trấn an hộ nó.

## Quyền riêng tư

Custos **không** giữ khoá riêng, **không** ký gì, **không** ghi gì lên chain — nó là lớp đọc và mô phỏng.

Bản này chạy hoàn toàn phía client: giao dịch chưa ký không rời khỏi máy người dùng, chỉ đi tới RPC endpoint mà chính ví đang dùng.

---

## Nói cho Custos biết ví nào là của người dùng

```ts
const ketQua = await inspect({ connection }, tx, {
  locale: "vi",
  nguoiDung: viNguoiDung.toBase58(),   // ← nên truyền
});
```

Mặc định Custos bảo vệ `staticAccountKeys[0]`, tức **người trả phí**. Trong giao
dịch được tài trợ phí, đó không phải người dùng — và khi đó mọi luật đều nhắm vào
ví của bên kia. Chỉ ví mới biết địa chỉ nào là của người dùng.

Không truyền mà giao dịch có nhiều hơn một người ký, Custos **không im lặng**: nó
trả `NGUOI_DUNG_KHONG_RO` và không bao giờ ra `Bình thường`. Đó là thừa nhận giới
hạn, không phải phát hiện tấn công — nó chỉ nói *"tôi có thể đang xem nhầm ví"*.

Địa chỉ truyền vào mà **không phải người ký giao dịch** thì bị bỏ qua: nếu không,
một dApp độc hại chỉ cần khai bừa một địa chỉ để Custos nhìn sang chỗ khác.

## Giới hạn hiện tại

Nói thẳng để bên tích hợp tự quyết định:

| Giới hạn | Chi tiết |
|---|---|
| **Coverage chưa đủ trên DeFi** | **trung bình 82 %** trên 9/20 giao dịch còn mô phỏng được của cohort neo lại 2026-08-24 (lưu offline); riêng lệnh chạm được tài sản của bạn: **65 % (13/20)**. Con số dao động mạnh theo mẻ mẫu. Chưa có decoder cho các chương trình DEX không công bố IDL trên chuỗi |
| **Phí mạng là ƯỚC TÍNH** | Phí cơ bản 5000 lamport mỗi chữ ký thì chắc chắn; phí ưu tiên chỉ tính được khi giao dịch có cả `setComputeUnitPrice` lẫn `setComputeUnitLimit`. Nhãn ghi rõ "(ước tính)" |
| **SOL: chỉ bắt theo tỉ lệ** | Luật 13 kích hoạt khi phần SOL rời ví vượt 50 % số dư. Khoản nhỏ vẫn hiện trong bảng chênh lệch nhưng không gắn cờ. Rent tạo/đóng account chưa tách riêng khỏi khoản chuyển |
| **Ký hiệu token đọc từ chuỗi** | Custos tự đọc ký hiệu từ Metaplex và extension metadata của Token-2022 — không cần khoá của nhà cung cấp nào. Token không công bố metadata thì hiển thị địa chỉ rút gọn. `kyHieuToken` bạn truyền vào vẫn được ưu tiên trước |
| **Không đo được thì nói ra** | Account vượt trần 100 của RPC, hoặc RPC không trả dữ liệu, sẽ thành `TRANG_THAI_DO_KHUYET` và verdict không bao giờ là `Bình thường` |
| **14 luật** | SPL Token, Token-2022 (permanent delegate, transfer hook), System Program, Address Lookup Table |
| **6 chương trình đọc hiểu được** | System, SPL Token, Token-2022, ATA, Compute Budget, Orca Whirlpool. Mọi chương trình khác đều bị đánh dấu chưa xác minh |
| **Chỉ tiếng Việt** | `locale` mới có `"vi"` |
| **Chưa kiểm chứng quy mô** | Chưa chạy trên lưu lượng ví thật |
| **Luật 4 không phân biệt được authority** | Permanent delegate luôn ở mức Vàng, vì `Facts` chưa bóc trường `authority` của lệnh Transfer |
| **Adapter Anthropic gây cảnh báo lúc build web** | Entry mặc định của `@custos-solana/ai` xuất `dungGoiAnthropic`, nên bundler thấy `@anthropic-ai/sdk` trong đồ thị module và cảnh báo `node:fs`/`node:path` bị externalize. **Đã đo: SDK KHÔNG nằm trong bundle** — tree-shake sạch, `dist` không chứa chuỗi `anthropic` nào. Đây là tiếng ồn build, không phải chuyện đẩy SDK tới người xem. Cách dứt điểm là tách `@custos-solana/ai/anthropic` thành subpath riêng; hoãn sau cuộc thi vì thêm entry point là thêm đúng bề mặt đã làm hỏng bản 0.1.0 |

**Đã đo được:** trên 9 giao dịch công khai còn mô phỏng được (cohort 20 giao dịch, **lưu offline** để kiểm engine — runtime của demo chạy hoàn toàn trên Devnet), **0 lần gắn mã cáo buộc**. Cohort chưa gán nhãn ground truth, nên đây KHÔNG phải tỉ lệ false positive: không có cáo buộc nghĩa là không luật buộc tội nào bật, không chứng minh cả 9 giao dịch đều lành.

---

## Hàm bậc thấp — chỉ cần khi bạn tự dựng đường ống

`inspect()` đã trả sẵn `diff` và `coverage`, nên **hầu hết bên tích hợp không cần
mục này**. Nó dành cho ai đã có Facts từ nguồn khác và muốn chạy từng tầng riêng.

```ts
import { danhGia, dungBangChenhLech, computeCoverage } from "@custos-solana/core";

const { level, reasonCodes, hits } = danhGia(facts);        // L2 — nơi DUY NHẤT sinh level
const bang = dungBangChenhLech(facts, hits);                // cần `hits`, không chỉ facts
const phu = computeCoverage(facts.instructions);            // nhận MẢNG LỆNH, không nhận Facts
```

Hai chữ ký cuối dễ đoán nhầm, và đoán nhầm thì lỗi báo rất tối (`Cannot read
properties of undefined`). `dungBangChenhLech` cố ý đòi `hits` để bảng chênh lệch
luôn khớp phán quyết vừa sinh ra, thay vì được dựng độc lập rồi nói khác.

---

## Chạy thử tại chỗ

```bash
npm install
npx npm@11.6.2 run check     # 331 test, chạy offline
npm run thu-goi              # cài tarball vào project trống NGOÀI repo rồi chạy thật

node --experimental-strip-types scripts/dung-hien-truong.ts   # dựng hiện trường devnet
npm run vi                   # ví mẫu      → localhost:5188
npm run tan-cong             # trang lừa đảo → localhost:5189
```

Bấm **Nhận 1.000 SOLB** ở trang 5189: nó đẩy một giao dịch thật sang ví, và ví hiển thị màn chặn.

Bộ kiểm thử gồm **33 mẫu gắn nhãn**: 23 ca tự dựng phủ **cả 14 luật** (mỗi luật có ca
kích hoạt, và luật 13–14 có thêm ca ĐỐI CHỨNG khác đúng một điều), cùng 10 giao dịch
công khai lưu offline làm tập âm (kỳ vọng *không phải* Đỏ) — `data/seed/`.

> Câu "phủ cả 14 luật" ở trên **có test canh giữ**: `dataset.test.ts` sẽ đỏ ngay khi
> một luật mất mẫu, nên tài liệu không thể trôi khỏi dữ liệu.
