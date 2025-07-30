#!/usr/bin/env bun

import * as fs from "node:fs";
import * as path from "node:path";
import { CLOUDIOS } from "@lib/cloudios/helpers/cloudios-helper";
import { CLOUDIOS_SERVER } from "@lib/cloudios/helpers/config";
import type { KanbanCard } from "@lib/cloudios/types";

const { PROJECT_NAME, PROJECT_PATH } = CLOUDIOS.paths();

async function createKanbanCardFile(
  card: KanbanCard,
  agentName: string,
  sessionId: string,
): Promise<void> {
  try {
    const kanbanPath = path.join(PROJECT_PATH, ".claude", "agents", "kanban");
    if (!fs.existsSync(kanbanPath)) {
      fs.mkdirSync(kanbanPath, { recursive: true });
    }

    const cardFileName = `kanban-${agentName}.md`;
    const cardFilePath = path.join(kanbanPath, cardFileName);

    // Create the card file content with frontmatter for the hook
    const cardContent = `---
cardId: ${card.id}
agentName: ${agentName}
sessionId: ${sessionId}
projectName: ${PROJECT_NAME}
title: "${card.title}"
lastStatus: In Progress
---

# Kanban Task: ${card.title}

**Card ID:** ${card.id}
**Priority:** ${card.priority}
**Status:** In Progress
**Project:** ${PROJECT_NAME}

## Description
${card.description ?? "No description provided."}
`;

    fs.writeFileSync(cardFilePath, cardContent);
    CLOUDIOS.debug(`💾 Created kanban card file: ${cardFileName}`);
  } catch (error) {
    CLOUDIOS.error(
      `Failed to create kanban card file: ${(error as Error).message}`,
    );
  }
}

async function displayCard(card: KanbanCard, agent_name: string) {
  try {
    // Get full card details with activities
    const response = await fetch(
      `${CLOUDIOS_SERVER}/api/kanban/card/${card.id}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      CLOUDIOS.error(`Failed to get card details: ${response.status}`);
      return;
    }

    const data = await response.json();
    const fullCard = data.card;
    const activities = data.activities || [];

    // Format and display card
    CLOUDIOS.debug(`\n${"=".repeat(60)}`);
    CLOUDIOS.debug(`# Kanban Task: ${fullCard.title}`);
    CLOUDIOS.debug("=".repeat(60));
    CLOUDIOS.debug(`\n**Card ID:** ${fullCard.id}`);
    CLOUDIOS.debug(`**Priority:** ${fullCard.priority}`);
    CLOUDIOS.debug(`**Status:** ${fullCard.column_name}`);
    CLOUDIOS.debug(`**Project:** ${PROJECT_NAME}`);

    if (fullCard.due_date) {
      CLOUDIOS.debug(
        `**Due Date:** ${new Date(fullCard.due_date).toLocaleDateString()}`,
      );
    }

    CLOUDIOS.debug(
      `\n## Description\n${fullCard.description || "No description provided."}`,
    );

    // Display feedback history if any
    if (activities.length > 0) {
      CLOUDIOS.debug(`\n## Feedback History\n`);

      for (const activity of activities) {
        const date = new Date(activity.created_at).toLocaleString();

        if (activity.activity_type === "rejected_from_review") {
          CLOUDIOS.debug(`### Review Rejection - ${date}`);
          if (activity.details?.reason) {
            CLOUDIOS.debug(`**User Reason:** "${activity.details.reason}"\n`);
          }
        } else if (activity.activity_type === "agent_feedback") {
          CLOUDIOS.debug(`### Agent Completion - ${date}`);
          CLOUDIOS.debug(
            `**Agent:** ${activity.agent?.agent_name || "Unknown"}\n`,
          );
          if (activity.details?.content) {
            CLOUDIOS.debug(`${activity.details.content}\n`);
          }
        }

        CLOUDIOS.debug("---\n");
      }
    }

    // Display instructions
    CLOUDIOS.debug(`## Instructions

1. Read the description and any feedback history carefully
2. Create TodoWrite items to track your progress
3. When complete, provide a detailed response with a <summary> tag
4. **IMPORTANT**: When you finish working on this task, run the following command:
   \`\`\`bash
   bun --bun .claude/commands/cloudios/complete.ts ${agent_name} ${fullCard.id} "Your completion message here"
   \`\`\`
   This will move the card to Review and post your completion feedback.
`);
  } catch (error) {
    CLOUDIOS.error(`Failed to display card: ${(error as Error).message}`);
  }
}

async function main() {
  try {
    const agent_name = CLOUDIOS.getArgument(0);
    // Check if the second argument exists without triggering an error
    const args = process.argv.slice(2);
    const allowUnassigned = args.length > 1 && args[1] === "next";
    const { session_id } = CLOUDIOS.readAgentSession(agent_name);

    // Use the API with proper parameter
    const { PROJECT_NAME } = CLOUDIOS.paths();
    const includeParam = allowUnassigned ? "&includeUnassigned=true" : "";
    const response = await fetch(
      `${CLOUDIOS_SERVER}/api/kanban/next-assigned-task?projectName=${PROJECT_NAME}&agentSessionId=${session_id}${includeParam}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      CLOUDIOS.error(`Failed to get next task: ${response.status}`);
      process.exit(1);
    }

    const data = await response.json();
    const nextCard = data.card || null;

    if (!nextCard) {
      if (allowUnassigned) {
        CLOUDIOS.debug("\n✅ No tasks available. Great job keeping up!");
      } else {
        CLOUDIOS.debug(
          "\n✅ No tasks assigned to you. Use `/cloudios:wip next` to pick up an unassigned task.",
        );
      }
      process.exit(0);
    }

    CLOUDIOS.debug(
      `\n📋 Found task: ${nextCard.title} (Priority: ${nextCard.priority})`,
    );

    // Move to the work column
    await CLOUDIOS.moveCardTo("work", nextCard.id, session_id);

    // Create a kanban card file for the hook
    await createKanbanCardFile(nextCard, agent_name, session_id);

    // Display the full card details
    await displayCard(nextCard, agent_name);
  } catch (error) {
    CLOUDIOS.error(`❌ Error: ${(error as Error).message}`);
  }
}

main().catch(console.error);
