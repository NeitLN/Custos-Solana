/**
 * TOÀN BỘ PHẦN TÍCH HỢP CUSTOS NẰM TRONG FILE NÀY.
 *
 * Để riêng ra một file vì con số "tích hợp tốn bao nhiêu dòng" chỉ có nghĩa khi
 * đếm được. Trộn nó vào logic dApp thì con số đó thành ước lượng.
 *
 * Hợp đồng mà một bên tích hợp phải giữ — ba điều, và cả ba đều là bảo mật:
 *
 *   1. `nguoiDung` lấy từ VÍ, không lấy từ yêu cầu của dApp. Để dApp khai hộ địa
 *      chỉ người ký là mở đúng cái cửa mà trường này sinh ra để đóng.
 *   2. `expectedAction` là điều dApp KHAI. Nó chỉ được làm Custos thận trọng hơn,
 *      không bao giờ dễ dãi hơn — khớp thì KHÔNG hạ mức, lệch thì nâng nghi ngờ.
 *   3. FAIL CLOSED. `inspect()` ném lỗi, quá hạn, hay mất mạng đều KHÔNG được
 *      thành "an toàn". Không kiểm được thì phải hỏi người dùng, không được ký.
 */

/** Quá hạn thì coi như chưa kiểm được — không phải coi như an toàn. */
const HAN_MS = 12_000;

function coHan(viec, ms) {
  let dongHo;
  const chuong = new Promise((_, tuChoi) => {
    dongHo = setTimeout(() => tuChoi(new Error(`Custos quá hạn sau ${ms} ms`)), ms);
  });
  return Promise.race([viec, chuong]).finally(() => clearTimeout(dongHo));
}

/**
 * Chạy Custos trước khi ký. Trả về quyết định cho dApp.
 *
 * @returns {Promise<{cho: "ky"|"hoi"|"chan", ketQua: object|null, loi: string|null}>}
 */
export async function kiemTruocKhiKy({ inspect, connection, interpret, tx, viNguoiDung, dAppKhai }) {
  let r;
  try {
    r = await coHan(
      inspect({ connection, interpret }, tx, {
        locale: "vi",
        // (1) địa chỉ lấy từ ví của chính người dùng
        nguoiDung: viNguoiDung.toBase58(),
        // (2) ngữ cảnh do dApp khai — chỉ để phát hiện lệch
        ...(dAppKhai ? { expectedAction: dAppKhai } : {}),
      }),
      HAN_MS,
    );
  } catch (e) {
    // (3) FAIL CLOSED. Đây là dòng quan trọng nhất của cả file.
    return { cho: "chan", ketQua: null, loi: e instanceof Error ? e.message : String(e) };
  }

  if (r.level === "danger") return { cho: "chan", ketQua: r, loi: null };
  if (r.level === "warning") return { cho: "hoi", ketQua: r, loi: null };

  // Coverage khuyết mà engine vẫn cho `safe` thì bên tích hợp vẫn nên hỏi lại:
  // "đọc hiểu 1/3 lệnh" không phải một lời bảo đảm.
  if (r.coverage && r.coverage.analyzed < r.coverage.total) {
    return { cho: "hoi", ketQua: r, loi: null };
  }
  return { cho: "ky", ketQua: r, loi: null };
}
