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
        expect(page.locator(".sb-buoc")).to_contain_text("Step 1 of 4")
        # The disclosure stays on the page, collapsed into a toggle, never removed.
        expect(page.locator(".sb-an")).not_to_have_attribute("open", "")
        expect(page.locator(".sb-an summary")).to_have_text("Reveal what this version hides")
        expect(page.locator(".bang-mo-phong")).to_contain_text("SIMULATED malicious dApp")
        page.screenshot(path=str(out / "solbonus-desktop.png"), full_page=True)
        with page.expect_popup() as popup:
            page.get_by_role("button", name="Connect wallet", exact=True).click()
        wallet = popup.value
        report["wallet"] = wallet.url
        assert urlparse(page.url).netloc != urlparse(wallet.url).netloc, "Origins must differ"
        wallet.get_by_role("button", name="Allow connection", exact=True).click()
        # The auto-scan uses its own guard: Disconnect stays usable while Devnet is being read.
        expect(page.get_by_role("button", name="Disconnect", exact=True)).to_be_enabled()
        # No manual "Find" click on the happy path: SolBonus reads the DEMO tokens on its own right after connecting.
        # The public Devnet RPC can rate-limit (429); the manual button is then the designed fallback, used once.
        page.locator("#sb-token, .sb-error").first.wait_for(timeout=180000)
        manual = not page.locator("#sb-token").count()
        if manual:
            report["autoScanError"] = page.locator(".sb-error").inner_text()[:200]
            page.locator(".sb-tokens button.sb-secondary").click()
        expect(page.locator("#sb-token")).to_be_visible(timeout=180000)
        report["tokens"] = int(page.locator(".sb-tokens").get_attribute("data-sessions"))
        expect(page.get_by_role("button", name="Claim 1,000 SOLB", exact=True)).to_be_enabled()
        expect(page.locator(".sb-buoc")).to_contain_text("Step 3 of 4")
        expect(page.get_by_role("button", name="Rescan DEMO tokens", exact=True)).to_be_enabled()
        report["checks"].append("auto-scan after connect -> %d DEMO session(s), %s" % (report["tokens"],
            "RPC error on auto-scan, manual fallback button used once" if manual else "no manual click"))
        page.get_by_role("button", name="Claim 1,000 SOLB", exact=True).click()
        expect(wallet.locator(".kn-muc")).to_have_text("Danger", timeout=90000)
        report["danger"] = wallet.locator(".kn-yeu-cau").inner_text()
        wallet.screenshot(path=str(out / "wallet-danger.png"), full_page=True)
        wallet.get_by_role("button", name="Block transaction", exact=True).click()
        expect(page.locator(".sb-status")).to_contain_text("did not send any transaction")
        result = page.locator("[data-ket-qua=chan]")
        expect(result).to_contain_text("Blocked in the wallet. SolBonus received no signature and sent no transaction to Devnet.")
        expect(page.locator(".sb-buoc")).to_contain_text("Done")
        expect(page.locator(".sb-buoc")).to_contain_text("Test complete")
        # The real-effect warning is never collapsed; only the spoiler is.
        expect(page.locator(".sb-that")).to_be_visible()
        assert len(report["sends"]) == 0
        report["result"] = result.inner_text()
        report["checks"].append("chain discovery -> independent danger transaction -> wallet inspect -> reject -> zero sends")
        result.get_by_role("button", name="Try the Benign version", exact=True).click()
        expect(page.get_by_role("radio", name="Benign version", exact=True)).to_be_checked()
        expect(result).to_have_count(0)
        expect(page.locator(".sb-buoc")).to_contain_text("Step 2 of 3")  # Benign skips the DEMO step
        page.get_by_role("button", name="Claim 1,000 SOLB", exact=True).click()
        expect(wallet.locator(".kn-muc")).to_be_visible(timeout=90000)
        report["benign"] = wallet.locator(".kn-yeu-cau").inner_text()
        assert wallet.locator(".kn-muc").inner_text() != "Danger"
        if args.allow_devnet_send:
            wallet.locator("#kn-khoa").set_input_files(".devnet/vi-demo.json")
            checkbox = wallet.get_by_role("checkbox")
            if checkbox.count(): checkbox.check()
            wallet.get_by_role("button", name="Sign", exact=True).click() if wallet.get_by_role("button", name="Sign", exact=True).count() else wallet.get_by_role("button", name="Sign anyway", exact=True).click()
            expect(page.locator(".sb-receipt")).to_have_attribute("data-outcome", "xong", timeout=90000)
            assert len(report["sends"]) == 1
            assert page.locator("[data-ket-qua=chan]").count() == 0, "a 'Blocked' result must never show after a real send"
            assert urlparse(report["sends"][0]).netloc == urlparse(page.url).netloc
            report["signatureUrl"] = page.locator("[data-signature]").get_attribute("href")
            report["checks"].append("benign -> inspect -> user signature -> dApp sends exactly once -> confirmed on Devnet")
        else:
            wallet.get_by_role("button", name="Block transaction", exact=True).click()
            report["checks"].append("benign inspected; signing/send skipped (no opt-in)")
        wallet.close()
        expect(page.get_by_role("button", name="Reopen wallet window", exact=True)).to_be_enabled(timeout=15000)
        expect(page.locator(".sb-cua-so")).to_contain_text("wallet window was closed")
        report["checks"].append("popup closed -> adapter disconnect -> in-card 'Reopen wallet window' available")
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
        expect(page.get_by_role("radio", name="Benign version", exact=True)).to_be_disabled()
        with page.expect_popup() as popup2:
            page.get_by_role("button", name="Connect wallet", exact=True).click()
        wallet2 = popup2.value
        wallet2.get_by_role("button", name="Allow connection", exact=True).click()
        expect(page.get_by_role("button", name="Disconnect", exact=True)).to_be_visible()
        expect(page.get_by_role("button", name="Claim 1,000 SOLB", exact=True)).to_be_disabled()
        assert page.evaluate("sessionStorage.getItem('solbonus.pending.v1')")
        wallet2.close()
        page.evaluate("sessionStorage.removeItem('solbonus.pending.v1')")
        report["checks"].append("fault injection: pending signature survives reload and reconnect; submit and mode toggle stay locked")
        # Separate fault injection: the browser blocks the popup (window.open returns null).
        blocked = context.new_page()
        blocked.add_init_script("window.open = () => null")
        blocked.goto(args.url, wait_until="networkidle")
        blocked.get_by_role("button", name="Connect wallet", exact=True).click()
        expect(blocked.locator(".sb-cua-so")).to_contain_text("blocked the wallet window")
        expect(blocked.get_by_role("button", name="Reopen wallet window", exact=True)).to_be_enabled()
        blocked.close()
        report["checks"].append("fault injection: popup blocked -> in-card 'Reopen wallet window' (user click reopens)")
        report["ok"] = True
    except Exception as e:
        report["failure"] = str(e)
        page.screenshot(path=str(out / "failure.png"), full_page=True)
        raise
    finally:
        (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        browser.close()
