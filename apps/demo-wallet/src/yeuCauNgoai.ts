import { VersionedTransaction } from "@solana/web3.js";
import type { PrimaryAction } from "@custos-solana/types";

export type YeuCauNgoai = {
  tx: VersionedTransaction;
  /** Ký hiệu token do dApp cung cấp. Chỉ ảnh hưởng hiển thị, không ảnh hưởng verdict. */
  kyHieu: Record<string, string> | null;
  /** Ngữ cảnh do dApp KHAI. Không đáng tin — xem chú thích bên dưới. */
  khai: PrimaryAction | null;
};

/**
 * Đọc giao dịch mà một dApp bên ngoài đẩy sang qua URL hash.
 *
 * Dùng hash chứ không dùng query string: hash không đi lên server, không nằm
 * trong log. Giao dịch chưa ký thì không phải bí mật, nhưng thói quen tốt thì
 * nên giữ đúng ngay từ đầu.
 *
 * ⚠️ Trường `khai` là LỜI KHAI CỦA dApp, và dApp có thể nói dối.
 * Nó được chuyển thẳng vào `expectedAction` của `inspect()`, nơi quy tắc bất
 * đối xứng xử lý: lệch thì nâng nghi ngờ, khớp thì KHÔNG giảm verdict và
 * KHÔNG tắt cảnh báo nào. Xem CUSTOS.md mục 03.
 */
export function docYeuCauNgoai(): YeuCauNgoai | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;

  const p = new URLSearchParams(hash);
  const b64 = p.get("tx");
  if (!b64) return null;

  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const tx = VersionedTransaction.deserialize(bytes);

    let khai: PrimaryAction | null = null;
    const raw = p.get("khai");
    if (raw) {
      try {
        const o = JSON.parse(raw) as Partial<PrimaryAction>;
        if (typeof o.type === "string") khai = o as PrimaryAction;
      } catch {
        // Lời khai hỏng thì bỏ qua. KHÔNG được để nó làm hỏng lượt kiểm tra —
        // dApp độc hại hoàn toàn có thể gửi rác để làm sập lớp bảo vệ.
      }
    }

    let kyHieu: Record<string, string> | null = null;
    const rawKy = p.get("kyhieu");
    if (rawKy) {
      try {
        kyHieu = JSON.parse(rawKy) as Record<string, string>;
      } catch {
        // Ký hiệu hỏng thì bỏ qua — hiển thị địa chỉ vẫn hơn là sập.
      }
    }

    return { tx, khai, kyHieu };
  } catch {
    return null;
  }
}
