"""B3: real Chromium + two origins + real Devnet. Only benign send is opt-in.
Never reads a private key in Python; upload it ONLY into the wallet's file input.
"""
import argparse, json, pathlib, sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding="utf-8")
p = argparse.ArgumentParser()
p.add_argument("--url", default="http://localhost:5189/")
p.add_argument("--out", default="build/b3-browser")
p.add_argument("--allow-devnet-send", action="store_true")
args = p.parse_args()
out = pathlib.Path(args.out); out.mkdir(parents=True, exist_ok=True)
report = {"url": args.url, "checks": [], "errors": [], "sends": []}
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context(viewport={"width": 1440, "height": 1050})
    context.set_default_timeout(30000)
    page = context.new_page()
    def request(req):
        try:
            if req.method == "POST" and req.post_data_json.get("method") == "sendTransaction":
                report["sends"].append(req.frame.url)
        except Exception: pass
    context.on("request", request)
    context.on("page", lambda tab: tab.on("pageerror", lambda e: report["errors"].append(str(e))))
    page.on("pageerror", lambda e: report["errors"].append(str(e)))
    try:
        page.goto(args.url, wait_until="networkidle")
        expect(page.get_by_role("heading", level=1)).to_be_visible()
        page.screenshot(path=str(out / "solbonus-desktop.png"), full_page=True)
        with page.expect_popup() as popup:
            page.get_by_role("button", name="Kết nối ví", exact=True).click()
        wallet = popup.value
        report["wallet"] = wallet.url
        assert urlparse(page.url).netloc != urlparse(wallet.url).netloc, "Origins must differ"
        wallet.get_by_role("button", name="Cho kết nối", exact=True).click()
        page.get_by_role("button", name="Tìm token DEMO trên Devnet", exact=True).click()
        expect(page.locator("#sb-token")).to_be_visible(timeout=180000)
        report["tokens"] = page.locator("#sb-token option").count()
        expect(page.get_by_role("button", name="Nhận 1.000 SOLB", exact=True)).to_be_enabled()
        page.get_by_role("button", name="Nhận 1.000 SOLB", exact=True).click()
        expect(wallet.locator(".kn-muc")).to_have_text("Nguy hiểm", timeout=90000)
        report["danger"] = wallet.locator(".kn-yeu-cau").inner_text()
        wallet.screenshot(path=str(out / "wallet-danger.png"), full_page=True)
        wallet.get_by_role("button", name="Chặn giao dịch", exact=True).click()
        expect(page.locator(".sb-status")).to_contain_text("chưa gửi giao dịch")
        assert len(report["sends"]) == 0
        report["checks"].append("chain discovery -> independent danger transaction -> wallet inspect -> reject -> zero sends")
        page.get_by_role("radio", name="Phiên bản lành", exact=True).check()
        page.get_by_role("button", name="Nhận 1.000 SOLB", exact=True).click()
        expect(wallet.locator(".kn-muc")).to_be_visible(timeout=90000)
        report["benign"] = wallet.locator(".kn-yeu-cau").inner_text()
        assert wallet.locator(".kn-muc").inner_text() != "Nguy hiểm"
        if args.allow_devnet_send:
            wallet.locator("#kn-khoa").set_input_files(".devnet/vi-demo.json")
            checkbox = wallet.get_by_role("checkbox")
            if checkbox.count(): checkbox.check()
            wallet.get_by_role("button", name="Ký", exact=True).click() if wallet.get_by_role("button", name="Ký", exact=True).count() else wallet.get_by_role("button", name="Vẫn ký", exact=True).click()
            expect(page.locator(".sb-receipt")).to_have_attribute("data-outcome", "xong", timeout=90000)
            assert len(report["sends"]) == 1
            assert urlparse(report["sends"][0]).netloc == urlparse(page.url).netloc
            report["signatureUrl"] = page.locator("[data-signature]").get_attribute("href")
            report["checks"].append("benign -> inspect -> user signature -> dApp sends exactly once -> confirmed on Devnet")
        else:
            wallet.get_by_role("button", name="Chặn giao dịch", exact=True).click()
            report["checks"].append("benign inspected; signing/send skipped (no opt-in)")
        wallet.close()
        expect(page.get_by_role("button", name="Kết nối ví", exact=True)).to_be_enabled(timeout=15000)
        report["checks"].append("popup closed -> adapter disconnect -> reconnect available")
        page.set_viewport_size({"width": 390, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.screenshot(path=str(out / "solbonus-mobile.png"), full_page=True)
        page.add_script_tag(path="node_modules/axe-core/axe.min.js")
        report["axe"] = page.evaluate("async () => (await axe.run()).violations.map(v => ({id:v.id, nodes:v.nodes.map(n=>n.target)}))")
        assert not report["axe"], report["axe"]
        assert not report["errors"], report["errors"]
        report["checks"].append("390px mobile: no horizontal overflow, axe zero violations")
        # Separate fault injection, NOT evidence of a real pending chain transaction.
        def pending_rpc(route):
            try:
                request = route.request.post_data_json
                if request.get("method") == "getSignatureStatuses":
                    route.fulfill(json={"jsonrpc": "2.0", "id": request["id"], "result": {"context": {"slot": 1}, "value": [None]}})
                    return
                if request.get("method") == "getBlockHeight":
                    route.fulfill(json={"jsonrpc": "2.0", "id": request["id"], "result": 1})
                    return
            except Exception: pass
            route.continue_()
        page.route("https://api.devnet.solana.com/**", pending_rpc)
        page.evaluate("sessionStorage.setItem('solbonus.pending.v1', JSON.stringify({signature:'1'.repeat(64),lastValidBlockHeight:1000000000}))")
        page.reload(wait_until="networkidle")
        expect(page.locator(".sb-receipt")).to_have_attribute("data-outcome", "cho")
        expect(page.get_by_role("radio", name="Phiên bản lành", exact=True)).to_be_disabled()
        with page.expect_popup() as popup2:
            page.get_by_role("button", name="Kết nối ví", exact=True).click()
        wallet2 = popup2.value
        wallet2.get_by_role("button", name="Cho kết nối", exact=True).click()
        expect(page.get_by_role("button", name="Ngắt kết nối", exact=True)).to_be_visible()
        expect(page.get_by_role("button", name="Nhận 1.000 SOLB", exact=True)).to_be_disabled()
        assert page.evaluate("sessionStorage.getItem('solbonus.pending.v1')")
        wallet2.close()
        page.evaluate("sessionStorage.removeItem('solbonus.pending.v1')")
        report["checks"].append("fault injection: pending signature survives reload and reconnect; submit and mode toggle stay locked")
        report["ok"] = True
    except Exception as e:
        report["failure"] = str(e)
        page.screenshot(path=str(out / "failure.png"), full_page=True)
        raise
    finally:
        (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        browser.close()
