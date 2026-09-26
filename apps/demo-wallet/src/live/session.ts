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
import { danhSachRpc, fetchDuPhong } from "../../../../scripts/rpcDuPhong.ts";
import { compareReceipt, type LiveReceipt, type Prediction } from "./receipt.ts";
import { DEFAULT_DEMO_WALLET } from "../../../../scripts/demo-wallet-config.ts";
import { buildScenario, parseDemoAmount, SCENARIOS, type LiveKind } from "./scenarios.ts";
import { parsePublicSession, type DemoAccounts, type PublicSession } from "./store.ts";
import { buildLiveHandoff, type LiveHandoff } from "./handoff.ts";
export type { LiveKind } from "./scenarios.ts";
export type { DemoAccounts } from "./store.ts";

export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const LIVE_RPC = "https://api.devnet.solana.com";
export const DECIMALS = 6;
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
        // `VITE_RPC_DU_PHONG` chỉ đọc khi DEV — review 26/09, mục 3.3.
        fetch: liveRpcFetch(
          fetchDuPhong(
            danhSachRpc(LIVE_RPC, import.meta.env?.DEV ? import.meta.env["VITE_RPC_DU_PHONG"] : undefined),
          ),
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
      status: "Ví mặc định đã sẵn sàng để nhận SOL Devnet. Chọn keypair đúng ví để ký.",
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
    if (this.#locked || this.#request) throw new Error("Chờ thao tác hiện tại hoàn tất trước khi mở khoá.");
    if (!key.publicKey.equals(this.#publicKey))
      throw new Error("Keypair không khớp địa chỉ ví mặc định. Không đổi sang ví khác.");
    this.#wallet = key;
    this.#update({ canSign: true, status: "Đã mở quyền ký cho ví mặc định trong tab này." });
  }
  #signer() {
    if (!this.#wallet) throw new Error("Chọn file keypair của ví mặc định trước khi ký.");
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
        throw new Error("Kết thúc yêu cầu hiện tại trước khi khôi phục.");
      const saved = parsePublicSession(value, this.view.wallet);
      await this.#devnet();
      if (saved.accounts) {
        const a = saved.accounts;
        const setup = await this.#connection.getTransaction(a.setupSignature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (!setup?.meta || setup.meta.err !== null)
          throw new Error("Chưa xác minh được giao dịch tạo phiên. Không tạo phiên mới tự động.");
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
          throw new Error("Manifest không khớp giao dịch tạo phiên của ví.");
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
          throw new Error("Mint/tài khoản đích không khớp phiên DEMO.");
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
          "Đã khôi phục địa chỉ công khai. Đọc lại số dư và bằng chứng từ Devnet; khoá ký không được lưu.",
      });
      await this.#refresh();
    });
  }
  async #devnet() {
    // Endpoint is immutable for this session. Cache identity, not account state.
    if (this.#verifiedDevnet) return;
    if ((await this.#connection.getGenesisHash()) !== DEVNET_GENESIS)
      throw new Error("Chỉ cho phép mạng Solana Devnet đã xác minh.");
    this.#verifiedDevnet = true;
  }
  /**
   * Khoá độc quyền cho mọi thao tác đổi trạng thái, gồm cả ký/gửi — chặn bấm đúp gửi hai lần.
   * KHÔNG hứa exactly-once trên toàn mạng: đây là khoá trong MỘT tab. Hai tab là hai tiến
   * trình; `PublicSessionCache` (Web Lock + so-rồi-ghi) giảm, không xoá được rủi ro đó.
   */
  async #exclusive<T>(work: () => Promise<T>): Promise<T> {
    if (this.#locked) throw new Error("Một thao tác đang chạy. Hãy chờ kết quả.");
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
    if (this.#locked) throw new Error("Chờ thao tác hiện tại hoàn tất trước khi đổi chế độ.");
    this.#clearRequest();
    this.#update({
      protected: enabled,
      status: enabled
        ? "Custos sẽ kiểm tra trước khi bạn ký."
        : "Chế độ đối chứng: Custos không quyết định việc ký.",
    });
  }
  cancel() {
    if (this.#locked) throw new Error("Không thể huỷ thao tác đã bắt đầu gửi.");
    this.#clearRequest();
    this.#update({ status: "Đã huỷ trước khi ký. Ví không gửi giao dịch này.", send: { pha: "nghi" } });
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
        if (source.mint.toBase58() !== a.mint) throw new Error("Tài khoản nguồn không đúng mint của phiên.");
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
      this.#update({ status: "Đang xin SOL thử nghiệm từ faucet Devnet…" });
      const sig = await this.#connection.requestAirdrop(this.#publicKey, 1_000_000_000);
      this.#update({
        status: `Faucet đã nhận yêu cầu (${sig.slice(0, 8)}…). Bấm cập nhật số dư sau vài giây.`,
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
        throw new Error("Lượt gửi trước chưa rõ kết quả. Tra cứu trước khi tạo phiên khác.");
      this.#clearRequest();
      await this.#refresh();
      if ((this.view.lamports ?? 0) < 12_000_000)
        throw new Error(
          "Cần ít nhất 0,012 SOL Devnet để tạo phiên. Chỉ nạp SOL thử nghiệm vào địa chỉ trên.",
        );
      this.#update({ status: "Đang tạo mint và hai tài khoản token riêng trên Devnet…", receipt: null });
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
      if (!("sig" in sent)) throw new Error("loi" in sent ? sent.loi : "Chưa gửi được giao dịch tạo phiên.");
      accounts.setupSignature = sent.sig;
      if (sent.pha !== "thanhCong") {
        this.#unresolved = sent.pha === "chuaRo";
        this.#update({ setupPending: this.#unresolved ? accounts : null });
        throw new Error(
          `Tạo phiên ${sent.pha === "chuaRo" ? "chưa rõ kết quả" : "thất bại"}. Kiểm chữ ký ${sent.sig} trên Explorer; không tự gửi lại.`,
        );
      }
      this.#unresolved = false;
      this.#update({
        accounts,
        setupPending: null,
        actorAvailable: true,
        status: "Phiên sẵn sàng: 500 DEMO. Quyền phát hành đã thu hồi.",
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
              status: `Giao dịch tạo phiên đã hết hạn; RPC không tìm thấy signature ${pending.setupSignature}. Kiểm Explorer trước khi chủ động tạo phiên mới; không tự gửi lại.`,
            });
            return;
          }
        }
        throw new Error("Chưa rõ giao dịch tạo phiên. Giữ signature và thử tra cứu lại.");
      }
      this.#unresolved = false;
      this.#update({ setupPending: null });
      if (data.meta.err !== null) throw new Error("Tạo phiên đã thất bại trên chuỗi. Có thể tạo phiên mới.");
      this.#update({
        accounts: pending,
        send: { pha: "nghi" },
        status: "Đã tìm thấy giao dịch tạo phiên thành công. Không gửi lại.",
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
        throw new Error("Giải quyết yêu cầu trước khi kết nối ứng dụng.");
      await this.#refresh();
      const a = this.view.accounts;
      if (
        !a ||
        this.view.owner !== this.view.wallet ||
        this.view.closed ||
        BigInt(this.view.balance ?? "0") < 2n
      )
        throw new Error("Cần phiên DEMO còn token và quyền kiểm soát.");
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
      throw new Error("Yêu cầu dApp không khớp phiên/message được kết nối.");
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
        throw new Error("Khoá ứng dụng chỉ ở tab đã tạo phiên. Tạo phiên mới để chạy bước ứng dụng.");
      if (this.#unresolved) throw new Error("Lượt gửi trước chưa rõ kết quả. Hãy tra cứu trước.");
      this.#clearRequest();
      const version = this.#version;
      await this.#refresh();
      const a = this.view.accounts;
      if (!a) throw new Error("Hãy tạo phiên trước.");
      if (this.view.closed) throw new Error("Tài khoản đã đóng. Tạo phiên mới để thử tiếp.");
      if (!actorStep && this.view.owner !== this.view.wallet)
        throw new Error("Tài khoản đã đổi chủ. Hãy tạo phiên mới để thử lại.");
      const before = BigInt(this.view.balance ?? "0");
      const usesAmount = ["transfer", "extra", "approve", "delegate-transfer"].includes(kind);
      const amount =
        kind === "attack" ? before / 2n : usesAmount ? parseDemoAmount(input.amount ?? "10") : 0n;
      if (
        (usesAmount || kind === "attack") &&
        (amount <= 0n || (kind !== "approve" && amount + (kind === "extra" ? 1_000_000n : 0n) > before))
      )
        throw new Error("Không đủ token DEMO; hãy tạo phiên mới.");
      if (
        kind === "delegate-transfer" &&
        (this.view.delegate !== a.recipient || BigInt(this.view.allowance ?? "0") < amount)
      )
        throw new Error("Ứng dụng không có quyền hoặc lượng cấp còn lại không đủ.");
      if (kind === "close" && (this.view.closeAuthority !== a.recipient || before !== 0n))
        throw new Error("Chỉ đóng khi tài khoản rỗng và ứng dụng có quyền đóng.");
      let target: PublicKey;
      try {
        target = new PublicKey(input.target || a.target);
      } catch {
        throw new Error("Địa chỉ tài khoản token đích không hợp lệ.");
      }
      if (target.toBase58() === a.source) throw new Error("Tài khoản nhận phải khác tài khoản nguồn.");
      if (input.target && target.toBase58() !== a.target) {
        const dest = await getAccount(this.#connection, target, "confirmed");
        if (dest.mint.toBase58() !== a.mint || dest.isFrozen)
          throw new Error("Tài khoản nhận phải cùng mint DEMO và không bị đóng băng.");
      }
      const signer = actorStep ? this.#actor()!.publicKey : this.#publicKey;
      const expiry = handedOff?.expiry ?? (await this.#connection.getLatestBlockhash("confirmed"));
      if (handedOff && (await this.#connection.getBlockHeight("confirmed")) > expiry.lastValidBlockHeight)
        throw new Error("Yêu cầu dApp đã hết hạn. Kết nối lại để tạo yêu cầu mới.");
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
        throw new Error("Trạng thái phiên đã thay đổi; không ký yêu cầu dApp cũ.");
      const protectedMode = this.view.protected;
      this.#update({
        status: protectedMode
          ? "Custos đang mô phỏng trước khi ký…"
          : "Đang chuẩn bị đối chứng; đo dự báo riêng, không dùng làm cổng ký…",
        receipt: null,
        send: { pha: "nghi" },
      });
      let result: InspectResult | null = null;
      const captured: { facts?: Facts } = {};
      try {
        result = await this.#inspect(
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
            locale: "vi",
            kyHieuToken: { [a.mint]: "DEMO" },
          },
        );
      } catch (e) {
        if (protectedMode) throw e;
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
      };
      this.#request = { tx, expiry, view };
      this.#update({ pending: view, status: "Chưa ký, chưa gửi. Bạn quyết định ở bước xác nhận." });
    });
  }
  async execute(id: number, action: "approve" | "override" = "approve") {
    return this.#exclusive(async () => {
      const request = this.#request;
      if (!request || request.view.id !== id) throw new Error("Yêu cầu đã huỷ hoặc thay đổi.");
      // `aiAdvisory` KHÔNG đổi `level`, nhưng cũng không được để ký thẳng — phản biện 26/09, F-03.
      if (request.view.protected && canBoQua(request.view.result) && action !== "override")
        throw new Error("Cần xác nhận chủ động bỏ qua cảnh báo cho đúng yêu cầu này.");
      await this.#refresh();
      if (this.#accountState() !== request.view.state)
        throw new Error("Trạng thái tài khoản thay đổi. Hãy tạo yêu cầu mới.");
      if (request.view.prediction.before !== null && request.view.prediction.before !== this.view.balance)
        throw new Error("Số dư thay đổi sau mô phỏng. Hãy tạo yêu cầu mới.");
      if ((await this.#connection.getBlockHeight("confirmed")) > request.expiry.lastValidBlockHeight)
        throw new Error("Giao dịch hết hạn. Hãy chọn lại kịch bản để kiểm tra mới.");
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
        note: "Đang ký/gửi; chưa có bằng chứng thực thi.",
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
                ? "Đã xác nhận; đang đọc hậu quả…"
                : "Kiểm tra bằng chứng trên Devnet; không tự gửi lại.",
          },
        });
        await this.#readReceipt();
      } else this.#update({ status: "loi" in sent ? sent.loi : "Chưa gửi được." });
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
      throw new Error("Tra cứu đúng signature của lượt gửi chưa rõ trước.");
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
              note: "Blockhash đã hết hạn ở finalized; RPC không tìm thấy signature trong lịch sử. Không khẳng định giao dịch chưa từng xảy ra. Kiểm Explorer và số dư trước khi tạo yêu cầu mới.",
            },
            status: "Đã hết hạn; chưa quan sát được thực thi. Có thể chuẩn bị yêu cầu mới, không tự gửi lại.",
          });
          return;
        }
      }
      this.#update({
        receipt: { ...receipt, note: "Chưa đọc được metadata. Bấm Tra cứu lại; không gửi giao dịch mới." },
        status: "Chưa đủ bằng chứng để đối chiếu.",
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
            ? "Số dư lấy từ metadata giao dịch; quyền sở hữu đọc lại từ tài khoản ở slot ghi bên dưới."
            : "Giao dịch thất bại khi thực thi. Không được xem dự báo là hậu quả đã xảy ra.",
      },
      status:
        data.meta.err === null
          ? "Đã đọc bằng chứng thực thi trên Devnet."
          : "Devnet ghi nhận giao dịch thất bại.",
    });
  }
}

// Giữ đường import cũ: `canBoQua` nay ở `policy.ts`, `quyChoGiaoDich` ở `quanSat.ts`.
export { canBoQua } from "./policy.ts";
export { quyChoGiaoDich } from "./quanSat.ts";
