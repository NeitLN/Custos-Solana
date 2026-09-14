import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

const SCRIPT = "scripts/ky-thuat/danh-gia-b05.ts";
const BB = "data/benchmark/danh-gia-b05.json";
const BM = "docs/BENCHMARK.md";

type BienBan = {
  soMauChayDuoc: number;
  soKhongDanhGiaDuoc: number;
  tinhChat: Array<{ ma: string; apDung: number; dat: number; daChungMinh: string }>;
  khongDanhGiaDuoc: Array<{ id: string; lyDo: string }>;
};
const bb = () => JSON.parse(doc(BB)) as BienBan;

/**
 * TB-B05 — TẬP ĐÁNH GIÁ MỚI VÀ GIỚI HẠN THỐNG KÊ.
 *
 * Thẻ này phần lớn là **lệnh cấm về câu chữ**, và câu chữ là thứ trôi dễ nhất:
 *
 *   · không đổi tên bộ 38 mẫu cũ thành held-out
 *   · không gọi là independent security validation
 *   · không công bố accuracy thị trường khi chỉ có synthetic properties
 *   · phân loại TP/FP/TN/FN chỉ khi bài toán nhị phân có nghĩa
 *
 * Không lệnh nào trong số đó kiểm được từ đầu ra — một trang nói quá trông y hệt một
 * trang trung thực. Nên các bài dưới đọc tài liệu và mã, và neo số vào biên bản máy.
 */

/* ── 1 · Ba lệnh cấm về câu chữ ────────────────────────────────────────────── */

test("KHÔNG gọi là accuracy hay thẩm định bảo mật độc lập", () => {
  /*
   * Neo vào mục 8.4 — nơi trang tự khai giới hạn. Quét cả trang thì xoá mục 8.4 vẫn
   * xanh, vì mục 1 cũng nhắc chữ "accuracy" (để nói vì sao KHÔNG có). Lỗi "một chỗ đỡ
   * cho chỗ kia" đã mắc bốn lần trong repo này.
   */
  const md = doc(BM);
  const i = md.indexOf("### 8.4 ·");
  const j = md.indexOf("### 8.5 ·");
  assert.ok(i > 0 && j > i, "mất mục 8.4 — nơi trang tự khai ba giới hạn");
  const muc = md.slice(i, j);

  assert.match(muc, /Không phải accuracy/i, "8.4 không nói rõ đây KHÔNG phải accuracy");
  assert.match(
    muc,
    /independent security validation/i,
    "8.4 phải nêu đích danh cụm thẻ cấm dùng",
  );
  assert.match(muc, /giu-lai\/` vẫn trống|vẫn trống/i, "8.4 không nói rõ tập giữ lại còn trống");

  // Và script cũng phải mang ranh giới đó tới người CHẠY, không chỉ người đọc tài liệu.
  const sc = doc(SCRIPT);
  assert.match(sc, /KHÔNG phải accuracy/i, "script không in ranh giới accuracy");
  assert.match(sc, /thẩm định bảo mật độc lập/i, "script không in ranh giới thẩm định độc lập");
});

test("KHÔNG đổi tên bộ 38 mẫu cũ thành held-out", () => {
  /*
   * Thẻ cấm đích danh. Kiểm bằng DỮ LIỆU, không bằng câu chữ: thư mục giữ lại phải
   * còn trống, và manifest phải còn khai `held-out: 0`.
   */
  const thuMuc = join(GOC, "data/seed/giu-lai");
  assert.ok(existsSync(thuMuc), "mất thư mục tập giữ lại");

  const mf = JSON.parse(doc("data/benchmark/manifest.json")) as {
    theoNhan: Record<string, number>;
  };
  assert.equal(
    mf.theoNhan["held-out"] ?? 0,
    0,
    "manifest khai có mẫu held-out — 38 mẫu cũ không được đổi tên thành tập giữ lại",
  );
});

test("KHÔNG phân loại TP/FP/TN/FN", () => {
  /*
   * Thẻ cho phép *"chỉ khi nhãn và bài toán nhị phân có nghĩa"*, và ở đây không.
   * Bài này canh việc bốn chữ đó không xuất hiện như một phép đo trong script.
   */
  const sc = doc(SCRIPT)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const cam of ["truePositive", "falsePositive", "trueNegative", "falseNegative"]) {
    assert.ok(!sc.includes(cam), `script tính \`${cam}\` — bài toán ở đây không nhị phân`);
  }
  assert.match(
    doc(BM),
    /### 8\.5 · Không phân loại TP\/FP\/TN\/FN/,
    "BENCHMARK.md thiếu mục nói vì sao không phân loại bốn ô",
  );
});

/* ── 2 · Tính chất CHƯA CHỨNG MINH phải được khai ra ───────────────────────── */

test("tính chất chưa chứng minh được KHÔNG bị đếm như đã chứng minh", () => {
  /*
   * BÀI QUAN TRỌNG NHẤT FILE.
   *
   * P3 hiện đạt 1/1 — một con số trông hoàn hảo. Nhưng mutation không kéo nó xuống
   * được: mẫu duy nhất kích hoạt P3 (`R10-pos`) cũng có `simulationOk: false`, nên
   * fail-safe 1 nâng verdict trước khi lớp ALT kịp làm gì.
   *
   * Áp lực trôi ở đây rất mạnh và một chiều: xoá cột "đã chứng minh" thì bảng thành
   * 3/3 hoàn hảo, và không ai bên ngoài biết được điều đã mất.
   */
  const d = bb();
  const p3 = d.tinhChat.find((t) => t.ma === "P3");
  assert.ok(p3, "mất tính chất P3 khỏi biên bản");
  assert.equal(
    p3.daChungMinh,
    "",
    "P3 khai là đã chứng minh — mutation chưa bao giờ kéo được nó xuống",
  );

  // Hai tính chất kia thì PHẢI có bằng chứng mutation kèm số.
  for (const ma of ["P1", "P2"]) {
    const t = d.tinhChat.find((x) => x.ma === ma)!;
    assert.ok(t.daChungMinh.length > 20, `${ma} thiếu bằng chứng mutation`);
    assert.match(t.daChungMinh, /\d+\/\d+/, `${ma}: bằng chứng phải kèm số đo trước/sau`);
  }

  // Và tài liệu phải nói ra, không chỉ biên bản máy.
  const md = doc(BM);
  assert.match(md, /\*\*CHƯA\*\*/, "BENCHMARK.md không đánh dấu tính chất chưa chứng minh");
  assert.match(
    md,
    /chưa phải\s*\n?tính chất — nó là một phép đếm|là một phép đếm/,
    "thiếu giải thích vì sao 1/1 chưa đủ để gọi là tính chất",
  );
});

/* ── 3 · Số không đánh giá được phải là nhóm RIÊNG ─────────────────────────── */

test("mẫu không đánh giá được KHÔNG trộn vào mẫu số, và cộng đủ 38", () => {
  /*
   * Cách một tập đánh giá tự thu nhỏ mà không ai thấy: bỏ im lặng mẫu chạy không
   * được, rồi báo tỉ lệ trên phần còn lại.
   */
  const d = bb();
  const seed = JSON.parse(doc("data/seed/index.json")) as { mau: unknown[] };

  assert.equal(
    d.soMauChayDuoc + d.soKhongDanhGiaDuoc,
    seed.mau.length,
    `${d.soMauChayDuoc} + ${d.soKhongDanhGiaDuoc} ≠ ${seed.mau.length} mẫu — có mẫu bị bỏ im lặng`,
  );
  assert.equal(d.khongDanhGiaDuoc.length, d.soKhongDanhGiaDuoc, "số đếm lệch danh sách");
  for (const k of d.khongDanhGiaDuoc) {
    assert.ok(k.lyDo.length > 20, `${k.id} bị bỏ mà không nói rõ lý do`);
  }
});

test("tài liệu ghi ĐÚNG số áp dụng của từng tính chất, không kể lại", () => {
  /*
   * "Áp dụng 4/19" là con số dễ trôi nhất trang: thêm một fixture mô phỏng hỏng thì
   * nó thành 5/19, và bảng cũ vẫn trông hợp lý.
   */
  const d = bb();
  const md = doc(BM);
  for (const t of d.tinhChat) {
    assert.ok(
      md.includes(`| ${t.apDung}/${d.soMauChayDuoc} |`),
      `${t.ma}: tài liệu thiếu số áp dụng \`${t.apDung}/${d.soMauChayDuoc}\``,
    );
  }
  assert.ok(
    md.includes(`${d.soKhongDanhGiaDuoc} mẫu KHÔNG đánh giá được`) ||
      md.includes(`**${d.soKhongDanhGiaDuoc}**`),
    "tài liệu thiếu số mẫu không đánh giá được",
  );
});

/* ── 4 · Nguồn tính chất phải ĐỘC LẬP với verdict ──────────────────────────── */

test("tính chất suy từ tài liệu Solana, KHÔNG từ đặc tả nội bộ", () => {
  /*
   * Ràng buộc khó nhất của thẻ. `DAC-TA-CORE.md` commit `63959f3` lúc 21:55:31 và
   * engine L2 commit `42c33d0` lúc 21:57:03 cùng ngày — 92 giây, cùng người, cùng
   * phiên. Nó KHÔNG độc lập với verdict.
   */
  const sc = doc(SCRIPT);
  assert.match(
    sc,
    /solana\.com\/docs\/rpc\/http\/simulatetransaction/,
    "script không nêu nguồn ngoài cho tính chất",
  );
  assert.match(sc, /92 giây|KHÔNG độc lập/i, "script không ghi vì sao đặc tả nội bộ không dùng được");

  const md = doc(BM);
  assert.match(md, /92 giây/, "BENCHMARK.md không ghi khoảng cách giữa đặc tả và engine");
  assert.match(md, /solana\.com\/docs\/rpc\/http\/simulatetransaction/, "thiếu link nguồn ngoài");
});

test("script KHÔNG chạm mạng và dùng `extractFacts` sản xuất", () => {
  const sc = doc(SCRIPT)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const cam of ["new Connection", "fetch(", "node:http"]) {
    assert.ok(!sc.includes(cam), `script chứa \`${cam}\``);
  }
  assert.match(sc, /import \{ extractFacts \}/, "phải chạy qua đường L1 sản xuất");
  assert.match(sc, /connTuFixture/, "phải đọc fixture, không dựng Facts tay");
});

test("`npm run danh-gia-b05` trỏ đúng script", () => {
  const s = (JSON.parse(doc("package.json")) as { scripts: Record<string, string> }).scripts;
  assert.match(s["danh-gia-b05"] ?? "", /danh-gia-b05\.ts/);
});
