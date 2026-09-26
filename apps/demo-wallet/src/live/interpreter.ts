import type { Interpreter } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
export type ExplanationSource = "tatDinh" | "moHinh" | "moHinhLoi" | "chuaCauHinh";
/** Labels only the returned text, never the start of a request or a late response. */
export function trackedInterpreter(
  model: Interpreter | null,
  report: (source: ExplanationSource) => void,
  timeout = 8000,
): Interpreter {
  return async (...args) => {
    const base = await dienGiaiKhongAI(...args);
    if (!model) {
      report("tatDinh");
      return base;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        model(...args),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), timeout);
        }),
      ]);
      // The SDK intentionally returns its deterministic fallback on rejected model output.
      // Identical text is conservatively labelled fallback, not claimed as model generation.
      report(result.explanation === base.explanation ? "moHinhLoi" : "moHinh");
      return result;
    } catch {
      report("moHinhLoi");
      return base;
    } finally {
      clearTimeout(timer);
    }
  };
}
