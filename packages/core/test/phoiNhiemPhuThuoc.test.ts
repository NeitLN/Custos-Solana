import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PublicKey } from "@solana/web3.js";
import { AccountLayout, ACCOUNT_SIZE, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { parseTokenAccount } from "../src/l1/parse.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * ĐIỀU KIỆN CHẤP NHẬN RỦI RO PHẢI CHẠY ĐƯỢC, KHÔNG CHỈ VIẾT RA.
 *
 * `docs/PHU-THUOC.md` chấp nhận 11 advisory **có điều kiện**, và mỗi điều kiện là một
 * câu tiếng Việt: *"nếu Custos bắt đầu gọi `toBigIntLE()` trên buffer độ dài thay
 * đổi…"*, *"nếu deck bắt đầu nhúng ảnh do người ngoài cung cấp…"*.
 *
 * Một điều kiện chỉ nằm trong tài liệu là một điều kiện sẽ không ai kiểm. Người viết
 * decoder mới sáu tuần nữa không đọc lại `PHU-THUOC.md` trước khi viết — họ đọc test
 * đỏ. Nên ba điều kiện quan trọng nhất nằm ở đây.
 *
 * Đây là phần *"giảm phơi nhiễm CÓ KIỂM CHỨNG"* của S01. Không phải bản vá: thượng
 * nguồn chưa có bản vá nào (đo 08/09/2026 — kể cả `image-size@2.0.2` mới nhất vẫn
 * nằm trong dải bị ảnh hưởng). Đây là chốt canh cái lập luận đang thay cho bản vá.
 */

const KHOA = new PublicKey("So11111111111111111111111111111111111111112");

function taiKhoanHopLe(): Buffer {
  const b = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint: KHOA, owner: KHOA, amount: 500n,
      delegateOption: 0, delegate: PublicKey.default,
      state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n,
      closeAuthorityOption: 0, closeAuthority: PublicKey.default,
    },
    b,
  );
  return b;
}

const hoSo = (data: Buffer, owner: PublicKey) =>
  ({ data, owner, executable: false, lamports: 1, rentEpoch: 0 }) as never;

/*
 * 3.1 · `bigint-buffer` — high, CÓ trong bundle trình duyệt.
 *
 * `toBigIntLE()` tràn bộ đệm khi nhận buffer DÀI HƠN dự kiến, và dữ liệu tài khoản
 * token đến từ RPC — bất kỳ ai cũng mở được một token account, nên đầu vào này do kẻ
 * tấn công tạo được. Lập luận chấp nhận rủi ro dựa vào một tính chất duy nhất: đường
 * đọc của Custos không bao giờ đưa buffer dài bất thường xuống tới đó.
 *
 * Bài này ĐO tính chất ấy thay vì tin nó.
 */
test("PHỤ THUỘC 3.1 · tài khoản token dị dạng bị từ chối TRƯỚC khi tới `toBigIntLE`", () => {
  // Đối chứng dương trước. Thiếu nó thì "từ chối tất cả" cũng làm bài kiểm xanh, và
  // lúc đó bài kiểm không còn nói gì về đường đọc thật.
  const tot = parseTokenAccount(KHOA.toBase58(), hoSo(taiKhoanHopLe(), TOKEN_PROGRAM_ID));
  assert.equal(tot?.amount, 500n, "tài khoản 165 byte hợp lệ PHẢI đọc được");

  const duoi = Buffer.alloc(4000, 0xff);
  const xau: Array<[string, Buffer, PublicKey]> = [
    ["5000 byte rác · Token program", Buffer.alloc(5000, 0xff), TOKEN_PROGRAM_ID],
    ["5000 byte rác · Token-2022", Buffer.alloc(5000, 0xff), TOKEN_2022_PROGRAM_ID],
    ["165 hợp lệ + 4000 byte đuôi · Token program", Buffer.concat([taiKhoanHopLe(), duoi]), TOKEN_PROGRAM_ID],
    ["165 hợp lệ + 4000 byte đuôi · Token-2022", Buffer.concat([taiKhoanHopLe(), duoi]), TOKEN_2022_PROGRAM_ID],
    ["8 byte cụt", Buffer.alloc(8, 0xff), TOKEN_PROGRAM_ID],
    ["rỗng", Buffer.alloc(0), TOKEN_PROGRAM_ID],
  ];

  const lot: string[] = [];
  for (const [ten, data, prog] of xau) {
    let ra: unknown;
    try {
      ra = parseTokenAccount(KHOA.toBase58(), hoSo(data, prog));
    } catch (e) {
      // Ném lỗi cũng KHÔNG đạt: `parseTokenAccount` hứa không làm sập cả lượt kiểm.
      lot.push(`${ten} — ném lỗi: ${(e as Error).message.slice(0, 60)}`);
      continue;
    }
    if (ra !== null) lot.push(`${ten} — trả về ${JSON.stringify(ra)}`);
  }

  assert.deepEqual(
    lot,
    [],
    "Mỗi ca ở đây là một buffer độ dài bất thường đi lọt xuống lớp giải mã. " +
      "Nếu bài này đỏ, đọc `docs/PHU-THUOC.md` mục 3.1 TRƯỚC khi sửa: quyết định " +
      "chấp nhận rủi ro `bigint-buffer` dựa vào đúng tính chất vừa gãy.",
  );
});

/*
 * MẶT CÒN LẠI CỦA 3.1 — và là mặt mà bài trên KHÔNG canh được.
 *
 * Điều kiện xem lại viết trong tài liệu là: *"nếu Custos bắt đầu gọi `toBigIntLE()`
 * trên buffer độ dài thay đổi — ví dụ khi thêm decoder cho chương trình DEX có layout
 * động"*. Đó là một ĐƯỜNG MÃ MỚI, ở một file chưa tồn tại. Bài kiểm
 * `parseTokenAccount` ở trên không thể thấy nó, vì nó sẽ không đi qua
 * `parseTokenAccount`.
 *
 * Thứ canh được là cửa vào: hôm nay không file nguồn nào chạm thẳng
 * `bigint-buffer` hay `@solana/buffer-layout-utils` — mọi lần đọc `u64` đều đi qua
 * `unpackAccount`/`unpackMint` của `@solana/spl-token`, vốn kiểm độ dài trước.
 *
 * Người viết decoder DEX sẽ phải import một trong hai thứ đó. Lúc ấy bài này đỏ, và
 * họ đọc `PHU-THUOC.md` mục 3.1 TRƯỚC khi merge — chứ không phải sáu tuần sau.
 */
test("PHỤ THUỘC 3.1 · không nguồn nào chạm thẳng `bigint-buffer`", () => {
  const pham: string[] = [];
  for (const goi of ["types", "core", "ai"]) {
    for (const f of readdirSync(join(GOC, "packages", goi, "src"), {
      recursive: true,
      encoding: "utf8",
    })) {
      if (!f.endsWith(".ts")) continue;
      const p = `packages/${goi}/src/${f.split("\\").join("/")}`;
      for (const [i, d] of doc(p).split("\n").entries()) {
        if (/["']bigint-buffer["']|["']@solana\/buffer-layout-utils["']|\btoBigIntLE\s*\(/.test(d)) {
          pham.push(`${p}:${i + 1} — ${d.trim().slice(0, 80)}`);
        }
      }
    }
  }
  assert.deepEqual(
    pham,
    [],
    "Có nguồn vừa dùng thẳng lớp đọc số nguyên lớn thay vì đi qua `unpackAccount`. " +
      "Đó đúng là ca mà `docs/PHU-THUOC.md` mục 3.1 hẹn xem lại: advisory " +
      "`bigint-buffer` (high) được chấp nhận VÌ mọi buffer tới nó đều dài cố định. " +
      "Layout động phá vỡ giả định đó — đánh giá lại trước khi vào nhánh chính.",
  );
});

/*
 * 3.3 · `image-size` qua `pptxgenjs` — high, chỉ chạy trên máy đội.
 *
 * Hai lỗi đều là vòng lặp vô hạn trong parser ảnh (ICNS, JXL, HEIF). Muốn chạm tới
 * thì phải có một FILE ẢNH đi vào bước dựng deck. Deck hiện không nhúng ảnh nào:
 * đầu vào là `so-lieu.json` do chính repo sinh.
 *
 * Ngày nào đó ai đó sẽ muốn thêm ảnh chụp màn hình từ một pilot vào slide. Đó là lúc
 * mục 3.3 phải được đọc lại — và bài này là thứ bắt họ đọc.
 */
test("PHỤ THUỘC 3.3 · bước dựng deck không nhận file ảnh nào", () => {
  const src = doc("scripts/tao-deck.cjs");
  const goi = [...src.matchAll(/\.add(Image|Media)\s*\(/g)].map((m) => m[0]);
  assert.deepEqual(
    goi,
    [],
    "`tao-deck.cjs` vừa gọi API nhúng ảnh/media. Đọc `docs/PHU-THUOC.md` mục 3.3: " +
      "hai advisory high của `image-size` được chấp nhận VỚI ĐIỀU KIỆN deck không " +
      "nhận ảnh từ bên ngoài. Ảnh do repo tự sinh thì vẫn phải ghi lại quyết định.",
  );
});

/*
 * Vì sao 3.3 chỉ ảnh hưởng máy đội, không ảnh hưởng người cài SDK.
 *
 * `pptxgenjs` là devDependency của REPO GỐC. Kéo nó vào `dependencies` của một gói
 * phát hành là biến hai advisory high thành vấn đề của mọi người tích hợp — một dòng
 * trong `package.json`, không ai để ý, và `npm audit` của HỌ đỏ lên vì lỗi của ta.
 */
test("PHỤ THUỘC 3.3 · không gói phát hành nào kéo theo `pptxgenjs`", () => {
  const pham: string[] = [];
  for (const ten of ["types", "core", "ai"]) {
    const p = `packages/${ten}/package.json`;
    const j = JSON.parse(doc(p)) as Record<string, Record<string, string> | undefined>;
    for (const truong of ["dependencies", "peerDependencies", "optionalDependencies"]) {
      for (const goi of Object.keys(j[truong] ?? {})) {
        if (goi === "pptxgenjs" || goi === "image-size") pham.push(`${p} · ${truong} · ${goi}`);
      }
    }
  }
  assert.deepEqual(pham, [], "công cụ sinh slide không được thành phụ thuộc của SDK");
});
