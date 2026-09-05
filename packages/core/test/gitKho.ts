import { execFileSync } from "node:child_process";

/*
 * ĐỌC LỊCH SỬ GIT TRONG TEST — VÀ BIẾT KHI NÀO KHÔNG ĐỌC ĐƯỢC.
 *
 * `actions/checkout@v4` mặc định `fetch-depth: 1`: CI chỉ có ĐÚNG một commit. Mọi
 * câu hỏi kiểu "SHA này có thật trong repo không" đều trả lời SAI ở đó — không phải
 * vì SHA sai, mà vì commit cha không được tải về.
 *
 * Một guard đỏ vì môi trường không trả lời được là guard hỏng: nó chặn CI bằng một
 * lý do không ai sửa được bằng cách sửa repo. Đây là cùng một lỗi với cổng
 * `--strict` từng đòi release notes ghi SHA của chính commit tạo ra nó.
 *
 * Nên tách ba trạng thái, đừng gộp hai:
 *
 *   true   — commit có thật
 *   false  — commit KHÔNG có thật, và ta biết chắc (kho đầy đủ)
 *   null   — KHÔNG KIỂM ĐƯỢC (kho nông cạn, hoặc không phải git repo)
 *
 * Gọi `null` là `false` chính là chỗ CI vừa đỏ oan.
 */

export function khoNongCan(cwd: string): boolean {
  try {
    const ra = execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
      cwd,
      encoding: "utf8",
    }).trim();
    return ra === "true";
  } catch {
    // Không phải git repo (bản tarball tải về chẳng hạn) — cũng là không kiểm được.
    return true;
  }
}

/** `null` nghĩa là không kiểm được, KHÔNG phải "không có thật". */
export function commitCoThat(sha: string, cwd: string): boolean | null {
  if (khoNongCan(cwd)) return null;
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
