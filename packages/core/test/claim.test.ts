import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * GUARD CHỐNG TRÔI CLAIM VÀ SỐ LIỆU.
 *
 * Vì sao file này tồn tại: một vòng "đồng bộ số liệu" trước đó dùng tìm-thay neo
 * theo CỤM CHỮ (`250 test`). README lại viết `**250**` trong bảng và pitch viết
 * `(250)`, nên cả hai chỗ lọt qua — im lặng, và im lặng đọc như đã xong. Cùng lúc
 * đó `README.md` vẫn công bố `**29**` mẫu và một câu về dataset không còn đúng.
 *
 * Nên guard này KHÔNG so chuỗi. Nó rút CON SỐ ra khỏi tài liệu bằng regex rồi đối
 * chiếu với `so-lieu.json` — file do `scripts/tao-so-lieu.ts` sinh từ phép đo thật.
 * Viết `250`, `**250**` hay `(250)` đều bị bắt như nhau.
 *
 * Số duy nhất được phép hardcode ở đây là 14 (số luật), vì nó là hằng của thiết kế
 * chứ không phải kết quả đo — và `dataset.test.ts` đã canh riêng.
 */

/*
 * Khi `scripts/tao-so-lieu.ts` chạy bộ test để ĐẾM ca, nó đặt cờ này. Lúc đó con số
 * đúng chưa tồn tại nên việc đối chiếu tài liệu với `so-lieu.json` chưa có nghĩa —
 * và nếu không bỏ qua thì thành vòng khoá: tài liệu lệch -> guard đỏ -> không đo
 * được -> không biết số mới để sửa tài liệu.
 *
 * Chỉ ba bài ĐỐI CHIẾU SỐ được bỏ qua. Các bài cấm claim vẫn chạy: chúng không phụ
 * thuộc phép đo, và đó mới là thứ tuyệt đối không được có ngoại lệ.
 */
const DANG_DO = process.env["CUSTOS_DANG_DO"] === "1";
const boQuaKhiDo = { skip: DANG_DO ? "đang đo lại số liệu — đối chiếu thuộc về `npm run check`" : false };

const GOC = new URL("../../../", import.meta.url);
const doc = (p: string) => readFileSync(new URL(p, GOC), "utf8");

const SO_LIEU = JSON.parse(doc("apps/demo-wallet/public/so-lieu.json")) as {
  test: { pass: number } | null;
  soMau: number;
  soLuat: number;
  phongVan: {
    n: number;
    hieu: { dung: number; motPhan: number; sai: number };
    quyetDinh: { huy: number; kiemTraThem: number; ky: number };
    hieuDungVanKy: number;
    /** Khoảng ngày phỏng vấn, chép từ biên bản. `null` khi biên bản chưa ghi. */
    khoangPhongVan: string | null;
  } | null;
  cohort: {
    coveragePhanTram: number;
    mauDoDuoc: number;
    mauTrongCohort: number;
    chamTaiSan: { hieu: number; tong: number };
  };
};

test("so-lieu.json có đủ số, không phải bản khuyết", () => {
  // `tao-so-lieu.ts` từng ghi `test: null` khi bộ test đỏ. Bắt ở đây để lỗi đọc ra
  // là "file số liệu khuyết", chứ không phải một TypeError giữa bài kiểm claim.
  assert.ok(
    SO_LIEU.test && typeof SO_TEST === "number",
    "so-lieu.json thiếu số test — sinh lại bằng `node --experimental-strip-types scripts/tao-so-lieu.ts`",
  );
});

const SO_TEST = SO_LIEU.test?.pass ?? -1;

/** Rút mọi số nguyên trên dòng khớp `moc`, bỏ qua đánh dấu markdown quanh nó. */
function soTrenDong(vanBan: string, moc: RegExp): number[] {
  const dong = vanBan.split("\n").find((d) => moc.test(d));
  assert.ok(dong, `không tìm thấy dòng khớp ${moc} — tài liệu đã đổi cấu trúc, hãy sửa guard`);
  return [...dong.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

test("README công bố đúng số test và số mẫu của lần đo hiện tại", boQuaKhiDo, () => {
  const r = doc("README.md");
  assert.ok(
    soTrenDong(r, /^\| Test \|/).includes(SO_TEST),
    `README nói số test khác so-lieu.json (${SO_TEST}). Chạy: node --experimental-strip-types scripts/tao-so-lieu.ts rồi cập nhật README.`,
  );
  assert.ok(
    soTrenDong(r, /^\| Mẫu trong bộ dữ liệu \|/).includes(SO_LIEU.soMau),
    `README nói số mẫu khác so-lieu.json (${SO_LIEU.soMau}).`,
  );
});

test("README hướng dẫn chạy cũng nói đúng số test", boQuaKhiDo, () => {
  // Dòng này nằm trong khối lệnh, không phải trong bảng số liệu — nên bài kiểm
  // bảng ở trên không phủ nó, và nó đã trôi thật (README nói 256 khi thật là 282).
  // Số liệu rò rỉ ra ngoài bảng thì guard phải đi theo tới đó.
  assert.ok(
    soTrenDong(doc("README.md"), /^npx npm@[\d.]+ run check /).includes(SO_TEST),
    `README mục "Chạy thử tại máy" nói số test khác so-lieu.json (${SO_TEST}).`,
  );
});

test("PITCH không giữ số test cũ", boQuaKhiDo, () => {
  assert.ok(
    soTrenDong(doc("PITCH-VA-PHAN-BIEN.md"), /Unit\/integration/).includes(SO_TEST),
    `PITCH-VA-PHAN-BIEN.md nói số test khác so-lieu.json (${SO_TEST}).`,
  );
});

test("README gói core công bố coverage của cohort hiện tại, kèm mẫu số", boQuaKhiDo, () => {
  const so = soTrenDong(doc("packages/core/README.md"), /Coverage chưa đủ trên DeFi/);
  const { coveragePhanTram, mauDoDuoc, mauTrongCohort, chamTaiSan } = SO_LIEU.cohort;
  const camTaiSanPhanTram = Math.round((chamTaiSan.hieu * 100) / chamTaiSan.tong);
  for (const [ten, n] of [
    ["coverage", coveragePhanTram],
    ["mẫu đo được", mauDoDuoc],
    ["cohort", mauTrongCohort],
    ["chạm tài sản %", camTaiSanPhanTram],
    ["chạm tài sản tử số", chamTaiSan.hieu],
  ] as const) {
    assert.ok(
      so.includes(n),
      `README gói core thiếu ${ten}=${n}. Đây là file PUBLISH LÊN NPM, số cũ ở đó đi ra ngoài đội. Dòng đang có: ${so.join(", ")}`,
    );
  }
});

test("tiêu đề Q&A về số test cũng theo lần đo hiện tại", boQuaKhiDo, () => {
  // Con số này nằm trong TIÊU ĐỀ một câu hỏi, không trong bảng — nên hai bài kiểm
  // trên không phủ tới, và nó đã trôi thật (đề "256 test" khi thật là 283). Mỗi lần
  // một con số rò ra một chỗ mới, guard phải đi theo tới đó.
  assert.ok(
    soTrenDong(doc("PITCH-VA-PHAN-BIEN.md"), /^### \d+\. ".* test chứng minh/).includes(SO_TEST),
    `PITCH câu "N test chứng minh Custos chính xác chứ?" nói số khác so-lieu.json (${SO_TEST}).`,
  );
});

test("README công bố đúng số lỗ hổng của lần đo gần nhất", () => {
  // Đây là số về BẢO MẬT trong một sản phẩm bảo mật, và nó TĂNG theo thời gian khi
  // có CVE mới. Để nó trôi thì câu "chúng em nói ra cả cây phụ thuộc của mình"
  // thành câu nói suông — đúng thứ đội đang tự hào là không làm.
  const lh = JSON.parse(doc("data/seed/lo-hong.json")) as {
    tong: number;
    theoMucDo: Record<string, number>;
  };
  const so = soTrenDong(doc("README.md"), /^`npm audit` ngày/);
  assert.ok(
    so.includes(lh.tong),
    `README nói ${so.join("/")} còn data/seed/lo-hong.json đo được ${lh.tong} lỗ hổng. ` +
      `Chạy \`node scripts/do-lo-hong.mjs\` rồi cập nhật README.`,
  );
  for (const [muc, n] of Object.entries(lh.theoMucDo)) {
    if (n > 0) {
      assert.ok(so.includes(n), `README thiếu số ${muc}=${n} trong dòng npm audit.`);
    }
  }
});

/*
 * Những cụm dưới đây bị cấm vì đội KHÔNG có bằng chứng so sánh tái lập được, và
 * giám khảo chỉ cần một phản ví dụ là bác bỏ cả bài. Danh sách cố ý hẹp và cụ thể:
 * cấm rộng ("ví khác") sẽ bắt nhầm chính những câu dặn ĐỪNG nói điều đó.
 */
const CUM_CAM = [
  "0 false positive",
  "không ví nào",
  "ví nào khác",
  "không kêu oan",
  "mọi drainer",
  "% chính xác",
  "cái duy nhất chịu nói",
  "blockaid đóng",
  "custos là duy nhất",
];

/**
 * Một dòng được miễn khi nó KHÔNG khẳng định cụm đó:
 *   - câu dặn ĐỪNG NÓI cụm ấy, hoặc
 *   - cụm nằm trong một câu HỎI được trích dẫn — ví dụ câu giám khảo sẽ hỏi
 *     *"làm sao biết các em không kêu oan?"*. Chuẩn bị cho một câu hỏi khó
 *     là việc nên làm; cấm nó là dạy đội né câu hỏi thay vì trả lời.
 */
const laCauCam = (d: string) =>
  // Liệt kê TỪNG động từ cấm, không dùng ký tự đại diện: một mẫu rộng kiểu
  // /không.*(nói|gọi)/ sẽ nuốt luôn những câu khẳng định có chữ "không" ở đâu đó.
  /KHÔNG (nói|viết|gọi|dùng)|không được (nói|viết|gọi|dùng|phát biểu|tính)|đừng (nói|gọi)|không nói|bị cấm/i.test(
    d,
  ) ||
  /["“][^"”]*\?["”]/.test(d);

/*
 * QUÉT MỌI LẦN XUẤT HIỆN, KHÔNG PHẢI LẦN ĐẦU TIÊN.
 *
 * Bản trước dùng `.find()` — lấy đúng dòng khớp đầu tiên rồi thôi. Hậu quả đo được:
 * `PITCH-VA-PHAN-BIEN.md` có "285 test" ở tiêu đề (dòng 293) nên bài kiểm xanh,
 * trong khi dòng 306 — một CÂU KỊCH BẢN SÂN KHẤU — vẫn ghi "256 test". Và
 * `CLAUDE.md` thì chưa từng nằm trong danh sách canh, nên "256 test" ở đó sống
 * qua ba vòng dọn dẹp.
 *
 * Guard chỉ đáng tin bằng chỗ hẹp nhất của nó. Nay quét TẤT CẢ.
 */
const TAI_LIEU_HIEN_HANH = [
  "README.md",
  "CLAUDE.md",
  "CUSTOS.md",
  "PITCH-VA-PHAN-BIEN.md",
  "SEED-DATASET.md",
  // Trang số liệu CÔNG KHAI liên kết thẳng tới file này, nên nó là bề mặt public.
  "docs/DON-VI-KINH-TE.md",
  "packages/core/README.md",
  "packages/ai/README.md",
];

/**
 * Một dòng được miễn khỏi bài kiểm SỐ chỉ khi mang đúng dấu này.
 *
 * Cố ý bắt đánh dấu TỪNG DÒNG chứ không cho loại trừ cả file hay cả thư mục: một
 * exclusion rộng là cách êm nhất để guard chết dần mà không ai nhận ra. Dấu này
 * cũng là tài liệu — người đọc biết ngay con số đó là lịch sử, không phải hiện tại.
 */
const DAU_LICH_SU = "<!-- so-lich-su -->";

function quetSo(moc: RegExp, dung: number, ten: string): string[] {
  const sai: string[] = [];
  for (const f of TAI_LIEU_HIEN_HANH) {
    doc(f)
      .split("\n")
      .forEach((d, i) => {
        if (d.includes(DAU_LICH_SU)) return;
        for (const m of d.matchAll(moc)) {
          const n = Number(m[1]);
          if (n !== dung) {
            sai.push(`${f}:${i + 1} — "${m[0]}" nhưng ${ten} hiện tại là ${dung}\n      ${d.trim().slice(0, 110)}`);
          }
        }
      });
  }
  return sai;
}

test("MỌI claim 'N test' trong tài liệu hiện hành đều là số của lần đo này", boQuaKhiDo, () => {
  assert.deepEqual(
    quetSo(/(\d+)\s+test\b/g, SO_TEST, "số test"),
    [],
    `Còn số test cũ. Chạy \`node scripts/dong-bo-so-tai-lieu.mjs\`, hoặc nếu đó là con số LỊCH SỬ có chủ đích thì đánh dấu dòng đó bằng ${DAU_LICH_SU}.`,
  );
});

/*
 * KHÔNG quét chung "N mẫu".
 *
 * Đã thử và đo: bài quét đó cho gần như toàn dương tính giả — "9 mẫu" là tập con
 * còn mô phỏng được, "10 mẫu" là tập âm, "6 mẫu" là một nhóm trong đặc tả. Chữ
 * "mẫu" mang nhiều nghĩa khác nhau trong repo này, khác hẳn "N test" vốn chỉ có
 * một nghĩa. Muốn dùng nó thì phải đánh dấu hàng chục dòng — mà một guard kêu sai
 * hàng chục lần là guard sẽ bị tắt.
 *
 * Tổng dataset đã có bài kiểm riêng, chính xác theo vị trí dòng, ở phần trên.
 */
/*
 * MỌI MỐC CỦA SCRIPT ĐỒNG BỘ PHẢI CÒN TÌM THẤY DÒNG.
 *
 * `dong-bo-so-tai-lieu.mjs` thay theo VỊ TRÍ DÒNG (mốc regex). Đổi một tiêu đề mục
 * hay viết lại một câu là mốc mất, và script im lặng mất tác dụng ở đúng chỗ đó —
 * guard vẫn xanh cho tới lần số liệu đổi tiếp theo, rồi mới đỏ ở một nơi không ai
 * ngờ. Bài này bắt ngay lúc mốc gãy.
 *
 * Danh sách phải khớp thủ công với script. Đó là chủ ý: hai bên lệch thì bài kiểm
 * này đỏ, và người sửa buộc phải nhìn cả hai.
 */
const NEO_DONG_BO: Array<[string, RegExp]> = [
  ["README.md", /^npx npm@[\d.]+ run check /],
  ["README.md", /^\| Test \|/],
  ["README.md", /^\| Mẫu trong bộ dữ liệu \|/],
  ["README.md", /^`npm audit` ngày/],
  ["CLAUDE.md", /^hiện trường devnet thật ·/],
  ["PITCH-VA-PHAN-BIEN.md", /Unit\/integration \(\d+\)/],
  ["PITCH-VA-PHAN-BIEN.md", /^### \d+\. ".* test chứng minh/],
  ["PITCH-VA-PHAN-BIEN.md", /^Cái bẫy tự khen\./],
  ["PITCH-VA-PHAN-BIEN.md", /^> Câu nói được: \*"Chúng em có bốn loại/],
  ["packages/core/README.md", /Coverage chưa đủ trên DeFi/],
  ["packages/core/README.md", /^npx npm@[\d.]+ run check /],
];

test("mọi mốc mà script đồng bộ dựa vào đều còn tìm thấy dòng", () => {
  const gay = NEO_DONG_BO.filter(([f, moc]) => !doc(f).split("\n").some((d) => moc.test(d))).map(
    ([f, moc]) => `${f} — không còn dòng nào khớp ${moc}`,
  );
  assert.deepEqual(
    gay,
    [],
    "Mốc của `scripts/dong-bo-so-tai-lieu.mjs` đã gãy. Sửa mốc trong script VÀ trong danh sách này, đừng xoá dòng khỏi tài liệu rồi bỏ qua.",
  );
});

test("số phỏng vấn trong PITCH khớp dữ liệu đã thu", boQuaKhiDo, () => {
  // Đây là ô 25 % rubric và là con số dễ trôi nhất: nó đổi mỗi lần đội hỏi thêm
  // người, mà pitch thì viết tay. Guard đọc thẳng `so-lieu.json`, vốn đọc từ
  // `data/seed/phong-van.json`.
  const pv = SO_LIEU.phongVan;
  if (!pv) return; // chưa đi hỏi thì không có gì để canh — trạng thái hợp lệ
  const so = soTrenDong(doc("PITCH-VA-PHAN-BIEN.md"), /^\*\*Rồi — \d+ người/);
  assert.ok(so.includes(pv.n), `PITCH nói ${so.join("/")} người, dữ liệu có ${pv.n}`);

  const than = doc("PITCH-VA-PHAN-BIEN.md");
  for (const [ten, cum] of [
    ["hiểu đúng", `${pv.hieu.dung}/${pv.n} nêu được hậu quả`],
    ["vẫn ký", `${pv.quyetDinh.ky}/${pv.n} vẫn ký`],
  ] as const) {
    assert.ok(
      than.includes(cum),
      `PITCH thiếu hoặc sai con số ${ten}: chờ "${cum}". Chạy lại tao-so-lieu.ts rồi sửa câu 18.`,
    );
  }
});

test("KHÔNG gộp 'một phần' vào 'đúng' ở bất kỳ đâu trên bề mặt public", () => {
  // Cách gian dễ nhất và khó thấy nhất: cộng `dung + motPhan` rồi gọi là "hiểu
  // được". Guard tính sẵn con số gộp đó và cấm nó xuất hiện cạnh mẫu số.
  const pv = SO_LIEU.phongVan;
  if (!pv) return;
  const gop = pv.hieu.dung + pv.hieu.motPhan;
  if (gop === pv.hieu.dung) return; // không có ai "một phần" thì không gộp được
  for (const f of BE_MAT_PUBLIC) {
    assert.ok(
      !doc(f).includes(`${gop}/${pv.n} nêu được`),
      `${f}: "${gop}/${pv.n}" là ĐÚNG cộng MỘT PHẦN. Con số được nói là ${pv.hieu.dung}/${pv.n}.`,
    );
  }
});

const BE_MAT_PUBLIC = [
  "README.md",
  "packages/core/README.md",
  "packages/ai/README.md",
  "PITCH-VA-PHAN-BIEN.md",
  "CUSTOS.md",
  "CLAUDE.md",
  "SEED-DATASET.md",
  "apps/demo-wallet/src/App.tsx",
  "apps/demo-wallet/src/CanhBao.tsx",
  "apps/demo-wallet/src/SoLieu.tsx",
  "apps/demo-wallet/src/PhongVan.tsx",
  "apps/trang-tan-cong/src/App.tsx",
];

/*
 * KIỂM THEO ĐOẠN VĂN, KHÔNG THEO TỪNG DÒNG.
 *
 * Đo được ở bản trước: chèn bốn claim vào pitch thì guard chỉ bắt MỘT.
 *
 *   ✗ "Mọi ví và dApp khác phục vụ người Việt thì không có"
 *        -> `mọi ví` không nằm trong danh sách cấm
 *   ✗ "đọc và mô phỏng mainnet để đo — con số báo nhầm có giá trị"
 *        -> bài kiểm mainnet chỉ tìm cụm tiếng Anh `false positive`
 *   ✗ "Custos là giải pháp\n  duy nhất chịu nói ra phần chưa hiểu"
 *        -> Markdown NGẮT DÒNG giữa câu, mà guard đọc từng dòng một
 *   ✓ "Blockaid đóng"
 *
 * Ngắt dòng là cách lọt rẻ nhất: người viết không cố ý, `prettier` cũng làm được,
 * và guard thì im lặng. Nên chuẩn hoá trước khi kiểm.
 *
 * Gom theo ĐOẠN chứ không gom cả file: vẫn giữ được số dòng để báo lỗi chỉ đúng
 * chỗ. Một guard nói "có claim ở đâu đó trong file này" thì gần như vô dụng.
 */
/*
 * Bỏ dấu nhấn Markdown trước khi so khớp. Hai lý do, cả hai đều đo được:
 *
 *   1. `**duy nhất**` không khớp với mẫu `duy nhất` — viết đậm là lọt guard.
 *   2. Câu hỏi tu từ kết thúc bằng `không?**` làm bộ tách câu không thấy dấu `?`,
 *      nên câu hỏi dính vào câu sau. Đo được: một câu hỏi trong SEED-DATASET dính
 *      với câu kế tiếp thành cặp `kêu oan` + `mainnet` mà không ai từng viết.
 */
const sach = (s: string) => s.replace(/\*+/g, "").replace(/\s+/g, " ").trim();

function doanVanBan(noiDung: string): Array<{ dong: number; chu: string }> {
  const ra: Array<{ dong: number; chu: string }> = [];
  const dong = noiDung.split("\n");
  let batDau = 0;
  let gom: string[] = [];
  let trongFence = false;

  const day = () => {
    if (gom.length > 0) {
      ra.push({ dong: batDau + 1, chu: sach(gom.join(" ")) });
    }
    gom = [];
  };

  dong.forEach((d, i) => {
    // Bỏ khối mã: nó chứa tên biến, log mẫu, không phải lời tuyên bố.
    if (d.trimStart().startsWith("```")) {
      day();
      trongFence = !trongFence;
      return;
    }
    if (trongFence) return;
    if (d.trim() === "") {
      day();
      return;
    }
    // HÀNG BẢNG ĐỨNG RIÊNG. Gom cả bảng thành một khối thì `báo nhầm` ở hàng này
    // ghép với `mainnet` ở hàng kia thành một "câu" chưa ai từng viết — guard tự
    // dựng claim rồi tự bắt. Đo được: gom bảng đẻ ra 4 báo nhầm trong SEED-DATASET.
    if (d.trimStart().startsWith("|")) {
      day();
      ra.push({ dong: i + 1, chu: sach(d) });
      return;
    }
    if (gom.length === 0) batDau = i;
    gom.push(d.replace(/^\s*>\s?/, ""));
  });
  day();
  return ra;
}

const thuong = (s: string) => s.toLocaleLowerCase("vi");

/*
 * Cụm cấm — mỗi cụm là một CÂU KHẲNG ĐỊNH không chứng minh được.
 *
 * "duy nhất" một mình thì KHÔNG cấm: repo dùng nó hợp lệ ở nhiều chỗ ("nguồn quyết
 * định duy nhất về sản phẩm", "câu duy nhất phần lớn người dùng sẽ đọc"). Chỉ cấm
 * những tổ hợp mang nghĩa độc quyền thị trường.
 */
const CUM_CAM_DOAN: Array<[string, RegExp]> = [
  ["tuyên bố không ví nào khác làm được", /không ví nào|ví nào khác (không|đều không)/],
  ["tuyên bố Custos là duy nhất", /custos là (cái )?duy nhất|giải pháp duy nhất|duy nhất chịu nói|cái duy nhất chịu/],
  ["nói Blockaid đã đóng cửa", /blockaid (đã )?đóng(?! cửa\)| cửa)(?!.{0,24}mã đóng)/],
  ["tuyên bố 0 false positive", /0 false positive|0 báo nhầm|không kêu oan lần nào/],
  ["tuyên bố độ chính xác khi chưa có ground truth", /\d+\s*% chính xác/],
  ["tuyên bố bắt được mọi drainer", /mọi drainer|bắt được mọi/],
  // Ba mẫu dưới đây từ vòng review 05/09: claim về SỰ IM LẶNG của ví khác. Đội không
  // có cách nào đo được mọi ví ở mọi phiên bản, nên đây là claim không chứng minh nổi.
  // Chúng cũng không cần thiết: Custos bán được nhờ việc nó LÀM, không nhờ việc ai không làm.
  ["tuyên bố ví khác im lặng", /ví hiện tại không nói gì|ví (khác|nào) (đều )?(im lặng|không nói)|không ví nào chịu nói/],
  ["hỏi tu từ ví nào chịu nói ra", /có ví nào chịu nói ra không/],
  ["tuyên bố đối thủ không hiển thị", /họ không hiển thị|họ đều không|không ai hiển thị/],
];

/**
 * `mọi ví` cần ngữ cảnh: câu trung tính ("mọi ví đều có lúc không hiểu") không phải
 * claim độc quyền. Chỉ cấm khi nó đi kèm một mệnh đề PHỦ ĐỊNH về ví khác.
 */
/**
 * Cụm cấm CÓ PHỦ ĐỊNH đứng trước thì không phải claim — nó là lời đính chính.
 *
 * Đo được: bản đầu chặn chính câu sửa lỗi ở STEP 1 — "Chúng em KHÔNG tuyên bố là
 * giải pháp duy nhất." Guard mà chặn câu đính chính thì người ta sẽ tắt guard, và
 * lúc đó nó không bảo vệ được gì nữa.
 */
// Phủ định phải NGAY TRƯỚC cụm cấm và không nhảy qua dấu câu. Bản trước cho phép
// 40 ký tự bất kỳ, nên "khi KHÔNG hiểu, ví hiện tại không nói gì" được tha: chữ
// "không" thuộc mệnh đề khác đã đủ làm guard tưởng đây là lời đính chính.
const PHU_DINH_TRUOC = /(không|chưa|đừng|tránh|thay vì|nói rằng mình là|bị cấm)[^.,:;]{0,25}$/;

function viPhamCum(t: string, moc: RegExp): boolean {
  const m = moc.exec(t);
  if (!m) return false;
  return !PHU_DINH_TRUOC.test(t.slice(0, m.index));
}

/** Tách câu sau khi đã gộp dòng — cùng đoạn nhưng khác câu thì không phải một claim. */
const cauTrongDoan = (chu: string) =>
  chu.split(/(?<=[.!?][)"”’]?)\s+|(?<=\|)\s*/).filter((c) => c.trim() !== "");

const MOI_VI_DOC_QUYEN = /mọi ví[^.]{0,80}(thì không có|đều không|không có|im lặng|không nói)/;

/** Một đoạn được miễn khi nó KHÔNG khẳng định — dặn đừng nói, hoặc trích câu hỏi. */
const laDoanMienTru = (chu: string) =>
  /không được (nói|viết|gọi|dùng|phát biểu|tính)|đừng (nói|gọi|thêm)|bị cấm|không thêm/i.test(chu) ||
  // `KHÔNG` viết hoa là quy ước dặn dò của repo. Bản trước nhận cả `không nói`
  // thường, nên chính nó miễn trừ câu "ví hiện tại KHÔNG NÓI gì" — một claim, không
  // phải lời dặn. Guard tự tha cho thứ nó sinh ra để bắt.
  /KHÔNG (nói|viết|gọi|dùng|được)/.test(chu) ||
  // `không nói "an toàn"` — dặn dò thật thì thường trích nguyên văn câu bị cấm.
  /không (nói|gọi)\s*(là\s*)?["“']/.test(chu) ||
  /["“][^"”]*\?["”]/.test(chu);

test("không có claim độc quyền tuyệt đối — kiểm theo ĐOẠN, chịu được ngắt dòng", () => {
  const pham: string[] = [];
  for (const f of BE_MAT_PUBLIC) {
    for (const { dong, chu } of doanVanBan(doc(f))) {
      if (laDoanMienTru(chu)) continue;
      const t = thuong(chu);
      for (const [ten, moc] of CUM_CAM_DOAN) {
        if (viPhamCum(t, moc)) pham.push(`${f}:${dong} — ${ten}\n      ${chu.slice(0, 110)}`);
      }
      if (viPhamCum(t, MOI_VI_DOC_QUYEN)) {
        pham.push(`${f}:${dong} — tuyên bố mọi ví khác đều không có\n      ${chu.slice(0, 110)}`);
      }
    }
  }
  assert.deepEqual(
    pham,
    [],
    "Claim không chứng minh được đã quay lại. Nói việc Custos LÀM, đừng nói việc người khác KHÔNG làm:\n" +
      pham.join("\n"),
  );
});

/*
 * Cohort + tuyên bố tỉ lệ sai = phải có disclaimer ground truth.
 *
 * Bản trước chỉ bắt cụm tiếng Anh `false positive`, nên câu kịch bản "đọc và mô
 * phỏng mainnet để đo — đó là lý do con số BÁO NHẦM có giá trị" đi thẳng qua.
 */
const NOI_TI_LE_SAI = /false positive|báo nhầm|kêu oan|precision|recall|độ chính xác/;
const NOI_COHORT = /mainnet|cohort/;
const CO_DISCLAIMER = /ground truth|chưa gán nhãn|không phải (tỉ lệ|phép đo)|chưa phải|quan sát/;

test("không tuyên bố tỉ lệ báo nhầm dựa trên cohort chưa gán nhãn", () => {
  const pham: string[] = [];
  for (const f of BE_MAT_PUBLIC) {
    for (const { dong, chu } of doanVanBan(doc(f))) {
      if (laDoanMienTru(chu)) continue;
      for (const cau of cauTrongDoan(thuong(chu))) {
        if (!(NOI_TI_LE_SAI.test(cau) && NOI_COHORT.test(cau) && !CO_DISCLAIMER.test(cau))) continue;
        pham.push(`${f}:${dong} — nói tỉ lệ sai dựa trên cohort mà thiếu disclaimer ground truth\n      ${chu.slice(0, 120)}`);
      }
    }
  }
  assert.deepEqual(pham, [], "Cohort chưa gán nhãn ground truth thì kết quả là QUAN SÁT, không phải tỉ lệ:\n" + pham.join("\n"));
});

/*
 * Regression trực tiếp: bốn câu ĐÃ TỪNG LỌT phải bị từ chối, và ba cách nói ĐÚNG
 * phải được chấp nhận. Không có phần thứ hai thì guard dễ bị siết tới mức chặn cả
 * câu đính chính, rồi người ta tắt nó đi.
 */
const PHAI_TU_CHOI = [
  "Mọi ví và dApp khác phục vụ người Việt thì không có.",
  "Chúng em đọc và mô phỏng mainnet để đo — đó là lý do con số báo nhầm có giá trị.",
  "Custos là giải pháp\nduy nhất chịu nói ra phần chưa hiểu.",
  "Blockaid đóng nên thị trường không còn ai khác.",
  // Vòng review 05/09: ba claim về sự im lặng của ví khác, đã gỡ khỏi pitch.
  "Cạnh tranh ở sự im lặng: khi không hiểu, ví hiện tại không nói gì.",
  "Khác nhau ở chỗ có ví nào chịu nói ra không.",
  "Điều đo được là: họ không hiển thị con số đó.",
  // Viết đậm từng làm claim lọt: `**duy nhất**` không khớp mẫu `duy nhất`.
  "Custos là giải pháp **duy nhất** chịu nói ra phần chưa hiểu.",
];

const PHAI_CHAP_NHAN = [
  "Runtime và demo chỉ chạy Devnet; cohort công khai lịch sử được lưu offline.",
  // Hai câu dưới đây bản guard đầu tiên đã chặn NHẦM. Giữ lại làm regression:
  // một guard chặn cả lời đính chính thì tệ hơn không có guard.
  "Chúng em không tuyên bố là giải pháp duy nhất.",
  ["| `synthetic-devnet` | 13 | **Không** vào mẫu số báo nhầm |", "| Solscan | `real-mainnet` | Lọc theo instruction |"].join("\n"),
  "Cohort chưa có ground truth nên đây không phải tỉ lệ false positive.",
  "Phantom và Blockaid đã chứng minh nhu cầu; Custos khác ở mã nguồn mở và coverage transparency.",
  // Câu CÓ PHẠM VI phải đi lọt: nêu rõ đã kiểm ở đâu và từ chối suy rộng. Chặn cả câu
  // này thì guard đang cấm đội nói sự thật, và đội sẽ tắt guard.
  "Trong tài liệu công khai chúng em kiểm được, chưa tìm thấy trường coverage ở mức từng lệnh tương đương; chúng em không suy rộng sang mọi ví hay mọi phiên bản.",
  "Custos luôn trả coverage.analyzed/total và luôn hiển thị con số đó.",
];

function bacBo(vanBan: string): boolean {
  for (const { chu } of doanVanBan(vanBan)) {
    if (laDoanMienTru(chu)) continue;
    const t = thuong(chu);
    if (CUM_CAM_DOAN.some(([, m]) => viPhamCum(t, m))) return true;
    if (viPhamCum(t, MOI_VI_DOC_QUYEN)) return true;
    if (cauTrongDoan(t).some((c) => NOI_TI_LE_SAI.test(c) && NOI_COHORT.test(c) && !CO_DISCLAIMER.test(c))) return true;
  }
  return false;
}

test("guard bác bỏ mọi câu đã từng lọt", () => {
  const lot = PHAI_TU_CHOI.filter((c) => !bacBo(c));
  assert.deepEqual(lot, [], "Những câu này phải bị chặn nhưng vẫn lọt:\n" + lot.join("\n"));
});

test("guard KHÔNG chặn nhầm cách nói đúng", () => {
  const oan = PHAI_CHAP_NHAN.filter((c) => bacBo(c));
  assert.deepEqual(oan, [], "Guard đang chặn nhầm câu đúng — siết quá thì người ta sẽ tắt nó:\n" + oan.join("\n"));
});

test("không có claim độc quyền tuyệt đối trên bề mặt public", () => {
  const pham: string[] = [];
  for (const f of BE_MAT_PUBLIC) {
    doc(f)
      .split("\n")
      .forEach((d, i) => {
        if (laCauCam(d)) return;
        for (const c of CUM_CAM) {
          if (d.toLowerCase().includes(c.toLowerCase())) pham.push(`${f}:${i + 1} — "${c}" trong: ${d.trim().slice(0, 90)}`);
        }
      });
  }
  assert.deepEqual(
    pham,
    [],
    "Claim không có bằng chứng đã quay lại. Nói việc Custos LÀM, đừng nói việc người khác KHÔNG làm:\n" + pham.join("\n"),
  );
});

test("không công bố tỉ lệ false positive đo trên mainnet", () => {
  // Hai sai lầm hay đi cùng nhau trong một câu: gọi "0 cáo buộc" là false positive
  // (cần ground truth mà cohort chưa có), và gán nó cho "mainnet" (runtime chỉ chạy
  // Devnet; cohort là dữ liệu lưu offline). Bắt đúng sự ĐỒNG XUẤT HIỆN, để những câu
  // đính chính — vốn nói "false positive" mà không nói "mainnet" — không bị vạ lây.
  for (const f of BE_MAT_PUBLIC) {
    doc(f)
      .split("\n")
      .forEach((d, i) => {
        if (laCauCam(d)) return;
        const t = d.toLowerCase();
        assert.ok(
          !(t.includes("false positive") && t.includes("mainnet")),
          `${f}:${i + 1} — nói tỉ lệ false positive trên mainnet. Cohort chưa có ground truth và lưu offline; demo chạy Devnet. ${d.trim().slice(0, 120)}`,
        );
      });
  }
});

test("không gọi '0 cáo buộc' thành tỉ lệ báo nhầm", () => {
  // "0 cáo buộc" là quan sát; "0 false positive" là kết luận thống kê cần ground
  // truth mà cohort chưa có. Gộp hai thứ là đúng lỗi thể lệ phạt.
  for (const f of BE_MAT_PUBLIC) {
    const v = doc(f);
    for (const d of v.split("\n")) {
      if (laCauCam(d)) continue;
      assert.ok(
        !/\b0\s*(false positive|báo nhầm|kêu oan)/i.test(d),
        `${f}: "${d.trim().slice(0, 90)}" — cohort chưa gán nhãn ground truth nên không được phát biểu như tỉ lệ báo nhầm.`,
      );
    }
  }
});
