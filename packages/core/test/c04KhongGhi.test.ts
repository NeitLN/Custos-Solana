import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * T03 — MỘT BỘ KIỂM KHÔNG ĐƯỢC LÀM THAY ĐỔI BẰNG CHỨNG NÓ ĐANG KIỂM.
 *
 * `eval-ai.ts` có `await main()` ở cấp module và ghi `data/eval/ai-ket-qua.json`.
 * `soChoPhep.test.ts` import hai hàm thuần từ đó, nên mỗi lượt `npm run check` lại
 * chạy cả bộ eval và ghi đè artifact. Đo được bằng hash trước/sau.
 *
 * Hậu quả không nằm ở trường `doLuc`. Nó nằm ở chỗ: sau đó không ai phân biệt được
 * "artifact đổi vì code đổi" với "artifact đổi vì vừa chạy test", và cổng
 * `kiem-san-pham` canh cây làm việc sạch sẽ đỏ vĩnh viễn — tức là bị tắt.
 *
 * Bài này canh cho bản sửa không bị hoàn tác. Nó KHÔNG thay cho phép nghiệm thu
 * thật (so hash quanh `npm run check`); nó chặn đường quay lại của nguyên nhân.
 */

test("module thuần KHÔNG chứa lệnh chạy ở cấp module", () => {
  /*
   * Cách hỏng có thật, không phải giả định: ai đó thêm một dòng `await main()` hay
   * một lệnh ghi file vào module thuần, và T03 quay lại y nguyên — lần này im lặng
   * hơn, vì tên file nói rằng nó thuần.
   */
  /*
   * QUÉT MÃ, KHÔNG QUÉT CHÚ THÍCH.
   *
   * Bản đầu của bài này quét cả file và đỏ ngay — vì chính dòng chú thích ghi quy
   * tắc *"không `process.exit`"* chứa chuỗi bị cấm. Đây là lần thứ tư trong repo
   * một phép kiểm theo chuỗi không phân biệt được "dùng X" với "cấm X"; hai lần
   * trước ở guard ngày và guard V01.
   *
   * Bỏ chú thích trước khi quét là cách rẻ nhất phân biệt được hai thứ đó.
   */
  const ma = doc("scripts/eval-ai-so.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  /*
   * `await` hoặc một lời gọi ở cột 0 = có thứ gì đó đang CHẠY lúc import.
   *
   * Bản đầu dùng `[a-zA-Z_$][\w$]*\(` và KHÔNG bắt được `console.log(soLa);` — vì
   * `console.log` có dấu chấm. Chỉ phép kiểm phủ định mới lộ: tôi thêm đúng dòng đó
   * vào module thuần và bài vẫn xanh. Một guard xanh trước thứ nó sinh ra để chặn
   * thì tệ hơn không có guard, vì nó tạo cảm giác đã được canh.
   *
   * Nay nhận cả lời gọi qua thuộc tính (`a.b.c(...)`).
   */
  const dongChay = ma
    .split("\n")
    .filter((d) => /^(await |[a-zA-Z_$][\w$]*(\.[\w$]+)*\s*\()/.test(d) && !d.startsWith("import"));
  assert.deepEqual(dongChay, [], `module thuần có lệnh chạy ở cấp module:\n${dongChay.join("\n")}`);

  for (const cam of ["writeFileSync", "mkdirSync", "process.exit", "fetch(", "node:fs"]) {
    assert.ok(!ma.includes(cam), `module thuần không được dùng \`${cam}\``);
  }
});

test("test import hàm thuần từ module thuần, KHÔNG từ entrypoint có side effect", () => {
  /*
   * Đây là bài quan trọng nhất của file. Bản sửa T03 nằm ở đúng một dòng import;
   * đổi nó về `eval-ai.ts` là lỗi quay lại toàn bộ, và không kiểm nào khác bắt được
   * vì kết quả test vẫn xanh — artifact bị bẩn thì test đâu có đọc nó.
   */
  const s = doc("packages/core/test/soChoPhep.test.ts");
  assert.match(s, /from "\.\.\/\.\.\/\.\.\/scripts\/eval-ai-so\.ts"/);
  assert.doesNotMatch(
    s,
    /from "\.\.\/\.\.\/\.\.\/scripts\/eval-ai\.ts"/,
    "import từ `eval-ai.ts` kéo theo `await main()` — đó chính là T03",
  );
});

test("entrypoint eval-ai.ts VẪN chạy được như một lệnh", () => {
  /*
   * Nửa còn lại của thẻ: sửa side effect mà làm hỏng luôn công cụ thì không phải sửa.
   * `npm run eval-ai` phải còn nguyên, và `main()` vẫn phải được gọi ở đó.
   */
  const s = doc("scripts/eval-ai.ts");
  assert.match(s, /^await main\(\);$/m, "entrypoint phải còn gọi main()");

  const pkg = JSON.parse(doc("package.json")) as { scripts?: Record<string, string> };
  assert.match(pkg.scripts?.["eval-ai"] ?? "", /scripts\/eval-ai\.ts/);
});

test("artifact eval không bị ghi bởi chính lượt test này", () => {
  /*
   * Phép đo trực tiếp, trong cùng tiến trình đang chạy test: nếu một bài nào đó
   * trong `npm run check` ghi artifact, thời điểm sửa đổi của file sẽ mới hơn lúc
   * tiến trình test bắt đầu.
   *
   * GIỚI HẠN, nói trước: bài này chỉ thấy được lần ghi xảy ra TRƯỚC nó trong cùng
   * lượt. Nghiệm thu đầy đủ vẫn là so hash quanh cả `npm run check` — đã chạy tay
   * và ghi ở TIEN-DO.
   */
  const f = join(GOC, "data/eval/ai-ket-qua.json");
  const sua = statSync(f).mtimeMs;
  const batDau = Date.now() - process.uptime() * 1000;
  assert.ok(
    sua < batDau,
    `artifact bị ghi trong lúc chạy test (sửa lúc ${new Date(sua).toISOString()}, ` +
      `tiến trình bắt đầu ${new Date(batDau).toISOString()})`,
  );
});
