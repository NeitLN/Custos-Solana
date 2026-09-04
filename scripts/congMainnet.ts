/**
 * CỔNG CHO BA SCRIPT NGHIÊN CỨU CHẠM MAINNET.
 *
 * Custos tuyên bố runtime **chỉ chạy Devnet**, và tuyên bố đó có thật: ví, trang
 * tấn công, demo công khai đều không biết địa chỉ mainnet nào. Nhưng ba script đo
 * (`do-bao-nham`, `do-chi-phi`, `do-cohort`) thì có — chúng đọc giao dịch công khai
 * lịch sử để thu dữ liệu, chạy tay khi thu, không nằm trong sản phẩm.
 *
 * Rủi ro không phải là ba script này tồn tại, mà là chúng chạy KHÔNG CHỦ Ý:
 *
 *   · một người mới clone về, gõ `node scripts/do-cohort.ts` để xem nó làm gì, và
 *     lập tức bắn hàng trăm lượt gọi vào RPC công cộng miễn phí;
 *   · một lần ai đó nối chúng vào `npm run check` hoặc CI — lúc đó câu "runtime
 *     chỉ Devnet" thành nói sai, và không ai nhận ra vì test vẫn xanh.
 *
 * Nên chạm mainnet phải là một HÀNH ĐỘNG CÓ CHỦ Ý, khai báo bằng biến môi trường:
 *
 *     CUSTOS_OFFLINE_MAINNET_RESEARCH=1 node --experimental-strip-types scripts/do-cohort.ts
 *
 * Tên biến dài và có chữ `OFFLINE_RESEARCH` là cố ý: ai gõ nó cũng đọc được rằng
 * đây là nghiên cứu ngoài luồng chạy, không phải một phần sản phẩm.
 */
export const BIEN_CHO_PHEP = "CUSTOS_OFFLINE_MAINNET_RESEARCH";

/** `true` khi người chạy đã khai báo rõ ý định chạm mainnet. */
export function daChoPhepMainnet(moiTruong: Record<string, string | undefined>): boolean {
  return moiTruong[BIEN_CHO_PHEP] === "1";
}

export function loiChuaChoPhep(ten: string, rpc: string): string {
  return [
    `✖ ${ten} đọc giao dịch trên MAINNET (${rpc}) — cần cho phép rõ ràng.`,
    "",
    "  Runtime của Custos chỉ chạy Devnet. Script này là nghiên cứu ngoài luồng chạy:",
    "  nó thu dữ liệu từ giao dịch công khai lịch sử, chạy tay, không nằm trong sản phẩm.",
    "",
    `  Muốn chạy thật thì khai báo ý định đó:`,
    `      ${BIEN_CHO_PHEP}=1 node --experimental-strip-types scripts/${ten}`,
    "",
    "  Đừng nối script này vào `npm run check` hay CI: làm vậy thì câu",
    '  "runtime chỉ chạy Devnet" thành nói sai, mà test vẫn xanh nên không ai thấy.',
  ].join("\n");
}

/** Dừng tiến trình nếu chưa được cho phép. Gọi TRƯỚC khi mở kết nối. */
export function chanNeuChuaChoPhep(ten: string, rpc: string): void {
  if (daChoPhepMainnet(process.env)) return;
  console.error(loiChuaChoPhep(ten, rpc));
  process.exit(1);
}
