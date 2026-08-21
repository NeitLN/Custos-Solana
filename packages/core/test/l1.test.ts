import { test } from "node:test";
import assert from "node:assert/strict";
import { PublicKey, type AccountInfo } from "@solana/web3.js";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ACCOUNT_SIZE, MINT_SIZE } from "@solana/spl-token";
import { parseTokenAccount, parseMint } from "../src/l1/parse.ts";
import { computeCoverage } from "../src/l1/coverage.ts";

const key = (n: number) => new PublicKey(new Uint8Array(32).fill(n));
const VI_TOI = key(1), VI_LA = key(2), MINT = key(3), ATA = key(4);

function taiKhoanToken(opts: {
  owner: PublicKey; amount: bigint;
  delegate?: PublicKey | null; delegatedAmount?: bigint;
  closeAuthority?: PublicKey | null;
  programOwner?: PublicKey;
}): AccountInfo<Buffer> {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode({
    mint: MINT, owner: opts.owner, amount: opts.amount,
    delegateOption: opts.delegate ? 1 : 0, delegate: opts.delegate ?? PublicKey.default,
    state: 1,
    isNativeOption: 0, isNative: 0n,
    delegatedAmount: opts.delegatedAmount ?? 0n,
    closeAuthorityOption: opts.closeAuthority ? 1 : 0,
    closeAuthority: opts.closeAuthority ?? PublicKey.default,
  }, data);
  return { data, executable: false, lamports: 2039280, owner: opts.programOwner ?? TOKEN_PROGRAM_ID, rentEpoch: 0 };
}

function taiKhoanMint(opts: { mintAuthority?: PublicKey | null; freezeAuthority?: PublicKey | null }): AccountInfo<Buffer> {
  const data = Buffer.alloc(MINT_SIZE);
  MintLayout.encode({
    mintAuthorityOption: opts.mintAuthority ? 1 : 0, mintAuthority: opts.mintAuthority ?? PublicKey.default,
    supply: 1_000_000n, decimals: 6, isInitialized: true,
    freezeAuthorityOption: opts.freezeAuthority ? 1 : 0, freezeAuthority: opts.freezeAuthority ?? PublicKey.default,
  }, data);
  return { data, executable: false, lamports: 1461600, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
}

test("đọc được tài khoản token bình thường", () => {
  const s = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_TOI, amount: 500_000_000n }));
  assert.ok(s);
  assert.equal(s.owner, VI_TOI.toBase58());
  assert.equal(s.amount, 500_000_000n);
  assert.equal(s.delegate, null);
  assert.equal(s.programOwner, TOKEN_PROGRAM_ID.toBase58());
});

test("LUẬT 1 — phát hiện đổi chủ tài khoản token qua chênh lệch trạng thái", () => {
  const truoc = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_TOI, amount: 500_000_000n }));
  const sau   = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_LA,  amount: 500_000_000n }));
  assert.ok(truoc && sau);
  assert.notEqual(truoc.owner, sau.owner);
  assert.equal(sau.owner, VI_LA.toBase58());
});

test("LUẬT 3 — phát hiện cấp quyền rút không giới hạn", () => {
  const s = parseTokenAccount(ATA.toBase58(), taiKhoanToken({
    owner: VI_TOI, amount: 500_000_000n, delegate: VI_LA, delegatedAmount: 18446744073709551615n,
  }));
  assert.ok(s);
  assert.equal(s.delegate, VI_LA.toBase58());
  assert.equal(s.delegatedAmount, 18446744073709551615n);
});

test("LUẬT 12 — phát hiện account đổi program sở hữu", () => {
  const truoc = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_TOI, amount: 1n }));
  const sau   = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_TOI, amount: 1n, programOwner: TOKEN_2022_PROGRAM_ID }));
  assert.ok(truoc && sau);
  assert.notEqual(truoc.programOwner, sau.programOwner);
});

test("không nhầm account thường thành tài khoản token", () => {
  const rac: AccountInfo<Buffer> = { data: Buffer.alloc(165), executable: false, lamports: 0, owner: key(9), rentEpoch: 0 };
  assert.equal(parseTokenAccount(ATA.toBase58(), rac), null);
});

test("chịu được dữ liệu hỏng mà không ném lỗi", () => {
  const hong: AccountInfo<Buffer> = { data: Buffer.alloc(7), executable: false, lamports: 0, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
  assert.equal(parseTokenAccount(ATA.toBase58(), hong), null);
});

test("LUẬT 6 và 7 — đọc được mint authority và freeze authority", () => {
  const con = parseMint(MINT.toBase58(), taiKhoanMint({ mintAuthority: VI_LA, freezeAuthority: VI_LA }));
  assert.ok(con);
  assert.equal(con.mintAuthority, VI_LA.toBase58());
  assert.equal(con.freezeAuthority, VI_LA.toBase58());

  const daThuHoi = parseMint(MINT.toBase58(), taiKhoanMint({}));
  assert.ok(daThuHoi);
  assert.equal(daThuHoi.mintAuthority, null);
  assert.equal(daThuHoi.freezeAuthority, null);
});

test("coverage — đếm cả inner instruction, program lạ tính là chưa xác minh", () => {
  const c = computeCoverage([
    { index: 0, programId: "11111111111111111111111111111111", isInner: false, parentIndex: null, decoded: { kind: "transfer" }, fromLookupTable: false, chamTaiSanNguoiKy: false },
    { index: 1, programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", isInner: false, parentIndex: null, decoded: { kind: "setAuthority" }, fromLookupTable: false, chamTaiSanNguoiKy: false },
    { index: 2, programId: "LaZzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz", isInner: true, parentIndex: 1, decoded: null, fromLookupTable: true, chamTaiSanNguoiKy: false },
  ]);
  assert.deepEqual(c, { analyzed: 2, total: 3, unverifiedPrograms: 1 });
});

test("coverage — program đã xác minh nhưng KHÔNG decode được thì không tính là đã hiểu", () => {
  const c = computeCoverage([
    { index: 0, programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", isInner: false, parentIndex: null, decoded: null, fromLookupTable: false, chamTaiSanNguoiKy: false },
  ]);
  assert.deepEqual(c, { analyzed: 0, total: 1, unverifiedPrograms: 0 });
});
