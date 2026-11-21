/**
 * BIÊN NHẬN KHI dApp TỰ GỬI — việc B4, ROADMAP-SAU-MENTOR.
 *
 * Qua connector, ví chỉ KÝ; dApp gửi. Ví vẫn biết chữ ký (có ngay sau khi ký), nên tự tra
 * được giao dịch trên chain và đặt cạnh điều Custos đã dự báo. Đó là câu trả lời cho "dự báo
 * có đúng không" mà không cần ví giữ quyền gửi.
 *
 * ## So cái gì, và cố ý KHÔNG so cái gì
 *
 * - **So**: token của người dùng — số lượng sau và chủ sau. Đó là hậu quả người dùng được
 *   cảnh báo, và là thứ CK-05 đã đối chiếu.
 * - **Chỉ hiển thị, không chấm khớp**: SOL của ví. Mô phỏng và thực thi có thể khác nhau ở phí
 *   ưu tiên và ở trạng thái chain giữa hai thời điểm; gọi lệch vài nghìn lamport là "dự báo
 *   sai" thì nói quá.
 * - **Không so gì** khi mô phỏng thất bại hoặc thiếu Facts: không có dự báo thì không có gì để
 *   gọi là khớp. `khopHet: null`, KHÔNG phải `true`.
 *
 * Lệch KHÔNG chứng minh Custos sai hay giao dịch bị tráo: trạng thái chain có thể đổi giữa lúc
 * mô phỏng và lúc giao dịch chạy. Câu hiển thị phải nói đúng điều đó.
 */
import type { Facts } from "@custos-solana/core";

export type DongToken = { taiKhoan: string; mint: string; soLuongSau: bigint; chuSau: string | null; coMat: boolean };

export type DuBao =
  | { ok: true; token: DongToken[]; lamportsSau: bigint | null }
  | { ok: false; lyDo: string };

/** Dự báo từ Facts của lượt kiểm: token mà người dùng SỞ HỮU trước giao dịch. */
export function duBaoTuFacts(f: Facts | undefined, vi: string): DuBao {
  if (!f) return { ok: false, lyDo: "No simulation data for this transaction." };
  if (!f.simulationOk) return { ok: false, lyDo: `Simulation failed (${f.simulationError ?? "unknown error"}) — no prediction to compare against.` };
  const khongDo = new Set(f.accountKhongDoDuoc ?? []);
  return {
    ok: true,
    token: f.tokenAccounts
      .filter((t) => t.ownerBefore === vi && !khongDo.has(t.address))
      .map((t) => ({ taiKhoan: t.address, mint: t.mint, soLuongSau: t.amountAfter, chuSau: t.ownerAfter, coMat: true })),
    lamportsSau: f.accounts.find((a) => a.address === vi)?.lamportsAfter ?? null,
  };
}

/** Hình dạng tối thiểu của `getTransaction` (encoding "json") mà hàm dưới đọc. */
export type GiaoDichRpc = {
  meta: {
    err: unknown;
    postBalances: number[];
    postTokenBalances?: Array<{ accountIndex: number; mint: string; owner?: string; uiTokenAmount: { amount: string } }>;
    loadedAddresses?: { writable: string[]; readonly: string[] };
  } | null;
  transaction: { message: { accountKeys: string[] } };
};

export type ThucTe = { thanhCong: boolean; loi: string | null; token: DongToken[]; lamportsSau: bigint | null };

/**
 * Thực tế trên chain cho đúng các tài khoản đã dự báo. Tài khoản không còn trong
 * `postTokenBalances` ⇒ `coMat: false` (đã đóng, hoặc RPC không trả) — không đọc thành số 0.
 */
export function thucTeTuGiaoDich(g: GiaoDichRpc, vi: string, taiKhoan: readonly string[]): ThucTe | null {
  if (!g.meta) return null;
  const khoa = [
    ...g.transaction.message.accountKeys,
    ...(g.meta.loadedAddresses?.writable ?? []),
    ...(g.meta.loadedAddresses?.readonly ?? []),
  ];
  const sau = new Map((g.meta.postTokenBalances ?? []).map((b) => [khoa[b.accountIndex], b]));
  const iVi = khoa.indexOf(vi);
  return {
    thanhCong: g.meta.err === null,
    loi: g.meta.err === null ? null : JSON.stringify(g.meta.err),
    token: taiKhoan.map((tk) => {
      const b = sau.get(tk);
      return b
        ? { taiKhoan: tk, mint: b.mint, soLuongSau: BigInt(b.uiTokenAmount.amount), chuSau: b.owner ?? null, coMat: true }
        : { taiKhoan: tk, mint: "", soLuongSau: 0n, chuSau: null, coMat: false };
    }),
    lamportsSau: iVi >= 0 && g.meta.postBalances[iVi] !== undefined ? BigInt(g.meta.postBalances[iVi]!) : null,
  };
}

export type DongDoiChieu = { muc: string; duBao: string; thucTe: string; khop: boolean | null };

const rutGon = (s: string | null) => (s ? `${s.slice(0, 4)}…${s.slice(-4)}` : "—");

/** `khopHet: null` ⇒ không có gì để chấm (thiếu dự báo) — KHÔNG được hiển thị như "khớp". */
export function doiChieu(d: DuBao, t: ThucTe): { dong: DongDoiChieu[]; khopHet: boolean | null } {
  const dong: DongDoiChieu[] = [];
  dong.push({
    muc: "Execution result",
    duBao: d.ok ? "success" : "—",
    thucTe: t.thanhCong ? "success" : `failed ${t.loi ?? ""}`.trim(),
    khop: d.ok ? t.thanhCong : null,
  });
  if (d.ok) {
    // Giao dịch thất bại thì trạng thái không đổi — so số dư sau với dự báo "đã đổi" là vô nghĩa.
    if (t.thanhCong)
      for (const du of d.token) {
        const th = t.token.find((x) => x.taiKhoan === du.taiKhoan);
        if (!th) continue;
        dong.push({
          muc: `Balance ${rutGon(du.taiKhoan)}`,
          duBao: du.soLuongSau.toString(),
          thucTe: th.coMat ? th.soLuongSau.toString() : "no longer in the result",
          khop: th.coMat ? th.soLuongSau === du.soLuongSau : null,
        });
        dong.push({
          muc: `Owner ${rutGon(du.taiKhoan)}`,
          duBao: rutGon(du.chuSau),
          thucTe: th.coMat ? rutGon(th.chuSau) : "no longer in the result",
          khop: th.coMat ? th.chuSau === du.chuSau : null,
        });
      }
    dong.push({
      muc: "SOL in wallet after (lamports, display only)",
      duBao: d.lamportsSau?.toString() ?? "—",
      thucTe: t.lamportsSau?.toString() ?? "—",
      khop: null,
    });
  }
  const cham = dong.filter((x) => x.khop !== null);
  return { dong, khopHet: d.ok && cham.length > 0 ? cham.every((x) => x.khop) : null };
}
