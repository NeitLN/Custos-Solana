/**
 * CAPTURE RPC — ghi lại response thật để replay offline. Thẻ TB-B02.
 *
 *   CUSTOS_CAPTURE=1 node --experimental-strip-types scripts/ky-thuat/capture-rpc.ts R01-pos
 *   CUSTOS_CAPTURE=1 npm run capture-rpc -- --tat-ca-devnet
 *
 * **SCRIPT NÀY CHẠM MẠNG.** Nó là nửa duy nhất của TB-B02 làm điều đó, và nó tách
 * hẳn khỏi `chay-replay.ts` — thẻ yêu cầu đúng như vậy.
 *
 * Vì sao tách, nói cụ thể: một runner vừa capture vừa replay sẽ **âm thầm rơi về
 * mạng** khi thiếu fixture. Lúc đó câu *"chạy offline vẫn tái lập được kết quả"* trở
 * thành câu không ai kiểm được — nó xanh vì có mạng, không phải vì fixture đủ.
 *
 * Cổng `CUSTOS_CAPTURE=1` là cố ý: gọi nhầm script này trong một vòng CI sẽ bắn hàng
 * trăm request RPC và ghi đè fixture bằng trạng thái chuỗi của hôm nay. Bắt khai báo
 * ý định trước, giống `CUSTOS_OFFLINE_MAINNET_RESEARCH` đã dùng cho cohort.
 *
 * KHÔNG ghi secret: endpoint lưu vào fixture chỉ giữ **host**, bỏ path và query —
 * credential của RPC thương mại nằm ở hai chỗ đó.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { extractFacts } from "../../packages/core/src/l1/fetch.ts";
import { connGhi, locNguon, type BanGhi, type Fixture } from "./replay-rpc.ts";

const SEED = "data/seed";
const RA = "data/benchmark/rpc";
const RPC = process.env["VITE_RPC"] ?? "https://api.devnet.solana.com";

if (process.env["CUSTOS_CAPTURE"] !== "1") {
  console.error("Script này CHẠM MẠNG. Đặt CUSTOS_CAPTURE=1 để xác nhận ý định.");
  process.exit(2);
}

// Bộ ghi dùng chung `connGhi` (scripts/replayFixture.ts) — cùng khoá với replay.

const mf = JSON.parse(readFileSync("data/benchmark/manifest.json", "utf8")) as {
  mau: Array<{ id: string; tang: string[]; nguonGoc: string; tep: { giaoDich?: { duong: string } } }>;
};

const dauVao = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const tatCa = process.argv.includes("--tat-ca-devnet");

const canChay = tatCa
  ? mf.mau.filter((m) => m.tang.includes("devnet-live"))
  : mf.mau.filter((m) => dauVao.includes(m.id));

if (canChay.length === 0) {
  console.error(
    dauVao.length === 0
      ? "Cần một hoặc nhiều id mẫu, hoặc --tat-ca-devnet."
      : `Không mẫu nào khớp: ${dauVao.join(", ")}`,
  );
  process.exit(2);
}

mkdirSync(RA, { recursive: true });
const conn = new Connection(RPC, "confirmed");
let ok = 0;
const hong: Array<{ id: string; loi: string }> = [];

/*
 * Cluster của endpoint, suy từ host. Dùng để CHẶN một lỗi đã mắc thật.
 *
 * Lần chạy đầu tôi capture `MN-01` — một giao dịch **mainnet** — bằng RPC **devnet**.
 * Nó "thành công": 3 bản ghi, không lỗi. Nhưng cả hai lượt `getAddressLookupTable`
 * trả `value: null`, vì ALT đó không tồn tại trên devnet.
 *
 * Fixture sinh ra khi đó ghi lại một sự thật của devnet và dán nhãn mẫu mainnet.
 * Replay từ nó sẽ tái lập được — tái lập đúng một kết quả sai. Đó là loại hỏng tệ
 * nhất của benchmark: nó xanh, ổn định, và nói dối.
 */
const clusterCuaEndpoint = /devnet/i.test(RPC)
  ? "devnet"
  : /testnet/i.test(RPC)
    ? "testnet"
    : "mainnet-beta";

for (const m of canChay) {
  if (!m.tep.giaoDich) {
    hong.push({ id: m.id, loi: "không có file giao dịch — mẫu này không replay được" });
    continue;
  }
  if (m.nguonGoc === "real-mainnet" && clusterCuaEndpoint !== "mainnet-beta") {
    hong.push({
      id: m.id,
      loi: `mẫu mainnet nhưng endpoint là ${clusterCuaEndpoint} — ALT và account không tồn tại ở đó, fixture sẽ ghi một sự thật KHÁC`,
    });
    console.log(`  ✗ ${m.id.padEnd(10)} ${hong[hong.length - 1]!.loi}`);
    continue;
  }
  try {
    const raw = readFileSync(join(SEED, m.tep.giaoDich.duong), "utf8").trim();
    const tx = VersionedTransaction.deserialize(Buffer.from(raw, "base64"));
    const banGhi: BanGhi[] = [];
    await extractFacts(connGhi(conn, banGhi) as never, tx);

    const fx: Fixture = {
      phienBan: 1,
      id: m.id,
      captureLuc: new Date().toISOString(),
      nguon: locNguon(RPC),
      banGhi,
    };
    writeFileSync(join(RA, `${m.id}.json`), JSON.stringify(fx, null, 2) + "\n");
    ok++;
    console.log(`  ✓ ${m.id.padEnd(10)} ${banGhi.length} bản ghi`);
  } catch (e) {
    hong.push({ id: m.id, loi: e instanceof Error ? e.message.slice(0, 90) : String(e) });
    console.log(`  ✗ ${m.id.padEnd(10)} ${hong[hong.length - 1]!.loi}`);
  }
}

console.log(`\ncapture: ${ok} mẫu · ${hong.length} hỏng · endpoint ${locNguon(RPC)}`);
if (hong.length > 0) {
  console.log("HỎNG — ghi ra chứ không im lặng:");
  for (const h of hong) console.log(`  ${h.id}: ${h.loi}`);
}
console.log(`→ ${RA}/`);
if (!existsSync(RA)) process.exit(1);
