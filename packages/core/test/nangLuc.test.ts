import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { nangLucCua, tomTatNangLuc } from "../src/l1/nang-luc.ts";
import { SO_LENH_DOC_DUOC, VI_TRI_AUTHORITY } from "../src/l1/decode.ts";
import { BANG_IDL } from "../src/l1/bang-idl.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * CU-13 — REGISTRY TỰ KHAI PHẠM VI NĂNG LỰC.
 *
 * Thẻ cấm: *"Không hardcode 'đã hỗ trợ DEX' chỉ vì đọc được instruction name."*
 *
 * Đo trên registry: **377 lệnh đọc được TÊN, 8 lệnh hiểu được HẬU QUẢ**. Khoảng
 * cách đó là toàn bộ nội dung thẻ. Đọc được `"swap"` từ IDL của Jupiter không có
 * nghĩa Custos biết swap đó lấy bao nhiêu của ai.
 */

test("CU-13 · đọc được TÊN nhiều hơn hẳn hiểu được HẬU QUẢ — và phải nói ra", () => {
  /*
   * BÀI QUAN TRỌNG NHẤT.
   *
   * Nếu hai con số này bằng nhau thì hoặc registry đã tiến bộ vượt bậc, hoặc ai đó
   * vừa khai khống mức `hieuHauQua`. Bài đòi khoảng cách phải CÒN — và khi nó thu
   * hẹp thật thì bài sẽ đỏ, buộc người sửa phải nhìn lại con số.
   */
  const t = tomTatNangLuc();
  assert.ok(t.soLenhDocTen > 0, "registry không đọc được lệnh nào");
  assert.ok(
    t.soLenhHieuHauQua < t.soLenhDocTen,
    `hiểu hậu quả ${t.soLenhHieuHauQua} = đọc tên ${t.soLenhDocTen} — khai khống mức năng lực?`,
  );
  // Và phải nhỏ hơn NHIỀU, không phải nhỏ hơn một chút.
  assert.ok(
    t.soLenhHieuHauQua * 10 < t.soLenhDocTen,
    "khoảng cách thu hẹp bất thường — kiểm lại xem có gán `hieuHauQua` cho program chưa có semantic adapter không",
  );
});

test("CU-13 · chỉ SPL Token và Token-2022 đạt mức `hieuHauQua`", () => {
  /*
   * `VI_TRI_AUTHORITY` mô tả bố cục account CỐ ĐỊNH của SPL Token. Suy rộng nó ra
   * program khác vì tên lệnh trùng là bịa: một program tự đặt tên `transfer` không
   * có nghĩa account thứ 2 của nó là authority.
   */
  const hieu = tomTatNangLuc().danhSach.filter((x) => x.muc === "hieuHauQua");
  const dc = new Set(hieu.map((x) => x.programId));
  assert.deepEqual(
    [...dc].sort(),
    [TOKEN_PROGRAM_ID.toBase58(), TOKEN_2022_PROGRAM_ID.toBase58()].sort(),
    "chỉ hai program SPL Token được phép ở mức hiểu hậu quả",
  );
});

test("CU-13 · program qua IDL dừng ở `docDuocTen`, KHÔNG lên `hieuHauQua`", () => {
  /*
   * Đây là ca thẻ cấm đích danh. Bảy program đọc được tên qua IDL công bố trên
   * chuỗi — trong đó có Jupiter và Pump AMM. Không program nào trong số đó có
   * semantic adapter, nên không program nào được lên mức cao hơn.
   */
  for (const p of BANG_IDL.keys()) {
    const n = nangLucCua(p);
    assert.notEqual(
      n.muc,
      "hieuHauQua",
      `${p} chỉ có IDL mà bị gán mức hiểu hậu quả — đúng thứ thẻ cấm`,
    );
    assert.equal(n.nguonNhanDang, "idl-tren-chuoi");
    assert.deepEqual(n.lenhHieuHauQua, [], "program chỉ có IDL không được khai lệnh hiểu hậu quả");
  }
});

test("CU-13 · program LẠ ⇒ `khongBiet`, không phải `docDuocTen`", () => {
  const n = nangLucCua("LaHoacKhongCoTrongRegistry11111111111111111");
  assert.equal(n.muc, "khongBiet");
  assert.equal(n.soLenhDocTen, 0);
  assert.equal(n.daXacMinh, false);
});

test("CU-13 · nhận diện SPL Token bằng ĐỊA CHỈ, không bằng số lệnh", () => {
  /*
   * Bản đầu của tôi viết `soLenh === 44` — đúng hôm nay và sai im lặng ngay khi
   * bảng lệnh đổi. Nhận diện một program bằng số lệnh của nó là dựa vào thứ không
   * định danh gì cả: hai program khác nhau hoàn toàn có thể cùng có 44 lệnh.
   *
   * Bài đọc mã vì hậu quả chỉ lộ ra khi bảng đổi — tức là sau khi đã sai.
   */
  const s = doc("packages/core/src/l1/nang-luc.ts");
  assert.match(s, /programId === SPL_TOKEN_ID \|\| programId === TOKEN_2022_ID/);
  /*
   * `soLenh === 0` là phép kiểm HỢP LỆ — nó hỏi "registry có biết program này
   * không", không phải "program này là cái nào". Bản đầu của guard cấm mọi
   * `soLenh === <số>` và đỏ vì chính dòng đó: đỏ vì lý do sai.
   *
   * Điều cần cấm hẹp hơn: so số lệnh với một con số KHÁC 0 để suy ra danh tính.
   */
  /*
   * TÁCH CHÚ THÍCH TRƯỚC KHI TÌM — và tôi vừa mắc lại đúng lỗi đã ghi trong bàn
   * giao. Chú thích của `nang-luc.ts` kể lại lỗi cũ bằng chính chuỗi `soLenh === 44`,
   * nên guard khớp phải câu văn mô tả điều nó muốn cấm.
   */
  const maSach = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const soSanhDanhTinh = [...maSach.matchAll(/soLenh === (\d+)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n !== 0);
  assert.deepEqual(
    soSanhDanhTinh,
    [],
    "không được nhận diện program bằng số lệnh của nó — hai program khác nhau có thể cùng số lệnh",
  );
});

test("CU-13 · bảng năng lực SINH từ registry, không gõ tay", () => {
  /*
   * CU-17 sẽ đòi UI, CLI và docs cùng nói một phạm vi. Điều kiện cần là con số chỉ
   * có MỘT nguồn — repo này đã có bài học với số test gõ tay ở sáu tài liệu.
   */
  const t = tomTatNangLuc();
  assert.equal(t.soProgramDocTen, SO_LENH_DOC_DUOC.size, "số program phải khớp registry");
  const tongThat = [...SO_LENH_DOC_DUOC.values()].reduce((a, b) => a + b, 0);
  assert.equal(t.soLenhDocTen, tongThat, "tổng lệnh phải khớp registry");
  assert.equal(
    t.soLenhHieuHauQua,
    Object.keys(VI_TRI_AUTHORITY).length * 2,
    "lệnh hiểu hậu quả = 4 lệnh × 2 program SPL Token",
  );
});

test("CU-13 · danh sách sắp theo số lệnh giảm dần — program lớn nhất lên đầu", () => {
  // Người đọc cần thấy trước thứ chiếm phần lớn giao dịch họ gặp.
  const ds = tomTatNangLuc().danhSach;
  for (let i = 1; i < ds.length; i++) {
    assert.ok(ds[i - 1]!.soLenhDocTen >= ds[i]!.soLenhDocTen, "danh sách không sắp đúng");
  }
});

test("CU-13 · tài liệu của module nói đúng con số ĐO ĐƯỢC", () => {
  /*
   * Chú thích mở đầu có hai con số. Chúng trôi khi registry đổi, và trôi im lặng —
   * không ai đối chiếu một dòng chú thích với hàm ngay dưới nó.
   *
   * Bài này đối chiếu. Đây đúng hình dạng lỗi mà ADR-0002 đã gặp với "2/14 luật".
   */
  const t = tomTatNangLuc();
  const s = doc("packages/core/src/l1/nang-luc.ts");
  const i = s.indexOf("Đo trên chính registry");
  assert.ok(i > 0, "mất khối tự khai con số");
  const khoi = s.slice(i, i + 400);
  assert.ok(
    khoi.includes(String(t.soLenhDocTen)),
    `chú thích không nói con số thật ${t.soLenhDocTen} lệnh đọc được tên`,
  );
  assert.ok(
    khoi.includes(String(t.soLenhHieuHauQua)),
    `chú thích không nói con số thật ${t.soLenhHieuHauQua} lệnh hiểu hậu quả`,
  );
});
