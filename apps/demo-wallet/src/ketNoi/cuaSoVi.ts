/**
 * CỬA SỔ VÍ — phía nhận của connector Wallet Standard. Spike G0-1.
 *
 * dApp gửi bytes, KHÔNG gửi gì khác (`@custos-solana/connector/giao-thuc`). Ở đây ví:
 *
 *   1. chỉ nghe `window.opener`, và ghim origin của lần xin kết nối đầu tiên;
 *   2. đọc bytes thành giao dịch, kiểm ví có phải người ký bắt buộc;
 *   3. chụp neo trên đúng bytes đó rồi `inspect()` — Custos kiểm GIAO DỊCH CỦA dApp, không
 *      phải một kịch bản ví tự dựng (khác `LiveSession`, xem ROADMAP-SAU-MENTOR mục 1);
 *   4. chờ người dùng: Chặn ⇒ `tu-choi`; Vẫn ký ⇒ `kySauKhiKiem` (khớp neo, phiên một lần,
 *      xác minh chữ ký G0-4) ⇒ trả bytes đã ký. Ví KHÔNG tự gửi giao dịch.
 *
 * Fail-safe: Custos không kiểm xong thì KHÔNG có nút ký — chỉ có "Đóng yêu cầu", trả
 * `chua-kiem-duoc`. dApp không có trường nào để tắt bước kiểm.
 *
 * Không đụng `window`/`import.meta`: trang `ket-noi.tsx` bơm mọi thứ vào, test Node chạy thẳng.
 */
import { PublicKey, VersionedTransaction, type Keypair } from "@solana/web3.js";
import type { Facts, NeoKetQua } from "@custos-solana/core";
import type { InspectResult } from "@custos-solana/types";
import { neoKetQua } from "@custos-solana/core";
import {
  PHIEN_BAN,
  docYeuCau,
  sangBase64,
  tuBase64,
  type MaLoi,
  type ThongDiepVi,
} from "@custos-solana/connector/giao-thuc";
import { kySauKhiKiem } from "../../../../vi-du-tich-hop/src/ky.js";
import { chuKyDauTien } from "../gui.ts";
import { doiChieu, duBaoTuFacts, thucTeTuGiaoDich, type DongDoiChieu, type DuBao, type GiaoDichRpc } from "./bienNhan.ts";

/**
 * Lỗi mà câu chữ do CHÍNH ví soạn (genesis sai, quá hạn) — được hiển thị nguyên văn. Mọi lỗi
 * khác đến từ RPC/transport và có thể chứa URL kèm khoá: chỉ hiển thị `CAU_LOI_DOC_CHAIN`.
 */
export class LoiHienThiDuoc extends Error {}

export const CAU_LOI_DOC_CHAIN =
  "lỗi khi đọc dữ liệu chain (chi tiết không hiển thị để không lộ cấu hình RPC).";

/** Người dùng có thể đọc cảnh báo lâu; quá hạn này thì kiểm lại chứ không ký kết quả cũ. */
export const TUOI_KET_QUA_TOI_DA_MS = 120_000;

export type YeuCauDangCho =
  | { kieu: "ket-noi"; id: string; origin: string }
  | {
      kieu: "ky";
      id: string;
      origin: string;
      tx: VersionedTransaction;
      /** `dang-kiem` → `da-kiem` (có `ketQua` + `neo`) hoặc `loi-kiem` (có `loi`). */
      pha: "dang-kiem" | "da-kiem" | "loi-kiem" | "dang-ky";
      ketQua?: InspectResult;
      facts?: Facts;
      neo?: NeoKetQua;
      loi?: string;
    };

/**
 * Biên nhận sau khi ký — B4. `cho-mang`: đang tra chữ ký; `chua-thay`: hết số lần tra mà
 * không thấy (dApp có thể chưa gửi) — ví KHÔNG gửi lại, không kết luận gì thêm.
 */
export type BienNhan = {
  chuKy: string;
  origin: string;
  pha: "cho-mang" | "thanh-cong" | "that-bai" | "chua-thay";
  duBao: DuBao;
  dong: DongDoiChieu[];
  khopHet: boolean | null;
};

export type TrangThaiCuaSo = {
  originDapp: string | null;
  daChoKetNoi: boolean;
  dangCho: YeuCauDangCho | null;
  bienNhan: BienNhan | null;
  /** Dòng nhật ký ngắn cho người dùng: đã chặn / đã ký / thông điệp bị loại. */
  nhatKy: string[];
};

export type PhuThuocCuaSo = {
  /** Địa chỉ ví cố định — lấy từ VÍ, không từ dApp. */
  viNguoiDung: string;
  /** Gửi cho dApp: bên gọi đảm bảo `targetOrigin` là origin đã ghim, không phải "*". */
  gui: (msg: ThongDiepVi, targetOrigin: string) => void;
  /** Kiểm Devnet (genesis) rồi `inspect()`; ném nếu không kiểm được. Facts (nếu có) dùng cho biên nhận. */
  kiem: (tx: VersionedTransaction) => Promise<{ ketQua: InspectResult; facts?: Facts }>;
  /** `getTransaction` theo chữ ký; `null` khi chưa thấy. Vắng ⇒ không lập biên nhận. */
  traCuu?: (chuKy: string) => Promise<GiaoDichRpc | null>;
  /** Chờ giữa hai lần tra — test bơm vào để khỏi chờ thật. */
  cho?: (ms: number) => Promise<void>;
  soLanTra?: number;
  /** Khoá đã nạp, hoặc null. */
  khoa: () => Keypair | null;
  bayGio?: () => number;
};

export class CuaSoVi {
  #p: PhuThuocCuaSo;
  #daThay = new Set<string>();
  #nghe = new Set<(s: TrangThaiCuaSo) => void>();
  trangThai: TrangThaiCuaSo = { originDapp: null, daChoKetNoi: false, dangCho: null, bienNhan: null, nhatKy: [] };

  constructor(p: PhuThuocCuaSo) {
    this.#p = p;
  }

  theoDoi(fn: (s: TrangThaiCuaSo) => void): () => void {
    this.#nghe.add(fn);
    fn(this.trangThai);
    return () => this.#nghe.delete(fn);
  }

  #dat(doi: Partial<TrangThaiCuaSo>) {
    this.trangThai = { ...this.trangThai, ...doi };
    for (const f of this.#nghe) f(this.trangThai);
  }

  #ghi(dong: string) {
    this.#dat({ nhatKy: [dong, ...this.trangThai.nhatKy].slice(0, 8) });
  }

  #loi(id: string, loi: MaLoi, origin: string) {
    this.#p.gui({ custos: PHIEN_BAN, kieu: "tra-loi", id, ok: false, loi }, origin);
  }

  /**
   * Một `MessageEvent`. `laOpener` do trang tính bằng `e.source === window.opener` — chỉ trình
   * duyệt cấp được điều đó; thân thông điệp không có trường nào nói "tôi là opener".
   */
  nhan(e: { data: unknown; origin: string; laOpener: boolean }): void {
    if (!e.laOpener) return;
    const ghim = this.trangThai.originDapp;
    if (ghim !== null && e.origin !== ghim) {
      this.#ghi(`Bỏ thông điệp từ ${e.origin}: ví đang kết nối với ${ghim}.`);
      return;
    }
    const yc = docYeuCau(e.data);
    if (!yc) return;
    // Mỗi id một lần: phát lại một yêu cầu cũ không mở lại được hộp thoại nào.
    if (this.#daThay.has(yc.id)) return;
    this.#daThay.add(yc.id);

    if (yc.kieu === "ngat") {
      /*
       * NGẮT HUỶ YÊU CẦU ĐANG CHỜ — Codex review 29/09. Bản đầu chỉ tắt `daChoKetNoi`: yêu cầu
       * ký còn nguyên, người dùng vẫn bấm "Vẫn ký" được, và wallet-adapter đang chờ sẽ gửi giao
       * dịch dù dApp đã báo ngắt. Chưa bắt đầu ký ⇒ huỷ hẳn. ĐANG ký ⇒ để `vanKy` tự kết thúc:
       * nó thấy đã ngắt và giữ chữ ký lại trong ví (xem đoạn sau `kySauKhiKiem`).
       */
      const dc = this.trangThai.dangCho;
      const dangKy = dc?.kieu === "ky" && dc.pha === "dang-ky";
      if (dc && !dangKy) {
        this.#loi(dc.id, "chua-ket-noi", dc.origin);
        this.#dat({ dangCho: null });
      }
      this.#dat({ daChoKetNoi: false });
      this.#p.gui({ custos: PHIEN_BAN, kieu: "tra-loi", id: yc.id, ok: true, ketQua: null }, e.origin);
      this.#ghi(dc && !dangKy ? "Ứng dụng đã ngắt kết nối — yêu cầu đang chờ đã bị huỷ." : "Ứng dụng đã ngắt kết nối.");
      return;
    }
    if (this.trangThai.dangCho) return this.#loi(yc.id, "dang-ban", e.origin);

    if (yc.kieu === "ket-noi") {
      this.#dat({ originDapp: e.origin, dangCho: { kieu: "ket-noi", id: yc.id, origin: e.origin } });
      return;
    }

    // yc.kieu === "ky"
    if (!this.trangThai.daChoKetNoi) return this.#loi(yc.id, "chua-ket-noi", e.origin);
    let tx: VersionedTransaction;
    try {
      tx = VersionedTransaction.deserialize(tuBase64(yc.giaoDich));
    } catch {
      this.#ghi("Bỏ yêu cầu ký: không đọc được bytes giao dịch.");
      return this.#loi(yc.id, "sai-yeu-cau", e.origin);
    }
    if (!laNguoiKyBatBuoc(tx, this.#p.viNguoiDung)) {
      this.#ghi("Bỏ yêu cầu ký: ví này không phải người ký của giao dịch.");
      return this.#loi(yc.id, "sai-yeu-cau", e.origin);
    }
    this.#dat({ dangCho: { kieu: "ky", id: yc.id, origin: e.origin, tx, pha: "dang-kiem" } });
    void this.#kiem();
  }

  async #kiem(): Promise<void> {
    const d = this.trangThai.dangCho;
    if (d?.kieu !== "ky") return;
    // Neo chụp TRƯỚC await: kiểm chính các bytes này, và ký đúng các bytes này.
    const bytes = d.tx.message.serialize();
    const neo = neoKetQua(bytes, this.#p.viNguoiDung, "devnet", new Date(this.#bayGio()).toISOString());
    try {
      const { ketQua, facts } = await this.#p.kiem(d.tx);
      if (this.trangThai.dangCho !== d) return;
      this.#dat({ dangCho: { ...d, pha: "da-kiem", ketQua, facts, neo } });
    } catch (e) {
      if (this.trangThai.dangCho !== d) return;
      // Lỗi từ RPC/transport có thể chứa nguyên URL kèm khoá (Codex review 29/09): chỉ câu do
      // chính ví soạn mới lên giao diện; còn lại là một câu chung, không chép nội dung lỗi.
      this.#dat({ dangCho: { ...d, pha: "loi-kiem", loi: e instanceof LoiHienThiDuoc ? e.message : CAU_LOI_DOC_CHAIN } });
    }
  }

  #bayGio() {
    return (this.#p.bayGio ?? Date.now)();
  }

  choKetNoi(): void {
    const d = this.trangThai.dangCho;
    if (d?.kieu !== "ket-noi") return;
    this.#p.gui(
      {
        custos: PHIEN_BAN,
        kieu: "tra-loi",
        id: d.id,
        ok: true,
        ketQua: {
          diaChi: this.#p.viNguoiDung,
          khoaCongKhai: sangBase64(new PublicKey(this.#p.viNguoiDung).toBytes()),
        },
      },
      d.origin,
    );
    this.#dat({ daChoKetNoi: true, dangCho: null });
    this.#ghi(`Đã cho ${d.origin} xem địa chỉ ví.`);
  }

  /** Chặn / từ chối. Custos chưa kiểm xong thì mã là `chua-kiem-duoc`, không phải người dùng từ chối. */
  tuChoi(): void {
    const d = this.trangThai.dangCho;
    if (!d || (d.kieu === "ky" && d.pha === "dang-ky")) return;
    const ma: MaLoi = d.kieu === "ky" && d.pha === "loi-kiem" ? "chua-kiem-duoc" : "tu-choi";
    this.#loi(d.id, ma, d.origin);
    this.#dat({ dangCho: null, ...(d.kieu === "ket-noi" ? { originDapp: null } : {}) });
    this.#ghi(d.kieu === "ky" ? "Đã chặn giao dịch — không có chữ ký nào được tạo." : "Đã từ chối kết nối.");
  }

  /** Người dùng bấm "Vẫn ký" SAU khi đã thấy kết quả. Không có kết quả thì không có đường tới đây. */
  async vanKy(): Promise<void> {
    const d = this.trangThai.dangCho;
    if (d?.kieu !== "ky" || d.pha !== "da-kiem" || !d.ketQua || !d.neo) return;
    const khoa = this.#p.khoa();
    if (!khoa || khoa.publicKey.toBase58() !== this.#p.viNguoiDung) return;
    this.#dat({ dangCho: { ...d, pha: "dang-ky" } });
    const kq = await kySauKhiKiem({
      quyetDinh: { cho: d.ketQua.level === "safe" ? "ky" : "hoi", lyDo: d.ketQua.level },
      neo: d.neo,
      tx: d.tx,
      viNguoiDung: this.#p.viNguoiDung,
      cluster: "devnet",
      nguoiDungDongY: true,
      msToiDa: TUOI_KET_QUA_TOI_DA_MS,
      signer: (t) => {
        const ban = VersionedTransaction.deserialize(t.serialize());
        ban.sign([khoa]);
        return ban;
      },
    });
    // Ngắt trong lúc đang ký: đã có chữ ký nhưng KHÔNG trao cho dApp — không ai gửi được giao
    // dịch này. Trả `chua-ro` chứ không phải "từ chối": ví đã ký, chỉ là chữ ký không rời ví.
    if (!this.trangThai.daChoKetNoi) {
      this.#loi(d.id, "chua-ro", d.origin);
      this.#dat({ dangCho: null });
      this.#ghi("Ứng dụng đã ngắt trong lúc ký — chữ ký được giữ lại trong ví, không trao cho ứng dụng.");
      return;
    }
    if (kq.ketCuc === "da_ky") {
      this.#p.gui(
        { custos: PHIEN_BAN, kieu: "tra-loi", id: d.id, ok: true, ketQua: { giaoDichDaKy: sangBase64(kq.giaoDichDaKy.serialize()) } },
        d.origin,
      );
      this.#dat({ dangCho: null });
      this.#ghi("Đã ký theo quyết định của bạn. Ứng dụng tự gửi giao dịch; ví không gửi.");
      const chuKy = chuKyDauTien(kq.giaoDichDaKy);
      if (chuKy && this.#p.traCuu) void this.#theoDoiBienNhan(chuKy, d.origin, duBaoTuFacts(d.facts, this.#p.viNguoiDung));
      return;
    }
    if (kq.lyDo === "ket_qua_qua_cu") {
      // Kết quả cũ: trạng thái chain có thể đã đổi — kiểm lại, người dùng xem lại rồi mới ký.
      this.#dat({ dangCho: { ...d, pha: "dang-kiem", ketQua: undefined, facts: undefined, neo: undefined } });
      this.#ghi("Kết quả kiểm đã cũ — Custos đang kiểm lại trước khi cho ký.");
      void this.#kiem();
      return;
    }
    this.#loi(d.id, kq.ketCuc === "chua_ro" ? "chua-ro" : "sai-yeu-cau", d.origin);
    this.#dat({ dangCho: null });
    this.#ghi(`Không ký: ${kq.lyDo}.`);
  }

  /**
   * Tra chữ ký tới khi thấy hoặc hết lượt. CHỈ ĐỌC — không có nhánh nào gửi hay gửi lại.
   * Biên nhận mới thay biên nhận cũ; lượt tra của biên nhận cũ tự dừng.
   */
  async #theoDoiBienNhan(chuKy: string, origin: string, duBao: DuBao): Promise<void> {
    const bn: BienNhan = { chuKy, origin, pha: "cho-mang", duBao, dong: [], khopHet: null };
    this.#dat({ bienNhan: bn });
    const cho = this.#p.cho ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    const soLan = this.#p.soLanTra ?? 45;
    for (let i = 0; i < soLan; i++) {
      if (this.trangThai.bienNhan?.chuKy !== chuKy) return;
      let g: GiaoDichRpc | null = null;
      try {
        g = await this.#p.traCuu!(chuKy);
      } catch {
        g = null; // lỗi mạng khi tra ≠ giao dịch thất bại — tra tiếp
      }
      const thucTe = g ? thucTeTuGiaoDich(g, this.#p.viNguoiDung, duBao.ok ? duBao.token.map((t) => t.taiKhoan) : []) : null;
      if (thucTe) {
        if (this.trangThai.bienNhan?.chuKy !== chuKy) return;
        const { dong, khopHet } = doiChieu(duBao, thucTe);
        this.#dat({ bienNhan: { ...bn, pha: thucTe.thanhCong ? "thanh-cong" : "that-bai", dong, khopHet } });
        return;
      }
      await cho(2000);
    }
    if (this.trangThai.bienNhan?.chuKy === chuKy) this.#dat({ bienNhan: { ...bn, pha: "chua-thay" } });
  }
}

function laNguoiKyBatBuoc(tx: VersionedTransaction, vi: string): boolean {
  const i = tx.message.staticAccountKeys.findIndex((k) => k.toBase58() === vi);
  return i >= 0 && i < tx.message.header.numRequiredSignatures;
}
