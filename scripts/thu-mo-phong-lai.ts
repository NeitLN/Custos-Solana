/**
 * THỰC NGHIỆM: giao dịch mainnet ĐÃ KÝ có mô phỏng lại được không?
 *
 * `SEED-DATASET.md` yêu cầu mẫu âm tính phải là giao dịch mainnet thật, để con
 * số báo nhầm có ý nghĩa. Nhưng `inspect()` làm việc trên giao dịch CHƯA ký,
 * còn giao dịch lịch sử thì đã ký, blockhash hết hạn, và trạng thái chuỗi đã
 * đổi kể từ lúc nó chạy.
 *
 * Script này trả lời dứt khoát: lấy giao dịch mainnet thật, mô phỏng lại với
 * `replaceRecentBlockhash`, đếm xem bao nhiêu cái chạy được.
 *
 *   node --experimental-strip-types scripts/thu-mo-phong-lai.ts
 */
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SO_MAU = 8;

type KetQua = { chuKy: string; loai: string; ok: boolean; loi: string | null };

async function main() {
  const conn = new Connection(RPC, "confirmed");
  console.log("RPC:", RPC);

  console.log("\nlấy chữ ký gần đây của SPL Token program…");
  const sigs = await conn.getSignaturesForAddress(TOKEN_PROGRAM, { limit: SO_MAU * 3 });
  const thanhCong = sigs.filter((s) => s.err === null).slice(0, SO_MAU);
  console.log(`  có ${sigs.length} chữ ký, ${thanhCong.length} cái không lỗi`);

  const ket: KetQua[] = [];

  for (const s of thanhCong) {
    const r: KetQua = { chuKy: s.signature, loai: "?", ok: false, loi: null };
    try {
      const tx = await conn.getTransaction(s.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      if (!tx) {
        r.loi = "không lấy được giao dịch";
        ket.push(r);
        continue;
      }

      r.loai = tx.version === 0 ? "v0" : "legacy";

      // Dựng lại giao dịch từ message gốc, bỏ chữ ký.
      const lai = new VersionedTransaction(tx.transaction.message);

      const sim = await conn.simulateTransaction(lai, {
        sigVerify: false,
        replaceRecentBlockhash: true,
        commitment: "confirmed",
      });

      if (sim.value.err) {
        r.loi = typeof sim.value.err === "string" ? sim.value.err : JSON.stringify(sim.value.err);
      } else {
        r.ok = true;
      }
    } catch (e) {
      r.loi = e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80);
    }
    ket.push(r);
    await new Promise((x) => setTimeout(x, 400)); // nương tay với RPC công khai
  }

  console.log("\n=== KẾT QUẢ ===");
  for (const r of ket) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.loai.padEnd(6)} ${r.chuKy.slice(0, 16)}… ${r.loi ?? ""}`);
  }

  const so = ket.filter((r) => r.ok).length;
  console.log(`\n  ${so}/${ket.length} giao dịch mainnet mô phỏng lại được`);

  if (so === 0) {
    console.log("\n  ⇒ KHÔNG dùng giao dịch mainnet lịch sử làm mẫu âm tính được.");
    console.log("    Phải sửa SEED-DATASET.md mục 0.");
  } else if (so < ket.length / 2) {
    console.log("\n  ⇒ Chỉ một phần mô phỏng lại được. Dùng được nhưng phải lọc,");
    console.log("    và phải công bố tỉ lệ lọc kèm con số báo nhầm.");
  } else {
    console.log("\n  ⇒ Dùng được. SEED-DATASET.md giữ nguyên.");
  }
}

main().catch((e) => {
  console.error("LỖI:", e instanceof Error ? e.message : e);
  process.exit(1);
});
