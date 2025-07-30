#!/usr/bin/env bun --bun

import { CLOUDIOS } from "@lib/cloudios/helpers/cloudios-helper";
import {
  isHookPostToolUseEvent,
  isHookPreToolUseEvent,
  isHookStopEvent,
  isHookUserPromptSubmitEvent,
} from "@lib/cloudios/types";

const { input, debugTx, getClaudeLastMessage, success } = CLOUDIOS;

async function main() {
  const event = await input();
  const debug = debugTx(event.hook_event_name);
  debug(`${event.hook_event_name}:`, event);
  if (isHookUserPromptSubmitEvent(event)) {
    debug("User Prompt:", event.prompt);
  }
  if (isHookStopEvent(event)) {
    const message = await getClaudeLastMessage(event);
    debug("Claude Last Message:", message);
  }
  if (isHookPreToolUseEvent(event)) {
    debug("Tool Input:", event.tool_input);
  }
  if (isHookPostToolUseEvent(event)) {
    debug("Tool Output:", event.tool_name, event.tool_input);
  }
  success({ message: "Event processed successfully" });
}

// Main execution
main().catch((error: Error) => {
  CLOUDIOS.error(`Fatal error: ${(error as Error).message}`);
  process.exit(1);
});
