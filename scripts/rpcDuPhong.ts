/**
 * RPC DỰ PHÒNG — review 26/09, mục 3.3; nâng mức vận hành ở CK-01 (27/09).
 *
 * Đo được hôm đó: `api.devnet.solana.com` trả `getBalance` trong 0,16 s nhưng
 * `getAccountInfo`/`getMultipleAccounts` quá hạn liên tục hơn một giờ. Custos đọc tài
 * khoản ở mọi lượt kiểm, nên ví, trang tấn công và luồng thực thi dừng cùng lúc vì một
 * endpoint.
 *
 * Nguyên tắc:
 *
 *   1. CHỈ lệnh ĐỌC được chuyển endpoint. Gửi lại một giao dịch đã ký ở nơi khác sau khi
 *      quá hạn là đúng thứ luồng ký cố ý không làm (`live/rpc.ts`).
 *   2. Endpoint vừa trả lời tốt được ưu tiên ở lượt sau — không chờ quá hạn lần nữa.
 *   3. KHÔNG tự thêm nhà cung cấp nào. Danh sách do người vận hành khai. Bản DEV đọc
 *      `VITE_RPC_DU_PHONG`; bản production chỉ nhận danh sách trong `hien-truong.json`
 *      đã qua `locRpcCongKhai` — không URL nào mang khoá được vào bundle hay cấu hình
 *      công khai, và người xem không chọn được URL qua query.
 *   4. MỖI lượt đọc ghi lại nguồn đã trả lời (`ghiNhan`), để lượt kiểm biết nó có trộn
 *      hai nhà cung cấp hay không. Không gộp hai nguồn thành "một snapshot".
 *   5. Huỷ từ phía người gọi (`signal`) dừng cả vòng thử — lượt đã bị thay thế không
 *      được tiếp tục bắn request.
 */

import { Connection } from "@solana/web3.js";

const LA_DOC = (method: string) => method.startsWith("get") || method === "simulateTransaction" || method === "isBlockhashValid";

/** Endpoint chính trước, rồi dự phòng (chuỗi phân cách dấu phẩy hoặc mảng); bỏ rỗng, bỏ trùng. */
export function danhSachRpc(chinh: string, duPhong: string | readonly string[] | null | undefined): string[] {
  const phu = Array.isArray(duPhong) ? duPhong : String(duPhong ?? "").split(",");
  const ds = [chinh, ...phu].map((s) => String(s).trim()).filter(Boolean);
  return [...new Set(ds)];
}

/**
 * Host RPC Devnet CÔNG KHAI mà bản production được phép dùng làm dự phòng.
 *
 * Danh sách đóng, không nhận wildcard: một URL do cấu hình cung cấp mà không nằm ở đây
 * thì bị bỏ, kể cả khi nó "trông giống" Devnet. Genesis hash vẫn được preflight kiểm
 * riêng — allowlist chặn khoá lọt ra ngoài, genesis chặn nhầm cluster.
 */
export const HOST_DEVNET_CONG_KHAI = [
  "api.devnet.solana.com",
  "devnet.rpcpool.com",
  "solana-devnet.api.onfinality.io",
] as const;

/**
 * Lọc danh sách dự phòng cho bản PRODUCTION. Trả về URL giữ lại và URL bị bỏ kèm lý do.
 *
 * Bỏ mọi URL: không phải https; có user/password; có query hoặc fragment (khoá API hay
 * nằm ở `?api-key=`); có path ngoài `/` hoặc `/public` (khoá cũng hay nằm ở path, kiểu
 * `/v2/<khoa>`); host ngoài `HOST_DEVNET_CONG_KHAI`.
 */
export function locRpcCongKhai(ds: readonly string[]): { giu: string[]; bo: Array<{ url: string; lyDo: string }> } {
  const giu: string[] = [];
  const bo: Array<{ url: string; lyDo: string }> = [];
  for (const url of ds) {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      bo.push({ url: "(không đọc được)", lyDo: "không phải URL" });
      continue;
    }
    // Không trả lại URL gốc trong lý do: nếu nó mang khoá thì chính lý do là chỗ rò.
    const nhan = u.host;
    if (u.protocol !== "https:") bo.push({ url: nhan, lyDo: "không phải https" });
    else if (u.username || u.password) bo.push({ url: nhan, lyDo: "mang thông tin đăng nhập" });
    else if (u.search || u.hash) bo.push({ url: nhan, lyDo: "có query/fragment — nơi khoá API hay nằm" });
    else if (u.pathname !== "/" && u.pathname !== "/public") bo.push({ url: nhan, lyDo: "có path — nơi khoá API hay nằm" });
    else if (!(HOST_DEVNET_CONG_KHAI as readonly string[]).includes(u.hostname)) bo.push({ url: nhan, lyDo: "host ngoài allowlist Devnet công khai" });
    else giu.push(url);
  }
  return { giu, bo };
}

/**
 * Danh sách DỰ PHÒNG theo loại bản dựng — một quy tắc cho mọi ứng dụng.
 *
 *   · DEV: biến môi trường của máy đang chạy (`VITE_RPC_DU_PHONG`), như trước.
 *   · Production: CHỈ trường `rpcDuPhong` trong `hien-truong.json`, và chỉ phần qua
 *     `locRpcCongKhai`. Biến môi trường KHÔNG được đọc — nó có thể mang khoá và sẽ bị
 *     nhúng vào bundle công khai.
 *
 * Không có nhà cung cấp mặc định nào ở đây: để trống thì bản production chạy đúng một
 * endpoint như trước. Giao dịch người dùng đi qua RPC, nên chọn bên nào là việc của người
 * vận hành, không phải của mã.
 */
export function duPhongTheoBan(dev: boolean, bienDev: string | undefined, cauHinh: unknown): string[] {
  if (dev) return String(bienDev ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!Array.isArray(cauHinh)) return [];
  return locRpcCongKhai(cauHinh.filter((x): x is string => typeof x === "string")).giu;
}

/** Một lần hỏi một endpoint — thứ `ghiNhan` nhận. Chỉ HOST, không bao giờ URL đầy đủ. */
export type QuanSatRpc = {
  method: string;
  nguon: string;
  ketQua: "ok" | "http" | "jsonrpc" | "quaHan" | "loiMang" | "huy";
  /** Mã HTTP khi `http`, mã JSON-RPC khi `jsonrpc`. */
  ma?: number;
  ms: number;
};

/** Trạng thái ưu tiên dùng chung giữa nhiều `fetch` — để nhiều lượt kiểm cùng "nhớ" endpoint tốt. */
export type BoChonRpc = { uuTien: number };
export const taoBoChon = (): BoChonRpc => ({ uuTien: 0 });

export type TuyChonDuPhong = {
  msMoiLuot?: number;
  transport?: typeof fetch;
  ghiNhan?: (q: QuanSatRpc) => void;
  signal?: AbortSignal;
  boChon?: BoChonRpc;
};

export function hostCuaRpc(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(không đọc được endpoint)";
  }
}

/**
 * Lỗi JSON-RPC nào là lỗi CỦA ENDPOINT (đổi nơi khác có thể được), lỗi nào là lỗi của
 * YÊU CẦU (đổi nơi khác cũng vậy).
 *
 * DANH SÁCH TƯỜNG MINH, không phải cả dải -32000…-32099. Bản đầu lấy cả dải và code review
 * 27/09 chỉ ra: Solana đặt lỗi CỦA YÊU CẦU trong chính dải đó — -32003 (sai chữ ký),
 * -32013 (độ dài chữ ký), -32015 (phiên bản giao dịch không hỗ trợ). Gặp chúng thì đổi
 * endpoint nào cũng ra y vậy, chỉ đốt hạn chờ và đổ lỗi oan cho nhà cung cấp.
 *
 * Giữ ở đây những mã chỉ trạng thái CỦA NODE: lỗi nội bộ (-32603), node chậm/không khoẻ
 * (-32005), block/slot chưa có hoặc đã dọn (-32001, -32004, -32007, -32009, -32014,
 * -32016), lịch sử/chỉ mục không có trên node đó (-32010, -32011), và giới hạn tần suất
 * trả trong JSON (-32029). Kết quả mô phỏng hỏng KHÔNG nằm ở đây: nó đi trong
 * `result.value.err`, là dữ kiện của giao dịch, không phải lỗi của nhà cung cấp.
 */
const MA_LOI_ENDPOINT = new Set([-32603, -32001, -32004, -32005, -32007, -32009, -32010, -32011, -32014, -32016, -32029]);
export function laLoiCuaEndpoint(ma: number): boolean {
  return MA_LOI_ENDPOINT.has(ma);
}

/** Genesis hash của Solana Devnet — MỘT bản cho cả ví, preflight và script ghi fixture. */
export const GENESIS_DEVNET = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

/**
 * Endpoint này có CHỨNG MINH được là Devnet không — "devnet", "khacCluster", hoặc
 * "chuaDo" khi không trả lời trong hạn. Chỉ đọc (`getGenesisHash`), không qua dự phòng.
 */
export async function genesisCua(
  url: string,
  {
    msHan = 6_000,
    transport = fetch,
    soLan = 3,
    msGianCach = 1_500,
  }: { msHan?: number; transport?: typeof fetch; soLan?: number; msGianCach?: number } = {},
): Promise<"devnet" | "khacCluster" | "chuaDo"> {
  /*
   * THỬ LẠI KHI CHƯA ĐO ĐƯỢC (nghiệm thu live 27/09). onfinality trả 429 cho khoảng một nửa
   * số lượt `getGenesisHash`; không thử lại thì một lần 429 lúc mở trang loại endpoint dự
   * phòng DUY NHẤT còn đọc được account ra khỏi cả phiên. "khacCluster" là câu trả lời,
   * không thử lại.
   */
  for (let lan = 0; lan < soLan; lan++) {
    if (lan > 0) await new Promise((ok) => setTimeout(ok, msGianCach * lan));
    try {
      const r = await transport(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getGenesisHash" }),
        signal: AbortSignal.timeout(msHan),
      });
      const j = (await r.json()) as { result?: unknown };
      if (typeof j.result === "string") return j.result === GENESIS_DEVNET ? "devnet" : "khacCluster";
    } catch {
      /* chưa đo được — thử lại */
    }
  }
  return "chuaDo";
}

/**
 * Bỏ khỏi danh sách những endpoint CHỨNG MINH được là khác cluster. Chưa đo được thì giữ
 * (một endpoint chậm không phải endpoint sai mạng) — cùng quy tắc với preflight.
 */
export async function locTheoGenesis(
  ds: readonly string[],
  tuyChon: { msHan?: number; transport?: typeof fetch } = {},
): Promise<{ dung: string[]; bo: string[] }> {
  const kq = await Promise.all(ds.map((u) => genesisCua(u, tuyChon)));
  return { dung: ds.filter((_, i) => kq[i] !== "khacCluster"), bo: ds.filter((_, i) => kq[i] === "khacCluster") };
}

/**
 * XÁC MINH NGHIÊM cho dữ liệu sẽ DÁN NHÃN Devnet (fixture ghi lại) — Codex review lần 2,
 * mục 6. Khác `locTheoGenesis` (giữ endpoint "chưa đo" để demo sống còn chạy được): ở đây
 * chỉ giữ endpoint CHỨNG MINH là Devnet. Lý do bỏ chỉ mang host — URL có thể mang khoá.
 */
export async function chiDevnetDaXacMinh(
  ds: readonly string[],
  tuyChon: Parameters<typeof genesisCua>[1] = {},
): Promise<{ dung: string[]; bo: Array<{ nguon: string; ly: "khacCluster" | "chuaDo" }> }> {
  const kq = await Promise.all(ds.map((u) => genesisCua(u, tuyChon)));
  return {
    dung: ds.filter((_, i) => kq[i] === "devnet"),
    bo: ds.flatMap((u, i) => (kq[i] === "devnet" ? [] : [{ nguon: hostCuaRpc(u), ly: kq[i] as "khacCluster" | "chuaDo" }])),
  };
}

export function fetchDuPhong(dsUrl: string[], tuyChon: TuyChonDuPhong = {}): typeof fetch {
  const { msMoiLuot = 6000, transport = fetch, ghiNhan, signal: huyNgoai, boChon = taoBoChon() } = tuyChon;
  return async (input, init) => {
    let method = "";
    try {
      method = JSON.parse(String(init?.body)).method ?? "";
    } catch {
      /* không đọc được method ⇒ coi như lệnh ghi: không chuyển endpoint */
    }
    const huy = [init?.signal, huyNgoai].filter((s): s is AbortSignal => !!s);
    const daHuy = () => huy.some((s) => s.aborted);
    if (daHuy()) {
      ghiNhan?.({ method, nguon: hostCuaRpc(String(input)), ketQua: "huy", ms: 0 });
      throw new DOMException("lượt kiểm đã bị huỷ", "AbortError");
    }
    // Lệnh ghi: đi thẳng endpoint được gọi, không chuyển, không đọc lại body.
    if (!LA_DOC(method)) {
      return transport(input, huy.length ? { ...init, signal: AbortSignal.any(huy) } : init);
    }

    let loiCuoi: unknown = new Error("không có endpoint RPC nào");
    // Mọi endpoint cùng trả 429/5xx thì TRẢ LẠI phản hồi đó thay vì ném: web3.js tự chờ
    // rồi thử lại khi gặp 429, và ném lỗi ở đây sẽ tước mất cơ chế đó.
    let phanHoiCuoi: Response | null = null;
    for (let k = 0; k < dsUrl.length; k++) {
      const i = (boChon.uuTien + k) % dsUrl.length;
      const nguon = hostCuaRpc(dsUrl[i]!);
      const han = AbortSignal.timeout(msMoiLuot);
      const signal = AbortSignal.any([...huy, han]);
      const t0 = Date.now();
      try {
        const r = await transport(dsUrl[i]!, { ...init, signal });
        /*
         * PHẢN HỒI ĐẾN SAU KHI ĐÃ HUỶ. Không phải transport nào cũng tôn trọng `signal`
         * (polyfill, proxy, mạng trả nửa chừng) — đo được bằng test: thiếu dòng này thì
         * một lượt đã bị thay thế vẫn trả "ok" và vẫn được ghi là nguồn trả lời tốt.
         */
        if (daHuy()) {
          ghiNhan?.({ method, nguon, ketQua: "huy", ms: Date.now() - t0 });
          throw new DOMException("lượt kiểm đã bị huỷ", "AbortError");
        }
        if (r.status === 429 || r.status >= 500) {
          ghiNhan?.({ method, nguon, ketQua: "http", ma: r.status, ms: Date.now() - t0 });
          phanHoiCuoi = r;
          continue;
        }
        /*
         * ĐỌC BODY MỘT LẦN, TRONG HẠN CỦA LƯỢT NÀY, rồi dựng lại `Response` cho web3.js.
         *
         * Bản trước đọc `r.clone().json()` trong một `catch` rỗng (code review 27/09): nếu
         * hạn rơi đúng lúc đang đọc body thì lỗi bị nuốt, lượt được ghi "ok", ưu tiên dời
         * về endpoint đó, còn web3.js nhận một body đã huỷ và không có đường chuyển nào. Và
         * mọi phản hồi lớn bị parse hai lần. Nay đọc lỗi body ở đây rơi xuống `catch` ngoài
         * như mọi lỗi mạng khác ⇒ ghi "quaHan"/"loiMang" và thử endpoint kế.
         */
        const than = await r.text();
        if (daHuy()) {
          ghiNhan?.({ method, nguon, ketQua: "huy", ms: Date.now() - t0 });
          throw new DOMException("lượt kiểm đã bị huỷ", "AbortError");
        }
        const dung = () => new Response(than, { status: r.status, statusText: r.statusText, headers: r.headers });
        // LỖI JSON-RPC TRONG HTTP 200: chỉ parse khi phần đầu body mang đối tượng `error` —
        // phản hồi thành công (thường rất lớn) không bị parse lần hai ở đây.
        let maLoi: number | undefined;
        if (/"error"\s*:\s*\{/.test(than.slice(0, 400))) {
          try {
            const j = JSON.parse(than) as { error?: { code?: unknown } };
            if (j && typeof j === "object" && j.error && typeof j.error.code === "number") maLoi = j.error.code;
          } catch {
            /* body không phải JSON đơn — để web3.js tự báo */
          }
        }
        if (maLoi !== undefined && laLoiCuaEndpoint(maLoi)) {
          ghiNhan?.({ method, nguon, ketQua: "jsonrpc", ma: maLoi, ms: Date.now() - t0 });
          phanHoiCuoi = dung();
          continue;
        }
        ghiNhan?.({ method, nguon, ketQua: "ok", ms: Date.now() - t0 });
        boChon.uuTien = i;
        return dung();
      } catch (e) {
        // Bên gọi tự huỷ thì dừng NGAY — không thử endpoint kế, không để lượt cũ bắn tiếp.
        if (daHuy()) {
          ghiNhan?.({ method, nguon, ketQua: "huy", ms: Date.now() - t0 });
          throw e;
        }
        ghiNhan?.({ method, nguon, ketQua: han.aborted ? "quaHan" : "loiMang", ms: Date.now() - t0 });
        loiCuoi = e;
      }
    }
    if (phanHoiCuoi) return phanHoiCuoi;
    throw loiCuoi;
  };
}

/**
 * `Connection` đọc qua danh sách endpoint.
 *
 * Không khai dự phòng, không ghi nhận, không huỷ ⇒ `Connection` thường, hành vi y như
 * trước. Có bất kỳ thứ nào trong ba ⇒ luôn bọc `fetch`, kể cả khi chỉ một endpoint: nguồn
 * của từng lượt đọc vẫn phải ghi được.
 */
export function ketNoiDuPhong(
  dsUrl: string[],
  commitmentHoacTuyChon: "confirmed" | (TuyChonDuPhong & { commitment?: "confirmed" }) = "confirmed",
): Connection {
  const tuyChon = typeof commitmentHoacTuyChon === "string" ? {} : commitmentHoacTuyChon;
  const commitment = typeof commitmentHoacTuyChon === "string" ? commitmentHoacTuyChon : (tuyChon.commitment ?? "confirmed");
  if (dsUrl.length === 0) throw new LoiKhongCoRpcDung();
  const canBoc = dsUrl.length > 1 || !!tuyChon.ghiNhan || !!tuyChon.signal;
  return new Connection(dsUrl[0]!, {
    commitment,
    ...(canBoc ? { fetch: fetchDuPhong(dsUrl, tuyChon) } : {}),
  });
}

/**
 * KHÔNG CÒN ENDPOINT NÀO ĐƯỢC PHÉP DÙNG — mọi endpoint cấu hình đã bị genesis chứng minh là
 * khác cluster (Codex review lần 2, mục 5). Bản trước quay về endpoint chính khi đó, tức là
 * dùng lại đúng endpoint vừa bị loại. Câu lỗi không nêu URL: URL có thể mang khoá.
 */
export class LoiKhongCoRpcDung extends Error {
  constructor() {
    super("không endpoint RPC nào được xác nhận là Solana Devnet — mọi endpoint cấu hình thuộc mạng khác");
    this.name = "LoiKhongCoRpcDung";
  }
}

/**
 * Một lượt kiểm mà HAI nhà cung cấp trả lời hai nửa của lượt đọc (CK-01, mục 4).
 *
 * Trạng thái trước (nhà A) và kết quả mô phỏng (nhà B) có thể thuộc hai slot khác nhau —
 * ghép lại không phải một snapshot. Bên gọi bỏ lượt và đọc lại từ đầu; lặp lại vẫn trộn
 * thì ném lỗi này để người dùng thấy lý do, thay vì nhận một kết quả ghép.
 */
export class LoiNguonTron extends Error {
  readonly nguon: string[];
  constructor(nguon: string[]) {
    super(`lượt đọc trộn ${nguon.length} nhà cung cấp RPC (${nguon.join(" + ")})`);
    this.nguon = nguon;
    this.name = "LoiNguonTron";
  }
}
