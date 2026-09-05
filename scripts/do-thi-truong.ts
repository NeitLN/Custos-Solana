/**
 * MÔ HÌNH QUY MÔ THỊ TRƯỜNG — BOTTOM-UP, TỪ ĐƠN VỊ KHÁCH HÀNG THẬT.
 *
 *   node --experimental-strip-types scripts/do-thi-truong.ts
 *
 * KHÔNG lấy tổng vốn hoá crypto nhân một tỉ lệ. Cách đó ra số to và không nói lên
 * gì: Custos không bán cho thị trường crypto, nó bán cho những đội có luồng ký
 * giao dịch. Đơn vị đếm là **đội**, không phải đô-la lưu thông trên chuỗi.
 *
 * MỖI BIẾN PHẢI KHAI NGUỒN. Hai loại, và không được lẫn:
 *
 *   NGUON    — tra được, có link và ngày tra. Ai cũng kiểm lại được.
 *   GIA_DINH — đội tự đặt. Ghi kèm lý do, và phải nằm trong kịch bản thấp/cao.
 *
 * Một mô hình mà mọi biến đều là giả định thì vẫn có ích — nếu nó nói thẳng điều
 * đó và chỉ ra biến nào quyết định kết quả. Một mô hình giấu giả định sau vẻ chính
 * xác thì tệ hơn không có.
 */
import { mkdirSync, writeFileSync } from "node:fs";

type Bien = {
  ten: string;
  thap: number;
  goc: number;
  cao: number;
  loai: "NGUON" | "GIA_DINH";
  /** Link + ngày tra với NGUON; lý do đặt số với GIA_DINH. */
  vi: string;
};

const BIEN: Bien[] = [
  {
    ten: "soAppTrongDAppStore",
    thap: 1000,
    goc: 1000,
    cao: 1561,
    loai: "NGUON",
    vi:
      "solana.com/news/solana-ecosystem-roundup-june-2026 — 'The Solana Mobile dApp Store " +
      "crossed 1,000 apps', tra ngày 05/09/2026. Cận CAO 1.561 chỉ thấy ở nguồn thứ cấp " +
      "(inleo.substack.com) nên để làm cận trên, KHÔNG dùng làm số gốc.",
  },
  {
    ten: "tiLeCoLuongKyGiaoDich",
    thap: 0.5,
    goc: 0.7,
    cao: 0.85,
    loai: "GIA_DINH",
    vi:
      "Không phải app nào trong store cũng bắt người dùng ký giao dịch — có app tra cứu, " +
      "app đọc tin. Custos chỉ có nghĩa với app CÓ luồng ký. Chưa đếm được, nên đặt dải rộng.",
  },
  {
    ten: "tiLeChuaCoDoiSecurityRieng",
    thap: 0.6,
    goc: 0.8,
    cao: 0.9,
    loai: "GIA_DINH",
    vi:
      "ICP là đội CHƯA có đội transaction-security riêng. Ví lớn tự xây; phần lớn app nhỏ " +
      "thì không. Chưa khảo sát, nên đây là giả định — và là giả định buyer interview sẽ " +
      "kiểm đầu tiên nếu đội chạy được.",
  },
  {
    ten: "tiLeVietNamSEA",
    thap: 0.03,
    goc: 0.06,
    cao: 0.12,
    loai: "GIA_DINH",
    vi:
      "Beachhead của Custos là đội phục vụ người dùng Việt Nam / Đông Nam Á. KHÔNG tra được " +
      "tỉ lệ này từ nguồn công khai nào — dApp store không phân loại theo khu vực đội phát " +
      "triển. Dải đặt rộng gấp bốn lần vì đó là mức không chắc chắn thật.",
  },
  {
    ten: "acvThangUsd",
    thap: 20,
    goc: 49,
    cao: 100,
    loai: "GIA_DINH",
    vi:
      "Neo vào giá hạ tầng liền kề mà người mua ĐÃ quen trả: Helius Developer $49/tháng " +
      "(helius.dev/pricing, tra 30/08/2026 — xem docs/DON-VI-KINH-TE.md). Đó là bằng chứng " +
      "người mua quen trả tiền theo tháng cho hạ tầng, KHÔNG phải price validation cho " +
      "Custos. Custos chưa có giá bán.",
  },
  {
    ten: "soDoiTiepCanDuoc12Thang",
    thap: 30,
    goc: 60,
    cao: 120,
    loai: "GIA_DINH",
    vi: "Năng lực tiếp cận thật của một đội 4 sinh viên trong 12 tháng. Chưa thử lần nào.",
  },
  {
    ten: "tiLePhanHoi",
    thap: 0.1,
    goc: 0.2,
    cao: 0.35,
    loai: "GIA_DINH",
    vi: "Tỉ lệ trả lời tin nhắn lạnh. Chưa gửi tin nào nên chưa có số thật.",
  },
  {
    ten: "tiLeTuPhanHoiThanhTraTien",
    thap: 0.05,
    goc: 0.15,
    cao: 0.3,
    loai: "GIA_DINH",
    vi: "Từ trả lời tới trả tiền. Đây là biến đội KHÔNG có dữ liệu nào, kể cả gián tiếp.",
  },
];

const lay = (ten: string, kb: "thap" | "goc" | "cao") => {
  const b = BIEN.find((x) => x.ten === ten);
  if (!b) throw new Error(`thiếu biến ${ten}`);
  return b[kb];
};

function tinh(kb: "thap" | "goc" | "cao") {
  const v = (t: string) => lay(t, kb);
  // TAM: đội có luồng ký, trên tập ĐẾM ĐƯỢC là dApp Store. Đây là CẬN DƯỚI của
  // toàn hệ sinh thái, không phải toàn bộ — nói rõ để không ai đọc thành TAM thật.
  const tamDoi = v("soAppTrongDAppStore") * v("tiLeCoLuongKyGiaoDich");
  const samDoi = tamDoi * v("tiLeChuaCoDoiSecurityRieng") * v("tiLeVietNamSEA");
  const somDoi =
    v("soDoiTiepCanDuoc12Thang") * v("tiLePhanHoi") * v("tiLeTuPhanHoiThanhTraTien");
  const nam = v("acvThangUsd") * 12;
  return {
    tamDoi: Math.round(tamDoi),
    samDoi: Math.round(samDoi),
    somDoi: Math.round(somDoi * 10) / 10,
    tamUsdNam: Math.round(tamDoi * nam),
    samUsdNam: Math.round(samDoi * nam),
    somUsdNam: Math.round(somDoi * nam),
  };
}

const kq = { thap: tinh("thap"), goc: tinh("goc"), cao: tinh("cao") };

/* ── biến nào quyết định kết quả ──────────────────────────────────────────── */
function doNhay() {
  const goc = tinh("goc").somUsdNam;
  return BIEN.filter((b) => b.thap !== b.cao)
    .map((b) => {
      const luu = { ...b };
      // Đẩy riêng một biến về cận thấp rồi cận cao, giữ mọi biến khác ở gốc.
      Object.assign(b, { goc: b.thap });
      const duoi = tinh("goc").somUsdNam;
      Object.assign(b, { goc: b.cao });
      const tren = tinh("goc").somUsdNam;
      Object.assign(b, luu);
      return { bien: b.ten, loai: b.loai, duoi, tren, dai: tren - duoi };
    })
    .sort((a, b) => b.dai - a.dai);
}

const nhay = doNhay();
const soGiaDinh = BIEN.filter((b) => b.loai === "GIA_DINH").length;

mkdirSync("data/thi-truong", { recursive: true });
writeFileSync(
  "data/thi-truong/quy-mo.json",
  JSON.stringify({ doLuc: new Date().toISOString(), bien: BIEN, ketQua: kq, doNhay: nhay }, null, 2) + "\n",
);

const usd = (n: number) => "$" + n.toLocaleString("en-US");
console.log(`\nQUY MÔ THỊ TRƯỜNG — bottom-up\n`);
console.log(`  ${soGiaDinh}/${BIEN.length} biến là GIẢ ĐỊNH, chỉ ${BIEN.length - soGiaDinh} tra được.\n`);
console.log(`  ${"".padEnd(6)} ${"đội".padStart(8)} ${"USD/năm".padStart(12)}`);
for (const [ten, k] of [["thấp", kq.thap], ["gốc", kq.goc], ["cao", kq.cao]] as const) {
  console.log(`  TAM ${ten.padEnd(5)} ${String(k.tamDoi).padStart(6)} ${usd(k.tamUsdNam).padStart(14)}`);
  console.log(`  SAM ${ten.padEnd(5)} ${String(k.samDoi).padStart(6)} ${usd(k.samUsdNam).padStart(14)}`);
  console.log(`  SOM ${ten.padEnd(5)} ${String(k.somDoi).padStart(6)} ${usd(k.somUsdNam).padStart(14)}\n`);
}
console.log(`  Biến quyết định kết quả nhiều nhất (SOM USD/năm):`);
for (const n of nhay.slice(0, 3)) {
  console.log(`    ${n.bien.padEnd(30)} ${usd(n.duoi)} → ${usd(n.tren)}  [${n.loai}]`);
}
console.log(`\n→ data/thi-truong/quy-mo.json`);
