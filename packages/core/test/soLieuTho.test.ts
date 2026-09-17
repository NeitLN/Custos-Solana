import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungBangChenhLech, NHAN, dinhDangSo } from "../src/diff.ts";
import type { Facts } from "../src/facts.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const THU_MUC = "data/seed/facts";

/**
 * CU-06 — SỐ THÔ TRONG BẢNG HẬU QUẢ.
 *
 * `before`/`after` là chuỗi ĐÃ FORMAT theo quy ước tiếng Việt: dấu chấm phân nhóm
 * nghìn, dấu phẩy thập phân. Một consumer muốn cộng, so sánh hay quy đổi phải parse
 * ngược chuỗi đó — và parse ngược một chuỗi hiển thị là cách chắc chắn nhất để một
 * bản sửa định dạng làm hỏng phép tính của người khác.
 *
 * Mục 4.2: *"Giữ raw amounts, decimals, mint và account; format chỉ ở UI"* và
 * *"Không gộp hai mint có cùng symbol"*.
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

test("CU-06 · mọi `soLieu` đều parse được thành bigint và JSON hoá được", () => {
  /*
   * `InspectResult` phải `JSON.stringify` được — receipt (CU-11) và replay (CU-12)
   * đều đi qua JSON, và `bigint` ném `TypeError` ở đó. Nên số thô là CHUỖI thập
   * phân, và bài này đòi nó vừa parse ngược được vừa tuần tự hoá được.
   */
  let coSo = 0;
  for (const f of moiFixture()) {
    let facts: Facts;
    try {
      facts = docFacts(`${THU_MUC}/${f}`);
    } catch {
      continue;
    }
    for (const d of dungBangChenhLech(facts, danhGia(facts).hits)) {
      if (!d.soLieu) continue;
      coSo++;
      assert.doesNotThrow(() => BigInt(d.soLieu!.truoc), `${f} · ${d.label}: \`truoc\` không parse được`);
      assert.doesNotThrow(() => BigInt(d.soLieu!.sau), `${f} · ${d.label}: \`sau\` không parse được`);
      assert.doesNotThrow(() => JSON.stringify(d.soLieu), `${f} · ${d.label}: không JSON hoá được`);
      assert.ok(Number.isInteger(d.soLieu.decimals), `${f}: decimals phải là số nguyên`);
    }
  }
  assert.ok(coSo > 0, "không dòng nào có `soLieu` — bài này không đo được gì");
});

test("CU-06 · số thô KHỚP đúng chuỗi đã format — không phải hai nguồn khác nhau", () => {
  /*
   * BÀI QUAN TRỌNG NHẤT.
   *
   * Thêm một trường số liệu song song với chuỗi hiển thị tạo ra rủi ro mới: hai
   * con số trôi khỏi nhau. Lúc đó consumer đọc `soLieu` và người dùng đọc `after`
   * sẽ thấy hai thứ khác nhau — tệ hơn hẳn việc chỉ có chuỗi.
   *
   * Nên bài này format lại từ số thô rồi đòi nó bằng đúng chuỗi đang hiển thị.
   */
  let daKiem = 0;
  for (const f of moiFixture()) {
    let facts: Facts;
    try {
      facts = docFacts(`${THU_MUC}/${f}`);
    } catch {
      continue;
    }
    for (const d of dungBangChenhLech(facts, danhGia(facts).hits)) {
      if (!d.soLieu) continue;
      // Dòng phí/đặt cọc hiển thị "—" ở cột trái và thêm hậu tố " SOL" ở cột phải;
      // chỉ so những dòng hiển thị số thuần ở cả hai cột.
      if (d.before === "—") continue;
      assert.equal(
        d.before,
        dinhDangSo(BigInt(d.soLieu.truoc), d.soLieu.decimals),
        `${f} · ${d.label}: \`before\` lệch số thô`,
      );
      assert.equal(
        d.after,
        dinhDangSo(BigInt(d.soLieu.sau), d.soLieu.decimals),
        `${f} · ${d.label}: \`after\` lệch số thô`,
      );
      daKiem++;
    }
  }
  assert.ok(daKiem > 0, "không dòng nào so được — tiền đề sai");
});

test("CU-06 · dòng token mang `mint`, dòng SOL gốc thì KHÔNG", () => {
  /*
   * `mint` là thứ phân biệt hai token TRÙNG KÝ HIỆU; `kyHieu` không làm được điều
   * đó, và gộp chúng là đúng lỗi mục 4.2 cấm.
   *
   * Nhưng dòng "Tổng SOL của bạn" KHÔNG được mang mint wSOL: wSOL đã gộp vào chính
   * dòng đó, nên gắn mint vào sẽ làm consumer cộng hai lần.
   */
  let coToken = 0;
  let coSol = 0;
  for (const f of moiFixture()) {
    let facts: Facts;
    try {
      facts = docFacts(`${THU_MUC}/${f}`);
    } catch {
      continue;
    }
    for (const d of dungBangChenhLech(facts, danhGia(facts).hits)) {
      if (!d.soLieu) continue;
      if (d.label.startsWith(NHAN.SO_DU)) {
        assert.ok(d.soLieu.mint, `${f} · ${d.label}: dòng token phải mang mint`);
        assert.ok(d.soLieu.taiKhoan, `${f} · ${d.label}: dòng token phải mang địa chỉ tài khoản`);
        coToken++;
      }
      if (d.label === NHAN.SO_DU_SOL) {
        assert.equal(d.soLieu.mint, undefined, "dòng SOL gốc không được mang mint");
        assert.equal(d.soLieu.decimals, 9, "SOL có 9 chữ số thập phân");
        coSol++;
      }
    }
  }
  assert.ok(coToken > 0 || coSol > 0, "corpus không sinh dòng số dư nào");
});

test("CU-06 · dòng KHÔNG nói về số lượng thì không có `soLieu`", () => {
  /*
   * Đối chứng: thêm `soLieu` vào mọi dòng cho "đầy đủ" sẽ buộc phải bịa ra số cho
   * những dòng vốn nói về quyền, không nói về lượng — "chủ sở hữu tài khoản" đi từ
   * ví A sang ví B không có số nào để ghi.
   */
  let daKiem = 0;
  for (const f of moiFixture()) {
    let facts: Facts;
    try {
      facts = docFacts(`${THU_MUC}/${f}`);
    } catch {
      continue;
    }
    for (const d of dungBangChenhLech(facts, danhGia(facts).hits)) {
      if (d.label.startsWith(NHAN.CHU_SO_HUU) || d.label.startsWith(NHAN.CHUONG_TRINH)) {
        assert.equal(d.soLieu, undefined, `${f} · ${d.label}: dòng về quyền không được có số liệu`);
        daKiem++;
      }
    }
  }
  assert.ok(daKiem > 0, "corpus không sinh dòng quyền nào — tiền đề sai");
});

test("CU-06 · `soLieu` là trường TUỲ CHỌN, giao kèo cũ không vỡ", () => {
  const s = doc("packages/types/src/index.ts");
  assert.match(s, /soLieu\?: \{/, "`soLieu` phải là tuỳ chọn");
  // Và nó phải dùng chuỗi, không phải bigint — JSON hoá được là điều kiện của CU-11/12.
  const i = s.indexOf("soLieu?: {");
  const khoi = s.slice(i, i + 700);
  assert.match(khoi, /truoc: string;/, "số thô phải là chuỗi để JSON hoá được");
  assert.ok(!/truoc: bigint/.test(khoi), "bigint không JSON hoá được — receipt sẽ ném TypeError");
});
