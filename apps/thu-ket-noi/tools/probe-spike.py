"""
Probe spike G0-1 — dApp (origin A) ↔ cửa sổ ví Custos (origin B) qua Wallet Standard.

Chạy: hai dev server (ví 5188, dApp 5190), rồi
    python apps/thu-ket-noi/tools/probe-spike.py <thu-muc-anh> [--gui-that]

Không có --gui-that thì KHÔNG ký giao dịch nào: chỉ đo kết nối, chặn, đóng cửa sổ giữa chừng.
Có --gui-that thì ký và gửi MỘT giao dịch tự chuyển 1000 lamport của ví cố định (Devnet).

Trình chặn popup BẬT: Playwright mặc định chạy Chromium với --disable-popup-blocking; bỏ cờ đó
để phép đo T2 ("popup có bị chặn không") có nghĩa.
"""
import json, re, sys, time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
RA = sys.argv[1]
GUI_THAT = "--gui-that" in sys.argv
DAPP = "http://localhost:5190/"
VI = "AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ"
KQ = {"buoc": [], "gui": []}


def ghi(ten, ok, chi_tiet=""):
    KQ["buoc"].append({"ten": ten, "ok": ok, "chiTiet": chi_tiet})
    print(("ĐẠT " if ok else "KHÔNG ") + ten + (f" — {chi_tiet}" if chi_tiet else ""))


def nhat_ky(dapp):
    return dapp.locator("[data-nhat-ky]").inner_text()


with sync_playwright() as pw:
    b = pw.chromium.launch(ignore_default_args=["--disable-popup-blocking"])
    ctx = b.new_context(viewport={"width": 1100, "height": 900})

    def theo_doi(r):
        if "sendTransaction" in (r.post_data or ""):
            nguon = r.frame.page.url.split("?")[0] if r.frame else "?"
            KQ["gui"].append(nguon)

    ctx.on("request", theo_doi)
    dapp = ctx.new_page()
    loi_trang = []
    dapp.on("pageerror", lambda e: loi_trang.append(str(e)[:200]))
    dapp.goto(DAPP, wait_until="networkidle")

    # T1 — wallet-adapter tự nhận ví qua Wallet Standard
    ten_vi = [x.inner_text().strip() for x in dapp.locator("[data-khoi=vi] button").all()]
    ghi("T1 · wallet-adapter thấy 'Custos Wallet'", any("Custos Wallet" in t for t in ten_vi), str(ten_vi))
    dapp.get_by_role("button", name=re.compile("Custos Wallet")).click()

    # T2 — cửa sổ ví mở trong thao tác bấm, KHÔNG bị trình chặn popup chặn
    try:
        with ctx.expect_page(timeout=10000) as moi:
            dapp.get_by_role("button", name="Kết nối", exact=True).click()
        vi = moi.value
        vi.wait_for_load_state("networkidle")
        ghi("T2 · popup ví mở với trình chặn popup BẬT", True, vi.url.split("?")[0])
    except Exception as e:
        ghi("T2 · popup ví mở với trình chặn popup BẬT", False, str(e)[:160])
        print(json.dumps(KQ, ensure_ascii=False)); b.close(); sys.exit(1)

    vi.get_by_role("heading", name=re.compile("muốn kết nối")).wait_for(timeout=15000)
    tieu_de = vi.get_by_role("heading", name=re.compile("muốn kết nối")).inner_text()
    ghi("T2 · ví hiện đúng origin dApp (do trình duyệt cấp)", "http://localhost:5190" in tieu_de, tieu_de)
    vi.get_by_role("button", name="Cho kết nối").click()
    dapp.locator("[data-dia-chi]").filter(has_text=VI).wait_for(timeout=15000)
    ghi("T1 · dApp nhận tài khoản qua chuẩn", True, VI)

    vi.locator("#kn-khoa").set_input_files(".devnet/vi-demo.json")
    vi.get_by_text("Chọn file khoá").wait_for(state="detached", timeout=5000)

    # T4 · Chặn: không chữ ký, không gửi
    dapp.bring_to_front()
    dapp.get_by_role("button", name=re.compile(r"\(legacy\)")).click()
    vi.bring_to_front()
    vi.locator(".kn-muc, [role=alert]").first.wait_for(timeout=60000)
    muc = vi.locator(".kn-muc").inner_text() if vi.locator(".kn-muc").count() else "LỖI KIỂM: " + vi.locator("[role=alert]").first.inner_text()
    vi.screenshot(path=f"{RA}/spike-vi-ket-qua.png", full_page=True)
    ghi("T3 · ví kiểm giao dịch legacy do dApp tự dựng", vi.locator(".kn-muc").count() > 0, muc)
    if vi.get_by_role("button", name="Chặn giao dịch").count():
        vi.get_by_role("button", name="Chặn giao dịch").click()
    else:
        vi.get_by_role("button", name="Đóng yêu cầu").click()
    dapp.wait_for_function("() => document.querySelector('[data-nhat-ky]').innerText.includes('thất bại')", timeout=15000)
    nk = nhat_ky(dapp)
    ghi("T4 · Chặn ⇒ dApp nhận lỗi, KHÔNG có sendTransaction", len(KQ["gui"]) == 0, nk.splitlines()[0][:160])

    # T2 · đóng cửa sổ ví giữa chừng ⇒ dApp nhận kết cục, không treo
    dapp.bring_to_front()
    dapp.get_by_role("button", name=re.compile(r"\(v0\)")).click()
    vi.locator(".kn-yeu-cau").wait_for(timeout=30000)
    vi.close()
    try:
        dapp.wait_for_function("() => document.querySelector('[data-nhat-ky]').innerText.includes('đã đóng')", timeout=15000)
        ghi("T2 · đóng ví giữa chừng ⇒ dApp nhận 'Cửa sổ ví đã đóng'", True)
    except Exception:
        ghi("T2 · đóng ví giữa chừng ⇒ dApp nhận 'Cửa sổ ví đã đóng'", False, nhat_ky(dapp)[:200])
    ghi("T4 · vẫn chưa có sendTransaction nào", len(KQ["gui"]) == 0, str(KQ["gui"]))

    if GUI_THAT:
        # Kết nối lại rồi ký thật một lần. Cửa sổ ví đóng ⇒ connector báo mất tài khoản ⇒
        # wallet-adapter BỎ CHỌN ví (hành vi của adapter, đo được lượt chạy đầu) ⇒ chọn lại.
        dapp.get_by_role("button", name=re.compile("Custos Wallet")).click()
        with ctx.expect_page(timeout=10000) as moi:
            dapp.get_by_role("button", name="Kết nối", exact=True).click()
        vi = moi.value
        vi.get_by_role("button", name="Cho kết nối").click(timeout=15000)
        dapp.locator("[data-dia-chi]").filter(has_text=VI).wait_for(timeout=15000)
        vi.locator("#kn-khoa").set_input_files(".devnet/vi-demo.json")
        dapp.bring_to_front()
        dapp.get_by_role("button", name=re.compile(r"\(v0\)")).click()
        vi.bring_to_front()
        vi.locator(".kn-muc").wait_for(timeout=60000)
        muc_v0 = vi.locator(".kn-muc").inner_text()
        ghi("T3 · ví kiểm giao dịch v0 do dApp tự dựng", True, muc_v0)
        if vi.locator(".kn-xac-nhan input").count():
            vi.locator(".kn-xac-nhan input").check()
        vi.get_by_role("button", name=re.compile("^(Ký|Vẫn ký)$")).click()
        dapp.locator("[data-chu-ky]").wait_for(timeout=60000)
        sig = dapp.locator("[data-chu-ky]").get_attribute("href").split("/tx/")[1].split("?")[0]
        KQ["chuKy"] = sig
        ghi("G0-1 · dApp nhận chữ ký qua chuẩn và TỰ gửi", len(KQ["gui"]) == 1 and KQ["gui"][0].startswith(DAPP), f"{sig} · gửi từ {KQ['gui']}")
        dapp.screenshot(path=f"{RA}/spike-dapp-da-gui.png", full_page=True)

    KQ["loiTrang"] = loi_trang
    print(json.dumps(KQ, ensure_ascii=False))
    b.close()
