/**
 * REPLAY RPC — adapter đọc fixture thay cho mạng. Thẻ TB-B02.
 *
 * Module dùng chung cho hai script tách rời:
 *
 *   · `capture-rpc.ts` — CHẠM MẠNG, chỉ chạy khi chủ động. Ghi lại từng response.
 *   · `chay-replay.ts` — KHÔNG chạm mạng. Đọc fixture, chạy qua `extractFacts` thật.
 *
 * Tách hai thứ đó là yêu cầu của thẻ, và lý do rất cụ thể: một runner vừa capture
 * vừa replay sẽ **âm thầm rơi về mạng** khi thiếu fixture, và lúc đó "chạy offline
 * vẫn tái lập được" trở thành một câu không ai kiểm được.
 *
 * ĐIỀU REPLAY NÀY **KHÔNG** LÀ, nói trước vì nó dễ bị đọc quá:
 *
 *   Nó **không** thực thi SVM. Nó phát lại **response đã ghi** của RPC — gồm cả kết
 *   quả `simulateTransaction`, tức kết quả một lần chạy SVM **trong quá khứ trên máy
 *   khác**. Nó chứng minh **L1 bóc tách đúng từ dữ liệu RPC**, không chứng minh
 *   Solana sẽ xử lý giao dịch đó như vậy hôm nay.
 *
 *   Muốn cái thứ hai thì phải chạy thật — TB-B07.
 */
import { readFileSync, existsSync } from "node:fs";
import type { Fixture } from "../replayFixture.ts";

/*
 * Phần adapter (khoá request, phát lại, ghi) nay nằm ở `scripts/replayFixture.ts` để ví
 * mẫu dùng ĐÚNG adapter này trong trình duyệt (CK-02). File này chỉ còn phần cần hệ
 * tệp; mọi nơi đang import từ đây vẫn chạy như cũ.
 */
export {
  khoaRequest,
  locNguon,
  ThieuFixture,
  connTuFixture,
  connGhi,
  deJson,
  hoiSinh,
  THAM_SO,
  type Method,
  type BanGhi,
  type Fixture,
} from "../replayFixture.ts";

export function docFixture(duong: string): Fixture {
  if (!existsSync(duong)) {
    throw new Error(`không có fixture ${duong} — chạy capture trước, hoặc mẫu này chưa hỗ trợ replay`);
  }
  return JSON.parse(readFileSync(duong, "utf8")) as Fixture;
}
