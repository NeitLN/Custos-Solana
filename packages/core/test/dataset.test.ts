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

type HoSo = { mau: Mau[]; soMau: number };

const hoSo: HoSo = coDuLieu
  ? (JSON.parse(readFileSync(new URL("index.json", GOC), "utf8")) as HoSo)
  : { mau: [], soMau: 0 };

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

test("SANITY trên giao dịch công khai — KHÔNG phải tỉ lệ báo nhầm", () => {
  // TÊN CŨ LÀ "TỈ LỆ BÁO NHẦM", VÀ ĐÓ LÀ NÓI QUÁ.
  //
  // Muốn nói "báo nhầm" thì phải biết mẫu nào THẬT SỰ lành — tức phải có ground
  // truth do người gán nhãn. Tập này chưa có. Cái đo được ở đây hẹp hơn nhiều:
  // engine KHÔNG gắn Đỏ cho một mẻ giao dịch công khai lấy ngẫu nhiên. Đó là một
  // phép kiểm hồi quy, không phải precision/recall/false-positive rate.
  //
  // Tên test lọt vào ảnh chụp output rồi lên slide, nên tên sai là số sai.
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

/**
 * Test này TỰ CHỐT LẤY MỘT CÂU TRONG TÀI LIỆU CÔNG KHAI.
 *
 * `packages/core/README.md` — file được publish lên npm — nói seed dataset phủ
 * **cả 14 luật**. Nếu câu đó đúng thì test này phải đỏ ngay khi một luật mất mẫu.
 *
 * Bản trước dùng `assert.ok(phu.size >= 4)`: chỉ đòi bốn luật, trong khi README
 * lúc đó còn ghi "phủ cả 14 luật". Nghĩa là claim sai gấp ba lần rưỡi mà bộ test
 * vẫn xanh — một câu khẳng định không có gì canh giữ.
 *
 * Luật 13 và 14 nay ĐÃ có ca đóng băng (R13-pos/neg, R14-pos/neg), nên danh sách
 * đủ 1–14. Mỗi cặp khác nhau đúng MỘT điều, để chứng minh luật phân biệt được
 * chứ không phải luôn bật.
 */
const CAN_PHU = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/*
 * `soMau` trong index.json là con số tài liệu và deck đọc ra. Nó ĐÃ TỪNG lệch với
 * mảng thật (khai 29 khi đã có 33) mà không gì bắt được — vì không ai đọc cả hai
 * cùng lúc. Test này đọc cả hai.
 */
test("soMau khai báo khớp số mẫu thật", () => {
  assert.equal(
    hoSo.soMau,
    hoSo.mau.length,
    `index.json khai soMau=${hoSo.soMau} nhưng mảng có ${hoSo.mau.length} mẫu. ` +
      `Con số này đi thẳng vào trang số liệu và deck, nên lệch là nói sai ra ngoài.`,
  );
});

test("seed dataset phủ đúng những luật README tuyên bố (1-14)", () => {
  const phu = new Set(hoSo.mau.filter((m) => m.cuc === "duong").map((m) => m.luat));
  const thieu = CAN_PHU.filter((l) => !phu.has(l));

  console.log(`
    luật đã phủ  : ${[...phu].filter((x) => x !== null).sort((a, b) => a! - b!).join(", ")}`);
  console.log(`    còn thiếu    : ${thieu.length ? thieu.join(", ") : "(không)"}`);
    console.log(`    cặp dương/âm: R13-pos·R13-neg · R14-pos·R14-neg`);

  assert.deepEqual(
    thieu,
    [],
    `README nói seed phủ luật ${CAN_PHU.join(",")} nhưng thiếu: ${thieu.join(", ")}. ` +
      "Hoặc thêm mẫu, hoặc sửa README — không được để hai bên nói khác nhau.",
  );
});
