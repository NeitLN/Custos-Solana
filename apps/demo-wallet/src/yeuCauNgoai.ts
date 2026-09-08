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
/**
 * BA KẾT QUẢ, KHÔNG PHẢI HAI.
 *
 * Bản trước trả `null` cho CẢ HAI: "dApp không gửi gì" và "dApp gửi thứ không đọc
 * được". Mở `#tx=invalid-base64` thì ví về màn hình nghỉ như chưa có chuyện gì —
 * người dùng không biết ứng dụng vừa gửi một yêu cầu hỏng.
 *
 * Với một lớp bảo vệ, im lặng trước đầu vào hỏng là câu trả lời sai: người dùng
 * không phân biệt được "chưa có gì để kiểm" với "có thứ để kiểm nhưng tôi không đọc
 * nổi". Cái thứ hai đáng để họ dừng lại.
 */
export type KetQuaYeuCau =
  | { loai: "khong" }
  | { loai: "co"; yc: YeuCauNgoai }
  | { loai: "hong"; lyDo: string };

/*
 * Giới hạn độ dài đầu vào.
 *
 * Giao dịch Solana tối đa 1232 byte, tức khoảng 1644 ký tự base64. Cho dư gấp đôi
 * rồi chặn: một hash vài megabyte không phải giao dịch hợp lệ, nó là thứ làm `atob`
 * và `deserialize` ngốn thời gian trên luồng giao diện.
 */
const TOI_DA_B64 = 4096;
const TOI_DA_PHU = 8192;

export function docYeuCauNgoaiChiTiet(): KetQuaYeuCau {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return { loai: "khong" };

  const p = new URLSearchParams(hash);
  const b64 = p.get("tx");
  if (!b64) return { loai: "khong" };

  if (b64.length > TOI_DA_B64) {
    return { loai: "hong", lyDo: `yêu cầu dài ${b64.length} ký tự, vượt giới hạn ${TOI_DA_B64}` };
  }

  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const tx = VersionedTransaction.deserialize(bytes);

    let khai: PrimaryAction | null = null;
    const raw = p.get("khai");
    if (raw && raw.length <= TOI_DA_PHU) {
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
    if (rawKy && rawKy.length <= TOI_DA_PHU) {
      try {
        kyHieu = JSON.parse(rawKy) as Record<string, string>;
      } catch {
        // Ký hiệu hỏng thì bỏ qua — hiển thị địa chỉ vẫn hơn là sập.
      }
    }

    return { loai: "co", yc: { tx, khai, kyHieu } };
  } catch (e) {
    /*
     * Chỉ GIAO DỊCH hỏng mới làm cả yêu cầu hỏng.
     *
     * `khai` và `kyhieu` hỏng thì bỏ qua được — chúng chỉ ảnh hưởng hiển thị, và
     * một dApp độc hại hoàn toàn có thể gửi rác ở đó để làm sập lớp bảo vệ. Nhưng
     * `tx` hỏng nghĩa là không có gì để kiểm, và điều đó phải nói ra.
     */
    const loi = e instanceof Error ? e.message : String(e);
    return { loai: "hong", lyDo: /atob|InvalidCharacter/i.test(loi) ? "không phải base64 hợp lệ" : loi };
  }
}

/** Giữ cho chỗ chỉ cần giao dịch; yêu cầu hỏng coi như không có. */
export function docYeuCauNgoai(): YeuCauNgoai | null {
  const r = docYeuCauNgoaiChiTiet();
  return r.loai === "co" ? r.yc : null;
}
