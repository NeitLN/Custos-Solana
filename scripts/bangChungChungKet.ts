/**
 * BẰNG CHỨNG VÒNG CHUNG KẾT — CK-13. Ba loại, ba artifact, không gộp thành một con số:
 *
 *   phát lại      `apps/demo-wallet/public/replay/kich-ban.json` + phép đo `do-replay.json`
 *   thực thi live biên bản probe `docs/review/ck-20260927/live-ck05-*\/browser.json`
 *   AI thật       `data/eval/giu-lai-ket-qua.json` + `data/eval/ai-ket-qua.json` (`liveGanNhat`)
 *
 * Chỉ ĐỌC và ĐẾM — không có hằng số nào gõ tay. `tao-so-lieu.ts` gọi ba hàm này.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const docJson = <T>(p: string): T | null => {
  try {
    return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null;
  } catch {
    return null; // biên bản ghi dở (probe dừng giữa chừng) — bỏ qua, không đoán
  }
};

export function docPhatLai() {
  const bo = docJson<{
    nguonGhi: string[];
    engineLucGhi: { core: string };
    mau: Array<{ captureLuc: string }>;
  }>("apps/demo-wallet/public/replay/kich-ban.json");
  if (!bo) return null;
  const d = docJson<{ doLuc: string; tongHop: { n: number; trungViMs: number; minMs: number; maxMs: number }; gioiHan: string[] }>(
    "docs/review/ck-20260927/do-replay.json",
  );
  const luc = bo.mau.map((m) => m.captureLuc).sort();
  return {
    soKichBan: bo.mau.length,
    nguon: bo.nguonGhi,
    engineLucGhi: bo.engineLucGhi.core,
    ghiTu: luc[0] ?? null,
    ghiDen: luc.at(-1) ?? null,
    doTre: d && {
      doLuc: d.doLuc,
      soLuot: d.tongHop.n,
      trungViMs: d.tongHop.trungViMs,
      thapNhatMs: d.tongHop.minMs,
      caoNhatMs: d.tongHop.maxMs,
      gioiHan: d.gioiHan,
    },
  };
}

/** Mọi thư mục nghiệm thu theo ngày (`docs/review/ck-YYYYMMDD`) — lượt mới không cần sửa code. */
const THU_MUC_REVIEW = "docs/review";
const thuMucLive = () =>
  existsSync(THU_MUC_REVIEW)
    ? readdirSync(THU_MUC_REVIEW)
        .filter((d) => /^ck-\d{8}$/.test(d))
        .sort()
        .flatMap((ngay) =>
          readdirSync(`${THU_MUC_REVIEW}/${ngay}`)
            .filter((x) => x.startsWith("live-ck05"))
            .sort()
            .map((x) => `${THU_MUC_REVIEW}/${ngay}/${x}`),
        )
    : [];
const PROBE = "apps/demo-wallet/tools/probe-realistic-wallet.py";

export function docThucThiLive() {
  const dsLuot = thuMucLive();
  if (dsLuot.length === 0) return null;
  const caDat = new Set<string>();
  type MatXich = {
    kind: string;
    balance?: string;
    createdAt?: string;
    protected?: boolean;
    decision?: { action?: string; level?: string; reasonCodes?: string[] };
    resolution?: string;
  };
  const bienNhan = new Map<string, MatXich>();
  for (const d of dsLuot) {
    const r = docJson<{
      checks?: string[];
      receipts?: Array<MatXich & { signature: string; comparison?: { balance?: string } }>;
    }>(`${d}/browser.json`);
    for (const c of r?.checks ?? []) {
      const ma = /^([A-Z]+\d+):/.exec(c)?.[1];
      if (ma) caDat.add(ma);
    }
    // Một chữ ký = một giao dịch, dù nhiều lượt probe cùng ghi lại nó.
    for (const x of r?.receipts ?? []) {
      if (!bienNhan.has(x.signature))
        bienNhan.set(x.signature, {
          kind: x.kind,
          balance: x.comparison?.balance,
          createdAt: x.createdAt,
          protected: x.protected,
          decision: x.decision,
          resolution: x.resolution,
        });
    }
  }
  // Ca CHƯA ĐẠT = mã probe khai kiểm mà chưa lượt nào ghi đạt — không tự liệt kê tay.
  const khai = existsSync(PROBE)
    ? [...new Set([...readFileSync(PROBE, "utf8").matchAll(/check\('([A-Z]+\d+):/g)].map((m) => m[1]!))]
    : [];
  const thuTu = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true });
  const ngay = [...bienNhan.values()].map((x) => x.createdAt).filter((x): x is string => !!x).sort();
  return {
    cluster: "devnet",
    soBienNhan: bienNhan.size,
    soKhopSoDu: [...bienNhan.values()].filter((x) => x.balance === "match").length,
    // "unknown" KHÔNG phải khớp, cũng KHÔNG phải lệch — ví dụ tài khoản đã bị đóng thì không còn số dư để đọc lại.
    soChuaRoSoDu: [...bienNhan.values()].filter((x) => x.balance !== "match" && x.balance !== "mismatch").length,
    soLechSoDu: [...bienNhan.values()].filter((x) => x.balance === "mismatch").length,
    caDat: [...caDat].sort(thuTu),
    caChuaDat: khai.filter((c) => !caDat.has(c)).sort(thuTu),
    tu: ngay[0] ?? null,
    den: ngay.at(-1) ?? null,
    /*
     * CHUỖI BẰNG CHỨNG (CK-13): loại giao dịch → Custos bật/tắt → quyết định + mức L2 lúc
     * quyết định → chữ ký → xác nhận → đối chiếu số dư. Huỷ không có chữ ký nên không có mắt
     * xích — đúng: không có giao dịch nào để truy.
     */
    chuoi: [...bienNhan.entries()]
      .map(([chuKy, x]) => ({
        chuKy,
        loai: x.kind,
        baoVe: x.protected === true,
        quyetDinh: x.decision?.action ?? "?",
        mucL2: x.decision?.level ?? "?",
        maLyDo: x.decision?.reasonCodes ?? [],
        xacNhan: x.resolution ?? null,
        soDu: x.balance ?? "unknown",
        luc: x.createdAt ?? null,
      }))
      .sort((a, b) => (a.luc ?? "").localeCompare(b.luc ?? "")),
  };
}

/**
 * Số MẪU có vi phạm — không phải số vi phạm. `eval-ai.ts` ghi MỘT bản ghi cho MỖI vi phạm, nên
 * một mẫu vừa bịa địa chỉ vừa bịa hai số là ba bản ghi (Codex review lần 3). Trang nói "mẫu".
 */
export function demMauViPham(viPham: ReadonlyArray<{ id?: unknown }>): number {
  return new Set(viPham.map((v) => String(v.id))).size;
}

export function docAiThat() {
  type TomTat = { soCa: number; soHo: number; daRaViPham: number; luiVeCauMau: number };
  const g = docJson<{
    liveGanNhat?: { doLuc: string; moHinh: string; guardHash: string; token?: { vao: number; ra: number }; moHinhThat: { tomTat: TomTat } } | null;
  }>("data/eval/giu-lai-ket-qua.json");
  const a = docJson<{
    liveGanNhat?: {
      xong?: string;
      soMau: number;
      viPham: Array<{ id?: unknown }>;
      tyLeDungDauRaMoHinh: number;
      treTrungViMs: number;
      tokenVao: number;
      tokenRa: number;
    } | null;
  }>("data/eval/ai-ket-qua.json");
  const l = g?.liveGanNhat;
  const p = a?.liveGanNhat;
  if (!l || !p) return null;
  const guardNay = createHash("sha256").update(readFileSync("packages/ai/src/moHinh.ts", "utf8")).digest("hex").slice(0, 16);
  return {
    moHinh: l.moHinh,
    doLuc: l.doLuc,
    giuLai: (({ soCa, soHo, daRaViPham, luiVeCauMau }) => ({ soCa, soHo, daRaViPham, luiVeCauMau }))(l.moHinhThat.tomTat),
    phatTrien: {
      soMau: p.soMau,
      soMauViPham: demMauViPham(p.viPham),
      tyLeDungCauMoHinh: p.tyLeDungDauRaMoHinh,
      treTrungViMs: p.treTrungViMs,
      doLuc: p.xong ?? null,
    },
    tokenVao: (l.token?.vao ?? 0) + p.tokenVao,
    tokenRa: (l.token?.ra ?? 0) + p.tokenRa,
    // Số trên là của bộ chắn LÚC ĐO. Đã sửa bộ chắn sau đó thì trang phải nói ra.
    boChanDaDoi: l.guardHash !== guardNay,
  };
}
