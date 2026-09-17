import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dungChiMuc } from "../src/bang-chung.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import type { Facts } from "../src/facts.ts";
import type { RuleHit } from "../src/l2/rules.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * CU-04 — CHỈ MỤC DỮ KIỆN VÀ PROVENANCE.
 *
 * Bài quan trọng nhất của thẻ là `treoLo`: một luật khai `bangChung` trỏ vào khoá
 * mà `Facts` không có. Trước CU-04 điều đó im lặng — `diff.ts` chỉ hỏi *"có luật
 * nào khai khoá này không"*, không hỏi *"khoá này có thật không"*.
 *
 * Một ID trỏ vào hư không tệ hơn không có ID: nó mời người đọc đi kiểm rồi để họ
 * gặp 404.
 */

const THU_MUC = "data/seed/facts";

/** `Facts` trong fixture có bigint tuần tự hoá thành `"123n"`. */
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

test("CU-04 · KHÔNG fixture nào có bằng chứng treo lơ lửng", () => {
  /*
   * Phép đo, không phải giả định. Chạy toàn bộ corpus qua engine thật rồi hỏi chỉ
   * mục xem mọi khoá luật khai có tồn tại không.
   *
   * Kết quả 0 chỉ có nghĩa khi phép kiểm ĐỎ ĐƯỢC — bài dưới lo việc đó.
   */
  const ds = moiFixture();
  assert.ok(ds.length > 0, "không tìm thấy fixture nào");

  const treo: Array<{ file: string; loi: unknown }> = [];
  let chay = 0;
  for (const f of ds) {
    let facts: Facts;
    try {
      facts = docFacts(`${THU_MUC}/${f}`);
    } catch {
      continue; // fixture hỏng là việc của bài khác
    }
    const l2 = danhGia(facts);
    const t = dungChiMuc(facts).treoLo(l2.hits);
    chay++;
    if (t.length) treo.push({ file: f, loi: t });
  }
  assert.ok(chay > 0, "không fixture nào chạy được");
  assert.deepEqual(treo, [], "có luật khai dữ kiện không tồn tại trong Facts");
});

test("CU-04 · treoLo BẮT ĐƯỢC khoá bịa — phép kiểm phải đỏ được", () => {
  /*
   * ĐỐI CHỨNG CHO BÀI TRÊN.
   *
   * `deepEqual(treo, [])` cũng xanh nếu `treoLo` luôn trả mảng rỗng vì một lỗi nào
   * đó. Bài này dựng đúng thứ nó phải bắt.
   */
  const f = moiFixture()[0];
  assert.ok(f, "cần ít nhất một fixture");
  const facts = docFacts(`${THU_MUC}/${f}`);
  const chiMuc = dungChiMuc(facts);

  const bia: RuleHit[] = [
    {
      ruleId: 99,
      level: "danger",
      reasonCode: "BIA",
      detail: "",
      bangChung: [{ loai: "tokenAccount", khoa: "KhongTonTai11111111111111111111111111111111" }],
    },
  ];
  const t = chiMuc.treoLo(bia);
  assert.equal(t.length, 1, "khoá bịa phải bị bắt");
  assert.equal(t[0]!.ruleId, 99);
  assert.equal(t[0]!.loai, "tokenAccount");
});

test("CU-04 · hai loại khác nhau KHÔNG đụng nhau dù trùng chuỗi", () => {
  /*
   * `BangChung` phân biệt `loai` có lý do: hai luật cùng nói về một token có thể
   * cầm hai khoá khác nhau (mint vs địa chỉ tài khoản). Nếu chỉ mục dùng chuỗi làm
   * khoá thì một mint và một tokenAccount trùng địa chỉ sẽ tra ra nhau — đúng lỗi
   * mà `rules.ts` đã ghi lại.
   */
  const facts: Facts = {
    ...khungFacts(),
    mints: [{ ...khungMint(), address: "TRUNG" }],
    tokenAccounts: [],
  };
  const chiMuc = dungChiMuc(facts);
  assert.ok(chiMuc.tra("mint", "TRUNG"), "mint phải tra được");
  assert.equal(chiMuc.tra("tokenAccount", "TRUNG"), null, "loại khác không được tra ra");
});

test("CU-04 · trạng thái sau đọc KHÔNG được ⇒ missing, không phải observed", () => {
  /*
   * Fail-safe của dự án: thiếu dữ liệu không bao giờ được trình bày như đã đo.
   *
   * Một tài khoản có `ownerBefore` mà không có `ownerAfter` KHÔNG phải "không đổi
   * chủ" — nó là "không đo được trạng thái sau". Gộp hai câu đó lại là đúng lỗi mà
   * fail-safe 4 của `evaluate.ts` sinh ra để chặn.
   */
  const f: Facts = {
    ...khungFacts(),
    tokenAccounts: [
      { ...khungTk(), address: "DU", ownerBefore: "A", ownerAfter: "B" },
      { ...khungTk(), address: "THIEU", ownerBefore: "A", ownerAfter: null },
    ],
  };
  const c = dungChiMuc(f);
  assert.equal(c.tra("tokenAccount", "DU")!.nguon, "observed");
  const thieu = c.tra("tokenAccount", "THIEU")!;
  assert.equal(thieu.nguon, "missing", "một phía vắng phải là missing");
  assert.match(thieu.lyDo ?? "", /không đọc được trạng thái sau/);
});

test("CU-04 · chương trình chưa decode ⇒ unsupported, KHÁC missing", () => {
  /*
   * Hai câu khác nhau với người đang quyết định có kiểm lại hay không:
   *   missing      — lượt này không đọc được, kiểm lại CÓ THỂ ra
   *   unsupported  — Custos chưa hỗ trợ, kiểm lại cũng KHÔNG ra
   */
  const f: Facts = {
    ...khungFacts(),
    instructions: [
      { index: 0, programId: "CO_DECODER", isInner: false, parentIndex: null,
        decoded: { kind: "transfer" }, fromLookupTable: false, chamTaiSanNguoiKy: true },
      { index: 1, programId: "LA_HOAC", isInner: false, parentIndex: null,
        decoded: null, fromLookupTable: false, chamTaiSanNguoiKy: true },
    ],
  };
  const c = dungChiMuc(f);
  assert.equal(c.tra("program", "CO_DECODER")!.nguon, "observed");
  const la = c.tra("program", "LA_HOAC")!;
  assert.equal(la.nguon, "unsupported");
  assert.match(la.lyDo ?? "", /chưa có decoder/);
});

test("CU-04 · SOL người dùng là `derived`, không phải `observed`", () => {
  /*
   * Nó là HIỆU của lamports trước và sau, không phải một trường RPC trả thẳng.
   * Gọi nó `observed` là nói quá về nguồn — và `nguon` tồn tại chính để không nói
   * quá về nguồn.
   */
  const c = dungChiMuc({ ...khungFacts(), simulationOk: true });
  assert.equal(c.tra("solNguoiDung", "")!.nguon, "derived");

  // Mô phỏng hỏng thì không có trạng thái sau để trừ.
  const d = dungChiMuc({ ...khungFacts(), simulationOk: false });
  assert.equal(d.tra("solNguoiDung", "")!.nguon, "missing");
});

test("CU-04 · vị trí lệnh giữ isInner và parentIndex, không suy diễn cây CPI", () => {
  /*
   * `InstructionFact` có `parentIndex` nhưng KHÔNG có stack depth. Dựng cây nhiều
   * tầng từ đó là đoán, và thẻ cấm đích danh: *"Chưa có stack depth thì không dựng
   * cây CPI đầy đủ bằng suy đoán"*. Giữ nguyên quan hệ đã đo được.
   */
  const f: Facts = {
    ...khungFacts(),
    instructions: [
      { index: 0, programId: "P", isInner: false, parentIndex: null,
        decoded: { kind: "x" }, fromLookupTable: false, chamTaiSanNguoiKy: false },
      { index: 1, programId: "P", isInner: true, parentIndex: 0,
        decoded: { kind: "y" }, fromLookupTable: false, chamTaiSanNguoiKy: false },
    ],
  };
  const m = dungChiMuc(f).tra("program", "P")!;
  assert.equal(m.lenh?.length, 2);
  assert.deepEqual(m.lenh![0], { index: 0, isInner: false, parentIndex: null });
  assert.deepEqual(m.lenh![1], { index: 1, isInner: true, parentIndex: 0 });
});

test("CU-04 · module chỉ mục KHÔNG chạm mạng — đọc mã", () => {
  /*
   * Bật chẩn đoán không được thêm một lượt RPC nào, và cách chắc chắn nhất là
   * module này không có đường nào gọi mạng. Bài đọc mã yếu hơn bài chạy thật,
   * nhưng nó chặn được việc âm thầm thêm một lời gọi vào đây.
   */
  const s = doc("packages/core/src/bang-chung.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const cam of ["Connection", "fetch(", "await ", "async "]) {
    assert.ok(!s.includes(cam), `bang-chung.ts chứa \`${cam}\` — chỉ mục không được chạm mạng`);
  }
});

/* ── khung dữ liệu tối thiểu ──────────────────────────────────────────────── */

function khungFacts(): Facts {
  return {
    signer: "VI",
    nguoiKy: ["VI"],
    nguoiDungDuocChiDinh: true,
    phiUocTinh: 5000n,
    phiChinhXac: true,
    simulationOk: true,
    simulationError: null,
    accounts: [],
    tokenAccounts: [],
    mints: [],
    solDelta: {},
    tuoiViNhan: {},
    instructions: [],
    lookupTables: [],
    coverage: { analyzed: 0, total: 0, unverifiedPrograms: 0 },
  } as unknown as Facts;
}

/*
 * Khung tối thiểu, ép kiểu qua `Facts[...]` chứ không qua `never`.
 *
 * Bản đầu dùng `as never` và typecheck đỏ ngay: `never` không spread được. Đó là
 * lỗi đúng — `as never` nói với trình biên dịch rằng giá trị này không bao giờ
 * tồn tại, trong khi ý định là "đây là một bản ghi hợp lệ, chỉ rút gọn".
 */
function khungTk(): Facts["tokenAccounts"][number] {
  return {
    address: "", mint: "M", ownerBefore: null, ownerAfter: null,
    amountBefore: 0n, amountAfter: 0n,
    delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
    closeAuthorityBefore: null, closeAuthorityAfter: null,
  } as Facts["tokenAccounts"][number];
}

function khungMint(): Facts["mints"][number] {
  return {
    address: "", kyHieu: null, decimals: 0,
    mintAuthority: null, freezeAuthority: null,
    permanentDelegate: null, transferHookProgramId: null, isToken2022: false,
  } as Facts["mints"][number];
}
