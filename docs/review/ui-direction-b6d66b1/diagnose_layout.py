import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
URL='http://localhost:5198/Custos-Solana/gioi-thieu.html?lang=vi'
result={}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.goto(URL,wait_until='networkidle')
    def rects():
        return page.evaluate('''() => Object.fromEntries(['.lg-hero .lg-shell','.lg-dai__ds','.lg-chip--transfer','.lg-chip--auth','.lg-preview__dau','.lg-preview__ten','.lg-preview__mang'].map(s=>{const el=document.querySelector(s);const b=el.getBoundingClientRect(), c=getComputedStyle(el);return [s,{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom,marginLeft:c.marginLeft,marginRight:c.marginRight,paddingLeft:c.paddingLeft,position:c.position}]}))''')
    result['desktopBefore']=rects()
    page.add_style_tag(content='.custos-landing ul.lg-shell { margin-inline: auto; }')
    result['desktopAfterBrowserOnlyMarginTest']=rects()
    page.set_viewport_size({'width':320,'height':844})
    page.goto(URL,wait_until='networkidle')
    result['mobile320Rects']=rects()
    result['overflow']=page.evaluate('''() => Array.from(document.querySelectorAll('body *')).map(el=>({el,b:el.getBoundingClientRect()})).filter(({b})=>b.width&& (b.right>window.innerWidth+1 || b.left< -1)).map(({el,b})=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,100),x:b.x,width:b.width,right:b.right,whiteSpace:getComputedStyle(el).whiteSpace,minWidth:getComputedStyle(el).minWidth})).slice(0,35)''')
    result['beforeWidth']=page.evaluate('document.documentElement.scrollWidth')
    page.add_style_tag(content='@media(max-width:359px){.lg-header__phai>.lg-ngon{display:none}}')
    result['afterBrowserOnlyHideHeaderLanguageWidth']=page.evaluate('document.documentElement.scrollWidth')
    page.set_viewport_size({'width':390,'height':844})
    result['mobile390Rects']=rects()
    browser.close()
(OUT/'layout-diagnosis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
