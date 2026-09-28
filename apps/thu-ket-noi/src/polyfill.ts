import { Buffer } from "buffer";

// web3.js v1 cần Buffer toàn cục. File riêng, import đầu tiên — import được hoist.
globalThis.Buffer ??= Buffer;
