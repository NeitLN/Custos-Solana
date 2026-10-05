/**
 * GIAO DỊCH MAINNET THẬT — PHÁT LẠI. R0-3, ROADMAP-GIONG-THAT.
 *
 * Bộ `public/replay/mainnet.json` do `scripts/capture-mainnet-phat-lai.ts` ghi: giao dịch mainnet
 * vừa thực thi, Custos dựng lại bản chưa ký và mô phỏng lại sau vài giây, phản hồi RPC được ghi.
 * Ở đây engine của bản đang chạy chạy lại trên phản hồi đó. KHÔNG gọi mạng, KHÔNG ký.
 *
 * Ba điều màn hình phải nói được, module này giữ dữ kiện cho cả ba:
 *   · giao dịch nào (chữ ký gốc, link Explorer), thực thi lúc nào, mô phỏng lại sau bao lâu;
 *   · đây là PHÁT LẠI dữ liệu đã ghi — không phải trạng thái chuỗi hiện tại, không phải luồng ký;
 *   · mẫu được chọn theo luật nào, mẫu nào bị bỏ và vì sao.
 *
 * Runtime của ví vẫn chỉ Devnet: module này không mở Connection nào tới mainnet, và không có
 * endpoint mainnet nào trong mã nguồn — cluster đến từ dữ liệu đã ghi.
 */
import { Buffer } from "buffer";
import { VersionedTransaction, type Connection } from "@solana/web3.js";
import type { InspectOptions } from "@custos-solana/types";
import { connTuFixture, type Fixture, type ThieuFixture } from "../../../scripts/replayFixture.ts";
import type { KetQuaLucGhi } from "./replayKichBan.ts";
import { lienKetExplorer } from "./diaChi.ts";

/** Genesis hash của Solana mainnet — so khớp dữ liệu, KHÔNG dùng để kết nối. */
export const GENESIS_MAINNET = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

/**
 * Tuỳ chọn `inspect()` — MỘT chỗ cho cả script ghi lẫn ví phát lại. Không khai `nguoiDung`:
 * không ai trong đội là chủ các giao dịch này, nên Custos phân tích theo người trả phí.
 */
export const TUY_CHON_MAINNET: InspectOptions = { locale: "vi", chanDoan: true };

export type MauReplayMainnet = {
  id: string;
  chuKy: string;
  slotThucThi: number;
  thucThiLuc: string | null;
  captureLuc: string;
  /** Giây từ lúc giao dịch được thực thi tới lúc Custos mô phỏng lại. */
  treGiay: number | null;
  /** Bản CHƯA KÝ (chữ ký 0) dựng lại từ message gốc. */
  b64: string;
  ketQuaLucGhi: KetQuaLucGhi;
  fixture: Fixture;
};

export type BoReplayMainnet = {
  schema: "custos.replay-mainnet";
  phienBan: 1;
  cluster: string;
  genesis: string;
  nguonGhi: string[];
  engineLucGhi: { core: string; ai: string };
  cachChon: { chuongTrinh: string; layLuc: string; slotDanhSach: number | null; quyTac: string };
  gioiHan: string;
  boQua: Array<{ chuKy: string; lyDo: string }>;
  mau: MauReplayMainnet[];
};

const CHU_KY = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

/** Kiểm bộ trước khi dùng. Trả lý do hỏng, hoặc `null` nếu dùng được. */
export function xacThucBoMainnet(x: unknown): string | null {
  if (!x || typeof x !== "object") return "không phải một đối tượng JSON";
  const o = x as Partial<BoReplayMainnet>;
  if (o.schema !== "custos.replay-mainnet") return "sai schema";
  if (o.phienBan !== 1) return `phiên bản ${String(o.phienBan)} chưa hỗ trợ`;
  if (o.genesis !== GENESIS_MAINNET) return "dữ liệu không phải của mainnet";
  /*
   * Nhãn cluster đi vào link Explorer của thẻ cảnh báo — genesis đúng mà nhãn sai thì link trỏ nhầm
   * mạng (Codex review 06/10). Kiểm bằng CHÍNH hàm dựng link: nhãn phải cho ra link mainnet (không có
   * `?cluster`), thay vì so với một chuỗi gõ lại ở đây.
   */
  const link = typeof o.cluster === "string" ? lienKetExplorer(GENESIS_MAINNET, o.cluster) : null;
  if (!link || link.includes("?")) return "nhãn cluster không khớp genesis mainnet";
  if (!Array.isArray(o.nguonGhi) || o.nguonGhi.length !== 1) return "bộ ghi phải đến từ đúng một nguồn";
  // Host trần — URL đầy đủ có thể mang khoá API.
  if (o.nguonGhi.some((n) => typeof n !== "string" || /[/?:@]/.test(n))) return "nguồn ghi không phải host trần";
  if (!o.cachChon?.quyTac || !Array.isArray(o.boQua)) return "thiếu luật chọn mẫu";
  if (!Array.isArray(o.mau) || o.mau.length === 0) return "không có mẫu nào";
  for (const m of o.mau) {
    if (!CHU_KY.test(m?.chuKy ?? "")) return `mẫu ${String(m?.id)}: chữ ký hỏng`;
    if (!Array.isArray(m.fixture?.banGhi)) return `mẫu ${m.id}: fixture hỏng`;
    if (m.fixture.nguon !== o.nguonGhi[0]) return `mẫu ${m.id}: nguồn khác nguồn của bộ`;
  }
  return null;
}

/** Bộ nặng (~MB) nên chỉ tải khi người xem mở mục này. */
export async function docBoMainnet(): Promise<{ bo: BoReplayMainnet } | { loi: string }> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}replay/mainnet.json`);
    if (!r.ok) return { loi: "chưa có bộ giao dịch mainnet đã ghi" };
    const x: unknown = await r.json();
    const lyDo = xacThucBoMainnet(x);
    return lyDo ? { loi: lyDo } : { bo: x as BoReplayMainnet };
  } catch {
    return { loi: "không đọc được bộ giao dịch mainnet đã ghi" };
  }
}

export function txCuaMau(m: MauReplayMainnet): VersionedTransaction {
  return VersionedTransaction.deserialize(Buffer.from(m.b64, "base64"));
}

/** Connection phát lại MỚI cho một mẫu, cùng hộp lời gọi thiếu để đọc SAU khi inspect xong. */
export function connMainnet(m: MauReplayMainnet): { conn: Connection; thieu: () => ThieuFixture[] } {
  const f = connTuFixture(m.fixture);
  return { conn: f.conn as Connection, thieu: f.thieuFixture };
}

/** Link Explorer của chữ ký gốc. Explorer mặc định là mainnet — không cần tham số cluster. */
export const explorerTx = (chuKy: string) => `https://explorer.solana.com/tx/${chuKy}`;

/** Lý do bỏ mẫu, viết cho người đọc — bản gốc là thông điệp RPC tiếng Anh, vẫn nằm nguyên trong dữ liệu. */
export function lyDoBoNgan(lyDo: string): string {
  if (/version \(1\)/i.test(lyDo)) return "giao dịch phiên bản mới (v1) mà thư viện web3.js chưa đọc được";
  if (/không trả giao dịch/.test(lyDo)) return "RPC không trả giao dịch";
  if (/RPC hỏng/.test(lyDo)) return "RPC lỗi sau nhiều lần thử";
  return "không lấy được giao dịch";
}

/** Đếm kết quả LÚC GHI của cả bộ — hiện cạnh danh sách để không ai chọn riêng thẻ đẹp. */
export function tomTatBo(bo: BoReplayMainnet): { safe: number; warning: number; danger: number; moPhongHong: number } {
  const t = { safe: 0, warning: 0, danger: 0, moPhongHong: 0 };
  for (const m of bo.mau) {
    const l = m.ketQuaLucGhi.level;
    if (l === "safe" || l === "warning" || l === "danger") t[l]++;
    if (m.ketQuaLucGhi.reasonCodes.includes("MO_PHONG_HONG")) t.moPhongHong++;
  }
  return t;
}
