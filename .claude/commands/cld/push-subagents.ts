#!/usr/bin/env bun

import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { confirm } from "@inquirer/prompts";
import { CLOUDIOS } from "@lib/cloudios/helpers/cloudios-helper";
import * as yaml from "yaml";

const { CLOUDIOS_URL } = CLOUDIOS.paths();

interface SubAgentFrontmatter {
  name: string;
  description: string;
  color?: string;
}

interface SubAgent {
  name: string;
  description: string;
  color?: string;
  content: string;
}

async function parseSubAgentFile(filePath: string): Promise<SubAgent | null> {
  try {
    const content = await readFile(filePath, "utf-8");

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      console.error(`❌ No valid frontmatter found in ${basename(filePath)}`);
      return null;
    }

    const [, frontmatterStr, body] = frontmatterMatch;
    const frontmatter = yaml.parse(frontmatterStr) as SubAgentFrontmatter;

    if (!frontmatter.name || !frontmatter.description) {
      console.error(
        `❌ Missing required fields (name, description) in ${basename(filePath)}`,
      );
      return null;
    }

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      color: frontmatter.color,
      content: body.trim(),
    };
  } catch (error) {
    console.error(`❌ Error parsing ${basename(filePath)}:`, error);
    return null;
  }
}

async function uploadSubAgent(
  subAgent: SubAgent,
  force: boolean,
): Promise<boolean> {
  try {
    // First check if sub-agent exists
    if (!force) {
      const checkResponse = await fetch(
        `${CLOUDIOS_URL}/api/subagents/${subAgent.name}`,
      );
      if (checkResponse.ok) {
        const shouldOverwrite = await confirm({
          message: `Sub-agent "${subAgent.name}" already exists. Overwrite?`,
          default: false,
        });
        if (!shouldOverwrite) {
          console.log(`⏭️  Skipped ${subAgent.name}`);
          return false;
        }
      }
    }

    // Upload the sub-agent
    const response = await fetch(`${CLOUDIOS_URL}/api/subagents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subAgent),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Server returned ${response.status}: ${error}`);
    }

    console.log(`✅ Uploaded ${subAgent.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${subAgent.name}:`, error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Default to 'all' if no arguments provided
  const agentName =
    args.length === 0 || args[0] === "--force" ? "all" : args[0];
  const force = args.includes("--force");
  const agentsDir = join(process.cwd(), ".claude", "agents");

  console.log("🚀 Pushing sub-agents to CLOUDIOS...\n");

  try {
    let filesToProcess: string[] = [];

    if (agentName === "all") {
      // Get all .md files in the agents directory
      const files = await readdir(agentsDir);
      filesToProcess = files
        .filter((f) => f.endsWith(".md"))
        .map((f) => join(agentsDir, f));

      if (filesToProcess.length > 0) {
        console.log(
          `📋 Found ${filesToProcess.length} sub-agent(s) to process:`,
        );
        filesToProcess.forEach((f) => console.log(`   - ${basename(f)}`));
        console.log("");
      }
    } else {
      // Single file
      const fileName = agentName.endsWith(".md")
        ? agentName
        : `${agentName}.md`;
      filesToProcess = [join(agentsDir, fileName)];
    }

    if (filesToProcess.length === 0) {
      console.error("❌ No sub-agent files found");
      process.exit(1);
    }

    let successCount = 0;
    let failCount = 0;

    for (const filePath of filesToProcess) {
      const subAgent = await parseSubAgentFile(filePath);
      if (subAgent) {
        const success = await uploadSubAgent(subAgent, force);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    }

    console.log(
      `\n📊 Summary: ${successCount} uploaded, ${failCount} failed/skipped`,
    );

    if (successCount > 0) {
      console.log(
        `\n🌐 View and manage sub-agents at: ${CLOUDIOS_URL}/sub-agents`,
      );
    }

    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
