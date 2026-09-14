/**
 * PHẦN THUẦN CỦA BỘ ĐO EVAL — tách khỏi `eval-ai.ts` để import được mà KHÔNG chạy gì.
 *
 * Vì sao file này tồn tại (T03 của review 12/09):
 *
 *   `eval-ai.ts` có `await main()` ở cấp module. `soChoPhep.test.ts` import hai hàm
 *   thuần từ đó, nên MỖI lượt `npm run check` lại chạy cả bộ eval và ghi đè
 *   `data/eval/ai-ket-qua.json` — chỉ đổi `doLuc`, nhưng đó là artifact bằng chứng.
 *   Đo được bằng hash trước/sau: khác nhau mỗi lượt.
 *
 *   Một bộ kiểm làm thay đổi chính bằng chứng nó đang kiểm là thứ không dùng được:
 *   không ai phân biệt nổi "artifact đổi vì code đổi" với "artifact đổi vì vừa chạy
 *   test". Và cổng `kiem-san-pham` canh cây làm việc sạch sẽ đỏ vĩnh viễn.
 *
 * Cách sửa chọn theo thẻ TB-C04: **tách hàm thuần sang module riêng**, không dùng
 * `import.meta` để bảo vệ entrypoint. Lý do: một guard bằng `import.meta` vẫn nằm
 * trong file có side effect, nên nó chỉ đúng chừng nào không ai thêm lệnh ghi mới
 * lên trên nó. Tách file thì side effect không có đường vào — nó không thể hỏng
 * theo cách đó.
 *
 * QUY TẮC CỦA FILE NÀY: chỉ hàm thuần. Không đọc/ghi file, không mạng, không
 * `process.exit`, không lệnh chạy ở cấp module. `packages/core/test/c04KhongGhi.test.ts`
 * canh đúng điều đó.
 */
import { dinhDangSo, dungBangChenhLech } from "../packages/core/src/diff.ts";
import type { Facts } from "../packages/core/src/facts.ts";

/**
 * Câu này có nêu phần giao dịch CHƯA đọc hiểu được không?
 *
 * Dùng chung cho cả mô hình lẫn câu mẫu — hai bên phải bị đo bằng đúng một thước,
 * nếu không thì phần chênh đo được chỉ là chênh giữa hai cách đếm.
 */
export const neuCoverage = (chu: string): boolean =>
  /chưa (được )?(phân tích|đọc|xác minh|hiểu)|không (thể )?(đọc|hiểu)|chưa đọc hiểu/i.test(chu);

/** Địa chỉ Solana. Whitelist gửi mô hình KHÔNG chứa địa chỉ nào — nên thấy là bịa. */
export const DIA_CHI = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

/**
 * Số mà mô hình ĐƯỢC PHÉP nhắc: số dư trước/sau đã chia decimals, và coverage.
 * Mọi số khác trong lời giải thích là số mô hình tự nghĩ ra.
 */
export function soChoPhep(facts: Facts, ma: string[], hits: unknown[] = []): Set<string> {
  const ra = new Set<string>();
  const dec = (m: string) => facts.mints.find((x) => x.address === m)?.decimals ?? 0;
  for (const t of facts.tokenAccounts) {
    ra.add(dinhDangSo(t.amountBefore, dec(t.mint)));
    ra.add(dinhDangSo(t.amountAfter, dec(t.mint)));
  }
  /*
   * Lấy số từ CHÍNH BẢNG CHÊNH LỆCH — nguồn mà phần hiển thị dùng.
   *
   * Bản đầu tự dựng lại danh sách số cho phép và bỏ sót SOL delta lẫn cách định
   * dạng thật, nên nó tố 13/33 ca "bịa số" trên đường TẤT ĐỊNH. Đường đó dựng câu
   * từ facts nên không bịa được: chính bộ đếm sai.
   *
   * Câu mẫu tất định là MẪU ĐỐI CHỨNG của bài đo này. Bộ đếm nào tố cáo nó thì sẽ
   * tố cáo oan mô hình y hệt — và đọc một tỉ lệ ảo tưởng là đã đo được cái gì đó
   * còn tệ hơn không đo. Hiệu chỉnh tới khi mẫu đối chứng sạch rồi mới tin số.
   */
  // SOL: câu mẫu quy lamport ra SOL (9 chữ số thập phân). Bảng chênh lệch có thể
  // rỗng ở những ca chỉ động tới SOL, nên phải lấy thẳng từ `solDelta`.
  for (const v of Object.values(facts.solDelta)) {
    const x = v < 0n ? -v : v;
    ra.add(dinhDangSo(x, 9));
    ra.add(dinhDangSo(x, 0));
  }
  for (const d of dungBangChenhLech(facts, hits as never)) {
    for (const v of [d.before, d.after]) {
      for (const m of String(v).matchAll(/\d[\d.,]*/g)) ra.add(m[0].replace(/[.,]$/, ""));
    }
  }
  ra.add(String(facts.coverage.analyzed));
  ra.add(String(facts.coverage.total));
  ra.add(String(facts.instructions.length));
  ra.add(String(ma.length));
  /*
   * LẦN THỨ TƯ BỘ ĐẾM NÀY TỐ OAN — và lần đầu có bằng chứng để phán xử.
   *
   * Lượt live 12/09 tố 10 vi phạm. Đối chiếu từng câu với facts: **7 câu nói đúng
   * facts**, chỉ là whitelist thiếu hai nguồn mà chính prompt gửi cho mô hình:
   *
   *   1. `coverage.unverifiedPrograms` — prompt gửi nó, câu mẫu tất định KHÔNG in
   *      nó ra, nên `soTuCauMau` không nhặt được. Mô hình nói "2 chương trình chưa
   *      được xác minh" với `unverifiedPrograms: 2` là ĐỌC ĐÚNG, không phải bịa.
   *   2. `total - analyzed` — số lệnh CHƯA đọc hiểu được. Đây là phép trừ trên hai
   *      số đã cho phép, không phải thông tin mới. Cấm nó tức là cấm mô hình diễn
   *      đạt cùng một sự thật theo chiều ngược lại.
   *
   * Ba câu còn lại sai thật (MN-07 nói 10 lệnh khi chưa đọc hiểu 12; MN-08 nói 9
   * khi là 11; MN-10 nói 4 khi là 5) — và chỉ sau khi vá hai nguồn này thì ba cái
   * đó mới nổi lên được. Một bộ đếm kêu 10 lần để đúng 3 lần thì người đọc tắt nó
   * trước khi tới cái thứ ba.
   */
  ra.add(String(facts.coverage.unverifiedPrograms));
  ra.add(String(facts.coverage.total - facts.coverage.analyzed));
  // Số 0 và 1 xuất hiện tự nhiên trong câu tiếng Việt ("một lệnh", "0 đồng").
  ra.add("0");
  ra.add("1");
  return ra;
}

/*
 * ĐƯỜNG TẤT ĐỊNH LÀ MẪU ĐỐI CHỨNG, VÀ NÓ ĐỊNH NGHĨA TẬP SỐ HỢP LỆ.
 *
 * Tôi đã ba lần tự dựng lại danh sách "số được phép" và ba lần bỏ sót một nguồn:
 * SOL delta, tuổi ví, cách định dạng `500,0`. Mỗi lần bỏ sót là một lần bài đo tố
 * cáo oan chính đường KHÔNG THỂ BỊA — mà một bộ đo hay tố oan thì đọc số của nó
 * cũng vô nghĩa. Đây đúng lỗi mà sản phẩm này sinh ra để chống, gặp lại trong
 * chính công cụ đo nó.
 *
 * Nên thôi đoán: câu mẫu tất định dựng chữ từ facts, vậy MỌI số nó in ra đều
 * grounded theo định nghĩa. Lấy luôn tập đó làm chuẩn.
 *
 * GIỚI HẠN, nói trước khi ai hỏi: cách này bắt được số mô hình BỊA RA, không bắt
 * được số grounded nhưng GHÉP SAI (lấy đúng số của ví A gán cho ví B). Loại sai
 * thứ hai cần người đọc — rubric ở `docs/AI-EVALUATION.md`.
 */
export function soTuCauMau(chu: string): Set<string> {
  return new Set(
    [...chu.matchAll(/(?<![\w…])\d[\d.,]*(?![\w…])/g)].map((m) => m[0].replace(/[.,]$/, "")),
  );
}

export function soLa(chu: string, chophep: Set<string>): string[] {
  /*
   * Chỉ tính chữ số ĐỨNG RIÊNG như một lượng. Bản đầu quét mọi chuỗi số và báo
   * 27/33 ca "bịa số" trên đường TẤT ĐỊNH — đường không thể bịa. Nguyên nhân:
   * câu mẫu viết tắt địa chỉ thành `43JG…4tjd`, và bộ đếm nhặt "43" ra làm một
   * con số. Một phép đo báo động ở nơi không thể có lỗi thì phép đo đó sai.
   */
  return [...chu.matchAll(/(?<![\w…])\d[\d.,]*(?![\w…])/g)]
    .map((m) => m[0].replace(/[.,]$/, ""))
    .filter((s) => !chophep.has(s) && !chophep.has(s.replace(/[.,]/g, "")));
}
