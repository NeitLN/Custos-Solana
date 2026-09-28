import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { docPhatLai, docThucThiLive, docAiThat } from "../../../scripts/bangChungChungKet.ts";

/*
 * CK-13 — trang bằng chứng tách phát lại / thực thi live / AI mô hình thật, mỗi con số đọc
 * từ ĐÚNG artifact của nó. Bài này đối chiếu từng trường với file gốc, đếm độc lập.
 */
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));

test("phát lại: số kịch bản, nguồn và độ trễ lấy từ bộ phát lại + phép đo CK-14", () => {
  const bo = json("apps/demo-wallet/public/replay/kich-ban.json");
  const do_ = json("docs/review/ck-20260927/do-replay.json");
  const p = docPhatLai()!;
  assert.equal(p.soKichBan, bo.mau.length);
  assert.deepEqual(p.nguon, bo.nguonGhi);
  assert.equal(p.engineLucGhi, bo.engineLucGhi.core);
  assert.equal(p.doTre?.doLuc, do_.doLuc);
  assert.ok(typeof p.doTre?.trungViMs === "number" && typeof p.doTre?.soLuot === "number");
  // Ghi lúc sớm nhất / muộn nhất: đúng khoảng thời gian thật của các fixture.
  const luc = bo.mau.map((m: { captureLuc: string }) => m.captureLuc).sort();
  assert.equal(p.ghiTu, luc[0]);
  assert.equal(p.ghiDen, luc.at(-1));
});

test("thực thi live: biên nhận KHỬ TRÙNG theo chữ ký, ca đạt từ probe, ca chưa đạt = mã probe khai mà chưa đạt", () => {
  const l = docThucThiLive()!;
  // Đếm ĐỘC LẬP trên mọi thư mục nghiệm thu theo ngày.
  const chuKy = new Map<string, string | undefined>();
  const dat = new Set<string>();
  for (const ngay of readdirSync("docs/review").filter((d) => /^ck-\d{8}$/.test(d)))
    for (const d of readdirSync(`docs/review/${ngay}`).filter((x) => x.startsWith("live-ck05"))) {
      let r: { checks?: string[]; receipts?: Array<{ signature: string; comparison?: { balance?: string } }> };
      try {
        r = json(`docs/review/${ngay}/${d}/browser.json`);
      } catch {
        continue;
      }
      for (const c of r.checks ?? []) {
        const m = /^([A-Z]+\d+):/.exec(c);
        if (m) dat.add(m[1]!);
      }
      for (const x of r.receipts ?? []) if (!chuKy.has(x.signature)) chuKy.set(x.signature, x.comparison?.balance);
    }
  const bal = [...chuKy.values()];
  assert.equal(l.soBienNhan, chuKy.size);
  assert.equal(l.soKhopSoDu, bal.filter((x) => x === "match").length);
  assert.equal(l.soLechSoDu, bal.filter((x) => x === "mismatch").length);
  // Khớp + lệch + chưa rõ = tổng: không biên nhận nào bị đếm hai lần hay rơi mất.
  assert.equal(l.soKhopSoDu + l.soLechSoDu + l.soChuaRoSoDu, l.soBienNhan);
  assert.deepEqual([...l.caDat].sort(), [...dat].sort());
  assert.equal(l.cluster, "devnet");
  // Không ca nào vừa đạt vừa chưa đạt; mọi ca là mã probe thật sự khai.
  for (const c of l.caChuaDat) assert.ok(!l.caDat.includes(c), c);
  const probe = readFileSync("apps/demo-wallet/tools/probe-realistic-wallet.py", "utf8");
  for (const c of [...l.caDat, ...l.caChuaDat]) assert.ok(probe.includes(`check('${c}`), `${c} không có trong probe`);
});

test("AI mô hình thật: số của lượt đo, KÈM cờ bộ chắn đã đổi từ lượt đo", () => {
  const g = json("data/eval/giu-lai-ket-qua.json");
  const a = json("data/eval/ai-ket-qua.json");
  const t = docAiThat()!;
  assert.equal(t.moHinh, g.liveGanNhat.moHinh);
  assert.equal(t.giuLai.soCa, g.liveGanNhat.moHinhThat.tomTat.soCa);
  assert.equal(t.giuLai.daRaViPham, g.liveGanNhat.moHinhThat.tomTat.daRaViPham);
  assert.equal(t.phatTrien.soMau, a.liveGanNhat.soMau);
  assert.equal(t.phatTrien.soMauViPham, new Set(a.liveGanNhat.viPham.map((v: { id: string }) => v.id)).size);
  const nay = createHash("sha256").update(readFileSync("packages/ai/src/moHinh.ts", "utf8")).digest("hex").slice(0, 16);
  assert.equal(t.boChanDaDoi, g.liveGanNhat.guardHash !== nay);
});

test("trang Số liệu có BA mục riêng, đọc từ ba trường riêng, và nói ra khi bộ soi đã đổi", () => {
  const src = readFileSync("apps/demo-wallet/src/SoLieu.tsx", "utf8");
  for (const [id, truong] of [["phat-lai", "phatLai"], ["thuc-thi-live", "thucThiLive"], ["ai-that", "aiThat"]]) {
    assert.ok(src.includes(`id="${id}"`), `thiếu mục ${id}`);
    assert.ok(src.includes(`d.${truong}.`), `mục ${id} không đọc từ d.${truong}`);
    assert.ok(src.includes(`href="#${id}"`), `mục lục thiếu ${id}`);
  }
  assert.ok(/boChanDaDoi/.test(src), "trang không nói khi số AI là của bộ soi cũ");
  // Kiểm GENERATOR, không kiểm tệp sinh ra: `tao-so-lieu.ts` từ chối ghi khi còn test đỏ, nên
  // đòi tệp đã có trường mới ở đây là vòng lặp — bài đỏ chặn chính lượt sinh làm nó xanh.
  const gen = readFileSync("scripts/tao-so-lieu.ts", "utf8");
  for (const [k, f] of [["phatLai", "docPhatLai"], ["thucThiLive", "docThucThiLive"], ["aiThat", "docAiThat"]])
    assert.ok(gen.includes(`${k}: ${f}()`), `tao-so-lieu.ts chưa sinh ${k}`);
});

test("Codex lần 3, mục 3 · đếm MẪU có vi phạm (theo id), không đếm SỐ vi phạm", async () => {
  const { demMauViPham } = await import("../../../scripts/bangChungChungKet.ts");
  // Một mẫu vừa bịa địa chỉ vừa bịa hai số ⇒ ba bản ghi, MỘT mẫu.
  assert.equal(demMauViPham([{ id: "MN-01" }, { id: "MN-01" }, { id: "MN-01" }, { id: "R03-pos" }]), 2);
  assert.equal(demMauViPham([]), 0);
  const a = json("data/eval/ai-ket-qua.json");
  const ids = new Set((a.liveGanNhat.viPham as Array<{ id: string }>).map((v) => v.id));
  assert.equal(docAiThat()!.phatTrien.soMauViPham, ids.size);
});

test("Codex lần 3, mục 2 · trang KHÔNG gán một nguyên nhân chung cho mọi ca chưa đạt", () => {
  const src = readFileSync("apps/demo-wallet/src/SoLieu.tsx", "utf8");
  const muc = src.slice(src.indexOf('id="thuc-thi-live"'), src.indexOf('id="ai-that"'));
  // AC05 đã gửi (biên nhận đọc quá hạn), AC06 có biên nhận nhưng quyền "chưa rõ" — không phải
  // "dừng ở bước chuẩn bị". Câu chung như vậy nói sai nguyên nhân của chính những ca đó.
  assert.ok(!/Các lượt tới những ca chưa đạt dừng ở bước chuẩn bị/.test(muc), "vẫn gán một nguyên nhân chung");
  assert.ok(/NGHIEM-THU-LIVE\.md/.test(muc), "không trỏ tới biên bản có lý do từng ca");
});

test("CK-13 · chuỗi bằng chứng: MỖI giao dịch có loại → Custos bật/tắt → quyết định + mức L2 → chữ ký → đối chiếu", () => {
  const l = docThucThiLive()!;
  assert.equal(l.chuoi.length, l.soBienNhan, "mỗi biên nhận phải có đúng một mắt xích");
  const luc = l.chuoi.map((x) => x.luc ?? "");
  assert.deepEqual(luc, [...luc].sort(), "chuỗi phải theo thứ tự thời gian");
  for (const x of l.chuoi) {
    assert.match(x.chuKy, /^[1-9A-HJ-NP-Za-km-z]{64,88}$/, "chữ ký phải đầy đủ để mở Explorer");
    assert.ok(["approve", "override"].includes(x.quyetDinh), `${x.chuKy}: quyết định lạ ${x.quyetDinh}`);
    assert.ok(["safe", "warning", "danger"].includes(x.mucL2));
    assert.equal(typeof x.baoVe, "boolean");
    assert.ok(["match", "mismatch", "unknown"].includes(x.soDu), `${x.chuKy}: đối chiếu lạ ${x.soDu}`);
  }
  const src = readFileSync("apps/demo-wallet/src/SoLieu.tsx", "utf8");
  assert.ok(/d\.thucThiLive\.chuoi\.map/.test(src), "trang không hiện chuỗi bằng chứng");
  assert.ok(/explorer\.solana\.com\/tx\//.test(src) && /cluster=devnet/.test(src), "chữ ký không mở được trên Explorer");
});

test("Codex lần 4, mục 5 · MỖI hàng của chuỗi khớp NỘI DUNG biên nhận gốc (không chỉ hình dạng)", () => {
  const l = docThucThiLive()!;
  // Đọc độc lập: chữ ký → biên nhận ĐẦU TIÊN gặp (theo thứ tự ngày, thư mục) — cùng quy tắc khử trùng.
  const goc = new Map<string, { kind: string; protected?: boolean; decision?: { action?: string; level?: string; reasonCodes?: string[] }; resolution?: string; comparison?: { balance?: string } }>();
  for (const ngay of readdirSync("docs/review").filter((d) => /^ck-\d{8}$/.test(d)).sort())
    for (const d of readdirSync(`docs/review/${ngay}`).filter((x) => x.startsWith("live-ck05")).sort()) {
      let r: { receipts?: Array<{ signature: string } & Record<string, never>> };
      try {
        r = json(`docs/review/${ngay}/${d}/browser.json`);
      } catch {
        continue;
      }
      for (const x of r.receipts ?? []) if (!goc.has(x.signature)) goc.set(x.signature, x as never);
    }
  for (const h of l.chuoi) {
    const g = goc.get(h.chuKy)!;
    assert.ok(g, `${h.chuKy}: không có biên nhận gốc`);
    assert.equal(h.loai, g.kind, `${h.chuKy}: loại`);
    assert.equal(h.baoVe, g.protected === true, `${h.chuKy}: Custos bật/tắt`);
    assert.equal(h.quyetDinh, g.decision?.action, `${h.chuKy}: quyết định`);
    assert.equal(h.mucL2, g.decision?.level, `${h.chuKy}: mức L2`);
    assert.deepEqual(h.maLyDo, g.decision?.reasonCodes ?? [], `${h.chuKy}: mã lý do`);
    assert.equal(h.xacNhan, g.resolution ?? null, `${h.chuKy}: xác nhận`);
    assert.equal(h.soDu, g.comparison?.balance ?? "unknown", `${h.chuKy}: đối chiếu số dư`);
  }
});
