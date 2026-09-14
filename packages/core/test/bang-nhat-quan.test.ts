import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("MÀU · luật 11 kích hoạt ⇒ dòng số dư token phải là `danger`", () => {
  /*
   * Cùng hình dạng lỗi với bài luật 13 ngay trên, và là lỗi THỨ HAI của cùng cơ chế.
   *
   * Bảng từng tô màu bằng `hits.some(h => h.detail.includes(địa_chỉ_token_account))`.
   * Luật 11 cộng theo **mint** nên `detail` chỉ nhúng mint — hai định danh khác nhau,
   * không bao giờ khớp.
   *
   * Đo được trên `R11-pos` trước bản vá: hai token rời ví sạch (500000000 → 0 và
   * 300000000 → 0), verdict Vàng với `OUTFLOW_KHONG_KHOP`, và **cả hai dòng số dư
   * vẫn tô `info`**. Người dùng thấy cảnh báo mà bảng nói bình thường.
   *
   * Bản vá (TB-X01) cho `RuleHit` mang `bangChung` — ID ổn định thay cho dò chuỗi.
   * Mutation: gỡ `bangChung` khỏi luật 11 ⇒ 2 dòng đỏ tụt về 0; tắt `coBangChung`
   * trong `diff.ts` ⇒ cũng về 0.
   *
   * Luật 11 cần ÍT NHẤT HAI loại tài sản cùng rời ví mới kích hoạt — một loại là
   * hành vi ví bình thường, xem chú thích trong `rules.ts`.
   */
  const MINT_A = "MintAAA11111111111111111111111111111111111111";
  const MINT_B = "MintBBB11111111111111111111111111111111111111";
  const ta = (address: string, m: string, truoc: bigint): TokenAccountFact => ({
    address,
    mint: m,
    ownerBefore: TOI,
    ownerAfter: TOI,
    amountBefore: truoc,
    amountAfter: 0n,
    delegateBefore: null,
    delegateAfter: null,
    delegatedAmountAfter: 0n,
    closeAuthorityBefore: null,
    closeAuthorityAfter: null,
    programOwnerBefore: TOK,
    programOwnerAfter: TOK,
  });

  const f = facts({
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: 100_000_000n, lamportsAfter: 100_000_000n - PHI })],
    tokenAccounts: [ta("ataA", MINT_A, 500_000_000n), ta("ataB", MINT_B, 300_000_000n)],
    mints: [mint(MINT_A, 6, "AAA"), mint(MINT_B, 6, "BBB")],
    solDelta: { [TOI]: -PHI },
  });

  const r = danhGia(f);
  assert.ok(r.reasonCodes.includes("OUTFLOW_KHONG_KHOP"), "tiền đề: luật 11 phải kích hoạt");

  const do_ = bang(f).filter((d) => d.severity === "danger");
  assert.equal(
    do_.length,
    2,
    "hai token rời ví sạch mà bảng không tô đỏ dòng nào — engine gắn cờ, bảng nói bình thường",
  );
});

test("MÀU · nối cảnh báo với dòng bảng bằng ID ổn định, KHÔNG dò chuỗi", () => {
  /*
   * Canh chính cơ chế, không chỉ canh một ca. Hai lỗi đã xảy ra (luật 13, luật 11)
   * đều vì bảng dò base58 bên trong câu tiếng Việt; luật thứ ba mắc lại sẽ không ai
   * thấy nếu cơ chế bị tháo về cách cũ.
   */
  const src = readFileSync(new URL("../src/diff.ts", import.meta.url), "utf8");
  assert.match(src, /coBangChung/, "`diff.ts` phải nối theo `bangChung`, không dò chuỗi");
  assert.match(
    src,
    /h\.bangChung\?\.some\(\(b\) => b\.loai === loai && b\.khoa === khoa\)/,
    "phép nối phải so CẢ loại lẫn khoá — hai luật có thể cầm hai loại định danh khác nhau",
  );
  assert.match(
    src,
    /h\.bangChung === undefined && h\.detail\.includes/,
    "đường lui `detail` chỉ được dùng cho luật CHƯA gắn bằng chứng",
  );

  const rules = readFileSync(new URL("../src/l2/rules.ts", import.meta.url), "utf8");
  assert.match(rules, /bangChung\?: BangChung\[\]/, "`RuleHit` phải có trường bằng chứng tuỳ chọn");
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

test("PHÍ · blockhash hết hạn ⇒ lui về ước tính, KHÔNG làm hỏng lượt kiểm tra", async () => {
  // `getFeeForMessage` chỉ tính được khi blockhash còn hiệu lực. Ca sản phẩm
  // thật (giao dịch sắp ký) luôn chạy; mô phỏng lại giao dịch lịch sử thì RPC
  // trả `null`. Phải lui êm chứ không được ném lỗi hay để phí bằng 0.
  const { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } =
    await import("@solana/web3.js");
  const { extractFacts } = await import("../src/l1/fetch.ts");

  const toi = Keypair.generate();
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: toi.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [SystemProgram.transfer({ fromPubkey: toi.publicKey, toPubkey: toi.publicKey, lamports: 1 })],
    }).compileToV0Message(),
  );

  const conn = {
    getFeeForMessage: async () => ({ value: null }), // blockhash hết hạn
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (k: unknown[]) => k.map(() => null),
    simulateTransaction: async (_t: unknown, cfg: { accounts?: { addresses?: string[] } }) => ({
      value: { err: null, logs: [], innerInstructions: [], accounts: (cfg.accounts?.addresses ?? []).map(() => null) },
    }),
    getSignaturesForAddress: async () => [],
  };

  const f = await extractFacts(conn as never, tx);
  assert.equal(f.phiChinhXac, false, "phải biết là mình đang dùng ước tính");
  assert.ok(f.phiUocTinh > 0n, "và ước tính phải khác 0, không được rơi về không");
});
