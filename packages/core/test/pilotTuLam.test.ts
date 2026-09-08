import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "../src/index.ts";
import * as ai from "../../ai/src/index.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const TAI_LIEU = "docs/PILOT-TU-LAM.md";
const doc = readFileSync(join(GOC, TAI_LIEU), "utf8");

/**
 * BỘ PILOT TỰ LÀM PHẢI CÒN CHẠY ĐƯỢC — B02.
 *
 * `docs/PILOT-TU-LAM.md` là thứ một đội ngoài đọc rồi tự làm theo, không hỏi ai. Nó
 * chứa một đoạn mã ba mươi dòng đã được chạy thật trên thư mục trống.
 *
 * Rủi ro: đổi tên một export trong `@custos-solana/*` thì mọi test trong repo vẫn
 * xanh — chúng import theo tên mới — trong khi tài liệu vẫn dạy tên cũ. Người ngoài
 * làm theo sẽ gặp `SyntaxError` ở dòng import, và đó là ấn tượng đầu tiên của họ về
 * sản phẩm.
 *
 * Bài này không chạy lại đoạn mã (cần mạng và một RPC). Nó kiểm điều rẻ hơn nhiều mà
 * bắt được đúng lỗi trên: mọi cái tên tài liệu bảo người ta `import` có thật sự tồn
 * tại không.
 */

/** Rút tên trong `import { a, b } from "x"` của mọi khối mã trong tài liệu. */
function tenDuocImport(tu: string): string[] {
  const ra: string[] = [];
  const re = new RegExp(String.raw`import\s*\{([^}]+)\}\s*from\s*"` + tu + '"', "g");
  for (const m of doc.matchAll(re)) {
    for (const t of (m[1] as string).split(",")) {
      const ten = t.trim().split(/\s+as\s+/)[0]?.trim();
      if (ten) ra.push(ten);
    }
  }
  return ra;
}

test("mọi export tài liệu pilot dạy `import` đều có thật", () => {
  const thieu: string[] = [];

  const tuCore = tenDuocImport("@custos-solana/core");
  assert.ok(tuCore.length > 0, `${TAI_LIEU}: không tìm thấy import nào từ core — mốc đã gãy`);
  for (const t of tuCore) if (!(t in core)) thieu.push(`@custos-solana/core: ${t}`);

  const tuAi = tenDuocImport("@custos-solana/ai");
  assert.ok(tuAi.length > 0, `${TAI_LIEU}: không tìm thấy import nào từ ai — mốc đã gãy`);
  for (const t of tuAi) if (!(t in ai)) thieu.push(`@custos-solana/ai: ${t}`);

  assert.deepEqual(
    thieu,
    [],
    `${TAI_LIEU} dạy người ngoài import những tên KHÔNG tồn tại.\n` +
      "Họ sẽ gặp lỗi ngay dòng import, và đó là ấn tượng đầu tiên về sản phẩm:\n" +
      thieu.join("\n"),
  );
});

test("bộ pilot nói rõ nó KHÔNG chứng minh có đối tác", () => {
  /*
   * Một bộ kit hoàn chỉnh rất dễ bị đọc thành "đã có người dùng". Roadmap B02 nói
   * thẳng: "Bộ kit hoàn tất không đồng nghĩa H03 có đối tác sử dụng."
   *
   * Câu đó phải nằm TRONG tài liệu, không chỉ trong roadmap — người ngoài đọc tài
   * liệu, không đọc roadmap của đội.
   */
  assert.match(doc, /doiTac.*null|`doiTac` vẫn `null`/s, "phải nói `doiTac` còn null");
  assert.match(
    doc,
    /không phải một pilot bên thứ ba|KHÔNG có nghĩa đã có đối tác/i,
    "phải nói rõ đội tự chạy không tính là pilot bên thứ ba",
  );
});

test("bộ pilot nói rõ ranh giới cưỡng chế: ví tin cậy, không phải dApp", () => {
  // Quyết định đã khoá, và là chỗ dễ bị hiểu ngược nhất khi bán hàng: Custos không
  // bảo vệ được người dùng khỏi một dApp không đi qua ví.
  assert.match(doc, /dApp độc hại không phải nơi cưỡng chế bảo vệ/i);
  assert.match(doc, /chỉ Devnet|chỉ.*Devnet/i, "phải nhắc runtime hiện chỉ Devnet");
});
