import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspect } from "@custos-solana/core";
import { dungMau } from "../src/mauInspector.ts";
import { docTx, kiemVi } from "../src/soiTx.ts";
import type { BoReplayKichBan } from "../src/replayKichBan.ts";

/*
 * P1-5 (đánh giá giám khảo 05/10): Inspector có giao dịch mẫu cho người không có base64 trong tay. Mẫu phải
 * đi qua đúng cổng đọc đầu vào của Inspector, và kiểm bằng phát lại phải ra cùng kết quả như lúc ghi.
 */

const bo = JSON.parse(readFileSync("apps/demo-wallet/public/replay/kich-ban.json", "utf8")) as BoReplayKichBan;

test("mẫu qua được cổng đọc đầu vào của Inspector, ví bảo vệ hợp lệ", async () => {
  const m = await dungMau(bo);
  const d = docTx(m.b64);
  assert.ok(d.ok, "Inspector không đọc được chuỗi mẫu");
  assert.equal(d.daKy, false, "mẫu phải là giao dịch CHƯA ký");
  assert.ok(kiemVi(m.viBaoVe, d.tx).ok);
});

test("kiểm mẫu bằng phát lại ⇒ Nguy hiểm, đúng mã đổi chủ, khớp mức lúc ghi", async () => {
  const m = await dungMau(bo);
  const d = docTx(m.b64);
  assert.ok(d.ok);
  const r = await inspect({ connection: await m.taoKetNoi() }, d.tx, m.tuyChon);
  assert.equal(r.level, "danger");
  assert.ok(r.reasonCodes.includes("SPL_SET_AUTHORITY__ACCOUNT_OWNER"));
  assert.equal(r.level, bo.mau.find((x) => x.id === "tan-cong-day-du")!.ketQuaLucGhi.level);
});

test("bấm Kiểm lần hai vẫn cho cùng kết quả (mỗi lượt một Connection phát lại mới)", async () => {
  const m = await dungMau(bo);
  const d = docTx(m.b64);
  assert.ok(d.ok);
  const a = await inspect({ connection: await m.taoKetNoi() }, d.tx, m.tuyChon);
  const b = await inspect({ connection: await m.taoKetNoi() }, d.tx, m.tuyChon);
  assert.deepEqual([a.level, a.reasonCodes], [b.level, b.reasonCodes]);
});

test("Inspector chỉ dùng phát lại khi ô base64 còn đúng chuỗi mẫu", () => {
  const s = readFileSync("apps/demo-wallet/src/Inspector.tsx", "utf8");
  assert.match(s, /const dangDungMau = mau !== null && tho\.trim\(\) === mau\.b64;/);
  assert.match(s, /phát lại/);
});
