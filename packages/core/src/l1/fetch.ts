import {
  type Connection,
  type VersionedTransaction,
  type AccountInfo,
  PublicKey,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import type { Facts, InstructionFact, TokenAccountFact, MintFact, AccountFact } from "../facts.ts";
import { parseTokenAccount, parseMint, isTokenProgram } from "./parse.ts";
import { decodeInstruction, VI_TRI_AUTHORITY } from "./decode.ts";
import { VERIFIED_PROGRAMS } from "../constants.ts";
import { docKyHieuToken } from "./ten-token.ts";
import { giaiBase58 } from "./base58.ts";
import { computeCoverage } from "./coverage.ts";

/** getMultipleAccounts giới hạn 100 địa chỉ mỗi lượt gọi. */
const CHUNK = 100;
/** Giới hạn thận trọng cho `accounts.addresses` của simulateTransaction. */
const MAX_SIM_ACCOUNTS = 100;
/** Thời hạn cho phần tra cứu làm giàu. Hết hạn thì bỏ, không làm chậm lượt kiểm tra. */
const HAN_LAM_GIAU_MS = 2500;
/** Số ví nhận tối đa chịu tra. Nhiều hơn thì không đáng để người dùng chờ. */
const MAX_VI_TRA = 3;
const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";

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
/** Gắn `authority` vào lệnh đã decode, nếu lệnh đó có khái niệm authority VÀ
 *  đọc được địa chỉ ở đúng vị trí. Không đọc được thì để vắng mặt — vắng mặt
 *  nghĩa là "chưa biết", không phải "không có ai". */
function themAuthority(
  doc: { kind: string } | null,
  layDiaChi: (viTri: number) => string | undefined,
): { kind: string; authority?: string } | null {
  if (doc === null) return null;
  const viTri = VI_TRI_AUTHORITY[doc.kind];
  if (viTri === undefined) return doc;
  const dc = layDiaChi(viTri);
  return dc ? { ...doc, authority: dc } : doc;
}

export async function extractFacts(
  conn: Connection,
  tx: VersionedTransaction,
  nguoiDungChiDinh?: string,
): Promise<Facts> {
  const msg = tx.message;

  // MỌI địa chỉ phải ký, không chỉ người trả phí.
  const soKy = msg.header.numRequiredSignatures;
  const nguoiKy = msg.staticAccountKeys.slice(0, soKy).map((k) => k.toBase58());

  // Người trả phí LUÔN là account thứ nhất — đó là quy tắc của Solana. Nhưng
  // người trả phí không nhất thiết là người dùng: giao dịch được tài trợ phí là
  // mô hình hợp lệ, và kẻ tấn công cũng có thể tự đứng tên trả phí. Chỉ ví mới
  // biết địa chỉ nào là của người dùng, nên nó phải nói ra.
  const nguoiTraPhi = msg.staticAccountKeys[0]?.toBase58() ?? "";
  const nguoiDungDuocChiDinh =
    nguoiDungChiDinh !== undefined && nguoiKy.includes(nguoiDungChiDinh);
  const signer = nguoiDungDuocChiDinh ? nguoiDungChiDinh! : nguoiTraPhi;

  // Phí mạng: khởi động NGAY, vì nó chỉ cần `msg` và không phụ thuộc mô phỏng.
  // Chờ tuần tự thì cộng thẳng một vòng RPC vào thời gian người dùng phải đứng
  // nhìn màn hình ký. Bắt lỗi tại chỗ để `Promise.all` phía dưới không vỡ.
  // `.catch()` KHÔNG đỡ được method không tồn tại: gọi `undefined(...)` ném đồng
  // bộ trước khi có promise nào. RPC cũ hoặc connection rút gọn đều rơi vào đây.
  //
  // GIỚI HẠN ĐO ĐƯỢC: `getFeeForMessage` chỉ tính được khi **blockhash còn hiệu
  // lực**. Ca sản phẩm thật — giao dịch sắp được ký, blockhash tươi — luôn chạy.
  // Nhưng khi mô phỏng lại giao dịch LỊCH SỬ để đo đạc, blockhash đã hết hạn và
  // RPC trả `null`, nên phần đo sẽ thấy nhãn "Ước tính phí mạng". Đó là đúng
  // hành vi, không phải hỏng.
  const phiHua: Promise<bigint | null> = (async () => {
    try {
      const r = await conn.getFeeForMessage(msg);
      return typeof r?.value === "number" ? BigInt(r.value) : null;
    } catch {
      return null;
    }
  })();

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

  // Nếu CÒN BẢNG NÀO chưa giải được thì không hỏi `getAccountKeys` — nó ném lỗi
  // chứ không trả về danh sách thiếu. Trước đây chỗ này làm `extractFacts` chết
  // hẳn, nghĩa là fail-safe 3 trong evaluate.ts KHÔNG BAO GIỜ chạy được từ một
  // giao dịch thật: L1 đã ném lỗi trước khi có Facts để đánh giá. Cùng loại lỗi
  // với "luật 12 không kích hoạt được trên chuỗi" — luật viết đúng, nhưng dữ
  // liệu nuôi nó không bao giờ tới nơi.
  //
  // Suy giảm êm: dùng danh sách tĩnh, đánh dấu bảng chưa giải được, để luật 10
  // và fail-safe nói ra rằng bảng chênh lệch có thể đang thiếu.
  const duBang = altAccounts.length === (msg.addressTableLookups?.length ?? 0);
  const allKeys: PublicKey[] = [...msg.staticAccountKeys];
  if (duBang) {
    const keyList = msg.getAccountKeys({ addressLookupTableAccounts: altAccounts });
    allKeys.length = 0;
    for (let i = 0; i < keyList.length; i++) allKeys.push(keyList.get(i)!);
  }
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
  // Mô phỏng chạy được KHÔNG có nghĩa là ta nhận được trạng thái account. RPC có
  // thể trả `accounts: null` kèm `err: null`. Phải tách hai chuyện đó ra, nếu
  // không thì "không đo được" bị đọc thành "số dư về 0".
  let coDuLieuAccount = false;
  let after: (AccountInfo<Buffer> | null)[] = [];
  let inner: {
    programId: string;
    accounts: string[];
    data: string | null;
    loai: string | null;
    parent: number;
  }[] = [];
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
    coDuLieuAccount = Array.isArray(v.accounts);
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
        const pd = ix as {
          programId?: { toBase58?: () => string };
          accounts?: { toBase58?: () => string }[];
          data?: string;
          parsed?: { type?: string };
        };
        return {
          programId: pd.programId?.toBase58?.() ?? "",
          accounts: (pd.accounts ?? []).map((a) => a?.toBase58?.() ?? ""),
          // `data` của inner instruction là base58. Bản trước bỏ qua trường này
          // và gán decoded = null cho MỌI lệnh CPI — nghĩa là 27 trên 75 lệnh
          // mainnet thuộc chương trình ĐÃ XÁC MINH vẫn bị đếm là chưa đọc hiểu.
          data: typeof pd.data === "string" ? pd.data : null,
          // RPC TỰ PHÂN GIẢI những chương trình nó biết, và khi đó trả về
          // `{ parsed: { type } }` THAY VÌ `data`. Đo trên mainnet: 42/42 lệnh
          // SPL Token trong CPI rơi vào dạng này — tức đường decode theo `data`
          // không bao giờ chạm tới chúng, và chúng bị đếm là "chưa đọc hiểu"
          // trong khi RPC đã nói thẳng chúng là lệnh gì.
          loai: typeof pd.parsed?.type === "string" ? pd.parsed.type : null,
          parent: g.index,
        };
      }),
    );
  } catch (e) {
    simOk = false;
    simErr = e instanceof Error ? e.message : String(e);
  }

  // 4. so khớp
  //
  // CHỈ nạp khi mô phỏng thật sự trả về dữ liệu account. Bản trước nạp vô điều
  // kiện, nên khi RPC không trả gì thì mọi account đều có trạng thái sau bằng
  // `null` — và `null` bị đọc tiếp thành "số dư 0, không còn chủ". Sản phẩm vừa
  // nói "Bình thường" vừa vẽ ra cảnh người dùng mất sạch.
  const afterByIndex = new Map<number, AccountInfo<Buffer> | null>();
  if (coDuLieuAccount) simIdx.forEach((orig, k) => afterByIndex.set(orig, after[k] ?? null));

  // Account có mặt trong giao dịch mà KHÔNG đo được trạng thái sau.
  const khongDo = new Set<string>();
  // (a) bị cắt ở trần RPC — phần dư của danh sách ưu tiên
  for (const i of [...uuTien, ...conLai].slice(MAX_SIM_ACCOUNTS)) {
    khongDo.add(allKeys[i]!.toBase58());
  }
  // (b) mô phỏng không trả dữ liệu account, hoặc hỏng hẳn
  if (!coDuLieuAccount) for (const i of simIdx) khongDo.add(allKeys[i]!.toBase58());
  const accountKhongDoDuoc = [...khongDo];

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
    // Không đo được trạng thái sau thì KHÔNG dựng fact cho account này. Bản
    // trước vẫn dựng, lấy `before` thật ghép với `after` rỗng, và cho ra dòng
    // "500.000.000 → 0" — một khoản mất mát không hề xảy ra. Địa chỉ đã nằm
    // trong `accountKhongDoDuoc`, nên người dùng vẫn được báo là bảng thiếu.
    if (!afterByIndex.has(i)) continue;
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

  // Ký hiệu token — đọc TỪ CHUỖI, không qua nhà cung cấp nào.
  //
  // Không có bước này thì bảng chênh lệch hiện `Agsm…Lf4Z` thay vì `USDC`. Demo
  // hiện đúng ký hiệu chỉ vì ví mẫu tự truyền `kyHieuToken`; giao dịch mainnet
  // thật thì không ai truyền. Xem ten-token.ts.
  //
  // Best-effort: hỏng thì ký hiệu để `null` và hiển thị quay về địa chỉ rút gọn.
  try {
    const duLieuMint = new Map(
      mints.map((m) => {
        const i = allKeys.findIndex((k) => k.toBase58() === m.address);
        return [m.address, i >= 0 ? (before[i] ?? null) : null] as const;
      }),
    );
    const kyHieu = await docKyHieuToken(conn, duLieuMint);
    for (const m of mints) m.kyHieu = kyHieu.get(m.address) ?? null;
  } catch {
    // giữ nguyên null
  }

  // Phí mạng ước tính. Phí cơ bản là 5000 lamport MỖI CHỮ KÝ — hằng số của giao
  // thức. Phí ưu tiên chỉ tính khi đọc được CẢ giá lẫn hạn mức compute unit;
  // thiếu một trong hai thì bỏ qua phần đó thay vì đoán hạn mức mặc định.
  const PHI_CO_BAN_MOI_CHU_KY = 5_000n;
  let giaCU: bigint | null = null;
  let hanMucCU: bigint | null = null;
  for (const ix of msg.compiledInstructions) {
    if (allKeys[ix.programIdIndex]?.toBase58() !== COMPUTE_BUDGET) continue;
    const d = ix.data;
    if (d[0] === 3 && d.length >= 9) {
      giaCU = 0n;
      for (let k = 8; k >= 1; k--) giaCU = (giaCU << 8n) | BigInt(d[k]!);
    } else if (d[0] === 2 && d.length >= 5) {
      hanMucCU = BigInt(d[1]! | (d[2]! << 8) | (d[3]! << 16) | (d[4]! << 24));
    }
  }
  const phiUuTien = giaCU !== null && hanMucCU !== null ? (giaCU * hanMucCU) / 1_000_000n : 0n;
  let phiUocTinh = PHI_CO_BAN_MOI_CHU_KY * BigInt(soKy) + phiUuTien;
  let phiChinhXac = false;

  // RPC tính được phí CHÍNH XÁC, kể cả phần ưu tiên mà công thức trên bỏ sót.
  // Kiểm trên bốn giao dịch mainnet: khớp từng lamport với `meta.fee` thật.
  //
  // Vì sao đáng một lượt gọi: ước tính là cận dưới, nên phần lamport "vượt quá
  // phí" luôn lẫn một ít phí thật. Đo được một ca chênh 203 lamport khiến bảng
  // hiện dòng số dư SOL cho giao dịch chỉ trả phí — nhiễu đúng trên màn hình
  // dùng để đo mức độ hiểu của người dùng.
  //
  // Lượt gọi đã chạy song song từ đầu hàm, nên chỗ này không tốn thêm thời gian.
  const phiTuRpc = await phiHua;
  if (phiTuRpc !== null) {
    phiUocTinh = phiTuRpc;
    phiChinhXac = true;
  }

  const solDelta: Record<string, bigint> = {};
  for (let i = 0; i < allKeys.length; i++) {
    if (!afterByIndex.has(i)) continue; // chưa đo được thì không suy ra chênh lệch
    const a = afterByIndex.get(i);
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
    const pid = allKeys[ix.programIdIndex]?.toBase58() ?? "";
    // Địa chỉ nằm ngoài danh sách nghĩa là nó đến từ một bảng tra chưa giải
    // được. Không nhìn thấy tài khoản thì không kết luận được là lệnh này vô
    // hại — chọn phía thận trọng, coi như có chạm. Cùng cách xử lý với inner
    // instruction ở dưới.
    const khuyetDiaChi = ix.accountKeyIndexes.some((k) => allKeys[k] === undefined);
    const cham =
      khuyetDiaChi ||
      ix.accountKeyIndexes.some(
        (k) => msg.isAccountWritable(k) && cuaNguoiKy.has(allKeys[k]?.toBase58() ?? ""),
      );
    const doc = decodeInstruction(pid, ix.data);
    instructions.push({
      index: n,
      programId: pid,
      isInner: false,
      parentIndex: null,
      decoded: themAuthority(doc, (v) => allKeys[ix.accountKeyIndexes[v]!]?.toBase58()),
      fromLookupTable: ix.programIdIndex >= staticCount,
      chamTaiSanNguoiKy: cham,
    });
  });

  // Inner instruction (CPI) PHẢI được đếm vào `total` — hành vi độc hại hay
  // nằm ở đây, bỏ qua sẽ làm coverage đẹp một cách giả tạo.
  for (const g of inner) {
    // Decode lệnh CPI bằng đúng bộ giải mã dùng cho lệnh tầng ngoài. Một lệnh
    // Transfer của SPL Token không vì nằm trong CPI mà trở nên khó hiểu hơn.
    //
    // Hai đường vào, vì RPC trả về hai hình dạng khác nhau:
    //   - có `data` thô  -> giải base58 rồi decode như lệnh tầng ngoài
    //   - có `parsed.type` -> RPC đã phân giải sẵn, dùng luôn
    //
    // Chỉ nhận `parsed.type` cho chương trình ĐÃ XÁC MINH. RPC phân giải được
    // một chương trình không có nghĩa là đội đọc hiểu nó — giữ nguyên kỷ luật
    // đã khoá, nếu không `coverage` sẽ phồng lên nhờ công của người khác.
    const raw = g.data === null ? null : giaiBase58(g.data);
    const theoRpc =
      g.loai !== null && VERIFIED_PROGRAMS.has(g.programId) ? { kind: g.loai } : null;
    instructions.push({
      index: instructions.length,
      programId: g.programId,
      isInner: true,
      parentIndex: g.parent,
      decoded:
        raw !== null
          ? themAuthority(decodeInstruction(g.programId, raw), (v) => g.accounts[v])
          : theoRpc,
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
    accountKhongDoDuoc,
    nguoiKy,
    nguoiDungDuocChiDinh,
    phiUocTinh,
    phiChinhXac,
    // Mô phỏng hỏng => KHÔNG biết gì về hậu quả, dù có đọc được tên lệnh.
    // coverage trả lời "hiểu hậu quả bao nhiêu phần", không phải "nhận ra bao nhiêu tên".
    // Không có dòng này, một L2 ngây thơ sẽ thấy coverage đầy đủ và ra `safe`.
    coverage: simOk
      ? computeCoverage(instructions)
      : { ...computeCoverage(instructions), analyzed: 0 },
  };
}
