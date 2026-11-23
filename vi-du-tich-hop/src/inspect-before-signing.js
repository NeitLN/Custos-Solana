/**
 * The same integration as `tich-hop.js`, with English identifiers, for wallet teams that do not read
 * Vietnamese. Both files run the same checks in the same order; a test runs them side by side on the
 * same recorded transactions and expects the same answer.
 *
 * `tich-hop.js` stays the file whose code lines are counted and published. This one is an extra
 * example, not a second count.
 *
 * Three rules an integrator must keep, and all three are about security:
 *   1. The user's address comes from the WALLET, never from the dApp's request.
 *   2. `expectedAction` is what the dApp declares. It may only make Custos more cautious:
 *      a match never lowers the level, a mismatch raises suspicion.
 *   3. Fail closed. An error, a timeout or a lost connection never becomes "sign".
 */

/** A timeout means "not checked", never "safe". */
const TIMEOUT_MS = 12_000;

function withTimeout(work, ms) {
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Custos timed out after ${ms} ms`)), ms);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
}

/**
 * Run Custos before signing and turn the result into what the wallet should do.
 *
 * @returns {Promise<{
 *   decision: "sign"|"ask"|"block",
 *   reason: "no_issue"|"incomplete_coverage"|"review_requested"|"detected"|"could_not_check",
 *   result: object|null,
 *   error: string|null,
 * }>}
 */
export async function inspectBeforeSigning({ inspect, connection, interpret, tx, userWallet, dAppDeclared, timeoutMs = TIMEOUT_MS }) {
  let result;
  try {
    result = await withTimeout(
      inspect({ connection, interpret }, tx, {
        locale: "en",
        // (1) the address comes from the user's own wallet, never from the dApp
        nguoiDung: userWallet.toBase58(), // nguoiDung = the signer's address (the SDK's option name)
        // (2) what the dApp declares: only used to detect a mismatch
        ...(dAppDeclared ? { expectedAction: dAppDeclared } : {}),
      }),
      timeoutMs,
    );
  } catch (e) {
    // (3) FAIL CLOSED: Custos could not check, so the wallet must not sign.
    const error = e instanceof Error ? e.message : String(e);
    return { decision: "block", reason: "could_not_check", result: null, error };
  }

  // result.level is "safe" | "warning" | "danger".
  // "safe" is shown to users as "Normal" — never call a transaction safe.
  if (result.level === "danger") return { decision: "block", reason: "detected", result, error: null };
  if (result.level === "warning") return { decision: "ask", reason: "detected", result, error: null };

  // Part of the transaction was not understood: "Normal" over 1 of 3 instructions is not a guarantee.
  if (result.coverage && result.coverage.analyzed < result.coverage.total) {
    return { decision: "ask", reason: "incomplete_coverage", result, error: null };
  }
  // Custos asks for a manual check (explanation layer, or the dApp's declaration did not match).
  // It does not change `level`, but if you skip it the request never reaches the user.
  if (result.aiAdvisory === "review_required") return { decision: "ask", reason: "review_requested", result, error: null };
  return { decision: "sign", reason: "no_issue", result, error: null };
}
