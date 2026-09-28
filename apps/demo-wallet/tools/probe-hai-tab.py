"""HAI TAB THẬT trên Devnet — CK-07. Cùng trình duyệt (chung localStorage và Web Locks), cùng ví cố định.

    npm run vi   (VITE_RPC riêng trong .env.local nếu RPC công cộng chập chờn)
    python apps/demo-wallet/tools/probe-hai-tab.py --allow-devnet-send --url "http://localhost:5188/?thucThi=1"

Unit test (`liveSourceStore.test.ts`) giả lập storage; bài này chạy hai tab thật:

  1 · CAS    tab A tạo phiên (gửi thật) ⇒ tab B mở TRƯỚC đó thành cũ: B bấm tạo phiên phải bị
             chặn "tab khác", B KHÔNG gửi gì.
  2 · KHÔI PHỤC  B tải lại + khôi phục ⇒ thấy đúng phiên của A; B chuyển 1 DEMO (gửi thật).
  3 · CAS ngược  A giờ là tab cũ: A chuẩn bị giao dịch phải bị chặn "tab khác", A KHÔNG gửi gì.
  4 · WEB LOCK   A tải lại + khôi phục; A và B bấm chuẩn bị CÙNG LÚC ⇒ đúng một tab được làm,
             tab kia báo "đang được thao tác trong tab khác". Huỷ yêu cầu còn lại — không gửi.

Ghi biên bản công khai (không bao giờ ghi byte khoá). Không bao giờ tự gửi lại giao dịch.
"""
import argparse, json, pathlib, re, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--allow-devnet-send', action='store_true')
ap.add_argument('--url', default='http://localhost:5188/?thucThi=1')
ap.add_argument('--out', default='docs/review/ck-20260928/live-hai-tab')
args = ap.parse_args()
if not args.allow_devnet_send: raise SystemExit('Cần --allow-devnet-send: gửi giao dịch Devnet thật bằng ví demo cố định.')
out = pathlib.Path(args.out); out.mkdir(parents=True, exist_ok=True)
VI = 'AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ'
bao = {'url': args.url, 'gui': {'A': 0, 'B': 0}, 'checks': [], 'loi': [], 'chuKy': []}

def luu(): (out / 'browser.json').write_text(json.dumps(bao, ensure_ascii=False, indent=2), encoding='utf-8')
def ck(ten, dat, chi_tiet=''):
    bao['checks'].append({'ten': ten, 'dat': bool(dat), 'chiTiet': chi_tiet}); luu()
    print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f'   ({chi_tiet})' if chi_tiet else ''), flush=True)
    if not dat: raise AssertionError(ten)

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1050})
    tab = {}
    def mo(ten):
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: bao['loi'].append(f'{ten}: {e}'))
        def dem(r):
            try:
                if r.post_data_json and r.post_data_json.get('method') == 'sendTransaction': bao['gui'][ten] += 1
            except Exception: pass
        pg.on('request', dem)
        tab[ten] = pg
        return pg
    def nap(pg):
        pg.goto(args.url, wait_until='networkidle')
        assert pg.locator('#live-wallet-address').input_value() == VI
        pg.locator('#demo-keypair').set_input_files('.devnet/vi-demo.json')
        pg.wait_for_function("() => !document.querySelector('.live-spinner')", timeout=90000)
    def nut(pg, ten): return pg.get_by_role('button', name=ten, exact=True)
    def cho(pg): pg.wait_for_function("() => !document.querySelector('.live-spinner')", timeout=90000)
    def canh_bao(pg): return ' | '.join(pg.locator('[role=alert]').all_inner_texts())
    def khoi_phuc(pg):
        pg.reload(wait_until='networkidle')
        nut(pg, 'Khôi phục phiên đã lưu').click(); cho(pg)
        pg.locator('#demo-keypair').set_input_files('.devnet/vi-demo.json'); cho(pg)
    def chuan_bi_chuyen(pg, so='1'):
        if not pg.locator('#demo-send-amount').count(): nut(pg, 'Gửi DEMO').click()
        pg.locator('#demo-send-amount').fill(so)
        nut(pg, 'Kiểm tra giao dịch gửi').click()

    try:
        A, B = mo('A'), mo('B')
        nap(A); nap(B)

        print('1 · CAS: A tạo phiên, B (mở trước) thành tab cũ')
        nut(A, 'Ký tạo phiên thử nghiệm').click()
        A.wait_for_function("() => document.querySelector('[role=alert]') || (document.querySelector('.wallet-balance')?.textContent.includes('500,0') && !document.querySelector('.live-spinner'))", timeout=120000)
        ck('A tạo phiên thành công', '500,0' in A.locator('.wallet-balance').inner_text(), canh_bao(A))
        gui_b = bao['gui']['B']
        # Chạy thật 28/09: B TỰ phát hiện phiên A vừa lưu — hiện "Có phiên đã lưu…" và vô hiệu nút tạo
        # phiên. Chặt hơn chặn "tab khác" lúc bấm: tab cũ không có đường nào để ghi đè ngay từ đầu.
        B.wait_for_selector('text=Có phiên đã lưu trên máy', timeout=30000)
        ck('B cũ thấy phiên đã lưu của A, nút tạo phiên bị vô hiệu', nut(B, 'Ký tạo phiên thử nghiệm').is_disabled())
        ck('B cũ KHÔNG gửi giao dịch nào', bao['gui']['B'] == gui_b)

        print('2 · B khôi phục phiên của A rồi chuyển 1 DEMO')
        khoi_phuc(B)
        ck('B khôi phục thấy đúng phiên của A', '500,0' in B.locator('.wallet-balance').inner_text())
        chuan_bi_chuyen(B); B.wait_for_selector('.wallet-request, [role=alert]', timeout=90000); cho(B)
        ck('B chuẩn bị được yêu cầu ký', B.locator('.wallet-request').count() == 1, canh_bao(B)[:120])
        req = B.locator('.wallet-request')
        # Cùng trình tự `execute()` của probe-realistic-wallet: bước "Ký giao dịch / Vẫn ký" mở ô đồng ý.
        buoc1 = req.get_by_role('button', name=re.compile(r'^(Ký giao dịch|Vẫn ký)'))
        if buoc1.count(): buoc1.click()
        req.locator('.wallet-consent input').check()
        req.get_by_role('button', name=re.compile(r'^(Đã xem, vẫn ký và gửi|Bỏ qua cảnh báo và gửi|Ký và gửi trên Devnet)$')).click()
        B.wait_for_function("() => document.querySelector('[role=alert]') || (!document.querySelector('.wallet-request') && !document.querySelector('.live-spinner') && JSON.parse(localStorage.getItem('custos.live-receipt.v1') || 'null')?.observation)", timeout=120000)
        r = B.evaluate("JSON.parse(localStorage.getItem('custos.live-receipt.v1') || 'null')")
        ck('B gửi 1 DEMO, chuỗi xác nhận', bool(r and r.get('observation') and r['observation'].get('err') is None), canh_bao(B)[:120])
        bao['chuKy'].append({'tab': 'B', 'loai': r.get('kind'), 'chuKy': r.get('signature'), 'soDu': (r.get('comparison') or {}).get('balance')})

        print('3 · CAS ngược: A giờ là tab cũ')
        gui_a = bao['gui']['A']
        chuan_bi_chuyen(A); A.wait_for_selector('[role=alert], .wallet-request', timeout=60000); cho(A)
        ck('A cũ chuẩn bị ⇒ bị chặn "tab khác", không có yêu cầu ký', 'tab khác' in canh_bao(A) and A.locator('.wallet-request').count() == 0, canh_bao(A)[:120])
        ck('A cũ KHÔNG gửi giao dịch nào', bao['gui']['A'] == gui_a)

        print('4 · Web Lock: hai tab bấm chuẩn bị cùng lúc')
        khoi_phuc(A); khoi_phuc(B)
        for pg in (A, B):
            if not pg.locator('#demo-send-amount').count(): nut(pg, 'Gửi DEMO').click()
            pg.locator('#demo-send-amount').fill('1')
        gui_truoc = dict(bao['gui'])
        # Bấm gần như đồng thời: hai `click()` DOM trong cùng một nhịp của mỗi tab.
        A.evaluate("() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Kiểm tra giao dịch gửi').click()")
        B.evaluate("() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Kiểm tra giao dịch gửi').click()")
        for pg in (A, B): pg.wait_for_selector('.wallet-request, [role=alert]', timeout=90000); cho(pg)
        co_yeu_cau = [t for t, pg in (('A', A), ('B', B)) if pg.locator('.wallet-request').count()]
        bi_chan = [t for t, pg in (('A', A), ('B', B)) if 'tab khác' in canh_bao(pg)]
        ck('đúng MỘT tab có yêu cầu ký, tab kia bị chặn "tab khác"', len(co_yeu_cau) == 1 and len(bi_chan) == 1 and co_yeu_cau != bi_chan,
           f'có yêu cầu: {co_yeu_cau} · bị chặn: {bi_chan}')
        for t in co_yeu_cau:
            # Nhãn huỷ theo mức (`CanhBao.tsx` → HANH_DONG): An toàn "Huỷ", Cần xem kỹ "Huỷ giao dịch", Nguy hiểm "Chặn & huỷ…".
            tab[t].locator('.wallet-request').get_by_role('button', name=re.compile(r'^(Huỷ|Huỷ giao dịch|Chặn & huỷ giao dịch)$')).first.click()
            # Huỷ cũng đi qua Web Lock (`run`) nên xong BẤT ĐỒNG BỘ — chờ yêu cầu rời DOM, có hạn.
            try:
                tab[t].wait_for_selector('.wallet-request', state='detached', timeout=20000); het = True
            except Exception:
                het = False
            ck(f'{t}: huỷ xong, không còn yêu cầu ký', het, canh_bao(tab[t])[:120])
        ck('huỷ yêu cầu còn lại ⇒ không gửi thêm gì', bao['gui'] == gui_truoc)
        ck('0 pageerror trên hai tab', not bao['loi'], '; '.join(bao['loi'][:2]))
        bao['passed'] = True
    except Exception as e:
        bao['passed'] = False; bao['error'] = str(e)[:300]
        for t, pg in tab.items(): pg.screenshot(path=str(out / f'failure-{t}.png'), full_page=True)
        raise
    finally:
        luu(); print(json.dumps({k: v for k, v in bao.items() if k != 'checks'}, ensure_ascii=False), flush=True)
        browser.close()
