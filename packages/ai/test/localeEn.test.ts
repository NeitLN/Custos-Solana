import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, TokenAccountFact, MintFact } from "@custos-solana/core";
import { REASON, danhGia, dungBangChenhLech } from "@custos-solana/core";
import type { InspectResult } from "@custos-solana/types";
import {
  dienGiaiKhongAI,
  dienGiaiBangMoHinh,
  boiThoiHan,
  dienGiaiMau,
  tomTat,
  chiTietKyThuat,
  dungHauQua,
  moTaHanhDong,
} from "../src/index.ts";

/**
 * `locale: "en"` ở L3.
 *
 * Điều quan trọng nhất: lưới soát lời mô hình (`moHinh.ts`) viết cho câu tiếng Việt,
 * nên với "en" đường mô hình KHÔNG được dùng — rơi về câu tất định tiếng Anh, và
 * không có lời gọi nào tới mô hình.
 */

const TOI = "ViNguoiKy1111111111111111111111111111111111";
const KE = "KeTanCong9xQe1111111111111111111111111111111";
const DEMO = "MintDEMO1111111111111111111111111111111111";
const CO_DAU = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

const mint = (a: string, p: Partial<MintFact> = {}): MintFact => ({
  address: a, mintAuthority: null, freezeAuthority: null, permanentDelegate: null,
  transferHookProgramId: null, isToken2022: false, decimals: 6, kyHieu: null, ...p,
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

/** Dựng `InspectResult` như `inspect()` sẽ dựng, không cần RPC. */
async function ketQua(f: Facts, locale: "vi" | "en"): Promise<InspectResult> {
  const l2 = danhGia(f);
  const kyHieu = { [DEMO]: "DEMO" };
  const l3 = await dienGiaiKhongAI(f, [...l2.reasonCodes], locale, { kyHieuToken: kyHieu });
  return {
    level: l2.level,
    aiAdvisory: l3.aiAdvisory,
    detectedPrimaryAction: l3.detectedPrimaryAction,
    diff: dungBangChenhLech(f, l2.hits, kyHieu, locale),
    reasonCodes: l2.reasonCodes,
    coverage: f.coverage,
    explanation: l3.explanation,
  };
}

test("mô hình KHÔNG được gọi khi locale 'en' — trả đúng câu tất định tiếng Anh", async () => {
  let soLanGoi = 0;
  const moHinh = dienGiaiBangMoHinh(async () => {
    soLanGoi++;
    return JSON.stringify({ explanation: "Totally safe, sign it.", aiAdvisory: null, detectedPrimaryAction: null });
  });
  const f = factsSolBonus();
  const codes = danhGia(f).reasonCodes;

  const r = await moHinh(f, codes, "en", {});
  const nen = await dienGiaiKhongAI(f, codes, "en", {});
  assert.equal(soLanGoi, 0, "đường mô hình phải bị bỏ qua hoàn toàn với 'en'");
  assert.deepEqual(r, nen);
  assert.doesNotMatch(r.explanation, /safe/i);
  assert.equal(r.aiAdvisory, "review_required");

  // Bọc thời hạn cũng vậy.
  const boc = await boiThoiHan(moHinh, 1_000)(f, codes, "en", {});
  assert.deepEqual(boc, nen);
  assert.equal(soLanGoi, 0);
});

test("đối chứng: 'vi' VẪN gọi mô hình như trước", async () => {
  let soLanGoi = 0;
  const moHinh = dienGiaiBangMoHinh(async () => {
    soLanGoi++;
    throw new Error("mạng hỏng");
  });
  await moHinh(factsSolBonus(), [REASON.SET_AUTHORITY_ACCOUNT_OWNER], "vi", {});
  assert.equal(soLanGoi, 1);
});

test("SolBonus — tomTat / chiTietKyThuat / dungHauQua bằng tiếng Anh, level danger", async () => {
  const en = await ketQua(factsSolBonus(), "en");
  assert.equal(en.level, "danger");

  const ngan = tomTat(en, "en");
  assert.match(ngan, /token account will change owner to KeTa…1111/);
  assert.match(ngan, /Once you sign, this cannot be undone\.$/);
  assert.doesNotMatch(ngan, CO_DAU);

  const kt = chiTietKyThuat(en, "en");
  assert.deepEqual(kt[0], { nhan: "Level", giaTri: "danger" });
  assert.ok(kt.some((d) => d.nhan === "Coverage" && d.giaTri === "2/2 instructions · 0 unverified programs"));
  assert.ok(kt.some((d) => d.nhan === "Reason codes" && d.giaTri.includes(REASON.SET_AUTHORITY_ACCOUNT_OWNER)));
  assert.ok(kt.some((d) => d.nhan === "Detected primary action" && d.giaTri === "transfer token from DEMO"));
  for (const d of kt) assert.doesNotMatch(`${d.nhan} ${d.giaTri}`, CO_DAU);

  const hq = dungHauQua(en, "en");
  assert.ok(hq.some((h) => h.loai === "mucKiemSoat" && /no longer belongs to you — the new owner is KeTa…1111/.test(h.cau)));
  for (const h of hq) assert.doesNotMatch(JSON.stringify(h), CO_DAU);
});

test("'vi' cho cùng đầu vào — giữ đúng chữ cũ, và cùng level/reasonCodes với 'en'", async () => {
  const vi = await ketQua(factsSolBonus(), "vi");
  const en = await ketQua(factsSolBonus(), "en");
  assert.equal(vi.level, en.level);
  assert.deepEqual(vi.reasonCodes, en.reasonCodes);
  assert.equal(vi.aiAdvisory, en.aiAdvisory);
  assert.equal(vi.detectedPrimaryAction?.type, "chuyển token");
  assert.match(vi.explanation, /^Hành động chính được nhận diện: chuyển DEMO đi\./);
  assert.match(tomTat(vi), /Sau khi ký, bạn không lấy lại được\.$/);
  assert.equal(chiTietKyThuat(vi)[0]?.nhan, "Mức");
  // Mặc định (không truyền locale) là "vi".
  assert.equal(tomTat(vi), tomTat(vi, "vi"));
  assert.deepEqual(dungHauQua(vi), dungHauQua(vi, "vi"));
});

test("mức safe — tiếng Anh nói giới hạn, không bao giờ nói 'safe'", async () => {
  const f = facts({ tokenAccounts: [ta()] });
  const en = await ketQua(f, "en");
  assert.equal(en.level, "safe");
  assert.equal(tomTat(en, "en"), "No signs found among the checks we can run.");
  assert.equal(en.explanation, "No signs found among the checks we can run.");
  assert.doesNotMatch(en.explanation, /\bsafe\b|\bsecure\b|guarantee|protect/i);
});

test("mọi mã lý do sinh câu tiếng Việt thì cũng sinh câu tiếng Anh, không lọt dấu", () => {
  const f = facts({
    tokenAccounts: [
      ta({
        ownerAfter: KE, amountBefore: 500_000_000n, amountAfter: 100_000_000n,
        delegateAfter: KE, delegatedAmountAfter: 1_000_000n, closeAuthorityAfter: KE,
      }),
    ],
    accounts: [{ address: "Acc1111111111111111111111111111111111111111", programOwnerBefore: "P1", programOwnerAfter: "P2" } as Facts["accounts"][number]],
    mints: [
      mint(DEMO, {
        mintAuthority: KE, freezeAuthority: KE, permanentDelegate: KE, transferHookProgramId: "Hook",
      }),
    ],
    instructions: [{ decoded: { authority: KE } } as unknown as Facts["instructions"][number]],
    tuoiViNhan: { [KE]: 2 },
    solDelta: { [TOI]: -900_000_000n },
    nguoiKy: [TOI, KE],
    accountKhongDoDuoc: ["X"],
    mintKhongDoc: ["Y"],
  });
  for (const ma of Object.values(REASON)) {
    const vi = dienGiaiMau(f, [ma], "vi");
    const en = dienGiaiMau(f, [ma], "en");
    assert.doesNotMatch(en, CO_DAU, `${ma}: ${en}`);
    const viChung = dienGiaiMau(f, [], "vi");
    const enChung = dienGiaiMau(f, [], "en");
    // Mã có câu riêng ở bản vi thì cũng phải có câu riêng ở bản en.
    assert.equal(vi === viChung, en === enChung, `${ma} lệch giữa vi và en`);
  }
});

test("moTaHanhDong nhận tên hành động của cả hai ngôn ngữ", () => {
  assert.equal(moTaHanhDong({ type: "chuyển token", from: "USDC" }, "en"), "send USDC");
  assert.equal(moTaHanhDong({ type: "transfer token", from: "USDC" }, "en"), "send USDC");
  assert.equal(moTaHanhDong({ type: "swap", from: "SOL", to: "USDC" }, "en"), "swap SOL for USDC");
  assert.equal(moTaHanhDong(null, "en"), "could not be determined");
  assert.equal(moTaHanhDong({ type: "chuyển token", from: "USDC" }), "chuyển USDC đi");
});
