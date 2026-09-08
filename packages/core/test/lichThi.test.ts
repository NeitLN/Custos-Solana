import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
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

/**
 * Mọi tài liệu `.md` đang dùng — QUÉT, không liệt kê tay.
 *
 * Bài "cửa gõ cứng ngày" bên dưới trượt lần đầu vì bản trước liệt kê bốn file, và
 * file có lỗi không nằm trong bốn file đó. Một danh sách gõ tay luôn thiếu đúng cái
 * vừa được thêm vào — đây là lần thứ chín trong repo này.
 *
 * Bỏ `node_modules` và `site/` (bản dựng), giữ tất cả phần còn lại.
 */
function taiLieuDangDung(): string[] {
  const ra: string[] = [];
  const di = (thuMuc: string) => {
    for (const m of readdirSync(join(GOC, thuMuc), { withFileTypes: true })) {
      const p = thuMuc ? `${thuMuc}/${m.name}` : m.name;
      if (m.isDirectory()) {
        if (["node_modules", ".git", "site", "dist", ".thu-pages"].includes(m.name)) continue;
        di(p);
      } else if (m.name.endsWith(".md")) {
        ra.push(p);
      }
    }
  };
  di("");
  return ra;
}

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

/*
 * CỬA QUYẾT ĐỊNH GÕ CỨNG NGÀY — bài trên KHÔNG bắt được, và đã để lọt một cái.
 *
 * `docs/PHONG-VAN-NGUOI-MUA.md` có mục «Cửa quyết định ngày 10/09». Ngày đó trôi
 * qua trong khi hạn nộp đổi sang mốc khác, nên cả cái cửa im lặng hết hiệu lực —
 * không lỗi, không cảnh báo, chỉ là một mục tài liệu không còn nghĩa.
 *
 * Bài trên trượt vì HAI lớp danh sách hẹp:
 *
 *   · nó chỉ quét bốn file, và file đó không nằm trong bốn file;
 *   · nó chỉ khớp `hạn tiếp theo|hạn nộp|vòng loại|…`, mà «cửa quyết định» không
 *     có chữ nào trong số đó.
 *
 * Bài này hỏi câu rộng hơn và khác hẳn: trong MỌI tài liệu đang dùng, có dòng nào
 * đặt một cái mốc TƯƠNG LAI bằng một ngày gõ tay không?
 *
 * Ngày ĐO ĐƯỢC thì không sao — «cohort neo 25/08», «phỏng vấn 29–30/08» là ghi lại
 * việc đã xảy ra, và chúng phải giữ nguyên. Chỉ ngày dùng làm CỬA mới nguy hiểm,
 * vì nó là lời hứa về tương lai mà không ai đi kiểm lại.
 */
test("không tài liệu nào đặt cửa/hạn bằng một ngày gõ cứng", () => {
  const CUA = /cửa quyết định|hạn chót|deadline|trước ngày|phải xong trước|chốt trước/i;
  const NGAY = /\b(\d{1,2}\/\d{1,2}(?:\/20\d{2})?)\b/g;

  const boQua = (f: string) =>
    f === NGUON ||
    f.includes("cuoc-thi/") ||
    // Tài liệu đã đóng nhãn lịch sử nói về quá khứ; ngày trong đó là dữ kiện.
    /TÀI LIỆU LỊCH SỬ/.test(doc(f));

  const lech: string[] = [];
  for (const f of taiLieuDangDung()) {
    if (boQua(f)) continue;
    for (const [i, d] of doc(f).split("\n").entries()) {
      // Dòng TRỎ về nguồn lịch là dòng đúng — nó không gõ cứng cái gì cả.
      if (d.includes("THONG-TIN-VONG-HIEN-TAI")) continue;
      if (!CUA.test(d)) continue;
      for (const m of d.matchAll(NGAY)) {
        lech.push(`${f}:${i + 1} — cửa gõ cứng ngày ${m[1]}`);
      }
    }
  }

  assert.deepEqual(
    lech,
    [],
    "Một cái cửa gắn với ngày gõ tay sẽ hết hiệu lực trong im lặng khi lịch đổi.\n" +
      `Trỏ về ${NGUON}, hoặc phát biểu cửa theo SỰ KIỆN ("khi chốt hồ sơ nộp"):\n` +
      lech.join("\n"),
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
