# Live Devnet implementation plan

> Execute inline using executing-plans. User requested implementation of the reviewed spec. No commit/push.

**Goal (corrected by user):** The existing Ví mẫu at `index.html` signs isolated Devnet transactions after consent and compares receipts against Custos predictions. Do not ship a separate execution page.
**Architecture:** In-memory demo signer and session-specific mint/accounts; session controller owns policy, immutable pending messages and send state; independent receipt parser reads chain metadata. Existing SDK and protected App guards stay intact. Public demo page runs without embedded keys, with explicit Devnet funding/setup actions.
**Tech stack:** Existing React, Vite, web3.js v1, SPL Token, Node test, Playwright.
**Spec:** `docs/DEMO-DEVNET-THUC-THI-VA-DOI-CHIEU.md`.

## Constraints and decisions

- Work in the authorized existing workspace (only two documentation changes at baseline); B owns new wallet flow. Do not modify SDK contracts or rules.
- Temporary demo wallet stays in this tab's memory. Closing/reloading loses its key; UI says so. Funding is explicit Devnet only. Public receipts may be kept in localStorage, never keys.
- Execution is the default `Ví của bạn` surface inside the existing App. `Phòng phân tích` preserves advanced scenarios, mock URLs and external transaction inspection. Switching surfaces preserves the wallet; switching during a pending signature or operation is disabled. The separate HTML/entry/navigation item has been removed.
- Never retry an ambiguous send with a new transaction. A pending receipt survives reload as public JSON/signature; query-only recovery.
- State snapshots use real raw diff fields; unknown values stay unknown. Compare account, mint, decimals and exact message before amounts.

## Tasks

- [x] 1. RED/GREEN receipt/policy tests: cancellation does not sign, off mode does not require verdict, protected mode requires fresh matching inspect, double submission blocked; receipt wrong account/mint/missing/error must not match. Files `apps/demo-wallet/test/liveDemo.test.ts`, `src/live/receipt.ts`, `src/live/session.ts`.
- [x] 2. Session creates separate mint/source/target with one setup transaction, real balance reads, live inspection, exact-message consent and bounded confirmation using existing send machinery. Test fresh blockhash, cancellation, unknown outcomes.
- [x] 3. `WalletExecution.tsx` integrates execution into the existing wallet shell, with account card, send/receive controls, activity, existing CanhBao analysis and explicit signing. Shared Receipt component displays measured results. No additional HTML entry.
- [x] 4. Runbook and live probe (isolated Devnet funds only), all tests/build, browser screenshots and console/a11y. Record passed/blocked honestly and get final focused review.

## Review focus

RPC timeout after acceptance; account owner changed but balance remains; public bundle secrets; mode changes during inspect; transaction same bytes but chain state drift. Cover these with controller tests, independent metadata tests and real session inspection.

## Ledger

- Baseline `e4973af`; existing uncommitted spec/prompt preserved. Existing main page's off branch calls a signing guard requiring inspect; new execution page will use explicit policies rather than weaken that guard.
- Focused independent review identified concurrent receipt recovery and lost setup manifest on confirmation timeout. Both addressed with failing-then-passing regression tests. A second reviewer pass was unavailable; final verification is local tests and browser evidence, not a claim of independent approval.
- Full check: 1059/1059 tests. Final typecheck, production build and 30-file private-key scanner passed. Live run-02 completed real transfers, cancellation and authority change; its remaining keyboard accessibility finding was fixed and verified by query-only final-receipt probe.
- See `docs/review/live-devnet/BAO-CAO.md` for evidence, failures retained and limits. No commit, push or deployment.
- User corrected the separate-page interpretation. Integrated into Ví mẫu; 1060 tests pass. Live `wallet-execution/browser.json` passes all chain flows and wallet preservation across the analysis switch. Read-only `wallet-receipt/browser.json` verifies the integrated layout on desktop/mobile.
