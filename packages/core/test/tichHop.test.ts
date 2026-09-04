import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const KET_QUA = "data/tich-hop/ket-qua.json";

/*
 * "CÀI ĐƯỢC TỪ NGOÀI" ≠ "CÓ NGƯỜI NGOÀI DÙNG".
 *
 * `vi-du-tich-hop/` là dApp do CHÍNH ĐỘI viết. Nó chứng minh một điều thật và đo
 * được: SDK cài từ tarball ở vị trí người ngoài, tích hợp hết 29 dòng, chặn đúng
 * giao dịch giả danh airdrop, và fail closed khi RPC chết.
 *
 * Nó KHÔNG chứng minh có bên thứ ba nào chọn dùng Custos. Khoảng cách giữa hai câu
 * đó rất hẹp và rất dễ trượt qua khi đang đứng trên sân khấu — nhất là khi kịch bản
 * pitch có sẵn một câu chốt bắt đầu bằng "một dApp bên ngoài đã tích hợp".
 *
 * Repo này đã phải vá claim hai lần. Lần này khoá trước.
 */
test("kết quả tích hợp tự khai là do đội dựng, không phải đối tác", () => {
  if (!existsSync(join(GOC, KET_QUA))) return; // chưa chạy `thu-tich-hop` thì không có gì để kiểm
  const k = JSON.parse(doc(KET_QUA)) as { doiTac: unknown; ghiChu?: string };
  assert.equal(k.doiTac, null, "chưa có đối tác thì trường này phải là null, không được bịa tên");
  assert.match(
    String(k.ghiChu ?? ""),
    /KHÔNG chứng minh có bên thứ ba/,
    "dữ liệu phải tự mang lời cảnh báo — người đọc file sau này không có ngữ cảnh hôm nay",
  );
});

/*
 * Câu bị cấm trên bề mặt public, chừng nào `doiTac` còn null.
 *
 * Không cấm nói về ví dụ tích hợp — nó là bằng chứng thật. Cấm mô tả nó như thể có
 * một bên NGOÀI ĐỘI đã chọn dùng.
 */
const CUM_GIA_TRACTION: Array<[string, RegExp]> = [
  ["nói có dApp bên ngoài đã tích hợp", /(dApp|ví|đối tác|bên)\s*(thứ ba|bên ngoài|ngoài đội)[^.]{0,40}(đã )?tích hợp/i],
  ["nói đã có người dùng SDK", /(đã có|có) (khách hàng|đối tác|bên tích hợp|pilot)/i],
  ["gọi ví dụ tự dựng là bằng chứng bên ngoài", /bên thứ ba (đã )?(chọn|dùng|xác nhận)/i],
];

/** Câu miễn trừ: đang DẶN đừng nói, hoặc đang thừa nhận CHƯA có. */
const laLoiDan = (d: string) =>
  /KHÔNG|không được|đừng|chưa có|chưa ví|chưa bên|không tuyên bố|không phải/i.test(d);

test("không mô tả tích hợp tự dựng như là bên thứ ba đã dùng", () => {
  const coDoiTac =
    existsSync(join(GOC, KET_QUA)) &&
    (JSON.parse(doc(KET_QUA)) as { doiTac: unknown }).doiTac !== null;
  if (coDoiTac) return; // có đối tác thật rồi thì câu đó không còn là claim sai

  const pham: string[] = [];
  for (const f of ["README.md", "CLAUDE.md", "CUSTOS.md", "PITCH-VA-PHAN-BIEN.md", "packages/core/README.md"]) {
    for (const [i, d] of doc(f).split("\n").entries()) {
      if (laLoiDan(d)) continue;
      for (const [ten, moc] of CUM_GIA_TRACTION) {
        if (moc.test(d)) pham.push(`${f}:${i + 1} — ${ten}\n      ${d.trim().slice(0, 100)}`);
      }
    }
  }
  assert.deepEqual(
    pham,
    [],
    "Ví dụ tích hợp do đội tự dựng. Nói nó chứng minh SDK DÙNG ĐƯỢC, đừng nói nó\n" +
      "chứng minh có người dùng — `data/tich-hop/ket-qua.json` còn ghi `doiTac: null`:\n" +
      pham.join("\n"),
  );
});

test("ví dụ tích hợp giữ đúng ba ràng buộc bảo mật", () => {
  // Ví dụ này là thứ bên tích hợp sẽ COPY. Nó sai một chỗ thì cái sai đó nhân bản.
  const src = doc("vi-du-tich-hop/src/tich-hop.js");

  assert.match(src, /nguoiDung: viNguoiDung\.toBase58\(\)/, "địa chỉ phải lấy từ ví, không từ dApp");
  assert.match(src, /expectedAction/, "ngữ cảnh dApp khai phải được truyền để phát hiện lệch");

  // Fail closed: khối catch phải trả "chan", tuyệt đối không phải "ky".
  const catchBlock = /catch \(e\) \{[\s\S]{0,400}?\}/.exec(src)?.[0] ?? "";
  assert.match(catchBlock, /cho: "chan"/, "inspect() ném lỗi thì phải CHẶN");
  assert.doesNotMatch(catchBlock, /cho: "ky"/, "lỗi không bao giờ được thành ký được");
});

test("ví dụ tích hợp không mang khoá riêng", () => {
  // Nó cố ý chỉ mô phỏng, không ký — nên không có lý do gì để chạm tới khoá.
  for (const f of ["vi-du-tich-hop/src/tich-hop.js", "vi-du-tich-hop/src/dapp.js", "vi-du-tich-hop/src/chay.js"]) {
    const s = doc(f);
    assert.doesNotMatch(s, /secretKey|fromSecretKey|PRIVATE_KEY|\.devnet\//, `${f} chạm tới khoá riêng`);
  }
});
