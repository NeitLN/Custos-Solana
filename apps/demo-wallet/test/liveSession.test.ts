import { test } from "node:test";
import assert from "node:assert/strict";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { InspectResult } from "@custos-solana/types";
import { LiveSession, DEVNET_GENESIS } from "../src/live/session.ts";

function fixture() {
  let sends = 0, failSend = false, genesis = DEVNET_GENESIS, height = 1;
  let statePatch: Record<string, unknown> = {};
  const signedBy: string[] = [];
  let readTransaction: () => Promise<unknown> = async () => null;
  const c = {
    getGenesisHash: async () => genesis, getBalance: async () => 1_000_000_000,
    getMinimumBalanceForRentExemption: async () => 2_000_000,
    getLatestBlockhash: async () => ({ blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 100 }),
    getBlockHeight: async () => height,
    getSignatureStatuses: async () => ({ value: [null] }),
    getFeeForMessage: async () => ({ value: 5000 }),
    getAccountInfo: async (key: PublicKey) => {
      const a = session.view.accounts!;
      if (key.toBase58() === a.mint) {
        const data = Buffer.alloc(MintLayout.span);
        MintLayout.encode({ mintAuthorityOption: 0, mintAuthority: PublicKey.default, supply: 500000000n, decimals: 6, isInitialized: true, freezeAuthorityOption: 0, freezeAuthority: PublicKey.default }, data);
        return { data, owner: TOKEN_PROGRAM_ID, executable: false, lamports: 2000000 };
      }
      const data = Buffer.alloc(AccountLayout.span);
      AccountLayout.encode({ mint: new PublicKey(a.mint), owner: new PublicKey(key.toBase58() === a.target ? a.recipient : session.view.wallet), amount: 500_000_000n,
        delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n,
        closeAuthorityOption: 0, closeAuthority: PublicKey.default, ...statePatch }, data);
      return { data, owner: TOKEN_PROGRAM_ID, executable: false, lamports: 2_000_000 };
    },
    sendTransaction: async (t: { signatures: Uint8Array[]; message: { staticAccountKeys: PublicKey[] } }) => { ++sends; signedBy.push(t.message.staticAccountKeys[0]!.toBase58()); assert.ok(t.signatures[0]?.some(b => b !== 0)); if (failSend) throw new Error('RPC connection lost'); return 'rpc-signature'; },
    confirmTransaction: async () => ({ value: { err: null } }),
    getTransaction: () => readTransaction(),
  };
  let failInspect = false; let hangInspect = false; let inspectHook: ((deps: { interpret?: (...a: unknown[]) => unknown }) => void) | null = null;
  const result: InspectResult = { level: 'danger', aiAdvisory: null, detectedPrimaryAction: null, diff: [], reasonCodes: ['TEST'], coverage: { analyzed: 2, total: 2, unverifiedPrograms: 0 }, explanation: 'test' };
  const session = new LiveSession(c as unknown as Connection, async (deps: unknown) => { inspectHook?.(deps as { interpret?: (...a: unknown[]) => unknown }); if (hangInspect) return new Promise<InspectResult>(() => {}); if (failInspect) throw new Error('inspection unavailable'); return result; }, Keypair.generate());
  return { session, sends: () => sends, signedBy, setResult: (r: Partial<InspectResult>) => { Object.assign(result, r); }, expire: () => { height = 101; }, patch: (s: Record<string, unknown>) => { statePatch = s; }, setFailInspect: () => { failInspect = true; }, setHangInspect: () => { hangInspect = true; }, setInspectHook: (h: (deps: { interpret?: (...a: unknown[]) => unknown }) => void) => { inspectHook = h; }, setFailSend: () => { failSend = true; }, wrongNetwork: () => { genesis = 'mainnet'; }, reader: (fn: () => Promise<unknown>) => { readTransaction = fn; } };
}
test('session: setup is separate; protected cancel sends nothing; off can execute without inspect', async () => {
  const f = fixture(); await f.session.setup(); assert.equal(f.sends(), 1);
  await f.session.prepare('attack'); assert.equal(f.sends(), 1);
  const id = f.session.view.pending!.id; f.session.cancel();
  await assert.rejects(() => f.session.execute(id)); assert.equal(f.sends(), 1);
  f.session.setProtection(false); f.setFailInspect(); await f.session.prepare('attack');
  assert.equal(f.session.view.pending?.result, null);
  await f.session.execute(f.session.view.pending!.id); assert.equal(f.sends(), 2);
  assert.ok(f.session.view.receipt?.signature);
  assert.equal(f.session.view.receipt?.observation, null);
});
test('session: protected inspection failure cannot produce a signable request', async () => {
  const f = fixture(); await f.session.setup(); f.setFailInspect();
  await assert.rejects(() => f.session.prepare('attack')); assert.equal(f.session.view.pending, null); assert.equal(f.sends(), 1);
});
test('session: mode change invalidates pending consent and double execution submits once', async () => {
  const f = fixture(); await f.session.setup(); await f.session.prepare('transfer');
  const old = f.session.view.pending!.id; f.session.setProtection(false);
  await assert.rejects(() => f.session.execute(old));
  await f.session.prepare('transfer'); const id = f.session.view.pending!.id;
  const outcomes = await Promise.allSettled([f.session.execute(id), f.session.execute(id)]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1); assert.equal(f.sends(), 2);
});
test('session: unknown network is rejected before setup/signing', async () => {
  const f = fixture(); f.wrongNetwork(); await assert.rejects(() => f.session.setup(), /Devnet/); assert.equal(f.sends(), 0);
});
test('session: timeout after signing keeps signature and prevents preparing a new transaction', async () => {
  const f = fixture(); await f.session.setup(); f.session.setProtection(false); await f.session.prepare('attack'); f.setFailSend();
  await f.session.execute(f.session.view.pending!.id);
  assert.equal(f.session.view.send.pha, 'chuaRo'); assert.ok(f.session.view.receipt?.signature);
  await assert.rejects(() => f.session.prepare('attack'), /chưa rõ/); assert.equal(f.sends(), 2);
});
test('session: receipt query locks preparation until resolved, so old query cannot overwrite a new send', async () => {
  const f = fixture(); await f.session.setup(); f.session.setProtection(false); await f.session.prepare('transfer'); await f.session.execute(f.session.view.pending!.id);
  let finish!: (data: null) => void;
  f.reader(() => new Promise(resolve => { finish = resolve; }));
  const query = f.session.readReceipt();
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(() => f.session.prepare('attack'), /đang chạy/);
  finish(null); await query;
});
test('session: setup timeout retains manifest and can recover by querying without another send', async () => {
  const f = fixture(); f.setFailSend(); await assert.rejects(() => f.session.setup(), /chưa rõ/);
  assert.ok(f.session.view.setupPending?.setupSignature);
  f.reader(async () => ({ meta: { err: null } }));
  await f.session.recoverSetup();
  assert.ok(f.session.view.accounts); assert.equal(f.session.view.balance, '500000000');
  assert.equal(f.sends(), 1); assert.equal(f.session.view.setupPending, null);
});

test('protected red override stays on and records the verdict and explicit decision', async () => {
  const f = fixture(); await f.session.setup(); await f.session.prepare('attack');
  const id = f.session.view.pending!.id;
  await assert.rejects(() => f.session.execute(id, 'approve'), /bỏ qua/);
  assert.equal(f.sends(), 1);
  await f.session.execute(id, 'override');
  assert.equal(f.sends(), 2);
  assert.equal(f.session.view.protected, true);
  assert.equal(f.session.view.receipt?.decision?.action, 'override');
  assert.equal(f.session.view.receipt?.decision?.level, 'danger');
  assert.deepEqual(f.session.view.receipt?.decision?.reasonCodes, ['TEST']);
});

test('transfer form preserves fractional base units; bad amount never prepares signing', async () => {
  const f = fixture(); await f.session.setup();
  await f.session.prepare('transfer', { amount: '12,345678' });
  assert.equal(f.session.view.pending?.amount, '12345678');
  f.session.cancel();
  await assert.rejects(() => f.session.prepare('transfer', { amount: '0.0000001' }), /6/);
  assert.equal(f.session.view.pending, null); assert.equal(f.sends(), 1);
});

test('restoring public session verifies chain and never restores a signer', async () => {
  const f = fixture(); await f.session.setup();
  const snapshot = f.session.snapshot();
  assert.equal(snapshot.version, 2);
  assert.ok(!JSON.stringify(snapshot).includes('secretKey'));
  const a = f.session.view.accounts!;
  const keys = [f.session.view.wallet, a.mint, a.source, a.target, a.extraTarget!].map(k => new PublicKey(k));
  f.reader(async () => ({ meta: { err: null }, transaction: { message: { getAccountKeys: () => ({ length: keys.length, get: (i: number) => keys[i] }) } } }));
  await f.session.restore(snapshot);
  assert.equal(f.sends(), 1);
  assert.equal(f.session.view.balance, '500000000');
  await assert.rejects(() => f.session.restore({ ...snapshot, wallet: Keypair.generate().publicKey.toBase58() }), /ví/);
});

test('delegate step signs with actor, rejects revoked allowance and never borrows owner signature', async () => {
  const f = fixture(); await f.session.setup();
  await assert.rejects(() => f.session.prepare('delegate-transfer'), /không có quyền/);
  const actor = f.session.view.accounts!.recipient;
  f.patch({ delegateOption: 1, delegate: new PublicKey(actor), delegatedAmount: 20_000_000n });
  await f.session.prepare('delegate-transfer', { amount: '12' });
  assert.equal(f.session.view.pending!.signer, actor);
  await f.session.execute(f.session.view.pending!.id, 'override');
  assert.equal(f.signedBy.at(-1), actor);
  assert.notEqual(f.signedBy.at(-1), f.session.view.wallet);
  f.patch({});
  await assert.rejects(() => f.session.prepare('delegate-transfer', { amount: '1' }), /không có quyền/);
});

test('authority or allowance changes after inspect invalidate signing before send', async () => {
  const f = fixture(); await f.session.setup();
  await f.session.prepare('transfer'); const id = f.session.view.pending!.id;
  f.patch({ delegateOption: 1, delegate: Keypair.generate().publicKey, delegatedAmount: 1n });
  await assert.rejects(() => f.session.execute(id, 'override'), /Trạng thái/);
  assert.equal(f.sends(), 1);
});

test('dApp bytes are pinned to the offered session and replayed messages are rejected', async () => {
  const { buildLiveHandoff } = await import('../src/live/handoff.ts');
  const f = fixture(); await f.session.setup();
  const offer = await f.session.offerDapp();
  await assert.rejects(() => f.session.acceptDapp(offer.nonce, buildLiveHandoff({ ...offer, amount: '1' })), /khớp/);
  await f.session.acceptDapp(offer.nonce, buildLiveHandoff(offer));
  assert.equal(f.session.view.pending!.kind, 'attack');
  await assert.rejects(() => f.session.acceptDapp(offer.nonce, buildLiveHandoff(offer)), /khớp/);
  f.session.cancel(); assert.equal(f.sends(), 1);
});

test('unknown setup stays blocked until finalized expiry plus absent historical signature, then releases without resend', async () => {
  const f = fixture(); f.setFailSend(); await assert.rejects(() => f.session.setup(), /chưa rõ/);
  await assert.rejects(() => f.session.recoverSetup(), /Chưa rõ/);
  assert.equal(f.session.snapshot().unresolved, true);
  f.expire(); await f.session.recoverSetup();
  assert.equal(f.session.snapshot().unresolved, false);
  assert.equal(f.session.view.setupPending, null);
  assert.equal(f.sends(), 1);
  assert.match(f.session.view.status, /hết hạn/);
});

test('persistence subscriber failure before signing releases controller lock and sends nothing', async () => {
  const f = fixture();
  const unsubscribe = f.session.subscribe(() => { throw new Error('storage unavailable'); });
  await assert.rejects(() => f.session.refresh(), /storage/);
  unsubscribe();
  await f.session.refresh();
  assert.equal(f.session.view.busy, false); assert.equal(f.sends(), 0);
});

// Phản biện 26/09, F-03: `aiAdvisory` là tín hiệu riêng, KHÔNG đổi `level`. Nhưng
// luồng đồng ý cũ chỉ xét `level`, nên L2 "safe" + "Custos đề nghị kiểm tra thủ công" ký
// thẳng như không có gì, và nhật ký quyết định không ghi lại đề nghị đó.
test('protected safe + manual-review advisory needs explicit override and is logged', async () => {
  const f = fixture(); f.setResult({ level: 'safe', aiAdvisory: 'review_required', reasonCodes: [] });
  await f.session.setup(); await f.session.prepare('transfer');
  const id = f.session.view.pending!.id;
  await assert.rejects(() => f.session.execute(id, 'approve'), /bỏ qua/);
  assert.equal(f.sends(), 1, 'không được ký khi chưa xác nhận đề nghị kiểm tra');
  await f.session.execute(id, 'override');
  assert.equal(f.session.view.receipt?.decision?.action, 'override');
  assert.equal(f.session.view.receipt?.decision?.level, 'safe', 'level giữ nguyên — advisory không đổi mức L2');
  assert.equal(f.session.view.receipt?.decision?.aiAdvisory, 'review_required');
});

test('protected safe without advisory still signs with plain approval', async () => {
  const f = fixture(); f.setResult({ level: 'safe', aiAdvisory: null, reasonCodes: [] });
  await f.session.setup(); await f.session.prepare('transfer');
  await f.session.execute(f.session.view.pending!.id, 'approve');
  assert.equal(f.session.view.receipt?.decision?.action, 'approve');
  assert.equal(f.session.view.receipt?.decision?.aiAdvisory, null);
});

/*
 * CK-01 · HẠN HỮU HẠN CHO LƯỢT KIỂM CỦA PHIÊN LIVE. Nghiệm thu live 27/09 (lượt 3): màn thực
 * thi hiện "Custos đang mô phỏng trước khi ký…" hơn 90 s — `inspect()` không có hạn, trong
 * khi Phòng phân tích đã có 12 s. Bài này dựng một inspector KHÔNG BAO GIỜ trả lời.
 */
test('protected inspection that never answers is REFUSED within the deadline; nothing becomes signable', async () => {
  const { CAU_HINH_LIVE } = await import('../src/live/session.ts');
  const cu = CAU_HINH_LIVE.hanKiemMs; CAU_HINH_LIVE.hanKiemMs = 60;
  try {
    const f = fixture(); await f.session.setup(); f.setHangInspect();
    const t0 = Date.now();
    await assert.rejects(() => f.session.prepare('attack'), /quá hạn/);
    assert.ok(Date.now() - t0 < 2_000, `chờ ${Date.now() - t0} ms — hạn không được áp`);
    assert.equal(f.session.view.pending, null); assert.equal(f.sends(), 1);
    // Bảo vệ TẮT: kiểm chỉ để đo dự báo, không phải cổng — quá hạn thì dự báo để trống.
    f.session.setProtection(false); await f.session.prepare('transfer');
    // `pending` bị TS thu hẹp về null bởi assert phía trên — đọc lại qua kiểu rộng.
    const sau = f.session.view.pending as { result: unknown } | null;
    assert.equal(sau?.result, null);
  } finally { CAU_HINH_LIVE.hanKiemMs = cu; }
});

/*
 * Codex review 27/09 · LƯỢT KIỂM CỦA PHIÊN LIVE KHÔNG ĐƯỢC TRỘN HAI NHÀ CUNG CẤP. Phòng
 * phân tích đã bỏ lượt trộn nguồn; phiên ký thật thì chưa — A trả dữ liệu account, B trả
 * kết quả mô phỏng, và yêu cầu ký được dựng từ kết quả ghép đó. Inspector giả ở đây
 * GHI NGUỒN như `fetchDuPhong` ghi qua `NGUON_DOC_LIVE`.
 */
test('protected inspection answered by TWO providers is refused after one re-read; unprotected drops the mixed prediction', async () => {
  const { ghiNguonLive } = await import('../src/live/session.ts');
  const ok = (nguon: string) => ghiNguonLive({ method: 'getMultipleAccounts', nguon, ketQua: 'ok', ms: 0 });
  const f = fixture(); await f.session.setup();
  f.setInspectHook(() => { ok('a.example'); ok('b.example'); });
  await assert.rejects(() => f.session.prepare('attack'), /nhà cung cấp/);
  assert.equal(f.session.view.pending, null); assert.equal(f.sends(), 1);
  f.session.setProtection(false); await f.session.prepare('transfer');
  const sau = f.session.view.pending as { result: unknown } | null;
  assert.equal(sau?.result, null, 'dự báo dựng từ lượt trộn nguồn vẫn được giữ');
  // Một nguồn thì bình thường.
  f.setInspectHook(() => { ok('a.example'); });
  f.session.setProtection(true); await f.session.prepare('attack');
  assert.ok(f.session.view.pending, 'lượt một nguồn bị chặn oan');
});

test('late fallbacks join the live read list ONLY after their own genesis proves Devnet', async () => {
  const { datDuPhongLive, LIVE_RPC } = await import('../src/live/session.ts');
  const cauHinh = ['https://devnet.rpcpool.com', 'https://solana-devnet.api.onfinality.io/public'];
  const lan1 = await datDuPhongLive(cauHinh, async (u) => (u.includes('rpcpool') ? 'khacCluster' : 'chuaDo'));
  assert.deepEqual(lan1, [LIVE_RPC], 'endpoint khác cluster hoặc chưa đo được đã lọt vào đường ký thật');
  const lan2 = await datDuPhongLive(cauHinh, async (u) => (u.includes('onfinality') ? 'devnet' : 'khacCluster'));
  assert.deepEqual(lan2, [LIVE_RPC, 'https://solana-devnet.api.onfinality.io/public']);
});

/*
 * Codex review lần 2 (27/09), mục 1 · Custos TẮT mà lượt kiểm trộn nguồn: bỏ `result` là chưa
 * đủ — `captured.facts` của lượt đó vẫn đi vào `dungDuBao()` và dựng ra một dự báo ghép.
 */
test('unprotected mixed-provider inspection leaves NO prediction built from the mixed Facts', async () => {
  const { ghiNguonLive } = await import('../src/live/session.ts');
  const f = fixture(); await f.session.setup();
  const a = f.session.view.accounts!;
  const factsGia = { simulationOk: true, tokenAccounts: [{ address: a.source, mint: a.mint, amountBefore: 500000000n, amountAfter: 123000000n, ownerAfter: 'X', delegateAfter: null, delegatedAmountAfter: 0n, closeAuthorityAfter: null }] };
  f.setInspectHook((deps) => {
    // Facts giả thiếu trường nên bộ diễn giải thật có thể ném — chỉ cần `captured.facts` được ghi.
    Promise.resolve(deps.interpret?.(factsGia, [], 'vi', {})).catch(() => {});
    ghiNguonLive({ method: 'getMultipleAccounts', nguon: 'a.example', ketQua: 'ok', ms: 0 });
    ghiNguonLive({ method: 'simulateTransaction', nguon: 'b.example', ketQua: 'ok', ms: 0 });
  });
  f.session.setProtection(false); await f.session.prepare('transfer');
  const p = (f.session.view.pending as { prediction: { after: string | null; authorityMeasured?: boolean } } | null)?.prediction;
  assert.equal(p?.after ?? null, null, 'dự báo vẫn dựng từ Facts của lượt trộn nguồn');
  assert.notEqual(p?.authorityMeasured, true);
});

/*
 * Codex review lần 2, mục 4 · phản hồi MUỘN của lượt trước (đã quá hạn, request vẫn chạy) không
 * được tính vào lượt hiện tại — nếu không, một lượt chỉ dùng B vẫn bị từ chối vì "trộn nguồn".
 */
test('a late response from a request started BEFORE this inspection is not counted as its source', async () => {
  const { ghiNguonLive, NGUON_DOC_LIVE } = await import('../src/live/session.ts');
  NGUON_DOC_LIVE.hienTai = { nguon: new Set(), tu: 1_000_000 };
  try {
    // Bắt đầu lúc 999_000 (trước lượt), về lúc 1_005_000: của lượt cũ ⇒ bỏ qua.
    ghiNguonLive({ method: 'getMultipleAccounts', nguon: 'a.example', ketQua: 'ok', ms: 6_000 }, 1_005_000);
    // Bắt đầu lúc 1_004_000 (trong lượt): tính.
    ghiNguonLive({ method: 'getMultipleAccounts', nguon: 'b.example', ketQua: 'ok', ms: 1_000 }, 1_005_000);
    assert.deepEqual([...NGUON_DOC_LIVE.hienTai!.nguon], ['b.example']);
  } finally { NGUON_DOC_LIVE.hienTai = null; }
});
