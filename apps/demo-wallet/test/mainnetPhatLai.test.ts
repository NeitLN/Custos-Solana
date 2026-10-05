import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import {
  connMainnet,
  tomTatBo,
  TUY_CHON_MAINNET,
  txCuaMau,
  xacThucBoMainnet,
  type BoReplayMainnet,
} from "../src/replayMainnet.ts";
import { soVoiLucGhi } from "../src/replayKichBan.ts";
import { coMainnetRuntime } from "../../../scripts/kiem-runtime-mainnet.ts";

/*
 * R0-3, ROADMAP-GIONG-THAT — "giao dịch mainnet thật, phát lại". Ba lời hứa của mục này phải
 * ĐO được, không đọc được: engine chạy thật trên dữ liệu đã ghi (không mạng), mẫu được chọn
 * theo luật chứ không theo kết quả, và ví không mở kết nối mainnet nào.
 */

const bo = JSON.parse(readFileSync("apps/demo-wallet/public/replay/mainnet.json", "utf8")) as BoReplayMainnet;

test("bộ mainnet hợp lệ: đúng genesis, một nguồn host trần, có luật chọn mẫu", () => {
  assert.equal(xacThucBoMainnet(bo), null);
  assert.equal(bo.mau.length, 10);
  assert.match(bo.cachChon.quyTac, /không lọc theo kết quả/);
  // Mẫu bị bỏ phải mang lý do — "bỏ qua 2" không kèm lý do là che mất chỗ nào hỏng.
  for (const b of bo.boQua) assert.ok(b.lyDo.length > 10, `${b.chuKy}: thiếu lý do bỏ`);
});

test("xác thực từ chối bộ lạ: sai genesis, nguồn là URL đầy đủ", () => {
  assert.match(xacThucBoMainnet({ ...bo, genesis: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG" }) ?? "", /không phải của mainnet/);
  assert.match(xacThucBoMainnet({ ...bo, nguonGhi: ["https://rpc.example.com/?api-key=x"] }) ?? "", /host trần/);
  // Genesis đúng mà nhãn cluster sai ⇒ link Explorer trên thẻ cảnh báo trỏ nhầm mạng (Codex review 06/10).
  assert.match(xacThucBoMainnet({ ...bo, cluster: "devnet" }) ?? "", /nhãn cluster/);
});

test("cả 10 mẫu: engine đang chạy tái lập đúng kết quả lúc ghi, KHÔNG thiếu fixture", async () => {
  for (const m of bo.mau) {
    const { conn, thieu } = connMainnet(m);
    const r = await inspect({ connection: conn, interpret: dienGiaiKhongAI }, txCuaMau(m), TUY_CHON_MAINNET);
    // `extractFacts` nuốt ThieuFixture thành "mô phỏng hỏng" — phải đọc hộp này SAU khi chạy.
    assert.deepEqual(thieu().map((t) => t.method), [], `${m.id}: phát lại thiếu lời gọi`);
    assert.deepEqual(soVoiLucGhi(r, m.ketQuaLucGhi), { khop: true }, `${m.id}: engine lệch kết quả lúc ghi`);
  }
});

test("mô phỏng hỏng ⇒ KHÔNG BAO GIỜ An toàn (fail-safe trên dữ liệu thật)", () => {
  const hong = bo.mau.filter((m) => m.ketQuaLucGhi.reasonCodes.includes("MO_PHONG_HONG"));
  assert.ok(hong.length > 0, "bộ hiện tại có mẫu mô phỏng hỏng — phép kiểm phải chạy trên ít nhất một");
  for (const m of hong) assert.notEqual(m.ketQuaLucGhi.level, "safe", m.id);
});

test("tóm tắt đếm đủ mọi mẫu — không thẻ nào bị giấu khỏi số đếm", () => {
  const t = tomTatBo(bo);
  assert.equal(t.safe + t.warning + t.danger, bo.mau.length);
});

test("ví không mở kết nối mainnet: mã phát lại không có endpoint mainnet", () => {
  for (const f of ["apps/demo-wallet/src/replayMainnet.ts", "apps/demo-wallet/src/Inspector.tsx"]) {
    const s = readFileSync(f, "utf8");
    // `coMainnetRuntime` dùng bộ tách kiểu TS của Node — không đọc được JSX, nên .tsx kiểm bằng chuỗi.
    if (f.endsWith(".ts")) assert.equal(coMainnetRuntime(s), false, `${f}: có chuỗi endpoint mainnet trong runtime`);
    else assert.doesNotMatch(s, /["'`]mainnet-beta["'`]/, f);
    assert.doesNotMatch(s, /mainnet[\w.-]*\.solana\.com|helius-rpc/, f);
  }
  assert.doesNotMatch(readFileSync("apps/demo-wallet/src/replayMainnet.ts", "utf8"), /new Connection\(/);
});
