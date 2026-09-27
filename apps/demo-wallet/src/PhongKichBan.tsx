/**
 * PHÒNG KỊCH BẢN — luồng có hướng dẫn + thư viện có nhóm. CK-03.
 *
 * Căn cứ (CK-F03, 27/09): chín thẻ ngang cấp, kèm thuật ngữ kiểm thử lộ ra giao diện
 * ("Đối chứng — engine phải im"), và trên điện thoại danh sách kéo dài trước kết quả.
 * Người mới không biết bấm gì trước, và không thấy ca nào là cặp đối chiếu của ca nào.
 *
 * Nên có hai lối, cùng một sổ kịch bản (`kichBan.ts`) — không dựng kịch bản thứ hai:
 *
 *   · THỬ CÓ HƯỚNG DẪN — ba chặng: chuyển bình thường → cùng một lời mời ký mà mất
 *     quyền kiểm soát → đọc dữ kiện của kết quả.
 *   · TỰ CHỌN TÌNH HUỐNG — mọi ca, nhóm theo tài sản / quyền / dữ liệu thiếu, ca đối
 *     chiếu đặt NGAY CẠNH ca nguy hiểm tương ứng.
 *
 * Nút của luồng hướng dẫn mang đúng LỜI MỜI của kịch bản: người xem đọc đúng câu một
 * trang độc hại sẽ nói, và probe trình duyệt tìm nút theo đúng câu đó.
 */
import type { ReactNode } from "react";
import { KICH_BAN, timKichBan, type KichBan, type NhomRuiRo } from "./kichBan.ts";
import { ArrowIcon, GiftIcon, SendIcon } from "./Icons.tsx";

/** Ba chặng của luồng hướng dẫn — ID lấy từ sổ, lời mời lấy từ sổ. */
export const CHANG_HUONG_DAN = [
  {
    kich: "lanh-tinh",
    ten: "Chuyển bình thường",
    yNghia: "Gửi token cho bạn bè: tài sản rời ví đúng như lời mời, không trao quyền gì.",
  },
  {
    kich: "tan-cong-day-du",
    ten: "Một lời mời ký — mất cả tài sản lẫn quyền",
    yNghia: "Token rời ví VÀ tài khoản token đổi chủ. Bảng số dư thường chỉ thấy vế đầu.",
  },
] as const;

const NHOM: Array<{ ten: string; moTa: string; nhom: NhomRuiRo[] }> = [
  { ten: "Tài sản rời ví", moTa: "Token đi đâu, bao nhiêu, có khớp lời mời không.", nhom: ["thuongGiaMatToken", "chuyenThem"] },
  {
    ten: "Quyền kiểm soát",
    moTa: "Số dư có thể còn nguyên mà quyền đã đổi — chủ, người được rút, người được đóng.",
    nhom: ["doiChu", "capQuyen", "quyenDong"],
  },
  { ten: "Chưa đủ dữ liệu để kết luận", moTa: "Custos nói rõ phần chưa biết thay vì đoán.", nhom: ["thieuDuLieu"] },
];

function NutKichBan({
  kb,
  dangChay,
  onChon,
  nhan,
  hienLoiMoi = false,
}: {
  kb: KichBan;
  dangChay: boolean;
  onChon: (id: string) => void;
  nhan?: ReactNode;
  /** Luồng hướng dẫn luôn hiện LỜI MỜI — câu trang độc hại (hay bạn bè) sẽ nói. */
  hienLoiMoi?: boolean;
}) {
  const nhe = kb.nhom === "doiChung" || kb.nhom === "thieuDuLieu";
  return (
    <button
      type="button"
      onClick={() => onChon(kb.id)}
      disabled={dangChay}
      title={kb.tienDieuKien}
      className={`action-card group flex min-h-[102px] flex-col items-start justify-between rounded-2xl p-4 text-left disabled:cursor-not-allowed disabled:opacity-45${
        nhe ? "" : " action-card--primary"
      }`}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span
          className={`action-icon grid h-9 w-9 place-items-center rounded-xl ${
            nhe ? "text-chu-nhat" : "action-icon--gift text-nhan"
          }`}
        >
          {nhe ? <SendIcon className="h-5 w-5" /> : <GiftIcon className="h-5 w-5" />}
        </span>
        <ArrowIcon className="h-4 w-4 text-chu-mo transition-transform group-hover:translate-x-0.5" />
      </div>
      <span>
        {nhan && <span className="block text-[11px] font-semibold uppercase tracking-wide text-chu-mo">{nhan}</span>}
        <span className="block text-[14px] font-semibold text-chu">{kb.tieuDe}</span>
        <span className="mt-0.5 block text-[11.5px] text-chu-mo">
          {hienLoiMoi
            ? kb.loiMoi
            : kb.nhom === "doiChung"
            ? "Giao dịch tương tự để đối chiếu"
            : kb.nhom === "thieuDuLieu"
              ? "Chưa đủ dữ liệu để kết luận"
              : kb.loiMoi}
        </span>
      </span>
    </button>
  );
}

/** Thứ tự trong một nhóm: mỗi ca nguy hiểm kéo theo NGAY SAU nó ca đối chiếu của nó. */
export function xepNhom(nhom: NhomRuiRo[]): Array<{ kb: KichBan; laDoiChieuCua?: string }> {
  const ra: Array<{ kb: KichBan; laDoiChieuCua?: string }> = [];
  for (const kb of KICH_BAN.filter((k) => nhom.includes(k.nhom))) {
    ra.push({ kb });
    const dc = kb.doiChung ? timKichBan(kb.doiChung) : undefined;
    if (dc) ra.push({ kb: dc, laDoiChieuCua: kb.tieuDe });
  }
  return ra;
}

export function PhongKichBan({
  dangChay,
  onChon,
  daChay,
  coKetQua,
  onMoBangChung,
}: {
  dangChay: boolean;
  onChon: (id: string) => void;
  /** Kịch bản đã chạy trong phiên — để đánh dấu chặng đã đi, không để khoá chặng sau. */
  daChay: ReadonlySet<string>;
  coKetQua: boolean;
  onMoBangChung: () => void;
}) {
  // Ca đối chiếu CHƯA được đặt cạnh ca nguy hiểm nào (vd. ca lành tính gốc) — vẫn phải dễ tìm.
  const daDat = new Set(NHOM.flatMap((g) => xepNhom(g.nhom).map((x) => x.kb.id)));
  const doiChieuRieng = KICH_BAN.filter((k) => k.nhom === "doiChung" && !daDat.has(k.id));

  return (
    <div className="phong-kich-ban">
      <section aria-labelledby="huong-dan-tieu-de" className="huong-dan mb-3 rounded-xl border border-vien p-3">
        <h3 id="huong-dan-tieu-de" className="text-[13px] font-semibold text-chu">
          Thử có hướng dẫn — 3 bước
        </h3>
        <ol className="mt-2 grid gap-2.5 sm:grid-cols-2">
          {CHANG_HUONG_DAN.map((c, i) => {
            const kb = timKichBan(c.kich)!;
            return (
              <li key={c.kich} className="flex flex-col gap-1.5">
                <p className="text-[12px] leading-relaxed text-chu-mo">
                  <span className="font-semibold text-chu">
                    Bước {i + 1} · {c.ten}
                    {daChay.has(c.kich) ? " — đã xem" : ""}
                  </span>
                  <br />
                  {c.yNghia}
                </p>
                <NutKichBan kb={kb} dangChay={dangChay} onChon={onChon} hienLoiMoi />
              </li>
            );
          })}
        </ol>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[12px] text-chu-mo">
            <span className="font-semibold text-chu">Bước 3 · Đọc dữ kiện</span> — kết quả đến từ lệnh, chương
            trình và tài khoản nào.
          </p>
          <button
            type="button"
            className="lien-ket min-h-[44px] text-[12.5px] font-medium text-chu underline underline-offset-4 disabled:opacity-45"
            disabled={!coKetQua || dangChay}
            onClick={onMoBangChung}
          >
            Mở dữ kiện của kết quả đang xem
          </button>
        </div>
      </section>

      <details className="thu-vien rounded-xl border border-vien p-3">
        <summary className="min-h-[44px] cursor-pointer py-2 text-[13px] font-semibold text-chu">
          Tự chọn tình huống — {KICH_BAN.length} ca, nhóm theo tài sản · quyền · dữ liệu thiếu
        </summary>
        {NHOM.map((g) => (
          <section key={g.ten} className="mt-3" aria-label={g.ten}>
            <h4 className="text-[12.5px] font-semibold text-chu">{g.ten}</h4>
            <p className="mb-2 text-[11.5px] text-chu-mo">{g.moTa}</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {xepNhom(g.nhom).map(({ kb, laDoiChieuCua }) => (
                <NutKichBan
                  key={`${g.ten}-${kb.id}`}
                  kb={kb}
                  dangChay={dangChay}
                  onChon={onChon}
                  {...(laDoiChieuCua ? { nhan: `Đối chiếu với: ${laDoiChieuCua}` } : {})}
                />
              ))}
            </div>
          </section>
        ))}
        {doiChieuRieng.length > 0 && (
          <section className="mt-3" aria-label="Giao dịch lành để đối chiếu">
            <h4 className="text-[12.5px] font-semibold text-chu">Giao dịch lành để đối chiếu</h4>
            <p className="mb-2 text-[11.5px] text-chu-mo">Custos nên cho kết quả bình thường ở đây — nếu không, nó đang gắn cờ quá tay.</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {doiChieuRieng.map((kb) => (
                <NutKichBan key={kb.id} kb={kb} dangChay={dangChay} onChon={onChon} />
              ))}
            </div>
          </section>
        )}
      </details>
    </div>
  );
}
