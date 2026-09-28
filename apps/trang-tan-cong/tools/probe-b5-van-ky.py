"""
B5 · nhánh "Vẫn ký" trên HAI ORIGIN HTTPS CÔNG KHAI — chủ dự án đồng ý 29/09/2026.

SolBonus (solbonus-custos.vercel.app) → Custos Demo Wallet (custos-solana.vercel.app/ket-noi.html)
→ Nguy hiểm → người dùng vẫn ký → SolBonus tự gửi → ví đối chiếu dự báo ↔ thực tế trên chain.

Chỉ ví demo cố định, chỉ token DEMO của phiên, Devnet. Trình chặn popup BẬT. Khoá chỉ được nạp
vào ô chọn file của cửa sổ ví; Python không đọc nội dung khoá.

    python apps/trang-tan-cong/tools/probe-b5-van-ky.py <file-ket-qua.json>
"""
import json, sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding="utf-8")
RA = sys.argv[1]
URL = "https://solbonus-custos.vercel.app/tan-cong/"
kq = {"ngay": "2026-09-29", "url": URL, "buoc": [], "gui": [], "loiTrang": []}

with sync_playwright() as pw:
    b = pw.chromium.launch(ignore_default_args=["--disable-popup-blocking"])
    ctx = b.new_context(viewport={"width": 1280, "height": 1000})
    ctx.set_default_timeout(30000)

    def gui(req):
        try:
            if req.method == "POST" and (req.post_data_json or {}).get("method") == "sendTransaction":
                kq["gui"].append(req.frame.url.split("?")[0])
        except Exception:
            pass

    ctx.on("request", gui)
    ctx.on("page", lambda p: p.on("pageerror", lambda e: kq["loiTrang"].append(str(e)[:200])))
    page = ctx.new_page()
    page.on("pageerror", lambda e: kq["loiTrang"].append(str(e)[:200]))
    try:
        page.goto(URL, wait_until="networkidle")
        with page.expect_popup() as pop:
            page.get_by_role("button", name="Kết nối ví", exact=True).click()
        vi = pop.value
        kq["vi"] = vi.url.split("?")[0]
        assert urlparse(page.url).netloc != urlparse(vi.url).netloc, "hai origin phải khác nhau"
        kq["buoc"].append(f"hai origin HTTPS: {urlparse(page.url).netloc} ↔ {urlparse(vi.url).netloc}; popup mở khi trình chặn BẬT")
        vi.get_by_role("button", name="Cho kết nối", exact=True).click()
        vi.locator("#kn-khoa").set_input_files(".devnet/vi-demo.json")

        page.get_by_role("button", name="Tìm token DEMO trên Devnet", exact=True).click()
        expect(page.locator("#sb-token")).to_be_visible(timeout=180000)
        kq["taiKhoanChon"] = page.locator("#sb-token").input_value()
        page.get_by_role("button", name="Nhận 1.000 SOLB", exact=True).click()
        expect(vi.locator(".kn-muc")).to_have_text("Nguy hiểm", timeout=90000)
        kq["canhBao"] = vi.locator(".kn-yeu-cau").inner_text()
        vi.screenshot(path=RA.replace(".json", "-canh-bao.png"), full_page=True)
        assert kq["gui"] == [], "đã có giao dịch được gửi TRƯỚC khi người dùng quyết định"
        kq["buoc"].append("cảnh báo Nguy hiểm hiện TRƯỚC khi có bất kỳ sendTransaction nào")

        vi.locator(".kn-xac-nhan input").check()
        vi.get_by_role("button", name="Vẫn ký", exact=True).click()
        expect(page.locator(".sb-receipt")).to_have_attribute("data-outcome", "xong", timeout=120000)
        kq["chuKy"] = page.locator("[data-signature]").get_attribute("href")
        assert len(kq["gui"]) == 1 and urlparse(kq["gui"][0]).netloc == urlparse(page.url).netloc
        kq["buoc"].append("người dùng vẫn ký → SolBonus tự gửi ĐÚNG MỘT lần → xác nhận trên Devnet")

        # Biên nhận B4 trong cửa sổ ví: tra chữ ký rồi đặt dự báo cạnh thực tế.
        expect(vi.locator("[data-khop-het]")).to_be_visible(timeout=120000)
        kq["khopHet"] = vi.locator("[data-khop-het]").get_attribute("data-khop-het")
        kq["bienNhan"] = vi.locator(".kn-bien-nhan").inner_text()
        vi.screenshot(path=RA.replace(".json", "-bien-nhan.png"), full_page=True)
        kq["buoc"].append(f"biên nhận trong ví: khopHet={kq['khopHet']}")
        kq["ok"] = kq["khopHet"] == "true" and not kq["loiTrang"]
    except Exception as e:
        kq["loi"] = str(e)[:400]
        kq["ok"] = False
        page.screenshot(path=RA.replace(".json", "-loi.png"), full_page=True)
    finally:
        with open(RA, "w", encoding="utf-8") as f:
            json.dump(kq, f, ensure_ascii=False, indent=2)
        print(json.dumps(kq, ensure_ascii=False, indent=2))
        b.close()
