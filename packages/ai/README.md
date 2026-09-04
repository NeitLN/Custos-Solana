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
// Đường tường minh, khuyến nghị cho bên tích hợp mới:
import { dungGoiAnthropic } from "@custos-solana/ai/anthropic";

// Vẫn dùng được từ gốc — bản 0.1.2 đã phát hành nên đường này không bị bỏ:
import { dungGoiAnthropic } from "@custos-solana/ai";
```

`@anthropic-ai/sdk` là **optional peer dependency**, và adapter nạp nó bằng `await
import()` chứ không phải `import` ở đầu file. Hai điều đó cộng lại nghĩa là:

- cài `@custos-solana/ai` một mình vẫn chạy đủ đường tất định `dienGiaiKhongAI`;
- SDK không đi vào bundle trình duyệt của bên tích hợp.

Vế thứ hai được **đo** chứ không suy: bản build công khai ngày 04/09 nặng 654 KB và
không chứa chuỗi `anthropic` nào. Nếu ai đó đổi lời gọi động thành `import` tĩnh thì
build vẫn xanh và test vẫn xanh — chỉ có bản công khai nặng thêm, mang theo code của
một SDK gọi API có khoá. Nên có một bài kiểm canh đúng chỗ đó:
`packages/core/test/khongKeoSdk.test.ts`.

MIT
