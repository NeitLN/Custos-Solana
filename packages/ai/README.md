# @custos-solana/ai

Lớp diễn giải của [Custos](https://github.com/NeitLN/Custos-Solana): biến kết quả luật
thành câu tiếng Việt người thường đọc được.

```
npm i @custos-solana/ai
```

## Điều gói này KHÔNG làm

**Nó không quyết định mức độ nguy hiểm.** `level` đến từ engine luật tất định trong
`@custos-solana/core`; gói này không tạo và không sửa nó. Trường riêng của nó là `aiAdvisory`,
và giá trị duy nhất nó được phép đặt là `"review_required"` — yêu cầu người dùng tự
kiểm tra.

Ranh giới này là quyết định thiết kế, không phải giới hạn kỹ thuật. Một mô hình ngôn
ngữ có thể bị prompt injection từ tên token hoặc metadata trong chính giao dịch đang
xét. Nếu nó được phép hạ `danger` xuống `safe` thì kẻ tấn công chỉ cần đặt tên token
cho khéo.

## Dùng không cần mô hình

```ts
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";

const kq = await inspect(
  { connection, interpret: boiThoiHan(dienGiaiKhongAI) },
  tx,
  { locale: "vi", nguoiDung: viNguoiDung.toBase58() },
);
```

`dienGiaiKhongAI` chạy hoàn toàn bằng mẫu câu — không gọi mạng, không tốn token, và
mọi mã lý do đều có sẵn một câu tiếng Việt. `boiThoiHan` bọc thêm thời hạn: quá hạn
thì trả câu dự phòng thay vì để người dùng ngồi nhìn màn hình ký.

Cắm mô hình thật thì thay `dienGiaiKhongAI` bằng interpreter của bạn. Giao diện là
một hàm, nên bên tích hợp tự chọn nhà cung cấp.

## Adapter Anthropic — và vì sao nó không làm gói này nặng thêm

```ts
// ĐƯỜNG DUY NHẤT kể từ 0.2.0 — subpath, chạy ở môi trường Node:
import { dungGoiAnthropic } from "@custos-solana/ai/anthropic";
```

> **Breaking change ở 0.2.0.** Bản 0.1.2 cho phép `import { dungGoiAnthropic } from
> "@custos-solana/ai"`. Đường đó đã bỏ.
>
> **Vì sao đáng phá:** entry mặc định re-export adapter, nên mọi bundler trình duyệt
> phải đi vào đồ thị của `@anthropic-ai/sdk` để biết nó không cần — Vite in ra hàng
> loạt cảnh báo `Module "node:fs" has been externalized`. Bundle cuối không chứa SDK
> (đã kiểm bằng grep), nhưng một gói bảo mật không nên bắt người dùng tự chứng minh
> điều đó. Sau khi tách: **0 cảnh báo**.
>
> **Cách chuyển:** đổi một dòng import sang subpath. Không có API nào khác đổi.

`@anthropic-ai/sdk` là **optional peer dependency**, và adapter nạp nó bằng `await
import()` chứ không phải `import` ở đầu file. Hai điều đó cộng lại nghĩa là:

- cài `@custos-solana/ai` một mình vẫn chạy đủ đường tất định `dienGiaiKhongAI`;
- SDK không đi vào bundle trình duyệt của bên tích hợp.

Vế thứ hai được **đo** chứ không suy: bản build công khai ngày 04/09 nặng 654 KB và
không chứa chuỗi `anthropic` nào. Nếu ai đó đổi lời gọi động thành `import` tĩnh thì
build vẫn xanh và test vẫn xanh — chỉ có bản công khai nặng thêm, mang theo code của
một SDK gọi API có khoá. Nên có một bài kiểm canh đúng chỗ đó:
`packages/core/test/khongKeoSdk.test.ts`.

## Phiên bản — đọc trước khi cài

| Bản | Có neo grounding? | Ghi chú |
|---|---|---|
| `0.1.2` | **KHÔNG** | Đã lên registry TRƯỚC khi bản vá được thêm. Mô hình chèn được địa chỉ ví bịa vào lời giải thích. **Đừng dùng.** |
| `0.2.0` | Có | **CHƯA phát hành lên npm** tại thời điểm viết. Có trong source và
tarball dựng từ `scripts/dong-goi-sdk.mjs`. |

Version npm là bất biến, nên `0.1.2` không sửa đè được — chỉ phát hành bản mới.

> ⚠️ **Nghĩa là hôm nay `npm install @custos-solana/ai` vẫn lấy về `0.1.2`, bản
> thiếu neo grounding.** Muốn bản có vá thì cài từ tarball tự dựng, hoặc đợi
> `0.1.3` được phát hành. Dòng này phải được sửa NGAY khi publish xong.

**Hai mức xác minh khác nhau, đừng lẫn:**

- *Đã kiểm tarball local* — gói `npm pack` từ source hiện tại đã được cài vào một
  project ngoài monorepo và chạy thật. `npm run thu-goi` làm việc này.
- *Đã kiểm registry* — bản trên npm đã được tải về và soi. Chỉ nói được câu này
  **sau khi** bản mới thực sự lên registry.

Chính khoảng cách giữa hai mức đó sinh ra sự cố `0.1.2`: source đúng, tarball local
đúng, mọi test xanh — và bản trên registry thì không. `scripts/dong-goi-sdk.mjs` nay
từ chối đóng gói hoặc publish nếu artifact thiếu dấu ấn bản vá.

MIT
