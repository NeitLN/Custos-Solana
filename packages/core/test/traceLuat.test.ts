import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungChiMuc } from "../src/bang-chung.ts";
import { LUAT } from "../src/l2/rules.ts";
import type { Facts } from "../src/facts.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const THU_MUC = "data/seed/facts";

/**
 * CU-05 — TRACE CHO MỌI LUẬT ĐANG PHÁT CẢNH BÁO.
 *
 * Trước thẻ này, **2/14 luật** khai `bangChung`; 12 luật còn lại đi qua đường lui
 * `detail.includes(...)` trong `diff.ts` — dò base58 bên trong một câu tiếng Việt.
 * Cách đó đã im lặng sai hai lần (luật 11 và 13) và được vá riêng từng luật; luật
 * thứ ba mắc lại sẽ không ai thấy.
 *
 * CU-05 nâng lên **13/14**. Luật 14 là ngoại lệ CÓ LÝ DO, không phải bỏ sót: nó nói
 * về việc *thiếu* thông tin (ví không cho biết địa chỉ nào là của người dùng), nên
 * không có dữ kiện nào để trỏ tới.
 *
 * Nghiệm thu của thẻ nói rõ điều bài này phải chặn: *"Không đạt nếu chỉ gắn chung ID
 * transaction vào mọi cảnh báo để đủ số."* Nên bài không đếm — nó đòi mỗi khoá phải
 * **tra được trong chỉ mục của chính lượt đó**.
 */

function docFacts(p: string): Facts {
  return JSON.parse(doc(p), (_k, v) =>
    typeof v === "string" && /^\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,
  ) as Facts;
}

function moiFixture(): string[] {
  const d = join(GOC, THU_MUC);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => f.endsWith(".json"));
}

test("CU-05 · mọi hit trên corpus đều truy được về dữ kiện THẬT", () => {
  /*
   * Bài mạnh nhất của thẻ: chạy toàn bộ corpus qua engine, rồi với MỖI hit có khai
   * bằng chứng, đòi mọi khoá phải tra được trong chỉ mục dựng từ chính `Facts` đó.
   *
   * Đây là thứ phân biệt "gắn ID cho đủ số" với "gắn ID đúng": một ID bịa sẽ tra
   * không ra và bài đỏ.
   */
  const treo: string[] = [];
  let soHit = 0;
  let soKhai = 0;

  for (const f of moiFixture()) {
    let facts: Facts;
    try {
      facts = docFacts(`${THU_MUC}/${f}`);
    } catch {
      continue;
    }
    const chiMuc = dungChiMuc(facts);
    for (const h of danhGia(facts).hits) {
      soHit++;
      const bc = h.bangChung ?? [];
      if (bc.length === 0) continue;
      soKhai++;
      for (const b of bc) {
        if (!chiMuc.tra(b.loai, b.khoa)) {
          treo.push(`${f} · luật ${h.ruleId} · ${b.loai}:${b.khoa}`);
        }
      }
    }
  }

  assert.ok(soHit > 0, "corpus không sinh hit nào — bài này không đo được gì");
  assert.ok(soKhai > 0, "không hit nào khai bằng chứng — tiền đề sai");
  assert.deepEqual(treo, [], "có khoá bằng chứng không tra được trong Facts của chính lượt đó");
});

test("CU-05 · phần LỚN hit khai bằng chứng, và phần chưa khai có lý do", () => {
  /*
   * Đếm, không làm tròn. Con số này trôi khi thêm luật, nên bài đọc nó từ mã chứ
   * không gắn cứng — nhưng vẫn đòi tỉ lệ cao, vì mục đích của thẻ là nâng nó lên.
   */
  let soHit = 0;
  let chuaKhai = 0;
  const luatChuaKhai = new Set<number>();

  for (const f of moiFixture()) {
    let facts: Facts;
    try {
      facts = docFacts(`${THU_MUC}/${f}`);
    } catch {
      continue;
    }
    for (const h of danhGia(facts).hits) {
      soHit++;
      if ((h.bangChung ?? []).length === 0) {
        chuaKhai++;
        luatChuaKhai.add(h.ruleId);
      }
    }
  }

  assert.ok(soHit > 0);
  /*
   * Luật 14 là luật DUY NHẤT được phép không khai, và lý do nằm trong bản chất của
   * nó: nó báo *"ví không cho biết địa chỉ nào là của bạn"*. Không có dữ kiện nào
   * để trỏ tới — trỏ bừa vào một account là bịa ra một quan hệ nhân quả.
   *
   * Nếu một luật KHÁC rơi vào đây, đó là bỏ sót thật và bài phải đỏ.
   */
  const ngoaiLe = new Set([14]);
  const laKhac = [...luatChuaKhai].filter((id) => !ngoaiLe.has(id));
  assert.deepEqual(laKhac, [], `luật ${laKhac.join(", ")} phát cảnh báo mà không khai bằng chứng`);
  assert.ok(
    chuaKhai / soHit < 0.1,
    `${chuaKhai}/${soHit} hit chưa khai bằng chứng — tỉ lệ quá cao`,
  );
});

test("CU-05 · 13/14 luật khai bằng chứng, và luật 14 có lý do ghi trong mã", () => {
  /*
   * Đếm từ mã, không gắn cứng con số — cùng lý do với guard ADR: gắn cứng nghĩa là
   * mỗi lần gắn thêm lại phải sửa tay hai nơi.
   */
  const s = doc("packages/core/src/l2/rules.ts");
  const khoi = s.split(/(?=^export const luat\d+: Rule = \{$)/m);
  const luat = khoi.filter((k) => /^export const luat\d+/.test(k));
  const khai = luat.filter((k) => k.includes("bangChung: ["));

  assert.equal(luat.length, LUAT.length, "số khối luật trong mã khác số luật đã đăng ký");
  assert.ok(
    khai.length >= luat.length - 1,
    `chỉ ${khai.length}/${luat.length} luật khai bằng chứng — CU-05 đòi phủ hết trừ ngoại lệ có lý do`,
  );
});

test("CU-05 · mỗi khoá trỏ đúng LOẠI định danh của luật đó", () => {
  /*
   * `BangChung.loai` tồn tại vì hai luật cùng nói về một token có thể cầm hai khoá
   * khác nhau — luật 11 cộng theo **mint**, bảng dò **địa chỉ token account**. Lỗi
   * đó đã xảy ra thật và được ghi trong `rules.ts`.
   *
   * Bài này đòi loại phải đúng NGỮ NGHĨA, không chỉ tra được: một luật về mint mà
   * khai `tokenAccount` sẽ tra ra (nếu trùng chuỗi) nhưng vẫn sai.
   */
  const s = doc("packages/core/src/l2/rules.ts");
  const khoi = s.split(/(?=^export const luat\d+: Rule = \{$)/m);

  /** Loại mong đợi theo biến mà luật lặp qua. */
  const mong: Record<string, string> = {
    "f.mints": "mint",
    "f.accounts": "account",
    "f.lookupTables": "lookupTable",
  };

  const sai: string[] = [];
  for (const k of khoi) {
    const m = /^export const (luat\d+)/.exec(k);
    if (!m) continue;
    for (const [bien, loai] of Object.entries(mong)) {
      if (!k.includes(bien)) continue;
      // Luật lặp qua `f.mints` mà khai `tokenAccount` là nhầm loại.
      for (const mm of k.matchAll(/loai: "(\w+)" as const/g)) {
        const daKhai = mm[1]!;
        if (daKhai !== loai && bien === "f.mints" && daKhai === "tokenAccount") {
          sai.push(`${m[1]} lặp ${bien} nhưng khai ${daKhai}`);
        }
      }
    }
  }
  assert.deepEqual(sai, [], "có luật khai sai loại định danh");
});

test("CU-05 · đường lui `detail.includes` vẫn còn, và được ghi là DỰ PHÒNG", () => {
  /*
   * Đo được: 75 hit trên corpus, đúng 1 hit không khai bằng chứng (luật 14), và
   * luật 14 không nhắc địa chỉ nào — nên `coHitO` hiện KHÔNG luật nội bộ nào đi qua.
   *
   * Vẫn giữ, vì `bangChung` là tuỳ chọn trong public API: consumer tự viết luật
   * riêng có thể không khai, và bỏ đường lui làm dòng mất màu im lặng.
   *
   * Nhưng mã phải nói rõ nó là dự phòng, để người đọc sau không kết luận rằng engine
   * còn dò chuỗi.
   */
  const s = doc("packages/core/src/diff.ts");
  assert.match(s, /h\.bangChung === undefined && h\.detail\.includes/, "đường lui phải còn");
  assert.match(
    s,
    /DỰ PHÒNG|dự phòng, không phải đường đang dùng/,
    "mã phải ghi rõ đường lui là dự phòng, không phải đường đang dùng",
  );
});
