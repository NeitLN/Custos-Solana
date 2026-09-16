import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Keypair, SystemProgram, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";
import { kySauKhiKiem } from "../../../vi-du-tich-hop/src/ky.js";
import { neoKetQua } from "../src/neo.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * TB-I02 — CONSUMER MÔ PHỎNG VÍ CÓ HỢP ĐỒNG KÝ RÕ.
 *
 * Nghiệm thu thẻ nói đúng một câu đo được:
 *
 *   *"signer không được gọi ở các ca chặn/hủy; nhận đúng bytes đã kiểm ở ca được
 *   phép; không gọi API trả phí hoặc gửi thật khi chạy test"*
 *
 * Trước I02, `tich-hop.js` dừng ở quyết định `cho`/`lyDo` — **không có ai ký**. Nên
 * câu *"signer không được gọi khi chặn"* không kiểm được: không có signer để đếm.
 *
 * Signer ở đây là STUB đếm lượt. Nó không ký thật, không chạm mạng, không cần khoá.
 */

const VI = Keypair.generate();
const LA = Keypair.generate();
const BLOCKHASH = "11111111111111111111111111111111";

/** Hai giao dịch KHÁC nhau — để mô phỏng dApp tráo giao dịch giữa lúc kiểm và lúc ký. */
function tx(lamports: number): VersionedTransaction {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: VI.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: VI.publicKey,
          toPubkey: LA.publicKey,
          lamports,
        }),
      ],
    }).compileToV0Message(),
  );
}

/** Signer stub: đếm lượt gọi và giữ lại đúng bytes nó nhận được. */
function stub() {
  const lan: Array<{ bytes: Uint8Array }> = [];
  return {
    lan,
    ky: (_t: unknown, bytes: Uint8Array) => {
      lan.push({ bytes });
    },
  };
}

const chung = { viNguoiDung: VI.publicKey.toBase58(), cluster: "devnet" as const };

test("neo lúc kiểm phải bắt được tx bị sửa tại chỗ trước khi ký", () => {
  const t = tx(1000);
  const neo = neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster);
  t.message.recentBlockhash = LA.publicKey.toBase58();
  const s = stub();
  const r = kySauKhiKiem({ quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: t, neo, ...chung, signer: s.ky });
  assert.equal(r.daKy, false);
  assert.equal(r.lyDo, "giao_dich_da_doi");
  assert.equal(s.lan.length, 0);
});

test("tuổi kết quả tính từ lúc kiểm, không phải lúc bấm ký", () => {
  const t = tx(1000);
  const neo = neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster,
    new Date(Date.now() - 60_000).toISOString());
  const s = stub();
  const r = kySauKhiKiem({ quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: t, neo, ...chung, signer: s.ky, msToiDa: 30_000 });
  assert.equal(r.daKy, false);
  assert.equal(r.lyDo, "ket_qua_qua_cu");
  assert.equal(s.lan.length, 0);
});

/* ── 1 · Signer KHÔNG được gọi ở mọi nhánh từ chối ─────────────────────────── */

test("CHẶN vì phát hiện ⇒ signer không được gọi lần nào", () => {
  const s = stub();
  const t = tx(1000);
  const r = kySauKhiKiem({
    quyetDinh: { cho: "chan", lyDo: "phat_hien" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: s.ky,
  });
  assert.equal(r.daKy, false);
  assert.equal(r.lyDo, "bi_chan");
  assert.equal(s.lan.length, 0, "signer bị gọi ở nhánh CHẶN — policy của ví không giữ được");
});

test("CHẶN vì không kiểm được ⇒ cũng không ký, và lý do KHÁC", () => {
  /*
   * Hai loại chặn phải phân biệt được ở tầng này nữa: ví hiện "nguy hiểm" cho một
   * lượt Devnet chậm thì người dùng học được rằng Custos hay báo bừa.
   */
  const s = stub();
  const r = kySauKhiKiem({
    quyetDinh: { cho: "chan", lyDo: "khong_kiem_duoc" },
    tx: tx(1000), neo: neoKetQua(tx(1000).message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: s.ky,
  });
  assert.equal(r.daKy, false);
  assert.equal(s.lan.length, 0);
  assert.equal(r.chiTiet, "khong_kiem_duoc", "mất lý do thì ví không hiện đúng câu cho người dùng");
});

test("HỎI mà người dùng CHƯA đồng ý ⇒ không ký — mặc định là fail-safe", () => {
  /*
   * `nguoiDungDongY` mặc định `false` có chủ ý: quên truyền cờ thì KHÔNG ký. Mặc
   * định ngược lại sẽ biến một lỗi bỏ sót thành một chữ ký.
   */
  const s = stub();
  const r = kySauKhiKiem({
    quyetDinh: { cho: "hoi", lyDo: "coverage_khuyet" },
    tx: tx(1000), neo: neoKetQua(tx(1000).message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: s.ky,
  });
  assert.equal(r.daKy, false);
  assert.equal(r.lyDo, "cho_nguoi_dung");
  assert.equal(s.lan.length, 0, "chưa ai đồng ý mà đã ký");
});

/* ── 2 · Giao dịch bị TRÁO giữa lúc kiểm và lúc ký ─────────────────────────── */

test("dApp tráo giao dịch sau khi kiểm ⇒ KHÔNG ký, dù quyết định là cho phép", () => {
  /*
   * Ca nguy hiểm nhất của thẻ, và là lý do TB-C06 tồn tại: người dùng đọc thẻ cảnh
   * báo của giao dịch A rồi bấm Ký, trong khi thứ sắp ký là giao dịch B.
   *
   * `khopNeo` băm chính `message.serialize()` — byte thật sẽ được ký.
   */
  const s = stub();
  const daKiem = tx(1000);
  const sapKy = tx(999_999_999); // dApp đổi số tiền
  const r = kySauKhiKiem({
    quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: daKiem, neo: neoKetQua(daKiem.message.serialize(), chung.viNguoiDung, chung.cluster),
    txSapKy: sapKy,
    ...chung,
    signer: s.ky,
  });
  assert.equal(r.daKy, false, "ký một giao dịch KHÁC thứ đã kiểm");
  assert.equal(r.lyDo, "giao_dich_da_doi");
  assert.equal(r.chiTiet, "message-khac");
  assert.equal(s.lan.length, 0);
});

/* ── 3 · Ca ĐƯỢC PHÉP: signer nhận đúng bytes đã kiểm ──────────────────────── */

test("cho phép ký + neo khớp ⇒ signer được gọi ĐÚNG MỘT LẦN, với đúng bytes", () => {
  /*
   * Nghiệm thu: *"nhận đúng bytes đã kiểm ở ca được phép"*. So bytes chứ không so
   * tham chiếu object — một bản sao có cùng nội dung vẫn đúng, một tx khác thì không.
   */
  const s = stub();
  const t = tx(1000);
  const r = kySauKhiKiem({
    quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: s.ky,
  });
  assert.equal(r.daKy, true);
  assert.equal(s.lan.length, 1, "signer phải được gọi đúng một lần, không lặp");
  assert.deepEqual(
    [...s.lan[0]!.bytes],
    [...t.message.serialize()],
    "signer nhận bytes KHÁC thứ đã kiểm",
  );
});

test("signer nhận bytes của tx SẮP KÝ, không phải của tx đã kiểm", () => {
  /*
   * LỖ HỔNG CỦA CHÍNH BÀI TRÊN, lộ ra bằng mutation.
   *
   * Đổi `signer(sapKy, sapKy.message.serialize())` thành `signer(sapKy,
   * tx.message.serialize())` mà cả 10 bài vẫn xanh. Lý do: ở mọi ca được phép ký,
   * `txSapKy` vắng mặt nên `sapKy === tx` — hai bytes trùng nhau, và phép so không
   * phân biệt được.
   *
   * Ca này dựng HAI object khác nhau mang CÙNG nội dung. `khopNeo` băm theo bytes
   * nên nó khớp và cho ký; lúc đó bytes truyền cho signer mới là thứ duy nhất phân
   * biệt "lấy từ tx sắp ký" với "lấy từ tx đã kiểm".
   *
   * Vì sao vế này quan trọng dù hai bên đang trùng nội dung: một bản sửa sau này cho
   * phép `txSapKy` khác `tx` ở phần chữ ký hoặc blockhash sẽ làm signer nhận nhầm
   * bytes, và không có bài nào bắt được.
   */
  const s = stub();
  const daKiem = tx(1000);
  const sapKy = tx(1000); // object KHÁC, nội dung GIỐNG
  assert.notEqual(daKiem, sapKy, "tiền đề: phải là hai object khác nhau");

  const r = kySauKhiKiem({
    quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: daKiem, neo: neoKetQua(daKiem.message.serialize(), chung.viNguoiDung, chung.cluster),
    txSapKy: sapKy,
    ...chung,
    signer: s.ky,
  });

  assert.equal(r.daKy, true, "cùng nội dung thì neo phải khớp và cho ký");
  assert.equal(s.lan.length, 1);
  assert.deepEqual(
    [...s.lan[0]!.bytes],
    [...sapKy.message.serialize()],
    "signer phải nhận bytes của giao dịch SẮP KÝ",
  );

  /*
   * Và chốt lại bằng mã nguồn: bytes phải lấy từ `sapKy`, không từ `tx`.
   *
   * Phép so bytes ở trên không đủ một mình — khi hai bên trùng nội dung, nó xanh cả
   * hai chiều. Đọc mã là thứ phân biệt được, và nó nói rõ ý định.
   */
  const ma = doc("vi-du-tich-hop/src/ky.js");
  assert.match(
    ma,
    /signer\(sapKy, sapKy\.message\.serialize\(\)\)/,
    "signer phải nhận bytes của `sapKy` — lấy từ `tx` là lấy nhầm giao dịch",
  );
});

test("HỎI mà người dùng ĐỒNG Ý ⇒ ký được, và vẫn qua neo", () => {
  const s = stub();
  const t = tx(1000);
  const r = kySauKhiKiem({
    quyetDinh: { cho: "hoi", lyDo: "phat_hien" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: s.ky,
    nguoiDungDongY: true,
  });
  assert.equal(r.daKy, true);
  assert.equal(s.lan.length, 1);
});

test("kết quả kiểm QUÁ CŨ ⇒ không ký, dù mọi thứ khác khớp", () => {
  /*
   * Neo khớp nhưng kết quả hết hạn là câu hỏi khác: message giống hệt mà trạng thái
   * account có thể đã đổi. Ký trên một phán quyết hết hạn là ký mà không biết.
   */
  const s = stub();
  const r = kySauKhiKiem({
    quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: tx(1000), neo: neoKetQua(tx(1000).message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: s.ky,
    msToiDa: -1, // mọi kết quả đều đã quá hạn
  });
  assert.equal(r.daKy, false);
  assert.equal(r.lyDo, "ket_qua_qua_cu");
  assert.equal(s.lan.length, 0);
});

/* ── 4 · Ranh giới: policy là của CONSUMER, không phải của SDK ─────────────── */

test("hợp đồng ký nằm ở file RIÊNG, không thổi số dòng tích hợp", () => {
  /*
   * `dongMaTichHop` đếm đúng `tich-hop.js` (`thu-tich-hop.mjs` dòng 315) và được công
   * bố ở sáu chỗ. Nhét hợp đồng ký vào đó sẽ thổi con số lên trong khi công sức tích
   * hợp Custos không tăng — đúng kiểu số tự khen mà repo này đã chặn nhiều lần.
   */
  const demDongMa = (s: string) => {
    let trongKhoi = false;
    return s.split("\n").filter((dong) => {
      const t = dong.trim();
      if (trongKhoi) {
        if (t.includes("*/")) trongKhoi = false;
        return false;
      }
      if (t.startsWith("/*")) {
        trongKhoi = !t.includes("*/");
        return false;
      }
      return t !== "" && !t.startsWith("//") && !t.startsWith("*");
    }).length;
  };
  assert.equal(
    demDongMa(doc("vi-du-tich-hop/src/tich-hop.js")),
    30,
    "số dòng tích hợp đã đổi — sáu chỗ công bố sẽ lệch",
  );
  assert.ok(
    doc("vi-du-tich-hop/src/ky.js").length > 0,
    "hợp đồng ký phải ở file riêng `ky.js`",
  );
});

test("SDK không cấm ký — policy do consumer áp", () => {
  /*
   * Thẻ: *"Ghi rõ policy do consumer áp, SDK chỉ trả thông tin."* `inspect()` trả
   * `level`; quyết định chặn hay hỏi nằm trong `vi-du-tich-hop`, không nằm trong
   * `packages/core`.
   */
  const core = doc("packages/core/src/inspect.ts");
  for (const cam of ["bi_chan", "signer", "cho_nguoi_dung"]) {
    assert.ok(!core.includes(cam), `inspect.ts chứa \`${cam}\` — SDK đang áp policy của ví`);
  }
  assert.match(doc("vi-du-tich-hop/src/ky.js"), /việc của CONSUMER|policy do consumer áp/i);
});

test("consumer KHÔNG gọi mạng hay ký thật khi chạy test", () => {
  /*
   * Nghiệm thu: *"không gọi API trả phí hoặc gửi thật khi chạy test"*. `ky.js` chỉ
   * băm bytes và gọi lại hàm do ví truyền vào.
   */
  const ma = doc("vi-du-tich-hop/src/ky.js")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const cam of ["fetch(", "Connection", "sendTransaction", "sendRawTransaction"]) {
    assert.ok(!ma.includes(cam), `ky.js chứa \`${cam}\` — hợp đồng ký không được tự gửi gì`);
  }
});
