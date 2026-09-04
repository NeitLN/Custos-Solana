import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

const NGUON = "docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md";

/*
 * LỊCH THI CHỈ ĐƯỢC GHI Ở MỘT NƠI.
 *
 * Hạn đổi từ 05/09 sang 19/09, và lúc đó có SÁU file đang nói ngày cũ: README,
 * CLAUDE.md, CUSTOS.md, PITCH, ROADMAP-DEVNET, VIEC-CUA-BAN. Mỗi file là một bản
 * sao của cùng một sự thật, nên đổi một lần là phải sửa sáu chỗ — và bỏ sót chỗ nào
 * thì chỗ đó nói với người đọc rằng dự án đã hết hạn.
 *
 * Đây đúng hình dạng lỗi mà repo đã gặp hai lần rồi: số test gõ tay ở nhiều tài
 * liệu, và ngày phỏng vấn gõ tay ở ba nơi. Cả hai đều đã chuyển sang một nguồn.
 */

/** Ngày trong `NGUON` là ngày đúng. Mọi nơi khác phải khớp hoặc đừng nhắc tới. */
function hanHienTai(): string {
  const dong = doc(NGUON)
    .split("\n")
    .find((d) => d.includes("**Hạn tiếp theo**"));
  assert.ok(dong, `${NGUON}: không tìm thấy dòng "**Hạn tiếp theo**"`);
  const m = /(\d{2}\/\d{2}\/\d{4})/.exec(dong);
  assert.ok(m, `${NGUON}: dòng hạn không chứa ngày dạng dd/mm/yyyy`);
  return m[1] as string;
}

test("có nguồn quyết định duy nhất về lịch thi", () => {
  assert.ok(existsSync(join(GOC, NGUON)), `thiếu ${NGUON} — lịch phải có một nguồn`);
  const s = doc(NGUON);
  // Nguồn phải nói rõ điều gì CHƯA chắc. Một lịch không phân biệt được "BTC đã
  // công bố" với "chủ dự án nói" là một lịch không kiểm chứng được.
  assert.match(s, /chưa xác nhận/i, "nguồn phải đánh dấu phần chưa xác nhận");
  assert.match(s, /Chủ dự án cung cấp/i, "nguồn phải ghi xuất xứ của mốc hiện tại");
});

test("tài liệu đang dùng không nói một hạn khác với nguồn", () => {
  // Không cấm nhắc ngày — cấm nhắc SAI ngày. CLAUDE.md nêu hạn là hợp lý vì nó
  // được nạp mỗi phiên; nó chỉ không được nêu một ngày khác nguồn.
  const han = hanHienTai();
  const ngayKhac = /(\d{2}\/\d{2}\/20\d{2})/g;
  const lech: string[] = [];

  for (const f of ["README.md", "CLAUDE.md", "CUSTOS.md", "PITCH-VA-PHAN-BIEN.md"]) {
    for (const [i, d] of doc(f).split("\n").entries()) {
      if (!/hạn tiếp theo|hạn cứng|hạn nộp|giờ thi|vòng loại|chung kết/i.test(d)) continue;
      for (const m of d.matchAll(ngayKhac)) {
        if (m[1] !== han) lech.push(`${f}:${i + 1} — nói hạn ${m[1]}, nguồn nói ${han}`);
      }
    }
  }
  assert.deepEqual(
    lech,
    [],
    `Lịch phải khớp ${NGUON}, hoặc trỏ về đó thay vì gõ lại:\n` + lech.join("\n"),
  );
});

test("kế hoạch viết cho hạn cũ đều mang nhãn lịch sử", () => {
  // Không xoá kế hoạch cũ — chúng là dấu vết quá trình, và BTC yêu cầu repo thể hiện
  // quá trình build thật. Nhưng người đọc phải biết ngay chúng thuộc về hạn nào.
  const thieuNhan: string[] = [];
  for (const f of [
    "docs/KE-HOACH-11-NGAY-CUOI.md",
    "docs/ROADMAP-DEVNET.md",
    "docs/VIEC-CUA-BAN.md",
  ]) {
    const dau = doc(f).split("\n").slice(0, 12).join("\n");
    if (!/TÀI LIỆU LỊCH SỬ/.test(dau)) thieuNhan.push(f);
    else if (!dau.includes(NGUON)) thieuNhan.push(`${f} — có nhãn nhưng không trỏ về nguồn`);
  }
  assert.deepEqual(
    thieuNhan,
    [],
    "Kế hoạch của hạn cũ phải nói rõ nó là lịch cũ, ngay trong 12 dòng đầu:\n" +
      thieuNhan.join("\n"),
  );
});

test("mâu thuẫn về ngày chung kết được ghi lại, không bị chọn bừa", () => {
  /*
   * Hai văn bản chính thức của BTC trong repo nói khác nhau:
   *   Thể lệ (cập nhật 21/07) -> 26/09/2026 tại SIHUB
   *   Lịch sau Unitour        -> 23/09/2026 tại UEF
   *
   * Chọn một cái rồi im lặng là cách nhanh nhất để cả đội có mặt sai ngày. Chừng nào
   * BTC chưa trả lời, mâu thuẫn phải nằm nguyên trong nguồn để không ai quên hỏi.
   */
  const s = doc(NGUON);
  assert.match(s, /26\/09\/2026/, "phải ghi ngày chung kết theo Thể lệ");
  assert.match(s, /23\/09\/2026/, "phải ghi ngày chung kết theo Lịch sau Unitour");
  assert.match(s, /SIHUB/, "phải ghi địa điểm theo Thể lệ");
  assert.match(s, /UEF/, "phải ghi địa điểm theo Lịch sau Unitour");
});

test("track lấy theo thể lệ BTC, không đổi theo tin nghe lại", () => {
  // Thể lệ nằm sẵn trong repo và gọi đây là "Track 1 — Best Product & Business".
  // Đó là nguồn gốc. Đổi tên track theo một bản tóm tắt bên ngoài là bỏ nguồn gốc
  // để chạy theo tin đồn — và nộp sai track thì không sửa được.
  const theLe = doc("docs/cuoc-thi/Thể lệ UniHackfest 2026.md");
  assert.match(theLe, /Best Product & Business/, "thể lệ phải còn nêu tên track");
  assert.match(doc(NGUON), /Best Product & Business/, "nguồn phải chép đúng tên trong thể lệ");
});
