/**
 * CHẠY REPLAY — đường L1 sản xuất trên fixture đã ghi. Thẻ TB-B02.
 *
 *   node --experimental-strip-types scripts/ky-thuat/chay-replay.ts
 *   npm run replay-rpc
 *
 * **KHÔNG CHẠM MẠNG.** Thiếu fixture thì báo lỗi, không tự rơi về RPC — đó là nghiệm
 * thu của thẻ, và nó chỉ kiểm được nếu script này không có đường ra mạng nào.
 *
 * Chạy qua **`extractFacts` thật**, không dựng bản sao. Một replay đi qua đường riêng
 * chỉ chứng minh đường riêng đó đúng.
 *
 * CHUẨN SO SÁNH — và vì sao KHÔNG so với Facts đóng băng.
 *
 * Bản đầu của script này so Facts replay với `data/seed/facts/<id>.json`. Kết quả:
 * **18/19 lệch**. Điều tra từng trường cho ra bốn nguyên nhân, và **không cái nào là
 * lỗi của replay**:
 *
 *   1. **Decoder cải thiện sau 21/08.** `decoded` từ `{kind:"transfer"}` thành
 *      `{kind:"transfer", authority:"2EjY…"}`; `coverage.analyzed` từ 1 lên 2. Replay
 *      sinh Facts **đúng hơn** bản đóng băng.
 *   2. **Số dư ví devnet đổi.** `lamportsBefore` 4,84 SOL → 9,82 SOL. Ví demo được
 *      airdrop thêm giữa hai lần đo.
 *   3. **ALT giải được lúc capture, không giải được lúc dựng mẫu.** `R10-neg`: fixture
 *      có dữ liệu ALT nên `extractFacts` hỏi 3 địa chỉ, trong khi bản đóng băng chỉ
 *      có 2 account.
 *   4. **Facts đóng băng thiếu 5 trường schema mới** — `accountKhongDoDuoc`,
 *      `nguoiKy`, `nguoiDungDuocChiDinh`, `phiUocTinh`, `phiChinhXac`.
 *
 * Nói cách khác: **bản đóng băng là ảnh chụp L1 của ngày 21/08, không phải ground
 * truth.** Bắt L1 hôm nay khớp nó là bắt sản phẩm đứng yên — và sẽ đỏ mỗi lần decoder
 * tốt lên, tức đúng lúc không nên đỏ.
 *
 * Chuẩn đúng cho một replay là hai TÍNH CHẤT, và cả hai đo được:
 *
 *   · **Tất định** — cùng fixture, hai lần chạy cho kết quả giống hệt từng bit. Nếu
 *     sai, replay đang đọc thứ gì đó ngoài fixture (đồng hồ, mạng, thứ tự Map…).
 *   · **Nhạy với fixture** — đổi một `lamports` trong fixture thì Facts đổi theo. Nếu
 *     sai, replay đang bỏ qua dữ liệu và trả kết quả dựng sẵn.
 *
 * Hai tính chất đó là **nghiệm thu nguyên văn của thẻ B02**. Chúng kiểm đúng thứ cần
 * kiểm — L1 đọc gì từ dữ liệu RPC — mà không neo vào một ảnh chụp cũ.
 *
 * Phần so với Facts đóng băng vẫn chạy, nhưng chỉ để **báo cáo độ lệch**, không làm
 * runner đỏ. `tuoiViNhan` và `phiMang` bị loại khỏi mọi phép so: cái đầu tính từ
 * `Date.now()`, cái sau là `null` vì blockhash mẫu đã hết hạn — hành vi đúng đã ghi
 * trong `fetch.ts`.
 *
 * ĐIỀU SCRIPT NÀY **KHÔNG** CHỨNG MINH:
 *
 *   Nó không thực thi SVM. `simulateTransaction` trong fixture là kết quả một lần
 *   chạy SVM **trong quá khứ, trên máy khác**. Replay chứng minh L1 đọc đúng thứ RPC
 *   trả về — không chứng minh Solana hôm nay sẽ xử lý giao dịch đó như vậy.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { VersionedTransaction } from "@solana/web3.js";
import { extractFacts } from "../../packages/core/src/l1/fetch.ts";
import { dongBangFacts } from "../../packages/core/src/facts-io.ts";
import { connTuFixture, docFixture, ThieuFixture, type Fixture } from "./replay-rpc.ts";

const SEED = "data/seed";
const RPC_FIX = "data/benchmark/rpc";

/** Trường phụ thuộc THỜI ĐIỂM CHẠY, không phụ thuộc L1. Xem docstring. */
const BO_QUA = new Set(["tuoiViNhan", "phiMang"]);

function chuanHoa(f: unknown): string {
  const o = JSON.parse(dongBangFacts(f as never)) as Record<string, unknown>;
  for (const k of BO_QUA) delete o[k];
  return JSON.stringify(o, null, 2);
}

const mf = JSON.parse(readFileSync("data/benchmark/manifest.json", "utf8")) as {
  mau: Array<{ id: string; tang: string[]; tep: { facts: { duong: string }; giaoDich?: { duong: string } } }>;
};

const loc = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const coFixture = new Set(
  existsSync(RPC_FIX) ? readdirSync(RPC_FIX).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : [],
);

const canChay = mf.mau.filter(
  (m) => m.tang.includes("l1-replay") && (loc.length === 0 || loc.includes(m.id)),
);

type Ket = {
  id: string;
  /** Hai TÍNH CHẤT — đây là nghiệm thu thật của thẻ. */
  tatDinh: boolean | null;
  nhayFixture: boolean | null;
  /** So với Facts đóng băng: chỉ BÁO CÁO, không làm runner đỏ. Xem docstring. */
  lechVoiDongBang: string[] | null;
  trangThai: "dat" | "hong" | "thieu-fixture";
  chiTiet?: string;
};
const ket: Ket[] = [];
/** Mẫu có lượt `getMultipleAccountsInfo` ghép theo địa chỉ — xem `replay-rpc.ts`. */
const mauCoGhep = new Set<string>();

/** Chạy `extractFacts` trên một fixture. Trả Facts đã chuẩn hoá, hoặc ném. */
async function chay(id: string, fx: Fixture, tepTx: string): Promise<string> {
  const { conn, thieuFixture, soLuotGhep } = connTuFixture(fx);
  const raw = readFileSync(join(SEED, tepTx), "utf8").trim();
  const tx = VersionedTransaction.deserialize(Buffer.from(raw, "base64"));
  const f = chuanHoa(await extractFacts(conn as never, tx));
  /*
   * ĐỌC HỘP `thieuFixture` SAU KHI CHẠY XONG.
   *
   * `extractFacts` bọc `simulateTransaction` trong `try/catch` và ghi `e.message` vào
   * `simulationError`. Nên khi replay ném `ThieuFixture`, exception đó **bị nuốt** và
   * Facts ra `simulationOk: false` với câu "thiếu fixture…" nằm trong nội dung.
   *
   * Không đọc hộp này thì runner thấy Facts hợp lệ, tất định, và báo **đạt** — trong
   * khi mẫu đó chưa bao giờ chạy đủ. Đó đúng thứ nghiệm thu của thẻ cấm.
   */
  const thieu = thieuFixture();
  if (thieu.length > 0) throw thieu[0]!;
  if (soLuotGhep() > 0) mauCoGhep.add(id);
  return f;
}

/**
 * Đổi MỘT dữ kiện trong bản sao fixture — KHÔNG ghi lên đĩa.
 *
 * Đây là phép kiểm "nhạy với fixture" của thẻ: *"đổi dữ liệu account có ý nghĩa làm
 * output tương ứng đổi"*. Nếu output KHÔNG đổi thì replay đang bỏ qua dữ liệu và trả
 * một kết quả dựng sẵn — hỏng theo cách tệ nhất, vì nó vẫn xanh và vẫn tất định.
 *
 * PHẢI CHỌN TRƯỜNG THEO MẪU, và đây là một lỗi đã mắc:
 *
 *   Bản đầu luôn đổi `lamports` trong `getMultipleAccountsInfo`. Ba mẫu **mô phỏng
 *   hỏng** (`R09-pos`, `R09-neg`, `R10-pos`) báo `nhạy-fixture=✗`, và tôi suýt ghi đó
 *   là lỗi replay. Đo lại mới thấy: khi mô phỏng hỏng, `extractFacts` trả
 *   `accounts: []` — vòng dựng account bỏ qua mọi index không có trạng thái sau
 *   (`fetch.ts:289`). `lamports` **không bao giờ vào Facts** ở nhóm đó, nên đổi nó
 *   tất nhiên không đổi gì.
 *
 *   Phép kiểm sai, không phải sản phẩm sai.
 *
 * Nên KHÔNG chọn một trường cố định. Hàm này trả về **mọi cách đổi thử được**, và
 * người gọi chạy lần lượt tới khi thấy output đổi. Mẫu chỉ "không nhạy" khi **không
 * cách nào** chạm tới Facts — lúc đó mới là dấu hiệu replay bỏ qua dữ liệu.
 *
 * Trả mảng rỗng khi fixture không có gì đổi được — ghi ra, không giả vờ đã kiểm.
 */
function cacCachDoi(fx: Fixture): Array<{ ban: Fixture; truong: string }> {
  const ra: Array<{ ban: Fixture; truong: string }> = [];
  const sao = () => JSON.parse(JSON.stringify(fx)) as Fixture;

  // (a) `lamports` — đường dữ liệu rộng nhất khi mô phỏng THÀNH CÔNG.
  {
    const ban = sao();
    for (const bg of ban.banGhi) {
      if (bg.method !== "getMultipleAccountsInfo" || !Array.isArray(bg.ketQua)) continue;
      const xong = (bg.ketQua as Array<Record<string, unknown> | null>).some((a) => {
        if (a && typeof a["lamports"] === "number") {
          a["lamports"] = (a["lamports"] as number) + 777_000_000;
          return true;
        }
        return false;
      });
      if (xong) {
        ra.push({ ban, truong: "lamports" });
        break;
      }
    }
  }

  // (b) `data` của account — vào `tokenAccounts`/`mints`, độc lập với mô phỏng.
  {
    const ban = sao();
    for (const bg of ban.banGhi) {
      if (bg.method !== "getMultipleAccountsInfo" || !Array.isArray(bg.ketQua)) continue;
      const xong = (bg.ketQua as Array<Record<string, unknown> | null>).some((a) => {
        const d = a?.["data"] as { __buffer?: string } | undefined;
        if (d && typeof d.__buffer === "string" && d.__buffer.length > 0) {
          d.__buffer = Buffer.from(
            Buffer.from(d.__buffer, "base64").map((b, i) => (i === 0 ? b ^ 0xff : b)),
          ).toString("base64");
          return true;
        }
        return false;
      });
      if (xong) {
        ra.push({ ban, truong: "account.data" });
        break;
      }
    }
  }

  // (c) `sim.err` — mẫu mô phỏng hỏng vẫn đọc trường này vào `simulationError`.
  {
    const ban = sao();
    for (const bg of ban.banGhi) {
      if (bg.method !== "simulateTransaction") continue;
      const v = (bg.ketQua as { value?: Record<string, unknown> } | null)?.value;
      if (v && "err" in v) {
        v["err"] = { DoiThuNghiem: "kiem-tinh-nhay" };
        ra.push({ ban, truong: "simulateTransaction.err" });
        break;
      }
    }
  }

  /*
   * (d) `__loi` — RPC NÉM lúc capture, nên fixture lưu thông điệp lỗi thay vì response.
   *
   * `R10-pos` là ca này: ALT không tồn tại nên `simulateTransaction` ném, và
   * `extractFacts` ghi `e.message` vào `simulationError`. Ba cách đổi trên không chạm
   * tới nó — `accounts` rỗng, và fixture không có `value.err` để đổi.
   *
   * Bỏ qua nhánh này thì mẫu bị xếp "không nhạy", tức bị tố oan: replay CÓ đọc dữ
   * liệu, chỉ là dữ liệu đó nằm ở chỗ khác.
   */
  {
    const ban = sao();
    for (const bg of ban.banGhi) {
      const k = bg.ketQua as Record<string, unknown> | null;
      if (k && typeof k === "object" && typeof k["__loi"] === "string") {
        k["__loi"] = `${k["__loi"]} [đổi thử nghiệm]`;
        ra.push({ ban, truong: `${bg.method}.__loi` });
        break;
      }
    }
  }

  return ra;
}

for (const m of canChay) {
  if (!coFixture.has(m.id)) {
    /*
     * KHÔNG phải lỗi — là "chưa hỗ trợ". Mười mẫu mainnet cần RPC mainnet để capture,
     * và `capture-rpc.ts` từ chối ghi chúng bằng endpoint devnet (fixture ghi bằng
     * sai cluster vẫn tái lập được — tái lập đúng một kết quả sai).
     *
     * Báo rõ khác hẳn im lặng bỏ qua: im lặng thì "19/19 đạt" đọc thành "cả bộ đã
     * kiểm", trong khi 10 mẫu chưa chạy dòng nào.
     */
    ket.push({
      id: m.id,
      tatDinh: null,
      nhayFixture: null,
      lechVoiDongBang: null,
      trangThai: "thieu-fixture",
    });
    continue;
  }
  try {
    const fx = docFixture(join(RPC_FIX, `${m.id}.json`));
    const tepTx = m.tep.giaoDich!.duong;

    // TÍNH CHẤT 1 — tất định.
    const a = await chay(m.id, fx, tepTx);
    const b = await chay(m.id, fx, tepTx);
    const tatDinh = a === b;

    /*
     * TÍNH CHẤT 2 — nhạy với fixture. Thử LẦN LƯỢT mọi cách đổi.
     *
     * Dừng ngay khi thấy output đổi: một cách chạm được là đủ chứng minh replay đọc
     * fixture thật. Chỉ khi cạn cách mới kết luận "không nhạy".
     */
    const cach = cacCachDoi(fx);
    let nhay: boolean | null = cach.length === 0 ? null : false;
    let truongDoi = "";
    for (const c of cach) {
      if ((await chay(m.id, c.ban, tepTx)) !== a) {
        nhay = true;
        truongDoi = c.truong;
        break;
      }
      truongDoi = c.truong;
    }

    // BÁO CÁO độ lệch với bản đóng băng — không tính vào đạt/hỏng.
    const cu = chuanHoa(JSON.parse(readFileSync(join(SEED, m.tep.facts.duong), "utf8")));
    const oa = JSON.parse(cu) as Record<string, unknown>;
    const ob = JSON.parse(a) as Record<string, unknown>;
    const lech = Object.keys({ ...oa, ...ob }).filter(
      (k) => JSON.stringify(oa[k]) !== JSON.stringify(ob[k]),
    );

    ket.push({
      id: m.id,
      tatDinh,
      nhayFixture: nhay,
      lechVoiDongBang: lech,
      trangThai: tatDinh && nhay !== false ? "dat" : "hong",
      ...(nhay === null
        ? { chiTiet: "fixture không có dữ kiện nào đổi được — chưa kiểm được tính nhạy" }
        : nhay
          ? { chiTiet: `đổi ${truongDoi}` }
          : { chiTiet: `thử ${cach.length} cách đổi, Facts KHÔNG đổi` }),
    });
  } catch (e) {
    ket.push({
      id: m.id,
      tatDinh: null,
      nhayFixture: null,
      lechVoiDongBang: null,
      trangThai: e instanceof ThieuFixture ? "thieu-fixture" : "hong",
      chiTiet: e instanceof Error ? e.message.slice(0, 110) : String(e),
    });
  }
}

const dem = (t: Ket["trangThai"]) => ket.filter((k) => k.trangThai === t).length;

for (const k of ket) {
  const dau = { dat: "  ok  ", hong: "  SAI ", "thieu-fixture": " chưa " }[k.trangThai];
  const tc =
    k.trangThai === "thieu-fixture"
      ? ""
      : `tất định=${k.tatDinh ? "✓" : "✗"} nhạy-fixture=${k.nhayFixture === null ? "—" : k.nhayFixture ? "✓" : "✗"}`;
  const lc = k.lechVoiDongBang?.length ? ` · lệch bản đóng băng: ${k.lechVoiDongBang.join(", ")}` : "";
  console.log(`${dau} ${k.id.padEnd(10)} ${tc}${lc}${k.chiTiet ? " · " + k.chiTiet : ""}`);
}

const coLech = ket.filter((k) => k.lechVoiDongBang?.length).length;
console.log(
  `
replay OFFLINE · ${dem("dat")}/${canChay.length} đạt · ` +
    `${dem("hong")} hỏng · ${dem("thieu-fixture")} chưa có fixture`,
);
console.log(
  `  ${coLech} mẫu lệch với Facts đóng băng 21/08 — **báo cáo, không phải lỗi**: ` +
    "decoder đã tốt lên, số dư ví devnet đã đổi, và bản đóng băng thiếu 5 trường schema mới.",
);
console.log(
  "  Replay phát lại response ĐÃ GHI. Nó chứng minh L1 bóc tách đúng, " +
    "KHÔNG phải một lần thực thi SVM mới.",
);
if (mauCoGhep.size > 0) {
  console.log(
    `  ${mauCoGhep.size} mẫu có lượt đọc account GHÉP theo địa chỉ từ các lô đã ghi (L1 đổi cách chia lô sau lúc capture). ` +
      "Chỉ ghép khi mỗi địa chỉ có đúng một giá trị trong fixture.",
  );
}

process.exit(dem("hong") > 0 ? 1 : 0);
