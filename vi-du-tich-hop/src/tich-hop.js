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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * "CHẶN VÌ PHÁT HIỆN" VÀ "CHẶN VÌ KHÔNG KIỂM ĐƯỢC" LÀ HAI CHUYỆN.
 *
 * Cả hai đều trả `cho: "chan"` — đúng, vì cả hai đều không được ký. Nhưng gộp
 * chúng làm một thì:
 *
 *   · ví hiện cho người dùng một cảnh báo nguy hiểm trong khi thật ra Devnet chậm,
 *     và người dùng học được rằng cảnh báo của Custos hay báo bừa;
 *   · bộ đo ghi một lượt mạng hỏng thành "phát hiện sai", tức nói xấu chính engine
 *     luật của mình bằng dữ liệu sai.
 *
 * Nên `lyDo` đi kèm quyết định. `cho` trả lời *ví phải làm gì*; `lyDo` trả lời
 * *vì sao* — và hai câu đó không được suy ra từ nhau.
 */

/** Quá hạn thì coi như chưa kiểm được — không phải coi như an toàn. */
const HAN_MS = 12_000;

function coHan(viec, ms) {
  let dongHo;
  const chuong = new Promise((_, tuChoi) => {
    dongHo = setTimeout(() => tuChoi(new Error(`Custos timed out after ${ms} ms`)), ms);
  });
  return Promise.race([viec, chuong]).finally(() => clearTimeout(dongHo));
}

/**
 * Run Custos before signing. Returns the decision for the dApp.
 *
 * @returns {Promise<{
 *   cho: "ky"|"hoi"|"chan",
 *   lyDo: "khong_van_de"|"coverage_khuyet"|"de_nghi_kiem_tra"|"phat_hien"|"khong_kiem_duoc",
 *   ketQua: object|null,
 *   loi: string|null,
 * }>}
 */
// `hanMs` is exposed for tests: without it, the most important property of this file —
// a timeout does NOT become "safe" — could only be tested by waiting 12 real seconds, i.e.
// nobody would test it. The parameter list stays on one line because the integration line
// count is PUBLISHED; wrapping it for looks would inflate it without any extra integration work.
export async function kiemTruocKhiKy({ inspect, connection, interpret, tx, viNguoiDung, dAppKhai, hanMs = HAN_MS }) {
  let r;
  try {
    r = await coHan(
      inspect({ connection, interpret }, tx, {
        locale: "en",
        // (1) address taken from the user's own wallet
        nguoiDung: viNguoiDung.toBase58(),
        // (2) context declared by the dApp — only used to detect mismatches
        ...(dAppKhai ? { expectedAction: dAppKhai } : {}),
      }),
      hanMs,
    );
  } catch (e) {
    // (3) FAIL CLOSED. This is the most important line in the whole file.
    const loi = e instanceof Error ? e.message : String(e);
    return { cho: "chan", lyDo: "khong_kiem_duoc", ketQua: null, loi };
  }

  if (r.level === "danger") return { cho: "chan", lyDo: "phat_hien", ketQua: r, loi: null };
  if (r.level === "warning") return { cho: "hoi", lyDo: "phat_hien", ketQua: r, loi: null };

  // If coverage is incomplete but the engine still says `safe`, the integrator should still ask:
  // "understood 1 of 3 instructions" is not a guarantee.
  if (r.coverage && r.coverage.analyzed < r.coverage.total) {
    return { cho: "hoi", lyDo: "coverage_khuyet", ketQua: r, loi: null };
  }
  // Custos asks for a manual check (explanation layer, or the dApp's declaration mismatched). It does not
  // change `level` — but if you skip it, that request never reaches the user.
  if (r.aiAdvisory === "review_required") return { cho: "hoi", lyDo: "de_nghi_kiem_tra", ketQua: r, loi: null };
  return { cho: "ky", lyDo: "khong_van_de", ketQua: r, loi: null };
}
