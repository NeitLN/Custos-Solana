/**
 * RPC DỰ PHÒNG — review 26/09, mục 3.3.
 *
 * Đo được hôm đó: `api.devnet.solana.com` trả `getBalance` trong 0,16 s nhưng
 * `getAccountInfo`/`getMultipleAccounts` quá hạn liên tục hơn một giờ. Custos đọc tài
 * khoản ở mọi lượt kiểm, nên ví, trang tấn công và luồng thực thi dừng cùng lúc vì một
 * endpoint.
 *
 * Ba nguyên tắc:
 *
 *   1. CHỈ lệnh ĐỌC được chuyển endpoint. Gửi lại một giao dịch đã ký ở nơi khác sau khi
 *      quá hạn là đúng thứ luồng ký cố ý không làm (`live/rpc.ts`).
 *   2. Endpoint vừa trả lời tốt được ưu tiên ở lượt sau — không chờ quá hạn lần nữa.
 *   3. KHÔNG tự thêm nhà cung cấp nào. Giao dịch của người dùng đi qua RPC; danh sách do
 *      người vận hành khai (`VITE_RPC_DU_PHONG`), và như `VITE_RPC`, chỉ đọc khi DEV —
 *      URL có khoá không được vào bản công khai.
 */

import { Connection } from "@solana/web3.js";

const LA_DOC = (method: string) => method.startsWith("get") || method === "simulateTransaction" || method === "isBlockhashValid";

/** Endpoint chính trước, rồi dự phòng (chuỗi phân cách dấu phẩy); bỏ rỗng, bỏ trùng. */
export function danhSachRpc(chinh: string, duPhong: string | null | undefined): string[] {
  const ds = [chinh, ...(duPhong ?? "").split(",")].map((s) => s.trim()).filter(Boolean);
  return [...new Set(ds)];
}

export function fetchDuPhong(
  dsUrl: string[],
  { msMoiLuot = 6000, transport = fetch }: { msMoiLuot?: number; transport?: typeof fetch } = {},
): typeof fetch {
  let uuTien = 0;
  return async (input, init) => {
    let method = "";
    try {
      method = JSON.parse(String(init?.body)).method ?? "";
    } catch {
      /* không đọc được method ⇒ coi như lệnh ghi: không chuyển endpoint */
    }
    // Lệnh ghi, hoặc chỉ có một endpoint: đi thẳng, không bọc gì thêm.
    if (!LA_DOC(method) || dsUrl.length < 2) return transport(input, init);

    let loiCuoi: unknown = new Error("không có endpoint RPC nào");
    // Mọi endpoint cùng trả 429/5xx thì TRẢ LẠI phản hồi đó thay vì ném: web3.js tự chờ
    // rồi thử lại khi gặp 429, và ném lỗi ở đây sẽ tước mất cơ chế đó.
    let phanHoiCuoi: Response | null = null;
    for (let k = 0; k < dsUrl.length; k++) {
      const i = (uuTien + k) % dsUrl.length;
      const han = AbortSignal.timeout(msMoiLuot);
      const signal = init?.signal ? AbortSignal.any([init.signal, han]) : han;
      try {
        const r = await transport(dsUrl[i]!, { ...init, signal });
        if (r.status === 429 || r.status >= 500) {
          phanHoiCuoi = r;
          continue;
        }
        uuTien = i;
        return r;
      } catch (e) {
        // Bên gọi tự huỷ thì dừng — đó không phải lỗi của endpoint.
        if (init?.signal?.aborted) throw e;
        loiCuoi = e;
      }
    }
    if (phanHoiCuoi) return phanHoiCuoi;
    throw loiCuoi;
  };
}

/**
 * `Connection` đọc qua danh sách endpoint. Chỉ một endpoint thì là `Connection` thường —
 * không khai dự phòng thì hành vi y như trước.
 */
export function ketNoiDuPhong(dsUrl: string[], commitment: "confirmed" = "confirmed"): Connection {
  return new Connection(dsUrl[0]!, {
    commitment,
    ...(dsUrl.length > 1 ? { fetch: fetchDuPhong(dsUrl) } : {}),
  });
}
