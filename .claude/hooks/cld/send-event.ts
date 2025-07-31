#!/usr/bin/env bun
/**
 * Universal hook event sender for CLOUDIOS observability.
 * Sends Claude Code hook events to the CLOUDIOS API.
 */

import fs from "node:fs";
import path from "node:path";
import { CLOUDIOS } from "@lib/cloudios/helpers/cloudios-helper";
import { isHookStopEvent, type SendEventEvent } from "@lib/cloudios/types";

const { paths, input, debug, getClaudeLastMessage, readAgentName } = CLOUDIOS;

async function sendEventToCloudios(
  eventData: SendEventEvent,
  serverUrl: string,
): Promise<boolean> {
  CLOUDIOS.debug(`Sending event to CLOUDIOS: `, eventData);
  try {
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "CLOUDIOS-Hook/1.0",
      },
      body: JSON.stringify(eventData),
    });

    if (response.ok) {
      const result = await response.json();
      CLOUDIOS.debug(`Event sent successfully: `, result);
      if (result.error) {
        CLOUDIOS.error(`Error from server: ${result.error}`);
        return false;
      }
      debug(result);
      CLOUDIOS.success(result);
      return true;
    } else {
      CLOUDIOS.debug(`Server returned status: ${response.status}`);
      return true;
    }
  } catch (error) {
    CLOUDIOS.debug(
      `Failed to send event: ${(error as Error).message}. Please check if the dev server is running.`,
    );
    return true;
  }
}

async function main() {
  // Parse command line arguments
  const event = await input();
  
  // Read agent name from the correct project directory using event.cwd
  const linksDir = path.join(event.cwd, ".claude", "cloudios", "agents", "links");
  const agentLinkPath = path.join(linksDir, event.session_id);
  let agent_name = null;
  
  if (fs.existsSync(agentLinkPath)) {
    agent_name = fs.readFileSync(agentLinkPath, "utf-8").trim();
  }
  
  if (!agent_name) {
    CLOUDIOS.debug(
      `Error: Agent registration not completed for session ${event.session_id} in ${event.cwd}`,
    );
    process.exit(0);
  }
  
  // Handle UserPromptSubmit events - create new prompt context
  if (event.hook_event_name === "UserPromptSubmit") {
    const prompt = event.prompt || "";
    CLOUDIOS.createPromptContext(event.session_id, prompt, event.cwd);
    CLOUDIOS.debug(`Created new prompt context for session ${event.session_id}`);
  }
  
  // Read current prompt context for this specific session
  const context = CLOUDIOS.readPromptContext(event.cwd, event.session_id);
  const prompt_id = context?.prompt_id;
  
  const data: SendEventEvent = {
    ...event,
    timestamp: Date.now(),
    agent_name,
    prompt_id,
  };

  const serverUrl = `${paths().CLOUDIOS_URL}/api/hooks`;

  if (!event.hook_event_name) {
    CLOUDIOS.error("Error: --event-type is required");
    process.exit(1);
  }

  // Augment Stop events with Claude's last message
  if (isHookStopEvent(data)) {
    try {
      const lastMessage = await getClaudeLastMessage(event);
      if (lastMessage) {
        // Add the extracted message to the event
        data.claude_last_message = lastMessage;
        CLOUDIOS.debug(
          `Extracted Claude's last message: ${lastMessage.substring(0, 100)}...`,
        );
      }
    } catch (error) {
      CLOUDIOS.debug(
        `Failed to extract last message: ${(error as Error).message}`,
      );
      // Continue anyway - audio generation will fall back to a basic summary
    }
  }

  // Send to CLOUDIOS
  await sendEventToCloudios(data, serverUrl);

  // Always exit with 0 to not block Claude Code operations
  process.exit(0);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(0);
});
