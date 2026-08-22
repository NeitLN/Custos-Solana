/**
 * ĐO CHI PHÍ MỘT LƯỢT `inspect()` — bằng cách đếm, không bằng cách đọc code.
 *
 *   node --experimental-strip-types scripts/do-chi-phi.ts [số mẫu]
 *
 * Vì sao không nhẩm từ code: đọc `fetch.ts` bằng mắt ra "khoảng 4–6 lượt gọi RPC",
 * và con số đó không đủ tốt để lên slide. Nó bỏ qua ba nguồn biến thiên thật:
 *
 *   - số bảng ALT khác nhau theo từng giao dịch (7/10 mẫu mainnet có dùng ALT)
 *   - `getMultipleAccounts` chia lô 100 địa chỉ — giao dịch to tốn nhiều lượt hơn
 *   - `ten-token.ts` chỉ gọi thêm khi có mint chưa biết ký hiệu
 *
 * Nên chi phí thật là một PHÂN BỐ. Script này đo phân bố đó trên đúng cohort cố
 * định ở `data/seed/cohort-audit.json` — cùng tập mà `do-cohort.ts` dùng, nên hai
 * con số nói về cùng một mẻ giao dịch.
 *
 * RANH GIỚI ĐO — quan trọng, vì nó quyết định con số có trung thực không:
 *
 *   KHÔNG tính  `getTransaction` để lấy giao dịch về. Ví đã có giao dịch trong tay
 *               khi dApp đẩy sang; nó không phải chi phí của Custos.
 *   CÓ tính     mọi lượt gọi do chính `inspect()` phát ra.
 *
 * Thực hiện bằng hai Connection riêng: một cái trần để lấy mẫu, một cái bọc Proxy
 * đếm để đưa cho `inspect()`. Không có cách nào lẫn.
 *
 * GIẢ ĐỊNH PHẢI TRA LẠI TRƯỚC KHI LÊN SLIDE: script chỉ in SỐ LƯỢT GỌI. Helius và
 * QuickNode tính theo *credit*, và mỗi phương thức có trọng số riêng trong bảng giá
 * của họ. Quy ra tiền là việc phải tra bảng, không phải việc của script này — tự
 * chế trọng số credit rồi đưa lên sân khấu là đúng loại số liệu bịa mà thể lệ phạt.
 */
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { inspect } from "../packages/core/src/index.ts";
import { dienGiaiKhongAI, boiThoiHan } from "../packages/ai/src/index.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";
const HO_SO = "data/seed/cohort-audit.json";
const KET_QUA = "data/seed/chi-phi.json";
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Những phương thức Connection thật sự đi ra mạng. Cái khác chỉ tính toán cục bộ. */
const LA_RPC = new Set([
  "getMultipleAccountsInfo",
  "getAccountInfo",
  "simulateTransaction",
  "getFeeForMessage",
  "getAddressLookupTable",
  "getLatestBlockhash",
  "getSignaturesForAddress",
  "getTransaction",
  "getTokenAccountBalance",
]);

type Dem = Record<string, number>;

/**
 * Bọc Connection để đếm lượt gọi.
 *
 * Hàm trả về được gọi với `this` là ĐỐI TƯỢNG GỐC, không phải proxy. Chủ ý: nếu
 * `getAddressLookupTable` bên trong tự gọi `this.getAccountInfo`, ta KHÔNG muốn
 * đếm hai lần cho một lượt đi mạng. Đếm ở tầng ngoài cùng là đếm đúng số lượt
 * request thật.
 */
function bocDem(conn: Connection): { conn: Connection; dem: Dem } {
  const dem: Dem = {};
  const proxy = new Proxy(conn, {
    get(muc, ten, nhan) {
      const gt = Reflect.get(muc, ten, nhan) as unknown;
      if (typeof gt !== "function" || typeof ten !== "string" || !LA_RPC.has(ten)) return gt;
      return (...args: unknown[]) => {
        dem[ten] = (dem[ten] ?? 0) + 1;
        return (gt as (...a: unknown[]) => unknown).apply(muc, args);
      };
    },
  });
  return { conn: proxy, dem };
}

const trungVi = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const g = Math.floor(s.length / 2);
  return s.length % 2 ? s[g]! : (s[g - 1]! + s[g]!) / 2;
};

async function main() {
  if (!existsSync(HO_SO)) {
    console.error(`Chưa có cohort ở ${HO_SO}. Chạy scripts/do-cohort.ts trước.`);
    process.exit(1);
  }
  const chuKy = (JSON.parse(readFileSync(HO_SO, "utf8")) as { chuKy: string[] }).chuKy;
  const soMau = Number(process.argv[2] ?? chuKy.length);

  const layMau = new Connection(RPC, "confirmed"); // KHÔNG đếm — xem ranh giới đo ở đầu file
  const moiMau: Array<{ sig: string; dem: Dem; tong: number; soLenh: number }> = [];
  let boQua = 0;

  for (const sig of chuKy.slice(0, soMau)) {
    try {
      const tx = await layMau.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
      if (!tx) { boQua++; continue; }
      const vt = new VersionedTransaction(
        tx.transaction.message,
        tx.transaction.signatures.map(() => new Uint8Array(64)),
      );

      const { conn, dem } = bocDem(new Connection(RPC, "confirmed"));
      const r = await inspect({ connection: conn, interpret: boiThoiHan(dienGiaiKhongAI) }, vt, {
        locale: "vi",
      });

      const tong = Object.values(dem).reduce((a, b) => a + b, 0);
      moiMau.push({ sig, dem, tong, soLenh: r.coverage.total });
      process.stdout.write(`.`);
      await nghi(400);
    } catch {
      boQua++;
      process.stdout.write(`x`);
    }
  }
  console.log("");

  if (moiMau.length === 0) {
    console.error("Không đo được mẫu nào.");
    process.exit(1);
  }

  const tenPhuongThuc = [...new Set(moiMau.flatMap((m) => Object.keys(m.dem)))].sort();
  const bang = tenPhuongThuc.map((ten) => {
    const xs = moiMau.map((m) => m.dem[ten] ?? 0);
    return { ten, trungVi: trungVi(xs), thap: Math.min(...xs), cao: Math.max(...xs) };
  });
  const tongs = moiMau.map((m) => m.tong);

  console.log(`\n=== CHI PHÍ MỘT LƯỢT inspect() ===`);
  console.log(`  đo trên ${moiMau.length}/${soMau} giao dịch mainnet thật (bỏ qua ${boQua})`);
  console.log(`  KHÔNG tính getTransaction — ví đã có giao dịch trong tay\n`);
  console.log(`  ${"phương thức".padEnd(26)}${"trung vị".padStart(9)}${"thấp".padStart(7)}${"cao".padStart(6)}`);
  for (const b of bang) {
    console.log(`  ${b.ten.padEnd(26)}${String(b.trungVi).padStart(9)}${String(b.thap).padStart(7)}${String(b.cao).padStart(6)}`);
  }
  console.log(`  ${"-".repeat(46)}`);
  console.log(`  ${"TỔNG lượt gọi RPC".padEnd(26)}${String(trungVi(tongs)).padStart(9)}` +
    `${String(Math.min(...tongs)).padStart(7)}${String(Math.max(...tongs)).padStart(6)}`);

  const soLenh = moiMau.map((m) => m.soLenh);
  console.log(`\n  số lệnh mỗi giao dịch      : trung vị ${trungVi(soLenh)}, cao nhất ${Math.max(...soLenh)}`);

  // Chi phí thứ hai: token mô hình. Cần khoá, và bản công khai cố ý không có khoá.
  // Không đoán — in ra là chưa đo, kèm cách đo.
  if (process.env["ANTHROPIC_API_KEY"]) {
    console.log(`\n  token mô hình              : có khoá trong môi trường — chạy scripts/do-token-mo-hinh.ts`);
  } else {
    console.log(`\n  token mô hình              : CHƯA ĐO — cần ANTHROPIC_API_KEY.`);
    console.log(`                               Đo bằng: node --experimental-strip-types scripts/do-token-mo-hinh.ts`);
  }

  writeFileSync(
    KET_QUA,
    JSON.stringify(
      {
        doLuc: new Date().toISOString(),
        rpc: RPC.includes("api.mainnet-beta") ? "public mainnet-beta" : "riêng",
        soMauDoDuoc: moiMau.length,
        soMauBoQua: boQua,
        ghiChu: "KHÔNG tính getTransaction — ví đã có giao dịch. Số là LƯỢT GỌI, chưa quy ra credit.",
        theoPhuongThuc: bang,
        tongLuotGoi: { trungVi: trungVi(tongs), thap: Math.min(...tongs), cao: Math.max(...tongs) },
        soLenh: { trungVi: trungVi(soLenh), cao: Math.max(...soLenh) },
      },
      null,
      2,
    ),
  );
  console.log(`\n  đã ghi -> ${KET_QUA}`);
}

main().catch((e) => {
  console.error("LỖI:", (e as Error)?.message ?? e);
  process.exit(1);
});
