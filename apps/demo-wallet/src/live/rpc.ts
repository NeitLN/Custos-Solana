/** Retry rate-limited read requests only. Never create/retry a signing operation here. */
export function liveRpcFetch(
  transport: typeof fetch = fetch,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): typeof fetch {
  return async (input, init) => {
    let method = "";
    try {
      method = JSON.parse(String(init?.body)).method ?? "";
    } catch {
      /* Unknown requests are not retried. */
    }
    const read =
      method.startsWith("get") || method === "simulateTransaction" || method === "isBlockhashValid";
    for (let attempt = 0; ; attempt++) {
      const response = await transport(input, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(15_000),
      });
      if (!read || response.status !== 429 || attempt === 3) return response;
      await response.arrayBuffer();
      await wait(2000 * 2 ** attempt);
    }
  };
}
