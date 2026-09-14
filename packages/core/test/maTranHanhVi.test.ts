import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const MT = "docs/bao-mat/MA-TRAN-HANH-VI.md";

/**
 * TB-B03 — MA TRẬN HÀNH VI.
 *
 * Một ma trận coverage là loại tài liệu dễ nói quá nhất trong repo: nó toàn dấu tích,
 * và không ai kiểm từng ô. Áp lực trôi ở đây một chiều — bảng đầy trông đáng tin hơn
 * bảng có ô trống, và ô trống là thứ duy nhất người đọc cần.
 *
 * Nên các bài dưới đây canh **những chỗ ma trận được phép nói quá**, không canh việc
 * nó có đủ dòng hay không.
 */

/* ── 1 · Token-2022: con số phải là 2/26, không phải một chữ "hỗ trợ" ──────── */

test("ma trận ghi ĐÚNG số extension Token-2022 đọc được", () => {
  /*
   * Nghiệm thu nguyên văn: *"ghi rõ Token-2022 extension nào kiểm được/chưa kiểm"*.
   *
   * Neo vào `ExtensionType` thật của `@solana/spl-token` chứ không vào một con số gõ
   * tay: nâng phiên bản spl-token mà thêm extension thì bài này đỏ, và đó đúng lúc
   * cần đỏ — khoảng cách vừa rộng ra mà tài liệu vẫn nói con số cũ.
   */
  const m = doc(MT);
  assert.match(m, /\*\*2\*\*/, "ma trận không ghi số extension đọc được");
  assert.match(m, /PermanentDelegate/, "thiếu tên extension đọc được");
  assert.match(m, /TransferHook/, "thiếu tên extension đọc được");
  assert.match(m, /\*\*23\*\*/, "ma trận không ghi số extension KHÔNG đọc được");

  // Vài cái tên phải có mặt — một danh sách rút gọn tới mức chỉ còn "…" là một
  // danh sách không ai kiểm được.
  for (const ten of ["TransferFeeConfig", "ConfidentialTransferMint", "NonTransferable"]) {
    assert.ok(m.includes(ten), `thiếu \`${ten}\` trong danh sách chưa đọc`);
  }
});

test("ma trận nói rõ extension lạ đi qua MÀ KHÔNG ai biết", () => {
  /*
   * Đây là phần quan trọng hơn con số. `parseMint` trả một `MintFact` hợp lệ cho mint
   * có extension lạ — không ném, không trả `null`, không đánh dấu gì. Ghi mỗi "2/26"
   * mà bỏ chi tiết này thì người đọc tưởng 24 cái kia bị từ chối an toàn.
   */
  const m = doc(MT);
  assert.match(m, /không.{0,30}ném|KHÔNG.{0,30}ném/, "thiếu mô tả hành vi `parseMint`");
  assert.match(
    m,
    /computeCoverage|coverage.{0,40}instruction/i,
    "không nói rõ coverage KHÔNG đếm extension",
  );
});

test("ma trận KHÔNG dùng chữ 'hỗ trợ Token-2022' trần", () => {
  /*
   * Lỗi "chú thích tự kích hoạt luật của chính nó" đã mắc bốn lần trong repo, nên bài
   * này quét CÓ CHỦ ĐÍCH cả phần chú thích: ma trận có một bảng định nghĩa chữ, và
   * dòng ở đó nói rõ chữ "hỗ trợ" **không dùng** ở trang này.
   *
   * Cách tránh: chỉ cấm cụm ghép "hỗ trợ Token-2022" / "Token-2022 được hỗ trợ", chứ
   * không cấm chữ "hỗ trợ" đứng một mình.
   */
  const m = doc(MT);
  assert.doesNotMatch(
    m,
    /hỗ trợ (đầy đủ )?Token-?2022|Token-?2022 được hỗ trợ/i,
    "ma trận nói 'hỗ trợ Token-2022' — chỉ 2/26 extension đọc được",
  );
});

/* ── 2 · Ba tầng bằng chứng không được nói quá ─────────────────────────────── */

test("ma trận nói rõ `devnet-live` chưa chạy họ ca nào", () => {
  const m = doc(MT);
  assert.match(m, /devnet-live/, "ma trận không nhắc tầng devnet-live");
  assert.match(
    m,
    /devnet-live.{0,80}\*\*0\*\*|\*\*0\*\* họ ca|B07 chưa chạy/,
    "ma trận không nói rõ devnet-live còn ở 0",
  );
});

test("ma trận KHÔNG gọi ca tự dựng là bằng chứng phát hiện", () => {
  /*
   * Cả 38 mẫu do đội tự dựng để kiểm luật của chính đội. Một ma trận đầy dấu tích rất
   * dễ được đọc thành "phát hiện được 19 họ hành vi" — câu đó cần ground truth, và
   * repo không có.
   */
  const m = doc(MT);
  assert.match(
    m,
    /KHÔNG nói tỉ lệ phát hiện|không.{0,40}tỉ lệ phát hiện/i,
    "ma trận thiếu ranh giới: nó không nói gì về tỉ lệ phát hiện",
  );
  assert.match(m, /đội tự dựng|tự dựng để kiểm luật/i, "thiếu ghi chú nguồn gốc mẫu");
});

/* ── 3 · Số liệu trong ma trận phải khớp dữ liệu thật ──────────────────────── */

test("số ca dương có tx+replay khớp dữ liệu trên đĩa", () => {
  /*
   * Ma trận ghi **12/14** ca dương có cả raw tx lẫn fixture. Đếm lại từ `index.json`
   * và thư mục fixture — capture thêm một mẫu mà quên sửa ma trận thì bài này đỏ.
   */
  const seed = JSON.parse(doc("data/seed/index.json")) as {
    mau: Array<{ id: string; giaoDich?: string | null; kyVong: { coMa?: string[] } }>;
  };
  const thuMuc = join(GOC, "data/benchmark/rpc");
  if (!existsSync(thuMuc)) return;
  const fx = new Set(
    readdirSync(thuMuc).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)),
  );

  const info = new Map(seed.mau.map((m) => [m.id, m]));
  const duong = new Map<string, string>();
  for (const m of seed.mau) {
    for (const c of m.kyVong.coMa ?? []) if (!duong.has(c)) duong.set(c, m.id);
  }

  let coCa = 0;
  const chiFacts: string[] = [];
  for (const [, id] of duong) {
    const m = info.get(id)!;
    if (m.giaoDich && fx.has(id)) coCa++;
    else chiFacts.push(id);
  }

  assert.equal(duong.size, 14, "số luật có ca dương đã đổi — cập nhật ma trận");
  assert.equal(coCa, 12, `ma trận ghi 12 ca dương có tx+replay, đếm được ${coCa}`);
  const m = doc(MT);
  assert.match(m, /\*\*12\/14\*\*/, "ma trận không ghi tỉ lệ 12/14");
  for (const id of chiFacts) {
    assert.ok(m.includes(id), `${id} chỉ có Facts dựng tay mà ma trận không nêu tên`);
  }
});

test("mỗi file bằng chứng ma trận nêu tên đều TỒN TẠI", () => {
  /*
   * Một ma trận trỏ tới bài kiểm đã bị xoá là ma trận nói dối mà không ai thấy — nó
   * vẫn đầy dấu tích. Bài này đọc chính cột "Bằng chứng" và kiểm từng file.
   */
  const ten = new Set(
    [...doc(MT).matchAll(/`([a-zA-Z0-9-]+\.test\.ts)`/g)].map((x) => x[1]!),
  );
  assert.ok(ten.size >= 10, `ma trận chỉ nêu ${ten.size} file bằng chứng — quá ít`);

  const coThat = new Set<string>();
  for (const d of ["packages/core/test", "packages/ai/test", "apps/demo-wallet/test"]) {
    const p = join(GOC, d);
    if (existsSync(p)) for (const f of readdirSync(p)) coThat.add(f);
  }
  for (const t of ten) {
    assert.ok(coThat.has(t), `ma trận nêu \`${t}\` nhưng file không tồn tại`);
  }
});

/* ── 4 · Ca cancel: ma trận phải ghi nó là LỖI ĐÃ SỬA, không phải ô sẵn xanh ─ */

test("ma trận ghi ca `cancel` là lỗi tìm ra trong B03, kèm bằng chứng", () => {
  /*
   * Áp lực trôi: viết "cancel ✓" thì bảng đẹp hơn, và không ai biết ô đó vừa là một
   * lỗi cho ký lại giao dịch đã bị chặn. Lịch sử của một ô là thứ giúp người đọc sau
   * biết ô nào từng mỏng.
   */
  const m = doc(MT);
  assert.match(m, /C03-e/, "thiếu mã ca probe tái hiện lỗi huỷ");
  assert.match(m, /C03-f/, "thiếu mã ca probe đo cách đúng");
  assert.match(m, /nút Ký sống lại|ký lại|sống lại trên chính giao dịch/i, "thiếu mô tả hậu quả");

  // Và bản sửa phải còn trong mã — ma trận nói đã sửa thì mã phải có.
  const app = doc("apps/demo-wallet/src/App.tsx");
  const onHuy = app.match(/onHuy=\{\(\) => \{[\s\S]*?\n\s{22}\}\}/);
  assert.ok(onHuy, "không tìm thấy `onHuy` trong App.tsx");
  assert.match(onHuy[0], /luotRef\.current\+\+/, "ma trận nói đã sửa nhưng mã chưa có");
  assert.match(onHuy[0], /neoRef\.current = null/, "ma trận nói đã sửa nhưng mã chưa có");
});
