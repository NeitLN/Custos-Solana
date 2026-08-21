import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { giaiDongBangFacts } from "../src/facts-io.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { chiLaThongTin } from "../src/constants.ts";

/**
 * Chạy toàn bộ seed evaluation dataset qua engine luật.
 *
 * Bộ test này chạy trên `Facts` ĐÃ ĐÓNG BĂNG, không gọi mạng. Nhờ vậy nó tất
 * định, chạy được offline, và khi đỏ thì chắc chắn là do luật đổi chứ không
 * phải do trạng thái chuỗi đổi.
 *
 * Dựng lại bộ dữ liệu: `node --experimental-strip-types scripts/thu-dataset.ts`
 */

type Mau = {
  id: string;
  luat: number | null;
  cuc: "duong" | "am";
  nguonGoc: "real-mainnet" | "synthetic-devnet";
  nguon: string;
  facts: string;
  kyVong: { level: string; coMa?: string[]; khongCoMa?: string[] };
  bangChung: string;
};

const GOC = new URL("../../../data/seed/", import.meta.url);
const coDuLieu = existsSync(new URL("index.json", GOC));

const hoSo: { mau: Mau[] } = coDuLieu
  ? (JSON.parse(readFileSync(new URL("index.json", GOC), "utf8")) as { mau: Mau[] })
  : { mau: [] };

const docFacts = (m: Mau) => giaiDongBangFacts(readFileSync(new URL(m.facts, GOC), "utf8"));

test("bộ dữ liệu tồn tại", () => {
  assert.ok(coDuLieu, "chưa có data/seed/index.json — chạy scripts/thu-dataset.ts");
  assert.ok(hoSo.mau.length > 0);
});

for (const m of hoSo.mau) {
  test(`${m.id} · ${m.nguonGoc} · ${m.bangChung.slice(0, 60)}…`, () => {
    const r = danhGia(docFacts(m));

    if (m.kyVong.level === "khong-phai-danger") {
      assert.notEqual(r.level, "danger", `${m.id} bị gắn Đỏ: ${r.reasonCodes.join(", ")} — ${m.nguon}`);
    } else {
      assert.equal(r.level, m.kyVong.level, `${m.id}: ${r.reasonCodes.join(", ")}`);
    }

    for (const ma of m.kyVong.coMa ?? []) {
      assert.ok(r.reasonCodes.includes(ma), `${m.id} thiếu mã ${ma}, có: ${r.reasonCodes.join(", ")}`);
    }
    for (const ma of m.kyVong.khongCoMa ?? []) {
      assert.ok(!r.reasonCodes.includes(ma), `${m.id} KHÔNG được có mã ${ma}`);
    }
  });
}

test("TỈ LỆ BÁO NHẦM — chỉ tính trên mẫu mainnet thật", () => {
  // Mẫu tự dựng KHÔNG được vào mẫu số. Đội tự tạo đầu vào rồi tự đo đầu ra thì
  // con số không nói lên điều gì. Xem SEED-DATASET.md mục 0.
  const that = hoSo.mau.filter((m) => m.nguonGoc === "real-mainnet");
  assert.ok(that.length >= 10, `cần ít nhất 10 mẫu mainnet, đang có ${that.length}`);

  const ketQua = that.map((m) => ({ m, r: danhGia(docFacts(m)) }));
  const do_ = ketQua.filter(({ r }) => r.level === "danger");
  const caoBuoc = ketQua.filter(
    ({ r }) => r.level === "warning" && r.reasonCodes.length > 0 && !chiLaThongTin(r.reasonCodes),
  );

  console.log(`\n    mẫu mainnet thật     : ${that.length}`);
  console.log(`    gắn Đỏ               : ${do_.length}`);
  console.log(`    cáo buộc về giao dịch: ${caoBuoc.length}`);
  for (const { m, r } of do_) console.log(`      ĐỎ  ${m.nguon}  ${r.reasonCodes.join(",")}`);
  for (const { m, r } of caoBuoc) console.log(`      !   ${m.nguon}  ${r.reasonCodes.join(",")}`);

  assert.equal(do_.length, 0, "có mẫu mainnet bị gắn Đỏ — phải soi tay từng cái trước khi bỏ qua");
});

test("mỗi luật có ca dương tính đều được bộ dữ liệu phủ", () => {
  const phu = new Set(hoSo.mau.filter((m) => m.cuc === "duong").map((m) => m.luat));
  const canPhu = [1, 2, 3, 4, 6, 8, 9, 11, 12];
  const thieu = canPhu.filter((l) => !phu.has(l));

  // Báo cáo trung thực thay vì im lặng. Luật chưa có mẫu thì chưa được coi là
  // đã kiểm chứng — kế hoạch ghi rõ: "một luật chưa có ca nguy hiểm + ca an
  // toàn tương tự thì chưa tính là xong".
  console.log(`\n    luật đã phủ : ${[...phu].filter((x) => x !== null).sort((a, b) => a! - b!).join(", ")}`);
  console.log(`    còn thiếu   : ${thieu.length ? thieu.join(", ") : "(không)"}`);

  assert.ok(phu.size >= 4, "phải phủ được ít nhất bốn luật");
});
