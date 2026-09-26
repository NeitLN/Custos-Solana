"""Opt-in live browser test using the configured default Devnet wallet.
Requires a funded default wallet; imports local keypair into the same UI as the user.
"""
import argparse, json, pathlib, sys, re
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
p = argparse.ArgumentParser()
p.add_argument("--allow-devnet-send", action="store_true")
p.add_argument("--url", default="http://127.0.0.1:5192/Custos-Solana/")
p.add_argument("--out", default="docs/review/live-devnet")
args = p.parse_args()
if not args.allow_devnet_send: raise SystemExit("Explicit --allow-devnet-send is required")
out = pathlib.Path(args.out); out.mkdir(parents=True, exist_ok=True)
report = {"url": args.url, "console": [], "sends": [], "receipts": [], "checks": []}

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width":1440,"height":1000})
    page.on("pageerror", lambda e: report["console"].append(str(e)))
    page.on("console", lambda msg: report["console"].append(msg.text) if msg.type == "error" else None)
    def request(req):
        try:
            body = req.post_data_json
            if body and body.get("method") == "sendTransaction": report["sends"].append({"method":"sendTransaction"})
        except Exception: pass
    page.on("request", request)
    def idle():
        page.wait_for_function("() => !document.querySelector('.live-spinner')", timeout=90000)
        error = page.locator('[role="alert"]')
        if error.count(): raise AssertionError(error.inner_text())
    def prepare(name):
        # Avoid exceeding the public Devnet per-method quota during automated demos.
        page.wait_for_timeout(10000)
        page.get_by_role("button", name=name).click(); idle()
        page.locator('.wallet-request').wait_for(timeout=60000)
        page.evaluate("async () => Promise.all(document.getAnimations().filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})))")
    def execute():
        if page.locator('.wallet-request').get_by_role('button', name=re.compile(r'^(Ký giao dịch|Vẫn ký)')).count():
            page.locator('.wallet-request').get_by_role('button', name=re.compile(r'^(Ký giao dịch|Vẫn ký)')).click()
        page.get_by_role('checkbox').check()
        page.get_by_role('button', name='Ký và gửi trên Devnet', exact=True).click(); idle()
        for _ in range(4):
            if page.locator('.live-evidence [data-result="match"]').count(): break
            page.get_by_role('button', name='Tra cứu lại', exact=True).click()
            idle()
            page.wait_for_timeout(1500)
        receipt = page.evaluate("JSON.parse(localStorage.getItem('custos.live-receipt.v1'))")
        assert receipt['observation']['err'] is None, receipt
        assert receipt['comparison']['balance'] == 'match', receipt
        report['receipts'].append(receipt)
    try:
        page.goto(args.url, wait_until='networkidle')
        wallet = page.locator('#live-wallet-address').input_value()
        assert page.get_by_role('link', name='Ví mẫu', exact=True).get_attribute('aria-current') == 'page'
        assert page.get_by_role('link', name='Giao dịch thật', exact=True).count() == 0
        page.locator('#demo-keypair').set_input_files('.devnet/vi-demo.json')
        page.get_by_text('Đã mở quyền ký đúng ví mặc định.',exact=True).wait_for()
        idle()
        report['wallet'] = wallet
        page.get_by_role('button',name='Ký tạo phiên thử nghiệm',exact=True).click(); idle()
        assert '500,0' in page.locator('.wallet-balance').inner_text()
        report['checks'].append('isolated setup confirmed: 500 DEMO')
        prepare('Gửi 10 DEMO'); execute()
        report['checks'].append('protected ordinary transfer confirmed with matching metadata')
        page.screenshot(path=str(out/'01-normal.png'),full_page=True)
        before = len(report['sends'])
        prepare(re.compile('^Nhận quà tặng'))
        assert 'Nguy hiểm' in page.locator('.wallet-request').inner_text()
        page.screenshot(path=str(out/'02-protected.png'),full_page=True)
        page.get_by_role('button',name='Chặn & huỷ giao dịch',exact=True).click()
        assert len(report['sends']) == before
        report['checks'].append('protected attack cancelled: zero send requests')
        page.get_by_role('switch',name='Bảo vệ bằng Custos').click()
        prepare(re.compile('^Nhận quà tặng')); execute()
        assert report['receipts'][-1]['comparison']['authority'] == 'match'
        report['checks'].append('unprotected attack confirmed: token delta and changed owner match prediction')
        page.screenshot(path=str(out/'03-executed.png'),full_page=True)
        page.set_viewport_size({'width':375,'height':812})
        page.screenshot(path=str(out/'04-mobile.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.add_script_tag(path='node_modules/axe-core/axe.min.js')
        report['axe'] = page.evaluate('async () => (await axe.run()).violations.map(v => ({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))')
        page.get_by_role('button',name='Ký tạo phiên mới',exact=True).click(); idle()
        assert '500,0' in page.locator('.wallet-balance').inner_text()
        prepare('Gửi 10 DEMO'); execute()
        report['checks'].append('new isolated session and unprotected ordinary transfer confirmed')
        # Switching to advanced analysis and back must not destroy the signing wallet.
        page.get_by_role('button', name='Phòng phân tích', exact=True).click()
        page.get_by_role('button', name='Ví của bạn', exact=True).click()
        page.get_by_role('button', name='Nhận SOL', exact=False).click()
        assert page.locator('#live-wallet-address').input_value() == wallet
        assert '490,0' in page.locator('.wallet-execution .wallet-balance').inner_text()
        report['checks'].append('wallet identity and balance preserved across same-page analysis switch')
        assert not report['console'], report['console']
        assert not report['axe'], report['axe']
        report['passed'] = True
    except Exception as e:
        report['passed'] = False; report['error'] = str(e)
        page.screenshot(path=str(out/'failure.png'),full_page=True)
        raise
    finally:
        (out/'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({k:v for k,v in report.items() if k!='receipts'},ensure_ascii=False,indent=2))
        browser.close()
