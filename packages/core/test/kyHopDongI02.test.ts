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

test("neo lúc kiểm phải bắt được tx bị sửa tại chỗ trước khi ký", async () => {
  const t = tx(1000);
  const neo = neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster);
  t.message.recentBlockhash = LA.publicKey.toBase58();
  const s = stub();
  const r = await kySauKhiKiem({ quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: t, neo, ...chung, signer: s.ky });
  assert.equal(r.daKy, false);
  assert.equal(r.lyDo, "giao_dich_da_doi");
  assert.equal(s.lan.length, 0);
});

test("tuổi kết quả tính từ lúc kiểm, không phải lúc bấm ký", async () => {
  const t = tx(1000);
  const neo = neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster,
    new Date(Date.now() - 60_000).toISOString());
  const s = stub();
  const r = await kySauKhiKiem({ quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: t, neo, ...chung, signer: s.ky, msToiDa: 30_000 });
  assert.equal(r.daKy, false);
  assert.equal(r.lyDo, "ket_qua_qua_cu");
  assert.equal(s.lan.length, 0);
});

/* ── 1 · Signer KHÔNG được gọi ở mọi nhánh từ chối ─────────────────────────── */

test("CHẶN vì phát hiện ⇒ signer không được gọi lần nào", async () => {
  const s = stub();
  const t = tx(1000);
  const r = await kySauKhiKiem({
    quyetDinh: { cho: "chan", lyDo: "phat_hien" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: s.ky,
  });
  assert.equal(r.daKy, false);
  assert.equal(r.lyDo, "bi_chan");
  assert.equal(s.lan.length, 0, "signer bị gọi ở nhánh CHẶN — policy của ví không giữ được");
});

test("CHẶN vì không kiểm được ⇒ cũng không ký, và lý do KHÁC", async () => {
  /*
   * Hai loại chặn phải phân biệt được ở tầng này nữa: ví hiện "nguy hiểm" cho một
   * lượt Devnet chậm thì người dùng học được rằng Custos hay báo bừa.
   */
  const s = stub();
  const r = await kySauKhiKiem({
    quyetDinh: { cho: "chan", lyDo: "khong_kiem_duoc" },
    tx: tx(1000), neo: neoKetQua(tx(1000).message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: s.ky,
  });
  assert.equal(r.daKy, false);
  assert.equal(s.lan.length, 0);
  assert.equal(r.chiTiet, "khong_kiem_duoc", "mất lý do thì ví không hiện đúng câu cho người dùng");
});

test("HỎI mà người dùng CHƯA đồng ý ⇒ không ký — mặc định là fail-safe", async () => {
  /*
   * `nguoiDungDongY` mặc định `false` có chủ ý: quên truyền cờ thì KHÔNG ký. Mặc
   * định ngược lại sẽ biến một lỗi bỏ sót thành một chữ ký.
   */
  const s = stub();
  const r = await kySauKhiKiem({
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

test("dApp tráo giao dịch sau khi kiểm ⇒ KHÔNG ký, dù quyết định là cho phép", async () => {
  /*
   * Ca nguy hiểm nhất của thẻ, và là lý do TB-C06 tồn tại: người dùng đọc thẻ cảnh
   * báo của giao dịch A rồi bấm Ký, trong khi thứ sắp ký là giao dịch B.
   *
   * `khopNeo` băm chính `message.serialize()` — byte thật sẽ được ký.
   */
  const s = stub();
  const daKiem = tx(1000);
  const sapKy = tx(999_999_999); // dApp đổi số tiền
  const r = await kySauKhiKiem({
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

test("cho phép ký + neo khớp ⇒ signer được gọi ĐÚNG MỘT LẦN, với đúng bytes", async () => {
  /*
   * Nghiệm thu: *"nhận đúng bytes đã kiểm ở ca được phép"*. So bytes chứ không so
   * tham chiếu object — một bản sao có cùng nội dung vẫn đúng, một tx khác thì không.
   */
  const s = stub();
  const t = tx(1000);
  const r = await kySauKhiKiem({
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

test("signer nhận bytes của tx SẮP KÝ, không phải của tx đã kiểm", async () => {
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

  const r = await kySauKhiKiem({
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
  /*
   * ADR-0003 nới MẪU theo hướng chặt hơn, không nới điều kiện.
   *
   * Bản trước neo vào `signer(sapKy, sapKy.message.serialize())`. Nay bytes được
   * serialize MỘT LẦN vào `byteDaKiem` rồi dùng lại cho cả `khopNeo` và `signer` —
   * mạnh hơn bản cũ, vì bản cũ serialize hai lần và hai lần đó về lý thuyết có thể
   * ra khác nhau nếu `tx` bị đổi ở giữa.
   *
   * Nên đòi đúng ba điều, thay cho một chuỗi:
   *   1. `byteDaKiem` lấy từ `sapKy`, KHÔNG từ `tx`
   *   2. `khopNeo` dùng chính biến đó
   *   3. `signer` cũng nhận chính biến đó
   */
  const ma = doc("vi-du-tich-hop/src/ky.js");
  assert.match(
    ma,
    /const byteDaKiem = sapKy\.message\.serialize\(\);/,
    "bytes phải lấy từ `sapKy` — lấy từ `tx` là lấy nhầm giao dịch",
  );
  assert.match(
    ma,
    /khopNeo\(neo, byteDaKiem,/,
    "khopNeo phải dùng chính bytes sẽ đưa cho signer",
  );
  assert.match(
    ma,
    /signer\(sapKy, byteDaKiem\)/,
    "signer phải nhận chính bytes đã khớp neo, không serialize lại lần hai",
  );
});

test("HỎI mà người dùng ĐỒNG Ý ⇒ ký được, và vẫn qua neo", async () => {
  const s = stub();
  const t = tx(1000);
  const r = await kySauKhiKiem({
    quyetDinh: { cho: "hoi", lyDo: "phat_hien" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: s.ky,
    nguoiDungDongY: true,
  });
  assert.equal(r.daKy, true);
  assert.equal(s.lan.length, 1);
});

test("kết quả kiểm QUÁ CŨ ⇒ không ký, dù mọi thứ khác khớp", async () => {
  /*
   * Neo khớp nhưng kết quả hết hạn là câu hỏi khác: message giống hệt mà trạng thái
   * account có thể đã đổi. Ký trên một phán quyết hết hạn là ký mà không biết.
   */
  const s = stub();
  const r = await kySauKhiKiem({
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
    // 30 → 31 ngày 26/09: thêm nhánh `aiAdvisory` (phản biện F-03). Đó là phần BẮT BUỘC
    // của một tích hợp đúng, không phải hợp đồng ký — giấu nó để giữ số 30 mới là thổi số.
    31,
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

/* ── ADR-0003 · signer bất đồng bộ và phiên dùng một lần ───────────────────────
 *
 * Bốn lỗ hổng dưới đây ĐÃ TÁI HIỆN trên bản đồng bộ trước khi sửa. Mỗi bài dựng
 * lại đúng ca đã ghi trong ADR, và mỗi bài phải ĐỎ khi khôi phục mã cũ.
 *
 * Đối chứng dương ở cuối là bài quan trọng nhất: bốn bài trên cũng xanh hết nếu
 * hàm bị làm hỏng thành "luôn từ chối".
 */

test("ADR-0003 · signer REJECT ⇒ tu_choi, KHÔNG phải đã ký", async () => {
  /*
   * Bản cũ gọi `signer(...)` rồi `return { daKy: true }` ở dòng ngay sau. Ví nói
   * KHÔNG mà hàm khai đã ký — và với người dùng, đó là giao dịch họ vừa từ chối
   * được báo là đã thực hiện.
   */
  const t = tx(1000);
  const r = await kySauKhiKiem({
    quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: () => Promise.reject(new Error("người dùng từ chối")),
  });
  assert.equal(r.daKy, false, "ví từ chối mà hàm khai đã ký");
  assert.equal(r.ketCuc, "tu_choi");
  assert.match(r.chiTiet ?? "", /từ chối/);
});

test("ADR-0003 · signer TREO ⇒ chua_ro, và KHÔNG được đọc thành đã huỷ", async () => {
  /*
   * Hết hạn chờ không chứng minh ví đã huỷ ký — mục 4.3. Ví có thể đã ký rồi mà
   * phản hồi chưa về; gọi đó là "chưa ký" rồi ký lại là tạo hai chữ ký cho cùng
   * một ý định.
   */
  const t = tx(1000);
  const r = await kySauKhiKiem({
    quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: () => new Promise(() => {}),
    msChoSigner: 200,
  });
  assert.equal(r.daKy, false);
  assert.equal(r.ketCuc, "chua_ro", "timeout KHÔNG được thành tu_choi");
  assert.match(r.chiTiet ?? "", /KHÔNG kết luận ví đã huỷ/);
});

test("ADR-0003 · double-click ⇒ signer chạy ĐÚNG MỘT LẦN", async () => {
  /*
   * Khoá phải đặt ĐỒNG BỘ trước await. Đặt sau await thì hai lời gọi liên tiếp đều
   * đi qua phép kiểm trước khi khoá kịp bật — đã tái hiện: signer chạy 2 lần.
   */
  const t = tx(1000);
  let dem = 0;
  const co = {
    quyetDinh: { cho: "ky" as const, lyDo: "khong_van_de" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: () => { dem++; return Promise.resolve(); },
  };
  const [a, b] = await Promise.all([kySauKhiKiem(co), kySauKhiKiem(co)]);
  assert.equal(dem, 1, "cùng một phiên mà signer chạy hai lần");
  const ketCuc = [a.ketCuc, b.ketCuc].sort();
  assert.deepEqual(ketCuc, ["da_ky", "khong_ky"], "đúng một lượt ký, một lượt bị chặn");
  const biChan = a.ketCuc === "khong_ky" ? a : b;
  assert.equal(biChan.lyDo, "phien_da_dung");
});

test("ADR-0003 · phiên đã tiêu KHÔNG tự mở lại", async () => {
  // Không dòng nào trong `ky.js` gọi `daTieu.delete` — kiểm bằng cả hành vi lẫn mã.
  const t = tx(1000);
  const co = {
    quyetDinh: { cho: "ky" as const, lyDo: "khong_van_de" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: () => Promise.resolve(),
  };
  assert.equal((await kySauKhiKiem(co)).daKy, true);
  const lai = await kySauKhiKiem(co);
  assert.equal(lai.daKy, false, "phiên đã tiêu vẫn ký lại được");
  assert.equal(lai.lyDo, "phien_da_dung");
  /*
   * BỎ CHÚ THÍCH TRƯỚC KHI TÌM.
   *
   * Bản đầu của dòng này đỏ ngay — vì chuỗi `daTieu.delete` nằm trong chính CHÚ
   * THÍCH giải thích rằng không chỗ nào gọi nó. Guard đọc mã mà không tách chú
   * thích thì bắt nhầm đúng câu văn mô tả điều nó muốn bảo vệ.
   *
   * Lỗi này đã xảy ra nhiều lần trong repo (`ciBaTang.test.ts` khớp `npm run check`
   * trong một dòng `#`). Tách chú thích là cách sửa duy nhất đúng.
   */
  const maSach = doc("vi-du-tich-hop/src/ky.js")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!maSach.includes("daTieu.delete"), "có đường mở lại phiên đã tiêu");
  assert.ok(maSach.includes("daTieu.add(neo)"), "phiên phải được đánh dấu đã tiêu");
});

test("ADR-0003 · reject MUỘN không tạo unhandled rejection", async () => {
  /*
   * `Promise.race` không huỷ được nhánh thua: promise của signer vẫn sống sau khi
   * hết hạn. Bản cũ để nó reject mà không ai bắt — tiến trình SẬP. Đó là một thư
   * viện bảo mật làm sập ví khi người dùng bấm "Từ chối".
   */
  const bat: unknown[] = [];
  const nghe = (e: unknown) => bat.push(e);
  process.on("unhandledRejection", nghe);
  try {
    const t = tx(1000);
    const r = await kySauKhiKiem({
      quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
      tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
      ...chung,
      signer: () => new Promise((_r, rej) => setTimeout(() => rej(new Error("muộn")), 150)),
      msChoSigner: 50,
    });
    assert.equal(r.ketCuc, "chua_ro");
    // Chờ qua thời điểm reject muộn, rồi nhường một vòng cho handler chạy.
    await new Promise((r2) => setTimeout(r2, 250));
    assert.deepEqual(bat, [], "reject muộn thành unhandled rejection");

    /*
     * BÀI NÀY CANH TÍNH CHẤT, KHÔNG CANH CÁCH LÀM — và đó là chủ ý sau một lần sai.
     *
     * Bản đầu của `choSigner` có `p.catch(() => {})` kèm chú thích nói rằng không có
     * nó thì tiến trình sập. Đột biến bác bỏ: xoá dòng đó thì KHÔNG bài nào đỏ, và
     * đo trực tiếp cũng không thấy unhandled rejection nào. `Promise.race` đăng ký
     * handler lên cả hai nhánh, và người gọi `await` trong `try/catch` tự nó đã là
     * handler. Dòng ấy thừa, và đã bỏ.
     *
     * Lỗi D của bản đồng bộ cũ là thật — nhưng nguyên nhân là gọi `signer()` mà
     * không await gì cả, không phải thiếu `.catch`. Chuyển sang `async` đã đóng nó.
     *
     * Nên bài này KHÔNG neo vào `.catch`. Nó hỏi thứ người dùng quan tâm: một
     * signer reject muộn có làm sập tiến trình không. Cách hàm đạt được điều đó là
     * việc của hàm.
     */
  } finally {
    process.off("unhandledRejection", nghe);
  }
});

test("ADR-0003 · msChoSigner không hữu hạn ⇒ chờ thật, và reject vẫn không làm sập", async () => {
  /*
   * Nhánh `msChoSigner` không hữu hạn: chờ không giới hạn, không qua `Promise.race`.
   * Ngữ nghĩa phải đúng: `Infinity` nghĩa là chờ mãi, nên signer reject ở nhánh này
   * phải ra `tu_choi`, không phải `chua_ro` — và cũng không được làm sập tiến trình.
   *
   * Và ngữ nghĩa phải đúng: `Infinity` nghĩa là "chờ không giới hạn", nên signer
   * reject phải ra `tu_choi` chứ không phải `chua_ro`.
   */
  const bat: unknown[] = [];
  const nghe = (e: unknown) => bat.push(e);
  process.on("unhandledRejection", nghe);
  try {
    const t = tx(1000);
    const r = await kySauKhiKiem({
      quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
      tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
      ...chung,
      signer: () => Promise.reject(new Error("ví từ chối")),
      msChoSigner: Number.POSITIVE_INFINITY,
    });
    assert.equal(r.ketCuc, "tu_choi", "chờ vô hạn mà signer reject vẫn là từ chối");
    await new Promise((r2) => setTimeout(r2, 100));
    assert.deepEqual(bat, [], "nhánh không-race để lọt unhandled rejection");
  } finally {
    process.off("unhandledRejection", nghe);
  }
});

test("ADR-0003 · signer trả tx KHÁC ⇒ chua_ro, không chuyển tiếp để gửi", async () => {
  // Mục 4.3: đối chiếu message sau signer; khác snapshot thì không gửi, và cũng
  // không gọi là đã ký — ta không biết ví đã ký cái gì.
  const t = tx(1000);
  const r = await kySauKhiKiem({
    quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: () => Promise.resolve(tx(999)), // số lamports khác ⇒ bytes khác
  });
  assert.equal(r.daKy, false);
  assert.equal(r.ketCuc, "chua_ro");
  assert.equal(r.lyDo, "signer_tra_ve_tx_khac");
});

test("ADR-0003 · ĐỐI CHỨNG — signer bình thường vẫn ký được", async () => {
  /*
   * BÀI QUAN TRỌNG NHẤT CỦA NHÓM NÀY.
   *
   * Sáu bài trên cũng xanh hết nếu hàm bị làm hỏng thành "luôn từ chối" — một bản
   * sửa quá tay sẽ đi qua toàn bộ chúng mà không ai thấy. Bài này là thứ duy nhất
   * phân biệt "sửa đúng" với "chặn tất".
   */
  const t = tx(1000);
  const s = stub();
  const r = await kySauKhiKiem({
    quyetDinh: { cho: "ky", lyDo: "khong_van_de" },
    tx: t, neo: neoKetQua(t.message.serialize(), chung.viNguoiDung, chung.cluster),
    ...chung,
    signer: (tx2, bytes) => { s.ky(tx2, bytes); return Promise.resolve(); },
  });
  assert.equal(r.daKy, true, "signer bình thường mà không ký được — sửa quá tay");
  assert.equal(r.ketCuc, "da_ky");
  assert.equal(s.lan.length, 1);
});
