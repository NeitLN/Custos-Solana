/**
 * SO SÁNH BA BASELINE — Custos thêm được gì. Thẻ TB-B06.
 *
 *   node --experimental-strip-types scripts/ky-thuat/so-baseline-b06.ts
 *   npm run so-baseline
 *
 * **KHÔNG CHẠM MẠNG.** Chạy trên Facts đã đóng băng của bộ seed.
 *
 * BẢN FACTS NÀO — và vì sao câu hỏi này quan trọng ở đúng một ca.
 *
 * Bảng dưới đọc `data/seed/facts/<id>.json`, tức **ảnh chụp L1 ngày 21/08**. Với bốn
 * trên năm ca, bản đóng băng và L1 hôm nay cho cùng kết luận. Ca `R09-pos` thì không,
 * và khác biệt đó là một bản vá đã có thật:
 *
 *   · Facts 21/08: `accounts: 2` với `lamportsAfter: 0`, `solDelta` 2 mục ⇒ luật 13
 *     phát `SOL_ROI_VI` — một cáo buộc dựng trên trạng thái sau của một mô phỏng ĐÃ
 *     HỎNG, tức một con số không có thật.
 *   · L1 hôm nay: `accounts: 0`, `solDelta` rỗng, verdict `MO_PHONG_HONG` +
 *     `TRANG_THAI_DO_KHUYET`. Cổng `coDuLieuAccount` (`l1/fetch.ts`) chặn việc nạp
 *     trạng thái sau khi mô phỏng không trả dữ liệu account.
 *
 * Nên ca B06-3 được ghi kèm CẢ HAI số. Ghi mỗi bản đóng băng là tố sản phẩm một lỗi
 * đã vá; ghi mỗi bản mới là giấu mất một ca mà baseline "chỉ xem delta" thắng Custos
 * bản cũ — và thẻ B06 đòi lưu đúng loại ca đó.
 *
 * Thẻ đòi ba baseline có phạm vi định nghĩa TRƯỚC, cùng dataset, cùng điều kiện:
 *
 *   B1 — đọc top-level instruction cơ bản
 *   B2 — chỉ xem balance delta
 *   B3 — pipeline Custos đầy đủ (`danhGia`, tức L1 → L2 thật)
 *
 * VÀ nó cấm một thứ cụ thể: *"không cố tình làm hỏng baseline để tạo thắng lợi"*.
 * Nên hai baseline đầu được viết ở mức **tốt nhất mà phạm vi của chúng cho phép**:
 *
 *   · B1 đọc `decoded.kind` của mọi lệnh top-level — tức nó có đủ decoder của
 *     Custos, chỉ thiếu phần nhìn vào inner instruction. Nó KHÔNG bị bịt mắt.
 *   · B2 đọc `solDelta` VÀ chênh lệch `amount` của token account — một ví thật hoàn
 *     toàn tính được cả hai. Nó không bị giới hạn còn mỗi SOL.
 *
 * Nếu vẫn muốn baseline yếu hơn nữa thì kết quả sẽ đẹp hơn và vô nghĩa hơn.
 *
 * ĐIỀU SO SÁNH NÀY **KHÔNG** LÀ:
 *
 *   Nó **không** so Custos với Phantom, Blockaid hay bất kỳ sản phẩm nào. Ba baseline
 *   là ba CÁCH TRIỂN KHAI được mô tả trong chính file này, không phải ba sản phẩm.
 *   Nói "hơn Phantom" cần chạy Phantom, và đội chưa làm điều đó.
 */
import { readFileSync } from "node:fs";
import { giaiDongBangFacts } from "../../packages/core/src/facts-io.ts";
import { danhGia } from "../../packages/core/src/l2/evaluate.ts";
import { chiLaThongTin } from "../../packages/core/src/constants.ts";
import type { Facts } from "../../packages/core/src/facts.ts";

const docFacts = (id: string): Facts =>
  giaiDongBangFacts(readFileSync(`data/seed/facts/${id}.json`, "utf8"));

/**
 * Kỳ vọng do NGƯỜI gán, đọc từ `index.json`.
 *
 * Bảng này từng nói *"Custos im đúng (mẫu kỳ vọng `safe`)"* mà **không đọc `kyVong`**
 * — nó suy ra từ chính `level` của Custos. Một nhãn khẳng định đúng/sai dựa trên đầu
 * ra của thứ đang được chấm là một oracle vòng tròn: Custos im thì nhãn nói Custos
 * đúng, kể cả khi nó im sai.
 *
 * Nên kỳ vọng phải đến từ ngoài. Cùng nguồn mà `manifest-benchmark.ts` dùng, cùng lý
 * do (TB-B01).
 */
const KY_VONG: Map<string, { level: string }> = new Map(
  (
    JSON.parse(readFileSync("data/seed/index.json", "utf8")) as {
      mau: Array<{ id: string; kyVong: { level: string } }>;
    }
  ).mau.map((m) => [m.id, m.kyVong]),
);

/* ── B1 · Đọc top-level instruction ────────────────────────────────────────── */

/**
 * Một ví đọc danh sách lệnh và hiển thị cái nó nhận ra. Đây là cách phổ biến nhất,
 * và nó có đủ decoder — giới hạn DUY NHẤT là nó không đi xuống inner instruction.
 */
function b1(f: Facts): { thay: string[]; canhBao: boolean } {
  const top = f.instructions.filter((ix) => !ix.isInner);
  const thay = top.map((ix) =>
    ix.decoded ? `${ix.decoded.kind}` : `lệnh lạ (${ix.programId.slice(0, 8)}…)`,
  );
  // Cảnh báo khi có lệnh top-level không đọc hiểu được — mức tốt nhất B1 làm được.
  return { thay, canhBao: top.some((ix) => ix.decoded === null) };
}

/* ── B2 · Chỉ xem balance delta ────────────────────────────────────────────── */

/**
 * "Giao dịch này lấy đi bao nhiêu?" — đọc SOL và token của người ký.
 *
 * Cho nó cả hai nguồn (`solDelta` và `tokenAccounts.amount`), vì một ví thật tính
 * được cả hai. Ngưỡng: mất SOL vượt phí, hoặc token giảm.
 */
function b2(f: Facts): { thay: string[]; canhBao: boolean } {
  const thay: string[] = [];
  const dSol = f.solDelta[f.signer] ?? 0n;
  const phi = f.phiUocTinh ?? 5_000n;
  if (dSol < -phi) thay.push(`SOL giảm ${-dSol}`);

  let tokenGiam = false;
  for (const t of f.tokenAccounts) {
    if (t.ownerBefore !== f.signer) continue;
    if (t.amountAfter < t.amountBefore) {
      thay.push(`token ${t.mint.slice(0, 6)}… giảm ${t.amountBefore - t.amountAfter}`);
      tokenGiam = true;
    }
  }
  return { thay, canhBao: dSol < -phi || tokenGiam };
}

/* ── Năm ca thẻ nêu đích danh ──────────────────────────────────────────────── */

type Ca = { ma: string; id: string; mo: string; hoi: string };
const CAC_CA: Ca[] = [
  {
    ma: "B06-1",
    id: "R01-pos",
    mo: "đổi quyền sở hữu, KHÔNG đổi số dư",
    hoi: "tài khoản token đổi chủ sang ví lạ; `amount` giữ nguyên 500000000n",
  },
  {
    ma: "B06-2",
    id: "MN-02",
    mo: "hành vi nằm ở inner instruction (CPI)",
    hoi: "4 lệnh top-level, 10 lệnh inner — phần chạm tài sản nằm dưới CPI",
  },
  {
    ma: "B06-3",
    id: "R09-pos",
    mo: "dữ liệu thiếu — mô phỏng hỏng",
    hoi:
      "`simulationOk: false`. Facts 21/08 vẫn có `solDelta`; L1 hôm nay trả " +
      "`accounts: 0` và không suy ra chênh lệch nào — xem docstring đầu file",
  },
  {
    ma: "B06-4",
    id: "R04-neg",
    mo: "giao dịch hợp lệ",
    hoi: "coverage 1/1, mô phỏng thành công, chỉ mất phí",
  },
  {
    ma: "B06-5",
    id: "R13-neg",
    mo: "giao dịch hợp lệ thứ hai — SOL rời ví trong ngưỡng",
    hoi: "ca đối chứng của luật 13",
  },
];

const ket: Array<{
  ca: Ca;
  b1: ReturnType<typeof b1>;
  b2: ReturnType<typeof b2>;
  b3: { level: string; ma: string[]; chiThongTin: boolean };
  themGi: string;
  kyVong: string | null;
  khopKyVong: boolean | null;
}> = [];

for (const ca of CAC_CA) {
  const f = docFacts(ca.id);
  const r1 = b1(f);
  const r2 = b2(f);
  const l2 = danhGia(f);
  const r3 = {
    level: l2.level,
    ma: l2.reasonCodes,
    chiThongTin: l2.reasonCodes.length > 0 && chiLaThongTin(l2.reasonCodes),
  };

  /*
   * "Custos thêm gì" tính bằng SO SÁNH KẾT LUẬN, không bằng đếm chữ.
   *
   * Ba mức: cả hai baseline im mà Custos kêu (thêm nhiều nhất) · một baseline đã kêu
   * (Custos thêm lý do, không thêm việc phát hiện) · cả ba cùng im (không thêm gì).
   */
  const baselineKeu = r1.canhBao || r2.canhBao;
  const custosKeu = r3.level !== "safe";

  /*
   * Kỳ vọng của NGƯỜI, không phải của Custos. Xem `KY_VONG`.
   *
   * `nenKeu === false` nghĩa là người gán nhãn nói mẫu này lành. Chỉ khi đó mới được
   * gọi một baseline đang kêu là **báo nhầm**.
   */
  /*
   * `khong-phai-danger` là NHÃN KHOẢNG, không phải một mức.
   *
   * 17/38 mẫu dùng nó (cả 10 mẫu `real-mainnet`), và nó nghĩa là *"bất kỳ mức nào trừ
   * Đỏ"* — dùng khi người gán nhãn biết chắc mẫu không đáng bị buộc tội nhưng không
   * cam kết được giữa `safe` và `warning`.
   *
   * So bằng (`r3.level === kv.level`) sẽ báo LỆCH ở cả 17 mẫu đó — một con số sai do
   * so nhầm kiểu, không do sản phẩm. Quy ước đúng đã có ở `dataset.test.ts`, và bảng
   * này dùng lại y hệt thay vì phát minh cách so thứ hai.
   */
  const kv = KY_VONG.get(ca.id);
  const laKhoang = kv?.level === "khong-phai-danger";
  const nenKeu = kv ? (laKhoang ? null : kv.level !== "safe") : null;

  let themGi: string;
  if (custosKeu) {
    themGi = baselineKeu
      ? "thêm LÝ DO cụ thể; baseline đã kêu nhưng không nói được vì sao"
      : "THÊM PHÁT HIỆN — cả hai baseline im lặng";
  } else if (baselineKeu) {
    themGi =
      nenKeu === false
        ? `BASELINE BÁO NHẦM — kỳ vọng người gán là \`${kv!.level}\`, Custos im đúng`
        : nenKeu === true
          ? `CẢ HAI CÙNG SAI HƯỚNG — kỳ vọng \`${kv!.level}\` mà Custos im; baseline kêu đúng`
          : "Custos im mà baseline kêu — mẫu KHÔNG có kỳ vọng để đối chiếu";
  } else {
    themGi =
      nenKeu === true
        ? `CUSTOS BỎ LỌT — kỳ vọng \`${kv!.level}\` mà cả ba cùng im`
        : "KHÔNG thêm gì — cả ba cùng im, và đó là kết luận đúng";
  }

  // Custos có khớp kỳ vọng không — ghi riêng, không trộn vào câu "thêm gì".
  // Nhãn khoảng so bằng bất đẳng thức; nhãn mức so bằng đẳng thức.
  const khopKyVong = kv ? (laKhoang ? r3.level !== "danger" : r3.level === kv.level) : null;

  ket.push({ ca, b1: r1, b2: r2, b3: r3, themGi, kyVong: kv?.level ?? null, khopKyVong });
}

/* ── In bảng ───────────────────────────────────────────────────────────────── */

for (const k of ket) {
  console.log(`\n${k.ca.ma} · ${k.ca.id} — ${k.ca.mo}`);
  console.log(`  ${k.ca.hoi}`);
  console.log(`  B1 top-level : ${k.b1.canhBao ? "CẢNH BÁO" : "im      "} · ${k.b1.thay.join(", ") || "(không thấy gì)"}`);
  console.log(`  B2 delta     : ${k.b2.canhBao ? "CẢNH BÁO" : "im      "} · ${k.b2.thay.join(", ") || "(không thấy gì)"}`);
  console.log(
    `  B3 Custos    : ${k.b3.level.toUpperCase().padEnd(8)} · ${k.b3.ma.join(", ") || "(không mã)"}` +
      (k.b3.chiThongTin ? " · chỉ là thông tin, không cáo buộc" : ""),
  );
  console.log(
    `  kỳ vọng NGƯỜI: ${(k.kyVong ?? "(không có)").padEnd(8)} · ` +
      `Custos ${k.khopKyVong === null ? "—" : k.khopKyVong ? "KHỚP" : "LỆCH"}`,
  );
  console.log(`  → ${k.themGi}`);
}

const themPhatHien = ket.filter((k) => k.themGi.startsWith("THÊM PHÁT HIỆN")).length;
const khongThem = ket.filter((k) => k.themGi.startsWith("KHÔNG thêm")).length;
const baselineSai = ket.filter((k) => k.themGi.startsWith("BASELINE BÁO NHẦM")).length;
const custosLech = ket.filter((k) => k.khopKyVong === false).length;

console.log(
  `\nso-baseline · ${ket.length} ca · Custos thêm phát hiện ở ${themPhatHien} ca · ` +
    `baseline báo nhầm ở ${baselineSai} ca · không thêm gì ở ${khongThem} ca`,
);
console.log(
  `  Custos LỆCH kỳ vọng người gán ở ${custosLech}/${ket.length} ca` +
    (custosLech === 0 ? "." : " — đọc kỹ những ca đó trước khi dùng bảng này."),
);
console.log(
  "  Ba baseline là ba CÁCH TRIỂN KHAI mô tả trong chính file này — KHÔNG phải ba sản phẩm.\n" +
    "  Đây không phải tuyên bố hơn Phantom hay Blockaid: muốn nói vậy phải chạy chúng.",
);
