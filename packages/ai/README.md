# @custos/ai

Lớp diễn giải của [Custos](https://github.com/NeitLN/Custos-Solana): biến kết quả luật
thành câu tiếng Việt người thường đọc được.

```
npm i @custos/ai
```

## Điều gói này KHÔNG làm

**Nó không quyết định mức độ nguy hiểm.** `level` đến từ engine luật tất định trong
`@custos/core`; gói này không tạo và không sửa nó. Trường riêng của nó là `aiAdvisory`,
và giá trị duy nhất nó được phép đặt là `"review_required"` — yêu cầu người dùng tự
kiểm tra.

Ranh giới này là quyết định thiết kế, không phải giới hạn kỹ thuật. Một mô hình ngôn
ngữ có thể bị prompt injection từ tên token hoặc metadata trong chính giao dịch đang
xét. Nếu nó được phép hạ `danger` xuống `safe` thì kẻ tấn công chỉ cần đặt tên token
cho khéo.

## Dùng không cần mô hình

```ts
import { inspect } from "@custos/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos/ai";

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

MIT
