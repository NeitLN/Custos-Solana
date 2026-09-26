import { PublicKey, type Connection, type VersionedTransactionResponse } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Facts } from "@custos-solana/core";
import type { InspectResult } from "@custos-solana/types";
import { maBase58 } from "../gui.ts";
import type { LiveReceipt, Observation, Prediction } from "./receipt.ts";

/**
 * DỰ BÁO VÀ QUAN SÁT — logic thuần rút khỏi `LiveSession` (review 26/09, mục 3.7).
 *
 * Hai hàm này không đụng trạng thái của phiên: chúng nhận dữ kiện, trả dữ kiện. Nằm trong
 * class thì chúng chỉ kiểm được qua cả chuỗi setup → ký → gửi; tách ra thì kiểm thẳng được
 * (`apps/demo-wallet/test/quanSat.test.ts`).
 */

/** Số thập phân của token DEMO trong phiên thực thi. */
const DECIMALS = 6;

/**
 * Dự báo của Custos cho một yêu cầu ký, dựng từ Facts (ưu tiên) hoặc bảng chênh lệch.
 * Mô phỏng hỏng thì KHÔNG dùng Facts — không có trạng thái sau thì không có gì để dự báo.
 */
export function dungDuBao(d: {
  result: InspectResult | null;
  facts: Facts | undefined;
  source: string;
  mint: string;
  target: string;
  message: Uint8Array;
}): Prediction {
  const raw = d.result?.diff.find((x) => x.soLieu?.taiKhoan === d.source && x.soLieu.mint === d.mint)?.soLieu;
  const tim = (dc: string) =>
    d.facts?.simulationOk ? d.facts.tokenAccounts.find((t) => t.address === dc && t.mint === d.mint) : undefined;
  const fact = tim(d.source);
  const destFact = tim(d.target);
  return {
    source: d.source,
    mint: d.mint,
    decimals: DECIMALS,
    before: fact?.amountBefore.toString() ?? raw?.truoc ?? null,
    after: fact?.amountAfter.toString() ?? raw?.sau ?? null,
    ownerAfter: fact?.ownerAfter ?? null,
    message: maBase58(d.message),
    target: d.target,
    targetBefore: destFact?.amountBefore.toString() ?? null,
    targetAfter: destFact?.amountAfter.toString() ?? null,
    authorityMeasured: !!fact,
    delegateAfter: fact?.delegateAfter ?? null,
    allowanceAfter: fact?.delegatedAmountAfter.toString() ?? null,
    closeAuthorityAfter: fact?.closeAuthorityAfter ?? null,
  };
}

/**
 * Chữ ký mới nhất chạm `taiKhoan` có phải `chuKy` không — gọi SAU khi đã đọc trạng thái
 * tài khoản, để trạng thái đó quy được cho đúng giao dịch này (phản biện 26/09, F-06).
 * Lỗi, danh sách rỗng, hay chữ ký rỗng ⇒ `false`: không kiểm được thì không quy.
 */
export async function quyChoGiaoDich(
  conn: Pick<Connection, "getSignaturesForAddress">,
  taiKhoan: string,
  chuKy: string,
): Promise<boolean> {
  if (!chuKy) return false;
  try {
    const moiNhat = await conn.getSignaturesForAddress(new PublicKey(taiKhoan), { limit: 1 }, "confirmed");
    return moiNhat[0]?.signature === chuKy;
  } catch {
    return false;
  }
}

/**
 * Quan sát thực thi: số dư lấy từ metadata của CHÍNH giao dịch; quyền (chủ, uỷ quyền,
 * quyền đóng) đọc lại từ tài khoản ở slot ≥ slot giao dịch, rồi hỏi có quy được cho giao
 * dịch này không. Đọc tài khoản hỏng ⇒ quyền để trống (chưa đo), không bao giờ đoán.
 */
export async function dungQuanSat(
  conn: Pick<Connection, "getParsedAccountInfo" | "getSignaturesForAddress">,
  receipt: Pick<LiveReceipt, "signature" | "prediction">,
  data: VersionedTransactionResponse,
): Promise<Observation> {
  // Không có metadata thì không có gì để quan sát — bên gọi phải xử lý trước (đọc lại sau).
  const meta = data.meta;
  if (!meta) throw new Error("giao dịch chưa có metadata — chưa quan sát được");
  const message = data.transaction.message;
  const keys = message.getAccountKeys({ accountKeysFromLookups: meta.loadedAddresses });
  let owner: string | null = null;
  let ownerSlot: number | null = null;
  let delegate: string | null | undefined;
  let allowance: string | null = null;
  let closeAuthority: string | null | undefined;
  let closed = false;
  try {
    const account = await conn.getParsedAccountInfo(new PublicKey(receipt.prediction.source), {
      commitment: "confirmed",
      minContextSlot: data.slot,
    });
    const value = account.value?.data;
    if (account.value === null) {
      closed = true;
      ownerSlot = account.context.slot;
    }
    if (
      value &&
      "parsed" in value &&
      account.value?.owner.equals(TOKEN_PROGRAM_ID) &&
      value.parsed?.info?.mint === receipt.prediction.mint
    ) {
      owner = value.parsed.info.owner ?? null;
      ownerSlot = account.context.slot;
      delegate = value.parsed.info.delegate ?? null;
      allowance = value.parsed.info.delegatedAmount?.amount ?? "0";
      closeAuthority = value.parsed.info.closeAuthority ?? null;
    }
  } catch {
    /* Quyền là quan sát ở slot sau; đọc hỏng thì để trống — chưa đo. */
  }
  // Hỏi SAU khi đã đọc trạng thái: chữ ký mới nhất vẫn là của ta ⇒ không giao dịch nào
  // đổi chủ/uỷ quyền/quyền đóng xen vào trước lúc đọc (F-06).
  const rightsAttributable =
    ownerSlot !== null && (await quyChoGiaoDich(conn, receipt.prediction.source, receipt.signature));
  return {
    message: maBase58(message.serialize()),
    slot: data.slot,
    err: meta.err,
    rightsAttributable,
    fee: meta.fee,
    keys: Array.from({ length: keys.length }, (_, i) => keys.get(i)!.toBase58()),
    pre: meta.preTokenBalances ?? null,
    post: meta.postTokenBalances ?? null,
    owner,
    ownerSlot,
    delegate,
    allowance,
    closeAuthority,
    closed,
    preLamports: meta.preBalances,
    postLamports: meta.postBalances,
  };
}
