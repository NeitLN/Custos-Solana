import { Keypair } from "@solana/web3.js";

const KHOA_LUU = "custos.vi-demo";

/**
 * Ví của Demo Wallet — PHẢI cố định giữa các lần tải trang.
 *
 * Bản đầu sinh ví mới mỗi lần render. Hậu quả: nạp tiền xong, reload một cái là
 * mất trắng. Mà kế hoạch demo yêu cầu "ví nạp sẵn" — ví ephemeral không nạp sẵn
 * được, và trên sân khấu thì không có cơ hội nạp lại.
 *
 * Thứ tự ưu tiên:
 *   1. VITE_DEMO_SECRET  — dùng chung ví với các script devnet, nạp tiền một lần
 *   2. localStorage      — giữ được qua reload
 *   3. sinh mới          — lần chạy đầu
 *
 * Đây là ví DEVNET dùng để minh hoạ. Không bao giờ dùng cơ chế này cho tiền thật.
 */
/** Bản deploy công khai KHÔNG nhúng khoá ký của hiện trường.
 *
 *  Người xem vẫn chạy được `inspect()` và thấy đầy đủ màn cảnh báo — mô phỏng
 *  không cần chữ ký. Cái họ không làm được là KÝ, và đó là chủ đích:
 *
 *    - không ai phá được hiện trường của đội trước buổi thi
 *    - không nhúng khoá riêng vào một trang web công khai
 *
 *  Ký được hay không do có `VITE_DEMO_SECRET` hay không quyết định. */
export const kyDuoc = (): boolean => Boolean(import.meta.env["VITE_DEMO_SECRET"]);

export function napVi(): Keypair {
  const tuEnv = import.meta.env["VITE_DEMO_SECRET"];
  if (tuEnv) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(tuEnv) as number[]));
    } catch {
      console.warn("[custos] VITE_DEMO_SECRET không đọc được — bỏ qua");
    }
  }

  const daLuu = localStorage.getItem(KHOA_LUU);
  if (daLuu) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(daLuu) as number[]));
    } catch {
      localStorage.removeItem(KHOA_LUU);
    }
  }

  const kp = Keypair.generate();
  localStorage.setItem(KHOA_LUU, JSON.stringify([...kp.secretKey]));
  return kp;
}
