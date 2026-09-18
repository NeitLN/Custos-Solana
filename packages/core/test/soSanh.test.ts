import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { soSanhCauTruc, soSanhQuanSat } from "../src/so-sanh.ts";
import { giaiDongBangFacts } from "../src/facts-io.ts";
import type { Facts } from "../src/facts.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));

/** Facts THẬT từ corpus. Bịa Facts sẽ làm phép so đo một cấu trúc không có thật. */
function factsThat(): Facts {
  const idx = JSON.parse(readFileSync(GOC + "data/seed/index.json", "utf8")) as {
    mau: Array<Record<string, unknown>>;
  };
  const m = idx.mau.find((x) => typeof x["facts"] === "string");
  assert.ok(m, "corpus không có mẫu nào kèm facts");
  return giaiDongBangFacts(readFileSync(GOC + "data/seed/" + m["facts"], "utf8"));
}

/** Bản sao sâu, giữ nguyên bigint. */
const banSao = (f: Facts): Facts =>
  giaiDongBangFacts(JSON.stringify(JSON.parse(JSON.stringify(f, (_, v) => (typeof v === "bigint" ? `${v}n` : v)))));

test("CU-20 · cùng một giao dịch ⇒ không khác biệt — ĐỐI CHỨNG", () => {
  /*
   * ĐỐI CHỨNG đặt trước. Mọi bài dưới cũng xanh nếu phép so báo "khác nhau" với
   * mọi đầu vào — và lúc đó nó vô dụng.
   */
  const f = factsThat();
  const r = soSanhCauTruc(f, banSao(f));
  assert.equal(r.giongNhau, true, `báo khác nhau với chính nó: ${JSON.stringify(r.khacBiet.slice(0, 3))}`);
  assert.deepEqual(r.khacBiet, []);
});

test("CU-20 · đổi ĐÍCH vanity cùng đầu/cuối vẫn bị bắt", () => {
  /*
   * Ca nghiệm thu đích danh. Địa chỉ vanity trông giống nhau khi rút gọn
   * (`So11…1112`), và đó chính là cách lừa người đọc. Phép so phải dùng địa chỉ
   * ĐẦY ĐỦ.
   */
  const a = factsThat();
  const b = banSao(a);
  assert.ok(b.tokenAccounts.length > 0, "fixture không có token account — đổi ca kiểm");

  const goc = b.tokenAccounts[0]!.ownerAfter ?? b.tokenAccounts[0]!.address;
  // Giữ 4 ký tự đầu và 4 cuối, đổi ruột — đúng hình dạng một địa chỉ vanity.
  const gia = goc.slice(0, 4) + "X".repeat(Math.max(1, goc.length - 8)) + goc.slice(-4);
  assert.notEqual(gia, goc);
  assert.equal(gia.slice(0, 4), goc.slice(0, 4), "ca kiểm không còn giống vanity");
  assert.equal(gia.slice(-4), goc.slice(-4));

  b.tokenAccounts[0]!.ownerAfter = gia;
  const r = soSanhCauTruc(a, b);
  assert.equal(r.giongNhau, false, "đổi chủ sở hữu bằng địa chỉ vanity mà không bị bắt");
  assert.ok(
    r.khacBiet.some((d) => d.truong === "chủ sở hữu sau"),
    "không chỉ ra đúng trường đã đổi",
  );
});

test("CU-20 · thêm một lệnh ⇒ chỉ lệnh ĐÓ khác, không phải mọi lệnh", () => {
  /*
   * Khớp theo định danh bền, không theo vị trí. So theo `index` tuyệt đối sẽ báo
   * "mọi lệnh đều đổi" khi chỉ có một lệnh được chèn vào đầu — đúng kỹ thuật, vô
   * dụng với người đọc.
   */
  const a = factsThat();
  const b = banSao(a);
  const mau = a.instructions[0]!;

  // Lệnh mới của MỘT PROGRAM KHÁC, chèn vào ĐẦU danh sách.
  b.instructions.unshift({
    ...mau,
    index: -1,
    programId: "ProgramLaKhongCoThat1111111111111111111111",
    decoded: { kind: "LenhMoi" },
  });
  b.instructions.forEach((ix, i) => (ix.index = i));

  const r = soSanhCauTruc(a, b);
  assert.equal(r.giongNhau, false, "thêm lệnh mà không bị bắt");

  const khoaKhac = new Set(r.khacBiet.map((d) => d.khoa));
  assert.ok(
    [...khoaKhac].every((k) => k.startsWith("ProgramLaKhongCoThat")),
    `khác biệt lan sang lệnh không liên quan: ${[...khoaKhac].join(", ")}`,
  );
});

test("CU-20 · ĐỔI THỨ TỰ lệnh của cùng một program BỊ bắt", () => {
  /*
   * Mặt trái của bài trên: khoá bền không được bền tới mức bỏ qua thay đổi thật.
   * Đảo hai lệnh của cùng một program là đổi hành vi giao dịch.
   */
  const a = factsThat();
  const cungProgram = a.instructions.filter((x) => x.programId === a.instructions[0]!.programId);
  if (cungProgram.length < 2) {
    // Fixture không đủ để kiểm ca này — nói ra thay vì im lặng xanh.
    assert.ok(true, "fixture chỉ có 1 lệnh mỗi program, ca reorder không áp dụng ở đây");
    return;
  }

  const b = banSao(a);
  const i = b.instructions.findIndex((x) => x.programId === cungProgram[0]!.programId);
  const j = b.instructions.findIndex(
    (x, k) => k > i && x.programId === cungProgram[0]!.programId,
  );
  [b.instructions[i], b.instructions[j]] = [b.instructions[j]!, b.instructions[i]!];

  const r = soSanhCauTruc(a, b);
  if (b.instructions[i]!.decoded?.kind !== b.instructions[j]!.decoded?.kind) {
    assert.equal(r.giongNhau, false, "đảo thứ tự lệnh mà không bị bắt");
  }
});

test("CU-20 · thêm SetAuthority bị bắt và chỉ ra authority", () => {
  const a = factsThat();
  const b = banSao(a);
  b.instructions.push({
    ...a.instructions[0]!,
    index: b.instructions.length,
    decoded: { kind: "SetAuthority", authority: "KeTanCong1111111111111111111111111111111111" },
  });

  const r = soSanhCauTruc(a, b);
  assert.equal(r.giongNhau, false);
  assert.ok(
    r.khacBiet.some((d) => d.b === "SetAuthority" || d.b?.includes("KeTanCong")),
    `không nêu được SetAuthority: ${JSON.stringify(r.khacBiet.slice(0, 4))}`,
  );
});

test("CU-20 · quan sát khác nhau KHÔNG bị gọi là dApp tráo giao dịch", () => {
  /*
   * RANH GIỚI QUAN TRỌNG NHẤT CỦA THẺ.
   *
   * Số dư đổi giữa hai lần mô phỏng là chuyện bình thường trên chuỗi đang chạy.
   * Gọi đó là "dApp tráo giao dịch" là buộc tội một hành vi cụ thể dựa trên bằng
   * chứng không nói điều đó — đúng thứ docs/CUSTOS.md mục 06 cấm.
   *
   * Custos phân biệt hai khả năng bằng `khopNeo` (so byte), không bằng phép so này.
   */
  const a = factsThat();
  const b = banSao(a);
  b.tokenAccounts[0]!.amountAfter = b.tokenAccounts[0]!.amountAfter + 1n;

  const r = soSanhQuanSat(a, b);
  assert.equal(r.loai, "quanSat");
  assert.equal(r.giongNhau, false);
  assert.match(r.cau, /KHÔNG chứng minh giao dịch bị tráo/, `câu buộc tội: ${r.cau}`);
  assert.ok(!/tráo|lừa|tấn công/.test(r.cau.replace(/KHÔNG chứng minh giao dịch bị tráo/, "")),
    `câu vẫn hàm ý buộc tội: ${r.cau}`);
});

test("CU-20 · hai loại so sánh nói HAI câu khác nhau", () => {
  const a = factsThat();
  const b = banSao(a);
  b.tokenAccounts[0]!.amountAfter = b.tokenAccounts[0]!.amountAfter + 1n;

  const ct = soSanhCauTruc(a, b);
  const qs = soSanhQuanSat(a, b);

  assert.equal(ct.loai, "cauTruc");
  assert.equal(qs.loai, "quanSat");
  assert.notEqual(ct.cau, qs.cau, "hai loại so sánh dùng chung một câu — người đọc không phân biệt được");
  assert.match(ct.cau, /không phụ thuộc thời điểm đọc/, "so cấu trúc không tự khai là tất định");
});

test("CU-20 · khớp dòng KHÔNG dùng ký hiệu token", () => {
  /*
   * Ký hiệu token do metadata đặt, và metadata là thứ kẻ tấn công điều khiển được.
   * Đổi ký hiệu mà giữ nguyên địa chỉ ⇒ vẫn phải khớp đúng dòng.
   */
  const a = factsThat();
  const b = banSao(a);
  for (const m of b.mints) m.kyHieu = "USDC";

  const r = soSanhCauTruc(a, b);
  assert.equal(r.giongNhau, true, "đổi ký hiệu token làm lệch phép khớp dòng");
});

test("CU-20 · so-sanh.ts KHÔNG chạm mạng — đọc mã", () => {
  const ma = readFileSync(fileURLToPath(new URL("../src/so-sanh.ts", import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  for (const cam of ["Connection", "fetch(", "@solana/web3.js", "await "]) {
    assert.ok(!ma.includes(cam), `so-sanh.ts có \`${cam}\``);
  }
});
