/** Read-only capture for pitch assets. Never signs or broadcasts a transaction. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Connection } from "@solana/web3.js";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, dienGiaiBangMoHinh, boiThoiHan } from "@custos-solana/ai";
import { dungGoiAnthropic, MODEL_MAC_DINH } from "@custos-solana/ai/anthropic";
import { KICH_BAN } from "../apps/demo-wallet/src/kichBan.ts";
import { docNguonSong } from "./hienTruongSong.ts";

const out = "docs/pitch-technical/evidence";
mkdirSync(out, { recursive: true });
const ht = JSON.parse(readFileSync("apps/demo-wallet/public/hien-truong.json", "utf8"));
// Public Devnet only; never use a secret endpoint or another cluster.
const c = new Connection("https://api.devnet.solana.com", {
  commitment: "confirmed",
  fetch: async (url, init) => {
    const method = JSON.parse(String(init?.body ?? "{}")).method;
    if (typeof method !== "string" || (!method.startsWith("get") && method !== "simulateTransaction")) throw new Error("Only reads/simulation allowed");
    return fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  },
});
const report: any = { capturedAt: new Date().toISOString(), source: "devnet-simulation", broadcast: false, model: MODEL_MAC_DINH, cases: [] };
const save = () => writeFileSync(`${out}/capture.json`, JSON.stringify(report, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
const deadline = setTimeout(() => { report.incomplete = true; save(); process.exit(1); }, 120000);
try {
  for (const kb of KICH_BAN) {
    const start = Date.now();
    const row: any = { id: kb.id, title: kb.tieuDe, capturedAt: new Date().toISOString(), ai: { called: false } };
    try {
      const { blockhash } = await c.getLatestBlockhash();
      const { soDu: soDuNguon } = await docNguonSong(c, ht);
      const tx = kb.dungTx(ht, { blockhash, soDuNguon });
      let interpret = dienGiaiKhongAI;
      // One bounded model request, for the key ownership-change scene only.
      if (kb.id === "doi-chu-tai-khoan" && process.env.ANTHROPIC_API_KEY) {
        const call = dungGoiAnthropic({ maxRetries: 0, maxTokens: 400, ghiNhanDung: u => { row.ai.usage = u; } });
        interpret = async (...args) => {
          const baseline = await dienGiaiKhongAI(...args);
          let raw = "";
          const model = dienGiaiBangMoHinh(async input => {
            row.ai.called = true;
            const t = Date.now();
            raw = await call(input);
            row.ai.latencyMs = Date.now() - t;
            row.ai.responseReceived = true;
            return raw;
          });
          const result = await boiThoiHan(model, 12000)(...args);
          row.ai.displayedDifferentFromTemplate = result.explanation !== baseline.explanation;
          row.ai.explanation = result.explanation;
          return result;
        };
      }
      row.result = await inspect({ connection: c, interpret }, tx, {
        ...(kb.khongKhaiNguoiDung ? {} : { nguoiDung: ht.nanNhan }),
        chanDoan: true, locale: "vi",
      });
      row.ms = Date.now() - start;
      console.log(kb.id, row.result.level, row.result.reasonCodes.join(","), row.ms);
    } catch (e) { row.error = e instanceof Error ? e.name : "Error"; console.log(kb.id, row.error); }
    report.cases.push(row); save();
  }
} finally { clearTimeout(deadline); report.finishedAt = new Date().toISOString(); save(); }
