import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { LUAT } from "../src/l2/rules.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const NGUON = "data/seed/index.json";
const MANIFEST = "data/benchmark/manifest.json";

/**
 * CU-24 — CORPUS PHẢI TỰ MÔ TẢ ĐÚNG CHÍNH NÓ.
 *
 * ## Lỗi đã tìm ra, và nó tồn tại im lặng
 *
 * Bảy fixture đối chứng — `R03-neg`, `R05-neg`, `R06-neg`, `R07-neg`, `R09-neg`,
 * `R10-neg`, `R11-neg` — bị gán `cuc: "duong"` trong `data/seed/index.json`, giống
 * hệt ca dương.
 *
 * Hai trường trong CÙNG MỘT bản ghi mâu thuẫn nhau: `kyVong.khongCoMa` nói rõ đây là
 * đối chứng (kỳ vọng KHÔNG có mã nào), còn `cuc` nói đây là ca dương.
 *
 * Hậu quả không phải test đỏ — mọi test vẫn xanh, vì chúng đọc `kyVong` chứ không đọc
 * `cuc`. Hậu quả là **manifest nói dối về cấu tạo corpus**: đếm theo `cuc` cho ra
 * *"7 luật không có ca đối chứng"* trong khi cả 7 đều có.
 *
 * Một corpus mô tả sai chính nó là một corpus không dùng được để chứng minh gì.
 * `CLAUDE.md` nói: *"Một luật chưa có ca nguy hiểm + ca an toàn tương tự thì chưa
 * tính là xong"* — và câu đó chỉ kiểm được nếu nhãn đúng.
 */

type Mau = {
  id: string;
  luat?: number | null;
  cuc: string;
  kyVong?: { coMa?: string[]; khongCoMa?: string[] };
};

function mauNguon(): Mau[] {
  const s = JSON.parse(doc(NGUON)) as Mau[] | { mau?: Mau[]; samples?: Mau[] };
  return Array.isArray(s) ? s : (s.mau ?? s.samples ?? []);
}

/** Đối chứng = kỳ vọng KHÔNG có mã nào, và không kỳ vọng có mã nào. */
function laDoiChung(m: Mau): boolean {
  return (m.kyVong?.khongCoMa ?? []).length > 0 && (m.kyVong?.coMa ?? []).length === 0;
}

test("CU-24 · `cuc` KHỚP `kyVong` — hai trường không được nói ngược nhau", () => {
  /*
   * BÀI QUAN TRỌNG NHẤT, và là bài đã bắt được lỗi thật.
   *
   * `kyVong` là thứ test đọc; `cuc` là thứ manifest đếm. Khi chúng lệch nhau, test
   * vẫn xanh còn manifest nói sai — và không ai thấy, vì không ai đối chiếu.
   */
  const lech: string[] = [];
  for (const m of mauNguon()) {
    const doiChung = laDoiChung(m);
    if (doiChung && m.cuc !== "am") lech.push(`${m.id}: kỳ vọng không mã nhưng cuc="${m.cuc}"`);
    if (!doiChung && m.cuc === "am") lech.push(`${m.id}: cuc="am" nhưng kỳ vọng CÓ mã`);
  }
  assert.deepEqual(lech, [], "`cuc` và `kyVong` mâu thuẫn — corpus mô tả sai chính nó");
});

test("CU-24 · MỌI luật có cả ca dương lẫn ca đối chứng", () => {
  /*
   * `CLAUDE.md`: *"Một luật chưa có ca nguy hiểm + ca an toàn tương tự thì chưa tính
   * là xong."*
   *
   * Đếm theo `cuc` — và câu này chỉ có nghĩa sau khi bài trên đảm bảo `cuc` đúng.
   * Đó là lý do hai bài phải đi cùng nhau.
   */
  const theo = new Map<number, { duong: number; am: number }>();
  for (const m of mauNguon()) {
    if (m.luat == null) continue;
    const t = theo.get(m.luat) ?? { duong: 0, am: 0 };
    if (m.cuc === "duong") t.duong++;
    if (m.cuc === "am") t.am++;
    theo.set(m.luat, t);
  }

  const thieu: string[] = [];
  for (const [luat, t] of [...theo].sort((a, b) => a[0] - b[0])) {
    if (!t.duong) thieu.push(`luật ${luat}: thiếu ca DƯƠNG`);
    if (!t.am) thieu.push(`luật ${luat}: thiếu ca ĐỐI CHỨNG`);
  }
  assert.deepEqual(thieu, []);
  assert.equal(theo.size, LUAT.length, `corpus phủ ${theo.size}/${LUAT.length} luật`);
});

test("CU-24 · manifest SINH ra khớp nguồn, không trôi khỏi nhau", () => {
  /*
   * Manifest chép `cuc` từ nguồn. Nếu ai sửa nguồn mà không sinh lại manifest, hai
   * file nói hai điều — và `npm run manifest-benchmark` là bước dễ quên nhất.
   */
  if (!existsSync(join(GOC, MANIFEST))) return;
  const mf = JSON.parse(doc(MANIFEST)) as { mau: Mau[] };
  const nguon = new Map(mauNguon().map((m) => [m.id, m.cuc]));

  const lech: string[] = [];
  for (const m of mf.mau) {
    const c = nguon.get(m.id);
    if (c === undefined) lech.push(`${m.id}: có trong manifest, không có trong nguồn`);
    else if (c !== m.cuc) lech.push(`${m.id}: nguồn="${c}" manifest="${m.cuc}"`);
  }
  assert.deepEqual(lech, [], "manifest trôi khỏi nguồn — chạy `npm run manifest-benchmark`");
});

test("CU-24 · phép kiểm ĐỎ ĐƯỢC — đối chứng cho hai bài trên", () => {
  /*
   * Ba bài trên đều là `deepEqual(…, [])`. Chúng cũng xanh nếu vòng lặp không chạy
   * lần nào, hoặc nếu `laDoiChung` luôn trả cùng một giá trị.
   *
   * Bài này dựng đúng thứ chúng phải bắt.
   */
  const bia: Mau = { id: "BIA", cuc: "duong", kyVong: { khongCoMa: ["X"] } };
  assert.equal(laDoiChung(bia), true, "nhận diện đối chứng hỏng");
  assert.notEqual(bia.cuc, "am", "tiền đề: đây là ca lệch");

  const dung: Mau = { id: "DUNG", cuc: "duong", kyVong: { coMa: ["X"] } };
  assert.equal(laDoiChung(dung), false, "ca dương bị nhận nhầm thành đối chứng");

  // Và corpus thật phải có cả hai loại — nếu chỉ có một loại thì phép so vô nghĩa.
  const ds = mauNguon();
  assert.ok(ds.some(laDoiChung), "corpus không có ca đối chứng nào");
  assert.ok(ds.some((m) => !laDoiChung(m)), "corpus không có ca dương nào");
});
