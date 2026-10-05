"""
NHẬP VAI GIÁM KHẢO — hành trình lần đầu, KHÔNG có file khoá, trên production. Chỉ đọc và bấm; KHÔNG ký,
KHÔNG gửi giao dịch nào (popup luôn kết thúc bằng "Chặn giao dịch").

Ghi từng bước: tiêu đề, các nút nhìn thấy, thời gian chờ, chữ trên màn hình, ảnh chụp, lỗi trang. Dùng để
trả lời "giám khảo có bị kẹt ở đâu không" trước mỗi lần trình diễn. Bối cảnh và kết quả lần đầu:
docs/review/ck-20261005/DANH-GIA-GIAM-KHAO.md.

    python scripts/kiem-trinh-duyet/probe-giam-khao.py [--out build/giam-khao] [--vi URL] [--solbonus URL]

Trình chặn popup BẬT (bỏ cờ --disable-popup-blocking mặc định của Playwright) — như trình duyệt thật.
"""
import argparse, json, pathlib, re, sys, time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
ap = argparse.ArgumentParser()
ap.add_argument("--out", default="build/giam-khao")
ap.add_argument("--vi", default="https://custos-solana.vercel.app")
ap.add_argument("--solbonus", default="https://solbonus-custos.vercel.app/tan-cong/")
args = ap.parse_args()
OUT = args.out
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)
V = args.vi.rstrip("/")
SB = args.solbonus
log = []


def ghi(buoc, **kw):
    kw["buoc"] = buoc
    log.append(kw)
    print(json.dumps(kw, ensure_ascii=False)[:700])


def nut(p):
    return [b.inner_text().strip().replace("\n", " ")[:50] for b in p.get_by_role("button").all() if b.is_visible()][:14]


def h(p):
    try:
        return p.locator("h1").first.inner_text().replace("\n", " ")
    except Exception:
        return None


with sync_playwright() as pw:
    b = pw.chromium.launch(ignore_default_args=["--disable-popup-blocking"])
    ctx = b.new_context(viewport={"width": 1366, "height": 800})
    ctx.set_default_timeout(20000)
    loi = []
    ctx.on("page", lambda pg: pg.on("pageerror", lambda e: loi.append(f"{pg.url[:60]}: {str(e)[:120]}")))
    p = ctx.new_page()
    p.on("pageerror", lambda e: loi.append(f"{p.url[:60]}: {str(e)[:120]}"))

    # 1. Trang chủ
    # Gốc bản Vercel tự chuyển về gioi-thieu.html; bản dev/Pages thì không — mở thẳng trang giới thiệu.
    t = time.time(); p.goto(V + "/gioi-thieu.html", wait_until="networkidle"); tg = round(time.time() - t, 1)
    p.screenshot(path=f"{OUT}/01-trang-chu.png")
    cta = [(a.inner_text().strip().replace("\n", " ")[:45], a.get_attribute("href")) for a in p.locator("main a").all()[:8] if a.is_visible()]
    ghi("1 trang chủ", url=p.url, giay=tg, h1=h(p), lienKetDauTien=cta)

    # 2. CTA chính của hero
    # Từ 05/10 nút chính mở SolBonus ở TAB MỚI (target=_blank); bản cũ chuyển trang cùng tab.
    try:
        cta = p.locator(".lg-hero a.lg-btn--primary").first
        ghi("2a CTA hero", nhan=cta.inner_text().strip().replace("\n", " "), href=cta.get_attribute("href"))
        if cta.get_attribute("target") == "_blank":
            with ctx.expect_page(timeout=15000) as moi:
                cta.click()
            q = moi.value
            q.wait_for_load_state("networkidle")
            q.screenshot(path=f"{OUT}/02-cta-hero.png")
            ghi("2 bấm CTA hero (tab mới)", url=q.url, h1=h(q), nut=nut(q))
            q.close()
        else:
            cta.click()
            p.wait_for_load_state("networkidle")
            p.screenshot(path=f"{OUT}/02-cta-hero.png")
            ghi("2 bấm CTA hero", url=p.url, h1=h(p), nut=nut(p), chu=p.locator("body").inner_text()[:600].replace("\n", " | "))
    except Exception as e:
        ghi("2 bấm CTA hero", loi=str(e)[:200])

    # 3. SolBonus như người dùng
    sb = ctx.new_page()
    t = time.time(); sb.goto(SB, wait_until="networkidle")
    sb.screenshot(path=f"{OUT}/03-solbonus.png", full_page=True)
    ghi("3 SolBonus mở", giay=round(time.time() - t, 1), h1=h(sb), nut=nut(sb), chu=sb.locator("body").inner_text()[:900].replace("\n", " | "))
    vi = None
    try:
        with sb.expect_popup(timeout=10000) as pop:
            sb.get_by_role("button", name=re.compile("Kết nối ví")).click()
        vi = pop.value; vi.wait_for_load_state("networkidle")
        vi.screenshot(path=f"{OUT}/04-cua-so-ky-ket-noi.png")
        ghi("4 cửa sổ ví (xin kết nối)", h1=h(vi), nut=nut(vi), chu=vi.locator("body").inner_text()[:700].replace("\n", " | "))
        vi.get_by_role("button", name="Cho kết nối").click()
        sb.bring_to_front()
        t = time.time()
        sb.get_by_role("button", name=re.compile("Tìm token DEMO")).click()
        sb.locator("#sb-token, .sb-status").first.wait_for(timeout=180000)
        sb.wait_for_function("() => document.querySelector('#sb-token') || /Chưa tìm thấy|không/.test(document.querySelector('.sb-status')?.innerText||'')", timeout=180000)
        ghi("5 tìm token", giay=round(time.time() - t, 1), trangThai=sb.locator(".sb-status").inner_text()[:200] if sb.locator(".sb-status").count() else None, coChon=sb.locator("#sb-token").count())
        sb.screenshot(path=f"{OUT}/05-solbonus-da-tim.png", full_page=True)
        t = time.time()
        sb.get_by_role("button", name=re.compile("Nhận 1.000 SOLB")).click()
        vi.bring_to_front()
        vi.locator(".kn-muc, [role=alert]").first.wait_for(timeout=120000)
        vi.screenshot(path=f"{OUT}/06-cua-so-ky-canh-bao.png", full_page=True)
        ghi("6 cảnh báo trong ví", giay=round(time.time() - t, 1), nut=nut(vi),
            vanKyBat=vi.get_by_role("button", name="Vẫn ký").is_enabled() if vi.get_by_role("button", name="Vẫn ký").count() else None,
            chu=vi.locator("body").inner_text()[:1200].replace("\n", " | "))
        vi.get_by_role("button", name="Chặn giao dịch").click()
        sb.bring_to_front(); sb.wait_for_timeout(1500)
        ghi("7 sau khi chặn (SolBonus)", trangThai=sb.locator(".sb-status").inner_text()[:250] if sb.locator(".sb-status").count() else None)
    except Exception as e:
        ghi("3-7 luồng SolBonus", loi=str(e)[:300])
        sb.screenshot(path=f"{OUT}/0x-solbonus-loi.png", full_page=True)

    # 8. Trang Tích hợp
    th = ctx.new_page(); th.goto(V + "/tich-hop.html", wait_until="networkidle")
    th.screenshot(path=f"{OUT}/08-tich-hop.png")
    for i in range(2):
        t = time.time()
        th.locator(".tich-hop-ca button").nth(i).click()
        th.locator(".tich-hop-ca").nth(i).locator(".tich-hop-kq, [role=alert]").wait_for(timeout=60000)
        ghi(f"8.{i} chạy thử Tích hợp", giay=round(time.time() - t, 1), kq=th.locator(".tich-hop-ca").nth(i).inner_text()[:160].replace("\n", " | "))

    # 9. Ví demo /vi
    w = ctx.new_page(); t = time.time(); w.goto(V + "/vi", wait_until="networkidle")
    w.screenshot(path=f"{OUT}/09-vi-demo.png")
    ghi("9 ví demo", giay=round(time.time() - t, 1), url=w.url, h1=h(w), nut=nut(w), chu=w.locator("body").inner_text()[:900].replace("\n", " | "))

    # 10. Inspector
    s = ctx.new_page(); s.goto(V + "/soi.html", wait_until="networkidle")
    s.screenshot(path=f"{OUT}/10-inspector.png")
    ghi("10 inspector", h1=h(s), nut=nut(s), coMau=bool(re.search("mẫu|ví dụ|thử", s.locator("body").inner_text(), re.I)))

    # 11. Số liệu
    so = ctx.new_page(); so.goto(V + "/so-lieu.html", wait_until="networkidle")
    so.screenshot(path=f"{OUT}/11-so-lieu.png")
    ghi("11 số liệu", h1=h(so))

    # 12. Di động 390px
    m = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True).new_page()
    m.goto(V, wait_until="networkidle"); m.screenshot(path=f"{OUT}/12-mobile-trang-chu.png")
    m.goto(SB, wait_until="networkidle"); m.screenshot(path=f"{OUT}/12-mobile-solbonus.png", full_page=True)
    ghi("12 mobile", tranNgang=m.evaluate("document.documentElement.scrollWidth > innerWidth"))

    ghi("loi trang", loi=loi)
    b.close()
json.dump(log, open(f"{OUT}/nhat-ky.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
