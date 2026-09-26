"""Read-only final-build verification using public prior setup/receipt references.
Injected unresolved cache is explicitly a fault fixture, not new chain evidence.
"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
out=pathlib.Path('docs/review/live-devnet/session-recovery');out.mkdir(parents=True,exist_ok=True)
evidence=json.loads(pathlib.Path('docs/review/live-devnet/realistic-wallet-run4/browser.json').read_text(encoding='utf-8'))
wallet=evidence['wallet']; key='custos.session.v2.devnet.'+wallet
report={'checks':[],'writes':[],'errors':[]}
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':1000},record_video_dir=str(out/'video'))
    def guard(route):
        try: method=(route.request.post_data_json or {}).get('method','')
        except Exception: method=''
        if method in ('sendTransaction','requestAirdrop'):
            report['writes'].append(method);route.abort()
        else:route.continue_()
    context.route('**/*',guard)
    page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
    try:
        url='http://127.0.0.1:5192/Custos-Solana/'
        page.goto(url,wait_until='networkidle')
        # Deliberately modify public index from another tab, mirroring a pending send.
        other=context.new_page();other.goto(url,wait_until='networkidle')
        other.evaluate("key => {const s=JSON.parse(localStorage.getItem(key));s.unresolved=true;localStorage.setItem(key,JSON.stringify(s));}",key)
        pending=other.evaluate('key=>localStorage.getItem(key)',key)
        page.get_by_role('button',name='Cập nhật số dư',exact=True).click()
        page.get_by_role('alert').get_by_text('Phiên ví đã thay đổi ở tab khác.',exact=False).wait_for()
        assert page.evaluate('key=>localStorage.getItem(key)',key)==pending
        report['checks'].append('two tabs: foreign pending cache blocks stale controller and is not overwritten (fault fixture; no transaction sent)')
        other.close()
        page.reload(wait_until='networkidle')
        assert page.get_by_role('button',name='Bỏ bản lưu cục bộ',exact=True).is_disabled()
        assert page.evaluate('key=>localStorage.getItem(key)',key)==pending
        report['checks'].append('new tab cannot discard a saved unresolved send through the UI')
        # Query an actual historical receipt with forged success fields in cache.
        r=evidence['receipts'][1]
        snapshot={'version':2,'cluster':'devnet','wallet':wallet,'accounts':None,'setupPending':None,'unresolved':False,'receipts':[r]}
        page.evaluate('([key,value])=>localStorage.setItem(key,JSON.stringify(value))',[key,snapshot])
        page.reload(wait_until='networkidle')
        page.get_by_role('button',name='Khôi phục phiên đã lưu',exact=True).click()
        page.get_by_text('Bản lưu chưa xác minh.',exact=False).wait_for(timeout=60000)
        assert 'Confirmed · slot' not in page.locator('.live-evidence').inner_text()
        page.get_by_role('button',name='Tra cứu lại',exact=True).click()
        page.get_by_text('Confirmed · slot',exact=False).wait_for(timeout=60000)
        actual=page.evaluate("JSON.parse(localStorage.getItem('custos.live-receipt.v1'))")
        assert actual['observation']['err'] is None and actual['comparison']['actualAfter']=='243750000'
        assert actual['comparison']['balance']=='unknown' # cached prediction intentionally untrusted
        report['checks'].append('restore discards cached success/prediction; read-only query obtains actual historic Devnet metadata')
        page.add_script_tag(path='node_modules/axe-core/axe.min.js')
        report['axe']={}
        for width in [1440,375]:
            page.set_viewport_size({'width':width,'height':1000})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            v=page.evaluate('async()=>(await axe.run()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))')
            report['axe'][str(width)]=v; assert not v,v
            page.screenshot(path=str(out/f'restored-{width}.png'),full_page=True)
        assert not report['writes'] and not report['errors']
        report['passed']=True
    except Exception as e:
        report['passed']=False;report['error']=str(e);page.screenshot(path=str(out/'failure.png'),full_page=True);raise
    finally:
        context.close();browser.close()
        (out/'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False))
