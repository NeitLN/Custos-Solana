import { test } from "node:test";
import assert from "node:assert/strict";
import { inspect } from "../src/inspect.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungBangChenhLech, dinhDangSo, NHAN, NHAN_EN } from "../src/diff.ts";
import { cungLoaiHanhDong } from "../src/inspect.ts";
import { danhGiaPolicy } from "../src/policy.ts";
import { xetLo } from "../src/batch.ts";
import { REASON } from "../src/constants.ts";
import type { Facts, TokenAccountFact, MintFact } from "../src/facts.ts";
import { dienGiaiKhongAI } from "../../ai/src/index.ts";
import { validateInspectResult } from "../../types/src/validate.ts";
import { dungHienTruongGia } from "../../../scripts/hienTruongGia.ts";

/**
 * `locale: "en"` — chế độ tiếng Anh của SDK.
 *
 * Ba điều được canh ở đây, theo thứ tự quan trọng:
 *   1. Ngôn ngữ KHÔNG BAO GIỜ đổi `level`, `reasonCodes`, `coverage` hay màu `severity`.
 *   2. Với "en", chữ người dùng thấy (nhãn, giá trị, diễn giải) là tiếng Anh, số theo en-US.
 *   3. "vi" (mặc định) giữ nguyên từng byte như trước.
 */

const TOI = "ViNguoiKy1111111111111111111111111111111111";
const KE = "KeTanCong9xQe1111111111111111111111111111111";
const DEMO = "MintDEMO1111111111111111111111111111111111";

const mint = (a: string): MintFact => ({
  address: a, mintAuthority: null, freezeAuthority: null, permanentDelegate: null,
  transferHookProgramId: null, isToken2022: false, decimals: 6, kyHieu: null,
});

function ta(p: Partial<TokenAccountFact> = {}): TokenAccountFact {
  return {
    address: "ATA_NAN_NHAN_1111111111111111111111111111", mint: DEMO,
    ownerBefore: TOI, ownerAfter: TOI,
    amountBefore: 500_000_000n, amountAfter: 500_000_000n,
    delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
    closeAuthorityBefore: null, closeAuthorityAfter: null,
    programOwnerBefore: "Tok", programOwnerAfter: "Tok",
    ...p,
  };
}

function facts(p: Partial<Facts> = {}): Facts {
  return {
    signer: TOI, simulationOk: true, simulationError: null,
    accounts: [], tokenAccounts: [], mints: [mint(DEMO)],
    solDelta: { [TOI]: -5_000n },
    tuoiViNhan: {},
    accountKhongDoDuoc: [],
    nguoiKy: [TOI],
    nguoiDungDuocChiDinh: false,
    phiUocTinh: 5_000n, phiChinhXac: true, instructions: [], lookupTables: [],
    coverage: { analyzed: 2, total: 2, unverifiedPrograms: 0 },
    ...p,
  };
}

/** Kiểu SolBonus: chuyển MỘT NỬA số DEMO đi, và đổi chủ tài khoản token sang ví lạ. */
const factsSolBonus = () =>
  facts({
    tokenAccounts: [
      ta({ ownerAfter: KE, amountBefore: 500_000_000n, amountAfter: 250_000_000n }),
      ta({
        address: "ATA_KE_TAN_CONG_11111111111111111111111111", ownerBefore: KE, ownerAfter: KE,
        amountBefore: 0n, amountAfter: 250_000_000n,
      }),
    ],
  });

/** Ký tự có dấu tiếng Việt — có mặt trong chữ "en" là đang lọt tiếng Việt. */
const CO_DAU = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

test("dinhDangSo — en-US: chấm thập phân, phẩy phân nhóm; vi mặc định không đổi", () => {
  assert.equal(dinhDangSo(1_234_567_500_000n, 6, "en"), "1,234,567.5");
  assert.equal(dinhDangSo(1_234_567_500_000n, 6), "1.234.567,5");
  assert.equal(dinhDangSo(5_000n, 9, "en"), "0.000005");
  assert.equal(dinhDangSo(0n, 6, "en"), "0.0");
  assert.equal(dinhDangSo(-1_500n, 3, "en"), "−1.5");
  assert.equal(dinhDangSo(12_345n, 0, "en"), "12,345");
});

test("NHAN_EN — cùng bộ khoá với NHAN, và SO_DU_SOL không trùng tiền tố SO_DU", () => {
  assert.deepEqual(Object.keys(NHAN_EN).sort(), Object.keys(NHAN).sort());
  assert.ok(!NHAN_EN.SO_DU_SOL.startsWith(NHAN_EN.SO_DU));
  for (const v of Object.values(NHAN_EN)) assert.doesNotMatch(v, CO_DAU);
});

test("SolBonus (chuyển nửa + đổi chủ) — en: bảng tiếng Anh, level danger như vi", async () => {
  const f = factsSolBonus();
  const l2 = danhGia(f);
  assert.equal(l2.level, "danger");
  assert.ok(l2.reasonCodes.includes(REASON.SET_AUTHORITY_ACCOUNT_OWNER));

  const en = dungBangChenhLech(f, l2.hits, { [DEMO]: "DEMO" }, "en");
  const vi = dungBangChenhLech(f, l2.hits, { [DEMO]: "DEMO" });

  const soDu = en.find((d) => d.label === "Balance of DEMO after signing");
  assert.ok(soDu, `thiếu dòng số dư: ${en.map((d) => d.label).join(" | ")}`);
  assert.equal(soDu.before, "500.0");
  assert.equal(soDu.after, "250.0");

  const chu = en.find((d) => d.label === "Token account owner: DEMO");
  assert.ok(chu, "thiếu dòng đổi chủ");
  assert.equal(chu.before, "You");
  assert.equal(chu.after, "KeTa…1111");
  assert.equal(chu.severity, "danger");

  const phi = en.find((d) => d.label === "Network fee");
  assert.ok(phi);
  assert.equal(phi.after, "0.000005 SOL");

  // Cùng số dòng, cùng màu, cùng số thô — chỉ chữ khác.
  assert.equal(en.length, vi.length);
  assert.deepEqual(en.map((d) => d.severity), vi.map((d) => d.severity));
  assert.deepEqual(en.map((d) => d.soLieu), vi.map((d) => d.soLieu));
  for (const d of en) {
    assert.doesNotMatch(`${d.label} ${d.before} ${d.after}`, CO_DAU, `lọt tiếng Việt: ${d.label}`);
  }

  const r = await dienGiaiKhongAI(f, l2.reasonCodes, "en", { kyHieuToken: { [DEMO]: "DEMO" } });
  assert.equal(r.detectedPrimaryAction?.type, "transfer token");
  assert.match(r.explanation, /^Detected primary action: send DEMO\./);
  assert.match(r.explanation, /But the transaction also changes the token account owner to KeTa…1111/);
  assert.equal(r.aiAdvisory, "review_required");
  assert.doesNotMatch(r.explanation, CO_DAU);
});

test("Cấp quyền rút (approve) — en: dòng Delegate + hành động 'approve delegate'", async () => {
  const f = facts({
    tokenAccounts: [ta({ delegateAfter: KE, delegatedAmountAfter: 981_000_000n })],
  });
  const l2 = danhGia(f);
  const en = dungBangChenhLech(f, l2.hits, undefined, "en");
  const uyQuyen = en.find((d) => d.label.startsWith(NHAN_EN.DUOC_PHEP_RUT));
  assert.ok(uyQuyen, `thiếu dòng uỷ quyền: ${en.map((d) => d.label).join(" | ")}`);
  assert.equal(uyQuyen.before, "no one");
  assert.equal(uyQuyen.after, "KeTa…1111 — up to 981.0");

  const r = await dienGiaiKhongAI(f, l2.reasonCodes, "en", {});
  assert.equal(r.detectedPrimaryAction?.type, "approve delegate");
  assert.match(r.explanation, /Detected primary action: allow wallet KeTa…1111 to withdraw/);
  assert.doesNotMatch(r.explanation, CO_DAU);

  // Lời khai tiếng Anh của dApp vẫn khớp đúng như với bản tiếng Việt.
  assert.ok(cungLoaiHanhDong("approve", "approve delegate"));
  assert.ok(cungLoaiHanhDong("transfer", "transfer token"));
  assert.ok(cungLoaiHanhDong("transfer", "transfer SOL"));
  assert.ok(!cungLoaiHanhDong("airdrop", "receive token"), "airdrop vẫn KHÔNG khớp nhận token");
});

test("Thiếu dữ liệu (mô phỏng hỏng) — en vẫn 'warning', chữ tiếng Anh, không nói 'safe'", async () => {
  const f = facts({ simulationOk: false, simulationError: "x", tokenAccounts: [ta()] });
  const l2 = danhGia(f);
  assert.equal(l2.level, "warning");
  assert.ok(l2.reasonCodes.includes(REASON.MO_PHONG_HONG));

  const r = await dienGiaiKhongAI(f, l2.reasonCodes, "en", {});
  assert.match(r.explanation, /We could not simulate this transaction/);
  assert.doesNotMatch(r.explanation, /\bsafe\b|\bsecure\b|guarantee/i);
  assert.doesNotMatch(r.explanation, CO_DAU);
});

test("Tài khoản không đọc được — dòng 'Parts we could not read' bằng tiếng Anh", () => {
  const f = facts({ tokenAccounts: [ta()], accountKhongDoDuoc: ["A", "B"] });
  const en = dungBangChenhLech(f, danhGia(f).hits, undefined, "en");
  const d = en.find((x) => x.label === "Parts we could not read");
  assert.ok(d);
  assert.equal(d.after, "2 accounts whose post-signing state could not be read");
  assert.equal(d.severity, "warning");
});

const HT = dungHienTruongGia();

test("inspect() đầu-cuối — 'en' và 'vi' cho CÙNG level, reasonCodes, coverage, severity", async () => {
  const chay = (locale: "vi" | "en") =>
    inspect(
      { connection: HT.rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
      HT.txTanCong(),
      { locale, chanDoan: true },
    );
  const vi = await chay("vi");
  const en = await chay("en");

  assert.deepEqual(validateInspectResult(en), []);
  assert.equal(en.level, "danger");
  assert.equal(en.level, vi.level);
  assert.deepEqual(en.reasonCodes, vi.reasonCodes);
  assert.deepEqual(en.coverage, vi.coverage);
  assert.equal(en.aiAdvisory, vi.aiAdvisory);
  assert.deepEqual(en.diff.map((d) => d.severity), vi.diff.map((d) => d.severity));
  assert.deepEqual(en.chanDoan?.canhBao.map((c) => c.reasonCode), vi.chanDoan?.canhBao.map((c) => c.reasonCode));

  // vi giữ đúng chữ cũ.
  assert.ok(vi.diff.some((d) => d.label.startsWith("Số dư") && d.before === "500,0" && d.after === "0,0"));
  assert.ok(vi.diff.some((d) => d.label.startsWith("Chủ sở hữu") && d.before === "Bạn"));

  // en là tiếng Anh.
  assert.ok(en.diff.some((d) => d.label.startsWith("Balance of ") && d.before === "500.0" && d.after === "0.0"));
  assert.ok(en.diff.some((d) => d.label.startsWith("Token account owner: ") && d.before === "You"));
  for (const d of en.diff) assert.doesNotMatch(`${d.label} ${d.before} ${d.after}`, CO_DAU);
  assert.doesNotMatch(en.explanation, CO_DAU);
  assert.ok(en.explanation.length > 0);
  for (const c of en.chanDoan?.canhBao ?? []) {
    for (const b of c.bangChung) if (b.lyDo) assert.doesNotMatch(b.lyDo, CO_DAU);
  }
});

test("locale lạ (JS thuần) rơi về 'vi', không làm vỡ lượt kiểm", async () => {
  const r = await inspect(
    { connection: HT.rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    HT.txTanCong(),
    { locale: "fr" as unknown as "vi" },
  );
  assert.equal(r.level, "danger");
  assert.ok(r.diff.some((d) => d.label.startsWith("Số dư")));
});

test("policy và lô — câu tiếng Anh giữ nguyên mức trung thực", () => {
  const p = danhGiaPolicy(
    { level: "safe", coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 }, phienConDung: true },
    undefined,
    "en",
  );
  assert.equal(p.quyetDinh, "allow");
  assert.match(p.cau, /NOT a guarantee of safety/);
  assert.match(p.cau, /Normal/);

  const lo = xetLo([], undefined, undefined, "en");
  assert.equal(lo.ok, false);
  if (!lo.ok) assert.equal(lo.loi, "empty batch");
});
