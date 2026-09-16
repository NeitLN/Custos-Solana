import { test } from "node:test";
import assert from "node:assert/strict";
import { coMainnetRuntime } from "../../../scripts/kiem-runtime-mainnet.ts";

test("cổng runtime bỏ qua kiểu cluster và chú thích, vẫn bắt endpoint thực thi", () => {
  assert.equal(coMainnetRuntime('export type Cluster = "devnet" | "mainnet-beta"; // mainnet-beta'), false);
  assert.equal(coMainnetRuntime('const rpc = "https://api.mainnet-beta.solana.com"; new Connection(rpc);'), true);
  assert.equal(coMainnetRuntime('new Connection(clusterApiUrl("mainnet-beta"));'), true);
  assert.equal(coMainnetRuntime('new Connection("https://api.devnet.solana.com");'), false);
});
