import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, AccountFact, TokenAccountFact } from "../src/facts.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungBangChenhLech } from "../src/diff.ts";
import { REASON, chiLaThongTin } from "../src/constants.ts";
import { tinhSolNguoiDung } from "../src/sol.ts";

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
  nguoiKy: [TOI], nguoiDungDuocChiDinh: false, phiUocTinh: PHI, phiChinhXac: true,
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
  assert.equal(dong(f, "Tổng SOL"), undefined, "chỉ mất phí thì không cần dòng tổng SOL");
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
  const tongSol = dong(f, "Tổng SOL");
  assert.ok(tongSol, "khoản chuyển phải có dòng riêng, không được gộp vào phí");
  assert.ok(phi, "phí vẫn phải hiện");
  assert.ok(!phi!.after.includes("0,100"), `phí bị gộp chung với khoản chuyển: ${phi!.after}`);
  // Quy ước số dư → số dư: 5 SOL còn lại 4,9 sau khi chuyển 0,1.
  assert.ok(tongSol!.before.startsWith("5"), `cột trái phải là số dư trước: ${tongSol!.before}`);
  assert.ok(tongSol!.after.startsWith("4,89"), `cột phải phải là số dư sau: ${tongSol!.after}`);
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

  const d = dong(f, "Tổng SOL");
  assert.ok(d, "phải có dòng tổng SOL");
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
  // Quy ước số dư → số dư nói được cả chiều tăng mà không cần nhãn "Nhận SOL"
  // riêng: người đọc thấy thẳng số dư đi lên.
  const tongSol = dong(f, "Tổng SOL");
  assert.ok(tongSol, "SOL tăng vẫn phải có dòng tổng");
  assert.ok(
    Number(tongSol!.after.replace(/\./g, "").replace(",", ".")) >
      Number(tongSol!.before.replace(/\./g, "").replace(",", ".")),
    `số dư phải đi lên: ${tongSol!.before} -> ${tongSol!.after}`,
  );
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

// ── Wrapped SOL ───────────────────────────────────────────────────
//
// wSOL là SOL bọc trong một tài khoản token: số dư token CHÍNH LÀ lamport nằm
// trong tài khoản đó. Trước bản vá, Custos xử lý nó như token thường, nên luật 13
// (đọc `solDelta[signer]`) không thấy gì — lamport nằm ở địa chỉ tài khoản token,
// không phải ví người ký.
//
// Tái hiện được: đóng tài khoản wSOL 5 SOL, lamport về ví lạ ⇒ verdict `safe`,
// mã lý do RỖNG. Xem docs/ROADMAP-BUILD.md — P0-A.

const WSOL = "So11111111111111111111111111111111111111112";
const ATA_WSOL = "AtaWsolCuaNguoiDung11111111111111111111111111";
const TOK = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const mintWsol = () => ({
  address: WSOL, mintAuthority: null, freezeAuthority: null, permanentDelegate: null,
  transferHookProgramId: null, isToken2022: false, decimals: 9, kyHieu: "SOL",
});

const taWsol = (truoc: bigint, sau: bigint, chuSau: string | null = TOI): TokenAccountFact => ({
  address: ATA_WSOL, mint: WSOL, ownerBefore: TOI, ownerAfter: chuSau,
  amountBefore: truoc, amountAfter: sau,
  delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
  closeAuthorityBefore: null, closeAuthorityAfter: null,
  programOwnerBefore: TOK, programOwnerAfter: chuSau === null ? null : TOK,
});

test("wSOL · đóng tài khoản, lamport về VÍ LẠ ⇒ KHÔNG được safe", () => {
  const viTruoc = 100_000_000n;
  const f = facts({
    accounts: [
      acc({ address: TOI, isSigner: true, lamportsBefore: viTruoc, lamportsAfter: viTruoc - PHI }),
      acc({ address: LA, lamportsBefore: 0n, lamportsAfter: 5_002_039_280n }),
    ],
    tokenAccounts: [taWsol(5_000_000_000n, 0n, null)],
    mints: [mintWsol()],
    solDelta: { [TOI]: -PHI, [LA]: 5_002_039_280n },
    instructions: [{
      index: 0, programId: TOK, isInner: false, parentIndex: null,
      decoded: { kind: "closeAccount" }, fromLookupTable: false, chamTaiSanNguoiKy: true,
    }],
  });
  const r = danhGia(f);
  assert.notEqual(r.level, "safe", "5 SOL biến mất mà nói Bình thường là bỏ lọt");
  assert.ok(
    r.reasonCodes.includes(REASON.SOL_ROI_VI),
    `phải có mã lý do, đang có: ${r.reasonCodes.join(", ") || "(rỗng)"}`,
  );
});

test("wSOL · ÂM TÍNH — mở gói về CHÍNH VÍ MÌNH ⇒ không gắn cờ", () => {
  // Đây là bước cuối bình thường của MỌI giao dịch swap dùng wSOL. Gắn cờ ca này
  // là gắn cờ mọi lần swap — đúng cái bẫy luật 11 đã sập một lần.
  const viTruoc = 100_000_000n;
  const f = facts({
    accounts: [
      acc({
        address: TOI, isSigner: true,
        lamportsBefore: viTruoc,
        lamportsAfter: viTruoc + 5_000_000_000n - PHI, // nhận lại đúng số wSOL
      }),
    ],
    tokenAccounts: [taWsol(5_000_000_000n, 0n, null)],
    mints: [mintWsol()],
    solDelta: { [TOI]: 5_000_000_000n - PHI },
    instructions: [{
      index: 0, programId: TOK, isInner: false, parentIndex: null,
      decoded: { kind: "closeAccount" }, fromLookupTable: false, chamTaiSanNguoiKy: true,
    }],
  });
  const r = danhGia(f);
  assert.ok(
    !r.reasonCodes.includes(REASON.SOL_ROI_VI),
    "mở gói wSOL về ví mình thì tổng SOL không đổi — không được báo động",
  );
});

test("wSOL · ÂM TÍNH — bọc SOL vào wSOL để swap ⇒ không gắn cờ", () => {
  // Chiều ngược lại: ví mất lamport nhưng wSOL tăng đúng bằng chừng đó.
  const viTruoc = 6_000_000_000n;
  const f = facts({
    accounts: [
      acc({ address: TOI, isSigner: true, lamportsBefore: viTruoc, lamportsAfter: viTruoc - 5_000_000_000n - PHI }),
    ],
    tokenAccounts: [taWsol(0n, 5_000_000_000n)],
    mints: [mintWsol()],
    solDelta: { [TOI]: -(5_000_000_000n + PHI) },
    instructions: [{
      index: 0, programId: TOK, isInner: false, parentIndex: null,
      decoded: { kind: "syncNative" }, fromLookupTable: false, chamTaiSanNguoiKy: true,
    }],
  });
  const r = danhGia(f);
  assert.ok(
    !r.reasonCodes.includes(REASON.SOL_ROI_VI),
    "bọc SOL thành wSOL là chuyển hình dạng, không phải mất tiền",
  );
});

test("wSOL · BẤT BIẾN — accounts và solDelta không được lệch nhau", () => {
  // Luật 13 sau bản vá đọc `facts.accounts`, trong khi bản trước đọc `solDelta`.
  // Hai nguồn này hiện luôn đi cùng nhau (cùng lọc theo afterByIndex trong
  // l1/fetch.ts). Nếu một lần refactor làm chúng lệch, hậu quả là luật 13 IM
  // LẶNG — tính ra 0 lamport rời ví trong khi solDelta biết rõ 5 SOL đã đi.
  const f = facts({
    accounts: [], // ví người ký KHÔNG có ở đây
    solDelta: { [TOI]: -5_000_000_000n }, // nhưng solDelta biết
  });
  const { roi } = tinhSolNguoiDung(f);
  assert.equal(roi, 5_000_000_000n, "phải dựng lại được từ solDelta thay vì trả 0");
});

// ── Mua bán không phải là bị rút ──────────────────────────────────
test("SOL · ÂM TÍNH — tiêu 63% SOL để MUA token thì KHÔNG phải bị rút", () => {
  // Ca thật, bắt được khi đo cohort 23/08: ví 0,025 SOL tiêu 0,016 (63%) và
  // nhận về 7.453 token. Luật 13 gắn cờ — cáo buộc sai.
  //
  // Luật 11 đã học đúng bài này: nó kiểm `coNhanLai` và im lặng khi người dùng
  // nhận lại thứ gì. Luật 13 thiếu vế đó. Người trả tiền mua một món hàng thì
  // không phải nạn nhân, và gắn cờ mọi lệnh mua là cách nhanh nhất để người
  // dùng học được cách bỏ qua cảnh báo.
  const truoc = 25_047_215n;
  const f = facts({
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: 9_073_890n })],
    tokenAccounts: [{
      address: "ataMua", mint: "MintMua11111111111111111111111111111111111111",
      ownerBefore: TOI, ownerAfter: TOI,
      amountBefore: 38_984_347_981n, amountAfter: 46_437_929_529n, // NHẬN thêm token
      delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
      closeAuthorityBefore: null, closeAuthorityAfter: null,
      programOwnerBefore: TOK, programOwnerAfter: TOK,
    }],
    mints: [{
      address: "MintMua11111111111111111111111111111111111111", mintAuthority: null,
      freezeAuthority: null, permanentDelegate: null, transferHookProgramId: null,
      isToken2022: false, decimals: 6, kyHieu: "MUA",
    }],
    solDelta: { [TOI]: -(truoc - 9_073_890n) },
  });
  assert.ok(
    !danhGia(f).reasonCodes.includes(REASON.SOL_ROI_VI),
    "trả tiền mua một món hàng thì không phải bị rút",
  );
});

test("SOL · rút sạch mà KHÔNG nhận lại gì ⇒ VẪN gắn cờ", () => {
  // Vế còn lại của cùng một luật. Nếu chỉ thêm điều kiện "có nhận lại" mà không
  // giữ ca này thì đã gỡ mất chính luật 13.
  const truoc = 5_000_000_000n;
  const f = facts({
    ...viCua(truoc, 0n),
    accounts: [
      acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: 0n }),
      acc({ address: LA, lamportsAfter: truoc - PHI }),
    ],
    solDelta: { [TOI]: -truoc, [LA]: truoc - PHI },
  });
  assert.ok(danhGia(f).reasonCodes.includes(REASON.SOL_ROI_VI));
});
