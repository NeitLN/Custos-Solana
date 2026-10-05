/**
 * GHI BỘ "GIAO DỊCH MAINNET THẬT — PHÁT LẠI" CHO INSPECTOR — R0-3, ROADMAP-GIONG-THAT.
 *
 *   CUSTOS_OFFLINE_MAINNET_RESEARCH=1 node --experimental-strip-types scripts/capture-mainnet-phat-lai.ts
 *
 * **SCRIPT NÀY CHẠM MAINNET — CHỈ ĐỌC.** Không khoá, không ký, không gửi. Nó đọc giao dịch
 * công khai vừa thực thi, dựng lại bản CHƯA KÝ từ message, chạy `inspect()` thật qua một
 * Connection ghi âm, rồi lưu phản hồi RPC để ví phát lại KHÔNG gọi mạng.
 *
 * ## Vì sao không dùng lại MN-01…10
 *
 * Đo 06/10: `inspect()` trên fixture ghi 26/09 của cả 10 mẫu đều ra `MO_PHONG_HONG`, đọc hiểu
 * 0 lệnh — giao dịch đã thực thi từ 21/08, mô phỏng lại một tháng sau thì ALT đã đóng, tài
 * khoản đã đóng, giá đã trượt. Đó là sự thật về giao dịch CŨ, không phải về engine. Bộ này ghi
 * giao dịch vừa thực thi, mô phỏng lại sau vài giây.
 *
 * ## Luật chọn mẫu — đặt TRƯỚC khi chạy, không lọc theo kết quả (Codex review 06/10)
 *
 * `SO_MAU` giao dịch THÀNH CÔNG đầu tiên trong `getSignaturesForAddress(SPL Token)` tại thời
 * điểm ghi, theo đúng thứ tự RPC trả. Chỉ bỏ vì lý do KỸ THUẬT (không lấy được giao dịch, phiên
 * bản giao dịch web3.js chưa đọc, RPC hỏng sau mọi lần thử) — và mọi mẫu bị bỏ được ghi kèm lý
 * do vào chính file kết quả. Không mẫu nào bị bỏ vì verdict của nó.
 *
 * ## Cách nói đúng
 *
 * Đây là bằng chứng engine L1/L2 đọc được message mainnet thật và fail-safe khi trạng thái
 * thiếu. KHÔNG phải luồng ký mainnet, KHÔNG phải "bảo vệ tài sản mainnet": các giao dịch đã
 * thực thi trước khi Custos nhìn thấy chúng.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Buffer } from "buffer";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { inspect } from "../packages/core/src/inspect.ts";
import { dienGiaiKhongAI } from "../packages/ai/src/index.ts";
import { connGhi, QUA_HAN_LUC_GHI, type BanGhi, type Method } from "./replayFixture.ts";
import { hostCuaRpc } from "./rpcDuPhong.ts";
import { chanNeuChuaChoPhep } from "./congMainnet.ts";
import {
  GENESIS_MAINNET,
  TUY_CHON_MAINNET,
  type BoReplayMainnet,
  type MauReplayMainnet,
} from "../apps/demo-wallet/src/replayMainnet.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";
chanNeuChuaChoPhep("capture-mainnet-phat-lai.ts", RPC);

const RA = "apps/demo-wallet/public/replay/mainnet.json";
const SO_MAU = 10;
const DANH_SACH = 60;
const SO_LAN = 4;
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const pkg = (p: string) => JSON.parse(readFileSync(p, "utf8")).version as string;
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Lỗi RPC TẠM THỜI — ghi lại lượt. Lỗi còn lại (ALT không tồn tại, …) là sự thật của chuỗi. */
const TAM_THOI = /429|too many|timed? ?out|fetch failed|ECONN|socket|network|503|502|504/i;
const dongLoi = (e: unknown) =>
  (e instanceof Error ? e.message.split("\n")[0]! : String(e)).replace(/https?:\/\/\S+/g, "(endpoint)").slice(0, 120);

const conn = new Connection(RPC, "confirmed");
const nguon = hostCuaRpc(RPC);

// Genesis TRƯỚC: bộ dán nhãn mainnet thì endpoint phải chứng minh được là mainnet.
const genesis = await conn.getGenesisHash();
if (genesis !== GENESIS_MAINNET) {
  console.error(`✖ ${nguon} không phải mainnet (genesis ${genesis}) — dừng, không ghi`);
  process.exit(2);
}

const layLuc = new Date().toISOString();
const ds = await conn.getSignaturesForAddress(TOKEN, { limit: DANH_SACH });
const slotDanhSach = ds[0]?.slot ?? null;
const ungVien = ds.filter((s) => s.err === null);
console.log(`danh sách: ${ds.length} chữ ký, ${ungVien.length} thành công · slot đầu ${slotDanhSach} · ${nguon}`);

const mau: MauReplayMainnet[] = [];
const boQua: BoReplayMainnet["boQua"] = [];

for (const s of ungVien) {
  if (mau.length >= SO_MAU) break;
  const id = `ML-${String(mau.length + 1).padStart(2, "0")}`;
  /*
   * Lỗi TẠM THỜI (429, timeout…) ở bước lấy giao dịch được thử lại như bước inspect — luật chọn mẫu
   * hứa chỉ bỏ "sau mọi lần thử" (Codex review 06/10). Lỗi không tạm thời (vd. phiên bản v1) bỏ ngay.
   */
  let tx: Awaited<ReturnType<Connection["getTransaction"]>> = null;
  let loiLay = "";
  for (let lan = 1; lan <= SO_LAN; lan++) {
    try {
      tx = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
      loiLay = "";
      break;
    } catch (e) {
      loiLay = dongLoi(e);
      if (!TAM_THOI.test(loiLay) || lan === SO_LAN) break;
      await nghi(3000 * lan);
    }
  }
  if (loiLay) {
    boQua.push({ chuKy: s.signature, lyDo: `không lấy được giao dịch: ${loiLay}` });
    console.log(`  – ${s.signature.slice(0, 8)} bỏ: ${loiLay}`);
    continue;
  }
  if (!tx) {
    boQua.push({ chuKy: s.signature, lyDo: "RPC không trả giao dịch" });
    continue;
  }
  // Bản CHƯA KÝ: chữ ký 0 — mô phỏng không cần chữ ký, và bản lưu không phát lên chuỗi được.
  const vt = new VersionedTransaction(tx.transaction.message, tx.transaction.signatures.map(() => new Uint8Array(64)));
  const b64 = Buffer.from(vt.serialize()).toString("base64");

  let xong: MauReplayMainnet | null = null;
  let loiCuoi = "";
  for (let lan = 1; lan <= SO_LAN && !xong; lan++) {
    const banGhi: BanGhi[] = [];
    const dangCho = new Map<string, { method: Method; thamSo: unknown }>();
    const ghi = connGhi(conn as never, banGhi, dangCho) as Connection;
    const batDau = Date.now();
    try {
      // Bản đọc lại từ b64 — đúng bytes ví sẽ dựng khi phát lại, nên khoá fixture khớp.
      const txLai = VersionedTransaction.deserialize(Buffer.from(b64, "base64"));
      const r = await inspect({ connection: ghi, interpret: dienGiaiKhongAI }, txLai, TUY_CHON_MAINNET);
      if (dangCho.size > 0) {
        const chiLamGiau = [...dangCho.values()].every((x) => x.method === "getSignaturesForAddress");
        if (!chiLamGiau || lan < SO_LAN) {
          loiCuoi = `lượt ${lan} còn lời gọi chưa trả lúc engine kết luận`;
          await nghi(1500 * lan);
          continue;
        }
        for (const [khoa, x] of dangCho) banGhi.push({ method: x.method, khoa, thamSo: x.thamSo, ketQua: { __loi: QUA_HAN_LUC_GHI } });
      }
      const tamThoi = banGhi.find(
        (b) => b.ketQua && typeof b.ketQua === "object" && "__loi" in (b.ketQua as object) && TAM_THOI.test((b.ketQua as { __loi: string }).__loi),
      );
      if (tamThoi) {
        loiCuoi = `lượt ${lan}: ${tamThoi.method} lỗi tạm thời`;
        await nghi(3000 * lan);
        continue;
      }
      const luc = new Date(batDau).toISOString();
      xong = {
        id,
        chuKy: s.signature,
        slotThucThi: tx.slot,
        thucThiLuc: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
        captureLuc: luc,
        treGiay: tx.blockTime ? Math.max(0, Math.round(batDau / 1000 - tx.blockTime)) : null,
        b64,
        ketQuaLucGhi: { level: r.level, reasonCodes: [...r.reasonCodes], coverage: { ...r.coverage } },
        fixture: { phienBan: 1, id: `mainnet/${id}`, captureLuc: luc, nguon, banGhi },
      };
    } catch (e) {
      loiCuoi = `lượt ${lan}: ${dongLoi(e)}`;
      await nghi(3000 * lan);
    }
  }
  if (!xong) {
    boQua.push({ chuKy: s.signature, lyDo: `RPC hỏng sau ${SO_LAN} lượt — ${loiCuoi}` });
    console.log(`  – ${s.signature.slice(0, 8)} bỏ: ${loiCuoi}`);
    continue;
  }
  mau.push(xong);
  const k = xong.ketQuaLucGhi;
  console.log(`  ✓ ${id} ${s.signature.slice(0, 8)} Δ${xong.treGiay}s ${k.level.padEnd(8)} ${k.reasonCodes.join(",") || "(không mã)"} · đọc hiểu ${k.coverage.analyzed}/${k.coverage.total} · ${xong.fixture.banGhi.length} bản ghi`);
  await nghi(800);
}

/*
 * Giao dịch phiên bản v1 làm `getTransaction` NÉM ("Transaction version (1) is not supported"):
 * lỗi không tạm thời, bỏ ngay ở vòng lấy giao dịch, ghi nguyên văn — không gộp vào "RPC hỏng".
 */
const bo: BoReplayMainnet = {
  schema: "custos.replay-mainnet",
  phienBan: 1,
  cluster: "mainnet-beta",
  genesis,
  nguonGhi: [nguon],
  engineLucGhi: { core: pkg("packages/core/package.json"), ai: pkg("packages/ai/package.json") },
  cachChon: {
    chuongTrinh: TOKEN.toBase58(),
    layLuc,
    slotDanhSach,
    quyTac:
      `${SO_MAU} giao dịch thành công đầu tiên trong getSignaturesForAddress(SPL Token, limit ${DANH_SACH}) lúc ghi, ` +
      "đúng thứ tự RPC trả; chỉ bỏ vì lý do kỹ thuật, ghi kèm lý do; không lọc theo kết quả.",
  },
  gioiHan:
    "Giao dịch mainnet THẬT đã thực thi trước khi Custos nhìn thấy. Custos dựng lại bản chưa ký và mô phỏng lại " +
    "sau vài giây, chỉ đọc. Phát lại phản hồi RPC đã ghi — không phải trạng thái chuỗi hiện tại, không phải luồng " +
    "ký mainnet. Luồng ký của Custos chỉ chạy Devnet.",
  boQua,
  mau,
};
mkdirSync("apps/demo-wallet/public/replay", { recursive: true });
writeFileSync(RA, JSON.stringify(bo) + "\n");
console.log(`\n→ ${RA} · ${mau.length} mẫu · ${boQua.length} bỏ qua · ${(JSON.stringify(bo).length / 1024).toFixed(0)} KB`);
process.exitCode = mau.length === SO_MAU ? 0 : 1;
