import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, AccountFact, TokenAccountFact } from "../src/facts.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungBangChenhLech } from "../src/diff.ts";
import { REASON, chiLaThongTin } from "../src/constants.ts";

/**
 * NATIVE SOL.
 *
 * Trước bản vá, mọi chênh lệch lamport của người ký đều bị gán nhãn "Phí mạng"
 * với severity "info", và không luật nào đọc `solDelta`. Một giao dịch rút 5 SOL
 * ra verdict `safe`, mã lý do rỗng, và khoản mất hiện ra như phí mạng.
 *
 * SOL là tài sản phổ biến nhất trên mạng này và drainer rút SOL là kiểu lừa
 * thường gặp nhất. Xem docs/bao-mat/SECURITY-AUDIT.md — F1.
 */

const TOI = "ViNguoiDung1111111111111111111111111111111111";
const LA = "KeTanCong111111111111111111111111111111111111";
const SYS = "11111111111111111111111111111111";
const PHI = 5_000n;

const acc = (p: Partial<AccountFact> & { address: string }): AccountFact => ({
  isSigner: false, programOwnerBefore: SYS, programOwnerAfter: SYS,
  lamportsBefore: 0n, lamportsAfter: 0n, ...p,
});

const facts = (p: Partial<Facts>): Facts => ({
  signer: TOI, simulationOk: true, simulationError: null,
  accounts: [], tokenAccounts: [], mints: [], solDelta: {}, tuoiViNhan: {},
  instructions: [{
    index: 0, programId: SYS, isInner: false, parentIndex: null,
    decoded: { kind: "transfer" }, fromLookupTable: false, chamTaiSanNguoiKy: true,
  }],
  lookupTables: [], accountKhongDoDuoc: [],
  nguoiKy: [TOI], nguoiDungDuocChiDinh: false, phiUocTinh: PHI,
  coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
  ...p,
});

/** Người ký có `truoc` lamport, còn lại `sau` sau khi ký. */
const viCua = (truoc: bigint, sau: bigint) => ({
  accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: sau })],
  solDelta: { [TOI]: sau - truoc },
});

const dong = (f: Facts, chua: string) =>
  dungBangChenhLech(f, danhGia(f).hits).find((d) => d.label.includes(chua));

// ── Ca 1 · chỉ có phí ─────────────────────────────────────────────
test("SOL · chỉ có phí mạng ⇒ verdict không đổi, hiện đúng một dòng phí", () => {
  const f = facts(viCua(5_000_000_000n, 5_000_000_000n - PHI));
  const r = danhGia(f);
  assert.equal(r.level, "safe", "trả phí mạng là chuyện bình thường của mọi giao dịch");
  assert.ok(!r.reasonCodes.includes(REASON.SOL_ROI_VI));

  const bang = dungBangChenhLech(f, r.hits);
  assert.ok(dong(f, "Phí mạng"), "phải có dòng phí");
  assert.equal(dong(f, "Chuyển SOL"), undefined, "không có khoản chuyển nào thì không được vẽ ra");
  assert.equal(bang.filter((d) => d.label.includes("Phí mạng")).length, 1);
});

// ── Ca 2 · chuyển SOL hợp lệ ──────────────────────────────────────
test("SOL · chuyển 0,1 SOL hợp lệ ⇒ tách khỏi phí, KHÔNG bị gắn Đỏ", () => {
  const truoc = 5_000_000_000n;
  const chuyen = 100_000_000n;
  const f = facts({
    ...viCua(truoc, truoc - chuyen - PHI),
    accounts: [
      acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: truoc - chuyen - PHI }),
      acc({ address: LA, lamportsBefore: 0n, lamportsAfter: chuyen }),
    ],
    solDelta: { [TOI]: -(chuyen + PHI), [LA]: chuyen },
  });
  const r = danhGia(f);
  assert.notEqual(r.level, "danger", "gửi tiền là hành vi thường gặp nhất của một cái ví");

  const phi = dong(f, "Phí mạng");
  const chuyenSol = dong(f, "Chuyển SOL");
  assert.ok(chuyenSol, "khoản chuyển phải có dòng riêng, không được gộp vào phí");
  assert.ok(phi, "phí vẫn phải hiện");
  assert.ok(!phi!.after.includes("0,100"), `phí bị gộp chung với khoản chuyển: ${phi!.after}`);
  assert.ok(chuyenSol!.after.includes("0,1"), `số tiền chuyển sai: ${chuyenSol!.after}`);
});

// ── Ca 3 · rút phần lớn SOL ───────────────────────────────────────
test("SOL · rút sạch 5 SOL ⇒ KHÔNG bao giờ safe, có mã lý do hành động được", () => {
  const truoc = 5_000_000_000n;
  const f = facts({
    ...viCua(truoc, 0n),
    accounts: [
      acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: 0n }),
      acc({ address: LA, lamportsBefore: 0n, lamportsAfter: truoc - PHI }),
    ],
    solDelta: { [TOI]: -truoc, [LA]: truoc - PHI },
  });
  const r = danhGia(f);
  assert.notEqual(r.level, "safe", "mất sạch SOL mà nói Bình thường là lỗ hổng, không phải giới hạn");
  assert.ok(
    r.reasonCodes.includes(REASON.SOL_ROI_VI),
    `phải có mã lý do, đang có: ${r.reasonCodes.join(", ") || "(rỗng)"}`,
  );
  assert.ok(!chiLaThongTin(r.reasonCodes), "đây là CÁO BUỘC về chính giao dịch, không phải thông tin");

  const d = dong(f, "Chuyển SOL");
  assert.ok(d, "phải có dòng chuyển SOL");
  assert.notEqual(d!.severity, "info", "5 SOL rời ví không được hiển thị với giọng thông tin");
});

// ── Ca 4 · rent tạo tài khoản ─────────────────────────────────────
test("SOL · rent tạo ATA ⇒ không báo động, vì tỉ lệ nhỏ", () => {
  const truoc = 5_000_000_000n;
  const rent = 2_039_280n;
  const f = facts({
    ...viCua(truoc, truoc - rent - PHI),
    solDelta: { [TOI]: -(rent + PHI) },
  });
  const r = danhGia(f);
  assert.ok(!r.reasonCodes.includes(REASON.SOL_ROI_VI), "0,04% số dư không phải dấu hiệu gì");
});

// ── Ca 5 · hoàn rent, SOL TĂNG ────────────────────────────────────
test("SOL · đóng account hoàn rent ⇒ hiện là NHẬN, không phải phí âm", () => {
  const truoc = 5_000_000_000n;
  const hoan = 2_034_280n;
  const f = facts({
    ...viCua(truoc, truoc + hoan),
    solDelta: { [TOI]: hoan },
  });
  const r = danhGia(f);
  assert.equal(r.level, "safe");
  const phi = dong(f, "Phí mạng");
  assert.ok(
    !phi || !phi.after.startsWith("0,002"),
    `SOL tăng mà hiển thị thành phí mạng dương là vô nghĩa: ${phi?.after}`,
  );
  assert.ok(dong(f, "Nhận SOL"), "SOL tăng phải hiện là nhận");
});

// ── Ca 6 · người ký không phải người dùng ─────────────────────────
test("SOL · dApp trả phí, người dùng là signer khác ⇒ KHÔNG được safe", () => {
  // F1b: `signer` được suy ra bằng staticAccountKeys[0], tức fee payer. Trong
  // giao dịch được tài trợ phí, đó KHÔNG phải người dùng.
  const DAPP = "ViDApp11111111111111111111111111111111111111";
  const f = facts({
    signer: DAPP,          // Custos đang bảo vệ NHẦM ví
    nguoiKy: [DAPP, TOI],  // nhưng giao dịch có HAI người ký
    accounts: [
      acc({ address: DAPP, isSigner: true, lamportsBefore: 1_000_000_000n, lamportsAfter: 1_000_000_000n - PHI }),
      acc({ address: TOI, isSigner: true, lamportsBefore: 5_000_000_000n, lamportsAfter: 0n }),
      acc({ address: LA, lamportsBefore: 0n, lamportsAfter: 5_000_000_000n }),
    ],
    solDelta: { [DAPP]: -PHI, [TOI]: -5_000_000_000n, [LA]: 5_000_000_000n },
  });
  const r = danhGia(f);
  assert.notEqual(
    r.level,
    "safe",
    "giao dịch nhiều signer mà ví không nói ai là người dùng thì không được im lặng",
  );
  assert.ok(r.reasonCodes.length > 0, "và phải nói được vì sao");
});

// ── Ca 7 · ví chỉ đúng người dùng ─────────────────────────────────
test("SOL · ví chỉ định nguoiDung ⇒ Custos bảo vệ đúng ví đó", async () => {
  const { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } =
    await import("@solana/web3.js");
  const { extractFacts } = await import("../src/l1/fetch.ts");

  const dapp = Keypair.generate();   // trả phí, là staticAccountKeys[0]
  const nguoiDung = Keypair.generate();
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: dapp.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [
        SystemProgram.transfer({ fromPubkey: nguoiDung.publicKey, toPubkey: dapp.publicKey, lamports: 1 }),
      ],
    }).compileToV0Message(),
  );

  const conn = {
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: unknown[]) => keys.map(() => null),
    simulateTransaction: async (_t: unknown, cfg: { accounts?: { addresses?: string[] } }) => ({
      value: {
        err: null, logs: [], innerInstructions: [],
        accounts: (cfg.accounts?.addresses ?? []).map(() => null),
      },
    }),
    getSignaturesForAddress: async () => [],
  };

  const macDinh = await extractFacts(conn as never, tx);
  assert.equal(macDinh.signer, dapp.publicKey.toBase58(), "không chỉ định thì mặc định là ví trả phí");
  assert.equal(macDinh.nguoiDungDuocChiDinh, false);
  assert.ok(macDinh.nguoiKy.length >= 2, "giao dịch này có hai người ký");

  const coChiDinh = await extractFacts(conn as never, tx, nguoiDung.publicKey.toBase58());
  assert.equal(coChiDinh.signer, nguoiDung.publicKey.toBase58(), "phải chuyển sang bảo vệ đúng ví được chỉ");
  assert.equal(coChiDinh.nguoiDungDuocChiDinh, true);

  // Địa chỉ lạ không phải người ký thì KHÔNG được chấp nhận — nếu không, một
  // dApp độc hại chỉ cần khai bừa một địa chỉ để Custos nhìn sang chỗ khác.
  const bua = await extractFacts(conn as never, tx, Keypair.generate().publicKey.toBase58());
  assert.equal(bua.nguoiDungDuocChiDinh, false, "địa chỉ không ký giao dịch thì bỏ qua");
  assert.equal(bua.signer, dapp.publicKey.toBase58());
});

test("SOL · CÓ nguoiDung ⇒ phát hiện ĐẦY ĐỦ vụ đổi chủ, không chỉ cảnh báo phạm vi", () => {
  // Ranh giới trung thực: thiếu ngữ cảnh thì Custos chỉ nói được "tôi có thể
  // đang xem nhầm ví". Có ngữ cảnh thì nó phát hiện đúng vụ tấn công.
  const f = facts({
    signer: TOI,                    // ví đã chỉ đúng người dùng
    nguoiKy: [LA, TOI],
    nguoiDungDuocChiDinh: true,
    tokenAccounts: [{
      address: "ata", mint: "MintX", ownerBefore: TOI, ownerAfter: LA,
      amountBefore: 500_000_000n, amountAfter: 500_000_000n,
      delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
      closeAuthorityBefore: null, closeAuthorityAfter: null,
      programOwnerBefore: "Tok", programOwnerAfter: "Tok",
    }],
  });
  const r = danhGia(f);
  assert.equal(r.level, "danger", "có ngữ cảnh thì phải bắt được vụ đổi chủ");
  assert.ok(r.reasonCodes.includes(REASON.SET_AUTHORITY_ACCOUNT_OWNER));
  assert.ok(
    !r.reasonCodes.includes(REASON.NGUOI_DUNG_KHONG_RO),
    "đã biết người dùng là ai thì không cảnh báo phạm vi nữa",
  );
});
