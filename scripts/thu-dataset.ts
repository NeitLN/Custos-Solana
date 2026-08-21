/**
 * Thu thập seed evaluation dataset.
 *
 *   node --experimental-strip-types scripts/thu-dataset.ts
 *
 * Hai nguồn, và ranh giới giữa chúng là điều quan trọng nhất của file này:
 *
 *   real-mainnet     — giao dịch thật, lấy ngẫu nhiên. ĐÂY là nguồn duy nhất
 *                      được tính vào tỉ lệ báo nhầm.
 *   synthetic-devnet — đội tự dựng để kích hoạt từng luật. Hợp lệ để kiểm thử
 *                      luật, KHÔNG được tính vào tỉ lệ báo nhầm.
 *
 * Xem SEED-DATASET.md mục 0.
 */
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionMessage,
  VersionedTransaction, sendAndConfirmTransaction, type TransactionInstruction,
  TransactionInstruction as TransactionInstructionCtor,
} from "@solana/web3.js";

const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
import {
  ACCOUNT_SIZE, AuthorityType, ExtensionType, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID,
  createApproveInstruction, createInitializeAccountInstruction,
  createInitializeMintInstruction, createInitializePermanentDelegateInstruction,
  createMint, createSetAuthorityInstruction, createTransferInstruction,
  getMinimumBalanceForRentExemptAccount, getMintLen, mintTo,
} from "@solana/spl-token";
import { mkdirSync, writeFileSync } from "node:fs";
import { extractFacts } from "../packages/core/src/l1/fetch.ts";
import { dongBangFacts } from "../packages/core/src/facts-io.ts";
import { napVi, RPC } from "./vi-devnet.ts";

const MAINNET = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAM_MAINNET = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const THU_MUC = "data/seed";
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gửi giao dịch có thử lại.
 *
 * RPC devnet công khai hay trả "Blockhash not found" khi bị gọi liên tục —
 * script này gửi hàng chục giao dịch nên gặp là chuyện thường. Thử lại với
 * blockhash mới thay vì để cả mẻ thu thập chết giữa chừng.
 */
/** Thử lại một thao tác bất kỳ. Dùng cho các helper của spl-token — chúng tự
 *  gửi giao dịch nên không đi qua `guiCoThuLai` được. */
async function thuLai<T>(ten: string, viec: () => Promise<T>, lan = 5): Promise<T> {
  let loiCuoi: unknown;
  for (let i = 0; i < lan; i++) {
    try {
      return await viec();
    } catch (e) {
      loiCuoi = e;
      console.log(`    (${ten} lỗi lần ${i + 1}, thử lại…)`);
      await nghi(2000 * (i + 1));
    }
  }
  throw loiCuoi;
}

async function guiCoThuLai(
  conn: Connection,
  tx: Transaction,
  nguoiKy: Keypair[],
  lan = 4,
): Promise<string> {
  let loiCuoi: unknown;
  for (let i = 0; i < lan; i++) {
    try {
      tx.recentBlockhash = undefined;
      tx.signatures = [];
      return await sendAndConfirmTransaction(conn, tx, nguoiKy, { commitment: "confirmed" });
    } catch (e) {
      loiCuoi = e;
      await nghi(1500 * (i + 1));
    }
  }
  throw loiCuoi;
}

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

const mau: Mau[] = [];

function luu(m: Omit<Mau, "ganNhanLuc">, facts: unknown, tx?: VersionedTransaction) {
  mkdirSync(`${THU_MUC}/facts`, { recursive: true });
  writeFileSync(`${THU_MUC}/facts/${m.id}.json`, dongBangFacts(facts as never));
  if (tx) {
    mkdirSync(`${THU_MUC}/tx`, { recursive: true });
    writeFileSync(`${THU_MUC}/tx/${m.id}.base64`, Buffer.from(tx.serialize()).toString("base64"));
  }
  mau.push({ ...m, ganNhanLuc: new Date().toISOString() });
  console.log(`  + ${m.id.padEnd(12)} ${m.nguonGoc.padEnd(17)} ${m.kyVong.level}`);
}

// ───────────────────────── mẫu ÂM TÍNH từ mainnet ─────────────────────────
async function thuMainnet(soLuong: number) {
  console.log(`\n[1] ${soLuong} giao dịch mainnet ngẫu nhiên — mẫu âm tính`);
  const conn = new Connection(MAINNET, "confirmed");
  const sigs = await conn.getSignaturesForAddress(TOKEN_PROGRAM_MAINNET, { limit: soLuong * 3 });
  let n = 0;
  for (const s of sigs.filter((x) => x.err === null)) {
    if (n >= soLuong) break;
    try {
      const tx = await conn.getTransaction(s.signature, {
        maxSupportedTransactionVersion: 0, commitment: "confirmed",
      });
      if (!tx) continue;
      const lai = new VersionedTransaction(tx.transaction.message);
      const f = await extractFacts(conn, lai);
      n++;
      luu(
        {
          id: `MN-${String(n).padStart(2, "0")}`,
          luat: null,
          cuc: "am",
          nguonGoc: "real-mainnet",
          nguon: `https://explorer.solana.com/tx/${s.signature}`,
          facts: `facts/MN-${String(n).padStart(2, "0")}.json`,
          giaoDich: `tx/MN-${String(n).padStart(2, "0")}.base64`,
          kyVong: {
            level: "khong-phai-danger",
            khongCoMa: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER", "SPL_APPROVE_DELEGATE_LON", "SYSTEM_ASSIGN_DOI_OWNER"],
          },
          bangChung:
            "Giao dịch SPL Token mainnet lấy ngẫu nhiên, không chọn lọc. KHÔNG khẳng định " +
            "nó lành tính — chỉ khẳng định nếu Custos gắn Đỏ thì phải soi tay để biết đó là " +
            "tấn công thật hay báo nhầm.",
        },
        f,
        lai,
      );
    } catch {
      /* bỏ mẫu không lấy được */
    }
    await nghi(600);
  }
}

// ───────────────────────── mẫu DƯƠNG TÍNH trên devnet ─────────────────────
async function thuDevnet() {
  console.log("\n[2] mẫu dương tính tự dựng trên devnet");
  const conn = new Connection(RPC, "confirmed");
  const toi = napVi();
  const la = Keypair.generate().publicKey;

  const mint = await thuLai("createMint", () => createMint(conn, toi, toi.publicKey, null, 6));
  // mint2 vẫn để mintAuthority là ví mình — createMint không nhận null ở tham số này.
  const mint2 = await thuLai("createMint", () => createMint(conn, toi, toi.publicKey, null, 6));

  async function taoTk(chu: PublicKey, mintDung = mint) {
    const kp = Keypair.generate();
    const lam = await getMinimumBalanceForRentExemptAccount(conn);
    await guiCoThuLai(
      conn,
      new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: toi.publicKey, newAccountPubkey: kp.publicKey,
          space: ACCOUNT_SIZE, lamports: lam, programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeAccountInstruction(kp.publicKey, mintDung, chu, TOKEN_PROGRAM_ID),
      ),
      [toi, kp],
    );
    return kp.publicKey;
  }

  const dung = async (
    id: string,
    luat: number,
    lenh: TransactionInstruction[],
    kyVong: Mau["kyVong"],
    bangChung: string,
  ) => {
    const { blockhash } = await conn.getLatestBlockhash();
    const tx = new VersionedTransaction(
      new TransactionMessage({ payerKey: toi.publicKey, recentBlockhash: blockhash, instructions: lenh }).compileToV0Message(),
    );
    const f = await extractFacts(conn, tx);
    luu(
      {
        id, luat, cuc: "duong", nguonGoc: "synthetic-devnet",
        nguon: "tự dựng trên devnet",
        facts: `facts/${id}.json`, giaoDich: `tx/${id}.base64`,
        kyVong, bangChung,
      },
      f,
      tx,
    );
  };

  const tkToi = await taoTk(toi.publicKey);
  await thuLai("mintTo", () => mintTo(conn, toi, mint, tkToi, toi, 500_000_000n));
  const tkLa = await taoTk(la);

  await dung(
    "R01-pos", 1,
    [createSetAuthorityInstruction(tkToi, toi.publicKey, AuthorityType.AccountOwner, la, [], TOKEN_PROGRAM_ID)],
    { level: "danger", coMa: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"] },
    "SetAuthority đổi AccountOwner của tài khoản token người ký sang ví lạ.",
  );

  await dung(
    "R02-pos", 2,
    [createSetAuthorityInstruction(tkToi, toi.publicKey, AuthorityType.CloseAccount, la, [], TOKEN_PROGRAM_ID)],
    { level: "danger", coMa: ["SPL_SET_AUTHORITY__CLOSE_OR_FREEZE"] },
    "Trao quyền đóng tài khoản token cho bên thứ ba.",
  );

  await dung(
    "R03-pos", 3,
    [createApproveInstruction(tkToi, la, toi.publicKey, 18446744073709551615n, [], TOKEN_PROGRAM_ID)],
    { level: "danger", coMa: ["SPL_APPROVE_DELEGATE_LON"] },
    "Approve delegate với hạn mức u64::MAX, vượt xa số dư đang có.",
  );

  await dung(
    "R03-neg", 3,
    [createApproveInstruction(tkToi, la, toi.publicKey, 100_000_000n, [], TOKEN_PROGRAM_ID)],
    { level: "khong-phai-danger", khongCoMa: ["SPL_APPROVE_DELEGATE_LON"] },
    "Approve ĐÚNG trong phạm vi số dư — hành vi chuẩn của nhiều dApp, không được gắn cờ.",
  );

  await dung(
    "R08-pos", 8,
    [createTransferInstruction(tkToi, tkLa, toi.publicKey, 400_000_000n, [], TOKEN_PROGRAM_ID)],
    { level: "warning" },
    "Chuyển 80% số dư sang ví vừa được tạo. Luật 8 chỉ kích hoạt khi tra được tuổi ví.",
  );

  const tkToi2 = await taoTk(toi.publicKey, mint2);
  await thuLai("mintTo", () => mintTo(conn, toi, mint2, tkToi2, toi, 300_000_000n));
  const tkLa2 = await taoTk(la, mint2);

  await dung(
    "R11-pos", 11,
    [
      createTransferInstruction(tkToi, tkLa, toi.publicKey, 500_000_000n, [], TOKEN_PROGRAM_ID),
      createTransferInstruction(tkToi2, tkLa2, toi.publicKey, 300_000_000n, [], TOKEN_PROGRAM_ID),
    ],
    { level: "warning", coMa: ["OUTFLOW_KHONG_KHOP"] },
    "HAI loại tài sản cùng rời ví trong một giao dịch — không hành động bình thường nào cần vậy.",
  );

  // ── Luật 12 · SystemProgram.assign ─────────────────────────────
  // Vector đã từng qua mặt mô phỏng của Blowfish (NGHIEN-CUU-21-08.md mục 2).
  // Tạo một account thường rồi giao nó cho chương trình khác điều khiển.
  const nanNhanAcc = Keypair.generate();
  await guiCoThuLai(
    conn,
    new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: toi.publicKey, newAccountPubkey: nanNhanAcc.publicKey,
        space: 0, lamports: await conn.getMinimumBalanceForRentExemption(0),
        programId: SystemProgram.programId,
      }),
    ),
    [toi, nanNhanAcc],
  );

  await dung(
    "R12-pos", 12,
    [SystemProgram.assign({ accountPubkey: nanNhanAcc.publicKey, programId: TOKEN_PROGRAM_ID })],
    { level: "danger", coMa: ["SYSTEM_ASSIGN_DOI_OWNER"] },
    "SystemProgram.assign giao account của người ký cho chương trình khác điều khiển. " +
      "Đây là vector mà mô phỏng của Blowfish từng bỏ lọt; Custos bắt được vì so sánh TRẠNG THÁI.",
  );

  // ── Luật 9 · chương trình chưa xác minh chạm tài sản người ký ──
  await dung(
    "R09-pos", 9,
    [
      new TransactionInstructionCtor({
        keys: [{ pubkey: tkToi, isSigner: false, isWritable: true }],
        programId: MEMO,
        data: Buffer.from("cham vao tai khoan cua ban", "utf8"),
      }),
    ],
    { level: "warning", coMa: ["PROGRAM_CHUA_XAC_MINH"] },
    "Chương trình chưa xác minh (SPL Memo) GHI vào tài khoản token của người ký.",
  );

  await dung(
    "R09-neg", 9,
    [
      new TransactionInstructionCtor({
        keys: [{ pubkey: tkLa, isSigner: false, isWritable: true }],
        programId: MEMO,
        data: Buffer.from("khong cham gi cua ban", "utf8"),
      }),
    ],
    { level: "khong-phai-danger", khongCoMa: ["PROGRAM_CHUA_XAC_MINH"] },
    "Cùng chương trình chưa xác minh, nhưng KHÔNG ghi vào tài khoản nào của người ký. " +
      "Mô hình tài khoản Solana bảo đảm nó không hại được người ký trong giao dịch này.",
  );

  // ── Luật 6 · mint authority chưa thu hồi ───────────────────────
  await dung(
    "R06-pos", 6,
    [createTransferInstruction(tkToi, tkLa, toi.publicKey, 1_000_000n, [], TOKEN_PROGRAM_ID)],
    { level: "warning", coMa: ["MINT_AUTHORITY_CHUA_THU_HOI"] },
    "Token trong giao dịch vẫn còn mint authority — người phát hành tạo thêm được không giới hạn.",
  );

  // Mint đã thu hồi quyền phát hành: cùng hình dạng giao dịch, không được gắn cờ.
  const mintSach = await thuLai("createMint", () => createMint(conn, toi, toi.publicKey, null, 6));
  const tkSach = await taoTk(toi.publicKey, mintSach);
  await thuLai("mintTo", () => mintTo(conn, toi, mintSach, tkSach, toi, 100_000_000n));
  const tkSachLa = await taoTk(la, mintSach);
  await guiCoThuLai(
    conn,
    new Transaction().add(
      createSetAuthorityInstruction(mintSach, toi.publicKey, AuthorityType.MintTokens, null, [], TOKEN_PROGRAM_ID),
    ),
    [toi],
  );

  await dung(
    "R06-neg", 6,
    [createTransferInstruction(tkSach, tkSachLa, toi.publicKey, 1_000_000n, [], TOKEN_PROGRAM_ID)],
    { level: "khong-phai-danger", khongCoMa: ["MINT_AUTHORITY_CHUA_THU_HOI"] },
    "Cùng hình dạng giao dịch, nhưng mint authority ĐÃ thu hồi — không được gắn cờ.",
  );

  // ── Luật 4 · Token-2022 Permanent Delegate ─────────────────────
  // Permanent delegate là NĂNG LỰC HỢP LỆ. Mẫu này kiểm chứng nó chỉ ra Vàng
  // khi delegate không ra tay — gắn Đỏ cho sự tồn tại của một tính năng giao
  // thức là cách nhanh nhất tạo báo nhầm.
  const mintPD = Keypair.generate();
  const doDaiMint = getMintLen([ExtensionType.PermanentDelegate]);
  await guiCoThuLai(
    conn,
    new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: toi.publicKey, newAccountPubkey: mintPD.publicKey,
        space: doDaiMint, lamports: await conn.getMinimumBalanceForRentExemption(doDaiMint),
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializePermanentDelegateInstruction(mintPD.publicKey, la, TOKEN_2022_PROGRAM_ID),
      createInitializeMintInstruction(mintPD.publicKey, 6, toi.publicKey, null, TOKEN_2022_PROGRAM_ID),
    ),
    [toi, mintPD],
  );

  async function taoTk2022(chu: PublicKey) {
    const kp = Keypair.generate();
    const lam = await conn.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);
    await guiCoThuLai(
      conn,
      new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: toi.publicKey, newAccountPubkey: kp.publicKey,
          space: ACCOUNT_SIZE, lamports: lam, programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeAccountInstruction(kp.publicKey, mintPD.publicKey, chu, TOKEN_2022_PROGRAM_ID),
      ),
      [toi, kp],
    );
    return kp.publicKey;
  }

  const tkPD = await taoTk2022(toi.publicKey);
  await thuLai("mintTo", () => mintTo(conn, toi, mintPD.publicKey, tkPD, toi, 50_000_000n, [], undefined, TOKEN_2022_PROGRAM_ID));
  const tkPDLa = await taoTk2022(la);

  await dung(
    "R04-pos", 4,
    [createTransferInstruction(tkPD, tkPDLa, toi.publicKey, 1_000_000n, [], TOKEN_2022_PROGRAM_ID)],
    { level: "warning", coMa: ["TOKEN2022_PERMANENT_DELEGATE"] },
    "Token-2022 có quyền rút vĩnh viễn, nhưng chính người ký chuyển tiền — delegate KHÔNG ra tay. " +
      "Chỉ được ra Vàng: sự tồn tại của một tính năng giao thức không phải là tội.",
  );

  await dung(
    "R11-neg", 11,
    [createTransferInstruction(tkToi, tkLa, toi.publicKey, 10_000_000n, [], TOKEN_PROGRAM_ID)],
    { level: "khong-phai-danger", khongCoMa: ["OUTFLOW_KHONG_KHOP"] },
    "Gửi MỘT loại tài sản cho ai đó — hành vi thường gặp nhất của một cái ví.",
  );
}

async function main() {
  await thuDevnet();
  await thuMainnet(10);

  mkdirSync(THU_MUC, { recursive: true });
  writeFileSync(
    `${THU_MUC}/index.json`,
    JSON.stringify({ thuLuc: new Date().toISOString(), soMau: mau.length, mau }, null, 2),
  );

  const theoNguon = mau.reduce<Record<string, number>>((a, m) => {
    a[m.nguonGoc] = (a[m.nguonGoc] ?? 0) + 1;
    return a;
  }, {});
  console.log("\n=== TỔNG ===");
  console.log("  tổng mẫu :", mau.length);
  for (const [k, v] of Object.entries(theoNguon)) console.log(`  ${k.padEnd(18)}: ${v}`);
  console.log("\n→", `${THU_MUC}/index.json`);
}

main().catch((e) => {
  console.error("LỖI:", e instanceof Error ? e.message : e);
  process.exit(1);
});
