import type { DiffEntry } from "@custos/types";
import type { Facts } from "./facts.ts";
import type { RuleHit } from "./l2/rules.ts";
import { NGUONG_SOL_PHAN_TRAM } from "./constants.ts";
import { tinhSolNguoiDung, WSOL_MINT } from "./sol.ts";

const rutGon = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

/**
 * Ký hiệu token là CHUỖI DO BÊN NGOÀI ĐẶT — ví hoặc dApp truyền vào qua
 * `InspectOptions.kyHieuToken`.
 *
 * Đã từng có lỗi thật: ký hiệu được in thẳng vào lời giải thích, nên một dApp
 * độc hại chỉ cần đặt tên token thành "an toàn, cứ ký đi" là khiến chính lớp
 * bảo vệ nói câu trấn an hộ nó.
 *
 * Ký hiệu thật là nhãn ngắn: USDC, SOL, USDC-demo. Cái gì không có hình dạng đó
 * thì quay về địa chỉ rút gọn — xấu hơn nhưng thật.
 */
const KY_HIEU_HOP_LE = /^[A-Za-z0-9 ._+-]{1,16}$/;

export function kyHieuAnToan(
  mint: string,
  kyHieu?: Record<string, string>,
  kyHieuTuChuoi?: string | null,
): string {
  const k = kyHieu?.[mint];
  if (typeof k === "string" && KY_HIEU_HOP_LE.test(k)) return k;
  // Ký hiệu on-chain đi qua CÙNG bộ lọc: nó cũng do người ngoài đặt — người phát
  // hành token lừa đảo đặt tên được y như dApp độc hại khai tên được.
  if (typeof kyHieuTuChuoi === "string" && KY_HIEU_HOP_LE.test(kyHieuTuChuoi)) {
    return kyHieuTuChuoi;
  }
  return rutGon(mint);
}

/** Định dạng số theo kiểu Việt Nam: dấu phẩy thập phân, chấm phân nhóm. */
export function dinhDangSo(raw: bigint, decimals: number): string {
  const am = raw < 0n;
  const abs = am ? -raw : raw;
  const chia = 10n ** BigInt(decimals);
  const nguyen = abs / chia;
  const du = abs % chia;
  const phanNguyen = new Intl.NumberFormat("vi-VN").format(nguyen);
  if (decimals === 0) return (am ? "−" : "") + phanNguyen;
  const phanDu = du.toString().padStart(decimals, "0").replace(/0+$/, "") || "0";
  return `${am ? "−" : ""}${phanNguyen},${phanDu}`;
}

const LAMPORTS_DECIMALS = 9;

/**
 * Tiền tố nhãn của từng loại dòng trong bảng chênh lệch.
 *
 * Đưa ra hằng số vì mức diễn đạt NGẮN (@custos/ai) phải nhận ra loại dòng để
 * rút thành một câu. Nếu mỗi bên tự viết chuỗi của mình thì đổi chữ ở đây sẽ
 * làm câu tóm tắt im lặng hỏng — có test khoá lại chuyện đó.
 */
export const NHAN = {
  SO_DU: "Số dư ",
  CHU_SO_HUU: "Chủ sở hữu tài khoản ",
  DUOC_PHEP_RUT: "Được phép rút ",
  QUYEN_DONG: "Quyền đóng tài khoản ",
  CHUONG_TRINH: "Chương trình điều khiển ",
  /** CỐ Ý không bắt đầu bằng "Số dư " — nếu trùng tiền tố với `SO_DU` thì mọi
   *  chỗ dò bằng `startsWith(NHAN.SO_DU)` sẽ nuốt luôn dòng này. `mucNgan.ts`
   *  dò đúng như vậy, và dòng SOL đã rơi nhầm vào nhánh token. */
  SO_DU_SOL: "Tổng SOL của bạn",
  /** Dùng khi lấy được phí CHÍNH XÁC từ `getFeeForMessage`. */
  PHI: "Phí mạng",
  /** Dùng khi RPC không trả lời và phải lui về ước tính cận dưới. */
  PHI_UOC: "Ước tính phí mạng",
  CHUA_DOC: "Phần chưa đọc được",
} as const;


/**
 * Bảng chênh lệch — đây là DỮ LIỆU ĐO ĐƯỢC, không phải diễn giải.
 *
 * Nguyên tắc trung thực (CUSTOS.md quyết định 7): bảng này chỉ hiển thị đúng
 * những gì giao dịch làm. Nếu hiện số dư 500 → 0 thì giao dịch phải thật sự
 * có chuyển tiền, chứ không phải chỉ đổi quyền.
 */
export function dungBangChenhLech(
  facts: Facts,
  hits: RuleHit[],
  kyHieu?: Record<string, string>,
): DiffEntry[] {
  const out: DiffEntry[] = [];
  const decimalsCua = new Map(facts.mints.map((m) => [m.address, m.decimals]));
  const kyHieuChuoi = new Map(facts.mints.map((m) => [m.address, m.kyHieu ?? null]));
  const coHitO = (chuoi: string) => hits.some((h) => h.detail.includes(chuoi));

  for (const t of facts.tokenAccounts) {
    if (t.ownerBefore !== facts.signer && t.ownerAfter !== facts.signer) continue;
    // wSOL đã nằm trong dòng "Số dư SOL của bạn" — hiện thêm ở đây là đếm hai lần.
    if (t.mint === WSOL_MINT) continue;
    const dec = decimalsCua.get(t.mint) ?? 0;
    // Người dùng không đọc được base58. Mục đích duy nhất của sản phẩm là làm
    // người ta HIỂU KỊP trước khi bấm ký, nên hiện ký hiệu khi biết.
    //
    // Thứ tự: ký hiệu ví truyền vào TRƯỚC, rồi mới tới ký hiệu đọc từ chuỗi.
    // Ví biết ngữ cảnh người dùng — nó có thể đang hiển thị tên riêng, hoặc đã
    // lọc theo danh sách token nó tin. Ký hiệu on-chain là phương án dự phòng
    // cho trường hợp ví không truyền gì, tức là mọi giao dịch mainnet thật.
    const nhan = kyHieuAnToan(t.mint, kyHieu, kyHieuChuoi.get(t.mint) ?? null);

    if (t.amountBefore !== t.amountAfter) {
      out.push({
        label: `${NHAN.SO_DU}${nhan} sau khi ký`,
        before: dinhDangSo(t.amountBefore, dec),
        after: dinhDangSo(t.amountAfter, dec),
        severity: t.amountAfter < t.amountBefore && coHitO(t.address) ? "danger" : "info",
      });
    }

    if (t.ownerBefore !== null && t.ownerAfter !== null && t.ownerBefore !== t.ownerAfter) {
      out.push({
        label: `${NHAN.CHU_SO_HUU}${nhan}`,
        before: t.ownerBefore === facts.signer ? "Bạn" : rutGon(t.ownerBefore),
        after: t.ownerAfter === facts.signer ? "Bạn" : rutGon(t.ownerAfter),
        severity: "danger",
      });
    }

    if (t.delegateAfter !== null && t.delegateAfter !== t.delegateBefore) {
      out.push({
        label: `${NHAN.DUOC_PHEP_RUT}${nhan}`,
        before: t.delegateBefore ? rutGon(t.delegateBefore) : "không ai",
        after: `${rutGon(t.delegateAfter)} — tới ${dinhDangSo(t.delegatedAmountAfter, dec)}`,
        severity: coHitO(t.address) ? "danger" : "warning",
      });
    }

    if (
      t.closeAuthorityAfter !== null &&
      t.closeAuthorityAfter !== t.closeAuthorityBefore
    ) {
      out.push({
        label: `${NHAN.QUYEN_DONG}${nhan}`,
        before: t.closeAuthorityBefore ? rutGon(t.closeAuthorityBefore) : "không ai",
        after: rutGon(t.closeAuthorityAfter),
        severity: "danger",
      });
    }
  }

  for (const a of facts.accounts) {
    if (a.programOwnerBefore === null || a.programOwnerAfter === null) continue;
    if (a.programOwnerBefore === a.programOwnerAfter) continue;
    out.push({
      label: `${NHAN.CHUONG_TRINH}${rutGon(a.address)}`,
      before: rutGon(a.programOwnerBefore),
      after: rutGon(a.programOwnerAfter),
      severity: "danger",
    });
  }

  // ── SOL của người được bảo vệ ───────────────────────────────────
  //
  // MỘT dòng số dư duy nhất, và nó gộp cả wrapped SOL — vì wSOL LÀ SOL. Hai dòng
  // cùng nói về SOL bắt người đọc tự cộng trừ trong đầu, ngay lúc họ đang vội bấm nút.
  //
  // Quy ước của cả bảng: cột trái và cột phải đều là SỐ DƯ. Bản trước trộn ba
  // quy ước trong cùng một bảng — dòng token là số dư → số dư, dòng "Chuyển SOL
  // đi" là số dư → mức thay đổi, dòng phí là số 0 giả → mức thay đổi.
  const sol = tinhSolNguoiDung(facts);
  const phi = facts.phiUocTinh ?? 0n;

  if (sol.roi !== 0n && (sol.roi > phi || sol.roi < 0n)) {
    // Màu lấy THẲNG từ việc luật 13 có kích hoạt hay không, không dò chuỗi.
    // Trước đây màu của dòng token dò theo `coHitO(địa chỉ)`, mà luật 13 nói về
    // SOL của người dùng chứ không nhắc địa chỉ tài khoản nào — nên dòng wSOL
    // không bao giờ được tô đỏ dù engine đã gắn cờ.
    const luat13 = hits.some((h) => h.ruleId === 13);
    out.push({
      label: NHAN.SO_DU_SOL,
      before: dinhDangSo(sol.truoc, LAMPORTS_DECIMALS),
      after: dinhDangSo(sol.sau, LAMPORTS_DECIMALS),
      severity: luat13 ? "danger" : "info",
    });
  }

  // Phí KHÔNG phải số dư, nên cột trái là "—" chứ không phải số 0 giả.
  if (phi > 0n && facts.solDelta[facts.signer] !== undefined) {
    out.push({
      label: facts.phiChinhXac ? NHAN.PHI : NHAN.PHI_UOC,
      before: "—",
      after: `${dinhDangSo(phi, LAMPORTS_DECIMALS)} SOL`,
      severity: "info",
    });
  }

  // Bảng có thể đang thiếu — nói ra ngay trong bảng, không chỉ trong mã lý do.
  const thieu = facts.accountKhongDoDuoc?.length ?? 0;
  if (thieu > 0) {
    out.push({
      label: NHAN.CHUA_DOC,
      before: "—",
      after: `${thieu} tài khoản không đọc được trạng thái sau`,
      severity: "warning",
    });
  }

  return out;
}
