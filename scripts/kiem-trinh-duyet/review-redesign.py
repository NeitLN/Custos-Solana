"""Capture the local production build without signing or broadcasting."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PHASE = sys.argv[1] if len(sys.argv) > 1 else 'after'
OUT = ROOT / 'docs' / 'review' / 'redesign-sections' / PHASE
OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:5198/Custos-Solana/'
report = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    for width,route,name in [(1440,'gioi-thieu.html?lang=vi','landing'),(390,'gioi-thieu.html?lang=vi','mobile'),(320,'gioi-thieu.html?lang=en','narrow-en'),(1440,'?khongkhoa=1','wallet'),(1440,'soi.html','inspector')]:
        page.set_viewport_size({'width':width,'height':900 if width>768 else 844})
        page.goto(BASE+route,wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        fonts = page.evaluate('Array.from(document.fonts).filter(f => f.status === "loaded").map(f => f.family)')
        if name in ['landing','mobile','narrow-en']:
            assert 'Manrope' in fonts and 'Be Vietnam Pro' in fonts, (name, fonts)
        page.wait_for_timeout(650)
        page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
        if name=='landing':page.screenshot(path=str(OUT/'hero.png'))
        report.append({'name':name,'width':width,'dimensions':page.evaluate('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})'),'fonts':fonts,'errors':list(errors)})
    browser.close()
(OUT/'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
