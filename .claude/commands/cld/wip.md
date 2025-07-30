#!/usr/bin/env bun --bun ${PWD}/.claude/commands/cld/wip.ts ${agent-name} [next]

# CLOUDIOS Work In Progress

Picks up the next kanban task assigned to you and moves it to the configured Work column (default: "In Progress").

## Usage

**Pick up a task assigned to you:**
`/cld:wip <agent-name>`

**Pick up any available task (assigned or unassigned):**
`/cld:wip <agent-name> next`

Where `<agent-name>` is your agent name from `/cld:register`.

## Behavior

**Default behavior (`/cld:wip`):**
- Only picks up cards specifically assigned to you
- If no assigned cards are available, suggests using `/cld:wip next`

**With `next` parameter (`/cld:wip next`):**
- Picks up cards in this priority order:
  1. Cards assigned to you
  2. Unassigned cards from Ready columns

This command will:
1. Read `.claude/agents/${name}.json` to get your context that was set by a hook that had access to the session-id
2. Find the next appropriate card based on the mode (assigned-only or any)
3. If found, move the card to the Work column and display it
4. Work on the card, using the card description and acceptance criteria and consider any valuable history
5. When complete, provide a detailed response explaining what you did and include a `<summary>` tag and save this on the card in CLOUDIOS

## Working on Tasks

- Read the description and acceptance criteria carefully
- Check the feedback history for any previous attempts or rejections
- Create TodoWrite items to track your progress
- When complete, provide a detailed response explaining what you did

## Task Completion

Call:
```bash
bun --bun ${PWD}/.claude/commands/cloudios/complete.ts <agent-name> <card-id> <message>
```

Remember: Always include a `<summary>` tag in your responses!