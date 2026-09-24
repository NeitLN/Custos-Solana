"""Read-only local-browser probe for the national-round review.

Starts no servers, signs nothing and sends no transaction. Use with with_server.py.
"""

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


OUT = Path(__file__).with_name("probe-ui.json")
sys.stdout.reconfigure(encoding="utf-8")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    findings = {"failed_responses": [], "console_errors": [], "wallet": {}, "handoff": {}}

    def watch(page):
        page.on(
            "response",
            lambda response: findings["failed_responses"].append(
                {"status": response.status, "url": response.url}
            )
            if response.status >= 400
            else None,
        )
        page.on(
            "console",
            lambda message: findings["console_errors"].append(message.text)
            if message.type == "error"
            else None,
        )

    wallet = context.new_page()
    watch(wallet)
    wallet.goto("http://localhost:5188", wait_until="networkidle")
    wallet.get_by_role("button", name="Nhận quà tặng").first.click()
    try:
        wallet.locator(".result-card").wait_for(timeout=30000)
        findings["wallet"]["result_text"] = wallet.locator(".result-card").inner_text()[:1700]
    except Exception as error:
        findings["wallet"]["error"] = str(error)

    attack = context.new_page()
    watch(attack)
    attack.goto("http://localhost:5189", wait_until="networkidle")
    attack.evaluate("window.__target = null; window.open = (url) => { window.__target = url; return null; }")
    attack.locator("button.nut-nhan").first.click()
    target = attack.evaluate("window.__target")
    findings["handoff"]["target_host"] = target.split("#")[0] if target else None
    if target:
        opened = context.new_page()
        watch(opened)
        opened.goto(target, wait_until="networkidle")
        try:
            opened.locator(".result-card").wait_for(timeout=30000)
            findings["handoff"]["result_text"] = opened.locator(".result-card").inner_text()[:1700]
        except Exception as error:
            findings["handoff"]["error"] = str(error)
            findings["handoff"]["body"] = opened.locator("body").inner_text()[:1700]

    OUT.write_text(json.dumps(findings, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(findings, ensure_ascii=False, indent=2))
    browser.close()
