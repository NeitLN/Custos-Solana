import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { CheckIcon, ExternalIcon } from "./Icons.tsx";

/**
 * HOẠT ĐỘNG GẦN ĐÂY — đọc THẬT từ devnet, không phải danh sách bịa.
 *
 * Vì sao có mục này: cột trái trước đây kết thúc sớm hơn cột phải gần 400px, để
 * lại một khoảng trống lớn. Nhưng lấp bằng nội dung trang trí thì tệ hơn là để
 * trống — nên lấp bằng thứ một ví thật nào cũng có, và lấy từ chuỗi.
 *
 * Tải LỆCH NHỊP với phần chính: `inspect()` là đường người dùng đang chờ, còn danh
 * sách này thì không. Nó tự tải sau, tự hỏng lặng lẽ, và không bao giờ chặn màn ký.
 */

type Muc = { chuKy: string; luc: number | null; hong: boolean };
type TrangThai =
  | { loai: "dangTai" }
  | { loai: "xong"; muc: Muc[] }
  | { loai: "loi" };

/** "3 phút trước" dễ đọc hơn một dấu thời gian ISO khi đang lướt nhanh. */
function khoangCach(luc: number | null): string {
  if (!luc) return "—";
  const giay = Math.max(0, Math.floor(Date.now() / 1000 - luc));
  if (giay < 60) return "vừa xong";
  const phut = Math.floor(giay / 60);
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.floor(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  return `${Math.floor(gio / 24)} ngày trước`;
}

export function HoatDong({ rpc, diaChi }: { rpc: string; diaChi: string }) {
  const [tt, setTt] = useState<TrangThai>({ loai: "dangTai" });

  useEffect(() => {
    let huy = false;
    const conn = new Connection(rpc, "confirmed");
    conn
      .getSignaturesForAddress(new PublicKey(diaChi), { limit: 4 })
      .then((ds) => {
        if (huy) return;
        setTt({
          loai: "xong",
          muc: ds.map((d) => ({ chuKy: d.signature, luc: d.blockTime ?? null, hong: d.err !== null })),
        });
      })
      .catch(() => {
        if (!huy) setTt({ loai: "loi" });
      });
    return () => {
      huy = true;
    };
  }, [rpc, diaChi]);

  return (
    <section className="border-t border-vien px-5 py-5 sm:px-6">
      <h2 className="mb-3 text-[13.5px] font-semibold text-chu">Hoạt động gần đây</h2>

      {tt.loai === "dangTai" && (
        <ul className="space-y-2.5" aria-busy="true" aria-label="Đang tải hoạt động">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="xuong-khung h-7 w-7 shrink-0 rounded-full" />
              <span className="xuong-khung h-3 flex-1 rounded" style={{ maxWidth: `${70 - i * 12}%` }} />
            </li>
          ))}
        </ul>
      )}

      {tt.loai === "loi" && (
        <p className="text-[12.5px] leading-relaxed text-chu-mo">
          Chưa đọc được lịch sử từ Devnet. Phần kiểm tra giao dịch không phụ thuộc vào
          mục này và vẫn chạy bình thường.
        </p>
      )}

      {tt.loai === "xong" && tt.muc.length === 0 && (
        <p className="text-[12.5px] leading-relaxed text-chu-mo">
          Ví này chưa có giao dịch nào trên Devnet. Thử một kịch bản ở trên để tạo giao dịch
          đầu tiên.
        </p>
      )}

      {tt.loai === "xong" && tt.muc.length > 0 && (
        <ul className="divide-y divide-vien/70">
          {tt.muc.map((m) => (
            <li key={m.chuKy}>
              <a
                href={`https://explorer.solana.com/tx/${m.chuKy}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="hang-hoat-dong -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    m.hong ? "bg-nguy/10 text-nguy" : "bg-thuong/10 text-thuong"
                  }`}
                  aria-hidden="true"
                >
                  {m.hong ? <span className="text-[13px] leading-none">!</span> : <CheckIcon className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-chu">
                    {m.hong ? "Giao dịch thất bại" : "Giao dịch thành công"}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-chu-mo">
                    {m.chuKy.slice(0, 10)}…{m.chuKy.slice(-6)}
                  </span>
                </span>
                <span className="shrink-0 text-[11.5px] text-chu-mo">{khoangCach(m.luc)}</span>
                <ExternalIcon className="h-3.5 w-3.5 shrink-0 text-chu-mo" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
