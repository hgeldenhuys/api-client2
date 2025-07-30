// ====================
// DEBUG & PROCESS UTILITIES
// ====================
import fs from "node:fs";
import {randomUUID} from "crypto";

export const DebugUtils = {
  debug: (...args: unknown[]) => {
    fs.appendFileSync('debug-hooks/_debug.log', `[DEBUG] ${args.map(e => JSON.stringify(e, null, 2)).join(' ')}\n`);
  },
  debugTx: (tag: string) => {
    const transaction = randomUUID();
    fs.appendFileSync(`debug-hooks/${tag}.log`, `======================${tag}:${transaction}\n`);
    return (...args: unknown[]) => {
      fs.appendFileSync(`debug-hooks/${tag}.log`, `[DEBUG:${tag}] ${args.map(e => JSON.stringify(e, null, 2)).join(' ')}\n`);
    }
  }
};