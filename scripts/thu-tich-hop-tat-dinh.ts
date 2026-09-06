import { inspect } from "../packages/core/src/inspect.ts";
import { dienGiaiKhongAI } from "../packages/ai/src/index.ts";
// @ts-expect-error — JavaScript thuần, cố ý: đúng file mà bên tích hợp chép về.
import { kiemTruocKhiKy } from "../vi-du-tich-hop/src/tich-hop.js";
import { dungHienTruongGia } from "./hienTruongGia.ts";

/**
 * CỔNG TÍCH HỢP TẤT ĐỊNH — không mạng, không Devnet, không ngẫu nhiên.
 *
 *   npm run thu-tich-hop:deterministic
 *
 * Vì sao tách khỏi `npm run thu-tich-hop:devnet`:
 *
 * Bài live chạy trên RPC Devnet công cộng. Nó chứng minh được "kết nối thật hoạt
 * động", nhưng KHÔNG chứng minh được hợp đồng bảo mật một cách lặp lại — mạng chậm
 * là cả ba check của kịch bản bình thường cùng đỏ. Người review gặp đúng chuyện đó
 * và bộ đo ghi nó thành `assertion_failure`, tức nói xấu engine luật bằng dữ liệu
 * sai.
 *
 * Hai câu hỏi khác nhau thì phải có hai lệnh khác nhau:
 *
 *   :deterministic  Custos xử ĐÚNG chưa?          fixture · chạy được ở CI · phải 100%
 *   :devnet         Kết nối thật còn sống không?  RPC công cộng · sức khoẻ mạng
 *
 * Bài này đi qua ĐÚNG ranh giới mà một bên tích hợp dùng — `kiemTruocKhiKy()` gọi
 * `inspect()` thật — chứ không gọi thẳng engine. Một engine đúng mà lớp tích hợp
 * dịch sai vẫn là sản phẩm sai.
 */

const NL = String.fromCharCode(10);
const ket: Array<{ ten: string; dat: boolean; chiTiet: string }> = [];

function ck(ten: string, dat: boolean, lyDoThatBai: string) {
  ket.push({ ten, dat, chiTiet: dat ? "đạt" : lyDoThatBai });
  console.log(`  ${dat ? "PASS" : "FAIL"}  ${ten}${dat ? "" : `   <<< ${lyDoThatBai}`}`);
}

const HT = dungHienTruongGia();
const vi = { toBase58: () => HT.nanNhan.publicKey.toBase58() };

type QuyetDinh = {
  cho: string;
  lyDo: string;
  ketQua: { level: string; coverage: { analyzed: number; total: number } } | null;
  loi: string | null;
};

const goi = (conn: unknown, tx: unknown, them: Record<string, unknown> = {}) =>
  kiemTruocKhiKy({
    inspect,
    connection: conn,
    interpret: dienGiaiKhongAI,
    tx,
    viNguoiDung: vi,
    ...them,
  }) as Promise<QuyetDinh>;

/** RPC chết: mọi lệnh đều ném. Đây là Devnet lúc mất mạng, dựng lại tất định. */
const rpcChet = {
  getAddressLookupTable: async () => {
    throw new Error("fetch failed");
  },
  getMultipleAccountsInfo: async () => {
    throw new Error("fetch failed");
  },
  simulateTransaction: async () => {
    throw new Error("fetch failed");
  },
};

/** RPC treo: không bao giờ trả lời. Đây là Devnet lúc chậm, dựng lại tất định. */
const rpcTreo = {
  getAddressLookupTable: () => new Promise(() => {}),
  getMultipleAccountsInfo: () => new Promise(() => {}),
  simulateTransaction: () => new Promise(() => {}),
};

async function main() {
  console.log("CỔNG TÍCH HỢP TẤT ĐỊNH · fixture, không mạng" + NL);

  // ── 1 · giao dịch tấn công ⇒ ĐỎ và CHẶN ────────────────────────────────
  const qTanCong = await goi(HT.rpcGia({ doiChu: true, chuyenTien: true }), HT.txTanCong());
  console.log(`[1] giả danh airdrop — mức ${qTanCong.ketQua?.level} · "${qTanCong.cho}"`);
  ck("tấn công bị CHẶN", qTanCong.cho === "chan", `quyết định "${qTanCong.cho}"`);
  ck("tấn công ở mức danger", qTanCong.ketQua?.level === "danger", `mức ${qTanCong.ketQua?.level}`);
  ck(
    "chặn vì PHÁT HIỆN, không phải vì hỏng",
    qTanCong.lyDo === "phat_hien",
    `lý do "${qTanCong.lyDo}"`,
  );

  // ── 2 · giao dịch lành tính ⇒ KHÔNG bị gắn Đỏ ──────────────────────────
  const qLanh = await goi(HT.rpcGia({ doiChu: false, chuyenTien: true }), HT.txLanhTinh());
  console.log(
    `${NL}[2] chuyển token cho bạn — mức ${qLanh.ketQua?.level} · "${qLanh.cho}" · đọc hiểu ${qLanh.ketQua?.coverage.analyzed}/${qLanh.ketQua?.coverage.total}`,
  );
  ck(
    "giao dịch lành tính KHÔNG bị gắn Đỏ",
    qLanh.ketQua?.level !== "danger",
    `mức ${qLanh.ketQua?.level} — báo nhầm`,
  );
  ck("giao dịch lành tính KHÔNG bị chặn", qLanh.cho !== "chan", `quyết định "${qLanh.cho}"`);

  // ── 3 · RPC chết ⇒ CHẶN, và là "không kiểm được" ───────────────────────
  const qChet = await goi(rpcChet, HT.txTanCong());
  console.log(`${NL}[3] RPC chết — "${qChet.cho}" · lý do "${qChet.lyDo}"`);
  ck("RPC chết KHÔNG thành ký được", qChet.cho === "chan", `quyết định "${qChet.cho}"`);
  ck(
    "RPC chết KHÔNG thành mức safe",
    qChet.ketQua?.level !== "safe",
    `mức ${qChet.ketQua?.level}`,
  );
  ck(
    "RPC chết là KHÔNG KIỂM ĐƯỢC, không phải phát hiện",
    qChet.lyDo === "khong_kiem_duoc",
    `lý do "${qChet.lyDo}" — nhãn này quyết định ví hiện cảnh báo gì cho người dùng`,
  );
  ck("RPC chết giữ được nguyên nhân kỹ thuật", Boolean(qChet.loi), "không có thông điệp lỗi");

  // ── 4 · RPC treo ⇒ quá hạn, vẫn CHẶN ───────────────────────────────────
  const qTreo = await goi(rpcTreo, HT.txTanCong(), { hanMs: 50 });
  console.log(`${NL}[4] RPC treo — "${qTreo.cho}" · lý do "${qTreo.lyDo}"`);
  ck("quá hạn KHÔNG thành ký được", qTreo.cho === "chan", `quyết định "${qTreo.cho}"`);
  ck("quá hạn là KHÔNG KIỂM ĐƯỢC", qTreo.lyDo === "khong_kiem_duoc", `lý do "${qTreo.lyDo}"`);
  ck("quá hạn nói rõ là quá hạn", /quá hạn/.test(qTreo.loi ?? ""), `lỗi "${qTreo.loi}"`);

  // ── 5 · lớp AI hỏng ⇒ verdict tất định GIỮ NGUYÊN ──────────────────────
  //
  // Đây là bất biến quan trọng nhất của kiến trúc: `level` do L2 sinh ra, và lớp mô
  // hình ngôn ngữ không được chạm vào. Nếu AI hỏng mà verdict đổi, nghĩa là AI đang
  // ở trên đường quyết định — đúng thứ `CUSTOS.md` khoá lại.
  const aiHong = () => {
    throw new Error("mô hình ngôn ngữ không phản hồi");
  };
  const qAiHong = await goi(HT.rpcGia({ doiChu: true, chuyenTien: true }), HT.txTanCong(), {
    interpret: aiHong,
  });
  console.log(`${NL}[5] lớp AI hỏng — mức ${qAiHong.ketQua?.level ?? "?"} · "${qAiHong.cho}"`);
  ck(
    "AI hỏng KHÔNG làm đổi verdict tất định",
    qAiHong.ketQua === null || qAiHong.ketQua.level === qTanCong.ketQua?.level,
    `mức ${qAiHong.ketQua?.level} ≠ ${qTanCong.ketQua?.level}`,
  );
  ck("AI hỏng KHÔNG mở đường ký", qAiHong.cho !== "ky", `quyết định "${qAiHong.cho}"`);

  const hong = ket.filter((k) => !k.dat);
  console.log(
    `${NL}=== ${hong.length === 0 ? "TẤT CẢ PASS" : `${hong.length} FAIL`} · ${ket.length} kiểm tra ===`,
  );
  if (hong.length > 0) {
    for (const h of hong) console.error(`  ✖ ${h.ten} — ${h.chiTiet}`);
    process.exit(1);
  }
  console.log("TAT-DINH-OK");
}

main().catch((e) => {
  console.error(`LỖI: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
