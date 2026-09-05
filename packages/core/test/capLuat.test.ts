import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { danhGia } from "../src/l2/evaluate.ts";
import { giaiDongBangFacts } from "../src/facts-io.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

type Mau = {
  id: string;
  luat: number | null;
  facts: string;
  bangChung: string;
  kyVong: { level: string; coMa?: string[]; khongCoMa?: string[] };
};

const hoSo = JSON.parse(doc("data/seed/index.json")) as { mau: Mau[] };

/*
 * BENCHMARK TUÂN THỦ LUẬT — KHÔNG PHẢI ĐO ĐỘ CHÍNH XÁC.
 *
 * Bắt được ca dương tính là nửa dễ. Nửa khó là IM LẶNG trên ca gần giống mà chỉ
 * khác đúng điều kiện quyết định — vì đó là chỗ sinh ra cảnh báo oan, và một sản
 * phẩm bảo mật hay kêu oan thì người dùng sẽ tắt nó đi.
 *
 * Được gọi kết quả này là: rule-conformance, paired scenario, regression boundary.
 * KHÔNG được gọi là: độ chính xác thực tế, precision/recall, tỉ lệ báo nhầm trên
 * thị trường. Bộ mẫu này do đội dựng để kiểm ranh giới kích hoạt, không phải mẫu
 * đại diện cho traffic thật.
 *
 * Cách phân loại lấy từ `kyVong`, KHÔNG lấy từ trường `cuc`. `cuc` mang hai nghĩa
 * lẫn nhau: `thu-dataset.ts` gán "duong" cho mọi mẫu devnet tự dựng và "am" cho
 * mẫu mainnet ngẫu nhiên — tức là nó chỉ NGUỒN mẫu. Nhưng R13-neg/R14-neg lại
 * được gắn tay "am" theo nghĩa CA ĐỐI CHỨNG. Một trường hai nghĩa thì không đếm
 * được. `kyVong.coMa` / `kyVong.khongCoMa` thì không mơ hồ.
 */
const coLuat = hoSo.mau.filter((m) => m.luat !== null);
const kichHoat = (l: number) => coLuat.filter((m) => m.luat === l && m.kyVong.coMa?.length);
const doiChung = (l: number) => coLuat.filter((m) => m.luat === l && m.kyVong.khongCoMa?.length);

const LUAT = Array.from({ length: 14 }, (_, i) => i + 1);
const coCap = LUAT.filter((l) => kichHoat(l).length > 0 && doiChung(l).length > 0);
const thieuDoiChung = LUAT.filter((l) => doiChung(l).length === 0);

/**
 * Luật đã biết là chưa có ca đối chứng, kèm lý do. Danh sách này chỉ được RÚT NGẮN.
 *
 * Ghi ra đây thay vì để test xanh im lặng: một khoảng trống có tên thì có người sửa,
 * một khoảng trống không ai đếm thì nằm đó tới ngày bị hỏi.
 */
const CHUA_CO_DOI_CHUNG = new Map<number, string>([
  [1, "SetAuthority AccountOwner — cần ca đổi chủ HỢP LỆ (ví tự chuyển sang ví mình quản lý)"],
  [2, "SetAuthority CloseAccount — cần ca đóng tài khoản rỗng đúng quy trình"],
  [4, "cần ca gần giống chỉ khác điều kiện quyết định"],
  [8, "ví nhận mới tinh — luật chỉ kích hoạt khi TRA ĐƯỢC tuổi ví, nên ca kích hoạt cũng chưa khẳng định được mã"],
  [12, "cần ca gần giống chỉ khác điều kiện quyết định"],
]);

test("benchmark tuân thủ luật — mỗi ca đối chứng phải IM đúng mã của nó", () => {
  const pham: string[] = [];
  for (const m of coLuat) {
    const r = danhGia(giaiDongBangFacts(doc(`data/seed/${m.facts}`)));
    for (const ma of m.kyVong.khongCoMa ?? []) {
      if (r.reasonCodes.includes(ma)) {
        pham.push(`${m.id} (luật ${m.luat}): PHẢI IM mã ${ma} nhưng đã bật — ${m.bangChung.slice(0, 70)}`);
      }
    }
    for (const ma of m.kyVong.coMa ?? []) {
      if (!r.reasonCodes.includes(ma)) {
        pham.push(`${m.id} (luật ${m.luat}): PHẢI BẬT mã ${ma} nhưng im — ${m.bangChung.slice(0, 70)}`);
      }
    }
  }
  assert.deepEqual(pham, [], "Ranh giới kích hoạt đã trôi:\n" + pham.join("\n"));
});

test("số luật có cặp kích-hoạt + đối-chứng không được tụt", () => {
  console.log(`
    luật có cặp   : ${coCap.join(", ")}  (${coCap.length}/14)`);
  console.log(`    chưa đối chứng: ${thieuDoiChung.join(", ")}`);

  // Ngưỡng là mức HIỆN TẠI, không phải mức mong muốn. Nó chỉ được đi lên.
  assert.ok(
    coCap.length >= 9,
    `chỉ còn ${coCap.length}/14 luật có cặp — trước đây là 9. Đừng xoá ca đối chứng.`,
  );
});

test("mọi luật thiếu đối chứng đều được kê tên, kèm lý do", () => {
  // Một khoảng trống có tên thì có người sửa; không ai đếm thì nó nằm tới ngày bị hỏi.
  const khongKe = thieuDoiChung.filter((l) => !CHUA_CO_DOI_CHUNG.has(l));
  assert.deepEqual(khongKe, [], `luật ${khongKe.join(", ")} thiếu ca đối chứng mà không được kê trong CHUA_CO_DOI_CHUNG`);

  // Chiều ngược lại: kê một luật đã có đối chứng rồi là danh sách lỗi thời.
  const dsThua = [...CHUA_CO_DOI_CHUNG.keys()].filter((l) => doiChung(l).length > 0);
  assert.deepEqual(dsThua, [], `luật ${dsThua.join(", ")} ĐÃ có ca đối chứng — xoá khỏi CHUA_CO_DOI_CHUNG`);
});

test("tài liệu của benchmark nói rõ được gọi nó là gì", () => {
  /*
   * Bản đầu của bài kiểm này quét chính file nguồn tìm cụm "độ chính xác" — và nó
   * bắt đúng dòng ĐỊNH NGHĨA mẫu quét. Guard tự tố cáo mình.
   *
   * Việc canh cách gọi con số trên tài liệu công khai đã có `claim.test.ts` lo.
   * Thứ file này cần bảo vệ là điều người đọc nó tiếp theo phải biết: gọi kết quả
   * này bằng tên nào, và tuyệt đối không gọi bằng tên nào.
   */
  const s = doc("packages/core/test/capLuat.test.ts");
  assert.match(s, /rule-conformance/, "phải nêu tên được phép dùng");
  assert.match(s, /KHÔNG được gọi là/, "phải nêu thẳng tên bị cấm");
  assert.match(s, /không phải mẫu[^.]*đại diện/i, "phải nói rõ bộ mẫu không đại diện traffic thật");
});
