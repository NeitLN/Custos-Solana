/*
 * HAI APP, MỘT QUY TẮC ĐỊA CHỈ.
 *
 * Ví và trang tấn công phải nói chuyện được với nhau và với cùng một endpoint RPC.
 * Trước file này, mỗi bên tự quyết:
 *
 *   · ví        `chonRpc(ht)` — ưu tiên `VITE_RPC` khi DEV, rồi `ht.rpc`, rồi Devnet công cộng
 *   · tấn công  `new Connection(ht.rpc)` — thẳng, không override, không đường lui
 *
 * Hệ quả đo được: đặt `VITE_RPC` trỏ vào một RPC riêng cho buổi demo thì ví dùng nó
 * còn trang tấn công vẫn đập vào endpoint công cộng — đúng cái nó được đặt ra để
 * tránh. Và `ht.rpc` vắng mặt thì ví lui về Devnet công cộng, trang tấn công thì
 * `new Connection("")` ném lỗi.
 *
 * ## Vì sao là hàm THUẦN, và vì sao không đọc `import.meta.env` ở đây
 *
 * `import.meta.env` chỉ tồn tại khi Vite biên dịch. File này nằm trong `scripts/` và
 * được cả `node --test` nạp — đọc `import.meta.env` ở đây là bài kiểm nổ ngay dòng
 * import. Nên mỗi app tự đọc env của nó (một dòng), còn CHÍNH SÁCH — thứ tự ưu tiên,
 * cổng nào ghép với cổng nào, khi nào thì chịu thua — nằm ở đây, một bản duy nhất.
 */

/** Cổng dev của ví mẫu. Trang tấn công chạy ở 5189. */
export const CONG_VI = "5188";
export const CONG_TAN_CONG = "5189";

export const RPC_MAC_DINH = "https://api.devnet.solana.com";

/**
 * Endpoint RPC cho MỘT lượt chạy.
 *
 * `rieng` là override của máy đang chạy demo — bên gọi đọc từ env và **chỉ truyền
 * khi đang DEV**. Ràng buộc đó thuộc về bên gọi chứ không phải ở đây: nó là câu hỏi
 * "bản dựng này là bản nào", mà file này không biết và không nên đoán.
 *
 * Thứ tự cố ý: riêng → hiện trường → công cộng. Không bao giờ trả chuỗi rỗng —
 * `new Connection("")` ném lỗi ở một chỗ xa nơi gây ra nó, và thông điệp lỗi lúc đó
 * không nói gì về cấu hình.
 */
export function chonRpc(rpcHienTruong: string | null | undefined, rieng?: string | null): string {
  return (rieng || "").trim() || (rpcHienTruong || "").trim() || RPC_MAC_DINH;
}

export type KetLuanDiaChiVi =
  | { loai: "co"; url: string; vi: string }
  | { loai: "khong"; lyDo: string };

/**
 * Trang tấn công đứng ở `href` thì ví mẫu ở đâu?
 *
 * Ba môi trường, ba lối:
 *
 *   1. `rieng` — `VITE_CUSTOS_VI` đặt tay. Thắng tất cả; máy demo có quyền tự quyết.
 *   2. Cổng dev `5189` → cùng scheme, cùng host, cổng `5188`.
 *   3. Đã deploy → thư mục cha, vì trang tấn công nằm ở `<base>/tan-cong/`.
 *
 * ## Ca đã hỏng: `127.0.0.1`
 *
 * Bản trước kiểm `location.hostname === "localhost"`. Mở `http://127.0.0.1:5189/` —
 * cùng một máy chủ, chỉ khác cách gõ — thì nhánh 2 trượt, rơi xuống nhánh 3, và
 * `new URL("..", "http://127.0.0.1:5189/")` đã ở gốc nên trả về **chính nó**.
 *
 * Kết quả: bấm "Nhận quà tặng" tải lại trang tấn công. Không lỗi, không cảnh báo,
 * không có gì xảy ra — kiểu hỏng tệ nhất cho một buổi demo trực tiếp. `[::1]` và
 * mọi IP LAN (kiểm trên điện thoại thật) hỏng y hệt.
 *
 * Nên nhánh 2 nay hỏi **cổng**, không hỏi tên máy: cổng 5189 là dấu hiệu chắc chắn
 * hơn của "đang chạy hai dev server", và nó đúng cho localhost, 127.0.0.1, ::1 lẫn
 * `192.168.x.x` khi soi trên điện thoại.
 *
 * ## Vì sao trả về union chứ không trả chuỗi
 *
 * Nhánh 3 có thể không đi lên được (đang ở gốc miền). Trả về chuỗi thì chỉ còn cách
 * trả chính nó — tức dựng lại đúng con đường vừa hỏng. "Không biết ví ở đâu" là một
 * trạng thái thật, và giao diện phải nói ra được thay vì hiện một cái nút không làm
 * gì.
 */
export function diaChiVi(href: string, rieng?: string | null): KetLuanDiaChiVi {
  const dat = (url: string, vi: string): KetLuanDiaChiVi => ({
    loai: "co",
    url: url.replace(/\/+$/, ""),
    vi,
  });

  const r = (rieng || "").trim();
  if (r) return dat(r, "VITE_CUSTOS_VI");

  let day: URL;
  try {
    day = new URL(href);
  } catch {
    return { loai: "khong", lyDo: `địa chỉ trang hiện tại không đọc được: ${href}` };
  }

  if (day.port === CONG_TAN_CONG) {
    const u = new URL(day.href);
    u.port = CONG_VI;
    u.pathname = "/";
    u.search = "";
    u.hash = "";
    return dat(u.href, `cổng dev ${CONG_TAN_CONG} → ${CONG_VI}`);
  }

  const cha = new URL("..", day.href);
  // So sánh sau khi bỏ dấu `/` cuối: `http://a/b/` và `http://a/b` là một chỗ.
  const gon = (x: string) => x.replace(/\/+$/, "");
  if (gon(cha.href) === gon(day.href) || gon(cha.href) === gon(day.origin + day.pathname)) {
    return {
      loai: "khong",
      lyDo:
        `trang tấn công đang ở ${gon(day.href)} — không có thư mục cha để đặt ví. ` +
        `Đặt VITE_CUSTOS_VI, hoặc chạy nó dưới <base>/tan-cong/.`,
    };
  }
  return dat(cha.href, "thư mục cha của trang tấn công");
}
