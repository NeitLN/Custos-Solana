import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts } from "@custos-solana/core";
import { doiChieu, duBaoTuFacts, thucTeTuGiaoDich, type GiaoDichRpc } from "../src/ketNoi/bienNhan.ts";

/*
 * B4 — biên nhận khi dApp tự gửi. Ba điều phải giữ:
 *   · không có dự báo ⇒ không chấm "khớp" (khopHet null, KHÔNG phải true);
 *   · tài khoản vắng trong kết quả ⇒ không đọc thành số dư 0;
 *   · SOL chỉ để xem, không làm biên nhận thành "lệch".
 */

const VI = "AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ";
const TK = "XeuDZoaYi9LZewrWtzyZkyYY4SD79w8mKQaf1B6xb9o";
const MINT = "ETZpnWzSY8Z6govWwpNVKXUpNzy84dP2q6EAE7eJpz2P";
const KE = "11111111111111111111111111111112";

function facts(p: Partial<Facts> = {}): Facts {
  return {
    signer: VI,
    simulationOk: true,
    simulationError: null,
    accounts: [{ address: VI, isSigner: true, programOwnerBefore: null, programOwnerAfter: null, lamportsBefore: 10_000n, lamportsAfter: 5_000n }],
    tokenAccounts: [
      {
        address: TK, mint: MINT, ownerBefore: VI, ownerAfter: KE, amountBefore: 500n, amountAfter: 250n,
        delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
        closeAuthorityBefore: null, closeAuthorityAfter: null, programOwnerBefore: null, programOwnerAfter: null,
      },
    ],
    accountKhongDoDuoc: [],
    ...p,
  } as Facts;
}

function giaoDich(p: { err?: unknown; amount?: string; owner?: string; bo?: boolean } = {}): GiaoDichRpc {
  return {
    meta: {
      err: p.err ?? null,
      postBalances: [4_990, 0],
      postTokenBalances: p.bo ? [] : [{ accountIndex: 1, mint: MINT, owner: p.owner ?? KE, uiTokenAmount: { amount: p.amount ?? "250" } }],
    },
    transaction: { message: { accountKeys: [VI, TK] } },
  };
}

test("dự báo lấy token người dùng SỞ HỮU trước giao dịch, kèm chủ sau", () => {
  const d = duBaoTuFacts(facts(), VI);
  assert.ok(d.ok);
  assert.deepEqual(d.token, [{ taiKhoan: TK, mint: MINT, soLuongSau: 250n, chuSau: KE, coMat: true }]);
});

test("mô phỏng thất bại hoặc thiếu Facts ⇒ không có dự báo", () => {
  assert.equal(duBaoTuFacts(undefined, VI).ok, false);
  assert.equal(duBaoTuFacts(facts({ simulationOk: false, simulationError: "x" }), VI).ok, false);
});

test("tài khoản không đo được sau mô phỏng ⇒ không vào dự báo (không bịa số)", () => {
  const d = duBaoTuFacts(facts({ accountKhongDoDuoc: [TK] }), VI);
  assert.ok(d.ok);
  assert.deepEqual(d.token, []);
});

test("thực tế khớp dự báo ⇒ khopHet true, mọi dòng token ✓", () => {
  const d = duBaoTuFacts(facts(), VI);
  const t = thucTeTuGiaoDich(giaoDich(), VI, [TK])!;
  const r = doiChieu(d, t);
  assert.equal(r.khopHet, true);
  assert.ok(r.dong.some((x) => x.muc.startsWith("Chủ") && x.khop === true));
});

test("chủ thực tế khác dự báo ⇒ khopHet false", () => {
  const r = doiChieu(duBaoTuFacts(facts(), VI), thucTeTuGiaoDich(giaoDich({ owner: VI }), VI, [TK])!);
  assert.equal(r.khopHet, false);
});

test("SOL lệch KHÔNG làm biên nhận thành lệch — chỉ để xem", () => {
  const r = doiChieu(duBaoTuFacts(facts(), VI), thucTeTuGiaoDich(giaoDich(), VI, [TK])!);
  const sol = r.dong.find((x) => x.muc.startsWith("SOL"))!;
  assert.equal(sol.khop, null);
  assert.equal(r.khopHet, true);
});

test("tài khoản vắng trong kết quả ⇒ không đọc thành 0, không chấm", () => {
  const r = doiChieu(duBaoTuFacts(facts(), VI), thucTeTuGiaoDich(giaoDich({ bo: true }), VI, [TK])!);
  const so = r.dong.find((x) => x.muc.startsWith("Số dư"))!;
  assert.equal(so.khop, null);
  assert.match(so.thucTe, /không còn/);
});

test("thực thi thất bại mà dự báo thành công ⇒ lệch ở dòng kết quả, không so số dư", () => {
  const r = doiChieu(duBaoTuFacts(facts(), VI), thucTeTuGiaoDich(giaoDich({ err: { InstructionError: [0, "x"] } }), VI, [TK])!);
  assert.equal(r.khopHet, false);
  assert.ok(!r.dong.some((x) => x.muc.startsWith("Số dư")));
});

test("không có dự báo ⇒ khopHet null — KHÔNG hiển thị như khớp", () => {
  const r = doiChieu(duBaoTuFacts(undefined, VI), thucTeTuGiaoDich(giaoDich(), VI, [])!);
  assert.equal(r.khopHet, null);
});

test("địa chỉ nạp từ lookup table vẫn tìm đúng tài khoản", () => {
  const g: GiaoDichRpc = {
    meta: {
      err: null,
      postBalances: [1, 2],
      postTokenBalances: [{ accountIndex: 1, mint: MINT, owner: KE, uiTokenAmount: { amount: "250" } }],
      loadedAddresses: { writable: [TK], readonly: [] },
    },
    transaction: { message: { accountKeys: [VI] } },
  };
  const t = thucTeTuGiaoDich(g, VI, [TK])!;
  assert.equal(t.token[0]!.soLuongSau, 250n);
});

test("meta rỗng ⇒ chưa có thực tế (null), không phải thất bại", () => {
  assert.equal(thucTeTuGiaoDich({ meta: null, transaction: { message: { accountKeys: [] } } }, VI, []), null);
});
