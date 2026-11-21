/**
 * NGUỒN CỦA KẾT QUẢ, NHÌN MỘT LẦN LÀ BIẾT — CK-01 + CK-02.
 *
 * Trước 27/09, "kết quả này từ đâu" nằm trong khối "Chi tiết kỹ thuật" đóng sẵn. Với
 * phát lại thì không đủ: roadmap đòi "nhìn một lần biết replay, thời điểm dữ liệu và
 * engine đang dùng". Nên dải này nằm NGAY TRÊN thẻ kết quả, luôn hiện, và nói bằng chữ —
 * màu chỉ là tín hiệu phụ.
 */
import type { KetQuaPreflight, TrangThaiBuoc } from "./preflight.ts";

export type ThongTinNguon =
  | { kieu: "trucTiep"; nguon: string[] }
  | {
      kieu: "phatLai";
      ghiLuc: string;
      nguon: string[];
      slot?: number;
      engineNay: string;
      engineLucGhi: string;
      gioiHan: string;
      /** Có khi engine đang chạy cho kết quả KHÁC lúc ghi. */
      lech?: string;
    };

const gio = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

export function DaiNguon({ tt }: { tt: ThongTinNguon }) {
  if (tt.kieu === "trucTiep") {
    return (
      <p className="mb-3 rounded-xl border border-vien bg-white px-3 py-2 text-[12.5px] text-chu-mo" data-nguon="truc-tiep">
        <span className="font-semibold text-chu">Live Devnet simulation</span> — RPC just called
        {tt.nguon.length > 0 ? ` via ${tt.nguon.join(", ")}` : ""}.
      </p>
    );
  }
  return (
    <div
      className="mb-3 rounded-xl border border-[#c9b27a] bg-[#fbf7ea] px-3 py-2 text-[12.5px] leading-relaxed text-chu"
      data-nguon="phat-lai"
      role="note"
    >
      <p>
        <span className="font-semibold">REPLAY — not a new Devnet transaction.</span> Engine core{" "}
        {tt.engineNay} just re-ran on RPC responses recorded at {gio(tt.ghiLuc)}
        {tt.slot !== undefined ? `, slot ${tt.slot}` : ""}, from {tt.nguon.join(", ")}. No network calls, no signing.
      </p>
      {tt.engineLucGhi !== tt.engineNay && (
        <p className="mt-1 text-chu-mo">Data recorded with core {tt.engineLucGhi}.</p>
      )}
      {tt.lech && (
        <p className="mt-1 font-medium text-nguy">Result differs from the recording — {tt.lech}</p>
      )}
    </div>
  );
}

const NHAN: Record<TrangThaiBuoc, string> = {
  dat: "Pass",
  loi: "Error",
  quaHan: "Timed out",
  chuaDo: "Not measured",
};

export function BangSanSang({ kq }: { kq: KetQuaPreflight }) {
  return (
    <div className="mt-4 w-full max-w-[520px] rounded-xl border border-vien bg-white p-3 text-left text-[12.5px]" aria-live="polite">
      <p className="font-semibold text-chu">
        {kq.sanSang ? "Devnet is ready for live analysis" : "Devnet is NOT ready for live analysis"}
      </p>
      <p className="mt-0.5 text-chu-mo">Measured at {gio(kq.luc)} — read and simulate only, no signing, no sending.</p>
      <ol className="mt-2 space-y-1">
        {kq.buoc.map((b) => (
          <li key={b.ma} className="flex flex-wrap gap-x-2">
            <span className={b.trangThai === "dat" ? "font-semibold text-chu" : "font-semibold text-nguy"}>
              {NHAN[b.trangThai]}
            </span>
            <span className="text-chu">{b.ten}</span>
            <span className="text-chu-mo">
              {[b.ms !== undefined ? `${b.ms} ms` : "", b.nguon ?? "", b.chiTiet ?? ""].filter(Boolean).join(" · ")}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
