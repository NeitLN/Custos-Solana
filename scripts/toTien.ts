import { execFileSync } from "node:child_process";

/*
 * BẰNG CHỨNG SINH TRƯỚC COMMIT CHỨA NÓ — MỘT QUY TẮC, MỘT CHỖ.
 *
 * Release notes ghi SHA lúc sinh. Bằng chứng tích hợp ghi SHA lúc đo. Cả hai đều
 * được commit SAU đó, nên đòi `SHA === HEAD` là dựng một cổng không bao giờ mở được:
 * sinh xong thì cây bẩn, commit vào thì SHA lệch một bước.
 *
 * Repo này đã mắc đúng lỗi đó SÁU lần, ở sáu chỗ khác nhau, mỗi lần lại viết lại
 * quy tắc từ đầu. Nên nó nằm ở đây, một bản duy nhất.
 *
 * Câu hỏi đúng hẹp hơn: từ lúc sinh bằng chứng tới HEAD, có MÃ nào đổi không? Tài
 * liệu đổi thì phép đo vẫn còn giá trị; mã đổi thì không.
 */

const git = (args: string[]): string | null => {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

/**
 * "Mã" = thứ phép đo thật sự chạy qua.
 *
 * Liệt kê thứ làm mất hiệu lực, không liệt kê thứ vô hại — danh sách vô hại luôn
 * thiếu, và lần thiếu đầu tiên là chính commit ghi kết quả đo.
 */
export function laMa(f: string): boolean {
  if (f.endsWith(".md")) return false;
  return (
    /^packages\//.test(f) ||
    /^vi-du-tich-hop\//.test(f) ||
    f === "scripts/dong-goi-sdk.mjs" ||
    f === "scripts/thu-tich-hop.mjs" ||
    f === "apps/demo-wallet/public/hien-truong.json"
  );
}

/**
 * "Giao diện" = thứ làm một phép đo khả năng tiếp cận mất hiệu lực.
 *
 * Kết quả axe đo trên bản dựng nào thì chỉ nói về bản dựng đó. Sửa `App.tsx` là kết
 * quả cũ hết giá trị; sửa README thì không. Tách riêng khỏi {@link laMa} vì hai phép
 * đo hỏng vì hai loại thay đổi khác nhau.
 */
export function laGiaoDien(f: string): boolean {
  if (f.endsWith(".md")) return false;
  return /^apps\/[^/]+\/(src|public|index\.html)/.test(f) || /^apps\/[^/]+\/(vite|tailwind)/.test(f);
}

export type KetLuanToTien =
  | { con: true; vi: string }
  | { con: false; vi: string; nongCan?: boolean };

/**
 * Bằng chứng đo tại `sha` còn mô tả đúng `HEAD` không?
 *
 * `dangKe` mặc định là {@link laMa}; release notes truyền vị từ riêng vì thứ làm nó
 * lỗi thời là *mọi* thay đổi trừ chính nó.
 */
export function bangChungConHieuLuc(
  sha: string | null | undefined,
  dangKe: (f: string) => boolean = laMa,
): KetLuanToTien {
  if (!sha) return { con: false, vi: "không có SHA trong bằng chứng" };

  const head = git(["rev-parse", "HEAD"]);
  if (head === null) return { con: false, vi: "không đọc được HEAD" };
  if (head.startsWith(sha) || sha.startsWith(head)) {
    return { con: true, vi: `đo tại ${sha.slice(0, 7)} = HEAD` };
  }

  // Kho nông cạn (`git clone --depth 1`) không trả lời được câu "có phải tổ tiên
  // không". Không kiểm được thì nói vậy, đừng đoán.
  if (git(["rev-parse", "--is-shallow-repository"]) === "true") {
    return { con: false, nongCan: true, vi: "kho nông cạn — KHÔNG KIỂM ĐƯỢC" };
  }

  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sha, "HEAD"], { stdio: "ignore" });
  } catch {
    return { con: false, vi: `${sha.slice(0, 7)} không phải tổ tiên của HEAD — đo lại` };
  }

  const dong = (raw: string | null) =>
    (raw ?? "")
      .split(String.fromCharCode(10))
      .map((x) => x.replace(String.fromCharCode(13), "").trim())
      .filter(Boolean);

  // Hỏi từng commit một. Đọc `git log --name-only` gộp thì phải tách khối bằng dòng
  // trống, và một thông điệp commit có dòng trống là parser sai ngay.
  const bun = dong(git(["log", "--format=%H", `${sha}..HEAD`])).filter((c) =>
    dong(git(["diff-tree", "--no-commit-id", "--name-only", "-r", c])).some(dangKe),
  );

  return bun.length === 0
    ? { con: true, vi: `đo tại ${sha.slice(0, 7)}; từ đó tới HEAD chỉ tài liệu đổi` }
    : {
        con: false,
        vi: `${bun.length} commit chạm mã sau lượt đo: ${bun.map((c) => c.slice(0, 7)).join(", ")}`,
      };
}
