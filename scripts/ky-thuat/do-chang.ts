/**
 * CK-14 — THỜI GIAN THEO CHẶNG của một lượt kiểm, tách live / phát lại, lạnh / ấm, AI bật / tắt.
 *
 *   node --env-file=.env.local --experimental-strip-types scripts/ky-thuat/do-chang.ts [--live] [--ai] [--n=10]
 *
 * Tái hiện ĐÚNG trình tự `inspect()` (`packages/core/src/inspect.ts`): extractFacts → danhGia →
 * dungBangChenhLech → interpreter. Tách thành chặng để biết thời gian đi đâu; mỗi kịch bản
 * còn gọi `inspect()` thật một lần và đòi CÙNG mức — tái hiện lệch thì dừng, không ghi số.
 *
 *   · dựng tx     `getLatestBlockhash` + số dư sống + `kb.dungTx`
 *   · đọc RPC     mọi lời gọi RPC trong extractFacts TRỪ mô phỏng, theo method
 *   · mô phỏng    `simulateTransaction`
 *   · L2          danhGia + bảng chênh lệch
 *   · L3          câu mẫu tất định; `--ai`: mô hình thật qua `ANTHROPIC_API_KEY` (tốn token)
 *
 * `--live`: RPC Devnet riêng từ `VITE_RPC` (chỉ đọc + mô phỏng; kiểm genesis trước; KHÔNG in
 * URL). Mặc định: phát lại bộ fixture, không chạm mạng. Không đo render — việc đó ở trình
 * duyệt (`docs/review/ck-20260927/do-replay.json`).
 * n < 30 mỗi nhóm ⇒ KHÔNG báo p95, chỉ trung vị và khoảng (roadmap CK-14).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { Connection } from "@solana/web3.js";
import { inspect } from "../../packages/core/src/inspect.ts";
import { extractFacts } from "../../packages/core/src/l1/fetch.ts";
import { danhGia } from "../../packages/core/src/l2/evaluate.ts";
import { dungBangChenhLech } from "../../packages/core/src/diff.ts";
import { dienGiaiKhongAI } from "../../packages/ai/src/index.ts";
import { theoDoiDienGiai, type ExplanationSource } from "../../apps/demo-wallet/src/live/interpreter.ts";
import { tomTatNguonL3 } from "./doChangTomTat.ts";
import { KICH_BAN, timKichBan } from "../../apps/demo-wallet/src/kichBan.ts";
import { connReplay, tuyChonInspectKichBan, type BoReplayKichBan } from "../../apps/demo-wallet/src/replayKichBan.ts";
import { docNguonSong } from "../hienTruongSong.ts";
import { ketNoiDuPhong, chiDevnetDaXacMinh } from "../rpcDuPhong.ts";

const LIVE = process.argv.includes("--live");
const AI = process.argv.includes("--ai");
const N = Number(process.argv.find((a) => a.startsWith("--n="))?.slice(4) ?? (LIVE ? 3 : 10));
const BO = JSON.parse(readFileSync("apps/demo-wallet/public/replay/kich-ban.json", "utf8")) as BoReplayKichBan;
const ht = BO.hienTruong;

/** Bọc connection: đo từng lời gọi RPC theo method. Không đổi kết quả. */
function doRpc(c: object, so: Array<{ method: string; ms: number }>): Connection {
  return new Proxy(c, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r);
      if (typeof v !== "function") return v;
      return (...a: unknown[]) => {
        const t0 = performance.now();
        const p = v.apply(t, a);
        if (!(p instanceof Promise)) return p;
        return p.finally(() => so.push({ method: String(k), ms: performance.now() - t0 }));
      };
    },
  }) as Connection;
}

let connLive: Connection | null = null;
if (LIVE) {
  const url = process.env["VITE_RPC"];
  if (!url) throw new Error("--live cần VITE_RPC trong .env.local");
  const xm = await chiDevnetDaXacMinh([url], { soLan: 2, msGianCach: 1000 });
  if (xm.dung.length !== 1) throw new Error("RPC riêng không xác minh được là Devnet — dừng");
  connLive = ketNoiDuPhong(xm.dung);
}
let goiAi: ((l: { system: string; user: string }) => Promise<string>) | null = null;
if (AI) {
  const khoa = process.env["ANTHROPIC_API_KEY"];
  if (!khoa) throw new Error("--ai cần ANTHROPIC_API_KEY");
  const { dungGoiAnthropic } = await import("../../packages/ai/src/anthropic.ts");
  goiAi = dungGoiAnthropic({ apiKey: khoa });
}

type Luot = { id: string; lan: number; dungTx: number; docRpc: number; moPhong: number; l2: number; l3: number; tong: number; rpc: Record<string, number>; nguonL3: ExplanationSource };
const luot: Luot[] = [];
const kichBan = KICH_BAN.filter((k) => k.hoTro === "devnet");
for (const kb of kichBan) {
  const m = BO.mau.find((x) => x.id === kb.id);
  if (!LIVE && !m) continue;
  for (let lan = 0; lan < N; lan++) {
    const so: Array<{ method: string; ms: number }> = [];
    const goc = LIVE ? connLive! : (connReplay(m!).conn as object);
    const c = doRpc(goc, so);
    const t0 = performance.now();
    const { blockhash } = await c.getLatestBlockhash();
    const { soDu } = await docNguonSong(c, ht);
    const tx = kb.dungTx(ht, { blockhash, soDuNguon: soDu });
    const tDung = performance.now();
    const moc = so.length;
    const tc = tuyChonInspectKichBan(kb, ht);
    const facts = await extractFacts(c, tx, tc.nguoiDung);
    const tL1 = performance.now();
    const l2 = danhGia(facts);
    dungBangChenhLech(facts, l2.hits, tc.kyHieuToken);
    const tL2 = performance.now();
    // Nguồn THẬT của câu lượt này (Codex review lần 4): lỗi/quá hạn lùi về câu mẫu và phải hiện ra.
    // Hạn 8 s — cùng hạn sản phẩm dùng (`WalletExecution`, `App.tsx`).
    const theoDoi = theoDoiDienGiai(goiAi, 8000);
    await theoDoi.interpreter(facts, l2.reasonCodes, "vi", tc);
    const tL3 = performance.now();
    const trongL1 = so.slice(moc);
    const moPhong = trongL1.filter((x) => x.method === "simulateTransaction").reduce((s, x) => s + x.ms, 0);
    const rpc: Record<string, number> = {};
    for (const x of trongL1) rpc[x.method] = (rpc[x.method] ?? 0) + x.ms;
    luot.push({
      id: kb.id,
      lan,
      dungTx: tDung - t0,
      // Lời gọi RPC chạy SONG SONG trong L1: phần "đọc" = thời gian L1 trừ mô phỏng, không phải tổng các lời gọi.
      docRpc: Math.max(0, tL1 - tDung - moPhong),
      moPhong,
      l2: tL2 - tL1,
      l3: tL3 - tL2,
      tong: tL3 - t0,
      rpc,
      nguonL3: theoDoi.nguon() ?? "tatDinh",
    });
    // Tái hiện phải cùng mức với inspect() thật — kiểm một lần mỗi kịch bản.
    if (lan === 0) {
      const g2 = LIVE ? connLive! : (connReplay(m!).conn as Connection);
      const bh2 = await g2.getLatestBlockhash();
      const sd2 = await docNguonSong(g2, ht);
      const r = await inspect({ connection: g2, interpret: dienGiaiKhongAI }, kb.dungTx(ht, { blockhash: bh2.blockhash, soDuNguon: sd2.soDu }), tc);
      if (r.level !== l2.level) throw new Error(`${kb.id}: tái hiện ra ${l2.level}, inspect() ra ${r.level} — dừng`);
    }
  }
}

const tv = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? Math.round(((s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2) * 10) / 10 : null;
};
const tomTat = (ds: Luot[]) =>
  Object.fromEntries(
    (["dungTx", "docRpc", "moPhong", "l2", "l3", "tong"] as const).map((k) => {
      const xs = ds.map((x) => x[k]);
      return [k, { trungVi: tv(xs), thapNhat: Math.round(Math.min(...xs) * 10) / 10, caoNhat: Math.round(Math.max(...xs) * 10) / 10 }];
    }),
  );
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const ban = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim() !== "";
const bao = {
  phepDo: "CK-14 · thời gian theo chặng của một lượt kiểm (node, không gồm render)",
  doLuc: new Date().toISOString(),
  sourceCommit: commit,
  dirtyWorktree: ban,
  lenh: `node --env-file=.env.local --experimental-strip-types scripts/ky-thuat/do-chang.ts${LIVE ? " --live" : ""}${AI ? " --ai" : ""} --n=${N}`,
  nguon: LIVE ? `live Devnet qua RPC riêng (host ${new URL(process.env["VITE_RPC"]!).host})` : "phát lại fixture (không mạng)",
  l3: tomTatNguonL3(AI, luot).nhan,
  nguonL3: tomTatNguonL3(AI, luot).demTheoNguon,
  // Thời gian L3 CHỈ của lượt mô hình thật trả lời — lỗi/quá hạn không phải thời gian của mô hình.
  l3MoHinhTraLoiMs: AI ? tomTatNguonL3(AI, luot).l3MoHinhTraLoi.map((x) => Math.round(x)) : null,
  soKichBan: new Set(luot.map((x) => x.id)).size,
  soLuot: luot.length,
  lanh: tomTat(luot.filter((x) => x.lan === 0)),
  am: N > 1 ? tomTat(luot.filter((x) => x.lan > 0)) : null,
  gioiHan: [
    `n=${luot.length} (<30 mỗi nhóm) nên KHÔNG báo p95 — chỉ trung vị và khoảng.`,
    "Đo trong Node trên máy đội, không phải trình duyệt hay máy trình diễn; không gồm render.",
    "'đọc RPC' = thời gian L1 trừ mô phỏng: L1 gọi RPC song song, cộng từng lời gọi sẽ lớn hơn thời gian thật.",
    LIVE ? "Live đi qua RPC riêng gói miễn phí — endpoint công cộng chậm và treo theo đợt, số này KHÔNG đại diện cho nó." : "Phát lại không có độ trễ mạng — số này là trần dưới của một lượt kiểm.",
  ],
  tungLuot: luot.map((x) => ({ ...x, dungTx: +x.dungTx.toFixed(1), docRpc: +x.docRpc.toFixed(1), moPhong: +x.moPhong.toFixed(1), l2: +x.l2.toFixed(2), l3: +x.l3.toFixed(1), tong: +x.tong.toFixed(1) })),
};
mkdirSync("docs/review/ck-20260928", { recursive: true });
const ra = `docs/review/ck-20260928/do-chang-${LIVE ? "live" : "phat-lai"}${AI ? "-ai" : ""}.json`;
writeFileSync(ra, JSON.stringify(bao, null, 1) + "\n");
const hang = (t: ReturnType<typeof tomTat>) =>
  (["dungTx", "docRpc", "moPhong", "l2", "l3", "tong"] as const).map((k) => `${k} ${t[k]!.trungVi}ms`).join(" · ");
console.log(`${bao.nguon} · L3 ${bao.l3} · ${bao.soLuot} lượt`);
console.log(`  lạnh (lượt đầu mỗi kịch bản): ${hang(bao.lanh)}`);
if (bao.am) console.log(`  ấm  (các lượt sau):            ${hang(bao.am)}`);
console.log(`→ ${ra}`);
