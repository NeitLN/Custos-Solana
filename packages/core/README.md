# Custos Core — integrating into a Solana wallet or dApp

The transaction analysis layer: it simulates a transaction **before the user signs**, points out the consequences that **do not belong to the primary action**, and explains them in plain language (Vietnamese or English).

> **Devnet only.** This build is not for mainnet yet — read [Current limits](#current-limits) before deciding.

---

## Installation

```bash
npm install @custos-solana/core @custos-solana/ai
```

Runs with plain `node`, no flags needed — the published package ships precompiled `.js` and
`.d.ts`.

> **Do not use `0.1.0`.** That version reached the registry with `main` pointing at TypeScript
> source, so it cannot be installed from JavaScript. Use **`0.1.1` or later** (`@custos-solana/ai` from `0.1.2`).

`@custos-solana/types` is pulled in automatically; install it separately only if you need the
types without the engine.

### Building a tarball from source

When you need an unpublished version, or want to check against the source yourself:

```bash
git clone https://github.com/NeitLN/Custos-Solana && cd Custos-Solana
npx npm@11.6.2 ci
node scripts/dong-goi-sdk.mjs goi-sdk
npm install /path/to/Custos-Solana/goi-sdk/*.tgz
```

> Inside the repo, the `exports` of the three packages point straight at `.ts` so the dev loop
> has no build step. Outside users cannot do that — Node refuses to strip TypeScript types for files
> inside `node_modules`. So both the tarball and the npm package are built from a staging
> directory whose `package.json` is rewritten to point at `dist`; see the top of `scripts/dong-goi-sdk.mjs`.

---

## Integration — one call

```ts
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";

const ketQua = await inspect(
  { connection, interpret: boiThoiHan(dienGiaiKhongAI) },
  transaction,          // UNSIGNED VersionedTransaction
  {
    locale: "en",
    nguoiDung: viNguoiDung.toBase58(),   // ← DO NOT OMIT, see right below
  },
);

if (ketQua.level !== "safe" || ketQua.aiAdvisory) {
  hienCanhBao(ketQua);  // the wallet decides how to display it
}
```

`locale` is `"vi"` or `"en"`. With `"en"`, labels and the explanation are English and the
explanation is always the deterministic one — the language-model path is not used for English.

### But the snippet above is NOT enough to ship in a wallet

It is missing the most important thing: **what if `inspect()` throws?**

`inspect()` calls RPC. Slow RPC, a lost connection or a failed simulation all make it throw or hang.
If the call site does not catch it, the wallet's signing flow falls into its generic error branch — and in most
wallets that branch does **not** block the Sign button. A security layer that goes silent when it breaks is a
security layer you do not have.

This is the snippet you can actually use. The sample dApp's entire integration fits inside it:

```ts
const HAN_MS = 12_000;

function coHan<T>(viec: Promise<T>, ms: number): Promise<T> {
  let dongHo: ReturnType<typeof setTimeout>;
  const chuong = new Promise<never>((_, tuChoi) => {
    dongHo = setTimeout(() => tuChoi(new Error(`Custos timed out after ${ms} ms`)), ms);
  });
  return Promise.race([viec, chuong]).finally(() => clearTimeout(dongHo));
}

async function kiemTruocKhiKy({ connection, tx, viNguoiDung, dAppKhai }) {
  let r;
  try {
    r = await coHan(
      inspect({ connection, interpret: boiThoiHan(dienGiaiKhongAI) }, tx, {
        locale: "en",
        nguoiDung: viNguoiDung.toBase58(),
        ...(dAppKhai ? { expectedAction: dAppKhai } : {}),
      }),
      HAN_MS,
    );
  } catch (e) {
    // FAIL CLOSED. If it could not be checked, ASK the user; never sign straight through.
    return { cho: "chan", lyDo: "khong_kiem_duoc", ketQua: null, loi: String(e) };
  }

  if (r.level === "danger") return { cho: "chan", lyDo: "phat_hien", ketQua: r, loi: null };
  if (r.level === "warning") return { cho: "hoi", lyDo: "phat_hien", ketQua: r, loi: null };

  // `safe` with instructions not fully understood should still ask again.
  if (r.coverage.analyzed < r.coverage.total) {
    return { cho: "hoi", lyDo: "coverage_khuyet", ketQua: r, loi: null };
  }
  // Custos recommends a manual check: `level` does not change, but do not sign straight through.
  if (r.aiAdvisory === "review_required") {
    return { cho: "hoi", lyDo: "de_nghi_kiem_tra", ketQua: r, loi: null };
  }
  return { cho: "ky", lyDo: "khong_van_de", ketQua: r, loi: null };
}
```

### The states, and why `lyDo` is separate from `cho`

`cho` answers *what the wallet must do* (`ky` = sign, `hoi` = ask, `chan` = block). `lyDo` answers *why*.
The two **cannot be derived from each other**, and merging them is a real bug that happened in this very repo.

| `cho` | `lyDo` | Meaning | What the wallet should show |
|---|---|---|---|
| `ky` | `khong_van_de` | Fully checked, nothing found | Normal signing flow |
| `hoi` | `phat_hien` | A Yellow-level finding | Warning with the before → after table |
| `hoi` | `de_nghi_kiem_tra` | Nothing found, but **Custos recommends a manual check** (`aiAdvisory`) — the explanation layer saw an unusual consequence, or the dApp declared one thing and did another | Show the recommendation with the before → after table; allow signing if the user confirms they reviewed it |
| `hoi` | `coverage_khuyet` | Nothing found, **but not every instruction was read** | *"Custos understood 1 of 3 instructions"* — do not say safe |
| `chan` | `phat_hien` | A Red-level finding | Danger warning |
| `chan` | `khong_kiem_duoc` | **Infrastructure failed**, nothing could be checked | *"Could not check"* — **do not** show a danger warning |

The last two rows both give `chan`, on purpose: neither may be signed. But if they look the same,
users learn that Custos cries wolf — because most of the red they see is really just slow Devnet.
Then the REAL warnings get ignored too.

Full version, annotated line by line: [`vi-du-tich-hop/src/tich-hop.js`](https://github.com/NeitLN/Custos-Solana/blob/main/vi-du-tich-hop/src/tich-hop.js) — 31 lines of code, running for real on Devnet.

> ### ⚠️ `nguoiDung` — the easiest field to omit, and omitting it breaks things
>
> Without `nguoiDung`, Custos protects the transaction's **fee payer**. In a dApp that
> pays fees on the user's behalf, the fee payer is the **dApp** — meaning the before → after table, the SOL rule and
> the entire verdict are computed for the **wrong wallet**.
>
> The wallet always knows its own address, so it has to say it. Custos **cannot** infer this,
> and deliberately does not guess.

Custos does **not** display anything. It returns data; the wallet has full control over the interface.

---

## Return value

```ts
type InspectResult = {
  level: "safe" | "warning" | "danger";
  aiAdvisory: "review_required" | null;
  detectedPrimaryAction: { type: string; from?: string; to?: string } | null;
  diff: Array<{
    label: string;
    before: string;
    after: string;
    severity: string;
    /** FULL address, present only when `before`/`after` is a shortened address.
     *  Shortening keeps the first 4 + last 4 characters, and an attacker can grind a vanity
     *  address matching exactly those 8 characters. Show the full one at the technical level so users can compare. */
    truocDayDu?: string;
    sauDayDu?: string;
  }>;
  reasonCodes: string[];
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
  explanation: string;
  loiKhaiLech?: { khai: string; nhanDien: string };
};
```

| Field | Used for |
|---|---|
| `level` | Deciding whether to block or let through. **Only the rule engine produces this value** |
| `diff` | The "before → after" table for the user. Measured data, not guesswork |
| `coverage` | Displaying *"understood 2 of 3 instructions"* — read exactly the numbers you have. See [Why coverage must be shown](#why-coverage-must-be-shown) |
| `reasonCodes` | Stable codes for the wallet to classify, log, or translate into another language |
| `explanation` | A ready-to-use sentence in the requested `locale` |
| `aiAdvisory` | Recommends that the user check manually. **Not** a verdict |
| `loiKhaiLech` | Present only when the context the dApp declared **mismatches** the detected action |

### Three levels, and the labels to use

| `level` | English label | Vietnamese label (`locale: "vi"`) | Meaning |
|---|---|---|---|
| `danger` | **Danger** | **Nguy hiểm** | A definite consequence: account owner change, withdrawal permission granted, controlling program changed |
| `warning` | **Review carefully** *or* **Not fully understood** | **Cần xem kỹ** *hoặc* **Chưa đọc hiểu hết** | See the section below |
| `safe` | **Normal** | **Bình thường** | ⚠️ Do not use the word *"safe"* |

> **Never display the word "safe".** Custos has no authority to declare a transaction safe — it only says *it found no sign from the list it knows how to check*. This is a liability issue for both the wallet and us.

### Two very different kinds of `warning`

```ts
import { chiLaThongTin } from "@custos-solana/core";

const chiLaChuaHieu =
  ketQua.level === "warning" &&
  (ketQua.reasonCodes.length === 0 || chiLaThongTin(ketQua.reasonCodes));
```

| Source | Should display | Tone |
|---|---|---|
| A behaviour rule fired | **Review carefully** | warning |
| Only a token property / not everything understood | **Not fully understood** | informational |

Measured on a cohort of 20 public transactions **stored offline** to test the engine (not the runtime — the demo runs entirely on Devnet): **19/20 fall into the second kind**. Raising the alarm for both is the fastest way to teach users to ignore warnings — and when the danger is real, they ignore that too.

---

## Context from the dApp — the asymmetry rule

A dApp can declare what it is doing:

```ts
await inspect(deps, tx, {
  locale: "en",
  expectedAction: { type: "swap", from: "SOL", to: "USDC" },
});
```

| Situation | What Custos does |
|---|---|
| Declaration **mismatches** the detected action | Raises suspicion, returns `loiKhaiLech` |
| Declaration **matches** | **Does not lower the verdict. Does not turn off any warning** |

A malicious dApp can perfectly well declare the truth to look harmless. **Context may only make Custos more cautious, never more lenient.**

**Which words to declare with.** `detectedPrimaryAction.type` is Vietnamese with `locale: "vi"` and English with `locale: "en"`; the declaration is compared through a one-way table:

| dApp declares `type` | Matches the detected action |
|---|---|
| `transfer` | `chuyển token` / `transfer token` or `chuyển SOL` / `transfer SOL` |
| `swap` | `swap` |
| `receive` | `nhận token` / `receive token` |
| `approve` | `cấp quyền rút` / `approve delegate` |
| exactly a detected-action name from the right-hand column | that same name |

Any other word (`airdrop`, `claim`, `cleanup`…) is compared verbatim, so it is almost always recorded as a mismatch — on purpose: Custos does not guess on the dApp's behalf. The deciding function is `cungLoaiHanhDong(khai, nhanDien)`, exported from `@custos-solana/core`.

---

## Why coverage must be shown

```
Understood 10 of 11 instructions. 1 unverified program.
```

Coinspect once published a case where transaction simulation **missed** an `assign` instruction that transferred account ownership. When an attacker paired it with a legitimate-looking leg, the wallet showed only the legitimate leg and **stayed silent about the part it did not understand**. The researchers' recommendation: wallets must have a fallback when simulation fails.

`coverage` is that fallback. **Show it, even when it looks bad.** A protection layer that is silent about its own limits is more dangerous than no layer at all.

---

## When Custos breaks

Three degradation paths, none of which crashes the wallet's signing flow:

| Where it breaks | Consequence |
|---|---|
| The explanation layer times out or errors | `explanation` falls back to a fixed template sentence. `level` **does not change** |
| Simulation fails | `level` is at least `warning`, `coverage.analyzed = 0` |
| `inspect()` throws | The wallet decides — we recommend **blocking and reporting that it could not check**, never letting it through silently |

```ts
try {
  const kq = await inspect(deps, tx, { locale: "en" });
  if (kq.level !== "safe" || kq.aiAdvisory) hienCanhBao(kq);
} catch {
  hienKhongKiemTraDuoc();   // do not let it through silently
}
```

The explanation layer has a default timeout of **4 seconds** (`boiThoiHan(fn, ms)`).

---

## Plugging in a language model — optional, with hard boundaries

Custos **embeds no provider SDK and holds no API keys.** You
pass in a function that calls a model, choose the model yourself, and decide where it runs and how
you pay for it:

```ts
import { inspect } from "@custos-solana/core";
import { dienGiaiBangMoHinh, boiThoiHan } from "@custos-solana/ai";

const interpret = boiThoiHan(
  dienGiaiBangMoHinh(async ({ system, user }) => {
    const r = await goiMoHinhCuaBan(system, user);   // your function
    return r;                                        // return the raw string
  }),
  4000,                                              // timeout, ms
);

const ketQua = await inspect({ connection, interpret }, tx, { locale: "vi" });
```

The model path applies to `locale: "vi"`; with `locale: "en"` the explanation stays deterministic
even if a model is plugged in.

Plug in nothing and `inspect()` uses the deterministic core and **still runs fully** — the only difference
is that the wording is more rigid. `level`, `diff`, `reasonCodes` and `coverage` do not depend
on the model.

### The model may write words, not decide anything

Four constraints, all of them tested:

| Constraint | Enforced by |
|---|---|
| Cannot touch `level` | The `Interpreter` type has no such field — the compiler blocks it |
| Cannot declare a transaction safe | The output is inspected; reassuring sentences are rejected and fall back to the deterministic core |
| Cannot lower the level of suspicion | `aiAdvisory` is asymmetric: the model can only RAISE it to `review_required` |
| Does not receive the raw transaction | It receives only a whitelist of extracted facts |

Model broken, slow, returning garbage, or steered — all four cases fall back to the deterministic
core, and the user loses no part of the protection.

### Token symbols are data set by outsiders

The `kyHieuToken` you pass in is filtered before display and before being sent to the
model: only short labels like `USDC`, `SOL`, `USDC-demo` are accepted. Anything without that
shape is shown by Custos as a shortened address — uglier but true.

The reason is very concrete: if it were printed verbatim, a malicious dApp would only need to name its token
*"safe, just sign"* to make the protection layer itself say the reassuring sentence for it.

## Privacy

Custos does **not** hold private keys, does **not** sign anything, and does **not** write anything on-chain — it is a read-and-simulate layer.

This build runs entirely client-side: the unsigned transaction does not leave the user's machine except to the RPC endpoint the wallet itself is using.

---

## Tell Custos which wallet belongs to the user

```ts
const ketQua = await inspect({ connection }, tx, {
  locale: "en",
  nguoiDung: viNguoiDung.toBase58(),   // ← you should pass this
});
```

By default Custos protects `staticAccountKeys[0]`, i.e. the **fee payer**. In a
fee-sponsored transaction that is not the user — and then every rule targets the
other party's wallet. Only the wallet knows which address belongs to the user.

If it is not passed and the transaction has more than one signer, Custos **does not stay silent**: it
returns `NGUOI_DUNG_KHONG_RO` and never yields `Normal`. That is an admission of a
limit, not an attack detection — it only says *"I might be looking at the wrong wallet"*.

An address passed in that **is not a signer of the transaction** is ignored: otherwise
a malicious dApp would only need to declare some random address to make Custos look elsewhere.

## Current limits

Stated plainly so integrators can decide for themselves:

| Limit | Details |
|---|---|
| **Coverage on DeFi is still incomplete** | **average 82 %** across the 9/20 transactions still simulatable in the cohort re-anchored on 2026-08-24 (stored offline); for instructions that can touch your assets: **65 % (13/20)**. The number swings strongly between sample batches. No decoder yet for DEX programs that do not publish an IDL on-chain |
| **Network fee is an ESTIMATE** | The base fee of 5000 lamports per signature is certain; the priority fee can only be computed when the transaction has both `setComputeUnitPrice` and `setComputeUnitLimit`. The label clearly says "(estimate)" |
| **SOL: proportional detection only** | Rule 13 fires when the SOL leaving the wallet exceeds 50 % of the balance. Small amounts still show in the before → after table but are not flagged. Rent for creating/closing accounts is not yet separated from transfers |
| **Token symbols read from the chain** | Custos reads symbols itself from Metaplex and Token-2022 metadata extensions — no provider key needed. Tokens that publish no metadata show a shortened address. A `kyHieuToken` you pass in still takes priority |
| **What cannot be measured is said out loud** | Accounts over the RPC's cap of 100, or RPC returning no data, become `TRANG_THAI_DO_KHUYET` and the verdict is never `Normal` |
| **14 rules** | SPL Token, Token-2022 (permanent delegate, transfer hook), System Program, Address Lookup Table |
| **Token-2022: 2/26 extensions read** | Only `PermanentDelegate` and `TransferHook`. The other 23 extensions are **not safely rejected** — a mint carrying them still yields a valid `MintFact` that looks exactly like a plain mint, and `coverage` counts only instructions so it does not drop. That means a mint with `TransferFeeConfig` or `PausableConfig` passes without the verdict knowing. Full list and why it is not patched yet: [behaviour matrix](../../docs/bao-mat/MA-TRAN-HANH-VI.md) section 2.3 |
| **6 programs understood** | System, SPL Token, Token-2022, ATA, Compute Budget, Orca Whirlpool. Every other program is marked unverified |
| **Two languages, English is deterministic only** | `locale` is `"vi"` or `"en"`. The optional language-model explanation is used only for `"vi"`; `"en"` always returns the deterministic explanation |
| **Not verified at scale** | Not yet run on real wallet traffic |
| **Rule 4 cannot distinguish the authority** | A permanent delegate is always Yellow, because `Facts` does not yet extract the `authority` field of a Transfer instruction |
| **The Anthropic adapter causes warnings in web builds** | The default entry of `@custos-solana/ai` exports `dungGoiAnthropic`, so bundlers see `@anthropic-ai/sdk` in the module graph and warn that `node:fs`/`node:path` were externalized. **Measured: the SDK is NOT in the bundle** — it tree-shakes cleanly, `dist` contains no `anthropic` string. This is build noise, not shipping the SDK to viewers. The definitive fix is splitting `@custos-solana/ai/anthropic` into its own subpath; postponed until after the competition because adding an entry point adds exactly the surface that broke version 0.1.0 |

**Measured:** across the 9 public transactions still simulatable (a cohort of 20 transactions, **stored offline** to test the engine — the demo runtime runs entirely on Devnet), **0 accusation codes were raised**. The cohort has no ground truth labels yet, so this is NOT a false positive rate: no accusation means no accusing rule fired; it does not prove all 9 transactions are benign.

---

## Receipts, replay, and wallet rules

The four groups of functions below are optional — `inspect()` does not need them. They are for wallets
that want to export evidence, re-check an old run, or apply their own rules.

### Exporting a receipt

```ts
import { dungReceipt, receiptRaJson, docReceipt } from "@custos-solana/core";

// `chiaSe` (share) — to hand to someone else. Carries NO Facts, so it CANNOT be replayed.
const bienLai = dungReceipt(ketQua, "chiaSe");
const json = receiptRaJson(bienLai);

// Read it back, and know whether it was altered.
const doc = docReceipt(json);
if (doc.ok && !doc.toanVen) console.warn("receipt was altered after export");
```

Three things a receipt does **not** do, and it records them in itself:

- `hash` proves **the content has not changed since export**. It is not a signature,
  does not prove who exported it, and does not prove the RPC told the truth.
- Masking data is **not anonymity**. Wallet addresses are public on-chain data.
- No raw transaction and no signature, in any mode. There is no flag to turn them on.

The `rieng` (private) mode carries `Facts`, so it can be replayed — but `Facts` contains the entire
account state that was read, so do not send it to strangers.

### Replaying an old run, no network needed

```ts
import { chayLaiTuJson } from "@custos-solana/core";

const r = chayLaiTuJson(json);
if (!r.ok) {
  // A `chiaSe` receipt is REJECTED here, instead of making up empty Facts and running.
  console.log("cannot replay:", r.loi);
} else if (r.engineDaDoi) {
  // Two different verdicts mean the ENGINE changed, NOT that the data is wrong.
  console.log("at export:", r.nguyenVan.level, "· engine today:", r.chayLai.level);
}
```

### Wallet rules — separate from the engine

```ts
import { danhGiaPolicy, PROFILE_MAC_DINH } from "@custos-solana/core";

const qd = danhGiaPolicy(
  { level: ketQua.level, coverage: ketQua.coverage, phienConDung: true },
  PROFILE_MAC_DINH,
);
// qd.quyetDinh: "allow" | "review" | "block"
```

**Policy may only be more cautious than the engine, never looser.** `level: "danger"`
has no path to `allow`, even with the loosest profile. If a wallet could loosen the engine's
conclusion, an attacker would only need to make the wallet load a lenient profile.

The profile is a **separate parameter**, not read from the transaction: a dApp may not declare
your wallet's rules for it.

### Checking several transactions at once

```ts
import { xetLo } from "@custos-solana/core";

const lo = xetLo(danhSach); // each element: { cluster, soByte, ketQua }
// lo.tongKet is the MOST SEVERE level, and ONE element that could not be checked is enough to make
// the whole batch "khong_ket_luan_duoc" (inconclusive). There is no overall green badge.
```

Each transaction is simulated **independently** against the current state — not against the
state after the previous transaction has run. Do not add up independent changes and
call that the final balance of the whole sequence.

---

## Low-level functions — only needed when you build your own pipeline

`inspect()` already returns `diff` and `coverage`, so **most integrators do not need
this section**. It is for those who already have Facts from another source and want to run each layer separately.

```ts
import { danhGia, dungBangChenhLech, computeCoverage } from "@custos-solana/core";

const { level, reasonCodes, hits } = danhGia(facts);        // L2 — the ONLY place that produces level
const bang = dungBangChenhLech(facts, hits);                // needs `hits`, not just facts
const phu = computeCoverage(facts.instructions);            // takes the INSTRUCTION ARRAY, not Facts
```

The last two signatures are easy to guess wrong, and a wrong guess gives a very opaque error (`Cannot read
properties of undefined`). `dungBangChenhLech` deliberately requires `hits` so the before → after table
always matches the verdict just produced, instead of being built independently and saying something else.

---

## Try it locally

```bash
npm install
npx npm@11.6.2 run check     # 1421 tests, run offline
npm run thu-goi              # install the tarball into an empty project OUTSIDE the repo and run it for real

node --experimental-strip-types scripts/dung-hien-truong.ts   # build the Devnet setup
npm run vi                   # sample wallet      → localhost:5188
npm run tan-cong             # simulated scam page → localhost:5189
```

Click **Claim 1,000 SOLB** on the 5189 page: it pushes a real transaction to the wallet, and the wallet shows the block screen.

The test suite includes **38 labelled samples**: 28 hand-built cases covering **all 14 rules** (each rule has a
triggering case and a CONTROL case that differs in exactly one thing), plus 10 public
transactions stored offline as a negative set (expected *not* to be Red) — `data/seed/`.

> The claim "covers all 14 rules" above **is guarded by a test**: `dataset.test.ts` goes red as soon as
> a rule loses its sample, so the documentation cannot drift away from the data.
