/**
 * ĐO SỐ TOKEN MỖI LƯỢT GỌI MÔ HÌNH — nửa còn lại của đơn vị kinh tế.
 *
 *   node --experimental-strip-types scripts/do-token-mo-hinh.ts [số mẫu]
 *
 * `do-chi-phi.ts` đo phần RPC. Phần thứ hai là token mô hình, và nó chỉ đo được
 * khi có khoá — nên script này tách riêng.
 *
 * ĐI QUA ĐÚNG ĐƯỜNG SẢN XUẤT, không dựng payload riêng. Đây không phải chuyện
 * gọn gàng mà là chuyện đã sai một lần: bộ đánh giá trước từng tự dựng payload,
 * bỏ mất trường `thayDoiSoDu`, và mọi mẫu đều trả lời "không có thông tin số
 * tiền" trong khi đường thật vẫn chạy đúng. Ở đây `dienGiaiBangMoHinh` dựng
 * payload y như lúc chạy thật; script chỉ ngồi giữa mà đếm.
 *
 * KHÔNG CÓ KHOÁ THÌ KHÔNG ĐOÁN. Không có khoá, script vẫn đo được kích thước
 * payload (ký tự) và in ra như một chỉ dấu — nhưng ghi rõ đó KHÔNG phải số token.
 * Tiếng Việt có dấu tách token tệ hơn tiếng Anh khá nhiều, nên quy đổi ký tự sang
 * token là đúng loại ước lượng không được phép đứng dưới một con số trên slide.
 *
 * Khoá đọc từ `ANTHROPIC_API_KEY` trong môi trường. Script không in khoá,
 * không ghi khoá xuống file, và không nhận khoá qua tham số dòng lệnh.
 */
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { inspect } from "../packages/core/src/index.ts";
import { dienGiaiBangMoHinh, dungGoiAnthropic, type GoiMoHinh } from "../packages/ai/src/index.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";
const HO_SO = "data/seed/cohort-audit.json";
const KET_QUA = "data/seed/chi-phi-mo-hinh.json";
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

const trungVi = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const g = Math.floor(s.length / 2);
  return s.length % 2 ? s[g]! : (s[g - 1]! + s[g]!) / 2;
};

async function main() {
  const coKhoa = Boolean(process.env["ANTHROPIC_API_KEY"]);
  const soMau = Number(process.argv[2] ?? 6);

  if (!existsSync(HO_SO)) {
    console.error(`Chưa có cohort ở ${HO_SO}. Chạy scripts/do-cohort.ts trước.`);
    process.exit(1);
  }
  const chuKy = (JSON.parse(readFileSync(HO_SO, "utf8")) as { chuKy: string[] }).chuKy;

  const kyTuVao: number[] = [];
  const tokenVao: number[] = [];
  const tokenRa: number[] = [];

  // Lượt gọi thật nếu có khoá; nếu không thì một hàm giả chỉ để payload được dựng
  // ra cho ta đếm. Hàm giả trả về JSON hợp lệ để `soiDauRa` không quăng lỗi.
  const goiThat: GoiMoHinh | null = coKhoa
    ? dungGoiAnthropic({ ghiNhanDung: (u) => { tokenVao.push(u.vao); tokenRa.push(u.ra); } })
    : null;

  const goi: GoiMoHinh = async ({ system, user }) => {
    kyTuVao.push(system.length + user.length);
    if (goiThat) return goiThat({ system, user });
    return JSON.stringify({ hanhDongChinh: null, dienGiai: "Không gọi mô hình.", cangCanKiemTra: false });
  };

  const layMau = new Connection(RPC, "confirmed");
  let n = 0, boQua = 0;

  for (const sig of chuKy.slice(0, soMau)) {
    try {
      const tx = await layMau.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
      if (!tx) { boQua++; continue; }
      const vt = new VersionedTransaction(
        tx.transaction.message,
        tx.transaction.signatures.map(() => new Uint8Array(64)),
      );
      await inspect(
        { connection: new Connection(RPC, "confirmed"), interpret: dienGiaiBangMoHinh(goi) },
        vt,
        { locale: "vi" },
      );
      n++;
      process.stdout.write(".");
      await nghi(500);
    } catch {
      boQua++;
      process.stdout.write("x");
    }
  }
  console.log("");

  console.log(`\n=== TOKEN MÔ HÌNH MỖI LƯỢT KIỂM TRA ===`);
  console.log(`  đo trên ${n}/${soMau} giao dịch mainnet thật (bỏ qua ${boQua})`);

  if (kyTuVao.length > 0) {
    console.log(`  kích thước payload (ký tự): trung vị ${trungVi(kyTuVao)}, cao nhất ${Math.max(...kyTuVao)}`);
    console.log(`     ^ KHÔNG phải số token. Chỉ để biết payload có phình bất thường không.`);
  }

  if (!coKhoa) {
    console.log(`\n  token thật: CHƯA ĐO — không có ANTHROPIC_API_KEY trong môi trường.`);
    console.log(`  Đặt khoá vào biến môi trường rồi chạy lại. Không dán khoá vào code hay dòng lệnh.`);
    console.log(`\n  => Trong DON-VI-KINH-TE.md, ô này phải để "chưa đo", không được điền số đoán.`);
    return;
  }

  console.log(`  token VÀO : trung vị ${trungVi(tokenVao)}, thấp ${Math.min(...tokenVao)}, cao ${Math.max(...tokenVao)}`);
  console.log(`  token RA  : trung vị ${trungVi(tokenRa)}, thấp ${Math.min(...tokenRa)}, cao ${Math.max(...tokenRa)}`);

  writeFileSync(
    KET_QUA,
    JSON.stringify(
      {
        doLuc: new Date().toISOString(),
        moHinh: "claude-haiku-4-5-20251001",
        soMauDoDuoc: n,
        ghiChu: "Số token do nhà cung cấp trả về, không phải ước lượng từ ký tự.",
        tokenVao: { trungVi: trungVi(tokenVao), thap: Math.min(...tokenVao), cao: Math.max(...tokenVao) },
        tokenRa: { trungVi: trungVi(tokenRa), thap: Math.min(...tokenRa), cao: Math.max(...tokenRa) },
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
