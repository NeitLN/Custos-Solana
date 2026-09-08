import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const THU_MUC = join(GOC, "data", "seed", "giu-lai");
const doc = (p: string) => readFileSync(p, "utf8");

/**
 * TẬP GIỮ LẠI PHẢI THẬT SỰ ĐƯỢC GIỮ LẠI.
 *
 * D02 đòi thiết kế tập giữ lại **trước khi** tuning. Quy tắc thì dễ viết; cái khó là
 * nó bị vi phạm bằng một thao tác trông vô hại: copy một mẫu sang `index.json` "để
 * chạy thử", rồi quên gỡ. Từ lúc đó tập giữ lại vẫn còn tên nhưng hết tác dụng, và
 * không có gì báo.
 *
 * Con số đáng tin nhất mà bài này bảo vệ là con số CHƯA CÓ: hiện thư mục trống, và
 * `docs/BENCHMARK.md` mục 2 nói thẳng vì sao — cả 38 mẫu hiện tại đều viết cùng lúc
 * hoặc sau luật, nên không mẫu nào đủ tư cách làm tập giữ lại.
 *
 * Bài này KHÔNG đòi thư mục có mẫu. Đòi vậy là ép người ta nhét đại vài mẫu vào cho
 * xanh — đúng thứ nó sinh ra để ngăn.
 */

function mauGiuLai(): Array<{ tep: string; id: unknown }> {
  if (!existsSync(THU_MUC)) return [];
  return readdirSync(THU_MUC)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ tep: f, id: (JSON.parse(doc(join(THU_MUC, f))) as { id?: unknown }).id }));
}

test("không `id` nào nằm ở CẢ tập giữ lại lẫn `index.json`", () => {
  const giu = mauGiuLai();
  if (giu.length === 0) return; // trống là trạng thái hợp lệ — xem README trong thư mục

  const idx = JSON.parse(doc(join(GOC, "data", "seed", "index.json"))) as {
    mau: Array<{ id: string }>;
  };
  const daCo = new Set(idx.mau.map((m) => m.id));
  const trung = giu.filter((g) => typeof g.id === "string" && daCo.has(g.id)).map((g) => g.tep);

  assert.deepEqual(
    trung,
    [],
    "Mẫu ở cả hai nơi thì không còn là tập giữ lại. Nếu đã nhìn kết quả của nó rồi " +
      "thì XOÁ khỏi `data/seed/giu-lai/` — đó là bước 4 trong `docs/BENCHMARK.md` " +
      "mục 2, và là bước hay bị bỏ nhất.",
  );
});

test("mẫu giữ lại có đủ trường để chạy được sau này", () => {
  // Một mẫu giữ lại thiếu `kyVong` là một mẫu không chấm được. Phát hiện lúc chốt
  // bản thì đã muộn — đó đúng là lúc duy nhất được phép chạy nó.
  const thieu: string[] = [];
  for (const { tep } of mauGiuLai()) {
    const m = JSON.parse(doc(join(THU_MUC, tep))) as Record<string, unknown>;
    for (const truong of ["id", "cuc", "nguonGoc", "kyVong", "bangChung"]) {
      if (m[truong] === undefined) thieu.push(`${tep} thiếu \`${truong}\``);
    }
  }
  assert.deepEqual(thieu, []);
});

test("README của tập giữ lại còn đó và còn nói vì sao nó trống", () => {
  /*
   * Thư mục trống không có README là một thư mục sẽ bị ai đó xoá vì tưởng là rác —
   * và cùng với nó là quy tắc bốn bước. Bài này giữ lời giải thích, không giữ thư mục.
   */
  const p = join(THU_MUC, "README.md");
  assert.ok(existsSync(p), "data/seed/giu-lai/README.md phải còn");
  assert.match(doc(p), /không hồi tố|hết là.*giữ lại/s);
});
