/**
 * PHÁT LẠI RPC TỪ FIXTURE — phần dùng chung cho Node VÀ trình duyệt (CK-02).
 *
 * Trước 27/09 toàn bộ adapter nằm ở `scripts/ky-thuat/replay-rpc.ts`, kéo theo
 * `node:fs` và `node:crypto`, nên chỉ CLI chạy được. Ví mẫu muốn "chạy lại engine trên
 * dữ liệu đã ghi" thì phải có cùng adapter trong trình duyệt — một bản thứ hai viết lại
 * là mở đường cho hai cách đọc cùng một fixture khác nhau. Nên tách ở đây, không chép.
 *
 * Không có `import` nào chạm mạng hay hệ tệp. Khoá request băm bằng `sha256Hex` của
 * core — cùng thuật toán và cùng chuỗi đầu vào với `createHash` trước đây, nên 29
 * fixture đã ghi vẫn khớp khoá (canh bởi `replayRpc.test.ts`).
 */
import { Buffer } from "buffer";
import { AddressLookupTableAccount, PublicKey } from "@solana/web3.js";
import type { VersionedTransaction } from "@solana/web3.js";
import { sha256Hex } from "../packages/core/src/sha256.ts";

/** Các phương thức `extractFacts` gọi, cộng hai phương thức luồng kịch bản của ví cần. */
export type Method =
  | "getSignaturesForAddress"
  | "getMultipleAccountsInfo"
  | "getFeeForMessage"
  | "getAddressLookupTable"
  | "simulateTransaction"
  // Luồng kịch bản: blockhash để dựng tx, và số dư sống của tài khoản nguồn.
  | "getLatestBlockhash"
  | "getParsedAccountInfo";

export type BanGhi = {
  method: Method;
  khoa: string;
  thamSo: unknown;
  ketQua: unknown;
};

export type Fixture = {
  phienBan: number;
  id: string;
  captureLuc: string;
  /** Host đã làm sạch — không bao giờ là URL đầy đủ (có thể mang khoá). */
  nguon: string;
  banGhi: BanGhi[];
};

export function khoaRequest(method: Method, thamSo: unknown): string {
  return `${method}:${sha256Hex(JSON.stringify(thamSo)).slice(0, 16)}`;
}

/** Chỉ giữ host: path/query của URL RPC có thể chứa khoá API. MỘT bản, ở `rpcDuPhong.ts`. */
export { hostCuaRpc as locNguon } from "./rpcDuPhong.ts";

export class ThieuFixture extends Error {
  readonly method: Method;
  readonly khoa: string;
  readonly thamSo: unknown;
  constructor(method: Method, khoa: string, thamSo: unknown) {
    super(
      `thiếu fixture cho ${method} (khoá ${khoa}). ` +
        "Replay KHÔNG tự rơi về mạng — ghi lại fixture nếu muốn phủ lời gọi này.",
    );
    this.method = method;
    this.khoa = khoa;
    this.thamSo = thamSo;
    this.name = "ThieuFixture";
  }
}

/**
 * Chuyển giá trị trả về của RPC thành thứ JSON giữ được.
 *
 * `Buffer` và `bigint` là hai thứ mất trắng qua `JSON.stringify` — `Buffer` thành
 * một object `{type:"Buffer",data:[...]}` khổng lồ, `bigint` thì ném lỗi. Mã hoá
 * tường minh để `hoiSinh` dựng lại đúng.
 *
 * `PublicKey` thành `{__pubkey: "<base58>"}` — **không** thành chuỗi trần.
 *
 * Đây là một lỗi đã mắc và phải đo mới thấy. Bản đầu mã hoá `PublicKey` thành chuỗi
 * base58; replay trả về chuỗi đó, và `parseTokenAccount` gọi `info.owner.toBase58()`
 * trên một `string` → **19/19 mẫu lỗi**.
 *
 * Không sửa được bằng cách đoán theo tên trường, vì web3.js dùng hai kiểu khác nhau
 * cho cùng một tên:
 *
 *   · `AccountInfo.owner`                  → `PublicKey`  (index.d.ts:3019)
 *   · `SimulatedTransactionAccountInfo.owner` → `string`   (index.d.ts:2219)
 *
 * Nên phải ghi lại **kiểu thật tại thời điểm capture**, và đó là việc của chỗ này.
 */
export function deJson(x: unknown): unknown {
  if (x === null || x === undefined) return x ?? null;
  if (typeof x === "bigint") return `${x}`;
  if (Buffer.isBuffer(x)) return { __buffer: x.toString("base64") };
  if (x instanceof Uint8Array) return { __buffer: Buffer.from(x).toString("base64") };
  if (Array.isArray(x)) return x.map(deJson);
  if (typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (typeof o["toBase58"] === "function") return { __pubkey: (o["toBase58"] as () => string)() };
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deJson(v)]));
  }
  return x;
}

/** Chiều ngược của `deJson`. */
export function hoiSinh(x: unknown): unknown {
  if (x === null || typeof x !== "object") return x;
  if (Array.isArray(x)) return x.map(hoiSinh);
  const o = x as Record<string, unknown>;
  if (typeof o["__buffer"] === "string") return Buffer.from(o["__buffer"], "base64");
  if (typeof o["__pubkey"] === "string") return new PublicKey(o["__pubkey"]);
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, hoiSinh(v)]));
}

/** Tham số dùng làm khoá cho từng phương thức — MỘT chỗ, cho cả ghi lẫn phát lại. */
export const THAM_SO = {
  getSignaturesForAddress: (dc: PublicKey, cfg: unknown) => ({ dc: dc.toBase58(), cfg }),
  getMultipleAccountsInfo: (keys: PublicKey[]) => ({ keys: keys.map((k) => k.toBase58()) }),
  getFeeForMessage: (msg: { serialize(): Uint8Array }) => ({
    msg: Buffer.from(msg.serialize()).toString("base64"),
  }),
  getAddressLookupTable: (addr: PublicKey) => ({ addr: addr.toBase58() }),
  simulateTransaction: (tx: VersionedTransaction, cfg: { accounts?: { addresses?: string[] } } | undefined) => ({
    msg: Buffer.from(tx.message.serialize()).toString("base64"),
    addresses: cfg?.accounts?.addresses ?? [],
  }),
  // Blockhash không có tham số có nghĩa: mỗi fixture kịch bản ghi đúng MỘT lần đọc.
  getLatestBlockhash: () => ({}),
  getParsedAccountInfo: (dc: PublicKey) => ({ dc: dc.toBase58() }),
} as const;

export function connTuFixture(fx: Fixture): {
  conn: unknown;
  daDung: () => Set<string>;
  thieuFixture: () => ThieuFixture[];
  soLuotGhep: () => number;
} {
  const bang = new Map(fx.banGhi.map((b) => [b.khoa, b.ketQua]));
  const dung = new Set<string>();
  const daThieu: ThieuFixture[] = [];

  /*
   * GHÉP LÔ ĐỌC ACCOUNT THEO ĐỊA CHỈ.
   *
   * L1 đổi cách chia lô `getMultipleAccountsInfo` sau lúc capture (gộp mint + PDA), nên
   * khoá theo nguyên lô không còn khớp. Mỗi địa chỉ có đúng một giá trị trong fixture
   * thì ghép được; một địa chỉ mang HAI giá trị khác nhau ở hai lô thì mơ hồ ⇒ báo
   * thiếu, không chọn bừa.
   */
  const theoDiaChi = new Map<string, { json: string; giaTri: unknown; khoa: string }>();
  const moHo = new Set<string>();
  for (const b of fx.banGhi) {
    if (b.method !== "getMultipleAccountsInfo" || !Array.isArray(b.ketQua)) continue;
    const keys = (b.thamSo as { keys?: string[] } | null)?.keys;
    if (!Array.isArray(keys) || keys.length !== b.ketQua.length) continue;
    keys.forEach((dc, i) => {
      const giaTri = (b.ketQua as unknown[])[i];
      const json = JSON.stringify(giaTri);
      const cu = theoDiaChi.get(dc);
      if (cu && cu.json !== json) moHo.add(dc);
      else if (!cu) theoDiaChi.set(dc, { json, giaTri, khoa: b.khoa });
    });
  }
  let soLuotGhep = 0;
  const ghepTheoDiaChi = (keys: string[]): unknown[] | undefined => {
    if (!keys.every((dc) => theoDiaChi.has(dc) && !moHo.has(dc))) return undefined;
    soLuotGhep++;
    return keys.map((dc) => {
      const x = theoDiaChi.get(dc)!;
      dung.add(x.khoa);
      return x.giaTri;
    });
  };

  const lay = (method: Method, thamSo: unknown): unknown => {
    const k = khoaRequest(method, thamSo);
    if (!bang.has(k) && method === "getMultipleAccountsInfo") {
      const ghep = ghepTheoDiaChi((thamSo as { keys: string[] }).keys);
      if (ghep) return ghep;
    }
    if (!bang.has(k)) {
      const e = new ThieuFixture(method, k, thamSo);
      daThieu.push(e);
      throw e;
    }
    dung.add(k);
    const kq = bang.get(k);
    if (kq && typeof kq === "object" && "__loi" in (kq as Record<string, unknown>)) {
      throw new Error(String((kq as Record<string, unknown>)["__loi"]));
    }
    return kq;
  };

  const conn = {
    getSignaturesForAddress: async (dc: PublicKey, cfg: unknown) =>
      hoiSinh(lay("getSignaturesForAddress", THAM_SO.getSignaturesForAddress(dc, cfg))),
    getMultipleAccountsInfo: async (keys: PublicKey[]) =>
      hoiSinh(lay("getMultipleAccountsInfo", THAM_SO.getMultipleAccountsInfo(keys))),
    getFeeForMessage: async (msg: { serialize(): Uint8Array }) =>
      hoiSinh(lay("getFeeForMessage", THAM_SO.getFeeForMessage(msg))),
    getAddressLookupTable: async (addr: PublicKey) => {
      const raw = hoiSinh(lay("getAddressLookupTable", THAM_SO.getAddressLookupTable(addr))) as {
        value: {
          key: PublicKey;
          state: {
            deactivationSlot: string;
            lastExtendedSlot: number;
            lastExtendedSlotStartIndex: number;
            authority?: PublicKey;
            addresses: PublicKey[];
          };
        } | null;
      };
      if (!raw.value) return { value: null };
      const st = raw.value.state;
      return {
        value: new AddressLookupTableAccount({
          key: raw.value.key,
          state: {
            deactivationSlot: BigInt(st.deactivationSlot),
            lastExtendedSlot: st.lastExtendedSlot,
            lastExtendedSlotStartIndex: st.lastExtendedSlotStartIndex,
            ...(st.authority ? { authority: st.authority } : {}),
            addresses: st.addresses,
          },
        }),
      };
    },
    simulateTransaction: async (tx: VersionedTransaction, cfg: { accounts?: { addresses?: string[] } }) =>
      hoiSinh(lay("simulateTransaction", THAM_SO.simulateTransaction(tx, cfg))),
    getLatestBlockhash: async () => hoiSinh(lay("getLatestBlockhash", THAM_SO.getLatestBlockhash())),
    getParsedAccountInfo: async (dc: PublicKey) =>
      hoiSinh(lay("getParsedAccountInfo", THAM_SO.getParsedAccountInfo(dc))),
  };
  return { conn, daDung: () => dung, thieuFixture: () => daThieu, soLuotGhep: () => soLuotGhep };
}

/** Connection tối thiểu mà bộ ghi cần — `Connection` của web3.js thoả. */
type ConnThat = {
  getSignaturesForAddress(dc: PublicKey, cfg?: never): Promise<unknown>;
  getMultipleAccountsInfo(keys: PublicKey[]): Promise<unknown>;
  getFeeForMessage(msg: never): Promise<unknown>;
  getAddressLookupTable(addr: PublicKey): Promise<unknown>;
  simulateTransaction(tx: VersionedTransaction, cfg?: never): Promise<unknown>;
  getLatestBlockhash(): Promise<unknown>;
  getParsedAccountInfo(dc: PublicKey): Promise<unknown>;
};

/**
 * Bọc một connection THẬT để ghi mọi phản hồi vào `banGhi`. Lỗi cũng được ghi (`__loi`)
 * — một lần đọc hỏng là dữ kiện của lượt đó, không phải chỗ để im lặng bỏ qua.
 * Cùng khoá gặp lần hai thì giữ bản ghi đầu: replay phải trả đúng thứ lượt gốc thấy trước.
 */
/** Dấu của lời gọi còn dở lúc engine kết luận — ghi thành lỗi để phát lại tái lập đúng. */
export const QUA_HAN_LUC_GHI = "không trả lời trước khi engine kết luận lúc ghi (quá hạn làm giàu)";

export function connGhi(
  that: ConnThat,
  banGhi: BanGhi[],
  dangCho?: Map<string, { method: Method; thamSo: unknown }>,
): unknown {
  const ghi = async (method: Method, thamSo: unknown, chay: () => Promise<unknown>) => {
    const khoa = khoaRequest(method, thamSo);
    // Hỏi LẠI lúc có kết quả, không chỉ lúc gọi: bên ghi có thể đã chốt khoá này là
    // "quá hạn lúc ghi" trong khi phản hồi còn đang bay — phản hồi muộn không được đè.
    const daCo = () => banGhi.some((b) => b.khoa === khoa);
    /*
     * LỜI GỌI CÒN DỞ lúc lượt kiểm kết thúc (vd. làm giàu có hạn 2,5 s trong L1) không có
     * bản ghi, và phát lại sẽ báo thiếu — đúng, vì fixture thật sự khuyết. `dangCho` cho
     * bên ghi biết điều đó để ghi lại lượt, thay vì lưu một fixture không trọn.
     */
    dangCho?.set(khoa, { method, thamSo });
    try {
      const kq = await chay();
      if (!daCo()) banGhi.push({ method, khoa, thamSo, ketQua: deJson(kq) });
      return kq;
    } catch (e) {
      if (!daCo()) {
        banGhi.push({ method, khoa, thamSo, ketQua: { __loi: e instanceof Error ? e.message : String(e) } });
      }
      throw e;
    } finally {
      dangCho?.delete(khoa);
    }
  };
  return {
    getSignaturesForAddress: (dc: PublicKey, cfg: unknown) =>
      ghi("getSignaturesForAddress", THAM_SO.getSignaturesForAddress(dc, cfg), () =>
        that.getSignaturesForAddress(dc, cfg as never),
      ),
    getMultipleAccountsInfo: (keys: PublicKey[]) =>
      ghi("getMultipleAccountsInfo", THAM_SO.getMultipleAccountsInfo(keys), () => that.getMultipleAccountsInfo(keys)),
    getFeeForMessage: (msg: { serialize(): Uint8Array }) =>
      ghi("getFeeForMessage", THAM_SO.getFeeForMessage(msg), () => that.getFeeForMessage(msg as never)),
    getAddressLookupTable: (addr: PublicKey) =>
      ghi("getAddressLookupTable", THAM_SO.getAddressLookupTable(addr), () => that.getAddressLookupTable(addr)),
    simulateTransaction: (tx: VersionedTransaction, cfg: { accounts?: { addresses?: string[] } }) =>
      ghi("simulateTransaction", THAM_SO.simulateTransaction(tx, cfg), () =>
        that.simulateTransaction(tx, cfg as never),
      ),
    getLatestBlockhash: () => ghi("getLatestBlockhash", THAM_SO.getLatestBlockhash(), () => that.getLatestBlockhash()),
    getParsedAccountInfo: (dc: PublicKey) =>
      ghi("getParsedAccountInfo", THAM_SO.getParsedAccountInfo(dc), () => that.getParsedAccountInfo(dc)),
  };
}
