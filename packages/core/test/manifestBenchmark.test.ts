import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

type Tep = { duong: string; bam: string };
type MauManifest = {
  id: string;
  nguonGoc: string;
  nhan: string;
  tang: string[];
  tep: { facts: Tep; giaoDich?: Tep };
  kyVong: { level: string; coMa?: string[]; khongCoMa?: string[] };
  nguonKyVong: string;
  gioiHan: string;
};
const mf = () =>
  JSON.parse(doc("data/benchmark/manifest.json")) as {
    phienBan: number;
    bamNguon: string;
    soMau: number;
    soBoQua: number;
    boQua: Array<{ id: string; lyDo: string }>;
    theoTang: Record<string, number>;
    theoNhan: Record<string, number>;
    mau: MauManifest[];
  };
const seed = () =>
  JSON.parse(doc("data/seed/index.json")) as {
    mau: Array<{ id: string; kyVong: unknown; giaoDich?: string | null; facts: string }>;
  };

/**
 * TB-B01 — MANIFEST BENCHMARK.
 *
 * Điều nguy hiểm nhất một benchmark có thể làm là **tự sinh kỳ vọng bằng chính engine
 * đang kiểm**. Khi đó mọi bài đều xanh vĩnh viễn, kể cả lúc engine sai — và không có
 * dấu hiệu nào bên ngoài để nhận ra.
 *
 * Ba nhóm bài: oracle độc lập · phân tầng nói đúng sự thật · manifest không trôi khỏi
 * nguồn của nó.
 */

/* ── 1 · Oracle KHÔNG được gọi engine ──────────────────────────────────────── */

test("script sinh manifest KHÔNG import engine Custos", () => {
  /*
   * Bài quan trọng nhất file, và nó canh ở tầng mã nguồn vì không có cách nào quan
   * sát điều này từ đầu ra: một manifest do engine sinh trông y hệt một manifest do
   * người gán nhãn.
   *
   * Bỏ chú thích trước khi quét — chính docstring của script nói *"Không `danhGia`,
   * không `inspect`"*, và một phép kiểm theo chuỗi không phân biệt được "dùng X" với
   * "cấm X". Lỗi đó đã mắc bốn lần trong repo này.
   */
  const ma = doc("scripts/manifest-benchmark.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  assert.ok(!/packages\/core/.test(ma), "manifest không được import gì từ `packages/core`");
  for (const cam of ["danhGia(", "inspect(", "extractFacts("]) {
    assert.ok(!ma.includes(cam), `manifest gọi \`${cam}\` — oracle đang tự sinh kỳ vọng`);
  }
});

test("mỗi mẫu khai nguồn của kỳ vọng, và nguồn đó là NGƯỜI", () => {
  for (const m of mf().mau) {
    assert.match(
      m.nguonKyVong,
      /người/i,
      `${m.id}: \`nguonKyVong\` phải nói rõ kỳ vọng do người gán, không do engine`,
    );
  }
});

test("kỳ vọng trong manifest KHỚP NGUYÊN VĂN `index.json`", () => {
  /*
   * Manifest chép kỳ vọng, không diễn giải lại. Nếu hai bên lệch thì hoặc manifest
   * đã sửa kỳ vọng (điều nó không được phép làm), hoặc nó đã cũ.
   */
  const nguon = new Map(seed().mau.map((m) => [m.id, JSON.stringify(m.kyVong)]));
  for (const m of mf().mau) {
    assert.equal(
      JSON.stringify(m.kyVong),
      nguon.get(m.id),
      `${m.id}: kỳ vọng trong manifest khác index.json`,
    );
  }
});

/* ── 2 · Phân tầng phải nói đúng dữ liệu CÓ THẬT ───────────────────────────── */

test("`l1-replay` chỉ gán cho mẫu THẬT SỰ có file giao dịch", () => {
  /*
   * 9/38 mẫu không có `tx/` — chúng là ca đối chứng dựng bằng cách sửa Facts trực
   * tiếp. Gán `l1-replay` cho chúng là hứa một tầng bằng chứng không chạy được.
   */
  for (const m of mf().mau) {
    const coTep = Boolean(m.tep.giaoDich);
    assert.equal(
      m.tang.includes("l1-replay"),
      coTep,
      `${m.id}: tầng l1-replay ${m.tang.includes("l1-replay") ? "được gán" : "bị bỏ"} nhưng file giao dịch ${coTep ? "có" : "không có"}`,
    );
    if (coTep) {
      assert.ok(
        existsSync(join(GOC, "data/seed", m.tep.giaoDich!.duong)),
        `${m.id}: manifest khai có ${m.tep.giaoDich!.duong} nhưng file không tồn tại`,
      );
    }
  }
});

test("`devnet-live` KHÔNG gán cho mẫu mainnet", () => {
  // Chạy lại một giao dịch mainnet trên devnet là vô nghĩa: account không tồn tại ở
  // đó. Gán tầng này cho chúng là hứa một phép đo không thực hiện được.
  for (const m of mf().mau) {
    if (m.nguonGoc === "real-mainnet") {
      assert.ok(
        !m.tang.includes("devnet-live"),
        `${m.id} là mainnet mà được gán devnet-live`,
      );
    }
  }
});

test("mọi mẫu đều chạy được ít nhất tầng `l2-facts`", () => {
  // Không mẫu nào được nằm trong manifest mà không chấm được ở tầng nào.
  for (const m of mf().mau) {
    assert.ok(m.tang.includes("l2-facts"), `${m.id} không chạy được tầng nào`);
  }
});

test("số theo tầng khớp phép đếm thật", () => {
  const d = mf();
  for (const t of ["l2-facts", "l1-replay", "devnet-live"]) {
    assert.equal(
      d.theoTang[t],
      d.mau.filter((m) => m.tang.includes(t)).length,
      `theoTang["${t}"] không khớp số mẫu thật`,
    );
  }
});

/* ── 3 · Nhãn held-out và giới hạn ─────────────────────────────────────────── */

test("KHÔNG mẫu nào được gán nhãn `held-out`", () => {
  /*
   * Cả 38 mẫu viết cùng lúc hoặc sau luật mà chúng kiểm. Gọi bất kỳ cái nào là
   * held-out là đặt tên mới cho dữ liệu đã dùng — `data/seed/giu-lai/README.md` nói
   * đúng chữ đó, và thư mục giữ lại **cố ý trống**.
   *
   * Áp lực trôi ở đây một chiều: một benchmark có "tập giữ lại" nghe đáng tin hơn
   * hẳn, và không ai kiểm được nhãn đó từ bên ngoài.
   */
  const d = mf();
  assert.equal(d.theoNhan["held-out"] ?? 0, 0);
  for (const m of d.mau) {
    assert.equal(m.nhan, "development", `${m.id} gán nhãn "${m.nhan}" — chưa có mẫu giữ lại nào`);
  }
});

test("mỗi mẫu mang giới hạn của chính nó", () => {
  /*
   * `synthetic-devnet` = đội tự dựng đầu vào để kích hoạt luật của chính đội. Hợp lệ
   * để kiểm luật, KHÔNG thay được dữ liệu độc lập. Ghi ở từng mẫu chứ không chỉ ở
   * đầu trang: người đọc một dòng manifest phải thấy ngay giới hạn của dòng đó.
   */
  for (const m of mf().mau) {
    assert.ok(m.gioiHan.length > 20, `${m.id} thiếu ghi chú giới hạn`);
    if (m.nguonGoc === "synthetic-devnet") {
      assert.match(m.gioiHan, /tự dựng|KHÔNG thay được/i);
    } else {
      assert.match(m.gioiHan, /chưa gán ground truth|không suy ra tỉ lệ/i);
    }
  }
});

/* ── 4 · Manifest không được trôi khỏi nguồn ───────────────────────────────── */

test("manifest phủ đủ mẫu của `index.json`, hoặc nêu tên mẫu bị bỏ", () => {
  /*
   * Nghiệm thu thẻ: *"runner từ chối mẫu thiếu trường quan trọng và báo mẫu không hỗ
   * trợ"*. Bỏ qua im lặng là cách một benchmark thu nhỏ dần mà không ai thấy.
   */
  const d = mf();
  assert.equal(
    d.soMau + d.soBoQua,
    seed().mau.length,
    "manifest bỏ sót mẫu mà không ghi vào `boQua`",
  );
  for (const b of d.boQua) {
    assert.ok(b.lyDo.length > 5, `mẫu ${b.id} bị bỏ mà không nói lý do`);
  }
});

test("`bamNguon` khớp `index.json` hiện tại", () => {
  /*
   * Nếu ai đó sửa `index.json` mà quên sinh lại manifest, bài này đỏ — và đó là điều
   * duy nhất phân biệt được "chạy lại cho kết quả khác" với "mẫu đã bị sửa".
   *
   * Dùng `git hash-object` chứ không SHA-256 thô: trên Windows, CRLF và LF cho hai
   * SHA-256 khác nhau cho cùng một nội dung, và manifest sẽ báo động giả mỗi lần
   * checkout trên máy khác.
   */
  const bam = execFileSync("git", ["hash-object", "data/seed/index.json"], {
    cwd: GOC,
    encoding: "utf8",
  }).trim();
  assert.equal(
    mf().bamNguon,
    bam,
    "`index.json` đã đổi sau khi sinh manifest — chạy `npm run manifest-benchmark`",
  );
});
