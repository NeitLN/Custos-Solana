/**
 * PHÁT LẠI THEO KỊCH BẢN — CK-02.
 *
 * Bộ dữ liệu `public/replay/kich-ban.json` do `scripts/ky-thuat/capture-kich-ban.ts` ghi:
 * mỗi kịch bản của Phòng phân tích một fixture RPC, cùng ảnh chụp hiện trường lúc ghi.
 * Ví dựng lại giao dịch và chạy `inspect()` THẬT trên fixture đó — engine của bản đang
 * chạy, dữ liệu RPC của lúc ghi. Không mạng, không signer.
 *
 * Ba điều phải luôn nói được trên màn hình, và module này giữ dữ kiện cho cả ba:
 *   · đây là PHÁT LẠI, ghi lúc nào, slot nào, từ nguồn nào;
 *   · engine đang chạy là bản nào, và nó có cho kết quả KHÁC lúc ghi không;
 *   · fixture thiếu lời gọi nào — thiếu thì báo, KHÔNG lén gọi mạng bù.
 */
import type { InspectOptions } from "@custos-solana/types";
import { DEFAULT_DEMO_WALLET } from "../../../scripts/demo-wallet-config.ts";
import { connTuFixture, type Fixture, type ThieuFixture } from "../../../scripts/replayFixture.ts";
import type { HienTruong } from "./hienTruong.ts";
import { KICH_BAN, type KichBan } from "./kichBan.ts";
import { GENESIS_DEVNET } from "./preflight.ts";

export type KetQuaLucGhi = {
  level: string;
  reasonCodes: string[];
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
};

export type MauReplayKichBan = {
  id: string;
  captureLuc: string;
  /** Host đã trả lời lượt ghi này. Nhiều hơn một ⇒ lượt ghi đã trộn nguồn. */
  nguon: string[];
  slot?: number;
  ketQuaLucGhi: KetQuaLucGhi;
  fixture: Fixture;
};

export type BoReplayKichBan = {
  schema: "custos.replay-kich-ban";
  phienBan: 1;
  cluster: "devnet";
  genesis: string;
  nguonGhi: string[];
  engineLucGhi: { core: string; ai: string };
  viBaoVe: string;
  hienTruong: HienTruong;
  gioiHan: string;
  mau: MauReplayKichBan[];
};

/**
 * Tuỳ chọn `inspect()` cho một kịch bản — MỘT chỗ cho cả ví lẫn script ghi fixture.
 *
 * Trước đây ví tự dựng tuỳ chọn trong `App.tsx` còn script tự dựng bản của nó, và hai
 * bên từng lệch nhau ở `nguoiDung` (rà soát 25/09). Fixture ghi bằng tuỳ chọn khác với
 * tuỳ chọn lúc phát lại thì phát lại một lượt kiểm KHÁC.
 */
export function tuyChonInspectKichBan(kb: KichBan | undefined, ht: HienTruong): InspectOptions {
  return {
    locale: "vi",
    ...(kb?.khongKhaiNguoiDung ? {} : { nguoiDung: ht.nanNhan }),
    // Bật dấu vết cho ví DEMO — xem chú thích TB-X02 trong `App.tsx`. Không thêm lượt RPC.
    chanDoan: true,
    ...(ht.kyHieu ? { kyHieuToken: { [ht.mint]: ht.kyHieu } } : {}),
  };
}

/** Kiểm bộ phát lại trước khi dùng. Trả lý do hỏng, hoặc `null` nếu dùng được. */
export function xacThucBoReplay(x: unknown): string | null {
  if (!x || typeof x !== "object") return "không phải một đối tượng JSON";
  const o = x as Partial<BoReplayKichBan>;
  if (o.schema !== "custos.replay-kich-ban") return "sai schema";
  if (o.phienBan !== 1) return `phiên bản ${String(o.phienBan)} chưa hỗ trợ`;
  if (o.cluster !== "devnet" || o.genesis !== GENESIS_DEVNET) return "dữ liệu không phải của Devnet";
  /*
   * VÍ ĐƯỢC BẢO VỆ phải là ví cố định (quyết định khoá số 8). Một bộ ghi từ ví khác thì
   * không phải hành trình demo — nó thuộc phòng bằng chứng, với địa chỉ gốc và nhãn lịch
   * sử, không được lặng lẽ thay vào đây.
   */
  if (o.viBaoVe !== DEFAULT_DEMO_WALLET || o.hienTruong?.nanNhan !== DEFAULT_DEMO_WALLET) {
    return "dữ liệu ghi cho một ví khác ví demo cố định";
  }
  if (!Array.isArray(o.mau) || o.mau.length === 0) return "không có kịch bản nào";
  for (const m of o.mau) {
    if (!KICH_BAN.some((k) => k.id === m?.id)) return `kịch bản lạ: ${String(m?.id)}`;
    if (!Array.isArray(m.fixture?.banGhi)) return `kịch bản ${m.id}: fixture hỏng`;
  }
  return null;
}

export async function docBoReplay(): Promise<{ bo: BoReplayKichBan } | { loi: string }> {
  try {
    // Không `no-store`: bộ này được nạp sẵn lúc mở trang, và bản đã tải phải dùng lại được
    // khi mạng rớt giữa chừng (Codex review 27/09). Nội dung chỉ đổi khi deploy lại.
    const r = await fetch(`${import.meta.env.BASE_URL}replay/kich-ban.json`);
    if (!r.ok) return { loi: "chưa có bộ dữ liệu đã ghi" };
    const x: unknown = await r.json();
    const lyDo = xacThucBoReplay(x);
    return lyDo ? { loi: lyDo } : { bo: x as BoReplayKichBan };
  } catch {
    return { loi: "không đọc được bộ dữ liệu đã ghi" };
  }
}

/** Connection phát lại cho MỘT kịch bản, cùng hộp lời gọi thiếu để bên gọi đọc sau. */
export function connReplay(m: MauReplayKichBan): { conn: unknown; thieu: () => ThieuFixture[] } {
  const f = connTuFixture(m.fixture);
  return { conn: f.conn, thieu: f.thieuFixture };
}

/**
 * Engine hiện tại có cho kết quả KHÁC lúc ghi không. Khác thì phải hiện ra — không được
 * lấy kết quả lúc ghi đè lên, cũng không được giấu (CK-02: "sai khác do engine đổi phải
 * hiện ra").
 */
export function soVoiLucGhi(
  nay: { level: string; reasonCodes: readonly string[]; coverage?: KetQuaLucGhi["coverage"] },
  lucGhi: KetQuaLucGhi,
): { khop: true } | { khop: false; moTa: string } {
  const a = [...nay.reasonCodes].sort().join(",");
  const b = [...lucGhi.reasonCodes].sort().join(",");
  /*
   * COVERAGE CŨNG LÀ KẾT QUẢ (Codex review 27/09). Engine đọc hiểu ít hơn lúc ghi mà mức
   * và mã giữ nguyên vẫn là một sai khác phải nói — "Phần chưa đọc hiểu" là trục khác biệt
   * của sản phẩm, không phải chi tiết phụ.
   */
  const cov = (c: KetQuaLucGhi["coverage"]) => `${c.analyzed}/${c.total}, ${c.unverifiedPrograms} chưa xác minh`;
  const covKhop =
    !nay.coverage ||
    (nay.coverage.analyzed === lucGhi.coverage.analyzed &&
      nay.coverage.total === lucGhi.coverage.total &&
      nay.coverage.unverifiedPrograms === lucGhi.coverage.unverifiedPrograms);
  if (nay.level === lucGhi.level && a === b && covKhop) return { khop: true };
  const phanCov = nay.coverage ? `; đọc hiểu ${cov(lucGhi.coverage)} → ${cov(nay.coverage)}` : "";
  return {
    khop: false,
    moTa: `Lúc ghi: ${lucGhi.level}${b ? ` (${b})` : ""}. Engine đang chạy: ${nay.level}${a ? ` (${a})` : ""}${phanCov}.`,
  };
}

/** Hai ảnh chụp hiện trường có dựng ra CÙNG giao dịch không — bỏ cấu hình RPC, giữ mọi địa chỉ. */
export function cungHienTruong(x: HienTruong, y: HienTruong): boolean {
  const bo = ({ rpc: _r, rpcDuPhong: _d, ...con }: HienTruong) => JSON.stringify(Object.entries(con).sort());
  return bo(x) === bo(y);
}

/**
 * GỘP bộ phát lại cũ với các ca vừa ghi — hàm thuần, script ghi fixture dùng.
 *
 * Code review Codex 27/09: bản trước giữ fixture cũ nhưng thay ảnh chụp `hienTruong` dùng
 * chung bằng hiện trường hiện tại. Sau khi dựng lại hiện trường và ghi lẻ một ca, các ca giữ
 * lại dựng tx bằng địa chỉ MỚI trên fixture ghi bằng địa chỉ CŨ ⇒ thiếu fixture hàng loạt.
 * Nay: hiện trường đổi thì ghi lẻ bị từ chối, và ghi toàn bộ không giữ ca cũ nào.
 */
export function gopBoReplay(
  cu: BoReplayKichBan | null,
  ht: HienTruong,
  moi: ReadonlyMap<string, MauReplayKichBan>,
  chiId: readonly string[],
): { mau: MauReplayKichBan[] } | { loi: string } {
  const cung = !!cu && cungHienTruong(cu.hienTruong, ht);
  if (cu && !cung && chiId.length > 0) {
    return { loi: "hiện trường đã đổi so với bộ phát lại đang có — ghi lại TOÀN BỘ (bỏ tham số id), không ghi lẻ" };
  }
  const cuDung = cung ? cu!.mau : [];
  const mau = KICH_BAN.map(
    // Bản cũ chỉ được giữ nếu chính nó thoả quy tắc một-nguồn.
    (k) => moi.get(k.id) ?? cuDung.find((m) => m.id === k.id && m.nguon?.length === 1),
  ).filter((m): m is MauReplayKichBan => !!m);
  return { mau };
}

/** Phát lại không làm tiếp được — thiếu bộ dữ liệu, thiếu kịch bản, hoặc fixture thiếu lời gọi. */
export class LoiPhatLai extends Error {
  constructor(lyDo: string) {
    super(lyDo);
    this.name = "LoiPhatLai";
  }
}
