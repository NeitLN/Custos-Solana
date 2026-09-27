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
    : d.toLocaleString("vi-VN", { hour12: false, dateStyle: "short", timeStyle: "short" });
};

export function DaiNguon({ tt }: { tt: ThongTinNguon }) {
  if (tt.kieu === "trucTiep") {
    return (
      <p className="mb-3 rounded-xl border border-vien bg-white px-3 py-2 text-[12.5px] text-chu-mo" data-nguon="truc-tiep">
        <span className="font-semibold text-chu">Mô phỏng Devnet trực tiếp</span> — vừa gọi RPC
        {tt.nguon.length > 0 ? ` qua ${tt.nguon.join(", ")}` : ""}.
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
        <span className="font-semibold">PHÁT LẠI — không phải giao dịch Devnet mới.</span> Engine core{" "}
        {tt.engineNay} vừa chạy lại trên phản hồi RPC ghi lúc {gio(tt.ghiLuc)}
        {tt.slot !== undefined ? `, slot ${tt.slot}` : ""}, từ {tt.nguon.join(", ")}. Không gọi mạng, không ký.
      </p>
      {tt.engineLucGhi !== tt.engineNay && (
        <p className="mt-1 text-chu-mo">Dữ liệu ghi bằng core {tt.engineLucGhi}.</p>
      )}
      {tt.lech && (
        <p className="mt-1 font-medium text-nguy">Kết quả khác lúc ghi — {tt.lech}</p>
      )}
    </div>
  );
}

const NHAN: Record<TrangThaiBuoc, string> = {
  dat: "Đạt",
  loi: "Lỗi",
  quaHan: "Quá hạn",
  chuaDo: "Chưa đo",
};

export function BangSanSang({ kq }: { kq: KetQuaPreflight }) {
  return (
    <div className="mt-4 w-full max-w-[520px] rounded-xl border border-vien bg-white p-3 text-left text-[12.5px]" aria-live="polite">
      <p className="font-semibold text-chu">
        {kq.sanSang ? "Devnet sẵn sàng cho phân tích trực tiếp" : "Devnet CHƯA sẵn sàng cho phân tích trực tiếp"}
      </p>
      <p className="mt-0.5 text-chu-mo">Đo lúc {gio(kq.luc)} — chỉ đọc và mô phỏng, không ký, không gửi.</p>
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
