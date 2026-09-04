/**
 * ĐO LỖ HỔNG PHỤ THUỘC VÀ GHI RA FILE.
 *
 *   node scripts/do-lo-hong.mjs
 *
 * Vì sao không để `tao-so-lieu.ts` tự chạy `npm audit`: audit gọi registry npm.
 * Nhét một lời gọi mạng vào đường deploy nghĩa là một trục trặc phía npm sẽ chặn
 * trang demo công khai — đúng cái bẫy đã gỡ ra khỏi job `build` hôm trước.
 *
 * Nên nó theo đúng lối của cohort và chi phí: đo TAY, ghi ra file, phần còn lại
 * đọc file. Đổi lại, con số mang theo NGÀY ĐO của chính nó và không ai phải nhớ.
 *
 * Đây là số về BẢO MẬT trong một sản phẩm bảo mật. Để nó trôi thì câu "chúng em
 * nói ra cả cây phụ thuộc của mình" thành câu nói suông.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const RA = "data/seed/lo-hong.json";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

let tho;
try {
  tho = execFileSync(npm, ["audit", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (e) {
  // `npm audit` thoát khác 0 KHI CÓ lỗ hổng — đó là trường hợp thường, không phải
  // lỗi. Kết quả JSON vẫn nằm trong stdout.
  tho = String(e.stdout ?? "");
}

let d;
try {
  d = JSON.parse(tho);
} catch {
  console.error("✖ không đọc được kết quả `npm audit --json` — có thể mất mạng.");
  console.error("  KHÔNG ghi đè file cũ bằng số khuyết; chạy lại khi có mạng.");
  process.exit(1);
}

const v = d.metadata?.vulnerabilities;
if (!v || typeof v.total !== "number") {
  console.error("✖ kết quả audit không có phần đếm — không ghi gì.");
  process.exit(1);
}

const goi = Object.entries(d.vulnerabilities ?? {})
  .map(([ten, x]) => ({ ten, mucDo: x.severity }))
  .sort((a, b) => a.ten.localeCompare(b.ten));

writeFileSync(
  RA,
  JSON.stringify(
    {
      ngayDo: new Date().toISOString(),
      tong: v.total,
      theoMucDo: { low: v.low, moderate: v.moderate, high: v.high, critical: v.critical },
      goi,
    },
    null,
    2,
  ) + "\n",
);

console.log(`đã ghi -> ${RA}`);
console.log(
  `  ${v.total} lỗ hổng — ${v.critical} critical, ${v.high} high, ${v.moderate} moderate, ${v.low} low`,
);
console.log(`  gói: ${goi.map((g) => g.ten).join(", ") || "không có"}`);
