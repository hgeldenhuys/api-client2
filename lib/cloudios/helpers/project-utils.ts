// ====================
// PROJECT & PATH MANAGEMENT
// ====================

import fs from "node:fs";
import path from "node:path";
import * as process from "node:process";
import type { CloudiosConfig } from "@lib/cloudios/types";
import { ProcessUtils } from "./process-utils";

export const ProjectUtils = {
  paths: () => {
    const PROJECT_PATH = process.cwd();
    const PROJECT_NAME = path.basename(PROJECT_PATH);
    const CLAUDE_DIR = path.join(PROJECT_PATH, ".claude");
    const CLOUDIOS_DIR = path.join(CLAUDE_DIR, "cloudios");
    const AGENT_DIR = path.join(CLOUDIOS_DIR, "agents");
    const NAMES_DIR = path.join(AGENT_DIR, "names");
    const LINKS_DIR = path.join(AGENT_DIR, "links");
    // Try to read the server URL from config.json first
    let CLOUDIOS_URL: string;
    let CLOUDIOS_CONFIG: string;

    try {
      CLOUDIOS_CONFIG =
        process.env.CLOUDIOS_CONFIG ??
        path.join(CLAUDE_DIR, "cloudios", "config.json");
      if (fs.existsSync(CLOUDIOS_CONFIG)) {
        const config = JSON.parse(fs.readFileSync(CLOUDIOS_CONFIG, "utf-8"));
        CLOUDIOS_URL = process.env.CLOUDIOS_URL ?? config.serverUrl;
      }
    } catch (e) {
      throw new Error(
        `Failed to read CLOUDIOS_CONFIG: ${(e as Error).message}`,
      );
    }
    CLOUDIOS_URL ??= "http://localhost:4000";

    fs.mkdirSync(AGENT_DIR, { recursive: true });
    fs.mkdirSync(NAMES_DIR, { recursive: true });
    fs.mkdirSync(LINKS_DIR, { recursive: true });
    return {
      PROJECT_PATH,
      PROJECT_NAME,
      CLAUDE_DIR,
      CLOUDIOS_DIR,
      AGENT_DIR,
      NAMES_DIR,
      LINKS_DIR,
      CLOUDIOS_URL,
      CLOUDIOS_CONFIG,
    };
  },
  getConfig: () => {
    const { CLOUDIOS_CONFIG } = ProjectUtils.paths();
    return JSON.parse(
      fs.readFileSync(CLOUDIOS_CONFIG, "utf-8"),
    ) as CloudiosConfig;
  },
  getArgument: (index = 0) => {
    const args = process.argv.slice(2);
    if (args.length > index) {
      return args[index];
    } else {
      ProcessUtils.error(`Missing argument at index ${index}`);
      return "";
    }
  },
};
