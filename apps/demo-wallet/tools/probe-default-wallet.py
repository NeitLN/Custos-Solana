"""Read-only integration: stable wallet address, local key unlock, no signing/sending."""
import json, pathlib
from playwright.sync_api import sync_playwright

address = "AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ"
out = pathlib.Path("docs/review/live-devnet/default-wallet")
out.mkdir(parents=True, exist_ok=True)
report = {"address": address, "writes": [], "errors": [], "checks": []}
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width":1440,"height":1000})
    page.on("pageerror", lambda e: report["errors"].append(str(e)))
    def guard(route):
        try: method = (route.request.post_data_json or {}).get("method", "")
        except Exception: method = ""
        if method in ("sendTransaction", "requestAirdrop"):
            report["writes"].append(method); route.abort()
        else: route.continue_()
    page.route("**/*", guard)
    try:
        page.goto("http://127.0.0.1:5192/Custos-Solana/", wait_until="networkidle")
        assert page.locator('#live-wallet-address').input_value() == address
        assert page.get_by_role('button',name='Ký tạo phiên thử nghiệm',exact=True).is_disabled()
        assert page.get_by_role('link',name='Mở Solana Faucet').get_attribute('href') == 'https://faucet.solana.com/'
        page.locator('#demo-keypair').set_input_files('.devnet/vi-demo.json')
        page.get_by_text('Đã mở quyền ký đúng ví mặc định.',exact=True).wait_for()
        page.wait_for_function("() => !document.querySelector('.live-spinner')",timeout=60000)
        assert page.locator('[role=alert]').count() == 0
        assert page.get_by_role('button',name='Ký tạo phiên thử nghiệm',exact=True).is_enabled()
        report['checks'].append('matching local key unlocks fixed wallet without send')
        # No key bytes in storage; reloading locks signing but retains public identity.
        stored = page.evaluate('Object.values(localStorage).join(" ")')
        assert 'secretKey' not in stored and 'privateKey' not in stored
        page.reload(wait_until='networkidle')
        if page.get_by_role('button',name='Bỏ bản lưu cục bộ',exact=True).count():
            page.get_by_role('button',name='Bỏ bản lưu cục bộ',exact=True).click()
        assert page.locator('#live-wallet-address').input_value() == address
        assert page.get_by_role('button',name='Ký tạo phiên thử nghiệm',exact=True).is_disabled()
        report['checks'].append('reload preserves address and forgets private key')
        page.add_script_tag(path='node_modules/axe-core/axe.min.js')
        for width in [1440,375]:
            page.set_viewport_size({'width':width,'height':1000})
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            violations = page.evaluate('async () => (await axe.run()).violations.map(v=>v.id)')
            assert not violations, violations
            page.screenshot(path=str(out/f'wallet-{width}.png'),full_page=True)
        assert not report['writes'] and not report['errors']
        report['passed'] = True
    except Exception as e:
        report['passed'] = False; report['error'] = str(e)
        raise
    finally:
        (out/'browser.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=True))
        browser.close()
