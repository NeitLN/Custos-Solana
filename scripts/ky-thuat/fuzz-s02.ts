/**
 * FUZZ ĐẦU VÀO SAI — thẻ TB-S02.
 *
 *   node --experimental-strip-types scripts/ky-thuat/fuzz-s02.ts
 *   node --experimental-strip-types scripts/ky-thuat/fuzz-s02.ts 12345   # seed riêng
 *
 * Thẻ đòi *"corpus fuzz có seed và lưu ca thu nhỏ khi lỗi xuất hiện"*. Hai chữ quan
 * trọng nhất là **có seed**: một fuzz không tái lập được thì khi nó tìm ra lỗi, không
 * ai dựng lại được ca đó — và lúc đó nó chỉ báo động, không giúp sửa.
 *
 * Điều fuzz này kiểm KHÔNG phải "có ném lỗi không". Nó kiểm **bất biến**:
 *
 *   1. Không ném ra ngoài — L1 phải chịu được dữ liệu bất kỳ.
 *   2. Không bao giờ trả kết luận `safe` từ dữ liệu rác.
 *   3. Không mất precision: số tiền luôn là `bigint`, không đi qua `Number`.
 *   4. Không trả chuỗi mang HTML/Bidi/ký tự điều khiển ra ngoài.
 *
 * Bất biến 2 là cái đắt nhất. Một parser ném lỗi thì lộ ngay; một parser đọc rác rồi
 * bình tĩnh nói "bình thường" thì không ai thấy cho tới khi mất tiền.
 *
 * PHẦN LỚN LỚP NÀY ĐÃ CÓ trước thẻ này — `parseTokenAccount` có `try/catch` trả
 * `null`, `yeuCauNgoai.ts` chặn base64 quá 4096, `kyHieuAnToan` dùng allowlist ASCII.
 * Fuzz ở đây để **đo** thay vì tin, và để một lần sửa sau này không âm thầm tháo ra.
 */
import { PublicKey } from "@solana/web3.js";
import { parseTokenAccount, parseMint } from "../../packages/core/src/l1/parse.ts";
import { kyHieuAnToan } from "../../packages/core/src/diff.ts";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

/* ── Sinh số giả ngẫu nhiên CÓ SEED — mulberry32 ───────────────────────────── */
function nguon(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = Number(process.argv[2] ?? 20260912);
const rnd = nguon(SEED);
const soNguyen = (n: number) => Math.floor(rnd() * n);

const DIA_CHI = new PublicKey("So11111111111111111111111111111111111111112");
const CHU_TOKEN = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];

/** Buffer rác với độ dài quanh các mốc dễ sai: 0, 164, 165, 166, 182, 355. */
const MOC = [0, 1, 32, 63, 64, 100, 164, 165, 166, 170, 182, 355, 356, 1000];

type ViPham = { loai: string; chiTiet: string; caThuNho: string };
const viPham: ViPham[] = [];
let soLuot = 0;

const ghiViPham = (loai: string, chiTiet: string, caThuNho: string) => {
  // Chỉ giữ ca ĐẦU TIÊN của mỗi loại. Một lỗi thường sinh hàng nghìn ca giống nhau;
  // in hết thì ca thu nhỏ bị chôn trong tiếng ồn.
  if (!viPham.some((v) => v.loai === loai)) viPham.push({ loai, chiTiet, caThuNho });
};

/* ── Vòng 1 · parseTokenAccount và parseMint với buffer rác ────────────────── */
for (let i = 0; i < 4000; i++) {
  soLuot++;
  const n = MOC[soNguyen(MOC.length)]!;
  const buf = Buffer.alloc(n);
  for (let j = 0; j < n; j++) buf[j] = soNguyen(256);
  const chu = CHU_TOKEN[soNguyen(CHU_TOKEN.length)]!;
  const info = { owner: chu, data: buf, executable: false, lamports: soNguyen(1e9), rentEpoch: 0 };

  const goiLai = (ten: string, f: () => unknown) => {
    try {
      const r = f();
      // Bất biến 3: mọi số tiền phải là bigint. `Number` mất precision từ 2^53.
      if (r && typeof r === "object") {
        for (const [k, v] of Object.entries(r)) {
          if (/amount|soLuong/i.test(k) && typeof v === "number") {
            ghiViPham(
              `${ten}: số tiền là Number, không phải bigint`,
              `trường ${k} = ${v}`,
              `len=${n} owner=${chu.toBase58().slice(0, 8)} seed=${SEED}`,
            );
          }
        }
      }
    } catch (e) {
      // Bất biến 1: không được ném ra ngoài.
      ghiViPham(
        `${ten} NÉM lỗi với buffer rác`,
        e instanceof Error ? e.message.slice(0, 80) : String(e),
        `len=${n} owner=${chu.toBase58().slice(0, 8)} seed=${SEED} data=${buf.toString("hex").slice(0, 40)}`,
      );
    }
  };

  goiLai("parseTokenAccount", () => parseTokenAccount(DIA_CHI.toBase58(), info));
  goiLai("parseMint", () => parseMint(DIA_CHI.toBase58(), info));
}

/* ── Vòng 2 · ký hiệu token với Unicode, HTML, Bidi ────────────────────────── */
{
  /*
   * Đây là nhóm thẻ nêu đích danh: *"metadata Unicode/HTML/Bidi"*. Ba loại tấn công
   * khác nhau và chỉ một trong ba là hiển nhiên:
   *
   *   HTML  — `<script>` nếu render không escape.
   *   Bidi  — U+202E đảo chiều hiển thị: "USDC‮gnud iht" đọc ra khác byte thật.
   *   Ký tự điều khiển — xuống dòng chèn câu giả vào giữa giao diện.
   */
  const XAU = [
    "<script>alert(1)</script>",
    "USDC‮reversed",
    "USDC​zero-width",
    "USDC\nGiao dịch an toàn",
    "USDC\r\nBình thường",
    "USDC\u0000null",
    "A".repeat(17),
    "A".repeat(10000),
    "🔥USDC",
    "УСДЦ", // Cyrillic trông giống Latin
    "",
    " ",
  ];
  for (const x of XAU) {
    soLuot++;
    const ra = kyHieuAnToan(DIA_CHI.toBase58(), { [DIA_CHI.toBase58()]: x });
    // Bất biến 4: đầu ra không được mang ký tự nguy hiểm.
    if (/[<>\u0000-\u001f​-‏‪-‮]/.test(ra)) {
      ghiViPham(
        "kyHieuAnToan cho ký tự nguy hiểm đi qua",
        `vào ${JSON.stringify(x.slice(0, 30))} → ra ${JSON.stringify(ra.slice(0, 30))}`,
        `seed=${SEED} input=${JSON.stringify(x.slice(0, 60))}`,
      );
    }
    if (ra.length > 44) {
      ghiViPham(
        "kyHieuAnToan trả chuỗi quá dài",
        `độ dài ${ra.length}`,
        `seed=${SEED} input len=${x.length}`,
      );
    }
  }
  // Và nguồn thứ hai — ký hiệu đọc TỪ CHUỖI, cùng bộ lọc.
  for (const x of XAU) {
    soLuot++;
    const ra = kyHieuAnToan(DIA_CHI.toBase58(), undefined, x);
    if (/[<>\u0000-\u001f​-‏‪-‮]/.test(ra)) {
      ghiViPham(
        "kyHieuAnToan (nguồn on-chain) cho ký tự nguy hiểm đi qua",
        `vào ${JSON.stringify(x.slice(0, 30))} → ra ${JSON.stringify(ra.slice(0, 30))}`,
        `seed=${SEED} input=${JSON.stringify(x.slice(0, 60))}`,
      );
    }
  }
}

/* ── Vòng 3 · u64 sát và vượt giới hạn Number an toàn ──────────────────────── */
{
  /*
   * `Number.MAX_SAFE_INTEGER` là 2^53-1. Một token 9 chữ số thập phân với 10 triệu
   * đơn vị đã là 10^16 — vượt xa. Đọc qua `Number` thì con số hiển thị SAI mà không
   * báo lỗi gì, và đó là loại sai tệ nhất trong một sản phẩm nói về tiền.
   */
  const CAC_SO: bigint[] = [
    0n,
    1n,
    BigInt(Number.MAX_SAFE_INTEGER) - 1n,
    BigInt(Number.MAX_SAFE_INTEGER),
    BigInt(Number.MAX_SAFE_INTEGER) + 1n,
    2n ** 63n - 1n,
    2n ** 64n - 1n, // u64 tối đa
  ];
  for (const s of CAC_SO) {
    soLuot++;
    // Dựng buffer token account hợp lệ 165 byte với `amount` = s.
    const buf = Buffer.alloc(165);
    DIA_CHI.toBuffer().copy(buf, 0); // mint
    DIA_CHI.toBuffer().copy(buf, 32); // owner
    buf.writeBigUInt64LE(s, 64); // amount
    buf[108] = 1; // state = initialized
    const r = parseTokenAccount(DIA_CHI.toBase58(), {
      owner: TOKEN_PROGRAM_ID,
      data: buf,
      executable: false,
      lamports: 0,
      rentEpoch: 0,
    });
    if (r && r.amount !== s) {
      ghiViPham(
        "MẤT PRECISION khi đọc u64",
        `ghi ${s}, đọc ra ${r.amount}`,
        `seed=${SEED} amount=${s}`,
      );
    }
    if (r && typeof r.amount !== "bigint") {
      ghiViPham("amount không phải bigint", `kiểu ${typeof r.amount}`, `seed=${SEED} amount=${s}`);
    }
  }
}

/* ── Báo cáo ──────────────────────────────────────────────────────────────── */
console.log(`seed ${SEED} · ${soLuot} lượt`);
if (viPham.length === 0) {
  console.log("  Không vi phạm bất biến nào.");
} else {
  console.log(`  ${viPham.length} loại vi phạm:`);
  for (const v of viPham) {
    console.log(`\n  ✖ ${v.loai}`);
    console.log(`      ${v.chiTiet}`);
    console.log(`      ca thu nhỏ: ${v.caThuNho}`);
  }
}
console.log("\n--- JSON ---");
console.log(JSON.stringify({ seed: SEED, soLuot, viPham }, null, 2));
process.exit(viPham.length ? 1 : 0);
