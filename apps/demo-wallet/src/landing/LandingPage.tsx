import { useCallback, useEffect, useState } from "react";
import { NOI_DUNG, type Ngon } from "./content.ts";
import { SiteHeader } from "./SiteHeader.tsx";
import { Hero, HangThongTin } from "./Hero.tsx";
import { HanhTrinh } from "./HanhTrinh.tsx";
import { ScenarioExplorer } from "./ScenarioExplorer.tsx";
import { useSectionMotion } from "./useSectionMotion.ts";
import { CINEMA } from "./CinematicScene.tsx";
import {
  CtaCuoi,
  DeveloperSection,
  FAQ,
  ProofSection,
  SiteFooter,
} from "./Sections.tsx";

const KHOA_LUU = "custos-landing-ngon";

/**
 * Chọn ngôn ngữ ban đầu.
 *
 * Thứ tự ưu tiên: query rõ ràng → lựa chọn trong CÙNG phiên (tab) → EN.
 *
 * Lựa chọn chỉ nhớ trong `sessionStorage`: mở web lần mới luôn ra tiếng Anh, kể cả
 * khi lần trước đã bấm VI. Muốn vào thẳng bản Việt thì dùng `?lang=vi`.
 *
 * `try/catch` quanh `sessionStorage` là BẮT BUỘC, không phải phòng xa: trình duyệt
 * chặn storage trong chế độ riêng tư hoặc khi người dùng tắt cookie bên thứ ba sẽ
 * **ném** ngay ở lệnh đọc. Không bắt thì cả trang trắng vì một tuỳ chọn phụ.
 */
function ngonBanDau(): Ngon {
  const q = new URLSearchParams(window.location.search).get("lang");
  if (q === "en" || q === "vi") return q;

  try {
    const luu = window.sessionStorage.getItem(KHOA_LUU);
    if (luu === "en" || luu === "vi") return luu;
  } catch {
    /* storage bị chặn — dùng mặc định, không phải lỗi cần báo cho người dùng */
  }
  return "en";
}

export function LandingPage() {
  const [ngon, setNgon] = useState<Ngon>(ngonBanDau);
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [userPaused, setUserPaused] = useState(false);
  const paused = reduced || userPaused;
  useSectionMotion(paused, ngon);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const t = NOI_DUNG[ngon];

  /*
   * Nút dừng chuyển động — nay nằm trong luồng trang, không nổi đè lên nội dung: một bản ở chân
   * hero, một bản ở footer để người đã cuộn qua hero vẫn dừng được (trạng thái dùng chung, và
   * `data-motion="paused"` dừng mọi hoạt ảnh trên CẢ trang). Khi hệ điều hành bật giảm chuyển động,
   * trang đã tự dừng và nút bị ẩn (CSS `:disabled`).
   */
  const nutChuyenDong = (
    <button type="button" className="cine-motion-control" aria-pressed={paused} disabled={reduced} onClick={() => setUserPaused(value => !value)}>
      <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>{reduced ? CINEMA[ngon].reduced : paused ? CINEMA[ngon].play : CINEMA[ngon].pause}
    </button>
  );

  /*
   * Cập nhật metadata theo ngôn ngữ.
   *
   * GIỚI HẠN ĐÃ BIẾT (mục 13): đổi `lang`/`title` bằng JavaScript KHÔNG bảo đảm
   * crawler đọc được metadata VI — HTML gốc là EN. Đây là điều đã ghi trong
   * bàn giao, không phải thứ được coi là đã giải quyết. Người dùng thật và screen
   * reader thì đọc đúng, vì cả hai chạy sau khi script chạy.
   */
  useEffect(() => {
    document.documentElement.lang = ngon;
    document.title = t.meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t.meta.description);
  }, [ngon, t]);

  const doiNgon = useCallback((n: Ngon) => {
    setNgon(n);
    try {
      window.sessionStorage.setItem(KHOA_LUU, n);
    } catch {
      /* không lưu được thì thôi — phiên này vẫn đúng ngôn ngữ vừa chọn */
    }
    /*
     * Cập nhật URL để chia sẻ được, nhưng dùng `replaceState`: `pushState` sẽ
     * biến mỗi lần đổi ngôn ngữ thành một mục lịch sử, và nút Back của người
     * dùng bị kẹt trong chuỗi đổi VI/EN thay vì quay lại trang trước.
     *
     * KHÔNG cuộn về đầu trang và KHÔNG reset A/B (mục 7.1) — state A/B nằm trong
     * `ScenarioExplorer` và không phụ thuộc `ngon`, nên nó sống qua lần đổi này.
     */
    const url = new URL(window.location.href);
    url.searchParams.set("lang", n);
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <div className="custos-landing cinematic" data-motion={paused ? "paused" : "running"}>
      <div className="cine-reading-progress" aria-hidden="true" />
      <a className="lg-skip" href="#noi-dung">
        {t.chung.boQuaToiNoiDung}
      </a>

      <SiteHeader t={t} ngon={ngon} doiNgon={doiNgon} />

      {/*
        THỨ TỰ MỚI (mục 5 của `DIEU-CHINH-UI-CUSTOS.md`).

        A/B đứng NGAY SAU hero — nó là phần tương tác chủ lực, và bản trước đặt
        nó sau ba thẻ giá trị nên người xem phải cuộn qua phần giải thích trùng ý
        mới tới được điểm nhớ.

        Section "bắt đầu" nền lilac đã bỏ.

        Review UX 11/2026: băng trang trí "One signature. More than a transfer." đã bỏ, và
        "Custos nằm ở đâu" gộp với "Custos kiểm thế nào" thành MỘT sơ đồ trong `HanhTrinh`.
      */}
      <main id="noi-dung">
        <Hero t={t} ngon={ngon} paused={paused} dieuKhienChuyenDong={nutChuyenDong} />
        <HangThongTin t={t} />
        <HanhTrinh t={t} />
        <ScenarioExplorer t={t} ngon={ngon} />
        <DeveloperSection t={t} />
        <ProofSection t={t} />
        <FAQ t={t} />
        <CtaCuoi t={t} />
      </main>

      <SiteFooter t={t} dieuKhienChuyenDong={nutChuyenDong} />
    </div>
  );
}
