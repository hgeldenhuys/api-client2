#!/usr/bin/env bun --bun

import { CLOUDIOS } from "@lib/cloudios/helpers/cloudios-helper";
import { main } from "@lib/cloudios/hooks/post/register-session-id";

const { input } = CLOUDIOS;

// Main execution
async function runHook() {
  const event = await input();
  await main(event);
}

runHook().catch((error: Error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
