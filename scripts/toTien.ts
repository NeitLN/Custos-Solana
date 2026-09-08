import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";

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

  /*
   * DỮ LIỆU SINH RA KHÔNG PHẢI GIAO DIỆN.
   *
   * `apps/demo-wallet/public/so-lieu.json` nằm dưới `public/`, nhưng nó là số đo do
   * `npm run so-lieu` sinh — đổi sau mỗi lượt đo. Tính nó là giao diện thì ô
   * accessibility đỏ sau MỌI lần đồng bộ số liệu, tức lại là một cổng không mở được.
   *
   * Cảnh báo trung thực: nội dung có ảnh hưởng tới bố cục, nên một thay đổi nội dung
   * ĐỦ LỚN vẫn có thể làm tràn ngang. Bài kiểm trình duyệt có sẵn phép đo tràn ngang
   * ở cả hai khung, nên nó bắt được — ở LƯỢT CHẠY SAU. Một con số đổi thêm một chữ
   * số thì không.
   */
  if (/^apps\/[^/]+\/public\/.+\.json$/.test(f)) return false;

  return /^apps\/[^/]+\/(src|public|index\.html)/.test(f) || /^apps\/[^/]+\/(vite|tailwind)/.test(f);
}

export type KetLuanToTien =
  | { con: true; vi: string }
  | { con: false; vi: string; nongCan?: boolean };

export type DauVet = { bam: string; soFile: number };

/**
 * Dấu vết NỘI DUNG của phần mã đáng kể, đọc từ CÂY LÀM VIỆC.
 *
 * ## Vì sao SHA thôi thì chưa đủ
 *
 * `bangChungConHieuLuc` trả lời "từ lúc đo tới HEAD có commit nào chạm mã không".
 * Câu đó bỏ sót đúng một khoảng: thay đổi CHƯA commit.
 *
 * Tái hiện được, và đã tái hiện: thêm `outline: none` cùng `min-height: 0` vào
 * `style.css` mà không commit, rồi chạy cổng sản phẩm. Ô "Accessibility bản hiện
 * tại" báo `✓ không vi phạm serious/critical` — trong khi vòng focus đã biến mất
 * và vùng bấm đã sập về 0. `sourceCommit` vẫn bằng HEAD, không commit nào xen
 * vào, nên mọi thứ SHA nói đều đúng và kết luận vẫn sai.
 *
 * Ô "cây làm việc sạch" có bắt được là có file bẩn, nhưng đó là một ô khác, và
 * `data/a11y/ket-qua.json` thì được tài liệu đọc trực tiếp — ở đó không có ô nào
 * canh cả.
 *
 * ## Vì sao băm nội dung chứ không băm diff
 *
 * Băm diff thì đo lúc cây bẩn rồi commit chính thay đổi đó sẽ ra dấu vết khác,
 * dù mã hoàn toàn không đổi — cổng bắt đo lại một cách vô ích. Băm nội dung thì
 * "bẩn rồi commit" giữ nguyên dấu vết, còn "bẩn rồi vứt đi" thì đổi. Đó đúng là
 * ranh giới ta cần.
 *
 * ## Vì sao `git hash-object` chứ không `readFileSync`
 *
 * Windows để CRLF trong cây làm việc, Linux để LF. Băm byte thô thì CI và máy
 * người viết không bao giờ khớp — lại một cổng không mở được. `git hash-object`
 * chạy đúng bộ lọc mà git dùng cho `.gitattributes`/`autocrlf`, nên hai nơi ra
 * cùng một số.
 */
export function dauVetNoiDung(
  dangKe: (f: string) => boolean = laMa,
  goc: string = process.cwd(),
): DauVet | null {
  const gitO = (args: string[]): string | null => {
    try {
      return execFileSync("git", args, { cwd: goc, encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  };
  const dongPT = (raw: string | null) =>
    (raw ?? "")
      .split(String.fromCharCode(10))
      .map((x) => x.replace(String.fromCharCode(13), "").trim())
      .filter(Boolean);

  // `--others --exclude-standard`: file mới thêm mà chưa `git add` vẫn là mã đang
  // chạy. Bỏ qua chúng là chừa lại đúng khoảng trống bài này sinh ra để bịt.
  const ds = dongPT(gitO(["ls-files", "--cached", "--others", "--exclude-standard"]))
    .filter(dangKe)
    .filter((f) => existsSync(join(goc, f)))
    .sort();
  if (!ds.length) return null;

  let bam: string;
  try {
    bam = execFileSync("git", ["hash-object", "--stdin-paths"], {
      cwd: goc,
      input: ds.join(String.fromCharCode(10)) + String.fromCharCode(10),
      encoding: "utf8",
    });
  } catch {
    return null;
  }

  return {
    bam: createHash("sha256")
      .update(ds.join(String.fromCharCode(0)) + String.fromCharCode(0) + bam)
      .digest("hex")
      .slice(0, 16),
    soFile: ds.length,
  };
}

/**
 * Bằng chứng đo tại `sha` còn mô tả đúng `HEAD` không?
 *
 * `dangKe` mặc định là {@link laMa}; release notes truyền vị từ riêng vì thứ làm nó
 * lỗi thời là *mọi* thay đổi trừ chính nó.
 */
export function bangChungConHieuLuc(
  sha: string | null | undefined,
  dangKe: (f: string) => boolean = laMa,
  dauVetCu?: DauVet | null,
): KetLuanToTien {
  if (!sha) return { con: false, vi: "không có SHA trong bằng chứng" };

  /*
   * DẤU VẾT NỘI DUNG ĐI TRƯỚC PHẢ HỆ COMMIT.
   *
   * Nếu nội dung mã hôm nay khác nội dung lúc đo thì phả hệ commit nói gì cũng
   * không cứu được — kể cả khi `sha === HEAD` và cây trông như chưa ai đụng vào.
   * Xem chú thích của `dauVetNoiDung` về ca đã tái hiện.
   *
   * Bằng chứng CŨ không có trường này. Không thể vì thế mà coi chúng là hỏng —
   * làm vậy là bắt đo lại mọi thứ chỉ vì đổi định dạng. Nhưng cũng không được im
   * lặng cho qua khi cây đang bẩn: lúc đó đúng là KHÔNG BIẾT, và "không biết"
   * phải nói ra thành "không biết".
   */
  const nay = dauVetNoiDung(dangKe);
  if (dauVetCu) {
    if (!nay) return { con: false, vi: "không đọc được dấu vết nội dung hiện tại" };
    if (nay.bam !== dauVetCu.bam) {
      return { con: false, vi: `nội dung mã đã đổi sau lượt đo (${dauVetCu.bam} → ${nay.bam})` };
    }
  } else if (git(["status", "--porcelain", "--untracked-files=all"])) {
    const ban = (git(["status", "--porcelain", "--untracked-files=all"]) ?? "")
      .split(String.fromCharCode(10))
      .map((l) => l.slice(3).replace(String.fromCharCode(13), "").trim())
      .filter((f) => f && dangKe(f));
    if (ban.length) {
      return {
        con: false,
        nongCan: true,
        vi: `bằng chứng không ghi dấu vết nội dung, mà cây đang bẩn ${ban.length} file mã — KHÔNG KIỂM ĐƯỢC`,
      };
    }
  }

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
