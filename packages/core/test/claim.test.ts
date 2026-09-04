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
    soTrenDong(doc("README.md"), /^npm run check /).includes(SO_TEST),
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
];

/**
 * Một dòng được miễn khi nó KHÔNG khẳng định cụm đó:
 *   - câu dặn ĐỪNG NÓI cụm ấy, hoặc
 *   - cụm nằm trong một câu HỎI được trích dẫn — ví dụ câu giám khảo sẽ hỏi
 *     *"làm sao biết các em không kêu oan?"*. Chuẩn bị cho một câu hỏi khó
 *     là việc nên làm; cấm nó là dạy đội né câu hỏi thay vì trả lời.
 */
const laCauCam = (d: string) =>
  /KHÔNG nói|không được nói|đừng nói|không nói|bị cấm|không được dùng|KHÔNG viết/i.test(d) ||
  /["“][^"”]*\?["”]/.test(d);

const BE_MAT_PUBLIC = [
  "README.md",
  "packages/core/README.md",
  "packages/ai/README.md",
  "PITCH-VA-PHAN-BIEN.md",
  "CUSTOS.md",
  "apps/demo-wallet/src/App.tsx",
  "apps/demo-wallet/src/CanhBao.tsx",
  "apps/demo-wallet/src/SoLieu.tsx",
  "apps/demo-wallet/src/PhongVan.tsx",
  "apps/trang-tan-cong/src/App.tsx",
];

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
