"""UI regression checks against a production preview. No signing/broadcasting.

Run with with_server.py on port 5198, as for review-redesign.py.
Wallet results use explicitly labelled mock fixtures; Inspector only invalid input.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/review/redesign-sections/verification'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://localhost:5198/Custos-Solana/'
report = {'layouts': [], 'axe': [], 'checks': [], 'errors': [], 'failed_assets': []}


def layout(page, name):
    size = page.evaluate('({client:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth})')
    report['layouts'].append({'name': name, **size})
    assert size['scroll'] <= size['client'], (name, size)


def audit(page, name):
    # Read final colors, not a transient opacity frame during result/scroll entry.
    page.evaluate('''async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(document.getAnimations().filter(a =>
        a.effect.getComputedTiming().iterations !== Infinity
      ).map(a => a.finished.catch(() => {})));
    }''')
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("""async () => (await axe.run(document, {
      runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}
    })).violations.map(v => ({id:v.id, impact:v.impact,
      nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))}))""")
    report['axe'].append({'name': name, 'violations': violations})


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':1440,'height':1000})
    page.on('pageerror', lambda error: report['errors'].append(str(error)))
    page.on('response', lambda response: report['failed_assets'].append(response.url)
            if response.status >= 400 and response.url.startswith(BASE) else None)
    for width in [320,390,768,1024,1440]:
        for lang in ['vi','en']:
            page.set_viewport_size({'width':width,'height':900})
            page.goto(BASE+'gioi-thieu.html?lang='+lang, wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            layout(page, f'landing-{lang}-{width}')
            assert page.locator('h1').count() == 1
    audit(page, 'landing-en-desktop')
    page.goto(BASE+'gioi-thieu.html?lang=vi', wait_until='networkidle')
    page.get_by_role('button', name='Xem dữ kiện của ca B', exact=True).click()
    expect(page.locator('.lg-bc__ca')).to_contain_text('B')
    page.locator('.lg-bc summary').click()
    expect(page.locator('.lg-bc .lg-diachi')).to_be_visible()
    audit(page, 'landing-vi-evidence-b')
    page.screenshot(path=str(OUT/'evidence-b.png'), full_page=True)
    page.get_by_role('button', name='Xem dữ kiện của ca A', exact=True).click()
    expect(page.locator('.lg-bc__ca')).to_contain_text('A')
    assert page.locator('.lg-bc .lg-diachi').count() == 0
    expect(page.locator('.lg-bc__khongco')).to_be_visible()
    report['checks'].append('Evidence A/B switches correctly; no owner data from B remains in A')
    faq = page.locator('.lg-faq__muc').first
    faq.locator('summary').click()
    expect(faq).to_have_attribute('open','')
    report['checks'].append('FAQ opens with native details')
    page.set_viewport_size({'width':320,'height':844})
    page.goto(BASE+'gioi-thieu.html?lang=vi', wait_until='networkidle')
    menu = page.locator('.lg-menu-nut')
    menu.click()
    expect(menu).to_have_attribute('aria-expanded','true')
    page.locator('.lg-menu__ngon button').nth(1).click()
    expect(page.locator('html')).to_have_attribute('lang','en')
    layout(page, 'mobile-open-menu-en')
    audit(page, 'mobile-open-menu-en')
    page.keyboard.press('Escape')
    expect(menu).to_be_focused()
    expect(menu).to_have_attribute('aria-expanded','false')
    report['checks'].append('Mobile language selection and Escape focus restoration')
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        page.goto(BASE+'soi.html', wait_until='networkidle')
        layout(page, f'inspector-{width}')
        if width == 320:
            audit(page, 'inspector-mobile')
            page.screenshot(path=str(OUT/'inspector-mobile.png'), full_page=True)
    rpc_requests = []
    page.on('request', lambda request: rpc_requests.append(request.url) if 'api.devnet.solana.com' in request.url else None)
    page.locator('#tx-b64').fill('not-base64!!!')
    page.get_by_role('button', name='Kiểm giao dịch', exact=True).click()
    expect(page.locator('.inspector-result')).to_contain_text('base64')
    assert not rpc_requests, rpc_requests
    audit(page, 'inspector-invalid-input')
    report['checks'].append('Invalid Inspector input displays error without calling RPC')
    for severity in ['safe','warning','danger']:
        for width in [390,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            page.goto(BASE+f'?mock={severity}&khongkhoa=1', wait_until='networkidle')
            expect(page.get_by_text(f'Đang xem dữ liệu mock "{severity}"', exact=False)).to_be_visible()
            page.get_by_role('button', name='Nhận quà tặng', exact=False).click()
            expect(page.locator('.empty-review')).to_have_count(0)
            layout(page, f'wallet-{severity}-{width}')
            audit(page, f'wallet-{severity}-{width}')
            page.screenshot(path=str(OUT/f'wallet-{severity}-{width}.png'), full_page=True)
    report['checks'].append('Wallet safe/warning/danger mock results render at desktop and mobile sizes')
    page.emulate_media(reduced_motion='reduce')
    page.goto(BASE+'gioi-thieu.html', wait_until='networkidle')
    page.locator('#nha-phat-trien').scroll_into_view_if_needed()
    page.wait_for_timeout(150)
    assert page.evaluate('document.getAnimations().filter(a => a.playState === "running").length') == 0
    expect(page.locator('.lg-code')).to_be_visible()
    report['checks'].append('Reduced-motion retains content and has no running animations')
    browser.close()

(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'layouts':len(report['layouts']), 'checks':report['checks'],
    'axe':[{ 'name':item['name'], 'violations':item['violations']} for item in report['axe']],
    'errors':report['errors'], 'failed_assets':report['failed_assets']},ensure_ascii=False,indent=2))
assert not report['errors'], report['errors']
assert not report['failed_assets'], report['failed_assets']
assert not any(item['violations'] for item in report['axe']), 'Accessibility violations; see results.json'
