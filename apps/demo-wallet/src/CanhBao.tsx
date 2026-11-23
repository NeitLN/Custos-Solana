import type { CSSProperties, ReactNode } from "react";
import { Trace } from "./Trace.tsx";
import type { InspectResult } from "@custos-solana/types";
import { chiLaThongTin, CHU_BANG, NHAN as NHAN_DIFF, NHAN_EN } from "@custos-solana/core";
import { tomTat, chiTietKyThuat } from "@custos-solana/ai";
import { useEffect, useRef, useState } from "react";
import { AlertIcon, CheckIcon, CopyIcon, ExternalIcon, ScanIcon, ShieldIcon } from "./Icons.tsx";
import { diaChiCuaDong, lienKetExplorer, rutGonDiaChi } from "./diaChi.ts";
import { nhomHauQua, taiSanDoi, type DongDiff } from "./nhomHauQua.ts";
import { NHAN_NGUON, DU_LIEU_GUI_MO_HINH, type ExplanationSource } from "./live/interpreter.ts";

/** Nhãn hiển thị. KHÔNG BAO GIỜ dùng chữ "an toàn" cho mức safe —
 *  sản phẩm không có thẩm quyền tuyên bố một giao dịch an toàn.
 *  Xem docs/DAC-TA-L3.md mục 4.
 *
 *  CHỈ BA TỪ MỨC: Normal / Review carefully / Danger (review UX 11/2026). Chip phụ "High risk",
 *  "No red flags", "Needs verification" từng đứng cạnh tiêu đề — một bộ từ vựng thứ tư cho cùng một
 *  mức, nên đã bỏ. Thanh độ phủ cũng không còn mang màu của mức (xem khối coverage bên dưới). */
const NHAN = {
  safe: {
    chu: "Normal",
    phu: "No danger signs found in the parts we could read",
    vien: "border-emerald-200",
    nen: "bg-emerald-50/60",
    icon: "border-emerald-200 bg-white text-emerald-600",
  },
  warning: {
    chu: "Review carefully",
    phu: "There is information you should verify before continuing",
    vien: "border-amber-200",
    nen: "bg-amber-50/60",
    icon: "border-amber-200 bg-white text-amber-600",
  },
  danger: {
    chu: "Danger",
    phu: "You should not sign this transaction",
    vien: "border-rose-200",
    nen: "bg-rose-50/60",
    icon: "border-rose-200 bg-white text-rose-600",
  },
} as const;

/**
 * HÀNH ĐỘNG ĐỔI THEO MỨC ĐỘ — đây là bản sửa một lỗi UX thật.
 *
 * Bản trước để nút huỷ màu đỏ đặc CỐ ĐỊNH cho cả ba mức. Nghĩa là một giao dịch
 * "Bình thường" vẫn hiện một nút đỏ to đùng. Hai cái sai trong một:
 *
 *   1. Đỏ dùng ở nơi không có nguy hiểm thì lần sau đỏ thật không còn nghĩa gì.
 *   2. Với giao dịch bình thường, việc người dùng muốn làm là KÝ. Bắt họ đọc một
 *      nút đỏ trước là tạo ma sát sai chỗ.
 *
 * Ma sát phải tỉ lệ với rủi ro: mức càng nguy thì đường "vẫn ký" càng nhạt và
 * đường "dừng lại" càng nổi. Đây KHÔNG phải Custos xác nhận an toàn — nhãn vẫn là
 * "Bình thường", và câu chữ vẫn nói rõ phạm vi "trong phần đã đọc".
 */
const HANH_DONG = {
  safe: { huy: "Cancel", huyChinh: false, ky: "Sign transaction" },
  warning: { huy: "Cancel transaction", huyChinh: true, ky: "Sign anyway — I have checked" },
  danger: { huy: "Block & cancel transaction", huyChinh: true, ky: "Sign anyway — I understand the risk" },
} as const;

const MAU_DONG = {
  danger: "text-rose-700",
  warning: "text-amber-700",
  info: "text-slate-700",
} as const;

/**
 * Bối cảnh của chính lượt kiểm này — thẻ TB-X02.
 *
 * Thẻ đòi *"hiển thị transaction đang kiểm, cluster, kết quả live/replay và phần chưa
 * hiểu"*. Ba thứ đầu KHÔNG suy được từ `InspectResult`: kết quả không mang cluster,
 * không mang endpoint, và không biết mình đến từ một lượt chạy thật hay một file mock.
 *
 * Trước X02, chữ "Devnet" nằm rải rác trong câu văn của giao diện. Một người đọc câu
 * *"Đang mô phỏng trên Devnet"* không phân biệt được nó là nhãn cứng hay là thứ đo
 * được — nên nó không phải bằng chứng.
 *
 * TUỲ CHỌN: các chỗ gọi khác (`PhongVan.tsx`) không có bối cảnh và vẫn phải chạy.
 */
export type BoiCanh = {
  /** Cluster THẬT của lượt này, suy từ endpoint đang dùng. */
  cluster: string;
  /** Host của endpoint — bỏ path/query vì credential nằm ở đó. */
  nguon: string;
  /**
   * `live` = vừa gọi RPC thật; `replay` = engine vừa chạy lại trên phản hồi RPC đã ghi
   * (CK-02); `mock` = đọc một kết quả dựng sẵn. Ba thứ khác nhau, không được lẫn.
   */
  kieu: "live" | "mock" | "replay";
  /** Tên file mock, chỉ có khi `kieu === "mock"`. */
  tenMock?: string;
  /** Thời điểm ghi dữ liệu, chỉ có khi `kieu === "replay"`. */
  ghiLuc?: string;
};

/** Nút sao chép một chuỗi. Không chép được (trình duyệt chặn) thì NÓI RA, không im lặng. */
function NutSaoChep({ chuoi, nhan }: { chuoi: string; nhan: string }) {
  const [trangThai, setTrangThai] = useState<"nghi" | "daChep" | "loi">("nghi");
  useEffect(() => {
    if (trangThai === "nghi") return;
    const t = window.setTimeout(() => setTrangThai("nghi"), 1800);
    return () => window.clearTimeout(t);
  }, [trangThai]);
  return (
    <button
      type="button"
      className="dia-chi-nut inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-0.5 text-[11.5px] text-slate-700 hover:bg-slate-50"
      aria-label={`Copy full ${nhan.toLowerCase()}`}
      onClick={() => {
        // Ngữ cảnh không an toàn (http thường) không có `clipboard`.
        if (!navigator.clipboard) return setTrangThai("loi");
        navigator.clipboard.writeText(chuoi).then(
          () => setTrangThai("daChep"),
          () => setTrangThai("loi"),
        );
      }}
    >
      {trangThai === "daChep" ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
      <span aria-live="polite">
        {trangThai === "daChep" ? "Copied" : trangThai === "loi" ? "Could not copy — select the text" : "Copy"}
      </span>
    </button>
  );
}

/**
 * Địa chỉ ĐẦY ĐỦ của một dòng — CK-04. Bảng in bản rút gọn để đọc nhanh; bản rút gọn 4…4
 * ký tự lại là chỗ địa chỉ "vanity" giả được, nên chuỗi đầy đủ phải đọc, chép và mở
 * Explorer được ngay trên thẻ. Explorer chỉ có khi biết đúng cluster của lượt.
 */
function DiaChiDong({ d, cluster }: { d: DongDiff; cluster: string | undefined }) {
  const ds = diaChiCuaDong(d);
  if (ds.length === 0) return null;
  return (
    <ul className="dia-chi-day-du mt-1 grid gap-1 sm:col-span-2">
      {ds.map((x) => {
        const url = lienKetExplorer(x.diaChi, cluster);
        return (
          <li key={x.nhan} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-slate-600">
            <span>{x.nhan}:</span>
            <code className="break-all font-mono text-slate-800">{x.diaChi}</code>
            <NutSaoChep chuoi={x.diaChi} nhan={x.nhan} />
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-800 underline underline-offset-2"
              >
                Explorer <ExternalIcon className="h-3 w-3" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Dòng phí mạng — "trước" của nó không có nghĩa (phí không có số dư trước), nên chỉ in "sau". */
const NHAN_PHI: readonly string[] = [NHAN_DIFF.PHI, NHAN_DIFF.PHI_UOC, NHAN_EN.PHI, NHAN_EN.PHI_UOC];
const truocRong = (d: DongDiff) => d.before.trim() === "" || d.before.trim() === "—";

/**
 * Tên hành động chính để ĐỌC, không phải enum thô — review UX 11/2026: "Detected primary action
 * transfer token" trông như giá trị kỹ thuật lộ ra. Khoá là chữ `type` của SDK (cả hai ngôn ngữ);
 * chữ lạ (mô hình đặt) thì in nguyên, không đoán.
 */
const TEN_HANH_DONG: Record<string, string> = {
  "transfer token": "token transfer",
  "chuyển token": "token transfer",
  "transfer SOL": "SOL transfer",
  "chuyển SOL": "SOL transfer",
  "receive token": "receiving tokens",
  "nhận token": "receiving tokens",
  "approve delegate": "delegate approval",
  "cấp quyền rút": "delegate approval",
  swap: "swap",
};
const LA_CAP_QUYEN = new Set(["approve delegate", "cấp quyền rút"]);
/** Nhãn "Bạn"/"You" mà core đặt ở cột trước khi quyền đang thuộc người ký. */
const BAN: readonly string[] = [CHU_BANG.vi.ban, CHU_BANG.en.ban];
const LA_DONG_RUT = (d: DongDiff) => d.label.startsWith(NHAN_DIFF.DUOC_PHEP_RUT) || d.label.startsWith(NHAN_EN.DUOC_PHEP_RUT);

/**
 * Nhãn nút ở thanh quyết định dính đáy: trên điện thoại hai nút đứng cạnh nhau, nên chỉ HIỆN phần đầu;
 * phần đuôi vẫn nằm trong tên truy cập (`max-sm:sr-only`) — trình đọc màn hình và probe tìm theo tên
 * đầy đủ vẫn thấy đúng câu.
 */
function NhanNut({ day, gon, thuGon }: { day: string; gon: string; thuGon: boolean }) {
  if (!thuGon || !day.startsWith(gon) || day === gon) return <>{day}</>;
  // Bọc MỘT span: nút là flex, mỗi con trần là một flex item và khoảng trắng đầu phần đuôi bị nuốt.
  return (
    <span>
      {gon}
      <span className="max-sm:sr-only">{day.slice(gon.length)}</span>
    </span>
  );
}
const NHAN_GON: Record<string, string> = {
  "Block & cancel transaction": "Block & cancel",
  "Cancel transaction": "Cancel",
  "Sign anyway — I have checked": "Sign anyway",
  "Sign anyway — I understand the risk": "Sign anyway",
  "Continue anyway — see what would happen": "Continue anyway",
  "Continue — see the result": "Continue",
};

/** Một dòng hậu quả. Địa chỉ đầy đủ KHÔNG nằm ở đây nữa — chúng ở "Technical details". */
function DongHauQua({ d, thuTu }: { d: DongDiff; thuTu?: number }) {
  const mau = MAU_DONG[d.severity as keyof typeof MAU_DONG] ?? "text-slate-700";
  // "— → 0.000005 SOL" khó đọc: phí không có "trước". Chỉ áp cho dòng phí; dòng khác giữ "—" vì ở
  // đó nó mang nghĩa "trước đây không có" (vd. chưa ai được phép rút).
  const chiSau = NHAN_PHI.includes(d.label) && truocRong(d);
  const nhanMuc = d.severity === "danger" ? " (danger sign)" : d.severity === "warning" ? " (review sign)" : "";
  return (
    // `--dong`: thứ tự TOÀN CỤC của dòng qua mọi nhóm — chỉ để hiện lần lượt (demo-thiet-ke.css), không đổi nội dung.
    <div
      data-dong-hau-qua
      style={thuTu === undefined ? undefined : ({ "--dong": thuTu } as CSSProperties)}
      className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4 sm:px-5"
    >
      {/* Mức của dòng không chỉ nói bằng màu (WCAG 1.4.1): dòng danger/warning có thêm icon, và trình đọc
          màn hình nghe "(danger sign)" / "(review sign)" — không lặp chữ mức "Danger" của thẻ, đặt SAU giá trị để chuỗi
          thấy được "nhãn ↵ trước → sau" mà probe đọc không bị chen ngang. */}
      <span className={`text-[13px] ${mau}`}>
        {(d.severity === "danger" || d.severity === "warning") && (
          <AlertIcon className="mr-1 inline-block h-3.5 w-3.5 -translate-y-px align-[-2px]" />
        )}
        {d.label}
      </span>
      <span className={`break-all font-mono text-[12.5px] tabular-nums sm:text-right ${mau}`}>
        {chiSau ? (
          <>
            <span aria-hidden="true">{d.after}</span>
            <span className="sr-only">{`: ${d.after}${nhanMuc}.`}</span>
          </>
        ) : (
          <>
            {/* Mũi tên chỉ là hình: trình đọc màn hình nghe "from … to …" (review UX mục 4). Chữ thấy được
                giữ nguyên — probe đọc số dư từ đúng chuỗi "trước → sau" này. */}
            <span aria-hidden="true">
              {d.before} <span className="px-1 text-slate-500">→</span> {d.after}
            </span>
            {/* ":" mở và "." đóng: dòng không dính liền dòng sau khi đọc liên tục (review a11y phase 6). */}
            <span className="sr-only">{`: from ${d.before} to ${d.after}${nhanMuc}.`}</span>
          </>
        )}
      </span>
    </div>
  );
}

export function CanhBao({
  ketQua,
  onHuy,
  onKy,
  onTiepTuc,
  choPhepKy = true,
  boiCanh,
  nguonChu,
  moBangChung = 0,
  vungTrucTiep = true,
}: {
  ketQua: InspectResult;
  onHuy: () => void;
  onKy: () => void;
  /**
   * Khi KHÔNG ký được (Phòng phân tích): "Vẫn tiếp tục" mở khung hậu quả theo mô phỏng — góp ý
   * mentor 28/09: người xem phải thấy tiếp tục thì mất gì. Vắng thì giữ dòng chữ tĩnh cũ.
   */
  onTiepTuc?: () => void;
  /** Bản công khai không nhúng khoá ký — ẩn nút thay vì để nó bấm rồi lỗi. */
  choPhepKy?: boolean;
  /** Bối cảnh lượt kiểm. Vắng mặt ⇒ khối dữ kiện không hiện, không bịa. */
  boiCanh?: BoiCanh;
  /**
   * Câu chữ này do ĐÂU viết ra. Vắng mặt ⇒ không hiện nhãn, không đoán.
   *
   * Nhãn này nói về CHIỀU DIỄN GIẢI, tách khỏi chiều phân tích. Một kết quả mô
   * phỏng thật với câu chữ tất định vẫn là kết quả thật — gộp hai chiều làm một
   * nhãn "live" là nói quá về sản phẩm.
   */
  nguonChu?: ExplanationSource;
  /**
   * Tín hiệu MỞ phần dữ kiện (bước 3 của luồng có hướng dẫn, CK-03). Mỗi lần số này
   * tăng, khối "Chi tiết kỹ thuật" mở ra và nhận focus. Không đóng lại thứ người dùng
   * đang đọc, không đổi gì khác của thẻ.
   */
  moBangChung?: number;
  /**
   * `aria-live` trên cả thẻ. TẮT khi nơi dùng tự chuyển focus vào kết quả (ví demo, Inspector): focus đã đọc
   * tiêu đề mức, vùng live đọc lại cả thẻ lần nữa — "Danger" bị nghe nhiều lần (review a11y phase 6).
   */
  vungTrucTiep?: boolean;
}) {
  const { analyzed, total, unverifiedPrograms } = ketQua.coverage;
  const hq = nhomHauQua(ketQua.diff);
  // Kết quả mock không có địa chỉ thật để mở; vắng bối cảnh thì không đoán cluster.
  const clusterExplorer = boiCanh && boiCanh.kieu !== "mock" ? boiCanh.cluster : undefined;

  // HAI LOẠI "Cần xem kỹ" rất khác nhau, và gộp chúng lại là cách nhanh nhất
  // tạo mệt mỏi cảnh báo:
  //
  //   a) có luật kích hoạt  -> thật sự có dấu hiệu đáng ngờ
  //   b) không luật nào kích hoạt, chỉ là chưa đọc hiểu hết -> đây là THÔNG TIN
  //
  // Đo offline trên 15 giao dịch công khai ngẫu nhiên: 15/15 rơi vào (b), coverage trung
  // bình 8%. Nếu báo động cả (b) thì người dùng học được cách bỏ qua cảnh báo,
  // và lúc (a) xảy ra thật thì họ cũng bỏ qua nốt.
  //
  // `level` KHÔNG đổi — fail-safe giữ nguyên. Chỉ cách nói đổi.
  const [moRong, setMoRong] = useState(false);
  const [moKyThuat, setMoKyThuat] = useState(false);
  const nutKyThuat = useRef<HTMLButtonElement | null>(null);
  /*
   * CHỈ LẦN BẤM MỚI (code review 27/09). Bộ đếm không bao giờ về 0, và thẻ được gắn lại ở
   * mỗi lượt kiểm — so với "> 0" thì sau một lần bấm, MỌI kết quả sau đều tự mở phần kỹ
   * thuật và giành focus. Nhớ giá trị lúc gắn; chỉ phản ứng khi nó tăng sau đó.
   */
  const moBangChungLucGan = useRef(moBangChung);
  useEffect(() => {
    if (moBangChung > moBangChungLucGan.current) {
      moBangChungLucGan.current = moBangChung;
      setMoKyThuat(true);
      nutKyThuat.current?.focus();
    }
  }, [moBangChung]);
  // "Chưa đọc hiểu hết" CHỈ đúng khi coverage THẬT SỰ còn khuyết.
  //
  // Bản trước thiếu vế `analyzed < total`, nên một giao dịch coverage 1/1 (đọc hiểu
  // hoàn toàn) mà mang một mã THÔNG TIN — ví dụ token còn quyền phát hành — vẫn bị
  // dán "Chưa đọc hiểu hết". Đó là nói sai: đọc hết rồi, chỉ là có một thuộc tính
  // đáng nhắc. Nút "gửi cho bạn bè" trong demo dính đúng ca này và trông như báo nhầm.
  const chuaHetCoverage = analyzed < total;
  const chiLaChuaHieu =
    ketQua.level === "warning" &&
    chuaHetCoverage &&
    (ketQua.reasonCodes.length === 0 || chiLaThongTin(ketQua.reasonCodes));
  const n = chiLaChuaHieu
    ? {
        // Vẫn là từ của mức (fail-safe: thiếu dữ liệu ⇒ ít nhất "Review carefully"); chỉ màu và câu phụ
        // nói rõ đây là chưa đọc hết, không phải một dấu hiệu bị bắt.
        chu: "Review carefully",
        phu: "Not fully understood — part of the transaction could not be verified",
        vien: "border-slate-200",
        nen: "bg-slate-50",
        icon: "border-slate-200 bg-white text-slate-600",
      }
    : NHAN[ketQua.level];
  const hd = HANH_DONG[ketQua.level];
  const phanTramCoverage = total > 0 ? Math.min(100, Math.round((analyzed / total) * 100)) : 0;
  const IconTrangThai = ketQua.level === "danger" ? AlertIcon : ShieldIcon;
  const hanhDong = ketQua.detectedPrimaryAction;
  const tenHanhDong = hanhDong ? (TEN_HANH_DONG[hanhDong.type] ?? hanhDong.type) : null;
  /** Chương trình Custos KHÔNG nhận ra (có khi bật `chanDoan`) — để nêu đích danh phần chưa đọc. */
  const chuongTrinhLa = ketQua.chanDoan?.nguon.chiTiet?.danhSachLa ?? [];

  /*
   * LÝ DO CỦA ĐỀ NGHỊ XEM TAY (`aiAdvisory`) — review UX 11/2026.
   *
   * Khối cũ chỉ nói "Custos recommends a manual check … does not confirm safety and does not
   * conclude danger" ngay dưới "Danger": người đọc không biết tin câu nào, và khối không nêu
   * phần nào chưa đọc được. Cơ chế giữ nguyên (chỉ hiện khi L3 đặt `review_required`, không
   * bao giờ đổi `level`); chỉ câu chữ đổi: nêu lý do CÓ THẬT trong kết quả, đọc như phần CỘNG
   * THÊM vào mức, không phải một phán quyết khác. Mỗi lý do suy từ dữ kiện của chính kết quả —
   * không suy được thì nói thẳng là không có lý do cụ thể hơn.
   */
  const lyDoXemTay: ReactNode[] = [];
  if (chuaHetCoverage) {
    lyDoXemTay.push(<>{total - analyzed} of {total} instructions could not be read.</>);
    // Chỉ nêu tên chương trình khi core thật sự khai danh sách — không suy từ con số `unverifiedPrograms`.
    if (chuongTrinhLa.length > 0) {
      lyDoXemTay.push(
        <>
          {chuongTrinhLa.length === 1 ? "Program" : "Programs"} Custos does not recognise:{" "}
          {chuongTrinhLa.map((c, i) => (
            <span key={c.programId}>
              {i > 0 && ", "}
              <code className="font-mono text-[11.5px] text-slate-800" title={c.programId}>
                {rutGonDiaChi(c.programId)}
              </code>
            </span>
          ))}{" "}
          (full {chuongTrinhLa.length === 1 ? "id" : "ids"} in Technical details).
        </>,
      );
    }
  }
  if (ketQua.loiKhaiLech) {
    lyDoXemTay.push(
      <>
        What the app declares ({ketQua.loiKhaiLech.khai}) does not match what the transaction does (
        {ketQua.loiKhaiLech.nhanDien}).
      </>,
    );
  }
  /*
   * Quyền kiểm soát RỜI KHỎI người ký (cột trước là "You") hoặc dòng core chấm `danger` — vòng review 2:
   * không nói về mọi dòng quyền, và chỉ bỏ đúng dòng CHÍNH LÀ hành động chính (dòng "được phép rút" khi
   * hành động chính là cấp quyền rút), không bỏ cả nhóm.
   */
  const quyenRoiTay = hq.quyen.filter(
    (d) => (BAN.includes(d.before) || d.severity === "danger") && !(hanhDong && LA_CAP_QUYEN.has(hanhDong.type) && LA_DONG_RUT(d)),
  );
  if (quyenRoiTay.length > 0) {
    lyDoXemTay.push(
      <>
        It also hands over control: {quyenRoiTay.map((d) => d.label).join("; ")}
        {tenHanhDong ? <> — the detected primary action ({tenHanhDong}) does not need that.</> : "."}
      </>,
    );
  }
  /** Có mã nói về HÀNH VI (không chỉ thông tin) — khi đó mức không chỉ đến từ phần chưa đọc. */
  const coMaHanhVi = ketQua.reasonCodes.length > 0 && !chiLaThongTin(ketQua.reasonCodes);
  /** Thẻ có đưa ra quyết định không (Phòng phân tích, màn thực thi) — chỉ khi đó thanh nút mới dính đáy. */
  const coQuyetDinh = choPhepKy || !!onTiepTuc;

  return (
    <section
      aria-live={vungTrucTiep ? "polite" : undefined}
      /*
       * NHÃN RIÊNG, KHÔNG TRÙNG VỚI LỚP BỌC CỦA VÍ DEMO — CU-08.
       *
       * Vấn đề: Inspector dùng lại `CanhBao` nhưng không có lớp bọc, nên thẻ kết
       * quả của nó không có tên với screen reader và probe không neo vào được.
       *
       * Bản đầu của tôi đặt luôn `aria-label="Kết quả kiểm tra giao dịch"` ở đây —
       * và tạo ra HAI phần tử lồng nhau cùng một nhãn, vì `App.tsx` đã có một div
       * mang đúng chuỗi đó. Div ấy không bỏ được: nó giữ `ref` và `tabIndex` để
       * nhận focus khi kết quả hiện ra, một chức năng thật.
       *
       * Hai phần tử lồng nhau cùng tên là lỗi với screen reader (đọc hai lần) và
       * với mọi selector (khớp hai nơi). Nên nhãn ở đây phải KHÁC, và nó mô tả
       * đúng thứ nó là: tấm thẻ verdict, không phải cả vùng kết quả.
       */
      aria-label="Custos warning card"
      // Dính đáy cần `overflow: clip` (không tạo vùng cuộn) — lớp `result-card--dinh` đặt `hidden` trước làm
      // đường lui cho trình duyệt cũ (demo-thiet-ke.css). Thẻ không có quyết định giữ `overflow-hidden` như cũ.
      className={`result-card ${coQuyetDinh ? "result-card--dinh" : "overflow-hidden"} rounded-2xl border ${n.vien} ${n.nen}`}
    >
      {/* PHÁN QUYẾT ĐỨNG ĐẦU. Người dùng đang chuẩn bị ký; thứ họ cần biết trước
          tiên là có nên dừng lại không, không phải metadata của giao dịch. */}
      <header className={`flex items-start justify-between gap-4 border-b ${n.vien} px-4 py-4 sm:px-5`}>
        <div className="flex min-w-0 items-start gap-3.5">
          <div
            className={`status-icon ${ketQua.level === "danger" ? "status-icon--danger" : ""} grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${n.icon}`}
          >
            <IconTrangThai className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            {/* `data-muc-tieu-de` + tabIndex -1: ví demo đưa focus vào đúng tiêu đề mức khi kết quả MỚI hiện ra. */}
            <h3 data-muc-tieu-de tabIndex={-1} className="text-[22px] font-semibold leading-none tracking-[-0.025em] text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
              {n.chu}
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">{n.phu}</p>
          </div>
        </div>
      </header>

      {/* MỘT KHUNG, NHIỀU VÙNG NGĂN BẰNG ĐƯỜNG KẺ MẢNH.
          Bản trước lồng năm cái card trắng bên trong card cảnh báo — hộp trong hộp
          trong hộp. Mỗi viền thừa lấy đi một chút chú ý khỏi con số thật sự quan
          trọng. Giờ chỉ còn một đường kẻ giữa các vùng. */}
      <div className="divide-y divide-slate-200/80 bg-white/70">
        {!chiLaChuaHieu && (
          <div className="space-y-2 px-4 py-4 sm:px-5">
            {/* MỨC 1 — NGẮN. Mặc định, hiện ngay. Đây là câu duy nhất phần lớn
                người dùng sẽ đọc, và cũng là màn hình dùng để đo mức độ hiểu
                (docs/DAC-TA-L3.md mục 6 và 7). */}
            <p className="text-[16px] font-medium leading-relaxed text-slate-950">{tomTat(ketQua, "en")}</p>

            {ketQua.explanation && (
              <>
                <button
                  type="button"
                  aria-expanded={moRong}
                  onClick={() => setMoRong((v) => !v)}
                  className="lien-ket text-[12.5px] text-slate-600 hover:text-slate-950"
                >
                  {moRong ? "Show less" : "View details"}
                </button>
                {/* Nguồn câu chi tiết thấy được KHI CHƯA MỞ (CK-04: "[AI: nguồn diễn giải]"). */}
                {nguonChu && (
                  <span className="nhan-nguon-ngan mt-1 block text-[11.5px] text-slate-500 sm:ml-2 sm:mt-0 sm:inline" data-nguon={nguonChu}>
                    <span className="hidden sm:inline" aria-hidden="true">· </span>
                    {NHAN_NGUON[nguonChu].ngan}. The level never depends on it.
                  </span>
                )}
                {/* MỨC 2 — ĐỦ. Cùng dữ kiện, cùng con số, chỉ nói dài hơn. */}
                {moRong && (
                  <>
                    <p className="mo-ra text-[13.5px] leading-relaxed text-slate-700">
                      {ketQua.explanation}
                    </p>
                    {/*
                      NGUỒN CỦA CÂU CHỮ — đặt ngay dưới câu, không đặt ở chân trang.
                      Người đọc phải biết ai viết câu họ vừa đọc, tại chỗ họ đọc nó.

                      Cả bốn nhãn đều nói về CÂU CHỮ, không nhãn nào nói về verdict.
                      `level` do L2 sinh trong mọi trường hợp.
                    */}
                    {nguonChu && (
                      <p className="nguon-dien-giai mt-1.5 text-[11.5px] leading-relaxed text-slate-500" data-nguon={nguonChu}>
                        <strong className="font-semibold text-slate-700">{NHAN_NGUON[nguonChu].ngan}.</strong>{" "}
                        {NHAN_NGUON[nguonChu].dai}
                        {/* Lượt có gọi mô hình ⇒ nói rõ cái gì đã rời máy (CK-09). */}
                        {nguonChu !== "tatDinh" && nguonChu !== "chuaCauHinh" && (
                          <>
                            {" "}
                            Sent to the model provider: {Object.values(DU_LIEU_GUI_MO_HINH).join("; ")}. The raw
                            transaction, signatures and keys are never sent.
                          </>
                        )}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {chiLaChuaHieu && (
          <p className="px-4 py-4 text-[14px] leading-relaxed text-slate-700 sm:px-5">
            No danger signs found in the parts we could read. But we could not fully read
            this transaction, so we cannot say anything about the rest.
          </p>
        )}

        {/* ĐỐI CHIẾU LỜI KHAI — đây là quy tắc bất đối xứng hiện thành hình.
            Chỉ hiện khi LỆCH. Khớp thì không hiện gì, và tuyệt đối không làm
            giảm verdict: dApp độc hại hoàn toàn có thể khai đúng để trông hiền.

            Đưa lên NGAY SAU câu tóm tắt: đây là bằng chứng mạnh nhất cho phán
            quyết, nên nó phải đứng cạnh phán quyết chứ không nằm lẫn phía dưới. */}
        {ketQua.loiKhaiLech && (
          <div className="bg-amber-50/70 px-4 py-3.5 sm:px-5">
            <p className="text-[13px] font-semibold text-amber-900">
              The website says one thing, the transaction does another
            </p>
            <dl className="mt-2 grid gap-1 text-[13px] leading-relaxed text-slate-700">
              <div className="flex flex-wrap gap-x-1.5">
                <dt>Website declares:</dt>
                <dd className="font-semibold text-slate-950">{ketQua.loiKhaiLech.khai}</dd>
              </div>
              <div className="flex flex-wrap gap-x-1.5">
                <dt>What the transaction actually does:</dt>
                <dd className="font-semibold text-amber-900">{ketQua.loiKhaiLech.nhanDien}</dd>
              </div>
            </dl>
          </div>
        )}

        {ketQua.detectedPrimaryAction && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3 sm:px-5">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
              <ScanIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Detected primary action:
            </span>
            <span className="min-w-0 break-words text-[13.5px] font-medium text-slate-900">
              {tenHanhDong}
              {ketQua.detectedPrimaryAction.from && ketQua.detectedPrimaryAction.to ? (
                <>
                  <span aria-hidden="true">{` · ${ketQua.detectedPrimaryAction.from} → ${ketQua.detectedPrimaryAction.to}`}</span>
                  <span className="sr-only">{`, from ${ketQua.detectedPrimaryAction.from} to ${ketQua.detectedPrimaryAction.to}`}</span>
                </>
              ) : null}
            </span>
            {/* Quyết định khoá số 2: hành động NHẬN DIỆN từ giao dịch, không phải ý định hay lời khai. */}
            <span className="text-[12px] text-slate-500">(inferred from the transaction, not from what the app says)</span>
          </div>
        )}

        {ketQua.diff.length > 0 && (
          <div>
            {/* Nhãn cột. Không có nó, `500,0 → 0,0` đọc được theo cả hai chiều —
                mũi tên nhỏ và người đang vội thì không dừng lại phân tích nó. */}
            <div className="flex items-baseline justify-between gap-4 px-4 pb-1 pt-3.5 text-[12px] text-slate-500 sm:px-5">
              <span>Changes if you sign</span>
              <span className="font-mono tabular-nums" aria-hidden="true">
                before <span className="px-0.5">→</span> after
              </span>
            </div>
            {/*
              HAI KHỐI: TÀI SẢN / QUYỀN KIỂM SOÁT — CK-04.
              Token còn nguyên trong tài khoản KHÔNG có nghĩa quyền đối với nó còn
              nguyên. Trộn chung một bảng thì "số dư không đổi" đọc như "không có gì".
              Khối trống nói "không thấy trong phần đã đọc hiểu", không nói "không có":
              phần chưa đọc hiểu vẫn có thể chứa thay đổi.
            */}
            {(
              [
                ["ASSETS", hq.taiSan, taiSanDoi(hq.taiSan) ? null : "No token or SOL balance changes found in the parts we understood, apart from fees."],
                ["CONTROL", hq.quyen, "No control changes found in the parts we understood."],
              ] as const
            ).map(([ten, dong, khiTrong], nhom) => (
              <section key={ten} aria-label={`Consequences if you sign — ${ten.toLowerCase()}`} className="border-t border-slate-100">
                <h4 className="px-4 pt-2.5 text-[11px] font-semibold tracking-wide text-slate-500 sm:px-5">{ten}</h4>
                {khiTrong && (dong.length === 0 || ten === "ASSETS") && (
                  <p className="px-4 pb-1 pt-1 text-[12.5px] text-slate-600 sm:px-5">{khiTrong}</p>
                )}
                <div className="divide-y divide-slate-100">
                  {dong.map((d, i) => (
                    <DongHauQua key={i} d={d} thuTu={(nhom === 0 ? 0 : hq.taiSan.length) + i} />
                  ))}
                </div>
              </section>
            ))}
            {hq.khac.length > 0 && (
              <section aria-label="Consequences if you sign — other" className="divide-y divide-slate-100 border-t border-slate-100">
                {hq.khac.map((d, i) => (
                  <DongHauQua key={i} d={d} thuTu={hq.taiSan.length + hq.quyen.length + i} />
                ))}
              </section>
            )}
          </div>
        )}

        {/*
          CÂU CHỮ KÝ CỦA SẢN PHẨM.
          Sinh từ `coverage` bằng code, KHÔNG BAO GIỜ do mô hình viết —
          để nó cố định và chính xác. Đây là trục khác biệt của Custos: phần CHƯA đọc
          hiểu được đưa lên thành tín hiệu hiển thị ngay lúc ký, thay vì im lặng.
          KHÔNG viết ở đây — và tuyệt đối không đưa ra UI — bất kỳ khẳng định nào về
          việc ví khác có hay không có tính năng này: đội không có so sánh tái lập
          được. Câu chữ đã được cân để không nghe như trấn an — làm nó rõ hơn không
          được phép làm nó êm hơn.
        */}
        <div className="px-4 py-3.5 sm:px-5">
          {/* Một nguồn cho trình đọc màn hình: dòng chữ + "%" là hình, thanh progressbar bên dưới đọc đủ câu
              qua aria-valuetext (review a11y phase 6 — trước đó coverage bị đọc 2–3 lần). */}
          <div className="flex items-baseline justify-between gap-4" aria-hidden="true">
            <p className="text-[13px] text-slate-700">
              Understood <span className="font-semibold text-slate-950">{analyzed} of {total}</span> instructions
            </p>
            <span className="font-mono text-[15px] font-semibold tabular-nums text-slate-800">
              {phanTramCoverage}%
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={phanTramCoverage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`Understood ${analyzed} of ${total} instructions (${phanTramCoverage}%)`}
            aria-label="Transaction coverage"
          >
            <div
              // MÀU TRUNG TÍNH ở mọi mức: thanh đỏ làm "67%" đọc như thước đo nguy hiểm, ngược với
              // câu "not how safe it is" ngay bên dưới (review UX 11/2026).
              className="coverage-fill h-full rounded-full bg-slate-500"
              style={{ width: `${phanTramCoverage}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
            {unverifiedPrograms > 0 && `${unverifiedPrograms} unverified ${unverifiedPrograms === 1 ? "program" : "programs"}. `}
            {/* "2 trên 3" rất dễ bị đọc thành "an toàn 67%". Đây là con số ĐỌC HIỂU,
                và nói nhầm nó thành điểm an toàn là đúng thứ sản phẩm này sinh ra để
                không làm. Một câu, đứng ngay cạnh con số. */}
            {analyzed < total && <span>This is how much we could read, not how safe it is.</span>}
          </p>
        </div>

        {/* AI KHÔNG quyết định mức cảnh báo — quyết định đã khoá số 1. Dòng cũ
            chỉ ghi "AI đề nghị kiểm tra thủ công", và một người đọc bình thường
            hoàn toàn có thể hiểu thành AI là bên chấm Đỏ/Vàng/Xanh. Hiểu nhầm đó
            đánh thẳng vào tuyên bố quan trọng nhất của sản phẩm, nên phải chặn
            ngay tại chỗ nó sinh ra. */}
        {ketQua.aiAdvisory === "review_required" && (
          <div className="px-4 py-3.5 sm:px-5">
            <p className="text-[13px] font-medium text-amber-900">Also check by hand</p>
            {/* HAI CÂU NÀY TỪNG DÍNH LIỀN NHAU, VÀ CHÚNG PHỤC VỤ HAI NGƯỜI KHÁC NHAU.
                Câu đầu là của người sắp ký: ai quyết định mức cảnh báo, và đề nghị
                này KHÔNG phải một phán quyết. Nó bảo vệ quyết định đã khoá số 1 nên
                phải nằm ngay đây, không được bấm mới thấy.

                Phần đuôi — lớp AI tuỳ chọn, bên tích hợp tự cắm, không cần khoá — là
                của người đang cân nhắc dùng SDK. Với người sắp ký thì đó là ba dòng
                chen vào giữa "giới hạn" và "hành động", đúng chỗ họ cần ít chữ nhất.
                Nó xuống mục kỹ thuật.

                Nguồn câu chữ được ghi cạnh phần diễn giải theo từng lượt.
                Không gắn nhãn tất định cố định khi có thể gọi mô hình thật. */}
            {lyDoXemTay.length > 0 ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-relaxed text-slate-700">
                {lyDoXemTay.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-700">
                No more specific reason was given than the rows above — look at them yourself before deciding.
              </p>
            )}
            {/* CỘNG THÊM, KHÔNG ĐỐI LẬP: câu này không được làm mức êm đi (quyết định khoá số 1 và 3). */}
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600">
              {ketQua.level === "danger"
                ? "This adds to the Danger level above and never lowers it."
                : ketQua.level === "warning"
                  ? "This adds to the Review carefully level above and never lowers it."
                  : "Normal covers only the parts Custos could read and is not a guarantee — check by hand anyway."}{" "}
              {chuaHetCoverage && ketQua.level !== "safe"
                ? ketQua.level === "danger" || coMaHanhVi
                  ? "The level comes from the parts Custos did read; the unread part may change more. "
                  : "This level is set because part of the transaction could not be read. "
                : ""}
              The rule engine sets the level; this note cannot change it.
            </p>
          </div>
        )}

        {/* MỨC 3 — KỸ THUẬT. Đóng sẵn, và phải đóng sẵn.
            Trước đây mã lý do hiện thẳng ra cho mọi người dùng: một người bình
            thường nhìn `SPL_SET_AUTHORITY__ACCOUNT_OWNER` thì chỉ thấy nhiễu, và
            nhiễu làm loãng đúng cái câu mà mục 7 dùng để đo mức độ hiểu. Đây là
            thứ ba mức sinh ra để tách. Ai muốn tự kiểm chứng thì bấm một cái. */}
        <div className="px-4 py-3 sm:px-5">
          <button
            ref={nutKyThuat}
            type="button"
            aria-expanded={moKyThuat}
            onClick={() => setMoKyThuat((v) => !v)}
            className="lien-ket text-[12.5px] text-slate-500 hover:text-slate-900"
          >
            {moKyThuat ? "Hide technical details" : "Technical details"}
          </button>
          {moKyThuat && (
            <>
              {/* BỐI CẢNH LƯỢT KIỂM — thẻ TB-X02.

                  Đặt TRƯỚC bảng dữ kiện có chủ ý: câu hỏi đầu tiên của một người
                  muốn tự kiểm chứng là *"những con số này đến từ đâu"*, không phải
                  *"những con số này là gì"*.

                  Vắng `boiCanh` thì khối này không hiện — không bịa ra một cluster
                  mà component không biết. */}
              {boiCanh && (
                <dl className="mo-ra mt-2 space-y-1 rounded-xl border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-600">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-500">Result source:</dt>
                    <dd className="break-all font-semibold text-slate-800">
                      {boiCanh.kieu === "live"
                        ? "live run — RPC just called"
                        : boiCanh.kieu === "replay"
                          ? `replay — the engine just ran on RPC responses recorded at ${boiCanh.ghiLuc ?? "?"}; ${boiCanh.cluster === "devnet" ? "NOT a new Devnet transaction" : "NOT the current chain state"}`
                          : `mock data “${boiCanh.tenMock ?? "?"}” — NOT a real result`}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-500">Cluster:</dt>
                    <dd className="break-all text-slate-800">{boiCanh.cluster}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-500">Endpoint:</dt>
                    <dd className="break-all text-slate-800">{boiCanh.nguon}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-500">Not understood:</dt>
                    <dd className="break-all text-slate-800">
                      {total - analyzed}/{total} instructions · {unverifiedPrograms} unverified{" "}
                      {unverifiedPrograms === 1 ? "program" : "programs"}
                      {chuongTrinhLa.length > 0 && ` · ${chuongTrinhLa.map((c) => c.programId).join(", ")}`}
                    </dd>
                  </div>
                </dl>
              )}
              {/*
                ĐỊA CHỈ ĐẦY ĐỦ — CK-04, dời từ lớp mặc định vào đây (review UX 11/2026: Mint / Token account /
                New address kèm Copy và Explorer đẩy nút quyết định xa tiêu đề mức ~700 px). Vẫn trên chính
                thẻ, một cú bấm: bản rút gọn 4…4 giả được bằng địa chỉ "vanity", chuỗi đầy đủ mới đối chiếu được.
                Mọi dòng hậu quả đều đi qua đây, cùng cluster của lượt.
              */}
              {ketQua.diff.some((d) => diaChiCuaDong(d).length > 0) && (
                <section aria-label="Full addresses" className="mo-ra mt-2 rounded-xl border border-slate-200 bg-white p-3">
                  <h4 className="text-[12px] font-semibold text-slate-700">Full addresses</h4>
                  {ketQua.diff.map((d, i) =>
                    diaChiCuaDong(d).length > 0 ? (
                      <div key={i} className="mt-2">
                        <p className="text-[11.5px] text-slate-500">{d.label}</p>
                        <DiaChiDong d={d} cluster={clusterExplorer} />
                      </div>
                    ) : null,
                  )}
                </section>
              )}
              {/*
                TRACE — CU-09, đặt SAU bối cảnh và TRƯỚC bảng kỹ thuật.

                Thứ tự có chủ ý: bối cảnh trả lời *"số này đến từ đâu"*, trace trả
                lời *"vì sao có cảnh báo này"*, bảng kỹ thuật là dữ liệu thô. Đi từ
                câu hỏi lớn tới chi tiết.

                Vắng `chanDoan` thì component tự trả `null` — không hiện khung rỗng.
              */}
              <Trace ketQua={ketQua} />
              <dl className="mo-ra mt-2 space-y-1 rounded-xl bg-slate-50 p-3 font-mono text-[11px] text-slate-600">
                {chiTietKyThuat(ketQua, "en").map((d, i) => (
                  <div key={i} className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-500">{d.nhan}:</dt>
                    <dd className="break-all text-slate-800">{d.giaTri}</dd>
                  </div>
                ))}
              </dl>
              {/* Không dùng `font-mono`: đây là câu văn cho người đọc, không phải giá
                  trị để đối chiếu. Cùng khung xám nhưng khác kiểu chữ để mắt biết
                  ngay dòng nào là dữ liệu, dòng nào là lời giải thích. */}
              <p className="mo-ra mt-2 rounded-xl bg-slate-50 p-3 text-[11.5px] leading-relaxed text-slate-600">
                This is a reference wallet with the Custos SDK built in, not a wallet product. The source of the
                explanation is shown with the text above: a deterministic explanation, or a language
                model when one is configured. The AI layer is optional and may only recommend
                a manual check — it never creates or changes the warning level.
              </p>
            </>
          )}
        </div>
      </div>

      {/* MA SÁT TỈ LỆ VỚI RỦI RO — xem chú thích ở HANH_DONG.
          DÍNH ĐÁY THẺ (review UX 11/2026): nút quyết định từng cách tiêu đề mức ~700 px. CHỈ khi thẻ thật sự đưa
          ra quyết định — Inspector và trang phỏng vấn giữ thanh tĩnh như cũ. Một hàng mỏng: trên điện thoại hai
          nút đứng cạnh nhau, nhãn rút gọn (tên truy cập vẫn đủ câu). */}
      <div
        className={`result-card__hanh-dong ${
          coQuyetDinh ? "result-card__hanh-dong--dinh sticky bottom-0 z-10 grid-cols-2 px-3 py-2.5" : "px-4 py-4 sm:grid-cols-2"
        } grid gap-2 border-t border-slate-200/80 bg-white sm:grid-cols-2 sm:px-5`}
      >
        {choPhepKy && !hd.huyChinh ? (
          <>
            <button onClick={onKy} className="nut nut-quyet-dinh nut-chinh sm:order-2">
              <NhanNut day={hd.ky} gon={NHAN_GON[hd.ky] ?? hd.ky} thuGon={coQuyetDinh} />
            </button>
            <button onClick={onHuy} className="nut nut-quyet-dinh nut-phu sm:order-1">
              <NhanNut day={hd.huy} gon={NHAN_GON[hd.huy] ?? hd.huy} thuGon={coQuyetDinh} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onHuy}
              className={`nut nut-quyet-dinh ${ketQua.level === "danger" ? "nut-nguy" : "nut-chinh"}`}
            >
              <NhanNut day={hd.huy} gon={NHAN_GON[hd.huy] ?? hd.huy} thuGon={coQuyetDinh} />
            </button>
            {choPhepKy ? (
              <button onClick={onKy} className="nut nut-quyet-dinh nut-phu">
                <NhanNut day={hd.ky} gon={NHAN_GON[hd.ky] ?? hd.ky} thuGon={coQuyetDinh} />
              </button>
            ) : onTiepTuc ? (
              <button onClick={onTiepTuc} className="nut nut-quyet-dinh nut-phu">
                {(() => {
                  const day = ketQua.level === "safe" ? "Continue — see the result" : "Continue anyway — see what would happen";
                  return <NhanNut day={day} gon={NHAN_GON[day] ?? day} thuGon={coQuyetDinh} />;
                })()}
              </button>
            ) : (
              <span className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11.5px] leading-relaxed text-slate-500">
                Demo simulates only · no signing key embedded
              </span>
            )}
          </>
        )}
      </div>
    </section>
  );
}
