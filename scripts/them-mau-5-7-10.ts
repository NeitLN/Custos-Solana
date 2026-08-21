/**
 * Dựng thêm mẫu kiểm thử cho luật 5, 7, 10 — CHỈ THÊM, không đụng mẫu cũ.
 *
 *   node --experimental-strip-types scripts/them-mau-5-7-10.ts
 *
 * Vì sao không dùng `thu-dataset.ts`: script đó dựng lại TOÀN BỘ bộ dữ liệu,
 * trong đó có bước bốc 10 giao dịch mainnet NGẪU NHIÊN. Chạy lại là thay luôn
 * mười mẫu âm tính đang dùng để công bố tỉ lệ báo nhầm — con số "0 verdict Đỏ
 * sai trên 20 giao dịch mainnet" sẽ không còn ứng với bộ dữ liệu nào nữa.
 * Bộ mẫu cũ do vai D gán nhãn; file này đọc index.json, thêm vào cuối, ghi lại.
 *
 * Sáu mẫu, mỗi luật một ca kích hoạt và một ca an toàn trông tương tự:
 *
 *   R05-pos  mint Token-2022 có transfer hook trỏ tới chương trình chưa xác minh
 *   R05-neg  mint Token-2022 KHÔNG cài hook — bản thân Token-2022 không phải cờ
 *   R07-pos  mint còn freeze authority (đã thu hồi mint authority để cô lập luật 7)
 *   R07-neg  mint đã thu hồi CẢ HAI quyền
 *   R10-pos  giao dịch trỏ tới bảng tra địa chỉ không tồn tại
 *   R10-neg  giao dịch dùng ALT thật, giải được — 7/10 giao dịch mainnet là loại này
 */
import {
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  sendAndConfirmTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  ACCOUNT_SIZE,
  AuthorityType,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createInitializeAccountInstruction,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  createMint,
  createSetAuthorityInstruction,
  createTransferInstruction,
  getAccountLen,
  getMinimumBalanceForRentExemptAccount,
  getMintLen,
  mintTo,
} from "@solana/spl-token";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extractFacts } from "../packages/core/src/l1/fetch.ts";
import { dongBangFacts } from "../packages/core/src/facts-io.ts";
import { napVi, RPC } from "./vi-devnet.ts";

const THU_MUC = "data/seed";
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chương trình Memo: có thật trên devnet, và KHÔNG nằm trong danh sách đã xác
 *  minh của Custos — đúng thứ luật 5 cần trỏ tới. Dùng một program id bịa thì
 *  mẫu sẽ yếu hơn: "hook trỏ tới chỗ không tồn tại" là ca dễ, còn "hook trỏ tới
 *  một chương trình có thật mà ta chưa đọc hiểu" mới là ca thường gặp. */
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

type Mau = {
  id: string;
  luat: number | null;
  cuc: "duong" | "am";
  nguonGoc: "real-mainnet" | "synthetic-devnet";
  nguon: string;
  facts: string;
  giaoDich?: string;
  kyVong: { level: string; coMa?: string[]; khongCoMa?: string[] };
  bangChung: string;
  ganNhanLuc: string;
};

async function thuLai<T>(ten: string, viec: () => Promise<T>, lan = 5): Promise<T> {
  let loiCuoi: unknown;
  for (let i = 0; i < lan; i++) {
    try {
      return await viec();
    } catch (e) {
      loiCuoi = e;
      console.log(`    (${ten} hỏng lần ${i + 1}, thử lại)`);
      await nghi(1500 * (i + 1));
    }
  }
  throw loiCuoi;
}

async function main() {
  const toi = napVi();
  const conn = new Connection(RPC, "confirmed");
  console.log("ví ký:", toi.publicKey.toBase58());

  /** Ví thứ ba — KHÔNG phải người ký. Cần cho luật 7: luật cố ý bỏ qua khi
   *  chính người ký giữ quyền đóng băng, nên mẫu phải giao quyền cho người khác
   *  mới kiểm tra đúng thứ cần kiểm tra. */
  const la = Keypair.generate().publicKey;

  const themVao: Mau[] = [];

  const luu = (
    m: Omit<Mau, "ganNhanLuc">,
    facts: unknown,
    tx: VersionedTransaction,
  ) => {
    mkdirSync(`${THU_MUC}/facts`, { recursive: true });
    mkdirSync(`${THU_MUC}/tx`, { recursive: true });
    writeFileSync(`${THU_MUC}/facts/${m.id}.json`, dongBangFacts(facts as never));
    writeFileSync(`${THU_MUC}/tx/${m.id}.base64`, Buffer.from(tx.serialize()).toString("base64"));
    themVao.push({ ...m, ganNhanLuc: new Date().toISOString() });
    console.log(`  + ${m.id.padEnd(10)} ${m.kyVong.level}`);
  };

  /** Dựng giao dịch v0, bóc Facts, lưu mẫu. */
  const dung = async (
    id: string,
    luat: number,
    lenh: TransactionInstruction[],
    kyVong: Mau["kyVong"],
    bangChung: string,
    alt: AddressLookupTableAccount[] = [],
  ) => {
    const { blockhash } = await conn.getLatestBlockhash();
    const tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: toi.publicKey,
        recentBlockhash: blockhash,
        instructions: lenh,
      }).compileToV0Message(alt),
    );
    const f = await thuLai(`bóc Facts ${id}`, () => extractFacts(conn, tx));
    await nghi(600); // giãn nhịp, tránh 429
    luu(
      {
        id,
        luat,
        cuc: "duong",
        nguonGoc: "synthetic-devnet",
        nguon: "tự dựng trên devnet",
        facts: `facts/${id}.json`,
        giaoDich: `tx/${id}.base64`,
        kyVong,
        bangChung,
      },
      f,
      tx,
    );
  };

  // ── Luật 5 · Transfer Hook ──────────────────────────────────────
  //
  // Mint Token-2022 có extension TransferHook. Giao dịch mẫu chỉ TẠO tài khoản
  // token cho mint đó, không chuyển tiền — vì Memo không cài đặt giao diện
  // transfer-hook nên một lệnh chuyển sẽ hỏng khi mô phỏng, và một mẫu mà mô
  // phỏng hỏng thì chứng minh nhầm thứ khác (fail-safe 1) chứ không chứng minh
  // luật 5. Luật 5 đọc THUỘC TÍNH của mint, không cần có lệnh chuyển.
  console.log("\n[luật 5] transfer hook");
  const taoMint2022 = async (hook: PublicKey | null) => {
    const kp = Keypair.generate();
    const loai = hook ? [ExtensionType.TransferHook] : [];
    const len = getMintLen(loai);
    const lam = await conn.getMinimumBalanceForRentExemption(len);
    const lenh: TransactionInstruction[] = [
      SystemProgram.createAccount({
        fromPubkey: toi.publicKey,
        newAccountPubkey: kp.publicKey,
        space: len,
        lamports: lam,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
    ];
    if (hook) {
      lenh.push(
        createInitializeTransferHookInstruction(kp.publicKey, toi.publicKey, hook, TOKEN_2022_PROGRAM_ID),
      );
    }
    lenh.push(
      createInitializeMintInstruction(kp.publicKey, 6, toi.publicKey, null, TOKEN_2022_PROGRAM_ID),
    );
    await thuLai("tạo mint 2022", () =>
      sendAndConfirmTransaction(conn, new Transaction().add(...lenh), [toi, kp]),
    );
    return kp.publicKey;
  };

  /** Lệnh tạo một tài khoản token cho mint Token-2022 — dùng làm nội dung mẫu. */
  const lenhTaoTk = async (mint: PublicKey, chu: PublicKey, coHook: boolean) => {
    const kp = Keypair.generate();
    // Mint có TransferHook thì TÀI KHOẢN của nó cũng cần chỗ cho extension
    // `TransferHookAccount`. Dùng 165 byte như token thường sẽ ra
    // InvalidAccountData khi mô phỏng — và một mẫu mà mô phỏng hỏng thì chứng
    // minh fail-safe 1 chứ không chứng minh luật 5.
    const space = coHook ? getAccountLen([ExtensionType.TransferHookAccount]) : ACCOUNT_SIZE;
    const lam = await conn.getMinimumBalanceForRentExemption(space);
    return {
      kp,
      lenh: [
        SystemProgram.createAccount({
          fromPubkey: toi.publicKey,
          newAccountPubkey: kp.publicKey,
          space,
          lamports: lam,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeAccountInstruction(kp.publicKey, mint, chu, TOKEN_2022_PROGRAM_ID),
      ],
    };
  };

  const mintHook = await taoMint2022(MEMO);
  const a = await lenhTaoTk(mintHook, toi.publicKey, true);
  await dung(
    "R05-pos",
    5,
    a.lenh,
    { level: "warning", coMa: ["TOKEN2022_TRANSFER_HOOK"] },
    "Mint Token-2022 có transfer hook trỏ tới chương trình Custos chưa đọc hiểu. " +
      "Chỉ được ra Vàng: transfer hook là năng lực hợp lệ của giao thức.",
  );

  const mintSach = await taoMint2022(null);
  const b = await lenhTaoTk(mintSach, toi.publicKey, false);
  await dung(
    "R05-neg",
    5,
    b.lenh,
    { level: "khong-phai-danger", khongCoMa: ["TOKEN2022_TRANSFER_HOOK"] },
    "Mint Token-2022 y hệt nhưng KHÔNG cài transfer hook. " +
      "Bản thân việc là Token-2022 không phải dấu hiệu gì cả.",
  );

  // ── Luật 7 · Freeze authority ───────────────────────────────────
  //
  // Thu hồi mint authority sau khi mint xong để CÔ LẬP luật 7. Nếu để nguyên,
  // mẫu sẽ kích hoạt cả luật 6 và không chứng minh được luật 7 tự nó chạy đúng.
  console.log("\n[luật 7] freeze authority");
  const taoTkSpl = async (mint: PublicKey, chu: PublicKey) => {
    const kp = Keypair.generate();
    const lam = await getMinimumBalanceForRentExemptAccount(conn);
    await thuLai("tạo tk spl", () =>
      sendAndConfirmTransaction(
        conn,
        new Transaction().add(
          SystemProgram.createAccount({
            fromPubkey: toi.publicKey,
            newAccountPubkey: kp.publicKey,
            space: ACCOUNT_SIZE,
            lamports: lam,
            programId: TOKEN_PROGRAM_ID,
          }),
          createInitializeAccountInstruction(kp.publicKey, mint, chu, TOKEN_PROGRAM_ID),
        ),
        [toi, kp],
      ),
    );
    return kp.publicKey;
  };

  const dungMintSpl = async (coFreeze: boolean) => {
    const mint = await thuLai("createMint", () =>
      createMint(conn, toi, toi.publicKey, coFreeze ? la : null, 6),
    );
    const tk = await taoTkSpl(mint, toi.publicKey);
    const tkLa = await taoTkSpl(mint, la);
    await thuLai("mintTo", () => mintTo(conn, toi, mint, tk, toi, 100_000_000n));
    // Thu hồi quyền tạo thêm token — để luật 6 không chen vào mẫu này.
    await thuLai("thu hồi mint authority", () =>
      sendAndConfirmTransaction(
        conn,
        new Transaction().add(
          createSetAuthorityInstruction(mint, toi.publicKey, AuthorityType.MintTokens, null, [], TOKEN_PROGRAM_ID),
        ),
        [toi],
      ),
    );
    return { mint, tk, tkLa };
  };

  const coFz = await dungMintSpl(true);
  await dung(
    "R07-pos",
    7,
    [createTransferInstruction(coFz.tk, coFz.tkLa, toi.publicKey, 1_000_000n, [], TOKEN_PROGRAM_ID)],
    { level: "warning", coMa: ["FREEZE_AUTHORITY_CON_HIEU_LUC"], khongCoMa: ["MINT_AUTHORITY_CHUA_THU_HOI"] },
    "Người phát hành vẫn đóng băng được tài khoản của người ký. Đây là THUỘC TÍNH " +
      "của token — USDC cũng có — nên chỉ Vàng và phải mang giọng thông tin.",
  );

  const khongFz = await dungMintSpl(false);
  await dung(
    "R07-neg",
    7,
    [createTransferInstruction(khongFz.tk, khongFz.tkLa, toi.publicKey, 1_000_000n, [], TOKEN_PROGRAM_ID)],
    { level: "khong-phai-danger", khongCoMa: ["FREEZE_AUTHORITY_CON_HIEU_LUC"] },
    "Giao dịch chuyển token y hệt, nhưng mint đã thu hồi cả quyền đóng băng lẫn quyền tạo thêm.",
  );

  // ── Luật 10 · Address Lookup Table ──────────────────────────────
  console.log("\n[luật 10] bảng tra địa chỉ");

  // Ca DƯƠNG: trỏ tới một bảng tra không tồn tại trên chuỗi. Đây là tình huống
  // thật khi bảng đã bị đóng, hoặc khi RPC không trả về được.
  const bangMa = new AddressLookupTableAccount({
    key: Keypair.generate().publicKey,
    state: {
      deactivationSlot: 2n ** 64n - 1n,
      lastExtendedSlot: 0,
      lastExtendedSlotStartIndex: 0,
      authority: toi.publicKey,
      addresses: [la, TOKEN_PROGRAM_ID],
    },
  });
  await dung(
    "R10-pos",
    10,
    [SystemProgram.transfer({ fromPubkey: toi.publicKey, toPubkey: la, lamports: 1000 })],
    { level: "warning", coMa: ["ALT_KHONG_GIAI_DUOC"] },
    "Giao dịch trỏ tới bảng tra địa chỉ không đọc được, nên danh sách tài khoản " +
      "có thể còn thiếu và bảng chênh lệch có thể đang bỏ sót.",
    [bangMa],
  );

  // Ca ÂM: bảng tra THẬT, giải được. 7 trên 10 giao dịch mainnet trong bộ dữ
  // liệu dùng ALT và cả 7 đều lành — dùng ALT không phải dấu hiệu gì cả.
  // RPC devnet công khai chặn tốc độ khá gắt; mọi lời gọi mạng ở đây đều phải
  // bọc thử-lại, kể cả những cái trông vô hại như getSlot.
  const slot = await thuLai("getSlot", () => conn.getSlot("finalized"));
  const [lenhTao, diaChiBang] = AddressLookupTableProgram.createLookupTable({
    authority: toi.publicKey,
    payer: toi.publicKey,
    recentSlot: slot,
  });
  await thuLai("tạo ALT", () =>
    sendAndConfirmTransaction(conn, new Transaction().add(lenhTao), [toi]),
  );
  await thuLai("nạp địa chỉ vào ALT", () =>
    sendAndConfirmTransaction(
      conn,
      new Transaction().add(
        AddressLookupTableProgram.extendLookupTable({
          payer: toi.publicKey,
          authority: toi.publicKey,
          lookupTable: diaChiBang,
          addresses: [la, khongFz.tkLa],
        }),
      ),
      [toi],
    ),
  );
  // Bảng vừa nạp chưa dùng được ngay ở slot hiện tại — phải chờ sang slot sau.
  await nghi(2000);
  const bangThat = await thuLai("đọc lại ALT", async () => {
    const r = await conn.getAddressLookupTable(diaChiBang);
    if (!r.value) throw new Error("chưa thấy bảng");
    return r.value;
  });
  await dung(
    "R10-neg",
    10,
    [SystemProgram.transfer({ fromPubkey: toi.publicKey, toPubkey: la, lamports: 1000 })],
    { level: "khong-phai-danger", khongCoMa: ["ALT_KHONG_GIAI_DUOC"] },
    "Giao dịch dùng bảng tra địa chỉ thật, giải được bình thường. ALT là kỹ thuật " +
      "hợp lệ và phổ biến — 7/10 giao dịch mainnet trong bộ dữ liệu có dùng.",
    [bangThat],
  );

  // ── ghép vào index.json, giữ nguyên mẫu cũ ──────────────────────
  const hoSo = JSON.parse(readFileSync(`${THU_MUC}/index.json`, "utf8")) as {
    thuLuc: string;
    soMau: number;
    mau: Mau[];
  };
  const idMoi = new Set(themVao.map((m) => m.id));
  const giuLai = hoSo.mau.filter((m) => !idMoi.has(m.id));
  const daBo = hoSo.mau.length - giuLai.length;
  const mau = [...giuLai, ...themVao];

  writeFileSync(
    `${THU_MUC}/index.json`,
    JSON.stringify({ thuLuc: hoSo.thuLuc, themLuc: new Date().toISOString(), soMau: mau.length, mau }, null, 2),
  );
  console.log(`\n${hoSo.mau.length} mẫu cũ${daBo ? ` (thay ${daBo})` : ""} + ${themVao.length} mẫu mới = ${mau.length}`);
}

main().catch((e) => {
  console.error("LỖI:", e instanceof Error ? e.message : e);
  process.exit(1);
});
