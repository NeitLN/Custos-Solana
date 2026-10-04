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

export type QuyetDinhTichHop = {
  cho: "ky" | "hoi" | "chan";
  lyDo: "khong_van_de" | "coverage_khuyet" | "de_nghi_kiem_tra" | "phat_hien" | "khong_kiem_duoc";
  ketQua: InspectResult | null;
  loi: string | null;
};
const kiemTruocKhiKy = kiemJs as (p: Record<string, unknown>) => Promise<QuyetDinhTichHop>;

/** Từ dòng bắt đầu bằng `dau` tới hết file — nguyên văn, chỉ bỏ khoảng trắng cuối. */
export function catTu(raw: string, dau: string): string {
  const i = raw.indexOf(dau);
  if (i < 0) throw new Error(`không thấy "${dau}" trong file nguồn — trang Tích hợp lệch với mã`);
  return raw.slice(i).trimEnd();
}

/** Các dòng khớp mẫu, nguyên văn, theo thứ tự trong file. */
export function catDong(raw: string, mau: RegExp): string {
  const d = raw.split(/\r?\n/).filter((x) => mau.test(x));
  if (d.length === 0) throw new Error(`không thấy dòng khớp ${mau} — trang Tích hợp lệch với mã`);
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
  const m = bo.mau.find((x) => x.id === id);
  const kb = timKichBan(id);
  if (!m || !kb) throw new Error(`chưa có dữ liệu đã ghi cho kịch bản "${id}"`);
  const { conn, thieu } = connReplay(m);
  const c = conn as Connection;
  const { blockhash } = await c.getLatestBlockhash();
  const { soDu } = await docNguonSong(c, bo.hienTruong);
  const tx = kb.dungTx(bo.hienTruong, { blockhash, soDuNguon: soDu });
  const quyetDinh = await kiem({
    inspect,
    connection: c,
    tx,
    viNguoiDung: new PublicKey(bo.hienTruong.nanNhan),
    ...(kb.khai ? { dAppKhai: kb.khai } : {}),
  });
  return {
    quyetDinh,
    captureLuc: m.captureLuc,
    lucGhi: m.ketQuaLucGhi,
    // So ĐỦ mức, mã lý do và coverage — không chỉ màu verdict (Codex review GĐ2).
    soVoi: quyetDinh.ketQua ? soVoiLucGhi(quyetDinh.ketQua, m.ketQuaLucGhi) : null,
    thieu: thieu().map((t) => t.method),
  };
}

/**
 * Đoạn mã trang hiển thị — MỘT định nghĩa cho cả trang lẫn test. Bắt đầu từ hằng số quá hạn để
 * đoạn chép ra CHẠY ĐƯỢC ĐỘC LẬP (Codex review GĐ2: bản đầu cắt từ `export async function` và
 * bỏ mất `HAN_MS`, `coHan` — chép về là `ReferenceError`).
 */
export const DAU_DOAN_TICH_HOP = "const HAN_MS";
export const doanTichHop = (raw: string) => catTu(raw, DAU_DOAN_TICH_HOP);
