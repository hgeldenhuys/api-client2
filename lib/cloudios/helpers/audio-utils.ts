import * as fs from "node:fs/promises";
import * as path from "node:path";

interface AudioInfo {
  audio_id: string;
  text: string;
  timestamp: string;
  session_id: string;
  mp3_path?: string;
}

export async function getLatestAudioForSession(
  sessionId: string,
  projectPath: string,
): Promise<AudioInfo | null> {
  try {
    const audioInfoPath = path.join(
      projectPath,
      ".claude",
      "agents",
      "audio",
      `${sessionId}-latest.json`,
    );
    const data = await fs.readFile(audioInfoPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // No audio info found
    console.error("Error reading latest audio info:", error);
    return null;
  }
}

export async function getAudioMp3Path(
  audioId: string,
  serverUrl: string,
): Promise<string | null> {
  try {
    // Query the server to get the audio message details
    const response = await fetch(`${serverUrl}/api/audio?audio_id=${audioId}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Check if this is a specific audio_id response
    if (data.found && data.audio_message) {
      return data.audio_message.mp3_path || null;
    }

    // Fallback to checking queue and playing items for backwards compatibility
    const allMessages = [
      ...(data.queue?.messages || []),
      data.currently_playing,
    ].filter(Boolean);

    const audioMessage = allMessages.find((msg) => msg.id === audioId);
    return audioMessage?.mp3_path || null;
  } catch (error) {
    console.error("Error getting audio MP3 path:", error);
    return null;
  }
}

export async function pollForAudioCompletion(
  audioId: string,
  serverUrl: string,
  maxAttempts = 30,
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const mp3Path = await getAudioMp3Path(audioId, serverUrl);
    if (mp3Path) {
      return mp3Path;
    }

    // Wait 2 seconds before next attempt
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return null;
}
