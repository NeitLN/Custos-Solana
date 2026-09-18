#!/usr/bin/env node
import { Connection, VersionedTransaction, PublicKey } from "@solana/web3.js";
import { inspect } from "./inspect.ts";
import { dungReceipt, receiptRaJson, type CheDoReceipt } from "./receipt.ts";
import { ketNoiCoHuy, laHuy } from "./huy.ts";

/**
 * CU-10 — CLI TỐI THIỂU, dùng được ngoài monorepo.
 *
 * ```
 *   custos-soi --tx <base64|-> [--vi <địa chỉ>] [--rpc <url>] [--json]
 * ```
 *
 * ## Exit code phân loại ENGINE, không phải quyền ký
 *
 * Thẻ nói rất rõ và đây là phần dễ làm sai nhất: *"Chốt exit code theo phân loại
 * engine (`safe/warning/danger`) và lỗi input/hạ tầng, **chưa diễn giải chúng thành
 * quyền ký**"*.
 *
 * Nên `exit 0` KHÔNG có nghĩa "ký được". Nó có nghĩa *"engine không tìm thấy vấn đề
 * trong phạm vi đã kiểm"* — đúng nghĩa của `safe`, không hơn. Một script CI đọc
 * `exit 0` rồi tự động ký là hiểu sai, và `--help` nói thẳng điều đó.
 *
 * ```
 *   0  safe      engine không tìm thấy vấn đề trong phạm vi đã kiểm
 *   1  warning   cần xem kỹ
 *   2  danger    có dấu hiệu nguy hiểm
 *   3  lỗi INPUT       — sai ở phía người gọi
 *   4  lỗi HẠ TẦNG     — RPC/mạng; KHÔNG phải kết luận về giao dịch
 * ```
 *
 * Tách 3 và 4 vì chúng nói hai câu khác nhau: sửa lệnh, hay thử lại sau. Gộp chúng
 * là bắt người dùng đoán.
 *
 * ## Ba điều CLI này KHÔNG làm
 *
 * - **Không nhận khoá riêng.** Không cờ nào nhận nó, và không đường nào cần.
 * - **Không gửi giao dịch.** Không có `--send`, và `sendTransaction` không xuất hiện
 *   trong file — có guard đọc mã.
 * - **Không tự fetch metadata khi chỉ parse.** `--json` vẫn phải gọi RPC vì mô phỏng
 *   cần nó; nhưng đầu vào sai thì thoát trước khi chạm mạng.
 */

const MA = {
  safe: 0,
  warning: 1,
  danger: 2,
  loiInput: 3,
  loiHaTang: 4,
} as const;

/** Giới hạn: một transaction Solana hợp lệ không vượt 1232 byte. */
const GIOI_HAN_BYTE = 1232;
const GIOI_HAN_KY_TU = 4096;
const RPC_MAC_DINH = "https://api.devnet.solana.com";

const HUONG_DAN = `custos-soi — kiểm một giao dịch Solana CHƯA KÝ trước khi ký.

  custos-soi --tx <base64>       kiểm chuỗi base64
  custos-soi --tx -              đọc base64 từ stdin
  custos-soi --tx <b64> --json   in JSON thay vì chữ tiếng Việt
  custos-soi --tx <b64> --receipt chiaSe   in biên lai JSON (rieng|chiaSe)

Tuỳ chọn:
  --vi <địa chỉ>   ví cần bảo vệ. Bỏ trống ⇒ Custos lui về người TRẢ PHÍ,
                   mà trong giao dịch được tài trợ phí đó không phải bạn.
  --rpc <url>      mặc định ${RPC_MAC_DINH}
  --han <ms>       hạn cho cả lượt, mặc định 20000

Mã thoát — phân loại của ENGINE, KHÔNG phải quyền ký:
  0  safe     engine không tìm thấy vấn đề TRONG PHẠM VI đã kiểm
  1  warning  cần xem kỹ
  2  danger   có dấu hiệu nguy hiểm
  3  lỗi đầu vào    — sai ở phía bạn, sửa lệnh
  4  lỗi hạ tầng    — RPC/mạng, thử lại; KHÔNG phải kết luận về giao dịch

  \`exit 0\` KHÔNG có nghĩa "ký được". Một script tự động ký khi thấy 0 là hiểu sai.

CLI này không nhận khoá riêng, không ký và không gửi gì.
Mô phỏng gửi nội dung giao dịch tới RPC đã chọn.`;

type Doi = { tx?: string; vi?: string; rpc?: string; han?: string; json?: boolean; help?: boolean; receipt?: string };

export function docDoi(argv: string[]): Doi {
  const d: Doi = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") d.json = true;
    else if (a === "--help" || a === "-h") d.help = true;
    else if (a === "--tx") d.tx = argv[++i];
    else if (a === "--vi") d.vi = argv[++i];
    else if (a === "--rpc") d.rpc = argv[++i];
    else if (a === "--han") d.han = argv[++i];
    else if (a === "--receipt") d.receipt = argv[++i];
  }
  return d;
}

async function docStdin(): Promise<string> {
  const phan: Buffer[] = [];
  for await (const c of process.stdin) phan.push(Buffer.from(c));
  return Buffer.concat(phan).toString("utf8");
}

/**
 * Giải base64 → transaction, hoặc trả lý do.
 *
 * Tách khỏi `main` để test gọi được mà không chạm `process.exit`.
 */
export function giaiTx(tho: string): { ok: true; tx: VersionedTransaction; soByte: number } | { ok: false; câu: string } {
  const s = tho.trim();
  if (s === "") return { ok: false, câu: "thiếu giao dịch: dùng --tx <base64> hoặc --tx -" };
  if (s.length > GIOI_HAN_KY_TU) {
    return { ok: false, câu: `chuỗi dài ${s.length} ký tự, vượt giới hạn ${GIOI_HAN_KY_TU}` };
  }
  /*
   * KIỂM HÌNH DẠNG TRƯỚC KHI GIẢI — `Buffer.from` không bao giờ ném.
   *
   * Nó âm thầm BỎ ký tự lạ. Nên `"rác!!!"` cho ra vài byte rác, đi tiếp tới
   * `deserialize`, rồi báo *"đây không phải giao dịch Solana đọc được"* — người
   * dùng gõ nhầm sẽ đi tìm sai chỗ.
   *
   * Đã đo: `giaiTx("rác!!!")` trả đúng câu sai đó trước khi có phép kiểm này.
   */
  const sach = s.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(sach)) {
    return { ok: false, câu: "không phải base64 — có ký tự lạ trong chuỗi" };
  }
  const byte = Buffer.from(sach, "base64");
  if (byte.length === 0) return { ok: false, câu: "không phải base64 — chuỗi rỗng sau khi giải mã" };
  if (byte.length > GIOI_HAN_BYTE) {
    return { ok: false, câu: `giao dịch ${byte.length} byte, vượt giới hạn ${GIOI_HAN_BYTE} của Solana` };
  }
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(byte);
  } catch {
    return { ok: false, câu: "giải mã được base64 nhưng đây không phải giao dịch Solana đọc được" };
  }

  /*
   * GIẢI MÃ ĐƯỢC KHÔNG CÓ NGHĨA LÀ MỘT GIAO DỊCH THẬT — cùng lỗi với `soiTx.ts`.
   *
   * ĐÃ TÁI HIỆN: `--tx $(node -e "process.stdout.write('A'.repeat(100))")` cho
   * `exit=127` kèm assertion failure của libuv — tiến trình SẬP, không thoát sạch.
   * Trước khi sập nó còn in `"Cần xem kỹ — đọc hiểu 0/0 lệnh"`, tức là trình bày
   * một buffer toàn số 0 như một giao dịch.
   *
   * 75 byte 0 giải ra thành transaction có 0 chữ ký, 0 account, 0 lệnh.
   */
  if (
    tx.message.header.numRequiredSignatures === 0 ||
    tx.message.staticAccountKeys.length === 0
  ) {
    return {
      ok: false,
      câu:
        "không phải giao dịch thật: không có người ký nào và không chạm tài khoản nào " +
        "(base64 hợp lệ vẫn giải ra được dữ liệu rỗng)",
    };
  }

  return { ok: true, tx, soByte: byte.length };
}

export async function chay(argv: string[]): Promise<number> {
  const d = docDoi(argv);
  if (d.help || argv.length === 0) {
    process.stdout.write(HUONG_DAN + "\n");
    return MA.safe;
  }

  const tho = d.tx === "-" ? await docStdin() : (d.tx ?? "");
  const g = giaiTx(tho);
  if (!g.ok) {
    // STDERR cho chẩn đoán, STDOUT chỉ chứa kết quả — thẻ đòi đúng vậy, để
    // `custos-soi ... | jq` không vỡ vì một dòng lỗi lẫn vào.
    process.stderr.write(`lỗi đầu vào: ${g.câu}\n`);
    return MA.loiInput;
  }

  if (d.vi) {
    try {
      new PublicKey(d.vi);
    } catch {
      process.stderr.write("lỗi đầu vào: --vi không phải địa chỉ base58 hợp lệ\n");
      return MA.loiInput;
    }
  }

  const han = Number(d.han ?? 20_000);
  if (!Number.isFinite(han) || han <= 0) {
    process.stderr.write("lỗi đầu vào: --han phải là số dương\n");
    return MA.loiInput;
  }

  const k = ketNoiCoHuy();
  const dongHo = setTimeout(() => k.huy(), han);
  try {
    const conn = new Connection(d.rpc ?? RPC_MAC_DINH, { commitment: "confirmed", fetch: k.fetch });
    const r = await inspect({ connection: conn }, g.tx, {
      locale: "vi",
      chanDoan: Boolean(d.json),
      ...(d.vi ? { nguoiDung: d.vi } : {}),
    });

    if (d.receipt !== undefined) {
      /*
       * BIÊN LAI (CU-11).
       *
       * CLI chỉ xuất được chế độ `chiaSe`, và đó là ràng buộc THẬT chứ không phải
       * chưa làm: `inspect()` không trả `Facts` ra ngoài — hợp đồng `InspectResult`
       * đã đóng băng và không được nới chỉ để tiện cho CLI. Không có `Facts` thì
       * không có gì để replay.
       *
       * Nói thẳng thay vì im lặng xuất một biên lai `rieng` rỗng ruột trông như
       * đầy đủ.
       */
      if (d.receipt !== "chiaSe") {
        process.stderr.write(
          d.receipt === "rieng"
            ? "lỗi đầu vào: CLI chưa xuất được biên lai chế độ `rieng` — inspect() không trả Facts ra ngoài, nên không có dữ liệu để replay. Dùng --receipt chiaSe\n"
            : "lỗi đầu vào: --receipt chỉ nhận `chiaSe`\n",
        );
        return MA.loiInput;
      }
      const bl = dungReceipt(r, "chiaSe" as CheDoReceipt);
      process.stdout.write(receiptRaJson(bl) + "\n");
      return MA[r.level];
    }

    if (d.json) {
      /*
       * BA TRƯỜNG TÁCH RIÊNG — thẻ đòi đích danh.
       *
       * `engineLevel` là phán quyết của L2. `inspectionStatus` nói lượt kiểm có
       * hoàn tất không. `policyDecision` là `null` cho tới khi CU-18 bật policy —
       * để `null` chứ không bịa một giá trị, vì một consumer đọc `"allow"` sẽ hiểu
       * là đã có ai đó cho phép.
       */
      process.stdout.write(
        JSON.stringify(
          {
            engineLevel: r.level,
            inspectionStatus: "hoan_tat",
            policyDecision: null,
            reasonCodes: r.reasonCodes,
            coverage: r.coverage,
            diff: r.diff,
            ...(r.chanDoan ? { chanDoan: r.chanDoan } : {}),
            soByte: g.soByte,
          },
          null,
          2,
        ) + "\n",
      );
    } else {
      const nhan = { safe: "Bình thường", warning: "Cần xem kỹ", danger: "Nguy hiểm" }[r.level];
      process.stdout.write(`${nhan} — đọc hiểu ${r.coverage.analyzed}/${r.coverage.total} lệnh\n`);
      for (const m of r.reasonCodes) process.stdout.write(`  ${m}\n`);
      for (const x of r.diff) process.stdout.write(`  ${x.label}: ${x.before} → ${x.after}\n`);
    }
    return MA[r.level];
  } catch (e) {
    if (laHuy(e)) {
      process.stderr.write(`lỗi hạ tầng: quá hạn ${han} ms — KHÔNG phải kết luận về giao dịch\n`);
      return MA.loiHaTang;
    }
    process.stderr.write(
      `lỗi hạ tầng: ${e instanceof Error ? e.message : String(e)} — KHÔNG phải kết luận về giao dịch\n`,
    );
    return MA.loiHaTang;
  } finally {
    clearTimeout(dongHo);
  }
}

// Chỉ chạy khi được gọi như một chương trình, không khi bị import trong test.
if (process.argv[1] && /cli\.(ts|js)$/.test(process.argv[1])) {
  chay(process.argv.slice(2)).then(
    (ma) => process.exit(ma),
    (e) => {
      process.stderr.write(`lỗi hạ tầng: ${e instanceof Error ? e.message : String(e)}\n`);
      process.exit(MA.loiHaTang);
    },
  );
}
