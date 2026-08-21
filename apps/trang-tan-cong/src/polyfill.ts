import { Buffer } from "buffer";

/**
 * @solana/web3.js v1 cần `Buffer` toàn cục, trình duyệt không có sẵn.
 *
 * File này PHẢI là import đầu tiên của main.tsx và PHẢI đứng riêng.
 * Lý do: import trong ES module được hoist — nếu gán Buffer ngay trong main.tsx
 * thì App.tsx (kéo theo web3.js) đã chạy xong trước khi dòng gán được thực thi,
 * và trang trắng với lỗi "Buffer is not defined".
 *
 * Thân module chạy theo đúng thứ tự import, nên tách ra file riêng mới đúng.
 */
globalThis.Buffer ??= Buffer;
