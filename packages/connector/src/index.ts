/**
 * VÍ MẪU CUSTOS THEO WALLET STANDARD — spike G0-1.
 *
 * dApp gọi `registerCustosWallet({ url })` MỘT lần. Từ đó mọi thứ đi qua chuẩn: wallet-adapter
 * thấy "Custos Demo Wallet" trong danh sách ví, gọi `connect` / `signTransaction` như với bất
 * kỳ ví nào. dApp KHÔNG gọi `inspect()`, không import mã ví, không có đường nào lấy chữ ký mà
 * không qua cửa sổ ví — nơi Custos kiểm và người dùng quyết định.
 *
 * ## Vì sao là cửa sổ bật lên chứ không phải extension
 *
 * Extension tiêm provider vào mọi trang; cửa sổ web thì dApp phải tự nạp connector này (một
 * lệnh). Ranh giới ký giống nhau: khoá chỉ ở origin của ví, chữ ký chỉ ra sau khi người dùng
 * bấm trong cửa sổ đó. `ROADMAP-SAU-MENTOR.md` mục 3 ghi vì sao chưa làm extension.
 *
 * ## Ba điều connector cố ý KHÔNG làm
 *
 * - Không tự gửi giao dịch: chỉ khai `solana:signTransaction`. wallet-adapter tự gửi bytes đã
 *   ký — chưa có đường kiểm cho `signAndSendTransaction` thì không khai nó.
 * - Không ký nhiều giao dịch một lần: batch bị từ chối rõ ràng thay vì kiểm một, ký cả loạt.
 * - Không thử lại khi hết hạn chờ: hết hạn KHÔNG chứng minh ví chưa ký.
 */
import type { Wallet, WalletIcon } from "@wallet-standard/base";
import { ReadonlyWalletAccount, registerWallet } from "@wallet-standard/wallet";
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents,
  type StandardConnectFeature,
  type StandardConnectMethod,
  type StandardDisconnectFeature,
  type StandardDisconnectMethod,
  type StandardEventsFeature,
  type StandardEventsListeners,
  type StandardEventsOnMethod,
} from "@wallet-standard/features";
import {
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
  type SolanaSignTransactionMethod,
} from "@solana/wallet-standard-features";
import {
  BYTE_TOI_DA,
  CAU_LOI,
  PHIEN_BAN,
  docThongDiepVi,
  sangBase64,
  taoId,
  tuBase64,
  type KetQuaKetNoi,
  type KetQuaKy,
  type MaLoi,
} from "./giaoThuc.ts";

export * from "./giaoThuc.ts";

/** Chain ID theo chuẩn. Là `solana:devnet`, KHÔNG phải `devnet`. */
export const CHUOI_DEVNET = "solana:devnet" as const;

/** Người dùng cần thời gian đọc cảnh báo; quá mức này thì dApp thôi chờ — KHÔNG thử lại. */
export const HAN_KET_NOI_MS = 5 * 60_000;
export const HAN_KY_MS = 5 * 60_000;
/** Trang ví phải báo "sẵn sàng" trong hạn này — không tải được thì connect KHÔNG được treo. */
export const HAN_SAN_SANG_MS = 30_000;

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1f3d2b"/>' +
  '<path d="M32 12 48 18v12c0 11-7 19-16 22-9-3-16-11-16-22V18z" fill="none" stroke="#e8f3ea" stroke-width="4" stroke-linejoin="round"/>' +
  '<path d="m25 32 5 5 10-11" fill="none" stroke="#e8f3ea" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON = `data:image/svg+xml;base64,${btoa(SVG)}` as WalletIcon;

/** Phần của `Window` connector cần. Tách ra để test được không cần trình duyệt. */
export type CuaSo = {
  postMessage(msg: unknown, targetOrigin: string): void;
  readonly closed: boolean;
  focus(): void;
};

export type MoiTruong = {
  /** PHẢI chạy đồng bộ trong thao tác bấm của người dùng — nếu không trình duyệt chặn. */
  mo(url: string): CuaSo | null;
  nghe(fn: (e: { data: unknown; origin: string; source: unknown }) => void): () => void;
  hen(fn: () => void, ms: number): unknown;
  huyHen(h: unknown): void;
};

export type MaLoiConnector = MaLoi | "cua-so-bi-chan" | "cua-so-dong" | "het-han" | "vi-khong-phan-hoi";

export class LoiCustos extends Error {
  readonly ma: MaLoiConnector;
  constructor(ma: MaLoiConnector, cau: string) {
    super(cau);
    this.name = "LoiCustos";
    this.ma = ma;
  }
}

const CAU_CONNECTOR: Record<Exclude<MaLoiConnector, MaLoi>, string> = {
  "cua-so-bi-chan": "Trình duyệt chặn cửa sổ ví — cho phép cửa sổ bật lên cho trang này rồi bấm lại.",
  "cua-so-dong": "Cửa sổ ví đã đóng.",
  "het-han": "Ví chưa trả lời. Không rõ đã ký hay chưa — đừng gửi lại, hãy xem trong cửa sổ ví.",
  "vi-khong-phan-hoi": "Cửa sổ ví không tải xong. Đóng cửa sổ ví rồi bấm kết nối lại.",
};

function moiTruongTrinhDuyet(): MoiTruong {
  return {
    mo: (url) => window.open(url, "custos-vi-mau", "popup,width=460,height=760"),
    nghe: (fn) => {
      const h = (e: MessageEvent) => fn({ data: e.data, origin: e.origin, source: e.source });
      window.addEventListener("message", h);
      return () => window.removeEventListener("message", h);
    },
    hen: (fn, ms) => setTimeout(fn, ms),
    huyHen: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  };
}

/** Thân yêu cầu trước khi gắn `custos` + `id`. */
type ThanYeuCau = { kieu: "ket-noi" } | { kieu: "ky"; giaoDich: string } | { kieu: "ngat" };

type Cho = { resolve: (v: KetQuaKetNoi | KetQuaKy | null) => void; reject: (e: Error) => void; hen: unknown };

export class CustosWallet implements Wallet {
  readonly version = "1.0.0" as const;
  readonly name = "Custos Demo Wallet";
  readonly icon = ICON;
  readonly chains = [CHUOI_DEVNET] as const;

  readonly #url: string;
  readonly #origin: string;
  readonly #mt: MoiTruong;
  #accounts: ReadonlyWalletAccount[] = [];
  // Chuẩn chỉ có MỘT sự kiện: "change".
  #listeners: StandardEventsListeners["change"][] = [];
  #cuaSo: CuaSo | null = null;
  #sanSang: Promise<void> | null = null;
  #baoSanSang: (() => void) | null = null;
  #huySanSang: ((e: Error) => void) | null = null;
  #henSanSang: unknown = null;
  #cho = new Map<string, Cho>();
  #kiemDong: unknown = null;

  constructor(url: string, mt: MoiTruong = moiTruongTrinhDuyet()) {
    const u = new URL(url);
    const cucBo = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol !== "https:" && !(cucBo && u.protocol === "http:"))
      throw new Error("URL ví phải là https (hoặc http://localhost khi phát triển).");
    this.#url = u.href;
    this.#origin = u.origin;
    this.#mt = mt;
    mt.nghe((e) => this.#nhan(e));
  }

  get accounts() {
    return this.#accounts.slice();
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    StandardEventsFeature &
    SolanaSignTransactionFeature {
    return {
      [StandardConnect]: { version: "1.0.0", connect: this.#connect },
      [StandardDisconnect]: { version: "1.0.0", disconnect: this.#disconnect },
      [StandardEvents]: { version: "1.0.0", on: this.#on },
      [SolanaSignTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: this.#signTransaction,
      },
    };
  }

  // ── cửa sổ ví ───────────────────────────────────────────────────────────────

  /** ĐỒNG BỘ, trước mọi `await` của người gọi — popup chỉ được mở trong thao tác người dùng. */
  #moCuaSo(): void {
    if (this.#cuaSo && !this.#cuaSo.closed) {
      this.#cuaSo.focus();
      return;
    }
    // Cửa sổ cũ đã đóng nhưng vòng kiểm 500 ms chưa kịp thấy: kết thúc nó TRƯỚC khi mở cửa sổ
    // mới — nếu không, yêu cầu cũ treo tới hết hạn, tài khoản cũ còn nguyên, và hẹn giờ
    // "sẵn sàng" cũ có thể huỷ nhầm handshake của cửa sổ mới.
    if (this.#cuaSo) this.#daDong();
    const w = this.#mt.mo(this.#url);
    if (!w) throw new LoiCustos("cua-so-bi-chan", CAU_CONNECTOR["cua-so-bi-chan"]);
    this.#cuaSo = w;
    /*
     * Chờ "sẵn sàng" CÓ KẾT CỤC — Codex review 29/09. Bản đầu chỉ có resolve: cửa sổ đóng
     * trước khi trang ví tải xong thì `connect()` treo mãi, vì `#daDong()` chỉ kết thúc các
     * yêu cầu đã nằm trong `#cho`, còn yêu cầu kết nối chưa kịp vào đó.
     */
    this.#sanSang = new Promise<void>((res, rej) => {
      this.#baoSanSang = res;
      this.#huySanSang = rej;
    });
    // Không ai await (ví dụ đường ký) thì một reject cũng không thành unhandled rejection.
    this.#sanSang.catch(() => {});
    this.#henSanSang = this.#mt.hen(() => {
      this.#huySanSang?.(new LoiCustos("vi-khong-phan-hoi", CAU_CONNECTOR["vi-khong-phan-hoi"]));
      this.#xongSanSang();
    }, HAN_SAN_SANG_MS);
    this.#theoDoiDong();
  }

  #theoDoiDong(): void {
    const kiem = () => {
      if (!this.#cuaSo) return;
      if (this.#cuaSo.closed) return this.#daDong();
      this.#kiemDong = this.#mt.hen(kiem, 500);
    };
    this.#kiemDong = this.#mt.hen(kiem, 500);
  }

  #daDong(): void {
    this.#huySanSang?.(new LoiCustos("cua-so-dong", CAU_CONNECTOR["cua-so-dong"]));
    this.#xongSanSang();
    this.#cuaSo = null;
    this.#sanSang = null;
    this.#baoSanSang = null;
    if (this.#kiemDong !== null) this.#mt.huyHen(this.#kiemDong);
    this.#kiemDong = null;
    for (const [id, c] of this.#cho) {
      this.#mt.huyHen(c.hen);
      c.reject(new LoiCustos("cua-so-dong", CAU_CONNECTOR["cua-so-dong"]));
      this.#cho.delete(id);
    }
    this.#doiTaiKhoan(null);
  }

  /** Handshake đã có kết cục (sẵn sàng, đóng, hay hết hạn): bỏ hẹn giờ và hai hàm kết thúc. */
  #xongSanSang(): void {
    if (this.#henSanSang !== null) this.#mt.huyHen(this.#henSanSang);
    this.#henSanSang = null;
    this.#baoSanSang = null;
    this.#huySanSang = null;
  }

  #nhan(e: { data: unknown; origin: string; source: unknown }): void {
    // Hai kiểm do TRÌNH DUYỆT cấp — không tin bất cứ gì dApp khác hay trang khác tự khai.
    if (!this.#cuaSo || e.source !== this.#cuaSo || e.origin !== this.#origin) return;
    const m = docThongDiepVi(e.data);
    if (!m) return;
    if (m.kieu === "san-sang") {
      this.#baoSanSang?.();
      this.#xongSanSang();
      return;
    }
    if (m.kieu === "doi-tai-khoan") {
      // Ví đổi hay khoá tài khoản ⇒ ngắt; dApp phải xin kết nối lại, không tự nhận địa chỉ mới.
      if (m.diaChi === null || m.diaChi !== this.#accounts[0]?.address) this.#doiTaiKhoan(null);
      return;
    }
    const c = this.#cho.get(m.id);
    if (!c) return; // id lạ hoặc đã trả lời rồi — một câu trả lời, một lần.
    this.#cho.delete(m.id);
    this.#mt.huyHen(c.hen);
    if (m.ok) c.resolve(m.ketQua);
    else c.reject(new LoiCustos(m.loi, CAU_LOI[m.loi]));
  }

  #gui(yc: ThanYeuCau, hanMs: number, maHetHan: MaLoiConnector = "het-han") {
    const w = this.#cuaSo;
    if (!w || w.closed) return Promise.reject(new LoiCustos("cua-so-dong", CAU_CONNECTOR["cua-so-dong"]));
    const id = taoId();
    return new Promise<KetQuaKetNoi | KetQuaKy | null>((resolve, reject) => {
      const hen = this.#mt.hen(() => {
        if (!this.#cho.delete(id)) return;
        reject(new LoiCustos(maHetHan, maHetHan === "het-han" ? CAU_CONNECTOR["het-han"] : CAU_LOI["tu-choi"]));
      }, hanMs);
      this.#cho.set(id, { resolve, reject, hen });
      // targetOrigin là origin của ví, KHÔNG BAO GIỜ "*": cửa sổ đã bị điều hướng đi nơi khác thì
      // trình duyệt bỏ thông điệp thay vì giao bytes cho trang lạ.
      w.postMessage({ custos: PHIEN_BAN, ...yc, id }, this.#origin);
    });
  }

  #doiTaiKhoan(ketNoi: KetQuaKetNoi | null): void {
    const truoc = this.#accounts[0]?.address ?? null;
    this.#accounts = ketNoi
      ? [
          new ReadonlyWalletAccount({
            address: ketNoi.diaChi,
            publicKey: tuBase64(ketNoi.khoaCongKhai),
            chains: [CHUOI_DEVNET],
            features: [SolanaSignTransaction],
          }),
        ]
      : [];
    if ((this.#accounts[0]?.address ?? null) !== truoc)
      for (const l of this.#listeners) l({ accounts: this.accounts });
  }

  // ── các feature của chuẩn ───────────────────────────────────────────────────

  #connect: StandardConnectMethod = async (input) => {
    // `silent` (autoConnect): KHÔNG mở cửa sổ — chỉ trả tài khoản đã được cho phép, nếu có.
    if (input?.silent) return { accounts: this.accounts };
    this.#moCuaSo();
    await this.#sanSang;
    const kq = await this.#gui({ kieu: "ket-noi" }, HAN_KET_NOI_MS, "tu-choi");
    if (!kq || !("diaChi" in kq)) throw new LoiCustos("sai-yeu-cau", CAU_LOI["sai-yeu-cau"]);
    this.#doiTaiKhoan(kq);
    return { accounts: this.accounts };
  };

  #disconnect: StandardDisconnectMethod = async () => {
    if (this.#cuaSo && !this.#cuaSo.closed) await this.#gui({ kieu: "ngat" }, 5_000).catch(() => {});
    this.#doiTaiKhoan(null);
  };

  #signTransaction: SolanaSignTransactionMethod = async (...inputs) => {
    if (inputs.length !== 1)
      throw new LoiCustos("sai-yeu-cau", "Ví mẫu Custos chỉ ký MỘT giao dịch mỗi lần — mỗi giao dịch được kiểm riêng.");
    const [i] = inputs;
    if (!i || !this.#accounts.some((a) => a.address === i.account.address))
      throw new LoiCustos("chua-ket-noi", CAU_LOI["chua-ket-noi"]);
    if (i.chain !== undefined && i.chain !== CHUOI_DEVNET)
      throw new LoiCustos("sai-yeu-cau", "Ví mẫu Custos chỉ chạy trên Solana Devnet.");
    // Quá cỡ thì cửa sổ ví loại thông điệp mà không trả lời (`docYeuCau` → null): dApp sẽ chờ
    // trọn hạn rồi nhận "không rõ đã ký" — sai. Từ chối rõ ràng ngay tại đây.
    if (i.transaction.length === 0 || i.transaction.length > BYTE_TOI_DA)
      throw new LoiCustos("sai-yeu-cau", `Giao dịch phải dài 1–${BYTE_TOI_DA} byte.`);
    if (!this.#cuaSo || this.#cuaSo.closed) throw new LoiCustos("cua-so-dong", CAU_CONNECTOR["cua-so-dong"]);
    this.#cuaSo.focus();
    const kq = await this.#gui({ kieu: "ky", giaoDich: sangBase64(i.transaction) }, HAN_KY_MS);
    if (!kq || !("giaoDichDaKy" in kq)) throw new LoiCustos("chua-ro", CAU_LOI["chua-ro"]);
    return [{ signedTransaction: tuBase64(kq.giaoDichDaKy) }];
  };

  #on: StandardEventsOnMethod = (event, listener) => {
    if (event !== "change") return () => {};
    const l = listener as StandardEventsListeners["change"];
    this.#listeners.push(l);
    return () => {
      this.#listeners = this.#listeners.filter((x) => x !== l);
    };
  };
}

/**
 * Lệnh DUY NHẤT dApp cần thêm. `url` là trang `ket-noi.html` của ví mẫu Custos.
 * Trả về đối tượng ví để test; dApp bình thường không cần giữ nó.
 */
export function registerCustosWallet(opts: { url: string }): CustosWallet {
  const w = new CustosWallet(opts.url);
  registerWallet(w);
  return w;
}
