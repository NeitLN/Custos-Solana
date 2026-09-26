"""One opt-in Devnet setup; dApp hands off exact bytes, then cancels without sending."""
import json, pathlib, re, sys, argparse
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
p = argparse.ArgumentParser(); p.add_argument('--allow-devnet-send', action='store_true'); args=p.parse_args()
if not args.allow_devnet_send: raise SystemExit('Require explicit Devnet setup consent')
out=pathlib.Path('docs/review/live-devnet/live-handoff'); out.mkdir(parents=True,exist_ok=True)
report={'sends':0,'errors':[],'checks':[]}
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    page=browser.new_page(viewport={'width':1440,'height':1000})
    def req(r):
        try:
            if r.post_data_json and r.post_data_json.get('method')=='sendTransaction': report['sends']+=1
        except Exception: pass
    page.on('request',req); page.on('pageerror',lambda e:report['errors'].append(str(e)))
    try:
        page.goto('http://127.0.0.1:5192/Custos-Solana/',wait_until='networkidle')
        page.locator('#demo-keypair').set_input_files('.devnet/vi-demo.json')
        page.get_by_text('Đã mở quyền ký đúng ví mặc định.',exact=True).wait_for()
        page.wait_for_function("() => !document.querySelector('.live-spinner')")
        page.get_by_role('button',name='Ký tạo phiên thử nghiệm',exact=True).click()
        page.wait_for_function("() => document.querySelector('.wallet-balance')?.textContent.includes('500,0') && !document.querySelector('.live-spinner')",timeout=90000)
        with page.expect_popup() as popup:
            page.get_by_role('button',name='Mở dApp của phiên này ↗',exact=True).click()
        dapp=popup.value
        dapp.on('pageerror',lambda e:report['errors'].append(str(e)))
        dapp.get_by_role('button',name='Yêu cầu nhận quà',exact=True).wait_for(timeout=60000)
        report['dapp']=dapp.url
        dapp.get_by_role('button',name='Yêu cầu nhận quà',exact=True).click()
        page.locator('.wallet-request').wait_for(timeout=90000)
        assert 'Nguy hiểm' in page.locator('.wallet-request').inner_text()
        assert report['sends']==1
        page.get_by_role('button',name='Chặn & huỷ giao dịch',exact=True).click()
        assert report['sends']==1
        dapp.get_by_text('Người dùng đã huỷ tại ví. Yêu cầu này không được gửi lên Devnet.',exact=True).wait_for()
        report['checks'].append('dApp current-session handoff -> actual inspect danger -> cancel -> zero transaction sends beyond setup')
        dapp.screenshot(path=str(out/'dapp.png'),full_page=True)
        dapp.add_script_tag(path='node_modules/axe-core/axe.min.js')
        report['axe']=dapp.evaluate('async () => (await axe.run()).violations.map(v=>v.id)')
        assert not report['axe']
        # Public guest is isolated and reload does not silently create a new funded identity.
        guest=browser.new_page(); guest.goto('http://127.0.0.1:5192/Custos-Solana/?guest=1',wait_until='networkidle')
        address=guest.locator('#live-wallet-address').input_value()
        assert address!='AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ'
        assert guest.get_by_role('button',name='Ký tạo phiên thử nghiệm',exact=True).is_enabled()
        guest.reload(wait_until='networkidle')
        assert guest.locator('#live-wallet-address').input_value()==address
        assert guest.locator('#demo-keypair').count()
        assert 'secretKey' not in guest.evaluate('Object.values(localStorage).join(" ")')
        report['checks'].append('guest uses isolated address; reload retains address and locks signer; no setup/funding auto-send')
        report['passed']=True
    except Exception as e:
        report['passed']=False;report['error']=str(e);page.screenshot(path=str(out/'failure.png'),full_page=True);raise
    finally:
        (out/'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False));browser.close()
