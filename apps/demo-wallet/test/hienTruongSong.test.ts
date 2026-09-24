import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Connection, VersionedTransaction } from "@solana/web3.js";
import {
  chonLuongTanCong,
  docNguonSong,
  dungTxTanCongSong,
  preflightDemo,
  kiemSanSangTanCong,
  chuoiBanGiao,
  HienTruongChuaSan,
} from "../../../scripts/hienTruongSong.ts";
import { MEMO_PROGRAM } from "../../../scripts/tan-cong.ts";

/**
 * HIỆN TRƯỜNG SỐNG — hồi quy cho P0 rà soát 25/09.
 *
 * Lỗi đã tái hiện: trang tấn công dựng Transfer 500 000 000 (số trong
 * `hien-truong.json`) từ tài khoản chỉ còn 490 000 000. Mô phỏng Devnet trả
 * `insufficient funds`, ví hiện "Chưa đọc hiểu hết · 0/3" cho vụ tấn công chủ lực.
 *
 * Các test dưới đây dùng ĐÚNG cặp số đó. Test nào chỉ kiểm "hàm trả về cái vừa gán"
 * thì không bắt được lỗi này; nên mỗi test so với số dư sống, hoặc chạy đúng đường
 * dữ liệu hai app đi qua.
 */

const HT = {
  mint: "43JGWQPDygFB8FgQ1ifoLoCeKH75d6vMTAS88SBK4tjd",
  nanNhan: "2EjYM7ShF9n1e5ErWpmnw5xzMTEUF9CC4peDctKbCpAF",
  taiKhoanNanNhan: "6GKSKEwGZ6VN32FMhkCmmffAEjhD9GPjqzNspYiBLLEa",
  keTanCong: "HaVREgPPBxHHJfUWV7yVPqU8epvoT1f5QGSNP9bAEXTT",
  taiKhoanKeTanCong: "8j1UQYEpqk8xnG4dtBqXLpCEGqmVwPTcPBLbXVBqXvCU",
};
const SO_CAU_HINH = 500_000_000n;
const SO_DU_SONG = 490_000_000n;
const BH = "11111111111111111111111111111111";

/** Connection giả, chỉ đủ các lời gọi module này dùng. */
function connGia(o: {
  owner?: string;
  mint?: string;
  amount?: string;
  khongCo?: boolean;
  loiMang?: boolean;
  mophong?: { err: unknown; logs?: string[] };
}): Connection {
  return {
    getParsedAccountInfo: async () => {
      if (o.loiMang) throw new Error("fetch failed");
      if (o.khongCo) return { value: null };
      return {
        value: {
          data: {
            parsed: {
              info: {
                owner: o.owner ?? HT.nanNhan,
                mint: o.mint ?? HT.mint,
                tokenAmount: { amount: o.amount ?? String(SO_DU_SONG) },
              },
            },
          },
        },
      };
    },
    simulateTransaction: async () => ({ value: o.mophong ?? { err: null, logs: [] } }),
  } as unknown as Connection;
}

/** Tách lệnh theo chương trình và tag: Memo, Transfer (3), SetAuthority (6). */
function lenh(tx: VersionedTransaction) {
  const keys = tx.message.staticAccountKeys.map((k) => k.toBase58());
  return tx.message.compiledInstructions.map((ix) => ({
    program: keys[ix.programIdIndex]!,
    data: Buffer.from(ix.data),
  }));
}

test("chonLuongTanCong: lượng dương và KHÔNG vượt số dư sống", () => {
  const l = chonLuongTanCong(SO_DU_SONG);
  assert.ok(l > 0n && l <= SO_DU_SONG, `lượng ${l} ngoài (0, ${SO_DU_SONG}]`);
  // Biên: số dư giảm tới một nửa giữa hai lần đọc vẫn không làm lượng đã chọn vượt.
  assert.ok(l <= SO_DU_SONG / 2n, "không còn biên cho số dư trôi giữa hai lần làm mới");
});

test("chonLuongTanCong: số dư cạn ⇒ HienTruongChuaSan, không trả 0", () => {
  for (const soDu of [0n, 1n]) {
    assert.throws(() => chonLuongTanCong(soDu), (e: Error) => e instanceof HienTruongChuaSan);
  }
});

/**
 * Giao dịch tấn công dựng từ số dư SỐNG phải có ĐỦ hai hậu quả mà giao diện tuyên
 * bố — Transfer và SetAuthority(AccountOwner) — và Transfer ≤ số dư sống.
 *
 * docs/CUSTOS.md quyết định 7: hiện số dư giảm thì giao dịch phải thật sự có Transfer.
 */
test("dungTxTanCongSong: Memo + Transfer ≤ số dư sống + SetAuthority AccountOwner", () => {
  const ds = lenh(dungTxTanCongSong(HT, BH, SO_DU_SONG));
  assert.equal(ds[0]!.program, MEMO_PROGRAM.toBase58(), "lệnh đầu phải là memo mồi");

  const transfer = ds.find((l) => l.data[0] === 3 && l.data.length === 9);
  assert.ok(transfer, "không có lệnh Transfer — bảng chênh lệch sẽ không được hiện số dư giảm");
  const luong = transfer.data.readBigUInt64LE(1);
  assert.ok(luong <= SO_DU_SONG, `Transfer ${luong} > số dư sống ${SO_DU_SONG} — đúng lỗi P0`);
  assert.ok(luong < SO_CAU_HINH, "lượng vẫn bằng số cấu hình");

  const setAuth = ds.find((l) => l.data[0] === 6);
  assert.ok(setAuth, "không có lệnh SetAuthority");
  assert.equal(setAuth.data[1], 2, "SetAuthority không phải loại AccountOwner (2)");
});

test("docNguonSong: đọc số dư từ chuỗi", async () => {
  const { soDu } = await docNguonSong(connGia({}), HT);
  assert.equal(soDu, SO_DU_SONG);
});

test("docNguonSong: ba kiểu hiện trường hỏng ⇒ HienTruongChuaSan kèm lý do riêng", async () => {
  const ca: Array<[Parameters<typeof connGia>[0], RegExp]> = [
    [{ khongCo: true }, /không còn trên Devnet/],
    [{ owner: HT.keTanCong }, /đã đổi chủ/],
    [{ mint: HT.keTanCong }, /không thuộc mint/],
  ];
  for (const [o, lyDo] of ca) {
    await assert.rejects(docNguonSong(connGia(o), HT), (e: Error) =>
      e instanceof HienTruongChuaSan && lyDo.test(e.lyDo),
    );
  }
});

/**
 * LỖI MẠNG KHÔNG ĐƯỢC NGỤY TRANG THÀNH HIỆN TRƯỜNG HỎNG.
 *
 * Hai thứ cần hai phản ứng khác nhau của người trình bày: "Devnet chậm, thử lại"
 * và "hiện trường đã dùng, phải dựng lại". Gộp thì thử lại mãi một hiện trường hỏng,
 * hoặc dựng lại vô ích một hiện trường lành chỉ vì Wi-Fi hội trường chập chờn.
 */
test("docNguonSong: lỗi mạng giữ nguyên là lỗi mạng", async () => {
  await assert.rejects(docNguonSong(connGia({ loiMang: true }), HT), (e: Error) =>
    !(e instanceof HienTruongChuaSan) && /fetch failed/.test(e.message),
  );
});

test("preflightDemo: `insufficient funds` ⇒ câu lý do riêng; mô phỏng đạt ⇒ null", async () => {
  const tx = dungTxTanCongSong(HT, BH, SO_DU_SONG);
  assert.equal(await preflightDemo(connGia({}), tx), null);
  const loi = await preflightDemo(
    connGia({ mophong: { err: { InstructionError: [1, { Custom: 1 }] }, logs: ["Program log: Error: insufficient funds"] } }),
    tx,
  );
  assert.match(loi ?? "", /số dư/);
});

test("kiemSanSangTanCong: hiện trường lành ⇒ san kèm số dư sống", async () => {
  assert.deepEqual(await kiemSanSangTanCong(connGia({}), HT, BH), { loai: "san", soDu: SO_DU_SONG });
});

test("kiemSanSangTanCong: đổi chủ / mô phỏng hỏng ⇒ chuaSan, KHÔNG bàn giao", async () => {
  const doiChu = await kiemSanSangTanCong(connGia({ owner: HT.keTanCong }), HT, BH);
  assert.equal(doiChu.loai, "chuaSan");
  const moPhongHong = await kiemSanSangTanCong(
    connGia({ mophong: { err: "AccountNotFound" } }),
    HT,
    BH,
  );
  assert.equal(moPhongHong.loai, "chuaSan");
});

test("kiemSanSangTanCong: lỗi mạng ⇒ NÉM (để trang dùng đường nguội), không thành chuaSan", async () => {
  await assert.rejects(kiemSanSangTanCong(connGia({ loiMang: true }), HT, BH));
});

/**
 * HỢP ĐỒNG BÀN GIAO HAI APP — mã hoá của trang tấn công, giải mã của ví.
 *
 * Chạy ĐÚNG hai hàm thật: `chuoiBanGiao` (trang tấn công dùng) và
 * `docYeuCauNgoaiChiTiet` (ví dùng). Ví nhận đúng từng byte trang tấn công dựng,
 * và giao dịch đó mang Transfer ≤ số dư sống cùng SetAuthority.
 *
 * Bài này KHÔNG thay bài live Devnet: nó không mô phỏng. Nó chứng minh rằng thứ
 * được mô phỏng ở phía ví chính là thứ trang tấn công đã preflight.
 */
test("bàn giao trang tấn công → ví: byte, lời khai và hai hậu quả đi nguyên vẹn", async () => {
  const tx = dungTxTanCongSong(HT, BH, SO_DU_SONG);
  const hash = chuoiBanGiao(tx, { type: "airdrop" }, { [HT.mint]: "USDC-demo" });

  const g = globalThis as { window?: unknown };
  const cu = g.window;
  g.window = { location: { hash: `#${hash}` } };
  try {
    const { docYeuCauNgoaiChiTiet } = await import("../src/yeuCauNgoai.ts");
    const kq = docYeuCauNgoaiChiTiet();
    assert.equal(kq.loai, "co", kq.loai === "hong" ? kq.lyDo : "ví không nhận yêu cầu");
    if (kq.loai !== "co") return;

    assert.ok(
      Buffer.from(kq.yc.tx.serialize()).equals(Buffer.from(tx.serialize())),
      "ví nhận giao dịch KHÁC với giao dịch trang tấn công dựng",
    );
    assert.equal(kq.yc.khai?.type, "airdrop", "lời khai gian bị mất trên đường");

    const ds = lenh(kq.yc.tx);
    const transfer = ds.find((l) => l.data[0] === 3 && l.data.length === 9)!;
    assert.ok(transfer.data.readBigUInt64LE(1) <= SO_DU_SONG, "ví nhận Transfer vượt số dư sống");
    assert.ok(ds.some((l) => l.data[0] === 6 && l.data[1] === 2), "ví nhận giao dịch thiếu SetAuthority");
  } finally {
    g.window = cu;
  }
});

/**
 * GUARD NGUỒN: ba luồng dựng ca tấn công phải đi qua hàm chung.
 *
 * Bản vá trước chỉ tới được một trong ba nơi; hai nơi còn lại vẫn đọc `ht.soLuong`
 * cho tới lúc có người bấm trước giám khảo. Guard này đỏ nếu bất kỳ nơi nào quay lại
 * tự dựng hoặc đọc số cấu hình.
 *
 * Bỏ chú thích trước khi tìm — bài học đã sập bốn lần trong repo (BAN-GIAO-CHO-CODEX.md):
 * chú thích ở đây CỐ Ý nhắc tới `ht.soLuong` để giải thích lỗi.
 */
test("ba luồng dựng ca tấn công đều dùng dungTxTanCongSong, không đọc ht.soLuong", () => {
  const boChuThich = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const f of [
    "apps/trang-tan-cong/src/App.tsx",
    "apps/demo-wallet/src/PhongVan.tsx",
    "apps/demo-wallet/src/kichBan.ts",
  ]) {
    const ma = boChuThich(readFileSync(f, "utf8"));
    assert.ok(ma.includes("dungTxTanCongSong"), `${f} không dùng hàm dựng chung`);
    assert.ok(!/dungGiaoDichTanCong\s*\(/.test(ma), `${f} tự gọi dungGiaoDichTanCong`);
    assert.ok(!/\bht!?\.soLuong\b/.test(ma), `${f} còn đọc ht.soLuong`);
  }
});
