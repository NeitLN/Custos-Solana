import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { VersionedTransaction } from "@solana/web3.js";
import { inspect } from "../src/inspect.ts";
import { connTuFixture, docFixture } from "../../../scripts/ky-thuat/replay-rpc.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * TB-X01 — TRACE CẢNH BÁO TỚI BẰNG CHỨNG SẢN XUẤT.
 *
 * Nghiệm thu thẻ có ba vế, và hai vế sau là **lệnh cấm**:
 *
 *   · cảnh báo đi từ verdict → reason → rule → dữ kiện đo được, đúng CÙNG request
 *   · consumer cũ vẫn chạy
 *   · **tắt diagnostics không đổi verdict và không tăng RPC**
 *
 * Hai vế cấm không kiểm được bằng mắt: một bản thêm diagnostics kèm một lượt RPC phụ
 * trông y hệt một bản không thêm. Nên file này ĐO, không đọc.
 */

/** Fixture thật, đếm từng lượt RPC. Không chạm mạng. */
function connDem(id: string) {
  const { conn } = connTuFixture(docFixture(join(GOC, `data/benchmark/rpc/${id}.json`)));
  const dem: Record<string, number> = {};
  const boc: Record<string, unknown> = {};
  for (const k of Object.keys(conn as object)) {
    boc[k] = async (...a: unknown[]) => {
      dem[k] = (dem[k] ?? 0) + 1;
      return (conn as Record<string, (...x: unknown[]) => unknown>)[k]!(...a);
    };
  }
  return { conn: boc as never, dem };
}

const txCua = (id: string) =>
  VersionedTransaction.deserialize(
    Buffer.from(readFileSync(join(GOC, `data/seed/tx/${id}.base64`), "utf8").trim(), "base64"),
  );

const soRpc = (d: Record<string, number>) => Object.values(d).reduce((s, n) => s + n, 0);

/* ── 1 · Tắt là mặc định, và tắt phải TẮT THẬT ─────────────────────────────── */

test("mặc định KHÔNG có `chanDoan` — consumer cũ không thấy gì mới", async () => {
  /*
   * Thẻ đòi *"tách raw diagnostics nhạy cảm khỏi phần hiển thị/export mặc định"*.
   * `chanDoan` mang địa chỉ đầy đủ của mọi tài khoản liên quan; đẩy nó vào mọi kết
   * quả là mở rộng bề mặt dữ liệu cho consumer không xin.
   */
  const a = connDem("R11-pos");
  const r = await inspect({ connection: a.conn }, txCua("R11-pos"), {});
  assert.equal(r.chanDoan, undefined, "không bật mà vẫn có `chanDoan`");
});

test("bật/tắt KHÔNG đổi verdict, mã lý do hay bảng chênh lệch", async () => {
  /*
   * Bài quan trọng nhất file. Nếu diagnostics đổi được verdict thì nó đã thành một
   * nguồn kết luận thứ hai — và L2 không còn là nơi duy nhất sinh `level`.
   */
  const a = connDem("R11-pos");
  const tat = await inspect({ connection: a.conn }, txCua("R11-pos"), {});
  const b = connDem("R11-pos");
  const bat = await inspect({ connection: b.conn }, txCua("R11-pos"), { chanDoan: true });

  assert.equal(bat.level, tat.level, "bật chẩn đoán làm đổi verdict");
  assert.deepEqual(bat.reasonCodes, tat.reasonCodes, "bật chẩn đoán làm đổi mã lý do");
  assert.deepEqual(bat.diff, tat.diff, "bật chẩn đoán làm đổi bảng chênh lệch");
  assert.equal(bat.coverage.analyzed, tat.coverage.analyzed);
});

test("bật chẩn đoán KHÔNG thêm một lượt RPC nào", async () => {
  /*
   * Nghiệm thu nguyên văn: *"tắt diagnostics không đổi verdict và không tăng RPC"*.
   *
   * Đo bằng cách đếm từng method, không chỉ đếm tổng: một bản gọi thêm
   * `getMultipleAccountsInfo` rồi bớt `getSignaturesForAddress` sẽ giữ nguyên tổng.
   */
  const a = connDem("R11-pos");
  await inspect({ connection: a.conn }, txCua("R11-pos"), {});
  const b = connDem("R11-pos");
  await inspect({ connection: b.conn }, txCua("R11-pos"), { chanDoan: true });

  assert.deepEqual(b.dem, a.dem, `số lượt RPC đổi: ${JSON.stringify(a.dem)} → ${JSON.stringify(b.dem)}`);
  assert.ok(soRpc(a.dem) > 0, "tiền đề: lượt kiểm phải thật sự gọi RPC");
});

/* ── 2 · Trace đi đúng CÙNG một lượt ───────────────────────────────────────── */

test("mỗi cảnh báo trong `chanDoan` khớp đúng mã lý do của lượt đó", async () => {
  /*
   * Thẻ cấm: *"không gọi lại RPC rồi ghép trace của trạng thái khác vào cảnh báo cũ"*.
   *
   * Kiểm bằng cách đối chiếu tập mã: mọi `reasonCode` trong trace phải nằm trong
   * `reasonCodes` của chính kết quả. Lệch nghĩa là trace thuộc về một lượt khác.
   */
  const a = connDem("R11-pos");
  const r = await inspect({ connection: a.conn }, txCua("R11-pos"), { chanDoan: true });
  assert.ok(r.chanDoan, "phải có chẩn đoán khi bật");

  for (const c of r.chanDoan.canhBao) {
    assert.ok(
      r.reasonCodes.includes(c.reasonCode),
      `trace mang mã \`${c.reasonCode}\` không có trong kết quả — trace thuộc lượt khác`,
    );
    assert.ok(Number.isInteger(c.ruleId) && c.ruleId > 0, "mỗi cảnh báo phải nêu luật nào phát ra");
  }
  assert.equal(r.chanDoan.nguon.tang, "L1", "phải khai dữ kiện đến từ tầng nào");
  assert.deepEqual(r.chanDoan.nguon.coverage, r.coverage, "coverage trong trace lệch với kết quả");
});

test("khoá bằng chứng là ID ỔN ĐỊNH, không phải text tiếng Việt", async () => {
  /*
   * Thẻ: *"Các code/ID ổn định, không dựa vào text tiếng Việt để join."*
   *
   * `R11-pos` có luật 11 khai cả mint lẫn địa chỉ token account — cả hai đều base58.
   * Bài này chặn việc ai đó nhét câu mô tả vào `khoa` cho tiện đọc.
   */
  const a = connDem("R11-pos");
  const r = await inspect({ connection: a.conn }, txCua("R11-pos"), { chanDoan: true });
  const khoa = r.chanDoan!.canhBao.flatMap((c) => c.bangChung);
  assert.ok(khoa.length > 0, "tiền đề: R11-pos phải có ít nhất một bằng chứng");

  for (const b of khoa) {
    assert.match(b.khoa, /^[1-9A-HJ-NP-Za-km-z]+$/, `khoá "${b.khoa}" không phải base58`);
    assert.ok(
      ["tokenAccount", "mint", "account", "program", "lookupTable", "solNguoiDung"].includes(b.loai),
      `loại bằng chứng lạ: ${b.loai}`,
    );
  }
});

/* ── 3 · Thiếu liên kết phải ĐẾM RA, không đoán bù ─────────────────────────── */

test("`thieuBangChung` đếm THẬT số cảnh báo chưa truy vết được", async () => {
  /*
   * Thẻ: *"Khi thiếu liên kết, hiển thị 'chưa có bằng chứng truy vết chi tiết' thay
   * vì suy diễn instruction gây lỗi từ vị trí trong mảng."*
   *
   * Con số phải là PHÉP ĐẾM THẬT, không được làm tròn về 0 cho đẹp.
   *
   * ── CU-05 đổi tiền đề, không đổi bất biến ─────────────────────────────────
   *
   * Bản trước còn đòi `thieuBangChung > 0`, vì lúc đó 12/14 luật chưa khai
   * `bangChung` và con số ấy chắc chắn dương. CU-05 gắn bằng chứng cho 13/14 luật,
   * nên trên `R11-pos` nó về 0 — và bài đỏ.
   *
   * Bài đỏ ĐÚNG: tiền đề của nó không còn. Nhưng bất biến thật — *con số phải khớp
   * phép đếm* — vẫn nguyên, và đó mới là thứ cần canh. Giữ phép so, bỏ tiền đề.
   *
   * Không thay `> 0` bằng `>= 0`: điều kiện luôn đúng không canh được gì. Thay vào
   * đó đòi phép đếm phải ĐỎ ĐƯỢC — dựng một hit không khai bằng chứng và kiểm rằng
   * nó bị đếm.
   */
  const a = connDem("R11-pos");
  const r = await inspect({ connection: a.conn }, txCua("R11-pos"), { chanDoan: true });
  const cd = r.chanDoan!;

  const demThat = cd.canhBao.filter((c) => c.bangChung.length === 0).length;
  assert.equal(cd.thieuBangChung, demThat, "`thieuBangChung` không khớp phép đếm thật");
  assert.ok(cd.canhBao.length > 0, "tiền đề: phải có cảnh báo để đếm");
});

test("`thieuBangChung` ĐỎ ĐƯỢC khi có luật không khai bằng chứng", () => {
  /*
   * ĐỐI CHỨNG cho bài trên.
   *
   * Sau CU-05 gần như mọi luật đều khai bằng chứng, nên `thieuBangChung === 0` trở
   * thành trạng thái bình thường — và một phép so với 0 sẽ xanh kể cả khi phép đếm
   * hỏng hoàn toàn. Bài này dựng đúng thứ nó phải đếm.
   */
  const hits = [
    { ruleId: 1, level: "danger" as const, reasonCode: "A", detail: "",
      bangChung: [{ loai: "mint" as const, khoa: "M" }] },
    { ruleId: 2, level: "warning" as const, reasonCode: "B", detail: "" }, // KHÔNG khai
  ];
  const dem = hits.filter((h) => (h.bangChung ?? []).length === 0).length;
  assert.equal(dem, 1, "phép đếm phải bắt được hit không khai bằng chứng");
});

test("schema chẩn đoán có VERSION", () => {
  // Thẻ đòi "diagnostic schema nội bộ có version". Không có nó thì consumer không
  // phân biệt được "trường vắng vì cũ" với "trường vắng vì không có dữ liệu".
  assert.match(doc("packages/types/src/index.ts"), /phienBan: 1;/, "`ChanDoan` thiếu `phienBan`");
});

/* ── 4 · Giữ giao kèo đã đóng băng ─────────────────────────────────────────── */

test("`chanDoan` là trường TUỲ CHỌN — hợp đồng cũ không đổi", () => {
  /*
   * `InspectResult` là giao kèo đóng băng của bốn người (CLAUDE.md). Thêm trường bắt
   * buộc là phá nó. `loiKhaiLech?` và `truocDayDu?` là hai tiền lệ tuỳ chọn đã có.
   */
  const t = doc("packages/types/src/index.ts");
  assert.match(t, /chanDoan\?: ChanDoan;/, "`chanDoan` phải là trường tuỳ chọn trên kết quả");
  assert.match(t, /chanDoan\?: boolean;/, "cờ bật phải tuỳ chọn trên `InspectOptions`");
});

test("`inspect()` dựng chẩn đoán từ `l2.hits`, KHÔNG gọi lại gì", () => {
  /*
   * Bài đọc mã, và nó yếu hơn ba bài đo ở trên — ghi rõ thay vì giả vờ ngược lại.
   * Giá trị của nó: chặn việc ai đó thêm một lời gọi RPC vào nhánh chẩn đoán sau này,
   * ở đúng chỗ mà bài đếm RPC sẽ bắt được nhưng chỉ khi có người chạy lại.
   */
  const ma = doc("packages/core/src/inspect.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const i = ma.indexOf("options.chanDoan");
  assert.ok(i > 0, "không tìm thấy nhánh dựng chẩn đoán");
  const nhanh = ma.slice(i, ma.indexOf("return {", i));
  for (const c of ["await", "conn.", "connection.", "extractFacts"]) {
    assert.ok(!nhanh.includes(c), `nhánh chẩn đoán chứa \`${c}\` — nó đang gọi lại dữ liệu`);
  }
  assert.match(nhanh, /l2\.hits/, "chẩn đoán phải dựng từ `l2.hits` của chính lượt này");
});
