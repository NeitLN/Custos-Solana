/** Temporary loopback-only adapter for recording. No public deployment. */
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import handler from "../api/dien-giai.ts";
const events: unknown[] = [];
let calls = 0;
const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/api/dien-giai") { res.writeHead(404).end(); return; }
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 24000) { res.writeHead(413).end(); return; }
  }
  let data;
  try { data = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
  if (data.system && ++calls > 4) { res.writeHead(429).end(); return; }
  const start = Date.now();
  const result = await handler(new Request("http://localhost/api/dien-giai", { method: "POST", headers: { "content-type": "application/json" }, body }));
  const text = await result.text();
  if (data.system) {
    const payload = JSON.parse(text);
    events.push({ at: new Date().toISOString(), ms: Date.now()-start, status: result.status, model: process.env.CUSTOS_AI_MODEL ?? "claude-haiku-4-5-20251001", response: payload.chu ?? null, usage: payload.usage ?? null });
    writeFileSync("docs/pitch-technical/evidence/browser-ai-calls.json", JSON.stringify(events,null,2));
    console.log("AI response", result.status, Date.now()-start, "ms");
  }
  res.writeHead(result.status, { "content-type": "application/json" }).end(text);
});
server.listen(53607, "127.0.0.1", () => console.log("Pitch bridge ready on loopback:53607; max 4 model calls"));
setTimeout(() => server.close(), 15 * 60 * 1000).unref();
