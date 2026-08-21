# Custos Core — tích hợp vào ví hoặc dApp Solana

Lớp phân tích giao dịch: mô phỏng giao dịch **trước khi người dùng ký**, chỉ ra những hậu quả **không thuộc về hành động chính**, và giải thích bằng tiếng Việt.

> **Devnet only.** Bản này chưa dùng cho mainnet — xem mục [Giới hạn hiện tại](#giới-hạn-hiện-tại) trước khi quyết định.

---

## Tích hợp — một lần gọi

```ts
import { inspect } from "@custos/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos/ai";

const ketQua = await inspect(
  { connection, interpret: boiThoiHan(dienGiaiKhongAI) },
  transaction,          // VersionedTransaction CHƯA ký
  { locale: "vi" },
);

if (ketQua.level !== "safe" || ketQua.aiAdvisory) {
  hienCanhBao(ketQua);  // ví tự quyết định hiển thị thế nào
}
```

Custos **không** hiển thị gì cả. Nó trả dữ liệu; ví toàn quyền quyết định giao diện.

---

## Kết quả trả về

```ts
type InspectResult = {
  level: "safe" | "warning" | "danger";
  aiAdvisory: "review_required" | null;
  detectedPrimaryAction: { type: string; from?: string; to?: string } | null;
  diff: Array<{ label: string; before: string; after: string; severity: string }>;
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
| `coverage` | Hiển thị *"đã đọc hiểu 10/11 lệnh"*. Xem [Vì sao phải hiển thị](#vì-sao-phải-hiển-thị-coverage) |
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
import { chiLaThongTin } from "@custos/core";

const chiLaChuaHieu =
  ketQua.level === "warning" &&
  (ketQua.reasonCodes.length === 0 || chiLaThongTin(ketQua.reasonCodes));
```

| Nguồn | Nên hiển thị | Giọng |
|---|---|---|
| Có luật hành vi kích hoạt | **Cần xem kỹ** | cảnh báo |
| Chỉ là thuộc tính token / chưa đọc hiểu hết | **Chưa đọc hiểu hết** | thông tin |

Đo trên 20 giao dịch mainnet ngẫu nhiên: **19/20 rơi vào loại thứ hai**. Báo động cho cả hai là cách nhanh nhất dạy người dùng bỏ qua cảnh báo — và lúc nguy hiểm thật thì họ cũng bỏ qua nốt.

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
import { inspect } from "@custos/core";
import { dienGiaiBangMoHinh, boiThoiHan } from "@custos/ai";

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

## Giới hạn hiện tại

Nói thẳng để bên tích hợp tự quyết định:

| Giới hạn | Chi tiết |
|---|---|
| **Coverage chưa đủ trên DeFi** | Đo trên 20 giao dịch mainnet ngẫu nhiên: **trung bình 46 %**. Chưa có decoder cho các chương trình DEX và aggregator. Riêng phần lệnh chạm được tài sản của bạn: **21 %** |
| **12 luật** | SPL Token, Token-2022 (permanent delegate, transfer hook), System Program, Address Lookup Table |
| **6 chương trình đọc hiểu được** | System, SPL Token, Token-2022, ATA, Compute Budget, Orca Whirlpool. Mọi chương trình khác đều bị đánh dấu chưa xác minh |
| **Chỉ tiếng Việt** | `locale` mới có `"vi"` |
| **Chưa kiểm chứng quy mô** | Chưa chạy trên lưu lượng ví thật |
| **Luật 4 không phân biệt được authority** | Permanent delegate luôn ở mức Vàng, vì `Facts` chưa bóc trường `authority` của lệnh Transfer |

**Đã đo được:** trên 10 giao dịch mainnet ngẫu nhiên, **0 lần gắn Đỏ**. Nhưng mẫu ngẫu nhiên không bảo đảm mọi mẫu đều lành tính — không có Đỏ nghĩa là không cờ nào bật, không chứng minh cả 10 cái đều sạch.

---

## Chạy thử tại chỗ

```bash
npm install
npm run check                # 138 test, chạy offline

node --experimental-strip-types scripts/dung-hien-truong.ts   # dựng hiện trường devnet
npm run vi                   # ví mẫu      → localhost:5188
npm run tan-cong             # trang lừa đảo → localhost:5189
```

Bấm **Nhận thưởng ngay** ở trang 5189: nó đẩy một giao dịch thật sang ví, và ví hiển thị màn chặn.

Bộ kiểm thử gồm **29 mẫu gắn nhãn** (19 tự dựng trên devnet, 10 giao dịch mainnet thật), phủ cả 12 luật — `data/seed/`.
