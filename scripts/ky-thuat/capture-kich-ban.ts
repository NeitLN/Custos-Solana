/**
 * GHI FIXTURE THEO KỊCH BẢN CỦA VÍ MẪU — CK-02. **Chạm mạng, chỉ đọc + mô phỏng.**
 *
 *   CUSTOS_CAPTURE=1 CUSTOS_RPC=<url>[,<url dự phòng>] \
 *     node --experimental-strip-types scripts/ky-thuat/capture-kich-ban.ts
 *
 * Ra `apps/demo-wallet/public/replay/kich-ban.json`: mỗi kịch bản trong Phòng phân tích
 * một fixture, ghi ĐÚNG các lời gọi ví sẽ gọi — `getLatestBlockhash`, số dư sống của tài
 * khoản nguồn (`getParsedAccountInfo`), rồi mọi lời gọi của `inspect()`. Ví phát lại bằng
 * chính các chặng đó (`App.tsx` → `chayKiem`), nên "chạy lại engine trên dữ liệu đã ghi"
 * đi qua đúng mã dựng giao dịch và đúng engine sản xuất, chỉ thay nguồn RPC.
 *
 * Vì sao cần, thay cho mock tĩnh: roadmap CK-F02 — chọn "Nhận thưởng nhưng token rời ví"
 * trong `?mock=danger` thì thẻ lại nhận diện `swap · SOL → USDC`. Mock có nhãn trung thực
 * nhưng không cùng câu chuyện; người xem không kiểm chứng được ca đang chọn.
 *
 * KHÔNG: ký, gửi, faucet, dựng lại hiện trường. Ví được bảo vệ là ví cố định trong
 * `hien-truong.json` — không đổi địa chỉ, không sửa fixture cho "trông như cùng ví".
 * Không lưu URL RPC đầy đủ: chỉ host.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type { Connection } from "@solana/web3.js";
import { inspect } from "../../packages/core/src/inspect.ts";
import { dienGiaiKhongAI } from "../../packages/ai/src/index.ts";
import { KICH_BAN } from "../../apps/demo-wallet/src/kichBan.ts";
import { docNguonSong } from "../hienTruongSong.ts";
import { connGhi, QUA_HAN_LUC_GHI, type BanGhi, type Method } from "../replayFixture.ts";
import { ketNoiDuPhong, danhSachRpc, chiDevnetDaXacMinh } from "../rpcDuPhong.ts";
import { GENESIS_DEVNET } from "../../apps/demo-wallet/src/preflight.ts";
import {
  cungHienTruong,
  gopBoReplay,
  tuyChonInspectKichBan,
  type BoReplayKichBan,
  type MauReplayKichBan,
} from "../../apps/demo-wallet/src/replayKichBan.ts";

if (process.env["CUSTOS_CAPTURE"] !== "1") {
  console.error("Script này CHẠM MẠNG (chỉ đọc + mô phỏng). Đặt CUSTOS_CAPTURE=1 để xác nhận ý định.");
  process.exit(2);
}

const RA = "apps/demo-wallet/public/replay/kich-ban.json";
const htGoc = JSON.parse(readFileSync("apps/demo-wallet/public/hien-truong.json", "utf8"));
// Ảnh chụp hiện trường ĐI CÙNG fixture: replay dựng tx từ ảnh này, không từ file hiện
// trường của hôm nay — nếu không, blockhash/số dư khớp nhưng địa chỉ thì không.
const { rpcDuPhong: _bo, ...ht } = htGoc;
const ds = danhSachRpc(process.env["CUSTOS_RPC"]?.split(",")[0] || ht.rpc, process.env["CUSTOS_RPC"]?.split(",").slice(1));
const pkg = (p: string) => JSON.parse(readFileSync(p, "utf8")).version as string;

/*
 * GỘP, KHÔNG GHI ĐÈ. Truyền id kịch bản để ghi lại riêng những ca đó; các ca khác trong
 * bộ đang có giữ nguyên (kèm thời điểm ghi của chính chúng) — NHƯNG chỉ khi hiện trường
 * không đổi (`gopBoReplay`). Kiểm điều đó TRƯỚC khi chạm mạng.
 */
const chiId = process.argv.slice(2).filter((a) => !a.startsWith("--"));
let cuBo: BoReplayKichBan | null = null;
try {
  cuBo = JSON.parse(readFileSync(RA, "utf8")) as BoReplayKichBan;
} catch {
  /* chưa có bộ nào */
}
if (cuBo && chiId.length > 0 && !cungHienTruong(cuBo.hienTruong, ht)) {
  console.error("✖ hiện trường đã đổi so với bộ phát lại đang có — ghi lại TOÀN BỘ (bỏ tham số id), không ghi lẻ");
  process.exit(2);
}

/** Dòng lỗi để in: bỏ mọi URL — lỗi kết nối có thể nhúng URL `CUSTOS_RPC` mang khoá. */
const dongLoi = (e: unknown, dai: number) =>
  (e instanceof Error ? e.message.split("\n")[0]! : String(e))
    .replace(/https?:\/\/\S+/g, "(endpoint)")
    .slice(0, dai);

/*
 * Genesis TRƯỚC, TỪNG endpoint: fixture dán nhãn Devnet thì MỌI nguồn có thể trả lời lượt
 * ghi phải chứng minh được là Devnet (Codex review lần 2, mục 6). Bản cũ hỏi qua connection
 * dự phòng — endpoint đầu trả Devnet là cả danh sách được tin, kể cả endpoint dự phòng
 * chưa từng được hỏi. Endpoint sai mạng = cấu hình sai: dừng hẳn, không lặng lẽ bỏ.
 */
const xm = await chiDevnetDaXacMinh(ds, { soLan: 3, msGianCach: 2_000 });
for (const b of xm.bo) console.log(`  genesis ${b.nguon}: ${b.ly === "khacCluster" ? "KHÁC CLUSTER" : "chưa đo được"} — không dùng để ghi`);
if (xm.bo.some((b) => b.ly === "khacCluster")) {
  console.error("✖ có endpoint KHÔNG phải Devnet trong CUSTOS_RPC — sửa cấu hình, không ghi fixture");
  process.exit(2);
}
if (xm.dung.length === 0) {
  console.error("✖ không endpoint nào xác nhận được là Devnet — dừng, không ghi fixture");
  process.exit(2);
}
const dsGhi = xm.dung;
const genesis = GENESIS_DEVNET;

const canGhi = KICH_BAN.filter((k) => k.hoTro === "devnet" && (chiId.length === 0 || chiId.includes(k.id)));
const moi = new Map<string, MauReplayKichBan>();
const hong: string[] = [];
const SO_LAN = 4;

for (const kb of canGhi) {
  let loiCuoi = "";
  for (let lan = 1; lan <= SO_LAN && !moi.has(kb.id); lan++) {
    const banGhi: BanGhi[] = [];
    const nguon = new Set<string>();
    const that = ketNoiDuPhong(dsGhi, { ghiNhan: (q) => q.ketQua === "ok" && nguon.add(q.nguon) });
    const dangCho = new Map<string, { method: Method; thamSo: unknown }>();
    const conn = connGhi(that as never, banGhi, dangCho) as Connection;
    try {
      const { blockhash } = await conn.getLatestBlockhash();
      const { soDu } = await docNguonSong(conn, ht);
      const tx = kb.dungTx(ht, { blockhash, soDuNguon: soDu });
      const r = await inspect({ connection: conn, interpret: dienGiaiKhongAI }, tx, tuyChonInspectKichBan(kb, ht));
      /*
       * MỘT NGUỒN CHO MỘT LƯỢT GHI. Hai nhà cung cấp trả lời hai nửa của cùng một lượt
       * đọc thì trạng thái trước (nhà A) và kết quả mô phỏng (nhà B) có thể thuộc hai
       * slot khác nhau — không phải "một snapshot". Bỏ và ghi lại (CK-01, mục 4).
       */
      /*
       * LỜI GỌI CÒN DỞ LÚC ENGINE KẾT LUẬN. Chỉ chấp nhận cho bước LÀM GIÀU (lịch sử ví
       * nhận, có hạn riêng trong L1): engine đã thật sự kết luận khi thiếu dữ kiện đó, nên
       * ghi nó thành "quá hạn lúc ghi" là ghi đúng điều đã xảy ra, và phát lại tái lập
       * đúng như vậy. Vẫn ưu tiên lượt đầy đủ — chỉ dùng lượt này khi hết số lần thử.
       * Lời gọi cốt lõi (account, mô phỏng) còn dở thì lượt KHÔNG trọn, bỏ.
       */
      if (dangCho.size > 0) {
        const chiLamGiau = [...dangCho.values()].every((x) => x.method === "getSignaturesForAddress");
        if (!chiLamGiau) {
          loiCuoi = `lượt ${lan} còn lời gọi cốt lõi chưa trả lúc engine kết luận — bỏ, ghi lại`;
          continue;
        }
        if (lan < SO_LAN) {
          loiCuoi = `lượt ${lan} có bước làm giàu quá hạn — thử lượt đầy đủ hơn`;
          continue;
        }
        for (const [khoa, x] of dangCho) {
          banGhi.push({ method: x.method, khoa, thamSo: x.thamSo, ketQua: { __loi: QUA_HAN_LUC_GHI } });
        }
        console.log(`    (${kb.id}: ${dangCho.size} bước làm giàu quá hạn lúc ghi — ghi đúng như vậy)`);
      }
      if (nguon.size !== 1) {
        loiCuoi = `lượt ${lan} trộn ${nguon.size} nguồn (${[...nguon].join(" + ")}) — bỏ, ghi lại`;
        continue;
      }
      // Lượt đọc hỏng giữa chừng bị `extractFacts` nuốt thành "mô phỏng hỏng" — không nhận.
      if (
        banGhi.some(
          (b) =>
            b.ketQua &&
            typeof b.ketQua === "object" &&
            "__loi" in (b.ketQua as object) &&
            (b.ketQua as { __loi: string }).__loi !== QUA_HAN_LUC_GHI,
        )
      ) {
        loiCuoi = `lượt ${lan} có lời gọi RPC hỏng — bỏ, ghi lại`;
        continue;
      }
      const sim = banGhi.find((b) => b.method === "simulateTransaction")?.ketQua as { context?: { slot?: number } } | undefined;
      const luc = new Date().toISOString();
      moi.set(kb.id, {
        id: kb.id,
        captureLuc: luc,
        nguon: [...nguon],
        ...(typeof sim?.context?.slot === "number" ? { slot: sim.context.slot } : {}),
        ketQuaLucGhi: { level: r.level, reasonCodes: [...r.reasonCodes], coverage: { ...r.coverage } },
        fixture: { phienBan: 1, id: `kich-ban/${kb.id}`, captureLuc: luc, nguon: [...nguon][0]!, banGhi },
      });
      console.log(`  ✓ ${kb.id.padEnd(30)} ${r.level.padEnd(8)} ${r.reasonCodes.join(",") || "(không mã)"} · ${banGhi.length} bản ghi · ${[...nguon][0]} · lượt ${lan}`);
    } catch (e) {
      loiCuoi = `lượt ${lan}: ${dongLoi(e, 110)}`;
    }
  }
  if (!moi.has(kb.id)) {
    hong.push(kb.id);
    console.log(`  ✗ ${kb.id.padEnd(30)} ${loiCuoi}`);
  }
}

// Thứ tự theo sổ kịch bản; ca không ghi lại được giữ bản cũ nếu hiện trường không đổi.
const gop = gopBoReplay(cuBo, ht, moi, chiId);
if ("loi" in gop) {
  console.error(`✖ ${gop.loi}`);
  process.exit(2);
}
const mau = gop.mau;

const bo: BoReplayKichBan = {
  schema: "custos.replay-kich-ban",
  phienBan: 1,
  cluster: "devnet",
  genesis,
  nguonGhi: [...new Set(mau.flatMap((m) => m.nguon))].sort(),
  engineLucGhi: { core: pkg("packages/core/package.json"), ai: pkg("packages/ai/package.json") },
  viBaoVe: ht.nanNhan,
  hienTruong: ht,
  gioiHan:
    "Phát lại phản hồi RPC đã ghi, gồm kết quả simulateTransaction của một lần chạy SVM trong quá khứ. " +
    "Không phải giao dịch Devnet mới, không phải lần thực thi Solana mới, không cấp quyền ký.",
  mau,
};
mkdirSync("apps/demo-wallet/public/replay", { recursive: true });
writeFileSync(RA, JSON.stringify(bo, null, 1) + "\n");
console.log(`\n→ ${RA} · ${moi.size} ghi mới · ${mau.length}/${KICH_BAN.length} kịch bản có dữ liệu · ${hong.length} hỏng${hong.length ? ` (${hong.join(", ")})` : ""}`);
process.exitCode = hong.length ? 1 : 0;
