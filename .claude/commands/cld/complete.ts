#!/usr/bin/env bun --bun

import {
  getLatestAudioForSession,
  pollForAudioCompletion,
} from "@lib/cloudios/helpers/audio-utils";
import { CLOUDIOS } from "@lib/cloudios/helpers/cloudios-helper";

async function main() {
  const args = process.argv.slice(2);
  const agentName = args[0];
  const cardIdStr = args[1];
  const message = args[2] || ""; // Make message optional with empty default

  const cardId = cardIdStr ? Number.parseInt(cardIdStr) : NaN;

  if (!agentName || !cardId || Number.isNaN(cardId)) {
    CLOUDIOS.error("Usage: /cld:complete <agent-name> <card-id> [message]");
    process.exit(1);
  }

  const { session_id } = CLOUDIOS.readAgentSession(agentName);
  if (!session_id) {
    CLOUDIOS.error(
      "❌ No agent session id found. Please run /cld:register first.",
    );
    process.exit(1);
  }

  // Get the latest audio info for this session
  const audioInfo = await getLatestAudioForSession(session_id, process.cwd());

  const detailsObj = {
    completion_message: message,
    audio_summary: "",
    audio_message_id: "",
    audio_mp3_path: "",
  };

  if (audioInfo) {
    // Wait a bit for the audio to be processed
    const mp3Path = await pollForAudioCompletion(
      audioInfo.audio_id,
      process.env.CLOUDIOS_SERVER || "http://localhost:4000",
      10,
    );

    if (mp3Path) {
      detailsObj.audio_summary = audioInfo.text;
      detailsObj.audio_message_id = audioInfo.audio_id;
      detailsObj.audio_mp3_path = mp3Path;
      CLOUDIOS.debug(`Found audio for completion: ${mp3Path}`);
    }
  }

  // Pass the details as JSON string
  const details = JSON.stringify(detailsObj);

  try {
    const success = await CLOUDIOS.moveCardTo(
      "review",
      cardId,
      session_id,
      details,
    );
    if (success) {
      CLOUDIOS.success(`✅ Card ${cardId} moved to Review column`);
      if (message) {
        CLOUDIOS.debug(`📝 Completion message: ${message}`);
      }
    } else {
      CLOUDIOS.error(`❌ Failed to move card ${cardId}`);
      process.exit(1);
    }
  } catch (error) {
    CLOUDIOS.error(`❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  CLOUDIOS.error(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
