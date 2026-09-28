"""Opt-in real Devnet UI journey. Records public receipts, never key bytes."""
import argparse, json, pathlib, re, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
p = argparse.ArgumentParser()
p.add_argument('--allow-devnet-send', action='store_true')
p.add_argument('--url', default='http://127.0.0.1:5192/Custos-Solana/')
p.add_argument('--out', default='docs/review/live-devnet/realistic-wallet')
# Bắt đầu từ phân đoạn nào (A→D). Mỗi phân đoạn tự tạo phiên mới, nên chạy tiếp từ B/C/D
# không lặp lại giao dịch của phân đoạn trước — tiết kiệm SOL khi RPC làm lượt trước dừng giữa chừng.
p.add_argument('--tu', default='A', choices=['A', 'B', 'C', 'D', 'E', 'F'])
# Dừng SAU phân đoạn nào (mặc định chạy tới hết). `--tu A --den B` chỉ chạy AC03–AC07.
p.add_argument('--den', default='F', choices=['A', 'B', 'C', 'D', 'E', 'F'])
args = p.parse_args()
if not args.allow_devnet_send: raise SystemExit('Require --allow-devnet-send; uses only configured Devnet DEMO assets.')
out = pathlib.Path(args.out); out.mkdir(parents=True, exist_ok=True)
report = {'url': args.url, 'sends': 0, 'checks': [], 'receipts': [], 'errors': []}
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1050})
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    def req(r):
        try:
            if r.post_data_json and r.post_data_json.get('method') == 'sendTransaction': report['sends'] += 1
        except Exception: pass
    page.on('request', req)
    def save():
        (out/'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    def check(name):
        report['checks'].append(name); save(); print(name, flush=True)
    def idle(error=False):
        page.wait_for_function("() => !document.querySelector('.live-spinner')", timeout=90000)
        if not error and page.locator('[role=alert]').count(): raise AssertionError(page.locator('[role=alert]').all_inner_texts())
    def button(name): return page.get_by_role('button', name=name, exact=True)
    def dat_bao_ve(bat):
        # Công tắc đổi BẤT ĐỒNG BỘ (qua Web Lock trong `run`), nên `check()/uncheck()` của
        # Playwright — vốn kiểm trạng thái ngay sau cú bấm — báo "không đổi". Bấm rồi CHỜ.
        sw = page.get_by_role('switch', name='Bảo vệ bằng Custos')
        if sw.is_checked() != bat: sw.click()
        page.wait_for_function("b => document.querySelector('[role=switch][aria-label=\"Bảo vệ bằng Custos\"]')?.checked === b", arg=bat, timeout=15000)
    def setup():
        page.wait_for_timeout(10000)
        if button('Ký tạo phiên thử nghiệm').count(): button('Ký tạo phiên thử nghiệm').click()
        else:
            settings = page.locator('.wallet-settings')
            if settings.get_attribute('open') is None: settings.locator('summary').click()
            settings.get_by_role('button', name='Ký tạo phiên mới', exact=True).click()
        page.wait_for_function("() => document.querySelector('[role=alert]') || (document.querySelector('.wallet-balance')?.textContent.includes('500,0') && !document.querySelector('.live-spinner'))", timeout=90000)
        idle(); assert '500,0' in page.locator('.wallet-balance').inner_text()
    def prep(kind, amount='10'):
        page.wait_for_timeout(10000)
        if kind == 'transfer':
            if not page.locator('#demo-send-amount').count(): button('Gửi DEMO').click()
            page.locator('#demo-send-amount').fill(amount)
            button('Kiểm tra giao dịch gửi').click()
        elif kind == 'attack': page.get_by_role('button', name=re.compile('^Nhận quà tặng')).click()
        else:
            details = page.locator('.wallet-scenarios')
            if details.get_attribute('open') is None: details.locator('summary').click()
            page.locator('#scenario-amount').fill(amount)
            details.get_by_role('button', name=re.compile('^'+re.escape(kind))).click()
        # Chờ yêu cầu ký HOẶC thẻ lỗi — chỉ chờ yêu cầu thì lỗi RPC hiện ngay vẫn bị chờ đủ 90 s.
        page.wait_for_selector('.wallet-request, [role=alert]', timeout=90000)
        idle()
    _prep_goc = prep
    def prep(kind, amount='10'):
        # Chặng CHUẨN BỊ chỉ đọc + mô phỏng, trước bước ký: thử lại khi RPC đọc quá hạn là an
        # toàn — với điều kiện số lần gửi KHÔNG đổi. Tạo phiên và ký KHÔNG bao giờ tự thử lại
        # (không gửi lại giao dịch chưa rõ kết quả). Máy chạy bị Devnet giới hạn đọc theo IP.
        for lan in range(6):
            gui_truoc = report['sends']
            try:
                return _prep_goc(kind, amount)
            except AssertionError as e:
                tam_thoi = any(s in str(e) for s in ('timed out', 'failed to get', 'quá hạn', 'không kết nối', '429'))
                if not tam_thoi or report['sends'] != gui_truoc or lan == 5: raise
                report.setdefault('retries', []).append({'kind': kind, 'attempt': lan + 1, 'reason': str(e)[:160]}); save()
                page.wait_for_timeout(45000)
    def execute():
        request = page.locator('.wallet-request')
        request.wait_for()
        previous = page.evaluate("JSON.parse(localStorage.getItem('custos.live-receipt.v1') || 'null')?.signature || ''")
        warning_button = request.get_by_role('button', name=re.compile(r'^(Ký giao dịch|Vẫn ký)'))
        if warning_button.count(): warning_button.click()
        request.locator('.wallet-consent input').check()
        # Ba nhãn của `WalletExecution.tsx`: đề nghị kiểm tra (aiAdvisory) / bỏ qua cảnh báo / ký thường.
        # Thiếu nhãn đầu, ca "Ứng dụng đóng tài khoản rỗng" (28/09) treo 30 s ở chỗ bấm — không gửi gì.
        request.get_by_role('button', name=re.compile(r'^(Đã xem, vẫn ký và gửi|Bỏ qua cảnh báo và gửi|Ký và gửi trên Devnet)$')).click()
        page.wait_for_function("old => document.querySelector('[role=alert]') || (JSON.parse(localStorage.getItem('custos.live-receipt.v1') || 'null')?.signature !== old && !document.querySelector('.wallet-request') && !document.querySelector('.live-spinner'))", arg=previous, timeout=90000)
        r = page.evaluate("JSON.parse(localStorage.getItem('custos.live-receipt.v1') || 'null')")
        # Chưa có chữ ký mới ⇒ lỗi TRƯỚC khi gửi: nêu ra như cũ.
        if not r or r.get('signature') == previous: idle()
        # ĐÃ GỬI mà đọc biên nhận quá hạn: chỉ TRA CỨU LẠI (đọc), không bao giờ gửi lại.
        idle(error=True)
        for _ in range(6):
            if r.get('observation'): break
            page.wait_for_timeout(15000); button('Tra cứu lại').click(); idle(error=True)
            r = page.evaluate("JSON.parse(localStorage.getItem('custos.live-receipt.v1'))")
        assert r['observation']['err'] is None, r
        report['receipts'].append(r); save()
        return r
    try:
        page.goto(args.url, wait_until='networkidle')
        report['wallet'] = page.locator('#live-wallet-address').input_value()
        assert report['wallet'] == 'AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ'
        page.locator('#demo-keypair').set_input_files('.devnet/vi-demo.json'); idle()
        report['tu'] = args.tu; report['den'] = args.den
        chay = lambda s: args.tu <= s <= args.den
        if chay('A'):
            setup(); check('setup: fresh mint, 500 DEMO, fixed funded wallet')
            prep('transfer', '12,5'); r = execute()
            assert r['comparison']['actualBefore'] == '500000000' and r['comparison']['actualAfter'] == '487500000'
            assert r['comparison']['targetAfter'] == '12500000'
            check('AC03: custom fractional transfer confirmed; source and destination measured')
            prep('attack'); assert 'Nguy hiểm' in page.locator('.wallet-request').inner_text()
            sends = report['sends']; button('Chặn & huỷ giao dịch').click()
            assert report['sends'] == sends; check('AC04: protected cancel sends nothing')
            prep('attack'); r = execute()
            assert r['protected'] and r['decision']['action'] == 'override' and r['decision']['level'] == 'danger'
            assert page.get_by_role('switch', name='Bảo vệ bằng Custos').is_checked()
            assert r['comparison']['balance'] == 'match' and r['comparison']['authority'] == 'match'
            assert '0,0 DEMO' in page.locator('.wallet-rights').inner_text()
            check('AC05: red override stays protected; transfer and changed owner confirmed')
            page.screenshot(path=str(out/'01-red-override.png'), full_page=True)
        if chay('B'):
            setup(); dat_bao_ve(False)
            prep('transfer', '3'); execute(); check('unprotected normal transfer confirmed')
            prep('attack'); sends = report['sends']; button('Huỷ giao dịch').click(); assert report['sends'] == sends
            check('AC07: unprotected cancel sends nothing')
            prep('attack'); r = execute(); assert not r['protected']
            # Quyền KHÔNG bao giờ được "lệch". "Chưa rõ" chỉ hợp lệ khi đúng lý do thiết kế (receipt.ts,
            # F-06): chủ được đọc ở slot MUỘN hơn và chưa quy được cho giao dịch này — và chủ đọc được
            # vẫn phải là chủ mới như dự báo.
            auth, o = r['comparison']['authority'], r['observation']
            assert auth in ('match', 'unknown'), auth
            if auth == 'unknown':
                assert o.get('ownerSlot') is not None and o['ownerSlot'] > o['slot'] and not o.get('rightsAttributable'), o
                assert o.get('owner') == r['prediction'].get('ownerAfter'), (o.get('owner'), r['prediction'].get('ownerAfter'))
            assert r['comparison']['balance'] == 'match'
            check('AC06: unprotected attack confirmed with separate consent' + ('' if auth == 'match' else ' (quyền: chưa quy được cho đúng giao dịch — đúng thiết kế, chủ đọc được trùng dự báo)'))
        if chay('C'):
            setup(); dat_bao_ve(True)
            prep('Trao quyền kiểm soát'); r = execute()
            assert r['comparison']['actualBefore'] == r['comparison']['actualAfter'] == '500000000'
            assert r['comparison']['authority'] == 'match'; check('AC08: owner-only changes authority without token transfer')
        if chay('D'):
            setup()
            prep('Cấp quyền sử dụng token', '30'); r = execute()
            assert r['comparison']['actualBefore'] == r['comparison']['actualAfter'] == '500000000'
            assert r['observation']['allowance'] == '30000000'; check('AC09: approve grants allowance; balance unchanged')
            prep('Ứng dụng sử dụng quyền', '12'); r = execute()
            assert r['signer'] != report['wallet'] and r['comparison']['actualAfter'] == '488000000'
            check('AC10: delegate signs its own transaction; owner does not sign')
            prep('Thu hồi quyền đã cấp'); r = execute()
            assert r['observation']['delegate'] is None and r['observation']['allowance'] == '0'
            check('AC11: revoke confirmed on chain')
            page.screenshot(path=str(out/'02-revoke.png'), full_page=True)
            page.locator('#scenario-amount').fill('1')
            page.locator('.wallet-scenarios').get_by_role('button', name=re.compile('^Ứng dụng sử dụng quyền')).click(); idle(error=True)
            assert 'không có quyền' in page.locator('[role=alert]').inner_text()
            check('AC11: delegate cannot prepare another spend after revoke')
        if args.tu in ('E', 'F') and chay('E' if args.tu == 'E' else 'F'):
            setup()
        if chay('E'):
            prep('Gửi kèm chuyển thêm', '2'); r = execute()
            # Tương đối với số dư trước: phân đoạn E bắt đầu ở phiên mới (500), không ở 488.
            assert int(r['comparison']['actualAfter']) == int(r['comparison']['actualBefore']) - 3_000_000
            check('S06: requested 2 plus additional 1 DEMO actually transfers; verdict not forced')
        if chay('F'):
            prep('Trao quyền đóng tài khoản'); r = execute(); assert r['observation']['closeAuthority'] is not None
            so = int(r['comparison']['actualAfter'])
            prep('transfer', str(so // 10**6) if so % 10**6 == 0 else f'{so / 10**6:.6f}'.rstrip('0').replace('.', ',')); execute()
            prep('Ứng dụng đóng tài khoản rỗng'); r = execute(); assert r['observation']['closed']
            check('S07: close authority used only after emptying token account; actor receives rent')
            page.screenshot(path=str(out/'03-close.png'), full_page=True)
            page.reload(wait_until='networkidle')
            sends = report['sends']; button('Khôi phục phiên đã lưu').click(); idle()
            assert report['sends'] == sends
            assert not page.locator('.wallet-request').count()
            assert page.locator('#demo-keypair').count()
            check('AC17: reload restores public session and closed account without signing/resending')
            page.add_script_tag(path='node_modules/axe-core/axe.min.js')
            report['axe'] = {}
            for width in [1440, 375]:
                page.set_viewport_size({'width': width, 'height': 1000})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                violations = page.evaluate('async () => (await axe.run()).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))')
                report['axe'][str(width)] = violations
                assert not violations, violations
                page.screenshot(path=str(out/f'04-restored-{width}.png'), full_page=True)
            assert not report['errors']; report['passed'] = True; check('AC21: desktop/mobile axe and overflow checks passed')
        else:
            assert not report['errors']; report['passed'] = True
    except Exception as e:
        report['passed'] = False; report['error'] = str(e)
        page.screenshot(path=str(out/'failure.png'), full_page=True)
        raise
    finally:
        save(); print(json.dumps({k:v for k,v in report.items() if k != 'receipts'}, ensure_ascii=False), flush=True)
        browser.close()

