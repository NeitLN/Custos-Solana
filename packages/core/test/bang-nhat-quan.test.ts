import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, AccountFact, TokenAccountFact, MintFact } from "../src/facts.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungBangChenhLech, NHAN } from "../src/diff.ts";

/**
 * BẢNG CHÊNH LỆCH PHẢI NÓI CÙNG MỘT THỨ TIẾNG.
 *
 * Đo được trên mainnet ngày 23/08 — ba dòng, ba quy ước khác nhau, cùng một bảng:
 *
 *   Số dư HSZC…7mDi sau khi ký | 0,0         -> 16.689,81168      số dư -> số dư
 *   Chuyển SOL đi              | 1,894850064 -> −0,026147526 SOL  số dư -> MỨC THAY ĐỔI
 *   Phí mạng (ước tính)        | 0           -> −0,000014999 SOL  số 0 giả -> mức thay đổi
 *
 * Và nặng hơn: ca đóng tài khoản wSOL cho ví lạ ra `verdict: warning` kèm mã
 * SOL_ROI_VI, nhưng dòng SOL trong bảng được tô màu `info`. Verdict nói nguy,
 * bảng nói bình thường.
 *
 * Xem docs/ROADMAP-BUILD.md — P0-B.
 */

const TOI = "ViNguoiDung1111111111111111111111111111111111";
const LA = "KeTanCong111111111111111111111111111111111111";
const SYS = "11111111111111111111111111111111";
const TOK = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const WSOL = "So11111111111111111111111111111111111111112";
const MINT = "MintKhac1111111111111111111111111111111111111";
const PHI = 5_000n;

const acc = (p: Partial<AccountFact> & { address: string }): AccountFact => ({
  isSigner: false, programOwnerBefore: SYS, programOwnerAfter: SYS,
  lamportsBefore: 0n, lamportsAfter: 0n, ...p,
});

const mint = (address: string, decimals: number, kyHieu: string | null): MintFact => ({
  address, mintAuthority: null, freezeAuthority: null, permanentDelegate: null,
  transferHookProgramId: null, isToken2022: false, decimals, kyHieu,
});

const facts = (p: Partial<Facts>): Facts => ({
  signer: TOI, simulationOk: true, simulationError: null,
  accounts: [], tokenAccounts: [], mints: [], solDelta: {}, tuoiViNhan: {},
  instructions: [], lookupTables: [], accountKhongDoDuoc: [],
  nguoiKy: [TOI], nguoiDungDuocChiDinh: true, phiUocTinh: PHI, phiChinhXac: true,
  coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 }, ...p,
});

const bang = (f: Facts) => dungBangChenhLech(f, danhGia(f).hits);
const timDong = (f: Facts, nhan: string) => bang(f).find((d) => d.label.startsWith(nhan));

/** Một chuỗi là "số dư" nếu nó không mang dấu +/− ở đầu. */
const laSoDu = (s: string) => !/^[+−-]/.test(s.trim());

// ── Quy ước cột ───────────────────────────────────────────────────
test("QUY ƯỚC · mọi dòng số dư đều là `số dư → số dư`, không lẫn mức thay đổi", () => {
  const truoc = 5_000_000_000n;
  const f = facts({
    accounts: [
      acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: truoc - 100_000_000n - PHI }),
      acc({ address: LA, lamportsAfter: 100_000_000n }),
    ],
    tokenAccounts: [{
      address: "ata", mint: MINT, ownerBefore: TOI, ownerAfter: TOI,
      amountBefore: 0n, amountAfter: 16_689_811_680n,
      delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
      closeAuthorityBefore: null, closeAuthorityAfter: null,
      programOwnerBefore: TOK, programOwnerAfter: TOK,
    }],
    mints: [mint(MINT, 6, "XYZ")],
    solDelta: { [TOI]: -(100_000_000n + PHI), [LA]: 100_000_000n },
  });

  for (const d of bang(f)) {
    // Dòng KHÔNG phải số dư (phí, phần chưa đọc được) dùng "—" ở cột trái.
    if (d.before === "—") continue;
    assert.ok(
      laSoDu(d.before) && laSoDu(d.after),
      `dòng "${d.label}" trộn hai quy ước: ${d.before} -> ${d.after}`,
    );
  }
});

test("QUY ƯỚC · dòng không phải số dư dùng `—` ở cột trái, không dùng số 0 giả", () => {
  const f = facts({
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: 5_000_000_000n, lamportsAfter: 5_000_000_000n - PHI })],
    solDelta: { [TOI]: -PHI },
  });
  const phi = timDong(f, NHAN.PHI);
  assert.ok(phi, "phải có dòng phí");
  assert.equal(phi!.before, "—", `cột trái của dòng phí phải là "—", đang là "${phi!.before}"`);
});

// ── Liên kết luật ↔ màu ───────────────────────────────────────────
test("MÀU · luật 13 kích hoạt ⇒ dòng SOL phải là `danger`, không được là `info`", () => {
  // Ca đóng tài khoản wSOL cho ví lạ. Trước bản vá: verdict warning nhưng dòng
  // SOL tô `info` — người dùng thấy cảnh báo mà bảng lại nói bình thường.
  const f = facts({
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: 100_000_000n, lamportsAfter: 100_000_000n - PHI })],
    tokenAccounts: [{
      address: "ataWsol", mint: WSOL, ownerBefore: TOI, ownerAfter: null,
      amountBefore: 5_000_000_000n, amountAfter: 0n,
      delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
      closeAuthorityBefore: null, closeAuthorityAfter: null,
      programOwnerBefore: TOK, programOwnerAfter: null,
    }],
    mints: [mint(WSOL, 9, "SOL")],
    solDelta: { [TOI]: -PHI },
  });

  const r = danhGia(f);
  assert.ok(r.reasonCodes.includes("SOL_ROI_VI"), "tiền đề: luật 13 phải kích hoạt");

  const sol = timDong(f, NHAN.SO_DU_SOL);
  assert.ok(sol, `phải có dòng "${NHAN.SO_DU_SOL}"`);
  assert.equal(
    sol!.severity,
    "danger",
    "engine gắn cờ mà bảng tô màu thông tin thì người dùng không biết tin bên nào",
  );
});

test("MÀU · ÂM TÍNH — chỉ mất phí thì KHÔNG dòng nào bị tô đỏ", () => {
  const f = facts({
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: 5_000_000_000n, lamportsAfter: 5_000_000_000n - PHI })],
    solDelta: { [TOI]: -PHI },
  });
  assert.equal(danhGia(f).level, "safe");
  assert.equal(bang(f).filter((d) => d.severity === "danger").length, 0);
});

// ── wSOL gộp vào dòng SOL ─────────────────────────────────────────
test("NHÃN · không nhãn nào được là tiền tố của nhãn khác", () => {
  // `mucNgan.ts` phân loại dòng bằng `startsWith`. Nếu "Tổng SOL của bạn" lỡ
  // đặt thành "Số dư SOL của bạn" thì nó khớp `NHAN.SO_DU` và rơi vào nhánh
  // token — dòng SOL sẽ được đọc thành một token tên "SOL của bạn".
  const nhan = Object.values(NHAN);
  for (const a of nhan) {
    for (const b of nhan) {
      if (a === b) continue;
      assert.ok(!b.startsWith(a), `nhãn "${b}" bắt đầu bằng nhãn "${a}" — sẽ bị phân loại nhầm`);
    }
  }
});

test("wSOL KHÔNG hiện thành một token riêng — nó LÀ SOL", () => {
  // Hai dòng cùng nói về SOL là làm người đọc phải tự cộng trừ trong đầu.
  const f = facts({
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: 100_000_000n, lamportsAfter: 100_000_000n - PHI })],
    tokenAccounts: [{
      address: "ataWsol", mint: WSOL, ownerBefore: TOI, ownerAfter: null,
      amountBefore: 5_000_000_000n, amountAfter: 0n,
      delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
      closeAuthorityBefore: null, closeAuthorityAfter: null,
      programOwnerBefore: TOK, programOwnerAfter: null,
    }],
    mints: [mint(WSOL, 9, "SOL")],
    solDelta: { [TOI]: -PHI },
  });

  const dongToken = bang(f).filter((d) => d.label.startsWith(NHAN.SO_DU));
  assert.equal(dongToken.length, 0, "wSOL không được hiện như một token thường");

  const sol = timDong(f, NHAN.SO_DU_SOL);
  assert.ok(sol, "phải gộp vào dòng SOL");
  // 0,1 SOL trong ví + 5 SOL wrapped = 5,1 trước, còn ~0,0999 sau.
  assert.ok(sol!.before.startsWith("5,1"), `tổng trước phải gộp cả wSOL: ${sol!.before}`);
});

test("SOL · chỉ hiện dòng số dư khi có thay đổi VƯỢT tiền phí", () => {
  // Giao dịch chỉ đụng token: thêm một dòng "Số dư SOL 5,0 -> 4,999995" là nhiễu.
  const f = facts({
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: 5_000_000_000n, lamportsAfter: 5_000_000_000n - PHI })],
    solDelta: { [TOI]: -PHI },
  });
  assert.equal(timDong(f, NHAN.SO_DU_SOL), undefined, "chỉ mất phí thì không cần dòng số dư SOL");
  assert.ok(timDong(f, NHAN.PHI), "nhưng vẫn phải cho biết đã trả phí");
});

// ── Phí chính xác vs ước tính ─────────────────────────────────────
test("PHÍ · lấy được số chính xác ⇒ nhãn KHÔNG nói 'ước tính'", () => {
  const f = facts({
    phiChinhXac: true,
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: 5_000_000_000n, lamportsAfter: 5_000_000_000n - PHI })],
    solDelta: { [TOI]: -PHI },
  });
  const d = bang(f).find((x) => x.label.includes("hí mạng"));
  assert.ok(d, "phải có dòng phí");
  assert.equal(d!.label, NHAN.PHI);
  assert.ok(!d!.label.includes("ước tính"), "số chính xác mà vẫn nói ước tính là tự hạ thấp mình");
});

test("PHÍ · RPC không trả lời ⇒ nhãn PHẢI nói rõ là ước tính", () => {
  // Lui về cận dưới thì phải nói ra. Trình bày một cận dưới như số chính xác
  // là loại nói quá mà sản phẩm này cấm.
  const f = facts({
    phiChinhXac: false,
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: 5_000_000_000n, lamportsAfter: 5_000_000_000n - PHI })],
    solDelta: { [TOI]: -PHI },
  });
  const d = bang(f).find((x) => x.label.includes("hí mạng"));
  assert.ok(d, "phải có dòng phí");
  assert.ok(d!.label.includes("Ước tính"), `phải nói rõ là ước tính: ${d!.label}`);
});

test("PHÍ chính xác ⇒ giao dịch chỉ trả phí KHÔNG hiện dòng tổng SOL", () => {
  // Đây là lý do P1-G tồn tại: ước tính là cận dưới nên phần "vượt quá phí"
  // luôn lẫn một ít phí thật. Đo mainnet: phí thật 5203, ước tính 5000 -> dòng
  // số dư SOL hiện ra cho một thay đổi 203 lamport.
  const phiThat = 5_203n;
  const f = facts({
    phiUocTinh: phiThat, phiChinhXac: true,
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: 5_000_000_000n, lamportsAfter: 5_000_000_000n - phiThat })],
    solDelta: { [TOI]: -phiThat },
  });
  assert.equal(timDong(f, NHAN.SO_DU_SOL), undefined, "chỉ trả phí thì không cần dòng tổng SOL");
});
