import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import type { Connection } from "@solana/web3.js";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import { MA_THONG_TIN } from "../../../packages/core/src/constants.ts";
import { giaiDongBangFacts } from "../../../packages/core/src/facts-io.ts";
import { danhGia } from "../../../packages/core/src/l2/evaluate.ts";
import { docNguonSong } from "../../../scripts/hienTruongSong.ts";
import { timKichBan } from "../src/kichBan.ts";
import { connReplay, tuyChonInspectKichBan, type BoReplayKichBan } from "../src/replayKichBan.ts";

/*
 * CK-10 — CẶP ĐỐI CHỨNG CHIỀU SÂU SOLANA (`data/doi-chung/ck10.json`).
 *
 * Nghiệm thu của thẻ: "mỗi ca có ground truth ai gắn, nguồn và giới hạn; so cả MÃ THIẾU lẫn
 * CÁO BUỘC THỪA". Bài cũ của từng luật thường chỉ hỏi "có mã X không" — một engine gắn thêm
 * mã cáo buộc khác vẫn qua. Ở đây ca đối chứng phải sạch cáo buộc, ca kích hoạt chỉ được
 * mang đúng cáo buộc đã khai.
 */
type KyVong = { level: string; coMa: string[]; caoBuocChoPhep?: string[]; khongCoMa?: string[]; khongGiamSoDu?: boolean };
type Ca = { id: string; vaiTro: "kichHoat" | "doiChung"; nguon: string; kyVong?: KyVong; tep?: string; test?: string; bienBan?: string; lyDoCaoBuoc?: string };
const M = JSON.parse(readFileSync("data/doi-chung/ck10.json", "utf8")) as {
  nguoiGan: string;
  cap: Array<{ id: string; dieuCanChungMinh: string; gioiHan: string; ca: Ca[] }>;
};
const BO = JSON.parse(readFileSync("apps/demo-wallet/public/replay/kich-ban.json", "utf8")) as BoReplayKichBan;

const fetchThat = globalThis.fetch;
before(() => {
  globalThis.fetch = (async () => {
    throw new Error("đối chứng CK-10 đã gọi mạng");
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = fetchThat;
});

/** Kết quả của một ca chạy được: mức, mã, và bảng chênh lệch. */
async function chay(ca: Ca) {
  if (ca.nguon === "replay-devnet") {
    const m = BO.mau.find((x) => x.id === ca.id);
    assert.ok(m, `bộ phát lại thiếu ${ca.id}`);
    const { conn, thieu } = connReplay(m!);
    const c = conn as Connection;
    const kb = timKichBan(ca.id)!;
    const { blockhash } = await c.getLatestBlockhash();
    const { soDu } = await docNguonSong(c, BO.hienTruong);
    const r = await inspect({ connection: c, interpret: dienGiaiKhongAI }, kb.dungTx(BO.hienTruong, { blockhash, soDuNguon: soDu }), tuyChonInspectKichBan(kb, BO.hienTruong));
    assert.deepEqual(thieu(), [], `${ca.id}: fixture thiếu lời gọi`);
    return { level: r.level, ma: r.reasonCodes, diff: r.diff };
  }
  const facts = giaiDongBangFacts(readFileSync(`data/seed/facts/${ca.id}.json`, "utf8"));
  const r = danhGia(facts);
  return { level: r.level, ma: r.reasonCodes, diff: [] as Array<{ label: string; before: string; after: string }> };
}

function soKyVong(ca: Ca, kq: Awaited<ReturnType<typeof chay>>): string[] {
  const k = ca.kyVong!;
  const loi: string[] = [];
  if (k.level === "khong-phai-danger" ? kq.level === "danger" : kq.level !== k.level) loi.push(`mức ${kq.level}, kỳ vọng ${k.level}`);
  for (const m of k.coMa) if (!kq.ma.includes(m)) loi.push(`THIẾU mã ${m}`);
  for (const m of k.khongCoMa ?? []) if (kq.ma.includes(m)) loi.push(`có mã cấm ${m}`);
  // Không khai thì chỉ được mang đúng cáo buộc đã kỳ vọng — ca nào cũng bị kiểm cáo buộc thừa
  // (Codex review lần 3: R03-pos không khai nên trước đây lọt mọi cáo buộc thêm).
  const choPhep = k.caoBuocChoPhep ?? k.coMa;
  for (const m of kq.ma) if (!MA_THONG_TIN.has(m) && !choPhep.includes(m)) loi.push(`CÁO BUỘC THỪA ${m}`);
  if (k.khongGiamSoDu && kq.diff.some((d) => d.label.startsWith("Số dư") && d.before !== d.after)) loi.push("hiện số dư đổi ở ca không chuyển token");
  return loi;
}

test("manifest: mỗi cặp có ca kích hoạt VÀ ca đối chứng, có giới hạn, có người gắn nhãn", () => {
  assert.ok(M.nguoiGan.length > 0);
  assert.ok(M.cap.length >= 6, "roadmap CK-10 đòi tối thiểu 6 cặp");
  for (const c of M.cap) {
    assert.ok(c.ca.some((x) => x.vaiTro === "kichHoat"), `${c.id} thiếu ca kích hoạt`);
    assert.ok(c.ca.some((x) => x.vaiTro === "doiChung"), `${c.id} thiếu ca đối chứng`);
    assert.ok(c.gioiHan && c.dieuCanChungMinh, `${c.id} thiếu giới hạn / điều cần chứng minh`);
  }
});

test("ca CHẠY ĐƯỢC (phát lại Devnet, seed): không thiếu mã, không cáo buộc thừa, không gọi mạng", async () => {
  const hong: string[] = [];
  for (const c of M.cap)
    for (const ca of c.ca.filter((x) => x.nguon === "replay-devnet" || x.nguon === "seed")) {
      const loi = soKyVong(ca, await chay(ca));
      if (loi.length) hong.push(`${c.id}/${ca.id}: ${loi.join("; ")}`);
    }
  assert.deepEqual(hong, []);
});

test("ca đối chứng chạy được thì KHÔNG mang cáo buộc nào, trừ cáo buộc đã khai KÈM LÝ DO kiểm được", async () => {
  for (const c of M.cap)
    for (const ca of c.ca.filter((x) => x.vaiTro === "doiChung" && (x.nguon === "replay-devnet" || x.nguon === "seed"))) {
      const { ma } = await chay(ca);
      const caoBuoc = ma.filter((m) => !MA_THONG_TIN.has(m));
      const daKhai = ca.kyVong?.caoBuocChoPhep ?? [];
      assert.deepEqual(caoBuoc.filter((m) => !daKhai.includes(m)), [], `${c.id}/${ca.id} bị cáo buộc chưa khai`);
      // Khai cho phép một cáo buộc trên ca ĐỐI CHỨNG là lời thú nhận cặp lẫn biến — phải có lý do và phải ghi vào giới hạn.
      if (daKhai.length) {
        assert.ok(ca.lyDoCaoBuoc, `${ca.id}: cho phép cáo buộc trên ca đối chứng mà không nêu lý do`);
        assert.match(c.gioiHan, /LẪN BIẾN/, `${c.id}: cặp lẫn biến mà giới hạn không nói`);
      }
    }
});

test("ground truth lấy từ GIAO DỊCH GỐC, không từ Facts: cặp ALT chỉ chuyển 1000 lamport ⇒ không có căn cứ cho cáo buộc SOL", async () => {
  /*
   * Bản đầu bài này đọc `solDelta` của Facts rồi "xác nhận" ~4,84 SOL rời ví — tức kiểm Facts
   * bằng chính Facts. Facts đó do L1 cũ bịa khi mô phỏng hỏng. Nhãn phải dựa vào thứ không
   * qua engine: lệnh System Transfer trong giao dịch đã ký.
   */
  const { VersionedTransaction } = await import("@solana/web3.js");
  for (const id of ["R10-pos", "R10-neg"]) {
    const tx = VersionedTransaction.deserialize(Buffer.from(readFileSync(`data/seed/tx/${id}.base64`, "utf8").trim(), "base64"));
    const ds = tx.message.compiledInstructions
      .filter((ix) => tx.message.staticAccountKeys[ix.programIdIndex]!.toBase58() === "11111111111111111111111111111111")
      .map((ix) => Buffer.from(ix.data))
      .filter((d) => d.readUInt32LE(0) === 2)
      .map((d) => d.readBigUInt64LE(4));
    assert.deepEqual(ds, [1000n], `${id}: giao dịch gốc không còn là chuyển 1000 lamport`);
    const { ma } = await chay({ id, vaiTro: "doiChung", nguon: "seed" });
    assert.ok(!ma.includes("SOL_ROI_VI"), `${id}: cáo buộc SOL rời ví trong khi giao dịch chỉ chuyển 1000 lamport`);
  }
});

test("nhãn seed trong manifest KHỚP nhãn độc lập của seed — kết quả engine không được tự sửa nhãn cho pass", () => {
  const seed = JSON.parse(readFileSync("data/seed/index.json", "utf8")) as { mau: Array<{ id: string; kyVong: { level: string } }> };
  for (const c of M.cap)
    for (const ca of c.ca.filter((x) => x.nguon === "seed")) {
      const s = seed.mau.find((m) => m.id === ca.id);
      assert.ok(s, `${ca.id} không có trong seed`);
      assert.equal(ca.kyVong!.level, s!.kyVong.level, `${ca.id}: nhãn manifest lệch nhãn seed`);
    }
});

test("ca tham chiếu: test được trỏ tới CÓ THẬT; ca Devnet có biên bản chạy", () => {
  for (const c of M.cap)
    for (const ca of c.ca) {
      if (ca.nguon === "fixture-test") {
        assert.ok(ca.tep && existsSync(ca.tep), `${ca.id}: không có tệp ${ca.tep}`);
        const nd = readFileSync(ca.tep!, "utf8");
        const dau = nd.indexOf(`test("${ca.test}"`);
        assert.ok(dau >= 0, `${ca.id}: không thấy test "${ca.test}"`);
        // Thân bài được tham chiếu phải KIỂM CÁO BUỘC THỪA, không chỉ tồn tại (Codex review lần 4, mục 4).
        const cuoi = nd.indexOf("\ntest(", dau + 1);
        const than = nd.slice(dau, cuoi < 0 ? undefined : cuoi);
        assert.ok(/caoBuocThua\(/.test(than), `${ca.id}: bài "${ca.test}" không kiểm cáo buộc thừa`);
      }
      if (ca.nguon === "devnet-mo-phong") {
        assert.ok(ca.bienBan && existsSync(ca.bienBan), `${ca.id}: thiếu biên bản`);
        const b = readFileSync(ca.bienBan!, "utf8");
        assert.ok(/CPI-DEVNET-OK/.test(b) && /mức: safe · mã: \(không\)/.test(b), `${ca.id}: biên bản không cho thấy CPI lành sạch cáo buộc`);
      }
    }
});

test("Codex lần 3, mục 4 · ca KHÔNG khai `caoBuocChoPhep` vẫn bị kiểm cáo buộc thừa (mặc định = mã kỳ vọng)", () => {
  const ca: Ca = { id: "gia", vaiTro: "kichHoat", nguon: "seed", kyVong: { level: "danger", coMa: ["SPL_APPROVE_DELEGATE_LON"] } };
  const loi = soKyVong(ca, { level: "danger", ma: ["SPL_APPROVE_DELEGATE_LON", "SPL_SET_AUTHORITY__ACCOUNT_OWNER"], diff: [] });
  assert.ok(loi.some((l) => /CÁO BUỘC THỪA SPL_SET_AUTHORITY__ACCOUNT_OWNER/.test(l)), `không bắt được cáo buộc thừa: ${JSON.stringify(loi)}`);
});
