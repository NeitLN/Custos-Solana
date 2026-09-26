import type { LiveKind } from "./scenarios.ts";
export type Prediction = {
  source: string;
  mint: string;
  decimals: number;
  before: string | null;
  after: string | null;
  ownerAfter: string | null;
  message: string;
  target?: string;
  targetBefore?: string | null;
  targetAfter?: string | null;
  delegateAfter?: string | null;
  allowanceAfter?: string | null;
  closeAuthorityAfter?: string | null;
  authorityMeasured?: boolean;
};
type TokenBalance = {
  accountIndex: number;
  mint: string;
  uiTokenAmount: { amount: string; decimals: number };
};
export type Observation = {
  message: string;
  slot: number;
  err: unknown;
  fee: number;
  keys: string[];
  pre: TokenBalance[] | null;
  post: TokenBalance[] | null;
  owner: string | null;
  ownerSlot: number | null;
  delegate?: string | null;
  allowance?: string | null;
  closeAuthority?: string | null;
  closed?: boolean;
  preLamports?: number[];
  postLamports?: number[];
  /**
   * Quyền đọc ở `ownerSlot` có quy được cho CHÍNH giao dịch này không: sau lúc đọc trạng
   * thái, chữ ký mới nhất chạm tài khoản nguồn vẫn là giao dịch này. Mọi lệnh đổi chủ,
   * uỷ quyền hay quyền đóng đều phải liệt kê tài khoản đó, nên không có chữ ký mới hơn
   * nghĩa là không có gì khác đã đổi nó. Vắng = chưa kiểm được = không quy (F-06).
   */
  rightsAttributable?: boolean;
};
export type Comparison = {
  balance: "match" | "mismatch" | "unknown";
  authority: "match" | "mismatch" | "unknown";
  actualBefore: string | null;
  actualAfter: string | null;
  target?: "match" | "mismatch" | "unknown";
  targetBefore?: string | null;
  targetAfter?: string | null;
  delegate?: "match" | "mismatch" | "unknown";
  closeAuthority?: "match" | "mismatch" | "unknown";
};

/** Reads observed values independently; absent metadata NEVER becomes zero or a prediction. */
export function compareReceipt(p: Prediction, o: Observation): Comparison {
  const index = o.keys.indexOf(p.source);
  const find = (list: TokenBalance[] | null) =>
    list?.find(
      (b) => b.accountIndex === index && b.mint === p.mint && b.uiTokenAmount.decimals === p.decimals,
    )?.uiTokenAmount.amount ?? null;
  const actualBefore = index < 0 ? null : find(o.pre);
  const actualAfter = index < 0 ? null : find(o.post);
  const attributable = o.err === null && o.message === p.message;
  const ti = p.target ? o.keys.indexOf(p.target) : -1;
  const targetBalance = (list: TokenBalance[] | null) =>
    ti < 0
      ? null
      : (list?.find(
          (b) => b.accountIndex === ti && b.mint === p.mint && b.uiTokenAmount.decimals === p.decimals,
        )?.uiTokenAmount.amount ?? null);
  const targetBefore = targetBalance(o.pre),
    targetAfter = targetBalance(o.post);
  // Quyền đọc lại chỉ đem so với dự báo khi quy được cho giao dịch này: đọc cùng slot,
  // hoặc đọc muộn hơn nhưng không có chữ ký nào mới hơn chạm tài khoản nguồn (F-06).
  const quyDuoc =
    o.ownerSlot != null &&
    (o.ownerSlot === o.slot || (o.ownerSlot > o.slot && o.rightsAttributable === true));
  const rightsKnown = attributable && p.authorityMeasured && quyDuoc && !o.closed;
  return {
    actualBefore,
    actualAfter,
    targetBefore,
    targetAfter,
    target:
      !attributable ||
      targetBefore === null ||
      targetAfter === null ||
      p.targetBefore == null ||
      p.targetAfter == null
        ? "unknown"
        : targetBefore === p.targetBefore && targetAfter === p.targetAfter
          ? "match"
          : "mismatch",
    delegate:
      !rightsKnown || o.allowance == null || p.allowanceAfter == null
        ? "unknown"
        : p.delegateAfter === o.delegate && p.allowanceAfter === o.allowance
          ? "match"
          : "mismatch",
    closeAuthority:
      !rightsKnown || o.closeAuthority === undefined
        ? "unknown"
        : p.closeAuthorityAfter === o.closeAuthority
          ? "match"
          : "mismatch",
    balance:
      !attributable || actualBefore === null || actualAfter === null || p.before === null || p.after === null
        ? "unknown"
        : actualBefore === p.before && actualAfter === p.after
          ? "match"
          : "mismatch",
    authority:
      !attributable || !p.ownerAfter || !o.owner || !quyDuoc
        ? "unknown"
        : p.ownerAfter === o.owner
          ? "match"
          : "mismatch",
  };
}

export type LiveReceipt = {
  signature: string;
  cluster: "devnet";
  kind: LiveKind;
  protected: boolean;
  prediction: Prediction;
  observation: Observation | null;
  comparison: Comparison | null;
  createdAt: string;
  note: string;
  wallet?: string;
  signer?: string;
  expiresAtBlock?: number;
  decision?: {
    action: "approve" | "override";
    level: "safe" | "warning" | "danger" | null;
    aiAdvisory?: "review_required" | null;
    reasonCodes: string[];
    requestId: number;
    at: string;
    policy: "warn_and_allow_override";
  };
  resolution?: "confirmed" | "failed" | "expired-unobserved";
};

const NHAN_DOI_CHIEU = { match: "Khớp", mismatch: "Có chênh lệch", unknown: "Chưa đủ dữ liệu" } as const;

/**
 * Nhãn cột "Đối chiếu" cho các hàng QUYỀN (chủ, uỷ quyền, quyền đóng).
 *
 * Số dư lấy từ metadata của chính giao dịch, nên quy được cho giao dịch đó. Quyền thì
 * đọc lại SAU xác nhận: đọc ở slot muộn hơn là trạng thái hiện tại, và một giao dịch
 * xen giữa có thể đã đổi nó. Nhãn trần "Có chênh lệch" dưới tiêu đề "Dự báo gặp thực
 * tế" dễ bị đọc thành Custos dự báo sai — phản biện 26/09, F-06. Phép so giữ nguyên;
 * chỉ nhãn nói đúng thứ đã so.
 */
export function nhanDoiChieuQuyen(
  kq: "match" | "mismatch" | "unknown",
  o: { slot: number; ownerSlot: number | null; rightsAttributable?: boolean },
): string {
  // Phép so đã loại quyền không quy được (`compareReceipt`); nhãn chỉ nói VÌ SAO không so.
  if (kq === "unknown" && o.ownerSlot != null && o.ownerSlot > o.slot && o.rightsAttributable !== true) {
    return "Chưa quy được cho riêng giao dịch này — cột bên là trạng thái hiện tại";
  }
  return NHAN_DOI_CHIEU[kq];
}
