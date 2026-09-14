/**
 * REPLAY RPC — adapter đọc fixture thay cho mạng. Thẻ TB-B02.
 *
 * Module dùng chung cho hai script tách rời:
 *
 *   · `capture-rpc.ts` — CHẠM MẠNG, chỉ chạy khi chủ động. Ghi lại từng response.
 *   · `chay-replay.ts` — KHÔNG chạm mạng. Đọc fixture, chạy qua `extractFacts` thật.
 *
 * Tách hai thứ đó là yêu cầu của thẻ, và lý do rất cụ thể: một runner vừa capture
 * vừa replay sẽ **âm thầm rơi về mạng** khi thiếu fixture, và lúc đó "chạy offline
 * vẫn tái lập được" trở thành một câu không ai kiểm được.
 *
 * ĐIỀU REPLAY NÀY **KHÔNG** LÀ, nói trước vì nó dễ bị đọc quá:
 *
 *   Nó **không** thực thi SVM. Nó phát lại **response đã ghi** của RPC — gồm cả kết
 *   quả `simulateTransaction`, tức kết quả một lần chạy SVM **trong quá khứ trên máy
 *   khác**. Nó chứng minh **L1 bóc tách đúng từ dữ liệu RPC**, không chứng minh
 *   Solana sẽ xử lý giao dịch đó như vậy hôm nay.
 *
 *   Muốn cái thứ hai thì phải chạy thật — TB-B07.
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { AddressLookupTableAccount, PublicKey } from "@solana/web3.js";
import type { VersionedTransaction } from "@solana/web3.js";

/** Năm method mà `extractFacts` gọi. Thêm method mới ⇒ phải thêm ở đây, và guard canh. */
export type Method =
  | "getSignaturesForAddress"
  | "getMultipleAccountsInfo"
  | "getFeeForMessage"
  | "getAddressLookupTable"
  | "simulateTransaction";

export type BanGhi = {
  method: Method;
  /** Khoá request — xem `khoaRequest`. Cùng tham số có nghĩa ⇒ cùng khoá. */
  khoa: string;
  /** Tham số đã chuẩn hoá, giữ để người đọc fixture hiểu được nó ghi gì. */
  thamSo: unknown;
  /** Response RAW, trước khi giải mã. Thẻ đòi lưu ở dạng này. */
  ketQua: unknown;
};

export type Fixture = {
  phienBan: number;
  id: string;
  captureLuc: string;
  /** Endpoint đã LỌC — chỉ giữ host, bỏ đường dẫn và query vì credential nằm đó. */
  nguon: string;
  banGhi: BanGhi[];
};

/**
 * Khoá một request theo **method + tham số có nghĩa**.
 *
 * "Có nghĩa" là phần quyết định response. Hai điều cố ý:
 *
 *   1. `getMultipleAccountsInfo` — **giữ nguyên thứ tự** địa chỉ. Response là một
 *      mảng khớp vị trí; sắp xếp lại khoá thì replay trả đúng số phần tử nhưng sai
 *      chỗ, và Facts sẽ gán trạng thái của account này cho account kia. Một lỗi như
 *      vậy không làm test đỏ ngay — nó làm kết quả sai một cách yên lặng.
 *   2. `simulateTransaction` — khoá theo message bytes **và** danh sách địa chỉ hỏi.
 *      Cùng giao dịch nhưng hỏi tập account khác là một request khác.
 */
export function khoaRequest(method: Method, thamSo: unknown): string {
  const chuoi = JSON.stringify(thamSo);
  return `${method}:${createHash("sha256").update(chuoi).digest("hex").slice(0, 16)}`;
}

/** Lọc endpoint: giữ host, bỏ path/query — credential của RPC thương mại nằm ở đó. */
export function locNguon(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(không đọc được endpoint)";
  }
}

export class ThieuFixture extends Error {
  /*
   * Gán tường minh, KHÔNG dùng parameter property (`constructor(readonly x: T)`).
   *
   * `--experimental-strip-types` chỉ **xoá** chú thích kiểu, nó không sinh mã — mà
   * parameter property cần sinh ra ba dòng gán. Node ném
   * `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` ngay lúc nạp module, và `tsc --noEmit` KHÔNG
   * bắt được vì với tsc thì cú pháp đó hợp lệ.
   *
   * Đây là loại lỗi typecheck xanh mà chạy đỏ; cả repo chạy bằng strip-types nên nó
   * áp cho mọi file `.ts` ở đây.
   */
  readonly method: Method;
  readonly khoa: string;
  readonly thamSo: unknown;

  constructor(method: Method, khoa: string, thamSo: unknown) {
    super(
      `thiếu fixture cho ${method} (khoá ${khoa}). ` +
        "Replay KHÔNG tự rơi về mạng — chạy `npm run capture-rpc <id>` nếu muốn ghi thêm.",
    );
    this.method = method;
    this.khoa = khoa;
    this.thamSo = thamSo;
    this.name = "ThieuFixture";
  }
}

/**
 * Dựng một `Connection` giả đọc từ fixture.
 *
 * Trả `unknown` chứ không `Connection`: nó chỉ cài năm method `extractFacts` dùng,
 * và khai đủ kiểu `Connection` sẽ buộc phải viết hàng chục method chết. Người gọi ép
 * `as never` — đúng cách mọi test hiện có trong repo đang làm.
 *
 * **Thiếu fixture thì NÉM**, không trả `null` và tuyệt đối không gọi mạng. Đó là
 * nghiệm thu của thẻ: *"request không được ghi trong fixture thì fail rõ"*.
 */
export function connTuFixture(fx: Fixture): {
  conn: unknown;
  /** Số bản ghi đã dùng — để phát hiện fixture thừa (ghi mà không ai đọc). */
  daDung: () => Set<string>;
  /** Request bị thiếu fixture — kể cả khi `extractFacts` đã nuốt exception. */
  thieuFixture: () => ThieuFixture[];
} {
  const bang = new Map(fx.banGhi.map((b) => [b.khoa, b.ketQua]));
  const dung = new Set<string>();

  /*
   * THIẾU FIXTURE PHẢI NỔI RA NGOÀI, KHÔNG ĐƯỢC BIẾN THÀNH "MÔ PHỎNG HỎNG".
   *
   * Lỗi đã đo được: `extractFacts` bọc lời gọi `simulateTransaction` trong `try/catch`
   * (`fetch.ts:261`) và ghi `e.message` vào `simulationError`. Khi replay ném
   * `ThieuFixture`, câu thông báo đó bị nuốt và Facts ra:
   *
   *     simulationError: "thiếu fixture cho simulateTransaction (khoá …)"
   *     simulationOk: false
   *
   * Nghĩa là replay **tự nhận là mô phỏng hỏng** trong khi thật ra nó thiếu dữ liệu.
   * Runner thấy Facts hợp lệ, tất định, và báo đạt — đúng kiểu hỏng mà nghiệm thu
   * của thẻ cấm: *"request không được ghi trong fixture thì fail rõ"*.
   *
   * Cách chặn: ghi lại vào một hộp bên ngoài. `extractFacts` vẫn nuốt được exception,
   * nhưng người gọi đọc `thieuFixture()` sau đó và biết sự thật.
   */
  const daThieu: ThieuFixture[] = [];

  const lay = (method: Method, thamSo: unknown): unknown => {
    const k = khoaRequest(method, thamSo);
    if (!bang.has(k)) {
      const e = new ThieuFixture(method, k, thamSo);
      daThieu.push(e);
      throw e;
    }
    dung.add(k);
    const kq = bang.get(k);
    /*
     * Fixture ghi một LỖI RPC thì replay phải ném lại đúng lỗi đó.
     *
     * Trả về object `{__loi}` thay vì ném sẽ làm `extractFacts` đọc nó như dữ liệu
     * hợp lệ — và một lỗi mạng biến thành một response trống rỗng nhưng "thành công".
     */
    if (kq && typeof kq === "object" && "__loi" in (kq as Record<string, unknown>)) {
      throw new Error(String((kq as Record<string, unknown>)["__loi"]));
    }
    return kq;
  };

  /*
   * Hồi sinh `Buffer` và `PublicKey` — hai kiểu JSON không giữ được.
   *
   * `getMultipleAccountsInfo` trả `AccountInfo<Buffer>`: `data` là `Buffer`, `owner`
   * là `PublicKey`. Fixture lưu `{__buffer}` và `{__pubkey}`; thiếu bước này thì:
   *
   *   · `data` rỗng ⇒ `unpackAccount` trả `null` cho MỌI account, replay "chạy được"
   *     và ra Facts hoàn toàn sai;
   *   · `owner` là chuỗi ⇒ `info.owner.toBase58()` ném — đã đo: **19/19 mẫu lỗi**.
   *
   * `SimulatedTransactionAccountInfo.owner` thì vốn LÀ chuỗi, nên nó không được bọc
   * `{__pubkey}` lúc capture và cũng không bị dựng lại ở đây. Hai method, hai kiểu,
   * cùng một tên trường.
   */
  const hoiSinh = (x: unknown): unknown => {
    if (x === null || typeof x !== "object") return x;
    if (Array.isArray(x)) return x.map(hoiSinh);
    const o = x as Record<string, unknown>;
    if (typeof o["__buffer"] === "string") return Buffer.from(o["__buffer"], "base64");
    if (typeof o["__pubkey"] === "string") return new PublicKey(o["__pubkey"]);
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, hoiSinh(v)]));
  };

  const conn = {
    getSignaturesForAddress: async (dc: PublicKey, cfg: unknown) =>
      hoiSinh(lay("getSignaturesForAddress", { dc: dc.toBase58(), cfg })),

    getMultipleAccountsInfo: async (keys: PublicKey[]) =>
      hoiSinh(lay("getMultipleAccountsInfo", { keys: keys.map((k) => k.toBase58()) })),

    getFeeForMessage: async (msg: { serialize(): Uint8Array }) =>
      hoiSinh(
        lay("getFeeForMessage", {
          msg: Buffer.from(msg.serialize()).toString("base64"),
        }),
      ),

    getAddressLookupTable: async (addr: PublicKey) => {
      /*
       * `hoiSinh` TRƯỚC khi đọc — và đây là một lỗi đã đo được, không phải phòng xa.
       *
       * Bản đầu đọc thẳng `raw.value.state.addresses` như `string[]`. Nhưng fixture
       * lưu `PublicKey` dưới dạng `{__pubkey: "..."}`, nên mảng đó là mảng **object**.
       * `new PublicKey({__pubkey})` không dựng ra địa chỉ đúng, ALT giải ra rỗng, và
       * `extractFacts` hỏi `getMultipleAccountsInfo` với 2 địa chỉ thay vì 3 — khoá
       * request khác, replay báo "thiếu fixture".
       *
       * Triệu chứng nói "fixture thiếu", nguyên nhân nằm ở adapter. Mất hai vòng đo
       * mới tách được hai chuyện đó.
       */
      const raw = hoiSinh(lay("getAddressLookupTable", { addr: addr.toBase58() })) as {
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
      /*
       * PHẢI `new AddressLookupTableAccount`, KHÔNG trả object thường.
       *
       * `extractFacts` đẩy giá trị này thẳng vào `tx.message.getAccountKeys({
       * addressLookupTableAccounts })`, và web3.js đọc `.state.addresses` như
       * `PublicKey[]`. Một object JSON có `addresses: string[]` sẽ đi qua được
       * TypeScript (fixture là `unknown`) rồi vỡ ở tầng dưới — hoặc tệ hơn, giải ra
       * địa chỉ sai mà không ném.
       *
       * `deactivationSlot` là `bigint`; JSON lưu chuỗi nên dựng lại bằng `BigInt()`.
       * Chín mẫu trong bộ có ALT, nên nhánh này chạy thật chứ không phải phòng xa.
       */
      const st = raw.value.state;
      return {
        value: new AddressLookupTableAccount({
          // `key` và `addresses` đã là `PublicKey` sau `hoiSinh`. `deactivationSlot`
          // thì không — nó là `bigint`, fixture lưu chuỗi số nên dựng lại tường minh.
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

    simulateTransaction: async (
      tx: VersionedTransaction,
      cfg: { accounts?: { addresses?: string[] } },
    ) =>
      hoiSinh(
        lay("simulateTransaction", {
          msg: Buffer.from(tx.message.serialize()).toString("base64"),
          addresses: cfg.accounts?.addresses ?? [],
        }),
      ),
  };

  return { conn, daDung: () => dung, thieuFixture: () => daThieu };
}

export function docFixture(duong: string): Fixture {
  if (!existsSync(duong)) {
    throw new Error(`không có fixture ${duong} — chạy capture trước, hoặc mẫu này chưa hỗ trợ replay`);
  }
  return JSON.parse(readFileSync(duong, "utf8")) as Fixture;
}
