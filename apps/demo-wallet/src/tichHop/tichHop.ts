/**
 * TRANG "TÍCH HỢP" — việc A3, ROADMAP-SAU-MENTOR. Mentor 29/09: *"chứng minh npm install →
 * import → tx → inspect() → warning → sign"*.
 *
 * Hai điều trang này KHÔNG được làm:
 *   · hiển thị một đoạn mã khác với mã thật đang chạy — nên đoạn mã được CẮT NGUYÊN VĂN từ
 *     file nguồn (import `?raw`), và nút chạy thử gọi CHÍNH hàm trong file đó;
 *   · gõ tay số dòng tích hợp — nên số dòng do `demDongMa` đếm trên chính đoạn đã cắt.
 *
 * Chạy thử dùng PHÁT LẠI (`public/replay/kich-ban.json`): giao dịch và dữ liệu RPC đã ghi trên
 * Devnet, engine của bản đang chạy. Không mạng, không ký — và trang phải nói rõ điều đó.
 */
import { PublicKey, type Connection } from "@solana/web3.js";
import { inspect } from "@custos-solana/core";
import type { InspectResult } from "@custos-solana/types";
import { connReplay, soVoiLucGhi, type BoReplayKichBan, type KetQuaLucGhi } from "../replayKichBan.ts";
import { timKichBan } from "../kichBan.ts";
import { docNguonSong } from "../../../../scripts/hienTruongSong.ts";
// @ts-expect-error — JavaScript thuần, cố ý (xem `tichHopShim.test.ts`): đây là đúng file bên
// tích hợp chép về, nên không thêm `.d.ts` cho nó. Kiểu khai ngay dưới, chỉ cho trang này.
import { kiemTruocKhiKy as kiemJs } from "../../../../vi-du-tich-hop/src/tich-hop.js";
// @ts-expect-error — cùng lý do: bản định danh tiếng Anh của đúng tích hợp trên (review UX 11/2026).
import { inspectBeforeSigning as kiemEnJs } from "../../../../vi-du-tich-hop/src/inspect-before-signing.js";

export type QuyetDinhTichHop = {
  cho: "ky" | "hoi" | "chan";
  lyDo: "khong_van_de" | "coverage_khuyet" | "de_nghi_kiem_tra" | "phat_hien" | "khong_kiem_duoc";
  ketQua: InspectResult | null;
  loi: string | null;
};
const kiemTruocKhiKy = kiemJs as (p: Record<string, unknown>) => Promise<QuyetDinhTichHop>;

/** Hợp đồng trả về của bản tiếng Anh — cùng ba quyết định, cùng năm lý do, khác tên. */
export type DecisionEn = {
  decision: "sign" | "ask" | "block";
  reason: "no_issue" | "incomplete_coverage" | "review_requested" | "detected" | "could_not_check";
  result: InspectResult | null;
  error: string | null;
};
const inspectBeforeSigning = kiemEnJs as (p: Record<string, unknown>) => Promise<DecisionEn>;

/** Ánh xạ một-một giữa hai bản — test dùng để đòi hai file trả CÙNG một câu trả lời. */
export const CHO_SANG_EN = { ky: "sign", hoi: "ask", chan: "block" } as const;
export const LY_DO_SANG_EN = {
  khong_van_de: "no_issue",
  coverage_khuyet: "incomplete_coverage",
  de_nghi_kiem_tra: "review_requested",
  phat_hien: "detected",
  khong_kiem_duoc: "could_not_check",
} as const;

/** Từ dòng bắt đầu bằng `dau` tới hết file — nguyên văn, chỉ bỏ khoảng trắng cuối. */
export function catTu(raw: string, dau: string): string {
  const i = raw.indexOf(dau);
  if (i < 0) throw new Error(`"${dau}" not found in the source file — the Integration page is out of sync with the code`);
  return raw.slice(i).trimEnd();
}

/** Các dòng khớp mẫu, nguyên văn, theo thứ tự trong file. */
export function catDong(raw: string, mau: RegExp): string {
  const d = raw.split(/\r?\n/).filter((x) => mau.test(x));
  if (d.length === 0) throw new Error(`no line matches ${mau} — the Integration page is out of sync with the code`);
  return d.join("\n");
}

/** Dòng MÃ: bỏ dòng trống và dòng chỉ có chú thích. */
export function demDongMa(s: string): number {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .filter((x) => x.trim() !== "" && !x.trim().startsWith("//")).length;
}

export type KetQuaChayThu = {
  quyetDinh: QuyetDinhTichHop;
  captureLuc: string;
  lucGhi: KetQuaLucGhi;
  /** Engine đang chạy có cho kết quả khác lúc ghi không (mức, mã, coverage). `null` = không có kết quả. */
  soVoi: ReturnType<typeof soVoiLucGhi> | null;
  /** Lời gọi RPC fixture không có — khác rỗng thì kết quả không phải phát lại trọn vẹn. */
  thieu: string[];
};

/**
 * Chạy `kiemTruocKhiKy` (file ví dụ tích hợp) trên một kịch bản đã ghi. Giao dịch dựng lại bằng
 * đúng đường Phòng phân tích dùng (`kb.dungTx`), trên Connection phát lại của kịch bản đó.
 */
export async function chayThu(
  bo: BoReplayKichBan,
  id: string,
  /** Hàm kiểm — mặc định là hàm trong file ví dụ; test truyền CHÍNH đoạn hiển thị, nạp độc lập. */
  kiem: (p: Record<string, unknown>) => Promise<QuyetDinhTichHop> = kiemTruocKhiKy,
): Promise<KetQuaChayThu> {
  const { m, c, tx, vi, khai, thieu } = await dungDauVao(bo, id);
  const quyetDinh = await kiem({
    inspect,
    connection: c,
    tx,
    viNguoiDung: vi,
    ...(khai ? { dAppKhai: khai } : {}),
  });
  return {
    quyetDinh,
    captureLuc: m.captureLuc,
    lucGhi: m.ketQuaLucGhi,
    // So ĐỦ mức, mã lý do và coverage — không chỉ màu verdict (review GĐ2).
    soVoi: quyetDinh.ketQua ? soVoiLucGhi(quyetDinh.ketQua, m.ketQuaLucGhi) : null,
    thieu: thieu().map((t) => t.method),
  };
}

export type KetQuaChayThuEn = Omit<KetQuaChayThu, "quyetDinh"> & { quyetDinh: DecisionEn };

/** Như `chayThu`, cho bản tiếng Anh `inspectBeforeSigning` — cùng giao dịch, cùng dữ liệu phát lại. */
export async function chayThuEn(
  bo: BoReplayKichBan,
  id: string,
  kiem: (p: Record<string, unknown>) => Promise<DecisionEn> = inspectBeforeSigning,
): Promise<KetQuaChayThuEn> {
  const { m, c, tx, vi, khai, thieu } = await dungDauVao(bo, id);
  const quyetDinh = await kiem({
    inspect,
    connection: c,
    tx,
    userWallet: vi,
    ...(khai ? { dAppDeclared: khai } : {}),
  });
  return {
    quyetDinh,
    captureLuc: m.captureLuc,
    lucGhi: m.ketQuaLucGhi,
    soVoi: quyetDinh.result ? soVoiLucGhi(quyetDinh.result, m.ketQuaLucGhi) : null,
    thieu: thieu().map((t) => t.method),
  };
}

/** Giao dịch dựng lại bằng đúng đường Phòng phân tích dùng (`kb.dungTx`), trên Connection phát lại MỚI. */
async function dungDauVao(bo: BoReplayKichBan, id: string) {
  const m = bo.mau.find((x) => x.id === id);
  const kb = timKichBan(id);
  if (!m || !kb) throw new Error(`no recorded data yet for scenario "${id}"`);
  const { conn, thieu } = connReplay(m);
  const c = conn as Connection;
  const { blockhash } = await c.getLatestBlockhash();
  const { soDu } = await docNguonSong(c, bo.hienTruong);
  const tx = kb.dungTx(bo.hienTruong, { blockhash, soDuNguon: soDu });
  return { m, c, tx, vi: new PublicKey(bo.hienTruong.nanNhan), khai: kb.khai, thieu };
}

/**
 * Đoạn mã trang hiển thị — MỘT định nghĩa cho cả trang lẫn test. Bắt đầu từ hằng số quá hạn để
 * đoạn chép ra CHẠY ĐƯỢC ĐỘC LẬP (review GĐ2: bản đầu cắt từ `export async function` và
 * bỏ mất `HAN_MS`, `coHan` — chép về là `ReferenceError`).
 */
export const DAU_DOAN_TICH_HOP = "const HAN_MS";
export const doanTichHop = (raw: string) => catTu(raw, DAU_DOAN_TICH_HOP);

/*
 * BẢN TIẾNG ANH (review UX 11/2026). `tich-hop.js` vẫn là file được ĐẾM và công bố (31 dòng — sáu chỗ
 * công bố và `thu-tich-hop.mjs` đọc nó), nên không đổi nó. Bản tiếng Anh là ví dụ THÊM, cũng hiện nguyên văn:
 *   · `doanNhanh`    — riêng hàm `inspectBeforeSigning`, mở đầu trang;
 *   · `doanTiengAnh` — từ hằng số quá hạn tới hết file: chép riêng ra vẫn chạy (test nạp chính đoạn này).
 */
export const DAU_HAM_EN = "export async function inspectBeforeSigning";
export const DAU_DOAN_EN = "const TIMEOUT_MS";
export const doanNhanh = (raw: string) => catTu(raw, DAU_HAM_EN);
export const doanTiengAnh = (raw: string) => catTu(raw, DAU_DOAN_EN);

/**
 * Các dòng từ dòng chứa `dau` tới dòng ĐẦU TIÊN sau nó có nội dung (bỏ khoảng trắng) đúng bằng `cuoi` —
 * nguyên văn, kể cả thụt lề. Đọc theo dòng nên file CRLF hay LF đều cắt như nhau.
 */
export function catKhoang(raw: string, dau: string, cuoi: string): string {
  const d = raw.split(/\r?\n/);
  const i = d.findIndex((x) => x.includes(dau));
  const j = i < 0 ? -1 : d.findIndex((x, k) => k >= i && x.trim() === cuoi);
  if (i < 0 || j < 0) throw new Error(`"${dau}" … "${cuoi}" not found in the source file — the Integration page is out of sync with the code`);
  return d.slice(i, j + 1).join("\n");
}

/** Mở đầu trang: lời gọi `inspect` (~8 dòng mã) và cách đọc `level` — hai đoạn cắt nguyên văn từ bản tiếng Anh. */
export const loiGoiEn = (raw: string) => catKhoang(raw, "result = await withTimeout(", ");");
export const docMucEn = (raw: string) =>
  catKhoang(raw, "// result.level is", 'return { decision: "sign", reason: "no_issue", result, error: null };');

/*
 * BẢNG "level → ví nên làm gì". Chữ của bảng do người viết, nhưng mỗi hàng mang một kết quả mẫu và
 * test chạy CHÍNH `inspectBeforeSigning` trên nó: bảng nói khác hàm là đỏ.
 */
export type HangMuc = {
  dieuKien: string;
  nhan: string;
  decision: DecisionEn["decision"];
  reason: DecisionEn["reason"];
  viec: string;
  /** Kết quả `inspect()` mẫu cho hàng này; `null` = `inspect()` ném lỗi. */
  mau: Pick<InspectResult, "level" | "coverage" | "aiAdvisory"> | null;
};
const du = { analyzed: 3, total: 3, unverifiedPrograms: 0 };
export const BANG_MUC: HangMuc[] = [
  { dieuKien: '"danger"', nhan: "Danger", decision: "block", reason: "detected", viec: "Do not call the sign function. Show the consequences table.", mau: { level: "danger", coverage: du, aiAdvisory: null } },
  { dieuKien: '"warning"', nhan: "Review carefully", decision: "ask", reason: "detected", viec: "Show the warning and its reasons; sign only if the user confirms again.", mau: { level: "warning", coverage: du, aiAdvisory: null } },
  { dieuKien: '"safe", but coverage.analyzed < total', nhan: "Normal", decision: "ask", reason: "incomplete_coverage", viec: "Say which part could not be read; ask before signing.", mau: { level: "safe", coverage: { analyzed: 2, total: 3, unverifiedPrograms: 1 }, aiAdvisory: null } },
  { dieuKien: '"safe", aiAdvisory = "review_required"', nhan: "Normal", decision: "ask", reason: "review_requested", viec: "Pass on the request for a manual check; the level stays as it is.", mau: { level: "safe", coverage: du, aiAdvisory: "review_required" } },
  { dieuKien: '"safe", full coverage, no advisory', nhan: "Normal", decision: "sign", reason: "no_issue", viec: "Let the user sign. Show “Normal”, never “safe”: it is not a guarantee.", mau: { level: "safe", coverage: du, aiAdvisory: null } },
  { dieuKien: "inspect() throws or times out", nhan: "— (no result)", decision: "block", reason: "could_not_check", viec: "Do not sign: Custos could not check. Say it is a connection problem, not a finding.", mau: null },
];
