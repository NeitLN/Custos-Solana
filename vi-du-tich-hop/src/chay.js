/**
 * BA KỊCH BẢN, CHẠY THẬT TRÊN DEVNET.
 *
 *   node src/chay.js [duong-dan-hien-truong.json]
 *
 * Không kịch bản nào cần khoá riêng: `inspect()` MÔ PHỎNG giao dịch, và mô phỏng
 * Solana không đòi chữ ký. Đó cũng đúng thứ tự thật của sản phẩm — Custos chạy
 * TRƯỚC khi ký, nên nó phải làm việc được khi chưa có chữ ký nào.
 *
 * `hien-truong.json` ở đây đóng vai cấu hình của chính dApp (mint, tài khoản token).
 * Một dApp thật đã có sẵn những địa chỉ này; nó không lấy chúng từ Custos.
 */
import { readFileSync } from "node:fs";
import { Connection } from "@solana/web3.js";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import { PublicKey, dungGiaoDichBinhThuong, dungGiaoDichGiaDanhAirdrop } from "./dapp.js";
import { kiemTruocKhiKy } from "./tich-hop.js";

const HT = JSON.parse(readFileSync(process.argv[2] ?? "./hien-truong.json", "utf8"));
const ket = [];

function ck(ten, dat, chiTiet) {
  ket.push({ ten, dat, chiTiet });
  console.log(`  ${dat ? "PASS" : "FAIL"}  ${ten}${dat ? "" : `   <<< ${chiTiet}`}`);
}

async function main() {
  const conn = new Connection(HT.rpc, "confirmed");
  const nguoiKy = new PublicKey(HT.nanNhan);
  const keTanCong = new PublicKey(HT.keTanCong);
  const mint = new PublicKey(HT.mint);
  const banBe = new PublicKey(HT.banBe);

  const t0 = Date.now();
  const { blockhash } = await conn.getLatestBlockhash();

  // ── 1 · giao dịch bình thường: Custos KHÔNG được cản vô lý ────────────────
  const txThuong = dungGiaoDichBinhThuong({
    nguoiKy,
    nguoiNhan: banBe,
    lamports: 10_000_000,
    blockhash,
  });
  const qThuong = await kiemTruocKhiKy({
    inspect,
    connection: conn,
    interpret: dienGiaiKhongAI,
    tx: txThuong,
    viNguoiDung: nguoiKy,
    dAppKhai: { type: "transfer", from: "SOL" },
  });
  console.log(`\n[1] chuyển 0,01 SOL — mức ${qThuong.ketQua?.level ?? "?"} · quyết định "${qThuong.cho}"`);
  ck("giao dịch bình thường không bị CHẶN", qThuong.cho !== "chan", `bị chặn: ${qThuong.loi ?? qThuong.ketQua?.level}`);

  // Mốc "tới kết quả đầu tiên": dừng đồng hồ NGAY SAU kịch bản đầu, không tính
  // 5 lượt benchmark bên dưới. Bản trước đo cả script và con số phồng từ 10,8
  // lên 14,6 giây — phép đo tự làm hỏng chính thứ nó đo.
  const msKetQuaDau = Date.now() - t0;

  // ── 2 · dApp khai "airdrop" nhưng rút sạch token và đổi chủ tài khoản ──────
  const txGia = dungGiaoDichGiaDanhAirdrop({
    nguoiKy,
    keTanCong,
    mint,
    soLuong: BigInt(HT.soLuong),
    blockhash,
    // Tài khoản token lấy từ cấu hình của dApp, KHÔNG suy ra từ ATA — xem dapp.js.
    taiKhoanNguon: new PublicKey(HT.taiKhoanNanNhan),
    taiKhoanDich: new PublicKey(HT.taiKhoanKeTanCong),
  });
  /*
   * ĐO NHIỀU LƯỢT, LẤY TRUNG VỊ — không lấy một mẫu.
   *
   * Bản trước đo đúng MỘT lần rồi đưa con số đó lên README. Độ trễ mạng dao động,
   * nên hai lượt chạy liên tiếp cho 1247 ms và 1079 ms: con số công bố sai ở gần
   * như mọi lần chạy lại, và bài kiểm đối chiếu README thì đỏ oan.
   *
   * Một mẫu không phải một phép đo. `do-chi-phi.ts` đã làm đúng cách này từ trước.
   */
  const LUOT = 5;
  const tre = [];
  let qGia;
  for (let i = 0; i < LUOT; i++) {
    const t1 = Date.now();
    qGia = await kiemTruocKhiKy({
      inspect,
      connection: conn,
      interpret: dienGiaiKhongAI,
      tx: txGia,
      viNguoiDung: nguoiKy,
      dAppKhai: { type: "airdrop" },
    });
    tre.push(Date.now() - t1);
  }
  tre.sort((a, b) => a - b);
  const msGia = tre[Math.floor(tre.length / 2)];
  console.log(`\n[2] "nhận airdrop" — mức ${qGia.ketQua?.level ?? "?"} · quyết định "${qGia.cho}" · trung vị ${msGia} ms trên ${LUOT} lượt (${tre[0]}–${tre[tre.length - 1]})`);
  console.log(`    mã lý do: ${(qGia.ketQua?.reasonCodes ?? []).join(", ") || "(không có)"}`);
  console.log(`    đọc hiểu: ${qGia.ketQua?.coverage?.analyzed}/${qGia.ketQua?.coverage?.total} lệnh`);
  ck("giao dịch giả danh airdrop bị CHẶN", qGia.cho === "chan", `quyết định "${qGia.cho}"`);
  ck("có mã lý do kèm theo, không chặn suông", (qGia.ketQua?.reasonCodes ?? []).length > 0, "không có mã lý do");

  // ── 3 · FAIL CLOSED: RPC chết thì KHÔNG được thành "ký được" ──────────────
  const connHong = new Connection("http://127.0.0.1:1", "confirmed");
  const qHong = await kiemTruocKhiKy({
    inspect,
    connection: connHong,
    interpret: dienGiaiKhongAI,
    tx: txGia,
    viNguoiDung: nguoiKy,
    dAppKhai: { type: "airdrop" },
  });
  console.log(`\n[3] RPC chết — quyết định "${qHong.cho}"`);
  ck("RPC hỏng KHÔNG trở thành ký được", qHong.cho === "chan", `quyết định "${qHong.cho}"`);
  ck("có lý do kỹ thuật để hiển thị", Boolean(qHong.loi), "không có thông điệp lỗi");

  const hong = ket.filter((k) => !k.dat);
  console.log(
    `\n=== ${hong.length === 0 ? "TẤT CẢ PASS" : `${hong.length} FAIL`} · tổng ${Date.now() - t0} ms ===`,
  );
  console.log(
    JSON.stringify({
      doLuc: new Date().toISOString(),
      rpc: HT.rpc,
      msKetQuaDau,
      msMotLuotKiem: msGia,
      msLuot: tre,
      kiem: ket,
    }),
  );
  process.exit(hong.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("LỖI:", e instanceof Error ? e.message : e);
  process.exit(1);
});
