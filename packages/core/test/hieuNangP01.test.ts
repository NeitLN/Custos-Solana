import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const JSON_DO = "data/hieu-nang/do-tre.json";
const MD = "docs/HIEU-NANG.md";
const PROBE = "scripts/kiem-trinh-duyet/soi-do-tre.py";

type Tom = { soMau: number; trungVi: number; p95QuanSat?: number; caoNhat: number; tatCa: number[] };
type DoTre = {
  bamTatCa: Tom | null;
  bamCacLuotSau: Tom | null;
  luotHong?: Array<{ luot: number; lyDo: string }>;
  tyLeHoanTat?: { hoanTat: number; hong: number; tong: number };
  khongDo: string[];
  moiTruong: Record<string, unknown>;
};
const d = () => JSON.parse(doc(JSON_DO)) as DoTre;

/**
 * TB-P01 — PHÉP ĐO PERFORMANCE ĐẦY ĐỦ NGỮ CẢNH.
 *
 * Thẻ cấm bốn thứ, và cả bốn đều là cách làm đẹp một con số:
 *
 *   · *"không lấy ba lượt nhanh nhất làm latency đại diện"*
 *   · *"lưu từng lượt và lỗi; không bỏ outlier"*
 *   · *"nếu báo p95 từ mẫu nhỏ phải gọi là percentile quan sát"*
 *   · *"không cộng số từ hai môi trường khác nhau"*
 *
 * Không cái nào kiểm được bằng cách nhìn con số cuối: một trung vị tính trên tập đã
 * lọc trông y hệt một trung vị trung thực.
 */

/* ── 1 · Lượt hỏng phải được ĐẾM, không biến mất ───────────────────────────── */

test("mọi lượt đo đều được kể — hoàn tất + hỏng = tổng", () => {
  /*
   * Lỗi đã suýt mắc trong chính phiên viết bài này: vòng đo `continue` khi timeout,
   * nên lượt hỏng không vào mảng nào. Một lượt 20/30 timeout vẫn báo "trung vị 840 ms"
   * trên 10 lượt còn lại — đúng, nhưng đúng cho một tập đã lọc theo tiêu chí "lượt nào
   * xong thì giữ".
   */
  if (!existsSync(join(GOC, JSON_DO))) return; // chưa đo lần nào — không ép
  const k = d();
  assert.ok(k.tyLeHoanTat, "thiếu `tyLeHoanTat` — không biết bao nhiêu lượt hỏng");
  const t = k.tyLeHoanTat!;
  assert.equal(
    t.hoanTat + t.hong,
    t.tong,
    `${t.hoanTat} hoàn tất + ${t.hong} hỏng ≠ ${t.tong} lượt — có lượt bị bỏ im lặng`,
  );
  assert.equal(k.luotHong?.length ?? 0, t.hong, "`luotHong` lệch với số đếm");
  for (const h of k.luotHong ?? []) {
    assert.ok(h.lyDo.length > 8, `lượt ${h.luot} hỏng mà không nói rõ vì sao`);
  }
});

test("probe GHI lượt hỏng vào báo cáo, không dừng ở biến cục bộ", () => {
  /*
   * Bài đọc mã, và nó canh đúng cái bẫy đã gặp: `hong` được thu thập đầy đủ nhưng ba
   * dòng ghi kết quả chỉ lấy `ms`. Thu thập rồi vứt đi là tệ hơn không thu thập —
   * người đọc mã tưởng đã có.
   */
  const s = doc(PROBE);
  assert.match(s, /ket\["luotHong"\] = bam\["hong"\]/, "lượt hỏng không được ghi vào JSON");
  assert.match(s, /ket\["tyLeHoanTat"\]/, "không ghi tỉ lệ hoàn tất");
});

/* ── 2 · Số lượt và cách gọi tên percentile ────────────────────────────────── */

test("đo ít nhất 30 lượt mỗi cấu hình", () => {
  assert.match(
    doc(PROBE),
    /SO_LUOT_BAM = 30/,
    "thẻ TB-P01 đòi khởi đầu ít nhất 30 lượt mỗi cấu hình",
  );
});

test("percentile từ mẫu nhỏ phải gọi là QUAN SÁT, không phải p95", () => {
  /*
   * `p95` không kèm ngữ cảnh được đọc thành "95 % người dùng thấy nhanh hơn số này".
   * Với n=30 trong một phiên trên một máy, câu đó sai. Tên trường phải nói ra điều đó.
   */
  const s = doc(PROBE);
  assert.match(s, /"p95QuanSat"/, "thiếu trường percentile quan sát");
  assert.ok(
    !/"p95":/.test(s),
    "đặt tên trường là `p95` trần — nó sẽ được đọc thành p95 của tổng thể",
  );

  const k = existsSync(join(GOC, JSON_DO)) ? d() : null;
  if (k?.bamTatCa) {
    assert.ok(
      typeof k.bamTatCa.p95QuanSat === "number",
      "báo cáo thiếu percentile quan sát",
    );
    assert.ok(k.bamTatCa.soMau >= 1, "phải kèm n để người đọc tự hạ mức kết luận");
  }
});

test("`khongDo` nói rõ p95 của TỔNG THỂ là thứ chưa đo được", () => {
  if (!existsSync(join(GOC, JSON_DO))) return;
  const k = d();
  const co = k.khongDo.some((x) => /p95/i.test(x) && /tổng thể|quan sát/i.test(x));
  assert.ok(co, "`khongDo` không phân biệt percentile quan sát với p95 của tổng thể");
});

/* ── 3 · Không trộn hai môi trường ─────────────────────────────────────────── */

test("báo cáo khai rõ môi trường đo — cùng số phải cùng nguồn", () => {
  /*
   * Thẻ: *"không cộng số từ hai môi trường khác nhau"*. `docs/HIEU-NANG.md` mục 1 đã
   * tách hai tầng (SDK trong Node vs người dùng trong trình duyệt); báo cáo phải nói
   * rõ nó thuộc tầng nào để không ai cộng nhầm.
   */
  if (!existsSync(join(GOC, JSON_DO))) return;
  const m = d().moiTruong;
  for (const k of ["chromium", "khung", "bopMang", "rpc", "banDung"]) {
    assert.ok(k in m, `báo cáo thiếu \`moiTruong.${k}\``);
  }
  assert.match(
    doc(MD),
    /Hai tầng đo, đừng lẫn/,
    "HIEU-NANG.md mất mục tách hai tầng — số SDK và số người dùng sẽ bị cộng nhầm",
  );
});

test("probe đo trên bản PRODUCTION, không phải dev server", () => {
  /*
   * Dev server của Vite phục vụ hàng trăm module chưa gộp kèm HMR. Đo ở đó rồi gọi
   * tên trang đã deploy là đo sai đối tượng.
   */
  const s = doc(PROBE);
  assert.match(s, /localhost:4173/, "probe phải trỏ vào `vite preview`, không phải dev server");
  assert.match(s, /Custos-Solana\//, "phải đi qua đúng base path của bản build");
});
