// ====================
// AGENT MANAGEMENT
// ====================

import fs from "node:fs";
import path from "node:path";
import type { AgentInfo, AgentInfoContext } from "../types";
import { CLOUDIOS_IDENTIFY_API } from "./config";
import { DebugUtils } from "./debug-utils";
import { ProjectUtils } from "./project-utils";

export const AgentUtils = {
  validateAgentInfo: (
    info: AgentInfo | AgentInfoContext,
    requireSession = false,
  ) => {
    const baseRequired = [
      "agent_name",
      "agent_role",
      "repo_name",
      "project_path",
      "preferred_voice",
      "setup_timestamp",
    ];
    const sessionRequired = requireSession ? ["session_id"] : [];
    const required = [...baseRequired, ...sessionRequired];

    for (const field of required) {
      if (!info[field as keyof typeof info]) {
        throw new Error(`Invalid agent info: missing ${field}`);
      }
    }
  },
  writeAgentInfo: (info: AgentInfo) => {
    AgentUtils.validateAgentInfo(info);
    const { NAMES_DIR } = ProjectUtils.paths();
    const agentInfoPath = path.join(NAMES_DIR, `${info.agent_name}.json`);
    if (fs.existsSync(agentInfoPath)) {
      // It's possible that we're renaming the existing agent
      fs.renameSync(agentInfoPath, `${agentInfoPath}.bak`);
    }
    fs.writeFileSync(agentInfoPath, JSON.stringify(info, null, 2));
  },
  readAgentInfo: (agent_name: string) => {
    const { NAMES_DIR } = ProjectUtils.paths();
    const agentInfoPath = path.join(NAMES_DIR, `${agent_name}.json`);
    return JSON.parse(fs.readFileSync(agentInfoPath, "utf-8")) as AgentInfo;
  },
  writeAgentSession: (
    agent_name: string,
    session_id: string,
    transcript_path?: string,
  ) => {
    const { NAMES_DIR, LINKS_DIR } = ProjectUtils.paths();
    const agentInfoPath = path.join(NAMES_DIR, `${agent_name}.json`);
    const agentLinkPath = path.join(LINKS_DIR, session_id);
    const info = AgentUtils.readAgentInfo(agent_name);
    fs.writeFileSync(
      agentInfoPath,
      JSON.stringify({ ...info, session_id, transcript_path }, null, 2),
    );
    fs.writeFileSync(agentLinkPath, agent_name);
  },
  readAgentSession: (agent_name: string) => {
    const { NAMES_DIR } = ProjectUtils.paths();
    const agentInfoPath = path.join(NAMES_DIR, `${agent_name}.json`);
    const info = JSON.parse(
      fs.readFileSync(agentInfoPath, "utf-8"),
    ) as AgentInfoContext;
    AgentUtils.validateAgentInfo(info, true);
    return info;
  },
  readAgentName: (session_id: string) => {
    const { LINKS_DIR } = ProjectUtils.paths();
    const agentLinkPath = path.join(LINKS_DIR, session_id);
    if (!fs.existsSync(agentLinkPath)) {
      return null;
    }
    return fs.readFileSync(agentLinkPath, "utf-8").trim();
  },
  register: async (agent_name: string) => {
    const payload = AgentUtils.readAgentSession(agent_name);
    try {
      const response = await fetch(CLOUDIOS_IDENTIFY_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const { NAMES_DIR } = ProjectUtils.paths();
        const agentInfoPath = path.join(NAMES_DIR, `${agent_name}.json`);
        const info = AgentUtils.readAgentInfo(agent_name);
        fs.writeFileSync(
          agentInfoPath,
          JSON.stringify({ ...info, agent_id: result.agent.id }, null, 2),
        );

        DebugUtils.debug(`✅ Successfully registered with CLOUDIOS!`);
        DebugUtils.debug(`   Agent ID: ${result.agent.id}`);
        DebugUtils.debug(`   Session ID: ${result.agent.session_id}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ Registration failed: ${errorText}`);
        console.error(`   Falling back to local setup only...`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Registration error: ${(error as Error).message}`);
      console.error(`   Falling back to local setup only...`);
      return false;
    }
  },
};
