/** Static smoke check; cannot resolve dynamically constructed RPC URLs. */
export function coMainnetRuntime(source: string): boolean {
  const js = stripTypeScriptTypes(source, { mode: "transform" })
    .replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)/g,
      (_match, literal: string | undefined) => literal ?? "");
  return js.includes("mainnet-beta");
}
import { stripTypeScriptTypes } from "node:module";
