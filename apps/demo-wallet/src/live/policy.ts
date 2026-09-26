import { khopNeo, quaCu, type NeoKetQua } from "@custos-solana/core";

/** One-use consent for the isolated demo. No implicit consent from a mode toggle. */
export class ConsentGate {
  #serial = 0;
  #pending: {
    id: number;
    bytes: Uint8Array;
    signer: string;
    protected: boolean;
    anchor: NeoKetQua | null;
  } | null = null;
  cancel() {
    this.#pending = null;
  }
  prepare(bytes: Uint8Array, signer: string, protectedMode: boolean, anchor: NeoKetQua | null) {
    this.cancel();
    if (protectedMode && (!anchor || quaCu(anchor) || !khopNeo(anchor, bytes, signer, "devnet").khop)) {
      throw new Error("Cần kết quả Custos mới và khớp giao dịch trước khi ký.");
    }
    const id = ++this.#serial;
    this.#pending = {
      id,
      bytes: bytes.slice(),
      signer,
      protected: protectedMode,
      anchor: anchor ? { ...anchor } : null,
    };
    return id;
  }
  consume(id: number, bytes: Uint8Array, signer: string) {
    const p = this.#pending;
    this.cancel();
    if (
      !p ||
      p.id !== id ||
      p.signer !== signer ||
      p.bytes.length !== bytes.length ||
      p.bytes.some((b, i) => b !== bytes[i])
    ) {
      throw new Error("Yêu cầu ký đã huỷ hoặc giao dịch thay đổi. Hãy tạo yêu cầu mới.");
    }
    if (p.protected && (!p.anchor || quaCu(p.anchor) || !khopNeo(p.anchor, bytes, signer, "devnet").khop)) {
      throw new Error("Kết quả Custos đã cũ. Hãy kiểm tra lại.");
    }
  }
}

/**
 * Yêu cầu có cần người dùng CHỦ ĐỘNG bỏ qua trước khi ký không: mức L2 khác "safe", hoặc
 * Custos đề nghị kiểm tra thủ công (`aiAdvisory`) — phản biện 26/09, F-03. Màn xác nhận và
 * `execute()` dùng chung hàm này để nút bấm và cổng chặn không thể lệch nhau.
 */
export function canBoQua(r: { level: string; aiAdvisory: string | null } | null | undefined): boolean {
  return r?.level !== "safe" || r.aiAdvisory === "review_required";
}
