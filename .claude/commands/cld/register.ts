#!/usr/bin/env bun --bun

// This script dumps the initial name metadata for a Claude Code agent
// After this script ran, the hooks/cld/post/register-session-id.ts hook will trigger on the stop event

import * as os from "node:os";
import { CLOUDIOS } from "@lib/cloudios/helpers/cloudios-helper";
import type { AgentInfo } from "@lib/cloudios/types";

const { error, paths, writeAgentInfo, debug } = CLOUDIOS;

// Get the user's IP address (tries multiple methods)
export async function getIPAddress(): Promise<string | undefined> {
  try {
    // Method 1: Try to get external IP via a DNS query
    const dns = await import("node:dns");
    const { Resolver } = dns.promises;
    const resolver = new Resolver();
    resolver.setServers(["208.67.222.222", "208.67.220.220"]); // OpenDNS

    try {
      const addresses = await resolver.resolve4("myip.opendns.com");
      if (addresses && addresses.length > 0) {
        return addresses[0];
      }
    } catch (e) {
      debug("Error getting external IP:", e);
      // Continue to fallback methods
    }

    // Method 2: Get local network IP
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName of Object.keys(networkInterfaces)) {
      const interfaces = networkInterfaces[interfaceName];
      if (!interfaces) continue;

      for (const iface of interfaces) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }

    // Method 3: If all else fails, return localhost
    return "127.0.0.1";
  } catch (error) {
    console.error("Error getting IP address:", error);
    return undefined;
  }
}

// Get the system username
export function getUsername(): string {
  try {
    // Try multiple methods to get the username
    return (
      process.env.USER ||
      process.env.USERNAME ||
      process.env.LOGNAME ||
      os.userInfo().username ||
      "unknown"
    );
  } catch (error) {
    debug("Error getting username:", error);
    return "unknown";
  }
}

// Parse key=value arguments
export function parseKeyValueArgs(args: string[]): Record<string, string> {
  const keyValueArgs: Record<string, string> = {};
  for (const arg of args) {
    if (arg.includes("=")) {
      const [key, ...valueParts] = arg.split("=");
      // Handle values with = in them
      keyValueArgs[key] = valueParts.join("=");
    }
  }
  return keyValueArgs;
}

// Get starred voices by gender from the API
async function getStarredVoicesByGender(gender: string): Promise<string[]> {
  try {
    const response = await fetch("http://localhost:4000/api/voices");
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const data = await response.json();
    const voices = data.voices || [];

    // Filter for starred voices matching the gender
    const starredVoices = voices
      .filter(
        (voice: any) =>
          (voice.is_starred === true || voice.is_starred === 1) &&
          voice.gender === gender,
      )
      .map((voice: any) => voice.name);

    return starredVoices;
  } catch (err) {
    debug(`Error fetching voices from API: ${err}`);
    return [];
  }
}

export async function register() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const AGENT_NAME = args.find(
    (arg) => !arg.startsWith("-") && !arg.includes("="),
  );

  if (!AGENT_NAME) {
    error(`❌ Missing agent name`);
    return false;
  }

  // Parse optional key=value arguments
  const keyValueArgs = parseKeyValueArgs(args);

  const AGENT_ROLE = keyValueArgs.role || "developer";
  const GENDER = keyValueArgs.gender || "male";
  const THEME = keyValueArgs.theme;
  const { PROJECT_NAME, PROJECT_PATH } = paths();

  // Get a random starred voice based on gender
  let PREFERRED_VOICE = "default";
  const starredVoices = await getStarredVoicesByGender(GENDER);

  if (starredVoices.length > 0) {
    // Select a random voice from the starred voices
    const randomIndex = Math.floor(Math.random() * starredVoices.length);
    PREFERRED_VOICE = starredVoices[randomIndex];
    debug(`Selected starred voice: ${PREFERRED_VOICE} for gender: ${GENDER}`);
  } else {
    debug(`No starred voices found for gender: ${GENDER}, using default`);
  }

  // Get IP address and username
  const ipAddress = await getIPAddress();
  const username = getUsername();

  // Create agent metadata
  const agentInfo: AgentInfo = {
    agent_name: AGENT_NAME,
    agent_role: AGENT_ROLE,
    repo_name: PROJECT_NAME,
    project_path: PROJECT_PATH,
    preferred_voice: PREFERRED_VOICE,
    setup_timestamp: new Date().toISOString(),
    ip_address: ipAddress,
    username: username,
    gender: GENDER,
    ...(THEME && { theme: THEME }), // Only include the theme if provided
  };

  writeAgentInfo(agentInfo);

  return agentInfo;
}

register()
  .then((success) => {
    if (!success) {
      error(
        `\n⚠️  Registration deferred - will complete when Claude Code stops`,
      );
    }
  })
  .catch((err) => {
    error(`❌ Setup error: ${err.message}`);
  });
