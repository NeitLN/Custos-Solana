import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dauVetNoiDung, laGiaoDien, laMa } from "../../../scripts/toTien.ts";

/**
 * DẤU VẾT NỘI DUNG — bịt khoảng mà `sourceCommit` không nhìn thấy.
 *
 * `bangChungConHieuLuc` hỏi "từ lượt đo tới HEAD có commit nào chạm mã không". Câu
 * đó bỏ sót thay đổi CHƯA commit, và khoảng sót đó đã tái hiện được: thêm
 * `outline: none` với `min-height: 0` vào `style.css` rồi chạy cổng sản phẩm mà
 * không commit — ô accessibility báo `✓ không vi phạm serious/critical` trong khi
 * vòng focus đã mất và vùng bấm đã sập về 0.
 *
 * Kho tạm chứ không phải kho thật: bài kiểm phải ĐỔI file để chứng minh dấu vết
 * đổi theo, và không bài kiểm nào được sửa cây làm việc của người đang chạy nó.
 */

function khoTam(): string {
  const d = mkdtempSync(join(tmpdir(), "custos-dauvet-"));
  const g = (...a: string[]) => execFileSync("git", a, { cwd: d, stdio: "ignore" });
  g("init", "-q");
  g("config", "user.email", "kiem@custos.test");
  g("config", "user.name", "Kiem Thu");
  mkdirSync(join(d, "apps", "vi", "src"), { recursive: true });
  mkdirSync(join(d, "packages", "core"), { recursive: true });
  writeFileSync(join(d, "apps", "vi", "src", "App.tsx"), "export const a = 1;\n");
  writeFileSync(join(d, "apps", "vi", "src", "style.css"), ".nut { min-height: 44px; }\n");
  writeFileSync(join(d, "packages", "core", "index.ts"), "export const b = 2;\n");
  writeFileSync(join(d, "README.md"), "# doc\n");
  g("add", "-A");
  g("commit", "-qm", "nen");
  return d;
}

test("dấu vết ổn định: gọi hai lần trên cùng cây cho cùng một số", () => {
  const d = khoTam();
  try {
    const a = dauVetNoiDung(laGiaoDien, d);
    const b = dauVetNoiDung(laGiaoDien, d);
    assert.ok(a, "phải đọc được dấu vết");
    assert.deepEqual(a, b, "không ổn định thì mọi so sánh sau đều vô nghĩa");
    assert.equal(a!.soFile, 2, "App.tsx và style.css");
    assert.match(a!.bam, /^[0-9a-f]{16}$/);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

/*
 * ĐÂY LÀ TÍNH CHẤT CẢ BÀI SINH RA ĐỂ CÓ.
 *
 * Sửa mà không commit thì SHA không đổi. Dấu vết PHẢI đổi, nếu không thì nó không
 * thêm được gì so với `sourceCommit` và chỉ là một trường trang trí.
 */
test("sửa file mà KHÔNG commit vẫn làm dấu vết đổi", () => {
  const d = khoTam();
  try {
    const truoc = dauVetNoiDung(laGiaoDien, d)!;
    const shaTruoc = execFileSync("git", ["rev-parse", "HEAD"], { cwd: d, encoding: "utf8" }).trim();

    writeFileSync(join(d, "apps", "vi", "src", "style.css"), ".nut { min-height: 0; }\n");

    const shaSau = execFileSync("git", ["rev-parse", "HEAD"], { cwd: d, encoding: "utf8" }).trim();
    assert.equal(shaSau, shaTruoc, "chưa commit thì SHA không đổi — đó chính là khoảng sót");
    assert.notEqual(
      dauVetNoiDung(laGiaoDien, d)!.bam,
      truoc.bam,
      "SHA mù ở đây, nên dấu vết phải thấy",
    );
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

/*
 * MẶT KIA CỦA CÙNG TÍNH CHẤT — và là lý do băm NỘI DUNG chứ không băm diff.
 *
 * Quy trình thật là: đo (cây bẩn) → commit thay đổi → commit bằng chứng. Nếu commit
 * làm dấu vết đổi thì cổng đòi đo lại sau mỗi lần commit, tức lại một cổng không mở
 * được — đúng cái bẫy repo này đã dính tám lần.
 */
test("commit chính thay đổi đó KHÔNG làm dấu vết đổi", () => {
  const d = khoTam();
  try {
    writeFileSync(join(d, "apps", "vi", "src", "style.css"), ".nut { min-height: 48px; }\n");
    const luucDo = dauVetNoiDung(laGiaoDien, d)!;

    execFileSync("git", ["add", "-A"], { cwd: d, stdio: "ignore" });
    execFileSync("git", ["commit", "-qm", "sua css"], { cwd: d, stdio: "ignore" });

    assert.equal(
      dauVetNoiDung(laGiaoDien, d)!.bam,
      luucDo.bam,
      "nội dung không đổi thì dấu vết không được đổi, dù SHA đã khác",
    );
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("file mới chưa `git add` vẫn được tính", () => {
  const d = khoTam();
  try {
    const truoc = dauVetNoiDung(laGiaoDien, d)!;
    writeFileSync(join(d, "apps", "vi", "src", "Moi.tsx"), "export const c = 3;\n");
    const sau = dauVetNoiDung(laGiaoDien, d)!;
    assert.equal(sau.soFile, truoc.soFile + 1, "bỏ qua file chưa theo dõi là chừa lại đúng lỗ hổng");
    assert.notEqual(sau.bam, truoc.bam);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("sửa tài liệu KHÔNG làm dấu vết giao diện đổi", () => {
  const d = khoTam();
  try {
    const truoc = dauVetNoiDung(laGiaoDien, d)!;
    writeFileSync(join(d, "README.md"), "# doc\n\nthem mot doan rat dai.\n");
    assert.equal(
      dauVetNoiDung(laGiaoDien, d)!.bam,
      truoc.bam,
      "đỏ vì sửa README là bắt đo lại vô cớ — cùng lỗi mà `laMa`/`laGiaoDien` sinh ra để tránh",
    );
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("hai vị từ cho hai dấu vết khác nhau", () => {
  const d = khoTam();
  try {
    // Đối chứng: nếu `dangKe` bị bỏ qua thì hai lời gọi này trùng nhau, và mọi bài
    // kiểm ở trên vẫn xanh trong khi hàm đã hỏng.
    const gd = dauVetNoiDung(laGiaoDien, d)!;
    const ma = dauVetNoiDung(laMa, d)!;
    assert.notEqual(gd.bam, ma.bam);
    assert.equal(ma.soFile, 1, "chỉ `packages/core/index.ts`");
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("thư mục không phải git repo ⇒ `null`, không phải ném lỗi", () => {
  const d = mkdtempSync(join(tmpdir(), "custos-khong-git-"));
  try {
    // Bản tarball tải về không có `.git`. Không kiểm được thì nói `null`; bên gọi
    // đọc `null` thành "không biết", và cổng đã có sẵn ô cho trạng thái đó.
    assert.equal(dauVetNoiDung(laGiaoDien, d), null);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});
