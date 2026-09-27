/**
 * KIỂM TRA SẴN SÀNG TRƯỚC KHI TRÌNH DIỄN — CK-01.
 *
 * Căn cứ (CK-F01, 27/09): ví đọc được số dư và lịch sử, nhưng ba ca phân tích đều quá
 * hạn — `getBalance` 300 ms trong khi `getAccountInfo`/`getMultipleAccounts` treo 8 s.
 * Một "ping" balance thành công vì vậy KHÔNG đủ để gắn nhãn "Sẵn sàng". Preflight này
 * đi đúng các chặng một lượt phân tích sẽ đi, theo đúng thứ tự, và dừng ở chặng hỏng:
 *
 *   genesis   — endpoint nào thật sự là Devnet (đo theo từng endpoint)
 *   blockhash — dựng được giao dịch
 *   ví        — đọc được tài khoản của ví cố định
 *   nguồn     — tài khoản token nguồn còn, đúng mint, đúng chủ
 *   mô phỏng  — mô phỏng được một ca LÀNH (không ký, không gửi)
 *
 * Chỉ đọc. Không ký, không gửi, không faucet. Mỗi chặng có hạn riêng; kết quả ghi thời
 * gian đo và HOST đã trả lời (không bao giờ URL đầy đủ — URL có thể mang khoá).
 */
import { PublicKey, type Connection } from "@solana/web3.js";
import { coHan, LoiQuaHan } from "../../../scripts/coHan.ts";
import { docNguonSong, HienTruongChuaSan } from "../../../scripts/hienTruongSong.ts";
import { GENESIS_DEVNET, hostCuaRpc, type QuanSatRpc } from "../../../scripts/rpcDuPhong.ts";
import type { HienTruong } from "./hienTruong.ts";
import { timKichBan } from "./kichBan.ts";

/** Genesis hash của Solana Devnet — MỘT bản, ở `scripts/rpcDuPhong.ts`; tái xuất cho nơi đang dùng. */
export { GENESIS_DEVNET };

/**
 * Danh sách endpoint cho MỘT lượt kiểm. Chưa lọc genesis xong (`null`): chỉ endpoint chính.
 * Lọc xong: đúng danh sách đã lọc — kể cả RỖNG (Codex review lần 2, mục 5). Rỗng thì
 * `ketNoiDuPhong` ném `LoiKhongCoRpcDung`, thay vì quay về endpoint vừa bị loại.
 */
export function dsChoLuotKiem(dsXacMinh: readonly string[] | null, dsCauHinh: readonly string[]): string[] {
  return dsXacMinh ? [...dsXacMinh] : dsCauHinh.slice(0, 1);
}

export type MaBuoc = "genesis" | "blockhash" | "vi" | "nguon" | "moPhong";
export type TrangThaiBuoc = "dat" | "loi" | "quaHan" | "chuaDo";

export type BuocPreflight = {
  ma: MaBuoc;
  ten: string;
  trangThai: TrangThaiBuoc;
  ms?: number;
  /** Host đã trả lời chặng này, nếu đo được. */
  nguon?: string;
  chiTiet?: string;
};

export type EndpointPreflight = {
  nguon: string;
  genesis: "devnet" | "khacCluster" | "chuaDo";
  ms?: number;
};

export type KetQuaPreflight = {
  sanSang: boolean;
  luc: string;
  buoc: BuocPreflight[];
  endpoint: EndpointPreflight[];
  /** URL còn dùng được sau khi loại endpoint chứng minh được là KHÁC cluster. */
  dsDung: string[];
};

export type TaoConn = (ds: string[], ghiNhan: (q: QuanSatRpc) => void) => Connection;

const TEN: Record<MaBuoc, string> = {
  genesis: "Đúng mạng Devnet",
  blockhash: "Lấy blockhash",
  vi: "Đọc tài khoản ví",
  nguon: "Đọc tài khoản token nguồn",
  moPhong: "Mô phỏng một giao dịch lành",
};

function moTa(e: unknown): { trangThai: TrangThaiBuoc; chiTiet: string } {
  if (e instanceof LoiQuaHan) return { trangThai: "quaHan", chiTiet: "không trả lời trong hạn" };
  if (e instanceof HienTruongChuaSan) return { trangThai: "loi", chiTiet: e.lyDo };
  const m = e instanceof Error ? e.message : String(e);
  // Thông điệp lỗi RPC có thể nhúng URL đầy đủ — chỉ giữ dòng đầu, bỏ mọi URL.
  return { trangThai: "loi", chiTiet: m.split("\n")[0]!.replace(/https?:\/\/\S+/g, "(endpoint)").slice(0, 140) };
}

export async function kiemSanSang(
  ds: string[],
  ht: HienTruong,
  taoConn: TaoConn,
  { msMoiBuoc = 6_000, bayGio = () => new Date() }: { msMoiBuoc?: number; bayGio?: () => Date } = {},
): Promise<KetQuaPreflight> {
  const buoc: BuocPreflight[] = [];
  const luc = bayGio().toISOString();

  /* ── 1 · Genesis, theo TỪNG endpoint ─────────────────────────────────────── */
  const endpoint: EndpointPreflight[] = await Promise.all(
    ds.map(async (url): Promise<EndpointPreflight> => {
      const t0 = Date.now();
      try {
        const g = await coHan(taoConn([url], () => {}).getGenesisHash(), msMoiBuoc);
        return { nguon: hostCuaRpc(url), genesis: g === GENESIS_DEVNET ? "devnet" : "khacCluster", ms: Date.now() - t0 };
      } catch {
        return { nguon: hostCuaRpc(url), genesis: "chuaDo", ms: Date.now() - t0 };
      }
    }),
  );
  // Chỉ loại endpoint CHỨNG MINH được là khác cluster. Chưa đo được thì giữ — nhưng
  // chặng genesis không được gắn "đạt" nếu KHÔNG endpoint nào xác nhận là Devnet.
  const dsDung = ds.filter((_, i) => endpoint[i]!.genesis !== "khacCluster");
  const coDevnet = endpoint.some((e) => e.genesis === "devnet");
  buoc.push({
    ma: "genesis",
    ten: TEN.genesis,
    trangThai: coDevnet ? "dat" : endpoint.every((e) => e.genesis === "chuaDo") ? "quaHan" : "loi",
    chiTiet: endpoint.map((e) => `${e.nguon}: ${e.genesis === "devnet" ? "Devnet" : e.genesis === "khacCluster" ? "KHÁC cluster — bỏ" : "chưa đo được"}`).join(" · "),
  });

  const conLai: MaBuoc[] = ["blockhash", "vi", "nguon", "moPhong"];
  const dungTu = (ma: MaBuoc) => {
    for (const m of conLai.slice(conLai.indexOf(ma))) buoc.push({ ma: m, ten: TEN[m], trangThai: "chuaDo" });
  };
  if (!coDevnet || dsDung.length === 0) {
    dungTu("blockhash");
    return { sanSang: false, luc, buoc, endpoint, dsDung };
  }

  /* ── 2…5 · Các chặng của một lượt phân tích, qua connection có dự phòng ────── */
  let nguonCuoi: string | undefined;
  const conn = taoConn(dsDung, (q) => {
    if (q.ketQua === "ok") nguonCuoi = q.nguon;
  });
  const chay = async <T,>(ma: MaBuoc, viec: () => Promise<T>, tomTat: (x: T) => string): Promise<T | undefined> => {
    nguonCuoi = undefined;
    const t0 = Date.now();
    try {
      const x = await coHan(viec(), msMoiBuoc);
      buoc.push({ ma, ten: TEN[ma], trangThai: "dat", ms: Date.now() - t0, ...(nguonCuoi ? { nguon: nguonCuoi } : {}), chiTiet: tomTat(x) });
      return x;
    } catch (e) {
      buoc.push({ ma, ten: TEN[ma], ms: Date.now() - t0, ...(nguonCuoi ? { nguon: nguonCuoi } : {}), ...moTa(e) });
      const k = conLai.indexOf(ma);
      if (k + 1 < conLai.length) dungTu(conLai[k + 1]!);
      return undefined;
    }
  };

  const bh = await chay("blockhash", () => conn.getLatestBlockhash("confirmed"), (x) => `hết hạn ở block ${x.lastValidBlockHeight}`);
  if (!bh) return { sanSang: false, luc, buoc, endpoint, dsDung };

  const vi = await chay(
    "vi",
    async () => {
      const a = await conn.getAccountInfo(new PublicKey(ht.nanNhan));
      if (!a) throw new Error("ví cố định chưa có tài khoản trên Devnet — cần nạp SOL từ faucet");
      return a;
    },
    (a) => `${(a.lamports / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 4 })} SOL`,
  );
  if (!vi) return { sanSang: false, luc, buoc, endpoint, dsDung };

  const nguon = await chay("nguon", () => docNguonSong(conn, ht), (x) => `số dư ${x.soDu} (đơn vị gốc)`);
  if (!nguon) return { sanSang: false, luc, buoc, endpoint, dsDung };

  const lanhTinh = timKichBan("lanh-tinh")!;
  const mp = await chay(
    "moPhong",
    async () => {
      const tx = lanhTinh.dungTx(ht, { blockhash: bh.blockhash, soDuNguon: nguon.soDu });
      const r = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
      if (r.value.err) throw new Error(`mô phỏng ca lành trả lỗi: ${JSON.stringify(r.value.err)}`);
      return r;
    },
    (r) => `slot ${r.context.slot}`,
  );
  return { sanSang: !!mp, luc, buoc, endpoint, dsDung };
}
