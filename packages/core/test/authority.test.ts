import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, TokenAccountFact, MintFact, InstructionFact } from "../src/facts.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { REASON, chiLaThongTin } from "../src/constants.ts";

/**
 * AI THỰC HIỆN LỆNH TRANSFER.
 *
 * Luật 4 luôn dừng ở Vàng vì `Facts` chưa ghi lại `authority` của lệnh Transfer,
 * nên không phân biệt được ba tình huống rất khác nhau:
 *
 *   - chủ tài khoản tự chuyển token của mình      → bình thường
 *   - delegate thông thường chuyển                 → đã có luật 3 lo phần cấp quyền
 *   - PERMANENT DELEGATE của mint ra tay           → người dùng không hề cho phép
 *
 * Cái thứ ba là điều đáng báo động: quyền đó đến từ chính mint, người giữ token
 * không bấm gì để trao nó và cũng không thu hồi được.
 *
 * Xem docs/bao-mat/SECURITY-AUDIT.md — F3.
 */

const TOI = "ViNguoiDung1111111111111111111111111111111111";
const NHA_PHAT_HANH = "NhaPhatHanh11111111111111111111111111111111";
const LA = "ViLa1111111111111111111111111111111111111111";
const MINT = "MintPD11111111111111111111111111111111111111";
const TOKEN22 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const ta = (p: Partial<TokenAccountFact> = {}): TokenAccountFact => ({
  address: "ata1", mint: MINT, ownerBefore: TOI, ownerAfter: TOI,
  amountBefore: 500_000_000n, amountAfter: 400_000_000n,
  delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
  closeAuthorityBefore: null, closeAuthorityAfter: null,
  programOwnerBefore: TOKEN22, programOwnerAfter: TOKEN22, ...p,
});

const mintPD = (): MintFact => ({
  address: MINT, mintAuthority: null, freezeAuthority: null,
  permanentDelegate: NHA_PHAT_HANH, transferHookProgramId: null,
  isToken2022: true, decimals: 6, kyHieu: null,
});

const lenhTransfer = (authority: string | null): InstructionFact => ({
  index: 0, programId: TOKEN22, isInner: false, parentIndex: null,
  decoded: { kind: "transfer", ...(authority !== null ? { authority } : {}) },
  fromLookupTable: false, chamTaiSanNguoiKy: true,
});

const facts = (p: Partial<Facts>): Facts => ({
  signer: TOI, simulationOk: true, simulationError: null,
  accounts: [], tokenAccounts: [ta()], mints: [mintPD()], solDelta: {}, tuoiViNhan: {},
  instructions: [], lookupTables: [], accountKhongDoDuoc: [],
  nguoiKy: [TOI], nguoiDungDuocChiDinh: true, phiUocTinh: 5_000n, phiChinhXac: true,
  coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 }, ...p,
});

test("PD · CHỦ TÀI KHOẢN tự chuyển ⇒ chỉ Vàng, giọng thông tin (ca R04-pos)", () => {
  const r = danhGia(facts({ instructions: [lenhTransfer(TOI)] }));
  assert.equal(r.level, "warning", "chính người dùng chuyển tiền của mình thì không phải tấn công");
  assert.ok(r.reasonCodes.includes(REASON.TOKEN2022_PERMANENT_DELEGATE));
  assert.ok(!r.reasonCodes.includes(REASON.PERMANENT_DELEGATE_RA_TAY));
  assert.ok(chiLaThongTin(r.reasonCodes), "sự tồn tại của một tính năng giao thức là thông tin");
});

test("PD · CHÍNH permanent delegate ra tay ⇒ Đỏ", () => {
  // Người giữ token không bấm gì để trao quyền này và cũng không thu hồi được.
  const r = danhGia(facts({ instructions: [lenhTransfer(NHA_PHAT_HANH)] }));
  assert.equal(r.level, "danger");
  assert.ok(
    r.reasonCodes.includes(REASON.PERMANENT_DELEGATE_RA_TAY),
    `thiếu mã, đang có: ${r.reasonCodes.join(", ")}`,
  );
  assert.ok(!chiLaThongTin(r.reasonCodes), "đây là cáo buộc về chính giao dịch");
});

test("PD · delegate THÔNG THƯỜNG chuyển ⇒ KHÔNG phải permanent delegate", () => {
  const r = danhGia(
    facts({
      tokenAccounts: [ta({ delegateBefore: LA, delegateAfter: LA, delegatedAmountAfter: 100_000_000n })],
      instructions: [lenhTransfer(LA)],
    }),
  );
  assert.ok(
    !r.reasonCodes.includes(REASON.PERMANENT_DELEGATE_RA_TAY),
    "delegate người dùng tự cấp thì không phải quyền vĩnh viễn của mint",
  );
});

test("PD · KHÔNG bóc được authority ⇒ giữ Vàng, KHÔNG đoán", () => {
  // Chính sách đã chốt: thiếu dữ liệu thì không tuyên bố điều không chứng minh được.
  const r = danhGia(facts({ instructions: [lenhTransfer(null)] }));
  assert.equal(r.level, "warning");
  assert.ok(!r.reasonCodes.includes(REASON.PERMANENT_DELEGATE_RA_TAY));
});

test("PD · token KHÔNG có permanent delegate ⇒ không có gì cả", () => {
  const r = danhGia(
    facts({
      mints: [{ ...mintPD(), permanentDelegate: null }],
      instructions: [lenhTransfer(NHA_PHAT_HANH)],
    }),
  );
  assert.ok(!r.reasonCodes.includes(REASON.PERMANENT_DELEGATE_RA_TAY));
  assert.ok(!r.reasonCodes.includes(REASON.TOKEN2022_PERMANENT_DELEGATE));
});

test("L1 bóc được authority từ lệnh SPL Token Transfer", async () => {
  const { Keypair, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } =
    await import("@solana/web3.js");
  const { TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
  const { extractFacts } = await import("../src/l1/fetch.ts");

  const toi = Keypair.generate();
  const nguon = Keypair.generate().publicKey;
  const dich = Keypair.generate().publicKey;
  const authority = Keypair.generate().publicKey;

  // SPL Token Transfer: [nguồn, đích, authority]. Authority là account THỨ BA.
  const ix = new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: nguon, isSigner: false, isWritable: true },
      { pubkey: dich, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: Buffer.from([3, 1, 0, 0, 0, 0, 0, 0, 0]),
  });

  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: toi.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [ix],
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

  const f = await extractFacts(conn as never, tx);
  const chuyen = f.instructions.find((i) => i.decoded?.kind === "transfer");
  assert.ok(chuyen, "phải decode được lệnh transfer");
  assert.equal(
    chuyen!.decoded?.authority,
    authority.toBase58(),
    "authority phải lấy từ DANH SÁCH ACCOUNT, không phải từ dữ liệu lệnh",
  );
});
