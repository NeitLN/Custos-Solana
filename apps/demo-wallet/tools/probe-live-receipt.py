"""Read-only browser verification of a previously executed, public Devnet receipt."""
import argparse, json, pathlib, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
p = argparse.ArgumentParser()
p.add_argument("--evidence", default="docs/review/live-devnet/run-02/browser.json")
p.add_argument("--url", default="http://127.0.0.1:5192/Custos-Solana/")
p.add_argument("--out", default="docs/review/live-devnet/final-receipt")
args = p.parse_args()
receipt = next(r for r in json.loads(pathlib.Path(args.evidence).read_text(encoding="utf-8"))["receipts"] if r["kind"] == "attack")
out = pathlib.Path(args.out); out.mkdir(parents=True, exist_ok=True)
report = {"url": args.url, "signature": receipt["signature"], "mode": "query-only persisted evidence recovery", "writes": [], "console": [], "viewports": []}
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width":1440, "height":1000})
    page.on("pageerror", lambda e: report["console"].append(str(e)))
    page.on("console", lambda m: report["console"].append(m.text) if m.type == "error" else None)
    def guard(route):
        try: method = (route.request.post_data_json or {}).get("method", "")
        except Exception: method = ""
        if method in ("sendTransaction", "requestAirdrop"):
            report["writes"].append(method); route.abort()
        else: route.continue_()
    page.route("**/*", guard)
    try:
        page.goto(args.url, wait_until="networkidle")
        page.evaluate("r => localStorage.setItem('custos.live-receipt.v1', JSON.stringify(r))", receipt)
        page.reload(wait_until="networkidle")
        page.get_by_role("button", name="Đọc lại bằng chứng công khai").click()
        page.wait_for_function("() => !document.querySelector('.live-spinner')", timeout=90000)
        page.locator(".live-evidence").wait_for(timeout=5000)
        # Audit the settled render, after the 350 ms receipt entrance animation.
        page.evaluate("async () => Promise.all(document.getAnimations().filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})))")
        assert page.locator('.live-evidence [data-result="match"]').count() == 2
        assert page.locator('.wallet-history li').count() == 0, 'An old receipt must not become activity of the new wallet'
        report["receipt"] = page.evaluate("JSON.parse(localStorage.getItem('custos.live-receipt.v1'))")
        page.add_script_tag(path="node_modules/axe-core/axe.min.js")
        for width, height in [(1440,1000), (375,812)]:
            page.set_viewport_size({"width":width, "height":height})
            violations = page.evaluate("async () => (await axe.run()).violations.map(v => ({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))")
            overflow = page.evaluate("document.documentElement.scrollWidth > innerWidth")
            page.locator(".live-table-wrap").focus()
            assert page.locator(".live-table-wrap").evaluate("e => e === document.activeElement")
            page.screenshot(path=str(out/f"receipt-{width}.png"), full_page=True)
            report["viewports"].append({"width":width,"axe":violations,"overflow":overflow,"tableFocusable":True})
            assert not violations and not overflow
        assert not report["writes"] and not report["console"]
        report["passed"] = True
    except Exception as e:
        report["passed"] = False; report["error"] = str(e)
        page.screenshot(path=str(out/"failure.png"), full_page=True)
        raise
    finally:
        (out/"browser.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
        print(json.dumps({k:v for k,v in report.items() if k != "receipt"},ensure_ascii=False,indent=2))
        browser.close()
