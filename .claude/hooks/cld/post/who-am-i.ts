#!/usr/bin/env bun --bun

import { CLOUDIOS } from "@lib/cloudios/helpers/cloudios-helper";
import { isHookPostToolUseEvent } from "@lib/cloudios/types";

const { input, debugTx, success, readAgentName, readAgentInfo } = CLOUDIOS;

async function main() {
  const event = await input();
  const debug = debugTx(event.hook_event_name);
  debug(`${event.hook_event_name}:`, event);
  debug(`isHookPostToolUseEvent(event)`, isHookPostToolUseEvent(event));
  debug(
    `event.tool_name.toLowerCase() === "bash"`,
    isHookPostToolUseEvent(event) && event.tool_name.toLowerCase() === "bash",
  );
  debug(
    `event.tool_name.toLowerCase() === "bash"`,
    isHookPostToolUseEvent(event) &&
      event.tool_input.command === 'echo "who-am-i"',
  );
  if (
    isHookPostToolUseEvent(event) &&
    event.tool_name.toLowerCase() === "bash" &&
    event.tool_input.command === 'echo "who-am-i"'
  ) {
    const agentName = readAgentName(event.session_id);
    const agentInfo = readAgentInfo(agentName);

    success(agentInfo);
  }
}

// Main execution
main().catch((error: Error) => {
  CLOUDIOS.error(`Fatal error: ${(error as Error).message}`);
  process.exit(1);
});
