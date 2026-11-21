import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  ACCOUNT_SIZE,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  AuthorityType,
  getAccount,
  createInitializeMint2Instruction,
  createInitializeAccount3Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getMint,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { inspect, neoKetQua, type Facts, type Interpreter } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import type { InspectResult } from "@custos-solana/types";
import { chuKyDauTien, guiGiaoDich, maBase58, type TrangThaiGui } from "../gui.ts";
import { ConsentGate, canBoQua } from "./policy.ts";
import { dungDuBao, dungQuanSat } from "./quanSat.ts";
import { liveRpcFetch } from "./rpc.ts";
import { coHan, LoiQuaHan } from "../../../../scripts/coHan.ts";
import {
  fetchDuPhong,
  duPhongTheoBan,
  genesisCua,
  GENESIS_DEVNET,
  LoiNguonTron,
  type QuanSatRpc,
} from "../../../../scripts/rpcDuPhong.ts";
import { compareReceipt, type LiveReceipt, type Prediction } from "./receipt.ts";
import { DEFAULT_DEMO_WALLET } from "../../../../scripts/demo-wallet-config.ts";
import { buildScenario, parseDemoAmount, SCENARIOS, type LiveKind } from "./scenarios.ts";
import { parsePublicSession, type DemoAccounts, type PublicSession } from "./store.ts";
import { buildLiveHandoff, type LiveHandoff } from "./handoff.ts";
export type { LiveKind } from "./scenarios.ts";
export type { DemoAccounts } from "./store.ts";

// MỘT bản genesis cho cả repo — `scripts/rpcDuPhong.ts`.
export const DEVNET_GENESIS = GENESIS_DEVNET;
const RPC_CONG_CONG = "https://api.devnet.solana.com";

/**
 * Endpoint CHÍNH của phiên live (đọc + gửi). DEV: `VITE_RPC` của máy đội — cùng thứ tự với
 * Phòng phân tích (`hienTruong.ts`); nghiệm thu 28/09 dùng RPC Devnet riêng vì endpoint công
 * cộng treo đọc account theo đợt. Production: KHÔNG đọc biến môi trường (khoá không vào
 * bundle). Endpoint nào cũng phải qua kiểm genesis của phiên trước khi dùng.
 */
export function chonRpcLive(dev: boolean, env: string | undefined): string {
  if (!dev || !env) return RPC_CONG_CONG;
  try {
    return new URL(env).protocol === "https:" ? env : RPC_CONG_CONG;
  } catch {
    return RPC_CONG_CONG;
  }
}

export const LIVE_RPC = chonRpcLive(
  !!import.meta.env?.DEV,
  // Chỉ sau `DEV ?` — truyền thẳng làm Vite nhúng khoá vào bundle (xem `khongRoRpcBundle.test.ts`).
  import.meta.env?.DEV ? import.meta.env["VITE_RPC"] : undefined,
);

/*
 * DANH SÁCH ĐỌC CỦA PHIÊN — một mảng DUY NHẤT, `fetchDuPhong` giữ tham chiếu tới nó.
 *
 * Khởi đầu CHỈ có endpoint chính. Dự phòng (DEV: `VITE_RPC_DU_PHONG`; production:
 * `rpcDuPhong` đã lọc allowlist) tới SAU, qua `datDuPhongLive`, và chỉ được nhận khi
 * `getGenesisHash` của CHÍNH endpoint đó chứng minh là Devnet. Code review 27/09: `#devnet()`
 * kiểm genesis một lần qua connection có dự phòng — endpoint nào trả lời cũng được — nên một
 * dự phòng thêm sau chưa từng được kiểm. Lệnh GỬI luôn đi endpoint chính.
 */
const DS_RPC_LIVE: string[] = [LIVE_RPC];

export async function datDuPhongLive(
  cauHinh: unknown,
  xacMinh: (url: string) => Promise<"devnet" | "khacCluster" | "chuaDo"> = (u) => genesisCua(u),
): Promise<string[]> {
  // Chỉ sau `DEV ?` — xem `hienTruong.ts`: truyền thẳng làm khoá lọt vào bundle production.
  const them = duPhongTheoBan(
    !!import.meta.env?.DEV,
    import.meta.env?.DEV ? import.meta.env["VITE_RPC_DU_PHONG"] : undefined,
    cauHinh,
  ).filter((u) => !DS_RPC_LIVE.includes(u));
  const kq = await Promise.all(them.map((u) => xacMinh(u)));
  // Đường ký thật: CHỈ nhận endpoint đã chứng minh là Devnet — chưa đo được thì chưa dùng.
  them.forEach((u, i) => {
    if (kq[i] === "devnet" && !DS_RPC_LIVE.includes(u)) DS_RPC_LIVE.push(u);
  });
  return [...DS_RPC_LIVE];
}

/**
 * NGUỒN CỦA LƯỢT KIỂM ĐANG CHẠY — code review 27/09. `fetchDuPhong` của connection
 * mặc định ghi host trả lời từng lượt đọc vào đây; `prepare()` mở tập mới trước `inspect()`
 * và đọc lại sau. Hai host ⇒ lượt kiểm đã trộn nguồn. Đối tượng xuất ra để test giả lập
 * được nguồn (connection của test không đi qua `fetchDuPhong`).
 */
export const NGUON_DOC_LIVE: { hienTai: { nguon: Set<string>; tu: number } | null } = { hienTai: null };

/**
 * Ghi nguồn của MỘT lượt đọc vào lượt kiểm đang mở — nhưng chỉ khi request đó BẮT ĐẦU sau khi
 * lượt kiểm mở (`bayGio - q.ms >= tu`). Review lần 2 (27/09): `coHan()` chỉ ngừng CHỜ,
 * request của lượt đã quá hạn vẫn chạy; phản hồi muộn của nó từng được ghi vào lượt mới, và
 * một lượt chỉ dùng nhà B bị từ chối vì "trộn nguồn".
 */
export function ghiNguonLive(q: QuanSatRpc, bayGio = Date.now()): void {
  const h = NGUON_DOC_LIVE.hienTai;
  if (q.ketQua !== "ok" || !h || bayGio - q.ms < h.tu) return;
  h.nguon.add(q.nguon);
}
export const DECIMALS = 6;
/**
 * HẠN CHO MỘT LƯỢT KIỂM CỦA PHIÊN LIVE — CK-01. Nghiệm thu 27/09: không có hạn này, bước
 * chuẩn bị treo "đang mô phỏng" quá 90 s khi RPC đọc account treo từng lời gọi một.
 * Đối tượng (không phải hằng) để test rút ngắn được; mã sản phẩm không sửa nó.
 */
export const CAU_HINH_LIVE = { hanKiemMs: 15_000 };
export type PendingView = {
  id: number;
  kind: LiveKind;
  protected: boolean;
  amount: string;
  result: InspectResult | null;
  prediction: Prediction;
  fee: number | null;
  signer: string;
  target: string;
  state: string;
  /** Host RPC đã trả lời lượt kiểm (chỉ host — URL có thể mang khoá). Rỗng: chưa có lượt kiểm được nhận. */
  nguonDoc: string[];
};
export type LiveView = {
  wallet: string;
  lamports: number | null;
  accounts: DemoAccounts | null;
  balance: string | null;
  owner: string | null;
  protected: boolean;
  busy: boolean;
  status: string;
  pending: PendingView | null;
  receipt: LiveReceipt | null;
  send: TrangThaiGui;
  setupPending: DemoAccounts | null;
  canSign: boolean;
  delegate: string | null;
  allowance: string | null;
  closeAuthority: string | null;
  closed: boolean;
  actorAvailable: boolean;
  history: LiveReceipt[];
  restored: boolean;
};
type Expiry = { blockhash: string; lastValidBlockHeight: number };

/** Fixed public wallet; matching signer must be explicitly unlocked in this tab. */
export class LiveSession {
  #wallet: Keypair | null;
  readonly #publicKey: PublicKey;
  readonly #gate = new ConsentGate();
  readonly #connection: Connection;
  readonly #inspect: typeof inspect;
  readonly #interpret: Interpreter;
  #actors = new Map<string, Keypair>();
  #actor() {
    return this.view.accounts ? this.#actors.get(this.view.accounts.recipient) : undefined;
  }
  #setupExpiry: number | undefined;
  #offered: LiveHandoff | null = null;
  #request: { tx: VersionedTransaction; expiry: Expiry; view: PendingView } | null = null;
  #version = 0;
  #locked = false;
  #unresolved = false;
  #verifiedDevnet = false;
  #listeners = new Set<(view: LiveView) => void>();
  view: LiveView;

  constructor(
    connection?: Connection,
    inspector: typeof inspect = inspect,
    localSigner?: Keypair,
    interpreter: Interpreter = dienGiaiKhongAI,
    publicWallet: string = DEFAULT_DEMO_WALLET,
  ) {
    this.#wallet = localSigner ?? null;
    this.#publicKey = localSigner?.publicKey ?? new PublicKey(publicWallet);
    this.#connection =
      connection ??
      new Connection(LIVE_RPC, {
        commitment: "confirmed",
        disableRetryOnRateLimit: true,
        confirmTransactionInitialTimeout: 25_000,
        // Dự phòng nằm DƯỚI lớp thử-lại-khi-429: đọc thì chuyển endpoint, ký thì không bao giờ.
        // DEV: `VITE_RPC_DU_PHONG`; production: `rpcDuPhong` của hiện trường qua `datDuPhongLive`.
        fetch: liveRpcFetch(
          fetchDuPhong(DS_RPC_LIVE, {
            ghiNhan: (q) => ghiNguonLive(q),
          }),
        ),
      });
    this.#inspect = inspector;
    this.#interpret = interpreter;
    this.view = {
      wallet: this.#publicKey.toBase58(),
      canSign: !!this.#wallet,
      lamports: null,
      accounts: null,
      balance: null,
      owner: null,
      protected: true,
      busy: false,
      status: "The default wallet is ready to receive Devnet SOL. Choose this wallet's keypair to sign.",
      pending: null,
      receipt: null,
      setupPending: null,
      send: { pha: "nghi" },
      delegate: null,
      allowance: null,
      closeAuthority: null,
      closed: false,
      actorAvailable: false,
      history: [],
      restored: false,
    };
  }
  unlock(key: Keypair) {
    if (this.#locked || this.#request) throw new Error("Wait for the current action to finish before unlocking.");
    if (!key.publicKey.equals(this.#publicKey))
      throw new Error("The keypair does not match the default wallet address. Switching to another wallet is not allowed.");
    this.#wallet = key;
    this.#update({ canSign: true, status: "Signing unlocked for the default wallet in this tab." });
  }
  #signer() {
    if (!this.#wallet) throw new Error("Choose the default wallet's keypair file before signing.");
    return this.#wallet;
  }
  subscribe(fn: (view: LiveView) => void) {
    this.#listeners.add(fn);
    return () => {
      this.#listeners.delete(fn);
    };
  }
  #update(patch: Partial<LiveView>) {
    this.view = { ...this.view, ...patch };
    this.view.actorAvailable = !!this.#actor();
    if (patch.receipt?.signature)
      this.view.history = [
        patch.receipt,
        ...this.view.history.filter((r) => r.signature !== patch.receipt!.signature),
      ].slice(0, 30);
    for (const fn of this.#listeners) fn(this.view);
  }
  snapshot(): PublicSession {
    return {
      version: 2,
      cluster: "devnet",
      wallet: this.view.wallet,
      accounts: this.view.accounts,
      setupPending: this.view.setupPending,
      setupExpiry: this.#setupExpiry,
      unresolved: this.#unresolved,
      receipts: this.view.history,
    };
  }
  async restore(value: unknown) {
    return this.#exclusive(async () => {
      if (this.#request || this.#unresolved)
        throw new Error("Finish the current request before restoring.");
      const saved = parsePublicSession(value, this.view.wallet);
      await this.#devnet();
      if (saved.accounts) {
        const a = saved.accounts;
        const setup = await this.#connection.getTransaction(a.setupSignature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (!setup?.meta || setup.meta.err !== null)
          throw new Error("The session setup transaction could not be verified. No new session is created automatically.");
        const keys = setup.transaction.message.getAccountKeys({
          accountKeysFromLookups: setup.meta.loadedAddresses,
        });
        const list = Array.from({ length: keys.length }, (_, i) => keys.get(i)!.toBase58());
        if (
          list[0] !== this.view.wallet ||
          ![a.mint, a.source, a.target, ...(a.extraTarget ? [a.extraTarget] : [])].every((k) =>
            list.includes(k),
          )
        )
          throw new Error("The manifest does not match the wallet's session setup transaction.");
        const [mint, target] = await Promise.all([
          getMint(this.#connection, new PublicKey(a.mint)),
          getAccount(this.#connection, new PublicKey(a.target)),
        ]);
        if (
          mint.decimals !== DECIMALS ||
          mint.mintAuthority !== null ||
          target.mint.toBase58() !== a.mint ||
          target.owner.toBase58() !== a.recipient
        )
          throw new Error("The mint/target account does not match the DEMO session.");
      }
      this.#unresolved = saved.unresolved;
      this.#setupExpiry = saved.setupExpiry;
      this.#update({
        accounts: saved.accounts,
        setupPending: saved.setupPending,
        history: saved.receipts,
        receipt: saved.receipts[0] ?? null,
        restored: true,
        status:
          "Public addresses restored. Re-reading balances and evidence from Devnet; the signing key is not stored.",
      });
      await this.#refresh();
    });
  }
  async #devnet() {
    // Identity is cached once. Fallbacks join `DS_RPC_LIVE` only after their OWN genesis check
    // (`datDuPhongLive`), so whichever endpoint answers here is Devnet.
    if (this.#verifiedDevnet) return;
    if ((await this.#connection.getGenesisHash()) !== DEVNET_GENESIS)
      throw new Error("Only a verified Solana Devnet network is allowed.");
    this.#verifiedDevnet = true;
  }
  /**
   * Khoá độc quyền cho mọi thao tác đổi trạng thái, gồm cả ký/gửi — chặn bấm đúp gửi hai lần.
   * KHÔNG hứa exactly-once trên toàn mạng: đây là khoá trong MỘT tab. Hai tab là hai tiến
   * trình; `PublicSessionCache` (Web Lock + so-rồi-ghi) giảm, không xoá được rủi ro đó.
   */
  async #exclusive<T>(work: () => Promise<T>): Promise<T> {
    if (this.#locked) throw new Error("An action is running. Please wait for the result.");
    this.#locked = true;
    try {
      this.#update({ busy: true });
      return await work();
    } finally {
      this.#locked = false;
      this.#update({ busy: false });
    }
  }
  #clearRequest() {
    ++this.#version;
    this.#gate.cancel();
    this.#request = null;
    this.#offered = null;
    this.#update({ pending: null });
  }
  setProtection(enabled: boolean) {
    if (this.#locked) throw new Error("Wait for the current action to finish before switching modes.");
    this.#clearRequest();
    this.#update({
      protected: enabled,
      status: enabled
        ? "Custos will check before you sign."
        : "Control mode: Custos does not decide whether you sign.",
    });
  }
  cancel() {
    if (this.#locked) throw new Error("An action that has started sending cannot be cancelled.");
    this.#clearRequest();
    this.#update({ status: "Cancelled before signing. The wallet will not send this transaction.", send: { pha: "nghi" } });
  }
  async refresh() {
    return this.#exclusive(() => this.#refresh());
  }
  async #refresh() {
    await this.#devnet();
    const lamports = await this.#connection.getBalance(this.#publicKey, "confirmed");
    const a = this.view.accounts;
    if (a) {
      try {
        const source = await getAccount(this.#connection, new PublicKey(a.source), "confirmed");
        if (source.mint.toBase58() !== a.mint) throw new Error("The source account does not use the session's mint.");
        this.#update({
          lamports,
          balance: source.amount.toString(),
          owner: source.owner.toBase58(),
          delegate: source.delegate?.toBase58() ?? null,
          allowance: source.delegatedAmount.toString(),
          closeAuthority: source.closeAuthority?.toBase58() ?? null,
          closed: false,
        });
      } catch (e) {
        if (!(e instanceof TokenAccountNotFoundError)) throw e;
        this.#update({
          lamports,
          balance: null,
          owner: null,
          delegate: null,
          allowance: null,
          closeAuthority: null,
          closed: true,
        });
      }
    } else this.#update({ lamports });
  }
  async faucet() {
    return this.#exclusive(async () => {
      await this.#devnet();
      this.#update({ status: "Requesting test SOL from the Devnet faucet…" });
      const sig = await this.#connection.requestAirdrop(this.#publicKey, 1_000_000_000);
      this.#update({
        status: `Faucet accepted the request (${sig.slice(0, 8)}…). Refresh the balance in a few seconds.`,
      });
      await this.#refresh();
    });
  }
  #transaction(instructions: TransactionInstruction[], blockhash: string, payer = this.#publicKey) {
    return new VersionedTransaction(
      new TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message(),
    );
  }
  async #send(
    tx: VersionedTransaction,
    expiry: Expiry,
    extra: Keypair[] = [],
    signed?: (sig: string) => void,
  ) {
    return guiGiaoDich({
      tx,
      ky: (t) => t.sign([this.#signer(), ...extra]),
      chuKy: (t) => {
        const sig = chuKyDauTien(t);
        if (sig) signed?.(sig);
        return sig;
      },
      conn: {
        sendTransaction: (t) =>
          this.#connection.sendTransaction(t as unknown as VersionedTransaction, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
            maxRetries: 2,
          }),
        confirmTransaction: (sig) =>
          this.#connection.confirmTransaction({ signature: sig, ...expiry }, "confirmed"),
      },
      bao: (send) => this.#update({ send }),
    });
  }
  /** Explicit setup button consent. Fresh mint/accounts, not the shared public fixture. */
  async setup() {
    return this.#exclusive(async () => {
      this.#signer();
      if (this.#unresolved)
        throw new Error("The previous send has an unresolved result. Look it up before creating another session.");
      this.#clearRequest();
      await this.#refresh();
      if ((this.view.lamports ?? 0) < 12_000_000)
        throw new Error(
          "At least 0.012 Devnet SOL is needed to create a session. Only fund the address above with test SOL.",
        );
      this.#update({ status: "Creating a mint and two dedicated token accounts on Devnet…", receipt: null });
      const mint = Keypair.generate(),
        source = Keypair.generate(),
        target = Keypair.generate(),
        extraTarget = Keypair.generate();
      const actor = Keypair.generate();
      const recipient = actor.publicKey;
      this.#actors.set(recipient.toBase58(), actor);
      const [mintRent, accountRent, expiry] = await Promise.all([
        this.#connection.getMinimumBalanceForRentExemption(MINT_SIZE),
        this.#connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE),
        this.#connection.getLatestBlockhash("confirmed"),
      ]);
      const create = (key: PublicKey, space: number, lamports: number) =>
        SystemProgram.createAccount({
          fromPubkey: this.#publicKey,
          newAccountPubkey: key,
          space,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        });
      const tx = this.#transaction(
        [
          create(mint.publicKey, MINT_SIZE, mintRent),
          createInitializeMint2Instruction(mint.publicKey, DECIMALS, this.#publicKey, null),
          create(source.publicKey, ACCOUNT_SIZE, accountRent),
          createInitializeAccount3Instruction(source.publicKey, mint.publicKey, this.#publicKey),
          create(target.publicKey, ACCOUNT_SIZE, accountRent),
          createInitializeAccount3Instruction(target.publicKey, mint.publicKey, recipient),
          create(extraTarget.publicKey, ACCOUNT_SIZE, accountRent),
          createInitializeAccount3Instruction(extraTarget.publicKey, mint.publicKey, recipient),
          SystemProgram.transfer({ fromPubkey: this.#publicKey, toPubkey: recipient, lamports: 1_000_000 }),
          createMintToInstruction(mint.publicKey, source.publicKey, this.#publicKey, 500_000_000n),
          createSetAuthorityInstruction(mint.publicKey, this.#publicKey, AuthorityType.MintTokens, null),
        ],
        expiry.blockhash,
      );
      const accounts: DemoAccounts = {
        mint: mint.publicKey.toBase58(),
        source: source.publicKey.toBase58(),
        target: target.publicKey.toBase58(),
        extraTarget: extraTarget.publicKey.toBase58(),
        recipient: recipient.toBase58(),
        setupSignature: "",
      };
      this.#setupExpiry = expiry.lastValidBlockHeight;
      const sent = await this.#send(tx, expiry, [mint, source, target, extraTarget], (sig) => {
        accounts.setupSignature = sig;
        this.#unresolved = true;
        this.#update({ setupPending: { ...accounts }, actorAvailable: true });
      });
      if (!("sig" in sent)) throw new Error("loi" in sent ? sent.loi : "The session setup transaction could not be sent.");
      accounts.setupSignature = sent.sig;
      if (sent.pha !== "thanhCong") {
        this.#unresolved = sent.pha === "chuaRo";
        this.#update({ setupPending: this.#unresolved ? accounts : null });
        throw new Error(
          `Session setup ${sent.pha === "chuaRo" ? "has an unresolved result" : "failed"}. Check signature ${sent.sig} on Explorer; it will not be resent automatically.`,
        );
      }
      this.#unresolved = false;
      this.#update({
        accounts,
        setupPending: null,
        actorAvailable: true,
        status: "Session ready: 500 DEMO. Mint authority revoked.",
        send: { pha: "nghi" },
      });
      await this.#refresh();
    });
  }
  async recoverSetup() {
    return this.#exclusive(async () => {
      const pending = this.view.setupPending;
      if (!pending) return;
      await this.#devnet();
      const data = await this.#connection.getTransaction(pending.setupSignature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!data?.meta || data.meta.err === undefined) {
        if (this.#setupExpiry && (await this.#connection.getBlockHeight("finalized")) > this.#setupExpiry) {
          const statuses = await this.#connection.getSignatureStatuses([pending.setupSignature], {
            searchTransactionHistory: true,
          });
          if (statuses.value[0] === null) {
            this.#unresolved = false;
            this.#update({
              setupPending: null,
              status: `The session setup transaction expired; the RPC did not find signature ${pending.setupSignature}. Check Explorer before deliberately creating a new session; it will not be resent automatically.`,
            });
            return;
          }
        }
        throw new Error("The session setup transaction is unresolved. Keep the signature and try looking it up again.");
      }
      this.#unresolved = false;
      this.#update({ setupPending: null });
      if (data.meta.err !== null) throw new Error("Session setup failed on-chain. You can create a new session.");
      this.#update({
        accounts: pending,
        send: { pha: "nghi" },
        status: "Found a successful session setup transaction. Not resending.",
      });
      await this.#refresh();
    });
  }
  #accountState() {
    return JSON.stringify([
      this.view.balance,
      this.view.owner,
      this.view.delegate,
      this.view.allowance,
      this.view.closeAuthority,
      this.view.closed,
    ]);
  }
  async offerDapp(): Promise<LiveHandoff> {
    return this.#exclusive(async () => {
      this.#signer();
      if (this.#unresolved || this.#request)
        throw new Error("Resolve the current request before connecting an app.");
      await this.#refresh();
      const a = this.view.accounts;
      if (
        !a ||
        this.view.owner !== this.view.wallet ||
        this.view.closed ||
        BigInt(this.view.balance ?? "0") < 2n
      )
        throw new Error("A DEMO session that still has tokens and control is required.");
      const expiry = await this.#connection.getLatestBlockhash("confirmed");
      this.#offered = {
        nonce: crypto.randomUUID(),
        wallet: this.view.wallet,
        source: a.source,
        target: a.target,
        actor: a.recipient,
        mint: a.mint,
        amount: (BigInt(this.view.balance!) / 2n).toString(),
        ...expiry,
      };
      return { ...this.#offered };
    });
  }
  async acceptDapp(nonce: string, serialized: string) {
    const offered = this.#offered;
    if (
      !offered ||
      offered.nonce !== nonce ||
      serialized.length > 2000 ||
      serialized !== buildLiveHandoff(offered)
    )
      throw new Error("The dApp request does not match the connected session/message.");
    this.#offered = null;
    await this.prepare(
      "attack",
      {},
      {
        tx: VersionedTransaction.deserialize(Buffer.from(serialized, "base64")),
        expiry: { blockhash: offered.blockhash, lastValidBlockHeight: offered.lastValidBlockHeight },
      },
    );
  }
  async prepare(
    kind: LiveKind,
    input: { amount?: string; target?: string } = {},
    handedOff?: { tx: VersionedTransaction; expiry: Expiry },
  ) {
    return this.#exclusive(async () => {
      const actorStep = SCENARIOS[kind].signer === "actor";
      if (!actorStep) this.#signer();
      else if (!this.#actor())
        throw new Error("The app key exists only in the tab that created the session. Create a new session to run app steps.");
      if (this.#unresolved) throw new Error("The previous send has an unresolved result. Look it up first.");
      this.#clearRequest();
      const version = this.#version;
      await this.#refresh();
      const a = this.view.accounts;
      if (!a) throw new Error("Create a session first.");
      if (this.view.closed) throw new Error("The account is closed. Create a new session to keep trying.");
      if (!actorStep && this.view.owner !== this.view.wallet)
        throw new Error("The account changed owner. Create a new session to try again.");
      const before = BigInt(this.view.balance ?? "0");
      const usesAmount = ["transfer", "extra", "approve", "delegate-transfer"].includes(kind);
      const amount =
        kind === "attack" ? before / 2n : usesAmount ? parseDemoAmount(input.amount ?? "10") : 0n;
      if (
        (usesAmount || kind === "attack") &&
        (amount <= 0n || (kind !== "approve" && amount + (kind === "extra" ? 1_000_000n : 0n) > before))
      )
        throw new Error("Not enough DEMO tokens; create a new session.");
      if (
        kind === "delegate-transfer" &&
        (this.view.delegate !== a.recipient || BigInt(this.view.allowance ?? "0") < amount)
      )
        throw new Error("The app has no allowance or the remaining allowance is not enough.");
      if (kind === "close" && (this.view.closeAuthority !== a.recipient || before !== 0n))
        throw new Error("The account can only be closed when it is empty and the app holds close authority.");
      let target: PublicKey;
      try {
        target = new PublicKey(input.target || a.target);
      } catch {
        throw new Error("Invalid target token account address.");
      }
      if (target.toBase58() === a.source) throw new Error("The recipient account must differ from the source account.");
      if (input.target && target.toBase58() !== a.target) {
        const dest = await getAccount(this.#connection, target, "confirmed");
        if (dest.mint.toBase58() !== a.mint || dest.isFrozen)
          throw new Error("The recipient account must use the DEMO mint and must not be frozen.");
      }
      const signer = actorStep ? this.#actor()!.publicKey : this.#publicKey;
      const expiry = handedOff?.expiry ?? (await this.#connection.getLatestBlockhash("confirmed"));
      if (handedOff && (await this.#connection.getBlockHeight("confirmed")) > expiry.lastValidBlockHeight)
        throw new Error("The dApp request expired. Reconnect to create a new request.");
      const ix = buildScenario(kind, {
        source: new PublicKey(a.source),
        target,
        owner: this.#publicKey,
        actor: new PublicKey(a.recipient),
        amount,
        balance: before,
        extraTarget: a.extraTarget ? new PublicKey(a.extraTarget) : undefined,
      });
      const tx = this.#transaction(ix, expiry.blockhash, signer),
        bytes = tx.message.serialize().slice();
      if (handedOff && maBase58(handedOff.tx.message.serialize()) !== maBase58(bytes))
        throw new Error("The session state changed; the old dApp request will not be signed.");
      const protectedMode = this.view.protected;
      this.#update({
        status: protectedMode
          ? "Custos is simulating before you sign…"
          : "Preparing control run; recording a separate prediction, not used to gate signing…",
        receipt: null,
        send: { pha: "nghi" },
      });
      let result: InspectResult | null = null;
      // Host đã trả lời lượt kiểm được nhận — thẻ cảnh báo hiện ĐÚNG nó (review lần 4).
      let nguonDoc: string[] = [];
      const captured: { facts?: Facts } = {};
      /*
       * MỘT NGUỒN CHO MỘT LƯỢT KIỂM (review 27/09). Trộn ⇒ đọc lại MỘT lần; vẫn trộn:
       * bảo vệ bật thì từ chối (không có yêu cầu ký nào dựng từ kết quả ghép); bảo vệ tắt
       * thì bỏ dự báo — kiểm lúc đó chỉ để đo, và một dự báo ghép thì không đo được gì.
       */
      const kiemMotLan = async () => {
        // Facts của lượt TRƯỚC không được sống sang lượt này (và dự báo không dựng từ nó).
        captured.facts = undefined;
        const lanNay = { nguon: new Set<string>(), tu: Date.now() };
        NGUON_DOC_LIVE.hienTai = lanNay;
        try {
          const r = await kiemMotLanGoc();
          return { r, nguon: [...lanNay.nguon] };
        } finally {
          if (NGUON_DOC_LIVE.hienTai === lanNay) NGUON_DOC_LIVE.hienTai = null;
        }
      };
      const kiemMotLanGoc = () =>
        coHan(this.#inspect(
          {
            connection: this.#connection,
            interpret: async (...args) => {
              captured.facts = args[0];
              return this.#interpret(...args);
            },
          },
          tx,
          {
            nguoiDung: signer.toBase58(),
            locale: "en",
            kyHieuToken: { [a.mint]: "DEMO" },
          },
        ), CAU_HINH_LIVE.hanKiemMs);
      try {
        let lan = await kiemMotLan();
        if (lan.nguon.length > 1) lan = await kiemMotLan();
        if (lan.nguon.length > 1) {
          // Dự báo cũng không được dựng từ Facts ghép (review lần 2, mục 1).
          captured.facts = undefined;
          if (protectedMode) {
            throw new Error(
              `Two RPC providers answered two halves of the same check, twice in a row (${lan.nguon.join(" + ")}) — no signing request is created from a stitched result.`,
            );
          }
          throw new LoiNguonTron(lan.nguon);
        }
        result = lan.r;
        nguonDoc = lan.nguon;
      } catch (e) {
        // Bảo vệ bật: chưa kiểm xong thì KHÔNG có yêu cầu ký — quá hạn là lý do, nói rõ.
        if (protectedMode) {
          throw e instanceof LoiQuaHan
            ? new Error(
                `Custos had no simulation result after ${Math.round(e.ms / 1000)} seconds (timed out) — no signing request is created before the check finishes.`,
              )
            : e;
        }
      }
      if (version !== this.#version) return;
      const prediction = dungDuBao({
        result,
        facts: captured.facts,
        source: a.source,
        mint: a.mint,
        target: target.toBase58(),
        message: bytes,
      });
      // Only the protected policy uses an inspection anchor. The control still pins consent to bytes.
      const anchor = protectedMode && result ? neoKetQua(bytes, signer.toBase58(), "devnet") : null;
      const id = this.#gate.prepare(bytes, signer.toBase58(), protectedMode, anchor);
      const fee = await this.#connection
        .getFeeForMessage(tx.message, "confirmed")
        .then((r) => r.value)
        .catch(() => null);
      const view: PendingView = {
        id,
        kind,
        protected: protectedMode,
        amount: amount.toString(),
        result,
        prediction,
        fee,
        signer: signer.toBase58(),
        target: target.toBase58(),
        state: this.#accountState(),
        nguonDoc,
      };
      this.#request = { tx, expiry, view };
      this.#update({ pending: view, status: "Not signed, not sent. You decide at the confirmation step." });
    });
  }
  async execute(id: number, action: "approve" | "override" = "approve") {
    return this.#exclusive(async () => {
      const request = this.#request;
      if (!request || request.view.id !== id) throw new Error("The request was cancelled or changed.");
      // `aiAdvisory` KHÔNG đổi `level`, nhưng cũng không được để ký thẳng — phản biện 26/09, F-03.
      if (request.view.protected && canBoQua(request.view.result) && action !== "override")
        throw new Error("You must explicitly confirm overriding the warning for this exact request.");
      await this.#refresh();
      if (this.#accountState() !== request.view.state)
        throw new Error("The account state changed. Create a new request.");
      if (request.view.prediction.before !== null && request.view.prediction.before !== this.view.balance)
        throw new Error("The balance changed after simulation. Create a new request.");
      if ((await this.#connection.getBlockHeight("confirmed")) > request.expiry.lastValidBlockHeight)
        throw new Error("The transaction expired. Pick the scenario again for a new check.");
      this.#gate.consume(id, request.tx.message.serialize(), request.view.signer);
      this.#request = null;
      this.#update({ pending: null });
      const receipt: LiveReceipt = {
        signature: "",
        cluster: "devnet",
        kind: request.view.kind,
        protected: request.view.protected,
        prediction: request.view.prediction,
        observation: null,
        comparison: null,
        createdAt: new Date().toISOString(),
        note: "Signing/sending; no execution evidence yet.",
        wallet: this.view.wallet,
        signer: request.view.signer,
        expiresAtBlock: request.expiry.lastValidBlockHeight,
        decision: {
          action,
          level: request.view.result?.level ?? null,
          aiAdvisory: request.view.result?.aiAdvisory ?? null,
          reasonCodes: [...(request.view.result?.reasonCodes ?? [])],
          requestId: id,
          at: new Date().toISOString(),
          policy: "warn_and_allow_override",
        },
      };
      // Persist the actual signature as soon as signing succeeds, even if the RPC times out.
      const sent = await guiGiaoDich({
        tx: request.tx,
        ky: (t) =>
          t.sign([SCENARIOS[request.view.kind].signer === "actor" ? this.#actor()! : this.#signer()]),
        chuKy: (t) => {
          // Chưa ký đủ ⇒ null: `guiGiaoDich` báo chưa gửi, không bịa ID toàn số 0 (T02).
          const sig = chuKyDauTien(t);
          if (!sig) return null;
          receipt.signature = sig;
          this.#unresolved = true;
          this.#update({ receipt: { ...receipt } });
          return sig;
        },
        conn: {
          sendTransaction: (t) =>
            this.#connection.sendTransaction(t as unknown as VersionedTransaction, {
              skipPreflight: false,
              preflightCommitment: "confirmed",
              maxRetries: 2,
            }),
          confirmTransaction: (sig) =>
            this.#connection.confirmTransaction({ signature: sig, ...request.expiry }, "confirmed"),
        },
        bao: (send) => this.#update({ send }),
      });
      this.#unresolved = sent.pha === "chuaRo";
      if ("sig" in sent) {
        receipt.signature = sent.sig;
        this.#update({
          receipt: {
            ...receipt,
            note:
              sent.pha === "thanhCong"
                ? "Confirmed; reading the consequences…"
                : "Check the evidence on Devnet; it will not be resent automatically.",
          },
        });
        await this.#readReceipt();
      } else this.#update({ status: "loi" in sent ? sent.loi : "Could not send." });
      await this.#refresh();
    });
  }
  /** Query-only recovery. It never signs or resubmits anything. */
  async readReceipt(saved?: LiveReceipt) {
    return this.#exclusive(() => this.#readReceipt(saved));
  }
  async #readReceipt(saved?: LiveReceipt) {
    const receipt = saved ?? this.view.receipt;
    if (!receipt?.signature) return;
    if (this.#unresolved && (this.view.setupPending || receipt.signature !== this.view.receipt?.signature))
      throw new Error("Look up the signature of the unresolved send first.");
    await this.#devnet();
    const data = await this.#connection.getTransaction(receipt.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!data?.meta) {
      if (
        receipt.expiresAtBlock &&
        (await this.#connection.getBlockHeight("finalized")) > receipt.expiresAtBlock
      ) {
        const statuses = await this.#connection.getSignatureStatuses([receipt.signature], {
          searchTransactionHistory: true,
        });
        if (statuses.value[0] === null) {
          this.#unresolved = false;
          this.#update({
            receipt: {
              ...receipt,
              resolution: "expired-unobserved",
              note: "The blockhash expired at finalized; the RPC did not find the signature in history. This does not prove the transaction never happened. Check Explorer and the balance before creating a new request.",
            },
            status: "Expired; execution not observed. You can prepare a new request; it will not be resent automatically.",
          });
          return;
        }
      }
      this.#update({
        receipt: { ...receipt, note: "Metadata not read yet. Click Look up again; no new transaction is sent." },
        status: "Not enough evidence to compare yet.",
      });
      return;
    }
    const observation = await dungQuanSat(this.#connection, receipt, data);
    this.#unresolved = false;
    this.#update({
      receipt: {
        ...receipt,
        observation,
        comparison: compareReceipt(receipt.prediction, observation),
        resolution: data.meta.err === null ? "confirmed" : "failed",
        note:
          data.meta.err === null
            ? "Balances come from the transaction metadata; ownership is re-read from the account at the slot shown below."
            : "The transaction failed during execution. The prediction must not be read as what happened.",
      },
      status:
        data.meta.err === null
          ? "Execution evidence read from Devnet."
          : "Devnet recorded the transaction as failed.",
    });
  }
}

// Giữ đường import cũ: `canBoQua` nay ở `policy.ts`, `quyChoGiaoDich` ở `quanSat.ts`.
export { canBoQua } from "./policy.ts";
export { quyChoGiaoDich } from "./quanSat.ts";
