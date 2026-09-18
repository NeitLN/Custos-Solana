"""Review current landing typography, destination links and decorative motion.
Usage: python -X utf8 scripts/kiem-trinh-duyet/verify-typography.py [base_url]
No wallet interaction or network transactions.
"""
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/review' / (sys.argv[2] if len(sys.argv) > 2 else 'typography-lens')
OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:53579/'
report = {'layouts': [], 'errors': [], 'axe': [], 'checks': []}
hide_fixed = '.lg-header,.cine-motion-control,.cine-reading-progress{visibility:hidden!important}'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1050})
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    page.goto(BASE + 'gioi-thieu.html?lang=vi', wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(1400)
    expect(page.get_by_role('heading', level=1)).to_have_accessible_name('Hiểu điều bạn sắp ký.')
    font = page.locator('h1').evaluate('(el) => getComputedStyle(el).fontFamily')
    assert 'Be Vietnam Pro' in font
    assert page.evaluate('document.fonts.check(\'700 48px "Be Vietnam Pro"\', "Hiểu điều bạn sắp ký")')
    page.screenshot(path=str(OUT / 'hero.png'))
    page.locator('.lg-hero__story').screenshot(path=str(OUT / 'hero-story.png'), style=hide_fixed)
    symbol = page.locator('.inspection-lens__symbol')
    frame = symbol.evaluate('(el) => getComputedStyle(el).transform')
    page.wait_for_timeout(500)
    assert frame != symbol.evaluate('(el) => getComputedStyle(el).transform')
    page.get_by_role('button', name='Dừng chuyển động').click()
    assert page.evaluate('document.getAnimations().filter(a => a.playState === "running").length') == 0
    report['checks'].append('Vietnamese display font loaded; lens animates and respects pause')
    page.locator('.lg-thongtin').screenshot(path=str(OUT / 'destinations.png'), style=hide_fixed)
    links = page.locator('.cine-resource')
    expect(links).to_have_count(4)
    expect(links.nth(0)).to_have_attribute('href', urlsplit(BASE).path)
    expect(links.nth(2)).to_have_attribute('href', urlsplit(BASE).path + 'soi.html')
    for index, target in [(1, '#nha-phat-trien'), (3, '#bang-chung')]:
        links.nth(index).focus()
        page.keyboard.press('Enter')
        assert page.url.endswith(target)
        assert page.locator(target).count() == 1
    report['checks'].append('Resource destinations are real links; keyboard activates SDK and evidence anchors')
    for width in [320, 390, 768, 1024, 1440]:
        for lang in ['vi', 'en']:
            page.set_viewport_size({'width': width, 'height': 900})
            page.goto(BASE + 'gioi-thieu.html?lang=' + lang, wait_until='networkidle')
            page.emulate_media(reduced_motion='reduce')
            page.evaluate('document.fonts.ready')
            dims = page.evaluate('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
            assert dims['scroll'] <= dims['client'], (width, lang, dims)
            assert page.evaluate('document.getAnimations().filter(a => a.playState === "running").length') == 0
            report['layouts'].append({'width': width, 'lang': lang, **dims})
            if width == 390 and lang == 'vi':
                page.screenshot(path=str(OUT / 'mobile.png'))
                page.locator('.lg-thongtin').screenshot(path=str(OUT / 'destinations-mobile.png'), style=hide_fixed)
            if width in [390, 1440]:
                page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                violations = page.evaluate('''async () => (await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v => ({id:v.id,nodes:v.nodes.map(n=>n.target)}))''')
                report['axe'].append({'width': width, 'lang': lang, 'violations': violations})
    browser.close()
(OUT / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
assert not report['errors'], report['errors']
assert not any(item['violations'] for item in report['axe']), report['axe']
print(json.dumps(report, ensure_ascii=False, indent=2))
