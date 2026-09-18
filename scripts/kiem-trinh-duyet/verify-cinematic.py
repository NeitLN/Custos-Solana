"""Verify real motion, pause/resume, OS preference changes and responsive layout.
No RPC, signing or external services. Start production preview on port 5198.
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/review' / (sys.argv[1] if len(sys.argv) > 1 else 'cinematic')
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://localhost:5198/Custos-Solana/'
report = {'checks': [], 'layouts': [], 'axe': [], 'errors': []}


def canvas_frame(page):
    return page.locator('.cine-orbits').evaluate('(canvas) => canvas.toDataURL()')


def running(page):
    return page.evaluate('document.getAnimations().filter(a => a.playState === "running").length')


def audit(page, name):
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
    result=page.evaluate('''async () => (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v => ({id:v.id,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))}))''')
    report['axe'].append({'name':name,'violations':result})


with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':1000},record_video_dir=str(OUT/'video'),record_video_size={'width':1440,'height':1000})
    page=context.new_page()
    page.on('pageerror',lambda error:report['errors'].append(str(error)))
    page.goto(BASE+'gioi-thieu.html?lang=vi',wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(1500)
    expect(page.get_by_role('heading',level=1)).to_have_accessible_name('Hiểu điều bạn sắp ký.')
    a=canvas_frame(page); page.wait_for_timeout(400); b=canvas_frame(page)
    assert a != b, 'Background canvas is not animating'
    page.mouse.move(1180,350); page.wait_for_timeout(500)
    assert page.locator('.lg-hero').evaluate('(el)=>el.style.getPropertyValue("--cine-ry")') != '0deg'
    page.screenshot(path=str(OUT/'hero.png'))
    page.get_by_role('button',name='Dừng chuyển động').click()
    expect(page.locator('.custos-landing')).to_have_attribute('data-motion','paused')
    page.wait_for_timeout(100)
    a=canvas_frame(page); page.wait_for_timeout(300); assert canvas_frame(page)==a
    assert running(page)==0
    audit(page,'desktop-paused')
    page.get_by_role('button',name='Bật chuyển động').click()
    page.wait_for_timeout(100)
    a=canvas_frame(page); page.wait_for_timeout(400); assert canvas_frame(page)!=a
    report['checks'].append('Canvas moves; pointer tilt responds; pause freezes CSS/JS/canvas; resume restores motion')
    page.locator('.cine-bridge').scroll_into_view_if_needed()
    page.wait_for_timeout(1300)
    page.screenshot(path=str(OUT/'bridge.png'))
    a=canvas_frame(page); page.wait_for_timeout(300); assert canvas_frame(page)==a
    report['checks'].append('Canvas stops drawing when hero is outside viewport')
    page.locator('#nha-phat-trien').scroll_into_view_if_needed()
    page.wait_for_timeout(1300)
    page.screenshot(path=str(OUT/'developer.png'))
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(100)
    assert running(page)==0
    expect(page.get_by_role('button',name='Đã giảm chuyển động')).to_be_disabled()
    expect(page.locator('.lg-code')).to_be_visible()
    page.emulate_media(reduced_motion='no-preference')
    expect(page.locator('.custos-landing')).to_have_attribute('data-motion','running')
    report['checks'].append('Live OS reduce-motion changes disable animations and keep content visible')
    for width in [320,390,768,1024,1440]:
        for lang in ['vi','en']:
            page.set_viewport_size({'width':width,'height':900})
            page.goto(BASE+'gioi-thieu.html?lang='+lang,wait_until='networkidle')
            page.emulate_media(reduced_motion='reduce')
            page.wait_for_timeout(100)
            dims=page.evaluate('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
            assert dims['scroll']<=dims['client'], (width,lang,dims)
            report['layouts'].append({'width':width,'lang':lang,**dims})
            assert running(page)==0
            if width==390 and lang=='vi':
                page.locator('.cine-bridge').screenshot(path=str(OUT/'bridge-mobile.png'))
                page.locator('#nha-phat-trien').screenshot(path=str(OUT/'developer-mobile.png'))
            if width==320 and lang=='en':
                page.locator('.lg-menu-nut').click()
                audit(page,'mobile-en-menu-reduced')
                page.keyboard.press('Escape')
                expect(page.locator('.lg-menu-nut')).to_be_focused()
                page.screenshot(path=str(OUT/'mobile-en.png'),full_page=True)
    page.goto(BASE+'gioi-thieu.html?lang=vi',wait_until='networkidle')
    page.get_by_role('button',name='Xem dữ kiện của ca B',exact=True).click()
    expect(page.locator('.lg-bc__ca')).to_contain_text('B')
    page.locator('.lg-bc summary').click()
    audit(page,'vi-evidence-reduced')
    page.get_by_role('button',name='Xem dữ kiện của ca A',exact=True).click()
    expect(page.locator('.lg-bc__khongco')).to_be_visible()
    assert page.locator('.lg-bc .lg-diachi').count()==0
    report['checks'].append('A/B evidence and keyboard menu remain functional')
    page.screenshot(path=str(OUT/'full-page.png'),full_page=True)
    video=page.video
    context.close()
    video.save_as(str(OUT/'cinematic-demo.webm'))
    video.delete()
    browser.close()

(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
assert not report['errors'],report['errors']
assert not any(item['violations'] for item in report['axe']), 'Accessibility violations; see results.json'
