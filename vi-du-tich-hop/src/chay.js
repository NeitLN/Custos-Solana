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

/*
 * ĐẠT thì KHÔNG được mang theo câu mô tả thất bại.
 *
 * Bản trước lưu `chiTiet` bất kể `dat`, nên `ket-qua.json` công khai có những dòng
 * tự mâu thuẫn: `{"ten":"có mã lý do kèm theo","dat":true,"chiTiet":"không có mã lý
 * do"}`. Ai đọc file đó — kể cả giám khảo — thấy một check PASS kèm câu nói nó
 * FAIL, và không biết tin vế nào.
 *
 * `chiTiet` là LÝ DO THẤT BẠI. Đạt rồi thì lý do đó không tồn tại.
 */
function ck(ten, dat, lyDoThatBai) {
  ket.push({ ten, dat, chiTiet: dat ? "đạt" : lyDoThatBai });
  console.log(`  ${dat ? "PASS" : "FAIL"}  ${ten}${dat ? "" : `   <<< ${lyDoThatBai}`}`);
}

/*
 * MỘT LƯỢT HỎNG VÌ MẠNG KHÔNG ĐƯỢC GHI THÀNH LỖI PHÁT HIỆN.
 *
 * Khi Devnet chậm, `inspect()` quá hạn → shim fail-closed đúng hợp đồng và trả
 * `cho: "chan", ketQua: null, loi: "Custos quá hạn sau 12000 ms"`. Ba check của kịch
 * bản bình thường cùng đỏ, và bản trước ghi vào bằng chứng:
 *
 *     chiTiet: 'quyết định "chan"'       ← đúng, nhưng vô dụng
 *     failureCategory: assertion_failure ← SAI: không assertion nào sai cả
 *
 * `qThuong.loi` giữ nguyên nhân thật nhưng chưa bao giờ được in ra hay ghi lại. Với
 * một sản phẩm bảo mật, nhãn sai đó nói xấu chính engine luật của mình: người đọc
 * bằng chứng thấy "phát hiện sai" ở đúng chỗ thật ra là "mạng hỏng".
 */
const HO_TANG = [
  [/quá hạn sau \d+ ms/i, "timeout"],
  [/blockhash/i, "blockhash_error"],
  [/429|rate.?limit|too many requests/i, "rpc_rate_limit"],
  [/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|network/i, "rpc_error"],
  [/failed to (get|simulate)|simulation/i, "simulation_error"],
];

/** Phân loại một thông điệp lỗi hạ tầng. */
function phanLoaiLoi(loi) {
  if (!loi) return null;
  for (const [mau, ten] of HO_TANG) if (mau.test(loi)) return ten;
  return "loi_khong_ro";
}

/** Đồng hồ theo CHẶNG — để biết lượt hỏng dừng ở đâu, không chỉ biết nó hỏng. */
const chang = {};
async function doChang(ten, viec) {
  const t = Date.now();
  try {
    return await viec;
  } finally {
    chang[ten] = Date.now() - t;
  }
}

/*
 * BLOCKHASH PHẢI CÓ HẠN RIÊNG, VÀ PHẢI MỚI CHO TỪNG KỊCH BẢN.
 *
 * Bản trước gọi `getLatestBlockhash()` một lần, không hạn, rồi dùng lại cho cả kịch
 * bản 2 — vốn chạy sau kịch bản 1 cộng năm lượt benchmark. Hai hệ quả:
 *
 *   · Devnet treo ngay ở lệnh đó thì `main()` ném TRƯỚC khi in JSON, nên bằng chứng
 *     không có gì để đọc và harness chỉ ghi được `harness_parse_error`.
 *   · Trên mạng chậm, blockhash dùng lại có thể đã quá hạn khi tới kịch bản 2 — và
 *     một mô phỏng hỏng vì blockhash cũ trông y hệt một phát hiện sai.
 */
const HAN_BLOCKHASH_MS = 8_000;

function layBlockhash(conn, nhan) {
  return doChang(
    `blockhash_${nhan}`,
    (async () => {
      let dongHo;
      const chuong = new Promise((_, tuChoi) => {
        dongHo = setTimeout(
          () => tuChoi(new Error(`lấy blockhash quá hạn sau ${HAN_BLOCKHASH_MS} ms`)),
          HAN_BLOCKHASH_MS,
        );
      });
      try {
        const { blockhash } = await Promise.race([conn.getLatestBlockhash(), chuong]);
        return blockhash;
      } finally {
        clearTimeout(dongHo);
      }
    })(),
  );
}

/** Lý do thất bại: khi hỏng vì hạ tầng thì nói ra hạ tầng, đừng nói "quyết định chan". */
function vietLyDo(q, macDinh) {
  return q.lyDo === "khong_kiem_duoc" ? `${phanLoaiLoi(q.loi)} — ${q.loi}` : macDinh;
}

async function main() {
  const conn = new Connection(HT.rpc, "confirmed");
  const nguoiKy = new PublicKey(HT.nanNhan);
  const keTanCong = new PublicKey(HT.keTanCong);
  const mint = new PublicKey(HT.mint);
  const banBe = new PublicKey(HT.banBe);

  const t0 = Date.now();
  const blockhash = await layBlockhash(conn, "1");

  // ── 1 · giao dịch bình thường: Custos KHÔNG được cản vô lý ────────────────
  const txThuong = dungGiaoDichBinhThuong({
    nguoiKy,
    nguoiNhan: banBe,
    lamports: 10_000_000,
    blockhash,
  });
  const qThuong = await doChang("inspect_1", kiemTruocKhiKy({
    inspect,
    connection: conn,
    interpret: dienGiaiKhongAI,
    tx: txThuong,
    viNguoiDung: nguoiKy,
    dAppKhai: { type: "transfer", from: "SOL" },
  }));
  console.log(`\n[1] chuyển 0,01 SOL — mức ${qThuong.ketQua?.level ?? "?"} · quyết định "${qThuong.cho}"`);
  /*
   * Kiểm ĐÚNG hợp đồng, không kiểm "không bị chặn".
   *
   * Bản trước chỉ hỏi `cho !== "chan"`, nên một giao dịch lành tính bị trả về "hoi"
   * vẫn PASS — trong khi tài liệu nói luồng lành tính dẫn thẳng tới ký. Bài kiểm
   * lỏng hơn lời hứa thì nó không bảo vệ lời hứa.
   */
  if (qThuong.lyDo === "khong_kiem_duoc") {
    console.log(`      ✖ KHÔNG KIỂM ĐƯỢC [${phanLoaiLoi(qThuong.loi)}] ${qThuong.loi}`);
  }
  ck(
    "giao dịch bình thường cho KÝ",
    qThuong.cho === "ky",
    vietLyDo(qThuong, `quyết định "${qThuong.cho}"`),
  );
  ck(
    "giao dịch bình thường ở mức safe",
    qThuong.ketQua?.level === "safe",
    vietLyDo(qThuong, `mức ${qThuong.ketQua?.level ?? "?"}`),
  );
  /*
   * SO undefined VỚI undefined THÌ LUÔN BẰNG NHAU.
   *
   * Bản trước chỉ hỏi `analyzed === total`. Khi `ketQua` là null — đúng lúc RPC
   * hỏng — cả hai vế là `undefined`, nên check này XANH giữa một lượt không đọc
   * được gì cả. Lượt ép RPC chết cho đúng 2 FAIL thay vì 3, và con số "FAIL 2/8"
   * trong báo cáo review là cùng một hiện tượng.
   *
   * Một check xanh khi KHÔNG CÓ dữ liệu còn tệ hơn không có check.
   */
  ck(
    "giao dịch bình thường đọc hiểu hết lệnh",
    typeof qThuong.ketQua?.coverage?.total === "number" &&
      qThuong.ketQua.coverage.analyzed === qThuong.ketQua.coverage.total,
    vietLyDo(
      qThuong,
      `đọc hiểu ${qThuong.ketQua?.coverage?.analyzed}/${qThuong.ketQua?.coverage?.total}`,
    ),
  );

  // Mốc "tới kết quả đầu tiên": dừng đồng hồ NGAY SAU kịch bản đầu, không tính
  // 5 lượt benchmark bên dưới. Bản trước đo cả script và con số phồng từ 10,8
  // lên 14,6 giây — phép đo tự làm hỏng chính thứ nó đo.
  const msKetQuaDau = Date.now() - t0;

  // ── 2 · dApp khai "airdrop" nhưng rút sạch token và đổi chủ tài khoản ──────
  // Blockhash MỚI: kịch bản này chạy sau kịch bản 1 cộng năm lượt benchmark. Dùng
  // lại blockhash cũ trên mạng chậm là tự tạo một lỗi mô phỏng trông như phát hiện sai.
  const blockhash2 = await layBlockhash(conn, "2");
  const txGia = dungGiaoDichGiaDanhAirdrop({
    nguoiKy,
    keTanCong,
    mint,
    soLuong: BigInt(HT.soLuong),
    blockhash: blockhash2,
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
  ck("giao dịch nguy hiểm KHÔNG bao giờ là safe", qGia.ketQua?.level !== "safe", `mức ${qGia.ketQua?.level}`);

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
  console.log(JSON.stringify(payload({ msKetQuaDau, msMotLuotKiem: msGia, msLuot: tre })));
  process.exit(hong.length === 0 ? 0 : 1);
}

/*
 * Một chỗ duy nhất dựng payload, để đường HỎNG và đường XONG không thể lệch nhau.
 *
 * `hoTang` là câu trả lời cho "lượt này hỏng vì phát hiện hay vì mạng". Harness đọc
 * trường này thay vì đoán từ việc có check nào đỏ.
 */
function payload(them = {}) {
  const hongHaTang = ket.find((k) => !k.dat && /^(timeout|rpc_|blockhash_|simulation_|loi_khong_ro)/.test(k.chiTiet));
  return {
    doLuc: new Date().toISOString(),
    rpc: HT.rpc,
    chang,
    hoTang: hongHaTang ? { loai: hongHaTang.chiTiet.split(" — ")[0], chiTiet: hongHaTang.chiTiet } : null,
    kiem: ket,
    ...them,
  };
}

/*
 * HỎNG SỚM CŨNG PHẢI ĐỂ LẠI PAYLOAD.
 *
 * Bản trước: `getLatestBlockhash()` treo → `main()` ném → chỉ in "LỖI: ..." và thoát.
 * Không dòng JSON nào, nên harness chỉ ghi được `harness_parse_error` — đúng chữ,
 * nhưng giấu mất việc lượt đó chết ở chặng lấy blockhash.
 */
main().catch((e) => {
  const loi = e instanceof Error ? e.message : String(e);
  console.error(`LỖI: ${loi}`);
  ck("lượt chạy hoàn tất", false, `${phanLoaiLoi(loi)} — ${loi}`);
  console.log(JSON.stringify(payload()));
  process.exit(1);
});
