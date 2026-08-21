import { kyHieuAnToan, type Facts } from "@custos/core";
import type { PrimaryAction } from "@custos/types";

/**
 * LÕI XÁC ĐỊNH CỦA L3 — nhận diện hành động chính và hậu quả lệch khỏi nó.
 *
 * KHÔNG có mô hình ngôn ngữ ở file này.
 *
 * Vì sao làm bằng logic thay vì hỏi mô hình: hành động chính suy ra được từ
 * chênh lệch số dư, mà chênh lệch số dư là dữ liệu đã đo. Hỏi mô hình một thứ
 * tính được thì vừa chậm hơn, vừa sai được, vừa hỏng khi mất mạng.
 *
 * Ranh giới không đổi: file này KHÔNG sinh `level`. Nó chỉ mô tả giao dịch
 * đang làm gì; verdict vẫn hoàn toàn do L2 quyết.
 *
 * Và lưu ý cách gọi tên: đây là hành động **được nhận diện từ giao dịch**,
 * không phải "ý định của người dùng". Giao dịch chỉ cho biết nó LÀM GÌ.
 */

export type HauQuaLech = {
  loai: "doi_chu" | "cap_quyen_rut" | "trao_quyen_dong" | "doi_chuong_trinh";
  taiKhoan: string;
  benNhan: string;
};

export type KetQuaNhanDien = {
  hanhDong: PrimaryAction | null;
  /** Hậu quả KHÔNG phục vụ hành động chính. Chuyển tiền không cần đổi chủ. */
  lech: HauQuaLech[];
};

const rutGon = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

/** Tên hiển thị của một mint: ký hiệu nếu biết, không thì địa chỉ rút gọn.
 *  Địa chỉ base58 trên màn cảnh báo là vô nghĩa với người dùng — mà mục đích
 *  duy nhất của sản phẩm là làm người ta HIỂU KỊP trước khi bấm ký. */
const tenToken = (mint: string, kyHieu?: Record<string, string>) => kyHieuAnToan(mint, kyHieu);

export function nhanDien(facts: Facts, kyHieu?: Record<string, string>): KetQuaNhanDien {
  const cuaToi = facts.tokenAccounts.filter(
    (t) => t.ownerBefore === facts.signer || t.ownerAfter === facts.signer,
  );

  // Gộp chênh lệch theo mint: một mint có thể trải trên nhiều tài khoản.
  const theoMint = new Map<string, bigint>();
  for (const t of cuaToi) {
    // Chỉ so chênh lệch SỐ DƯ. Đổi chủ không đụng tới số dư nên tự nó cho
    // chênh lệch bằng 0 — không cần loại trừ gì cả.
    //
    // Bản trước bỏ qua nguyên cả tài khoản khi nó đổi chủ, và thế là mất luôn
    // khoản chuyển tiền CÓ THẬT trên chính tài khoản đó. Giao dịch tấn công
    // làm cả hai việc, nên hành động chính bị đọc thành "không xác định".
    theoMint.set(t.mint, (theoMint.get(t.mint) ?? 0n) + (t.amountAfter - t.amountBefore));
  }

  const ra = [...theoMint.entries()].filter(([, d]) => d < 0n).map(([m]) => m);
  const vao = [...theoMint.entries()].filter(([, d]) => d > 0n).map(([m]) => m);

  const solNguoiKy = facts.solDelta[facts.signer] ?? 0n;
  // Bỏ qua phí mạng: vài nghìn lamport không phải một hành động.
  const solRa = solNguoiKy < -100_000n;

  let hanhDong: PrimaryAction | null = null;
  if (ra.length === 1 && vao.length === 1) {
    hanhDong = { type: "swap", from: tenToken(ra[0]!, kyHieu), to: tenToken(vao[0]!, kyHieu) };
  } else if (ra.length === 1 && vao.length === 0) {
    hanhDong = { type: "chuyển token", from: tenToken(ra[0]!, kyHieu) };
  } else if (ra.length === 0 && vao.length === 1) {
    hanhDong = { type: "nhận token", to: tenToken(vao[0]!, kyHieu) };
  } else if (ra.length === 0 && vao.length === 0 && solRa) {
    hanhDong = { type: "chuyển SOL" };
  }
  // Nhiều mint ra lẫn vào, hoặc không có dòng tiền nào: KHÔNG đoán. Trả null.
  // Nói không biết vẫn tốt hơn đoán sai — DAC-TA-L3.md mục 3.1 ràng buộc 4.

  const lech: HauQuaLech[] = [];
  for (const t of facts.tokenAccounts) {
    if (t.ownerBefore !== facts.signer) continue;
    if (t.ownerAfter !== null && t.ownerAfter !== facts.signer) {
      lech.push({ loai: "doi_chu", taiKhoan: rutGon(t.address), benNhan: rutGon(t.ownerAfter) });
    }
    if (t.delegateAfter && t.delegateAfter !== t.delegateBefore && t.delegateAfter !== facts.signer) {
      lech.push({ loai: "cap_quyen_rut", taiKhoan: rutGon(t.address), benNhan: rutGon(t.delegateAfter) });
    }
    if (
      t.closeAuthorityAfter &&
      t.closeAuthorityAfter !== t.closeAuthorityBefore &&
      t.closeAuthorityAfter !== facts.signer
    ) {
      lech.push({ loai: "trao_quyen_dong", taiKhoan: rutGon(t.address), benNhan: rutGon(t.closeAuthorityAfter) });
    }
  }
  for (const a of facts.accounts) {
    if (a.programOwnerBefore && a.programOwnerAfter && a.programOwnerBefore !== a.programOwnerAfter) {
      lech.push({ loai: "doi_chuong_trinh", taiKhoan: rutGon(a.address), benNhan: rutGon(a.programOwnerAfter) });
    }
  }

  return { hanhDong, lech };
}

/** Câu mô tả hành động chính, dùng cho giao diện và cho prompt của lớp AI. */
export function moTaHanhDong(h: PrimaryAction | null): string {
  if (!h) return "không xác định được";
  switch (h.type) {
    case "swap":
      return `hoán đổi ${h.from} sang ${h.to}`;
    case "chuyển token":
      return `chuyển ${h.from} đi`;
    case "nhận token":
      return `nhận ${h.to}`;
    case "chuyển SOL":
      return "chuyển SOL đi";
    default:
      return h.type;
  }
}

const TEN_LECH: Record<HauQuaLech["loai"], string> = {
  doi_chu: "đổi chủ tài khoản token",
  cap_quyen_rut: "cấp quyền rút cho ví khác",
  trao_quyen_dong: "trao quyền đóng tài khoản",
  doi_chuong_trinh: "đổi chương trình điều khiển tài khoản",
};

export function moTaLech(l: HauQuaLech): string {
  return `${TEN_LECH[l.loai]} sang ${l.benNhan}`;
}
