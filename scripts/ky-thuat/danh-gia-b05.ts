/**
 * ĐÁNH GIÁ THEO TÍNH CHẤT — tập kiểm kỹ thuật. Thẻ TB-B05.
 *
 *   node --experimental-strip-types scripts/ky-thuat/danh-gia-b05.ts
 *   npm run danh-gia-b05
 *
 * **KHÔNG CHẠM MẠNG.** Chạy `extractFacts` sản xuất trên mọi fixture RPC đã ghi (29 từ 26/09).
 *
 * BA ĐIỀU THẺ CẤM, VÀ TRANG NÀY TUÂN CẢ BA:
 *
 *   1. *"Bộ seed 38 mẫu cũ không được đổi tên thành held-out."* — không mẫu nào ở đây
 *      được gọi là giữ lại. `data/seed/giu-lai/` vẫn trống, và đó là trạng thái đúng.
 *   2. *"không gọi independent security validation"* — đội tự dựng cả mẫu lẫn tính
 *      chất. Đây là **tập kiểm kỹ thuật của đội**, không phải thẩm định độc lập.
 *   3. *"Nếu chỉ có synthetic properties, báo độ đáp ứng trên tập kiểm này; không công
 *      bố accuracy thị trường."* — đầu ra là **độ đáp ứng tính chất**, không phải
 *      accuracy, không phải TP/FP/TN/FN.
 *
 * VÌ SAO KHÔNG PHÂN LOẠI TP/FP/TN/FN:
 *
 *   Thẻ cho phép *"chỉ khi nhãn và bài toán nhị phân có nghĩa"*. Ở đây bài toán không
 *   nhị phân: một mẫu có thể vừa đúng tính chất A vừa sai tính chất B, và "dương tính"
 *   không có nghĩa xác định. Ép vào bốn ô sẽ sinh ra một con số nghe như accuracy.
 *
 * NGUỒN CỦA TÍNH CHẤT — và vì sao KHÔNG dùng `docs/DAC-TA-CORE.md`:
 *
 *   Thẻ đòi *"expected properties theo đặc tả/nguồn độc lập với verdict"*. `docs/DAC-TA-CORE.md`
 *   commit lúc 21:55:31 ngày 21/08; engine L2 commit lúc 21:57:03 **cùng ngày** — cách
 *   nhau 92 giây, cùng người, cùng phiên. Nó KHÔNG độc lập với verdict, và dùng nó rồi
 *   gọi là độc lập sẽ lặp đúng lỗi vòng tròn mà `BENCHMARK.md` mục 1 đã tự cảnh báo.
 *
 *   Nguồn dùng ở đây là **tài liệu RPC chính thức của Solana** — tồn tại trước dự án,
 *   không ai trong đội viết:
 *   https://solana.com/docs/rpc/http/simulatetransaction
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { VersionedTransaction } from "@solana/web3.js";
import { extractFacts } from "../../packages/core/src/l1/fetch.ts";
import { connTuFixture, docFixture } from "./replay-rpc.ts";
import type { Facts } from "../../packages/core/src/facts.ts";

const FIX = "data/benchmark/rpc";
const SEED = "data/seed";
const RA = "data/benchmark";

/**
 * Một tính chất: khi nào nó ÁP DỤNG, và khi đó thế nào là ĐẠT.
 *
 * Tách hai vế là điều kiện để con số có nghĩa. Một tính chất "19/19 đạt" mà áp dụng
 * cho 0 mẫu thì không nói gì; tách ra thì nó hiện thành `0 áp dụng`.
 */
type TinhChat = {
  ma: string;
  ten: string;
  nguon: string;
  apDung: (f: Facts) => boolean;
  dat: (f: Facts) => boolean;
  /** Mutation nào đã chứng minh tính chất này BẮT được lỗi. Rỗng ⇒ chưa chứng minh. */
  daChungMinh: string;
};

const TINH_CHAT: TinhChat[] = [
  {
    ma: "P1",
    ten: "mô phỏng hỏng ⇒ KHÔNG có trạng thái sau",
    nguon:
      "spec `simulateTransaction`: `err != null` nghĩa là giao dịch không thực thi, " +
      "nên mọi trạng thái sau đều không tồn tại",
    apDung: (f) => f.simulationOk === false,
    dat: (f) => f.accounts.length === 0 && Object.keys(f.solDelta).length === 0,
    daChungMinh:
      "gỡ vế `!v.err` khỏi `coDuLieuAccount` ⇒ 14/14 tụt còn 5/14 (đo lại 26/09 trên 29 fixture)",
  },
  {
    ma: "P2",
    ten: "không đo được ⇒ PHẢI ghi vào `accountKhongDoDuoc`",
    nguon:
      "cùng spec: RPC vẫn trả mảng `accounts` toàn `null` khi mô phỏng hỏng — " +
      "chỗ trống mang hình dạng dữ liệu, phải được khai là không đo được",
    apDung: (f) => f.simulationOk === false,
    dat: (f) => (f.accountKhongDoDuoc ?? []).length > 0,
    daChungMinh: "tắt nhánh ghi account khuyết ⇒ 14/14 tụt còn 0/14 (đo lại 26/09 trên 29 fixture)",
  },
  {
    ma: "P3",
    ten: "ALT không giải được ⇒ verdict không bao giờ `safe`",
    nguon: "spec ALT: bảng không giải được thì danh sách account của giao dịch có thể còn thiếu",
    apDung: (f) => f.lookupTables.some((t) => !t.resolved),
    dat: (f) => f.lookupTables.filter((t) => !t.resolved).every((t) => t.address.length > 0),
    /*
     * CHƯA CHỨNG MINH ĐƯỢC, và ghi ra thay vì đếm nó vào điểm.
     *
     * Mọi mẫu kích hoạt P3 (`R10-pos` và, từ 26/09, 5 mẫu mainnet) đều có `simulationOk: false`.
     * Nên fail-safe 1 đã nâng verdict lên `warning` trước khi lớp ALT kịp làm gì —
     * tắt fail-safe 3 hay tắt luật 10 đều không kéo P3 xuống được.
     *
     * Cùng hình dạng với phát hiện FS3 ở TB-B04: hai lớp chồng nhau, không tách được
     * bằng dữ liệu hiện có. Muốn tách cần một mẫu **ALT hỏng mà mô phỏng THÀNH CÔNG**,
     * và bộ 29 fixture không có mẫu nào như vậy. Dựng nó cần Devnet.
     */
    daChungMinh: "",
  },
];

/* ── Chạy ──────────────────────────────────────────────────────────────────── */

const coFixture = existsSync(FIX)
  ? readdirSync(FIX).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort()
  : [];

const hoSo = JSON.parse(readFileSync(join(SEED, "index.json"), "utf8")) as {
  mau: Array<{ id: string; nguonGoc: string; giaoDich?: string | null }>;
};

/*
 * MẪU KHÔNG ĐÁNH GIÁ ĐƯỢC — nghiệm thu đòi "số không đánh giá được và lý do".
 *
 * Nhóm riêng, KHÔNG trộn vào mẫu số. Trộn là cách một tập đánh giá tự thu nhỏ mà
 * người đọc vẫn thấy tỉ lệ đẹp.
 */
const khongDanhGiaDuoc: Array<{ id: string; lyDo: string }> = [];
for (const m of hoSo.mau) {
  if (coFixture.includes(m.id)) continue;
  khongDanhGiaDuoc.push({
    id: m.id,
    lyDo: !m.giaoDich
      ? "không có file giao dịch — ca đối chứng dựng bằng cách sửa Facts trực tiếp"
      : m.nguonGoc === "real-mainnet"
        ? "mẫu mainnet chưa có fixture — capture bằng endpoint MAINNET (`capture-rpc.ts` từ chối endpoint devnet)"
        : "chưa capture fixture",
  });
}

type KetMau = { id: string; ket: Record<string, "dat" | "sai" | "khong-ap-dung"> };
const theoMau: KetMau[] = [];

for (const id of coFixture) {
  const { conn } = connTuFixture(docFixture(join(FIX, `${id}.json`)));
  const raw = readFileSync(join(SEED, "tx", `${id}.base64`), "utf8").trim();
  const tx = VersionedTransaction.deserialize(Buffer.from(raw, "base64"));
  const f = await extractFacts(conn as never, tx);

  const ket: Record<string, "dat" | "sai" | "khong-ap-dung"> = {};
  for (const tc of TINH_CHAT) {
    ket[tc.ma] = !tc.apDung(f) ? "khong-ap-dung" : tc.dat(f) ? "dat" : "sai";
  }
  theoMau.push({ id, ket });
}

/* ── Báo cáo ───────────────────────────────────────────────────────────────── */

const tong = TINH_CHAT.map((tc) => {
  const ap = theoMau.filter((m) => m.ket[tc.ma] !== "khong-ap-dung").length;
  const dat = theoMau.filter((m) => m.ket[tc.ma] === "dat").length;
  return { ...tc, ap, dat };
});

console.log(`đánh giá tính chất · ${theoMau.length} mẫu chạy được · ${khongDanhGiaDuoc.length} không đánh giá được\n`);

for (const t of tong) {
  const chungMinh = t.daChungMinh
    ? `đã chứng minh bắt được lỗi: ${t.daChungMinh}`
    : "**CHƯA CHỨNG MINH** bắt được lỗi — xem chú thích trong mã";
  console.log(`${t.ma} · ${t.ten}`);
  console.log(`   nguồn   : ${t.nguon}`);
  console.log(`   áp dụng : ${t.ap}/${theoMau.length} mẫu · đạt ${t.dat}/${t.ap}`);
  console.log(`   ${chungMinh}\n`);
}

const sai = theoMau.filter((m) => Object.values(m.ket).includes("sai"));
console.log(
  sai.length === 0
    ? "Không mẫu nào vi phạm tính chất áp dụng được cho nó."
    : `VI PHẠM: ${sai.map((m) => m.id).join(", ")}`,
);

console.log(`\n${khongDanhGiaDuoc.length} mẫu KHÔNG đánh giá được — nhóm riêng, không trộn vào mẫu số:`);
const theoLyDo = new Map<string, string[]>();
for (const k of khongDanhGiaDuoc) {
  theoLyDo.set(k.lyDo, [...(theoLyDo.get(k.lyDo) ?? []), k.id]);
}
for (const [lyDo, ids] of theoLyDo) console.log(`  ${ids.length} mẫu — ${lyDo}\n     ${ids.join(", ")}`);

console.log(
  "\nĐây là ĐỘ ĐÁP ỨNG TÍNH CHẤT trên tập kiểm của đội, KHÔNG phải accuracy, " +
    "KHÔNG phải thẩm định bảo mật độc lập.\n" +
    "Mẫu và tính chất đều do đội dựng; tính chất suy từ tài liệu RPC Solana, không từ đặc tả nội bộ.",
);

mkdirSync(RA, { recursive: true });
writeFileSync(
  join(RA, "danh-gia-b05.json"),
  JSON.stringify(
    {
      chayLuc: new Date().toISOString(),
      soMauChayDuoc: theoMau.length,
      soKhongDanhGiaDuoc: khongDanhGiaDuoc.length,
      tinhChat: tong.map((t) => ({
        ma: t.ma,
        ten: t.ten,
        nguon: t.nguon,
        apDung: t.ap,
        dat: t.dat,
        daChungMinh: t.daChungMinh,
      })),
      theoMau,
      khongDanhGiaDuoc,
    },
    null,
    2,
  ) + "\n",
);
console.log(`\n→ ${join(RA, "danh-gia-b05.json")}`);
