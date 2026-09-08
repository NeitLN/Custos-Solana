import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/*
 * MỘT CHỖ ĐỌC BẰNG CHỨNG TÍCH HỢP — VÀ MỘT ĐỊNH NGHĨA VỀ "HIỆN TẠI".
 *
 * Trước đây năm nơi tự `JSON.parse` file này rồi mỗi nơi hiểu `dat` một kiểu. Khi
 * harness đánh rơi lượt fail, cả năm nơi cùng đọc một lượt pass CŨ và cùng nói
 * "8/8 pass" — không nơi nào sai riêng, tất cả cùng sai một kiểu.
 *
 * Nên tách dứt khoát hai câu hỏi khác nhau:
 *
 *   lanGanNhat     — "lượt chạy vừa rồi ra sao?"  Cổng nộp bài hỏi câu này.
 *   lanPassGanNhat — "số benchmark lấy ở đâu?"    Tài liệu hỏi câu này, và phải
 *                    kèm ngày, vì nó có thể không phải lượt vừa chạy.
 *
 * Trộn hai câu là cách một bản đỏ trông xanh.
 */

export type LuotTichHop = {
  dat: boolean;
  sourceCommit?: string | null;
  dirtyWorktree?: boolean;
  /** Dấu vết nội dung mã lúc đo — xem `toTien.ts`. Vắng ở bằng chứng cũ. */
  dauVet?: { bam: string; soFile: number } | null;
  startedAt?: string;
  finishedAt?: string;
  doLuc?: string;
  exitCode?: number | null;
  failureCategory?: string | null;
  loi?: string | null;
  kiem?: Array<{ ten: string; dat: boolean; chiTiet: string }>;
  msDenKetQuaDauTien?: number;
  msMotLuotKiem?: number;
  dongMaTichHop?: number;
};

export type LuotPassGon = {
  finishedAt?: string;
  sourceCommit?: string | null;
  msDenKetQuaDauTien?: number;
  msMotLuotKiem?: number;
};

export type BangChungTichHop = {
  schemaVersion: number;
  doiTac: unknown;
  lanGanNhat: LuotTichHop | null;
  lanPassGanNhat: LuotTichHop | null;
  /** Tối đa 10 lượt PASS gần nhất, cũ trước. Số công bố là TRUNG VỊ của chúng. */
  lichSuPass: LuotPassGon[];
};

/** Trung vị. Mảng rỗng trả `null` — không có số thì nói là không có. */
export function trungVi(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const g = Math.floor(v.length / 2);
  return v.length % 2 ? v[g]! : Math.round((v[g - 1]! + v[g]!) / 2);
}

export const DUONG_TICH_HOP = "data/tich-hop/ket-qua.json";

export function docBangChungTichHop(goc = "."): BangChungTichHop | null {
  const d = join(goc, DUONG_TICH_HOP);
  if (!existsSync(d)) return null;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(d, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }

  const ver = typeof raw["schemaVersion"] === "number" ? (raw["schemaVersion"] as number) : 1;

  // Schema v1: cả file LÀ một lượt chạy. Không có chỗ nào ghi lượt fail, nên đọc
  // được v1 không có nghĩa là tin được nó — `schemaVersion` trả về để cổng strict
  // từ chối, chứ không im lặng coi như tương đương v2.
  if (ver < 2) {
    const luot = raw as unknown as LuotTichHop;
    return {
      schemaVersion: 1,
      doiTac: raw["doiTac"] ?? null,
      lanGanNhat: luot,
      lanPassGanNhat: luot.dat === true ? luot : null,
      lichSuPass: [],
    };
  }

  return {
    schemaVersion: ver,
    doiTac: raw["doiTac"] ?? null,
    lanGanNhat: (raw["lastAttempt"] as LuotTichHop | undefined) ?? null,
    lanPassGanNhat: (raw["lastSuccessful"] as LuotTichHop | undefined) ?? null,
    lichSuPass: Array.isArray(raw["lichSuPass"]) ? (raw["lichSuPass"] as LuotPassGon[]) : [],
  };
}

/** Thời điểm của một lượt, dù nó là schema nào. */
export function thoiDiem(l: LuotTichHop | null): string | null {
  return l?.finishedAt ?? l?.doLuc ?? null;
}
