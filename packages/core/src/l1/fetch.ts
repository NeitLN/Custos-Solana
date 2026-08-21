import {
  type Connection,
  type VersionedTransaction,
  type AccountInfo,
  PublicKey,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import type { Facts, InstructionFact, TokenAccountFact, MintFact, AccountFact } from "../facts.ts";
import { parseTokenAccount, parseMint, isTokenProgram } from "./parse.ts";
import { decodeInstruction } from "./decode.ts";
import { computeCoverage } from "./coverage.ts";

/** getMultipleAccounts giới hạn 100 địa chỉ mỗi lượt gọi. */
const CHUNK = 100;
/** Giới hạn thận trọng cho `accounts.addresses` của simulateTransaction. */
const MAX_SIM_ACCOUNTS = 100;
/** Thời hạn cho phần tra cứu làm giàu. Hết hạn thì bỏ, không làm chậm lượt kiểm tra. */
const HAN_LAM_GIAU_MS = 2500;
/** Số ví nhận tối đa chịu tra. Nhiều hơn thì không đáng để người dùng chờ. */
const MAX_VI_TRA = 3;

/**
 * Tuổi ví tính bằng giờ, hoặc `null` nếu không tra được.
 *
 * Cách tra: lấy trang chữ ký cuối cùng mà RPC còn giữ. Nếu trả về ít hơn giới
 * hạn thì cái cuối chính là giao dịch đầu tiên của ví. Nếu đủ giới hạn thì ví
 * còn già hơn thế — mà như vậy thì chắc chắn không phải "ví mới tạo", nên trả
 * về một giá trị lớn là đủ đúng cho mục đích của luật.
 */
async function traTuoiVi(conn: Connection, dc: PublicKey): Promise<number | null> {
  try {
    const sigs = await conn.getSignaturesForAddress(dc, { limit: 1000 });
    if (sigs.length === 0) return null;
    const cuoi = sigs[sigs.length - 1];
    if (!cuoi?.blockTime) return null;
    const gio = (Date.now() / 1000 - cuoi.blockTime) / 3600;
    return sigs.length >= 1000 ? Math.max(gio, 24 * 365) : gio;
  } catch {
    return null;
  }
}

async function getManyAccounts(conn: Connection, keys: PublicKey[]) {
  const out: (AccountInfo<Buffer> | null)[] = [];
  for (let i = 0; i < keys.length; i += CHUNK) {
    out.push(...(await conn.getMultipleAccountsInfo(keys.slice(i, i + CHUNK))));
  }
  return out;
}

/**
 * L1 — bóc tách.
 *
 * THỨ TỰ NÀY KHÔNG ĐẢO ĐƯỢC (xem DAC-TA-CORE.md mục 2.1):
 *   1. giải ALT            -> mới biết đủ danh sách account
 *   2. getMultipleAccounts -> trạng thái TRƯỚC
 *   3. simulateTransaction -> trạng thái SAU
 *   4. so khớp
 *
 * `simulateTransaction` CHỈ trả trạng thái sau. Không có bước 2 thì
 * không có bảng chênh lệch nào cả.
 */
export async function extractFacts(conn: Connection, tx: VersionedTransaction): Promise<Facts> {
  const msg = tx.message;
  const signer = msg.staticAccountKeys[0]?.toBase58() ?? "";

  // 1. giải ALT
  const lookupTables: Facts["lookupTables"] = [];
  const altAccounts: AddressLookupTableAccount[] = [];
  for (const lut of msg.addressTableLookups ?? []) {
    const addr = lut.accountKey.toBase58();
    try {
      const res = await conn.getAddressLookupTable(lut.accountKey);
      if (res.value) {
        altAccounts.push(res.value);
        lookupTables.push({ address: addr, resolved: true });
      } else {
        lookupTables.push({ address: addr, resolved: false });
      }
    } catch {
      lookupTables.push({ address: addr, resolved: false });
    }
  }

  const keyList = msg.getAccountKeys({ addressLookupTableAccounts: altAccounts });
  const allKeys: PublicKey[] = [];
  for (let i = 0; i < keyList.length; i++) allKeys.push(keyList.get(i)!);
  const staticCount = msg.staticAccountKeys.length;

  // 2. trạng thái TRƯỚC
  const before = await getManyAccounts(conn, allKeys);

  // Hỏi trạng thái sau cho mọi account CÓ THỂ ĐỔI, xếp theo thứ tự ưu tiên.
  //
  // Bản trước chỉ theo dõi tài khoản token và ví người ký. Điều đó làm luật 12
  // không bao giờ kích hoạt được trên chuỗi thật: `SystemProgram.assign` tác
  // động lên account THƯỜNG, mà account thường bị bộ lọc cũ loại ra.
  //
  // Tiêu chí đúng là WRITABLE — chỉ account writable mới đổi được. Ưu tiên ví
  // người ký và tài khoản token trước, để nếu chạm trần RPC thì phần bị cắt là
  // phần ít quan trọng nhất.
  const uuTien: number[] = [];
  const conLai: number[] = [];
  before.forEach((info, i) => {
    const dc = allKeys[i]!.toBase58();
    if (dc === signer || (info && isTokenProgram(info.owner.toBase58()))) uuTien.push(i);
    else if (msg.isAccountWritable(i)) conLai.push(i);
  });
  const simIdx = [...uuTien, ...conLai].slice(0, MAX_SIM_ACCOUNTS);

  // 3. trạng thái SAU
  let simOk = true;
  let simErr: string | null = null;
  let after: (AccountInfo<Buffer> | null)[] = [];
  let inner: { programId: string; accounts: string[]; parent: number }[] = [];
  try {
    const sim = await conn.simulateTransaction(tx, {
      sigVerify: false, // giao dịch CHƯA ký — đó là toàn bộ mục đích sản phẩm
      replaceRecentBlockhash: true, // bắt buộc khi sigVerify = false
      innerInstructions: true, // hành vi độc hại thường nằm trong CPI
      accounts: {
        encoding: "base64",
        addresses: simIdx.map((i) => allKeys[i]!.toBase58()),
      },
    });
    const v = sim.value;
    if (v.err) {
      simOk = false;
      simErr = typeof v.err === "string" ? v.err : JSON.stringify(v.err);
    }
    after = simIdx.map((_, k) => {
      const a = v.accounts?.[k];
      if (!a) return null;
      return {
        data: Buffer.from(a.data[0] ?? "", "base64"),
        executable: a.executable,
        lamports: a.lamports,
        owner: new PublicKey(a.owner),
        rentEpoch: a.rentEpoch ?? 0,
      } satisfies AccountInfo<Buffer>;
    });
    // Kết quả mô phỏng CÓ kèm program và danh sách account của từng inner
    // instruction. Bản trước chỉ đếm số lượng — bỏ phí đúng thông tin cần để
    // biết lệnh đó có chạm được vào tài sản người ký hay không.
    inner = (v.innerInstructions ?? []).flatMap((g) =>
      g.instructions.map((ix) => {
        const pd = ix as { programId?: { toBase58?: () => string }; accounts?: { toBase58?: () => string }[] };
        return {
          programId: pd.programId?.toBase58?.() ?? "",
          accounts: (pd.accounts ?? []).map((a) => a?.toBase58?.() ?? ""),
          parent: g.index,
        };
      }),
    );
  } catch (e) {
    simOk = false;
    simErr = e instanceof Error ? e.message : String(e);
  }

  // 4. so khớp
  const afterByIndex = new Map<number, AccountInfo<Buffer> | null>();
  simIdx.forEach((orig, k) => afterByIndex.set(orig, after[k] ?? null));

  // Mọi account có trạng thái sau — nguồn cho luật 12.
  const accounts: AccountFact[] = [];
  for (let i = 0; i < allKeys.length; i++) {
    if (!afterByIndex.has(i)) continue;
    const addr = allKeys[i]!.toBase58();
    const b = before[i] ?? null;
    const a = afterByIndex.get(i) ?? null;
    accounts.push({
      address: addr,
      isSigner: addr === signer,
      programOwnerBefore: b ? b.owner.toBase58() : null,
      programOwnerAfter: a ? a.owner.toBase58() : null,
      lamportsBefore: BigInt(b?.lamports ?? 0),
      lamportsAfter: BigInt(a?.lamports ?? 0),
    });
  }

  const tokenAccounts: TokenAccountFact[] = [];
  const mintAddrs = new Set<string>();

  for (let i = 0; i < allKeys.length; i++) {
    const addr = allKeys[i]!.toBase58();
    const b = parseTokenAccount(addr, before[i] ?? null);
    const a = parseTokenAccount(addr, afterByIndex.get(i) ?? null);
    if (!b && !a) continue;
    const ref = b ?? a!;
    mintAddrs.add(ref.mint);
    tokenAccounts.push({
      address: addr,
      mint: ref.mint,
      ownerBefore: b?.owner ?? null,
      ownerAfter: a?.owner ?? null,
      amountBefore: b?.amount ?? 0n,
      amountAfter: a?.amount ?? 0n,
      delegateBefore: b?.delegate ?? null,
      delegateAfter: a?.delegate ?? null,
      delegatedAmountAfter: a?.delegatedAmount ?? 0n,
      closeAuthorityBefore: b?.closeAuthority ?? null,
      closeAuthorityAfter: a?.closeAuthority ?? null,
      programOwnerBefore: b?.programOwner ?? null,
      programOwnerAfter: a?.programOwner ?? null,
    });
  }

  // Mint thường KHÔNG nằm trong danh sách account của giao dịch: lệnh `Transfer`
  // thường của SPL Token không mang theo mint (chỉ `TransferChecked` mới có).
  // Không lấy mint thì mất `decimals`, và người dùng sẽ thấy "500.000.000"
  // thay vì "500" — hiển thị sai độ lớn trong sản phẩm bảo mật là nguy hiểm.
  // Vì vậy phải hỏi RIÊNG, lấy địa chỉ từ chính token account đã đọc được.
  const mints: MintFact[] = [];
  const daCo = new Set<string>();
  for (let i = 0; i < allKeys.length; i++) {
    const addr = allKeys[i]!.toBase58();
    if (!mintAddrs.has(addr)) continue;
    const m = parseMint(addr, before[i] ?? null);
    if (m) { mints.push(m); daCo.add(addr); }
  }
  const thieu = [...mintAddrs].filter((a) => !daCo.has(a));
  if (thieu.length > 0) {
    try {
      const keys = thieu.map((a) => new PublicKey(a));
      const info = await getManyAccounts(conn, keys);
      thieu.forEach((addr, i) => {
        const m = parseMint(addr, info[i] ?? null);
        if (m) mints.push(m);
      });
    } catch {
      // Không lấy được mint thì `decimals` khuyết. Không làm sập lượt kiểm tra —
      // bảng chênh lệch vẫn hiện, chỉ kém chính xác về cách hiển thị số.
    }
  }

  const solDelta: Record<string, bigint> = {};
  for (let i = 0; i < allKeys.length; i++) {
    const a = afterByIndex.get(i);
    if (a === undefined) continue;
    const lamBefore = BigInt(before[i]?.lamports ?? 0);
    const lamAfter = BigInt(a?.lamports ?? 0);
    if (lamBefore !== lamAfter) solDelta[allKeys[i]!.toBase58()] = lamAfter - lamBefore;
  }

  // Tập tài khoản thuộc người ký: chính ví, và mọi tài khoản token nó sở hữu.
  const cuaNguoiKy = new Set<string>([signer]);
  for (const t of tokenAccounts) {
    if (t.ownerBefore === signer || t.ownerAfter === signer) cuaNguoiKy.add(t.address);
  }

  // instruction tầng ngoài
  const instructions: InstructionFact[] = [];
  msg.compiledInstructions.forEach((ix, n) => {
    const pid = allKeys[ix.programIdIndex]!.toBase58();
    const cham = ix.accountKeyIndexes.some(
      (k) => msg.isAccountWritable(k) && cuaNguoiKy.has(allKeys[k]?.toBase58() ?? ""),
    );
    instructions.push({
      index: n,
      programId: pid,
      isInner: false,
      parentIndex: null,
      decoded: decodeInstruction(pid, ix.data),
      fromLookupTable: ix.programIdIndex >= staticCount,
      chamTaiSanNguoiKy: cham,
    });
  });

  // Inner instruction (CPI) PHẢI được đếm vào `total` — hành vi độc hại hay
  // nằm ở đây, bỏ qua sẽ làm coverage đẹp một cách giả tạo.
  for (const g of inner) {
    instructions.push({
      index: instructions.length,
      programId: g.programId,
      isInner: true,
      parentIndex: g.parent,
      decoded: null,
      fromLookupTable: false,
      // Không biết account nào ⇒ chọn phía thận trọng, coi như có chạm.
      chamTaiSanNguoiKy:
        g.accounts.length === 0 || g.accounts.some((a) => cuaNguoiKy.has(a)),
    });
  }

  // ── làm giàu: tuổi ví nhận ────────────────────────────────────
  // Chỉ tra ví NHẬN tiền và không phải của người ký. Best-effort: hết hạn
  // hoặc lỗi thì để `null`, luật liên quan sẽ tự không kích hoạt.
  const viNhan = [
    ...new Set(
      tokenAccounts
        .filter((t) => t.amountAfter > t.amountBefore && t.ownerAfter && t.ownerAfter !== signer)
        .map((t) => t.ownerAfter!),
    ),
  ].slice(0, MAX_VI_TRA);

  const tuoiViNhan: Record<string, number | null> = {};
  if (viNhan.length > 0) {
    try {
      await Promise.race([
        Promise.all(
          viNhan.map(async (v) => {
            tuoiViNhan[v] = await traTuoiVi(conn, new PublicKey(v));
          }),
        ),
        new Promise((_, tuChoi) => setTimeout(() => tuChoi(new Error("quá hạn")), HAN_LAM_GIAU_MS)),
      ]);
    } catch {
      // Quá hạn. Ví nào chưa có kết quả thì để `null` — không biết, và nói không biết.
    }
    for (const v of viNhan) if (!(v in tuoiViNhan)) tuoiViNhan[v] = null;
  }

  return {
    signer,
    tuoiViNhan,
    simulationOk: simOk,
    simulationError: simErr,
    accounts,
    tokenAccounts,
    mints,
    solDelta,
    instructions,
    lookupTables,
    // Mô phỏng hỏng => KHÔNG biết gì về hậu quả, dù có đọc được tên lệnh.
    // coverage trả lời "hiểu hậu quả bao nhiêu phần", không phải "nhận ra bao nhiêu tên".
    // Không có dòng này, một L2 ngây thơ sẽ thấy coverage đầy đủ và ra `safe`.
    coverage: simOk
      ? computeCoverage(instructions)
      : { ...computeCoverage(instructions), analyzed: 0 },
  };
}
