import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { docHoSo, soiDuLieuCaNhan, tongHop, type Ban } from "../src/phongVan.ts";

const ban = (p: Partial<Ban>): Ban => ({
  nhapLuc: "2026-09-04T00:00:00.000Z",
  nguyenVan: "",
  cham: "dung",
  quyetDinh: "huy",
  ghiChu: "",
  ...p,
});

test('"một phần" KHÔNG được gộp vào "đúng"', () => {
  // Gộp là cách dễ nhất để một con số xấu trông đẹp lên, và là điều đầu tiên một
  // giám khảo hỏi lại. Bài này canh chính chỗ đó.
  const t = tongHop([ban({ cham: "dung" }), ban({ cham: "motPhan" }), ban({ cham: "motPhan" })]);
  assert.equal(t.hieu.dung, 1, "chỉ 1 người ĐÚNG");
  assert.equal(t.hieu.motPhan, 2);
  assert.equal(t.n, 3);
});

test("hiểu và quyết định là HAI biến, đếm tách nhau", () => {
  // Người hiểu đúng hậu quả mà vẫn ký là phát hiện quan trọng nhất của cả đợt —
  // gộp hai biến lại thì mất đúng ca đó.
  const t = tongHop([
    ban({ cham: "dung", quyetDinh: "ky" }),
    ban({ cham: "sai", quyetDinh: "huy" }),
  ]);
  assert.equal(t.hieu.dung, 1);
  assert.equal(t.quyetDinh.ky, 1, "vẫn ký dù hiểu đúng — phải đếm được");
  assert.equal(t.quyetDinh.huy, 1);
});

test("đọc được nhãn tiếng Việt viết hoa lẫn mã nội bộ", () => {
  const t = tongHop([
    ban({ cham: "ĐÚNG" as never, quyetDinh: "VẪN KÝ" as never }),
    ban({ cham: "dung", quyetDinh: "ky" }),
  ]);
  assert.equal(t.hieu.dung, 2);
  assert.equal(t.quyetDinh.ky, 2);
});

test("hồ sơ rỗng cho 0/0, không ném lỗi và không bịa mẫu số", () => {
  const t = tongHop([]);
  assert.equal(t.n, 0);
  assert.equal(t.hieu.dung, 0);
});

test("đọc được cả mảng trần lẫn hồ sơ có phiên bản", () => {
  assert.equal(docHoSo([ban({})]).ban.length, 1);
  const h = docHoSo({ phienBan: 1, xuatLuc: "x", ban: [ban({}), ban({})] });
  assert.equal(h.phienBan, 1);
  assert.equal(h.ban.length, 2);
});

test("hồ sơ ví dụ giữ được cờ laViDu", () => {
  assert.equal(docHoSo({ phienBan: 1, laViDu: true, xuatLuc: "", ban: [] }).laViDu, true);
});

test("từ chối thứ không phải hồ sơ phỏng vấn", () => {
  assert.throws(() => docHoSo({ linh: "tinh" }), /thiếu mảng/);
});

test("bắt được email và số điện thoại — dữ liệu này đi vào repo công khai", () => {
  const canh = soiDuLieuCaNhan([
    ban({ ma: "P1", ghiChu: "liên hệ lan@example.com" }),
    ban({ ma: "P2", nguyenVan: "gọi lại 0912345678 nhé" }),
    ban({ ma: "P3", nguyenVan: "mất hết token" }),
  ]);
  assert.equal(canh.length, 2, canh.join(" | "));
  assert.match(canh.join(" "), /email/);
  assert.match(canh.join(" "), /điện thoại/);
});

test("mã người tham gia có dấu cách bị nghi là tên thật", () => {
  const canh = soiDuLieuCaNhan([ban({ ma: "Nguyễn Văn A" })]);
  assert.equal(canh.length, 1);
  assert.match(canh[0]!, /P1, P2/);
});

test("dữ liệu ẩn danh sạch thì không cảnh báo gì", () => {
  assert.deepEqual(soiDuLieuCaNhan([ban({ ma: "P1", nguyenVan: "ví bị mất 500 token" })]), []);
});

/*
 * NGÀY NHẬP LIỆU KHÔNG PHẢI NGÀY PHỎNG VẤN.
 *
 * Bản JSON đầu tiên có 20 mốc thời gian nằm trong khoảng 1 mili-giây ngày 04/09 —
 * đó là dấu vết một lần chạy script, nhưng field tên `luc` khiến nó đọc ra thành
 * "20 cuộc phỏng vấn lúc 8 giờ 10 sáng 04/09". Người thật được hỏi ngày 29 và
 * 30/08. Đây là loại sai không ai phát hiện được từ trong dữ liệu, chỉ phát hiện
 * được khi có người hỏi "phỏng vấn hôm nào?" — thường là giám khảo.
 */
// `.pathname` percent-encode dấu cách: đường dẫn máy này có "Viet Tien" nên ra "Viet%20Tien".
const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const docFile = (p: string) => readFileSync(join(GOC, p), "utf8");

test("dữ liệu phỏng vấn mang nguồn gốc cấp mẻ, không mang ngày giả cấp bản ghi", () => {
  const ho = JSON.parse(docFile("data/seed/phong-van.json")) as {
    nguonGoc?: { khoangPhongVan?: string };
    ban: Array<Record<string, unknown>>;
  };

  const conFieldCu = ho.ban.filter((b) => "luc" in b).map((b) => b["ma"]);
  assert.deepEqual(
    conFieldCu,
    [],
    "`luc` là tên gây hiểu nhầm — dùng `nhapLuc` (lúc số hoá) và để ngày phỏng vấn ở `nguonGoc`",
  );

  assert.ok(
    ho.nguonGoc?.khoangPhongVan,
    "thiếu `nguonGoc.khoangPhongVan`: con số này sẽ được đọc trên sân khấu, phải nói được đo ngày nào",
  );

  for (const b of ho.ban) {
    assert.equal(typeof b["nhapLuc"], "string", `${b["ma"]}: thiếu nhapLuc`);
  }
});

test("ngày phỏng vấn không bị gõ cứng trong trang số liệu hay deck", () => {
  // Ba bản sao của cùng một ngày thì sớm muộn cũng lệch, và lệch ở đây nghĩa là
  // đọc sai mốc đo trước giám khảo. Chỉ biên bản được giữ ngày; hai nơi kia đọc lại.
  const gõCứng: string[] = [];
  for (const f of ["apps/demo-wallet/src/SoLieu.tsx", "scripts/tao-deck.cjs"]) {
    for (const [i, d] of docFile(f).split("\n").entries()) {
      if (d.trimStart().startsWith("//") || d.trimStart().startsWith("*")) continue;
      if (/\d{1,2}\s*[–-]\s*\d{1,2}\/0?\d\/20\d\d|\d{1,2}\/0?\d\/20\d\d/.test(d)) {
        gõCứng.push(`${f}:${i + 1} — ${d.trim().slice(0, 90)}`);
      }
    }
  }
  assert.deepEqual(
    gõCứng,
    [],
    "Ngày phỏng vấn phải chảy từ `nguonGoc.khoangPhongVan`, không gõ tay:\n" + gõCứng.join("\n"),
  );
});

test("docHoSo GIỮ metadata vòng và phiên bản giao diện", () => {
  /*
   * Kiểu trả về khai `vong`, `phienBanUi`, `nguonGoc` từ lúc thêm giao thức vòng 2,
   * nhưng bộ đọc không hề lấy chúng — mọi hồ sơ đi qua đây đều mất phiên bản giao
   * diện đã chiếu. Đúng thứ vòng 1 đã phải truy ngược bằng `git log`, và là lý do
   * `phienBanUi` được thêm vào ngay từ đầu.
   *
   * Kiểu khai một trường không có nghĩa là dữ liệu mang được nó qua.
   */
  const ho = docHoSo({
    phienBan: 1,
    vong: 2,
    phienBanUi: "cf42a18",
    xuatLuc: "2026-09-05T00:00:00.000Z",
    nguonGoc: { khoangPhongVan: "05/09/2026", aiHoi: "X", cachHoi: "video" },
    ban: [ban({})],
  });
  assert.equal(ho.vong, 2, "mất `vong`");
  assert.equal(ho.phienBanUi, "cf42a18", "mất `phienBanUi`");
  assert.equal(ho.nguonGoc?.khoangPhongVan, "05/09/2026", "mất `nguonGoc`");
});

test("docHoSo KHÔNG tự điền metadata cho hồ sơ cũ", () => {
  // Một `phienBanUi` bịa còn tệ hơn không có: nó trông như đã ghi lại.
  const ho = docHoSo({ phienBan: 1, xuatLuc: "", ban: [ban({})] });
  assert.equal(ho.vong, undefined);
  assert.equal(ho.phienBanUi, undefined);
  assert.equal(ho.nguonGoc, undefined);
});
