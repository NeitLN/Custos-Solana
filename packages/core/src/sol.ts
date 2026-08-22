import type { Facts } from "./facts.ts";

/**
 * TỔNG SỐ SOL NGƯỜI DÙNG KIỂM SOÁT — gộp cả hai hình dạng.
 *
 * SOL của một người nằm ở hai chỗ:
 *   1. lamport trong chính ví
 *   2. wrapped SOL — SOL bọc trong một tài khoản token, số dư token CHÍNH LÀ lamport
 *
 * Bản trước chỉ đọc `solDelta[signer]`, tức chỉ nhìn chỗ thứ nhất. Hậu quả đi theo
 * cả hai chiều, và đã tái hiện được cả hai:
 *
 *   BỎ LỌT   — đóng tài khoản wSOL 5 SOL của người dùng, lamport chảy về ví lạ.
 *              `solDelta[signer]` chỉ thấy mất 5000 lamport tiền phí, nên verdict
 *              ra `safe` với mã lý do RỖNG. Năm SOL biến mất không một lời nào.
 *
 *   KÊU OAN  — bọc 5 SOL thành wSOL để chuẩn bị swap. Ví mất 5 SOL thật, nhưng
 *              số đó nằm nguyên trong tài khoản wSOL của chính người dùng. Luật 13
 *              gắn cờ, trong khi người dùng không mất gì.
 *
 * Tính theo TỔNG thì cả hai tự đúng: bọc và mở gói chỉ là đổi hình dạng nên tổng
 * không đổi; còn lamport chảy ra ngoài thì tổng giảm thật.
 *
 * Xem docs/ROADMAP-BUILD.md — P0-A.
 */

/** Mint của wrapped SOL. Hằng số của giao thức. */
export const WSOL_MINT = "So11111111111111111111111111111111111111112";

export type SolNguoiDung = {
  /** Tổng SOL kiểm soát trước khi ký, tính bằng lamport. */
  truoc: bigint;
  /** Tổng sau khi ký. */
  sau: bigint;
  /** Phần rời khỏi tay người dùng. Âm nghĩa là nhận thêm. */
  roi: bigint;
};

export function tinhSolNguoiDung(facts: Facts): SolNguoiDung {
  const vi = facts.accounts.find((a) => a.address === facts.signer);
  let truoc = vi?.lamportsBefore ?? 0n;
  let sau = vi?.lamportsAfter ?? 0n;

  for (const t of facts.tokenAccounts) {
    if (t.mint !== WSOL_MINT) continue;
    // Xét quyền sở hữu ở TỪNG THỜI ĐIỂM. Tài khoản wSOL đổi chủ sang kẻ tấn công
    // thì được tính vào `truoc` mà không tính vào `sau` — đúng là một khoản mất.
    if (t.ownerBefore === facts.signer) truoc += t.amountBefore;
    if (t.ownerAfter === facts.signer) sau += t.amountAfter;
  }

  return { truoc, sau, roi: truoc - sau };
}
