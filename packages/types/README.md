# @custos-solana/types

Kiểu dữ liệu dùng chung của [Custos](https://github.com/NeitLN/Custos-Solana) — SDK
phân tích giao dịch Solana trước khi người dùng ký.

Gói này **không có logic**. Nó tồn tại để `@custos-solana/core` và `@custos-solana/ai` không phụ
thuộc vòng vào nhau, và để bên tích hợp gõ đúng kiểu mà không phải cài cả hai.

```
npm i @custos-solana/types
```

## Giao kèo

```ts
type InspectResult = {
  level: "safe" | "warning" | "danger";        // CHỈ engine luật tạo ra
  aiAdvisory: "review_required" | null;         // CHỈ lớp diễn giải tạo ra
  detectedPrimaryAction: { type: string; from?: string; to?: string } | null;
  diff: Array<{ label: string; before: string; after: string; severity: string }>;
  reasonCodes: string[];
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
  explanation: string;
};
```

**Ranh giới quan trọng nhất trong cả SDK:** `level` do luật tất định quyết định, mô
hình ngôn ngữ không bao giờ tạo và không bao giờ sửa nó. AI chỉ được yêu cầu kiểm tra
thủ công qua `aiAdvisory` — nó không có thẩm quyền tuyên bố một giao dịch an toàn,
cũng không có thẩm quyền kết luận một giao dịch nguy hiểm.

Tài liệu tích hợp đầy đủ: [`@custos-solana/core`](https://www.npmjs.com/package/@custos-solana/core).

MIT
