import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * TB-B04 — KIỂM THUỘC TÍNH VÀ ĐỐI KHÁNG.
 *
 * Nghiệm thu thẻ đòi hai thứ, và cái thứ hai là một **lệnh cấm**:
 *
 *   · *"ít nhất một mutation tiêu biểu ở từng ranh giới trọng yếu làm bài kiểm liên
 *     quan đỏ; ghi kết quả rồi hoàn nguyên mutation"*
 *   · *"không đưa mutation vào bản sản phẩm hoặc **đặt quota số test để lấy điểm**"*
 *
 * Vế cấm là lý do file này KHÔNG đếm test. Nó canh ba thứ khác:
 *
 *   1. bảy ranh giới trọng yếu vẫn còn nguyên trong mã sản phẩm (không mutation nào
 *      sót lại — đây là hậu quả trực tiếp của việc chạy mutation),
 *   2. năm phép biến đổi của thẻ vẫn có bài kiểm đứng sau,
 *   3. biên bản mutation còn đó và nói đúng sự thật.
 */

const EVAL = "packages/core/src/l2/evaluate.ts";
const INSP = "packages/core/src/inspect.ts";
const BB = "data/benchmark/mutation-b04.json";

/* ── 1 · Không mutation nào sót lại trong mã sản phẩm ──────────────────────── */

test("bảy ranh giới trọng yếu còn NGUYÊN trong mã sản phẩm", () => {
  /*
   * Mutation được ghi thẳng vào `evaluate.ts` và `inspect.ts` rồi hoàn nguyên. Một
   * ca hoàn nguyên hụt để lại `if (false)` trong engine luật — và bộ test vẫn xanh,
   * vì đó chính là thứ mutation đã chứng minh: có ranh giới không ai canh.
   *
   * Nên bài này đọc từng chuỗi ranh giới. Nó là bài kiểm duy nhất trong repo phát
   * hiện được một mutation bị bỏ quên.
   */
  const e = doc(EVAL);
  const i = doc(INSP);
  const canCo: Array<[string, string]> = [
    [EVAL, "if (!facts.simulationOk)"],
    [EVAL, "chuaHieuMaChamDuoc.length > 0"],
    [EVAL, "facts.lookupTables.some((t) => !t.resolved)"],
    [EVAL, "(facts.accountKhongDoDuoc ?? []).length > 0"],
    [EVAL, "THU_TU[a] >= THU_TU[b]"],
    [INSP, "level: l2.level"],
    [INSP, "mongDoi.type !== detectedPrimaryAction.type"],
  ];
  for (const [tep, chuoi] of canCo) {
    assert.ok(
      (tep === EVAL ? e : i).includes(chuoi),
      `${tep}: mất ranh giới \`${chuoi}\` — mutation chưa hoàn nguyên, hoặc mã đã đổi`,
    );
  }
});

test("KHÔNG còn dấu vết mutation trong engine luật", () => {
  // `if (false)` là hình dạng của mọi mutation tắt-nhánh dùng ở B04. Một cái sót lại
  // không làm test nào đỏ — nó chỉ lặng lẽ tắt một lớp fail-safe.
  for (const tep of [EVAL, INSP]) {
    assert.ok(!doc(tep).includes("if (false)"), `${tep} còn \`if (false)\` — mutation sót`);
  }
});

/* ── 2 · Năm phép biến đổi của thẻ đều có bài kiểm đứng sau ────────────────── */

test("năm phép biến đổi của thẻ B04 đều còn bài kiểm", () => {
  /*
   * Thẻ liệt kê đúng năm phép, và cả năm đã có bài từ trước B04 — việc của thẻ là
   * kiểm lại chứ không viết thêm. Bài này neo vào **câu chữ trong tên bài kiểm**, để
   * ai xoá một bài thì thấy ngay mình đang xoá phép nào.
   *
   * Grep theo từ khoá đã cho kết quả SAI ba lần khi rà việc này (báo "0 file" cho cả
   * năm phép trong khi bốn phép đã có bài). Nên neo vào chuỗi tên bài thật, lấy từ
   * chính file test.
   */
  const phep: Array<[string, string, string]> = [
    [
      "đổi symbol không đổi verdict",
      "packages/core/test/ten-token.test.ts",
      "KÝ HIỆU ĐỘC từ người phát hành token bị chặn y như từ dApp",
    ],
    [
      "lời khai khớp không hạ mức",
      "packages/core/test/inspect.test.ts",
      "expectedAction KHỚP ⇒ KHÔNG tắt cảnh báo nào",
    ],
    [
      "AI hỏng không đổi L2",
      "packages/core/test/inspect.test.ts",
      "L3 NÉM LỖI cũng không được làm sập lượt kiểm tra",
    ],
    [
      "mất account không làm an toàn hơn",
      "packages/core/test/do-khuyet.test.ts",
      "account thứ 101 trở đi KHÔNG được biến mất âm thầm",
    ],
    [
      "nhiều signer cần đúng đối tượng",
      "packages/core/test/sol.test.ts",
      "dApp trả phí, người dùng là signer khác ⇒ KHÔNG được safe",
    ],
  ];
  for (const [ten, tep, chuoi] of phep) {
    assert.ok(doc(tep).includes(chuoi), `mất bài kiểm cho phép biến đổi "${ten}" (${tep})`);
  }
});

test("`danhGia` vẫn nhận tập luật thay được — fail-safe phải kiểm được RIÊNG", () => {
  /*
   * Tham số thứ hai của `danhGia` là thứ duy nhất tách được fail-safe khỏi luật.
   * Mutation lộ ra: tắt fail-safe 3 mà **không bài nào trong 609 bài đỏ**, vì luật 10
   * bắt cùng điều kiện và nâng verdict trước.
   *
   * Bỏ tham số này đi thì bài "FAIL-SAFE 3 tự đứng được" hết viết được, và lớp
   * fail-safe quay lại trạng thái không ai canh.
   */
  assert.match(
    doc(EVAL),
    /export function danhGia\(facts: Facts, luat: Rule\[\] = LUAT\)/,
    "`danhGia` phải cho truyền tập luật, nếu không fail-safe không kiểm riêng được",
  );
  assert.match(
    doc("packages/core/test/l2.test.ts"),
    /FAIL-SAFE 3 tự đứng được/,
    "mất bài kiểm fail-safe 3 — ranh giới này quay lại không ai canh",
  );
});

/* ── 3 · Biên bản mutation nói đúng sự thật ────────────────────────────────── */

test("biên bản mutation còn đó và khớp số ranh giới đã kiểm", () => {
  assert.ok(existsSync(join(GOC, BB)), `thiếu biên bản mutation ${BB}`);
  const d = JSON.parse(doc(BB)) as {
    soRanhGioi: number;
    soCoCanh: number;
    ket: Array<{ ma: string; soBaiDo: number; soBaiDoTruocKhiVa?: number }>;
  };
  assert.equal(d.ket.length, d.soRanhGioi, "số ca ghi lại khác số ranh giới khai báo");
  assert.equal(d.soRanhGioi, 7, "B04 kiểm 7 ranh giới trọng yếu");
  assert.equal(
    d.soCoCanh,
    d.ket.filter((k) => k.soBaiDo > 0).length,
    "`soCoCanh` không khớp phép đếm thật",
  );
  assert.equal(d.soCoCanh, 7, "mọi ranh giới phải có ít nhất một bài đỏ khi bị mutation");
});

test("biên bản GIỮ LẠI số đo trước khi vá, không ghi đè thành đẹp", () => {
  /*
   * Áp lực trôi ở đây rất mạnh: biên bản "7/7 ngay từ đầu" nghe tốt hơn hẳn "5/7 rồi
   * vá thành 7/7". Nhưng con số 7/7 ban đầu sẽ là một câu nói dối, và nó xoá mất
   * đúng phần có giá trị — hai ranh giới từng không ai canh.
   *
   * Hai ca `daVa` phải giữ `soBaiDoTruocKhiVa: 0`.
   */
  const d = JSON.parse(doc(BB)) as {
    ghiChu?: string;
    ket: Array<{ ma: string; soBaiDo: number; soBaiDoTruocKhiVa?: number; daVa?: boolean }>;
  };
  const daVa = d.ket.filter((k) => k.daVa);
  assert.equal(daVa.length, 2, "hai ranh giới đã được vá: FS3 và EXP");
  for (const k of daVa) {
    assert.equal(
      typeof k.soBaiDoTruocKhiVa,
      "number",
      `${k.ma}: phải giữ số đo TRƯỚC khi vá, không xoá đi`,
    );
    assert.ok(
      k.soBaiDo > k.soBaiDoTruocKhiVa!,
      `${k.ma}: vá xong phải có THÊM bài đỏ (trước ${k.soBaiDoTruocKhiVa}, sau ${k.soBaiDo})`,
    );
  }

  /*
   * Hai ca vá không giống nhau, và biên bản phải giữ được sự khác nhau đó:
   *
   *   · FS3 trước khi vá: **0** bài đỏ — ranh giới hoàn toàn không ai canh.
   *   · EXP trước khi vá: **1** bài đỏ — có canh, nhưng chỉ canh được MỘT chiều
   *     (lệch ⇒ nâng). Chiều còn lại (khớp ⇒ không hạ) đảo được mà không ai thấy.
   *
   * Gộp cả hai thành "0 bài đỏ" sẽ nói quá mức hỏng của EXP; gộp thành "đã có canh"
   * sẽ giấu mất FS3. Nên assert từng ca theo đúng số của nó.
   */
  const theoMa = new Map(daVa.map((k) => [k.ma, k]));
  assert.equal(theoMa.get("FS3")?.soBaiDoTruocKhiVa, 0, "FS3 vốn KHÔNG bài nào canh");
  assert.equal(theoMa.get("EXP")?.soBaiDoTruocKhiVa, 1, "EXP vốn chỉ canh được một chiều");
  assert.match(d.ghiChu ?? "", /hoan nguyen|hoàn nguyên/i, "biên bản phải ghi việc hoàn nguyên");
});

/* ── 4 · Bộ đối kháng chạy được bằng một lệnh ──────────────────────────────── */

test("fuzz và probe nối vào npm — thẻ đòi 'thêm vào bộ hồi quy'", () => {
  /*
   * Trước B04, `fuzz-s02.ts` và bốn probe chỉ chạy được bằng cách gõ đường dẫn tay.
   * Một bộ đối kháng không có lệnh chạy là một bộ sẽ không ai chạy.
   */
  const s = (JSON.parse(doc("package.json")) as { scripts: Record<string, string> }).scripts;
  for (const ten of ["fuzz-s02", "probe-race", "probe-gui", "probe-neo", "probe-timer"]) {
    assert.ok(s[ten], `thiếu lệnh npm \`${ten}\``);
  }
  const gop = s["doi-khang"] ?? "";
  for (const ten of ["fuzz-s02", "probe-race", "probe-gui", "probe-neo", "probe-timer"]) {
    assert.ok(gop.includes(ten), `lệnh \`doi-khang\` bỏ sót \`${ten}\``);
  }
});

test("tài liệu mutation khớp NGUYÊN VĂN biên bản máy, không kể lại", () => {
  /*
   * `MUTATION-B04.md` là bản người đọc; `mutation-b04.json` là bản máy ghi. Hai bên
   * lệch nghĩa là một bên đang kể lại từ trí nhớ — và bên kể lại luôn là tài liệu,
   * vì biên bản do script sinh.
   *
   * Áp lực trôi cụ thể ở đây: chạy lại mutation sau khi sửa mã sẽ cho số khác (ví dụ
   * `caoHon` đỏ 56 bài hôm nay, thêm test thì thành 60), và tài liệu giữ số cũ trông
   * vẫn hợp lý. Không ai đối chiếu 7 con số bằng mắt.
   *
   * Ca đã vá ghi dạng `0 → 1`; ca chưa vá ghi số trần.
   */
  const d = JSON.parse(doc(BB)) as {
    ket: Array<{ ma: string; soBaiDo: number; soBaiDoTruocKhiVa?: number }>;
  };
  const md = doc("docs/bao-mat/MUTATION-B04.md");
  for (const k of d.ket) {
    const can =
      k.soBaiDoTruocKhiVa === undefined
        ? `**${k.soBaiDo}**`
        : `**${k.soBaiDoTruocKhiVa} → ${k.soBaiDo}**`;
    assert.ok(
      md.includes(can),
      `${k.ma}: tài liệu thiếu số \`${can}\` — biên bản và tài liệu đã lệch`,
    );
  }
});

test("fuzz có seed cố định VÀ lưu ca thu nhỏ", () => {
  /*
   * Thẻ: *"với fuzz, dùng seed cố định, thu nhỏ ca lỗi và thêm vào bộ hồi quy"*.
   *
   * Đo được rằng seed thật sự có tác dụng, không phải nhãn trống: cùng số lượt kiểm
   * (4031) nhưng seed 1 sinh 795.574 số ngẫu nhiên bắt đầu `8,0,135,251…` còn seed
   * 42 sinh 794.020 số bắt đầu `8,114,218,171…`.
   */
  const f = doc("scripts/ky-thuat/fuzz-s02.ts");
  assert.match(f, /SEED = Number\(process\.argv\[2\]/, "seed phải truyền được từ dòng lệnh");
  assert.match(f, /caThuNho/, "fuzz phải lưu ca thu nhỏ khi thấy vi phạm");
  assert.match(f, /process\.exit\(viPham\.length \? 1 : 0\)/, "vi phạm phải làm lệnh đỏ");
});
