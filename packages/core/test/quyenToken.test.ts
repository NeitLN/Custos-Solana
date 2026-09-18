import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tomTatQuyen } from "../src/quyen-token.ts";
import { giaiDongBangFacts } from "../src/facts-io.ts";
import type { Facts } from "../src/facts.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));

function factsThat(): Facts {
  const idx = JSON.parse(readFileSync(GOC + "data/seed/index.json", "utf8")) as {
    mau: Array<Record<string, unknown>>;
  };
  const m = idx.mau.find((x) => typeof x["facts"] === "string");
  assert.ok(m, "corpus không có mẫu nào kèm facts");
  return giaiDongBangFacts(readFileSync(GOC + "data/seed/" + m["facts"], "utf8"));
}

const banSao = (f: Facts): Facts =>
  giaiDongBangFacts(JSON.stringify(JSON.parse(JSON.stringify(f, (_, v) => (typeof v === "bigint" ? `${v}n` : v)))));

test("CU-15 · quyền CÓ SẴN không bị trình bày là MỚI CẤP", () => {
  /*
   * Ranh giới quan trọng nhất của thẻ, và là cặp câu dễ trộn nhất:
   *
   *   "Token này có permanent delegate"        — mô tả một token
   *   "Giao dịch này vừa trao permanent delegate" — tố cáo một hành vi
   *
   * Trộn chúng là buộc tội sai, và là cách nhanh nhất tạo false positive vì
   * Token-2022 extension là năng lực hợp lệ (docs/CUSTOS.md mục 06).
   */
  const f = banSao(factsThat());
  f.mints[0]!.permanentDelegate = "DelegateCoSanTuTruoc111111111111111111111111";

  const r = tomTatQuyen(f);
  const pd = r.quyen.find((q) => q.loai === "permanentDelegate");
  assert.ok(pd, "không đọc ra permanent delegate");
  assert.equal(pd.moiTrongGiaoDich, false, "quyền đọc ở mint bị coi là mới cấp");
  assert.match(pd.cau, /có sẵn/, `câu tố cáo một hành vi không xảy ra: ${pd.cau}`);
  assert.ok(!/TRAO/.test(pd.cau), `câu nói giao dịch này trao quyền: ${pd.cau}`);
});

test("CU-15 · quyền ĐỔI TRONG giao dịch được nói rõ là MỚI — ĐỐI CHỨNG", () => {
  /*
   * ĐỐI CHỨNG cho bài trên. Nếu mọi quyền đều bị ghi "có sẵn" thì bài kia vẫn
   * xanh, trong khi sản phẩm mất hẳn khả năng cảnh báo việc trao quyền thật.
   */
  const f = banSao(factsThat());
  const t = f.tokenAccounts[0]!;
  t.delegateBefore = null;
  t.delegateAfter = "KeTanCong1111111111111111111111111111111111";

  const r = tomTatQuyen(f);
  const d = r.quyen.find((q) => q.loai === "delegate" && q.doiTuong === t.address);
  assert.ok(d, "không đọc ra delegate mới");
  assert.equal(d.moiTrongGiaoDich, true, "giao dịch trao quyền mà không báo là mới");
  assert.match(d.cau, /TRAO/, `câu không nói rõ giao dịch này trao quyền: ${d.cau}`);
});

test("CU-15 · BỎ quyền cũng là thay đổi, và nói đúng là BỎ", () => {
  const f = banSao(factsThat());
  const t = f.tokenAccounts[0]!;
  t.delegateBefore = "AiDoCu11111111111111111111111111111111111111";
  t.delegateAfter = null;

  const r = tomTatQuyen(f);
  const d = r.quyen.find((q) => q.loai === "delegate" && q.doiTuong === t.address);
  assert.ok(d);
  assert.equal(d.moiTrongGiaoDich, true);
  assert.match(d.cau, /BỎ/, `câu không nói rõ là bỏ quyền: ${d.cau}`);
});

test("CU-15 · quyền KHÔNG đổi thì không bị báo là đổi", () => {
  const f = banSao(factsThat());
  const t = f.tokenAccounts[0]!;
  t.delegateBefore = "GiuNguyen111111111111111111111111111111111111";
  t.delegateAfter = "GiuNguyen111111111111111111111111111111111111";

  const r = tomTatQuyen(f);
  const d = r.quyen.find((q) => q.loai === "delegate" && q.doiTuong === t.address);
  assert.ok(d);
  assert.equal(d.moiTrongGiaoDich, false, "quyền không đổi mà báo là mới");
});

test("CU-15 · mỗi dòng ghi rõ NGUỒN dữ kiện: mint hay token account", () => {
  /*
   * Thẻ đòi: *"dữ kiện đọc ở mint hay account"*. Người đọc cần biết con số đến từ
   * đâu để tự kiểm chứng được — và hai nguồn nói hai mức độ khác nhau.
   */
  const f = banSao(factsThat());
  f.mints[0]!.permanentDelegate = "X1111111111111111111111111111111111111111111";
  f.tokenAccounts[0]!.delegateAfter = "Y1111111111111111111111111111111111111111111";

  const r = tomTatQuyen(f);
  assert.ok(r.quyen.length >= 2);
  for (const q of r.quyen) {
    assert.ok(q.nguon === "mint" || q.nguon === "tokenAccount", `nguồn lạ: ${q.nguon}`);
    assert.match(q.cau, /đọc ở/, `câu không ghi nguồn: ${q.cau}`);
  }
  assert.equal(r.quyen.find((q) => q.loai === "permanentDelegate")?.nguon, "mint");
  assert.equal(r.quyen.find((q) => q.loai === "delegate")?.nguon, "tokenAccount");
});

test("CU-15 · hook CHƯA đọc hiểu ⇒ độ đầy đủ KHUYẾT, không phải 'không có hậu quả'", () => {
  /*
   * Thẻ đòi đích danh: *"thiếu hook invocation data phải làm giảm độ đầy đủ được
   * công bố, không diễn giải như không có hậu quả"*.
   */
  const f = banSao(factsThat());
  f.mints[0]!.transferHookProgramId = "HookLaChuaDocHieu111111111111111111111111111";
  // Không có lệnh nào của program đó trong giao dịch ⇒ chưa quan sát được gì.

  const r = tomTatQuyen(f);
  assert.equal(r.doDayDu, "khuyet", "hook chưa đọc hiểu mà vẫn công bố đầy đủ");
  assert.ok(r.hookChuaDocHieu.includes("HookLaChuaDocHieu111111111111111111111111111"));
});

test("CU-15 · hook CÓ lệnh quan sát được ⇒ đầy đủ — ĐỐI CHỨNG", () => {
  /*
   * Bài trên cũng xanh nếu `doDayDu` luôn là `khuyet` — và lúc đó nhãn vô dụng.
   */
  const f = banSao(factsThat());
  const hook = "HookCoQuanSat11111111111111111111111111111111";
  f.mints[0]!.transferHookProgramId = hook;
  f.instructions.push({ ...f.instructions[0]!, index: f.instructions.length, programId: hook });

  const r = tomTatQuyen(f);
  assert.equal(r.doDayDu, "day_du", "hook quan sát được mà vẫn báo khuyết");
  assert.deepEqual(r.hookChuaDocHieu, []);
});

test("CU-15 · KHÔNG có blacklist suy từ TÊN program — đọc mã", () => {
  /*
   * Thẻ cấm đích danh. Một program tên "SafeHook" không đảm bảo gì, và một tên lạ
   * không chứng minh gì. Bỏ chú thích trước khi tìm — chú thích CÓ nhắc các tên này.
   */
  const ma = readFileSync(fileURLToPath(new URL("../src/quyen-token.ts", import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  for (const cam of ["blacklist", "danhSachDen", "SafeHook", "scam", "lua", "includes(\"", "startsWith(\""]) {
    assert.ok(!ma.includes(cam), `quyen-token.ts có \`${cam}\` — nghi là suy từ tên program`);
  }
});

test("CU-15 · file này KHÔNG sinh verdict và KHÔNG chạm mạng", () => {
  /*
   * Một extension hợp lệ tồn tại KHÔNG tự đủ để nâng thành danger — thẻ nói vậy,
   * và L2 mới là nơi quyết định. File này chỉ trình bày.
   */
  const ma = readFileSync(fileURLToPath(new URL("../src/quyen-token.ts", import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  for (const cam of ['"danger"', '"warning"', '"safe"', "Connection", "fetch(", "await ", "reasonCode"]) {
    assert.ok(!ma.includes(cam), `quyen-token.ts có \`${cam}\``);
  }

  const f = banSao(factsThat());
  f.mints[0]!.permanentDelegate = "X1111111111111111111111111111111111111111111";
  const r = tomTatQuyen(f) as unknown as Record<string, unknown>;
  assert.ok(!("level" in r), "tóm tắt quyền sinh ra `level`");
});

test("CU-15 · chạy trên TOÀN corpus không ném, và không bịa quyền", () => {
  const idx = JSON.parse(readFileSync(GOC + "data/seed/index.json", "utf8")) as {
    mau: Array<Record<string, unknown>>;
  };
  const coFacts = idx.mau.filter((m) => typeof m["facts"] === "string");
  assert.ok(coFacts.length >= 5, `chỉ ${coFacts.length} mẫu có facts`);

  for (const m of coFacts) {
    const f = giaiDongBangFacts(readFileSync(GOC + "data/seed/" + m["facts"], "utf8"));
    const r = tomTatQuyen(f);
    for (const q of r.quyen) {
      // Mọi quyền nêu ra phải trỏ tới một đối tượng CÓ THẬT trong Facts.
      const co =
        f.mints.some((x) => x.address === q.doiTuong) ||
        f.tokenAccounts.some((x) => x.address === q.doiTuong);
      assert.ok(co, `${m["id"]}: quyền trỏ tới ${q.doiTuong} không có trong Facts`);
    }
  }
});
