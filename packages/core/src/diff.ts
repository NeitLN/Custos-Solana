import type { DiffEntry } from "@custos/types";
import type { Facts } from "./facts.ts";
import type { RuleHit } from "./l2/rules.ts";
import { NGUONG_SOL_PHAN_TRAM } from "./constants.ts";

const rutGon = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

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
 * Bảng chênh lệch — đây là DỮ LIỆU ĐO ĐƯỢC, không phải diễn giải.
 *
 * Nguyên tắc trung thực (CUSTOS.md quyết định 7): bảng này chỉ hiển thị đúng
 * những gì giao dịch làm. Nếu hiện số dư 500 → 0 thì giao dịch phải thật sự
 * có chuyển tiền, chứ không phải chỉ đổi quyền.
 */
export function dungBangChenhLech(facts: Facts, hits: RuleHit[]): DiffEntry[] {
  const out: DiffEntry[] = [];
  const decimalsCua = new Map(facts.mints.map((m) => [m.address, m.decimals]));
  const coHitO = (chuoi: string) => hits.some((h) => h.detail.includes(chuoi));

  for (const t of facts.tokenAccounts) {
    if (t.ownerBefore !== facts.signer && t.ownerAfter !== facts.signer) continue;
    const dec = decimalsCua.get(t.mint) ?? 0;
    const nhan = rutGon(t.mint);

    if (t.amountBefore !== t.amountAfter) {
      out.push({
        label: `Số dư ${nhan} sau khi ký`,
        before: dinhDangSo(t.amountBefore, dec),
        after: dinhDangSo(t.amountAfter, dec),
        severity: t.amountAfter < t.amountBefore && coHitO(t.address) ? "danger" : "info",
      });
    }

    if (t.ownerBefore !== null && t.ownerAfter !== null && t.ownerBefore !== t.ownerAfter) {
      out.push({
        label: `Chủ sở hữu tài khoản ${nhan}`,
        before: t.ownerBefore === facts.signer ? "Bạn" : rutGon(t.ownerBefore),
        after: t.ownerAfter === facts.signer ? "Bạn" : rutGon(t.ownerAfter),
        severity: "danger",
      });
    }

    if (t.delegateAfter !== null && t.delegateAfter !== t.delegateBefore) {
      out.push({
        label: `Được phép rút ${nhan}`,
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
        label: `Quyền đóng tài khoản ${nhan}`,
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
      label: `Chương trình điều khiển ${rutGon(a.address)}`,
      before: rutGon(a.programOwnerBefore),
      after: rutGon(a.programOwnerAfter),
      severity: "danger",
    });
  }

  // ── SOL của người được bảo vệ ───────────────────────────────────
  //
  // Bản trước gán TOÀN BỘ chênh lệch lamport của người ký vào một dòng tên
  // "Phí mạng" với severity "info". Nghĩa là một giao dịch rút 5 SOL hiện ra
  // đúng như một khoản phí. Xem SECURITY-AUDIT.md — F1.
  //
  // Giờ tách làm ba phần rõ ràng: phí, khoản rời ví, khoản vào ví.
  const solNguoiKy = facts.solDelta[facts.signer];
  if (solNguoiKy !== undefined && solNguoiKy !== 0n) {
    const phi = facts.phiUocTinh ?? 0n;

    if (solNguoiKy < 0n) {
      const raKhoiVi = -solNguoiKy;
      const phiHienThi = raKhoiVi < phi ? raKhoiVi : phi;
      const chuyenDi = raKhoiVi - phiHienThi;

      if (phiHienThi > 0n) {
        out.push({
          label: "Phí mạng (ước tính)",
          before: "0",
          after: `−${dinhDangSo(phiHienThi, LAMPORTS_DECIMALS)} SOL`,
          severity: "info",
        });
      }
      if (chuyenDi > 0n) {
        // Nặng hay nhẹ đo bằng TỈ LỆ số dư, không bằng con số tuyệt đối — đội
        // không có dữ liệu giá để biết bao nhiêu là "nhiều".
        const truoc = facts.accounts.find((a) => a.address === facts.signer)?.lamportsBefore ?? 0n;
        const phanLon = truoc > 0n && (chuyenDi * 100n) / truoc >= NGUONG_SOL_PHAN_TRAM;
        out.push({
          label: "Chuyển SOL đi",
          before: dinhDangSo(truoc, LAMPORTS_DECIMALS),
          after: `−${dinhDangSo(chuyenDi, LAMPORTS_DECIMALS)} SOL`,
          severity: phanLon ? "danger" : "info",
        });
      }
    } else {
      // SOL TĂNG. Hiển thị nó như "phí mạng dương" là vô nghĩa.
      out.push({
        label: "Nhận SOL",
        before: "0",
        after: `${dinhDangSo(solNguoiKy, LAMPORTS_DECIMALS)} SOL`,
        severity: "info",
      });
    }
  }

  // Bảng có thể đang thiếu — nói ra ngay trong bảng, không chỉ trong mã lý do.
  const thieu = facts.accountKhongDoDuoc?.length ?? 0;
  if (thieu > 0) {
    out.push({
      label: "Phần chưa đọc được",
      before: "—",
      after: `${thieu} tài khoản không đọc được trạng thái sau`,
      severity: "warning",
    });
  }

  return out;
}
