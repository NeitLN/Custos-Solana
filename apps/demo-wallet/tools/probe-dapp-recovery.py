"""Regression: startup/recovery UI. Real browser, no signing or chain writes.

Run with both development servers running: python -X utf8 apps/demo-wallet/tools/probe-dapp-recovery.py
"""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path

URL = 'http://localhost:5188/?thucThi=1'
WALLET = 'AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ'
KEY = 'custos.session.v2.devnet.' + WALLET
OUT = Path('build/test-dapp-recovery')
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context()
    errors, writes = [], []

    def guard(route):
        try:
            method = (route.request.post_data_json or {}).get('method')
        except Exception:
            method = None
        if method in ('sendTransaction', 'requestAirdrop'):
            writes.append(method)
            route.abort()
        else:
            route.continue_()

    context.route('**/*', guard)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(URL, wait_until='networkidle')
        page.reload(wait_until='networkidle')
        expect(page.get_by_role('button', name='Khôi phục phiên đã lưu', exact=True)).to_have_count(0)
        expect(page.locator('.wallet-dapp-ly-do')).to_contain_text('Chọn file khoá')
        print('PASS: opening then reloading an unused wallet does not block on recovery')

        # An unresolved signature must still block creating/discarding a session.
        snapshot = dict(version=2, cluster='devnet', wallet=WALLET, accounts=None,
                        setupPending=None, unresolved=True, receipts=[])
        page.evaluate('([key, value]) => localStorage.setItem(key, JSON.stringify(value))', [KEY, snapshot])
        page.reload(wait_until='networkidle')
        expect(page.locator('.wallet-actions').get_by_role('button', name='Khôi phục phiên đã lưu', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Bỏ bản lưu cục bộ', exact=True)).to_be_disabled()
        expect(page.get_by_role('button', name='Ký tạo phiên thử nghiệm', exact=True)).to_be_disabled()
        expect(page.locator('.wallet-gift')).to_be_disabled()
        assert page.evaluate('key => JSON.parse(localStorage.getItem(key)).unresolved', KEY)
        print('PASS: recovery is actionable beside dApp; unresolved cache remains protected')

        page.add_script_tag(path='node_modules/axe-core/axe.min.js')
        for width in (1440, 375):
            page.set_viewport_size(dict(width=width, height=900))
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            violations = page.evaluate('async () => (await axe.run()).violations.map(v => v.id)')
            assert not violations, violations
            page.screenshot(path=str(OUT / f'recovery-{width}.png'), full_page=True)
        assert not errors, errors
        assert not writes, writes
        print('PASS: desktop/mobile, no page errors, no chain writes')
    finally:
        browser.close()
