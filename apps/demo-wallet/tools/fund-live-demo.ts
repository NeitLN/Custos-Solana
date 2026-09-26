/** Opt-in test funding: fixed 0.03 SOL on verified Devnet, never reads keys into the browser. */
import { Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { DEVNET_GENESIS, LIVE_RPC } from "../src/live/session.ts";
import { napVi } from "../../../scripts/vi-devnet.ts";

if (process.argv[2] !== "--allow-devnet-send" || !process.argv[3]) throw new Error("Usage: node --experimental-strip-types apps/demo-wallet/tools/fund-live-demo.ts --allow-devnet-send <new-demo-public-key>");
const recipient = new PublicKey(process.argv[3]);
const c = new Connection(LIVE_RPC, "confirmed");
if (await c.getGenesisHash() !== DEVNET_GENESIS) throw new Error("Not Devnet");
if (await c.getBalance(recipient) > 0) throw new Error("Recipient already funded; refusing duplicate test funding");
const funding = napVi();
const signature = await sendAndConfirmTransaction(c, new Transaction().add(SystemProgram.transfer({ fromPubkey: funding.publicKey, toPubkey: recipient, lamports: 30_000_000 })), [funding], { commitment: "confirmed" });
console.log(JSON.stringify({ cluster: "devnet", recipient: recipient.toBase58(), lamports: 30_000_000, signature }));
