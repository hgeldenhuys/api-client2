# Push Sub-Agents - Upload Claude Code Sub-Agents to CLOUDIOS

Upload Claude Code sub-agent profiles to the CLOUDIOS server for remote deployment and management.

## Synopsis

```bash
bun --bun .claude/commands/cld/push-subagents.ts <agent_name|all> [--force]
```

## Description

The `/cld:push-subagents` command uploads sub-agent profiles from your local `.claude/agents/` directory to the CLOUDIOS server. These sub-agents can then be deployed to any connected agent via the web UI.

Sub-agents are specialized AI assistants with specific purposes, featuring unique expertise areas, custom prompts, and configurable tool access. This command allows you to share and manage sub-agents across your entire CLOUDIOS ecosystem.

## Arguments

### Required

- **`agent_name`** - The name of the sub-agent to push (without .md extension)
  - Use `all` to push all sub-agents in the directory

### Optional Flags

- **`--force`** - Overwrite existing sub-agents on the server without confirmation

## Examples

### Push a single sub-agent
```bash
/cld:push-subagents docs-tests-updater
```

### Push all sub-agents
```bash
/cld:push-subagents all
```

### Force overwrite existing sub-agents
```bash
/cld:push-subagents docs-tests-updater --force
```

## Sub-Agent Format

Sub-agents are markdown files with YAML frontmatter containing:
- `name`: Unique identifier for the sub-agent
- `description`: Detailed description of the sub-agent's purpose
- `color`: Optional color for UI display (e.g., "cyan", "blue", "green")

The body of the file contains the system prompt for the sub-agent.

## Output

The command will:
1. Read the specified sub-agent file(s)
2. Parse and validate the YAML frontmatter
3. Upload to the CLOUDIOS server
4. Report success or failure for each sub-agent

## Error Handling

- If a sub-agent file is not found, an error message is displayed
- If a sub-agent already exists on the server (without --force), you'll be prompted to confirm
- If the YAML frontmatter is invalid, the upload will be skipped with an error message
- Network errors are reported with suggestions for troubleshooting

## Notes

- Sub-agents are stored in `.claude/agents/` directory
- Only `.md` files with valid frontmatter are processed
- The `links` and `names` subdirectories are ignored
- Sub-agents can be managed and deployed via the CLOUDIOS web UI at `/sub-agents`

## PARAMOUNT AUDIO REQUIREMENT

<audio>I'll push the specified sub-agent profiles to CLOUDIOS for remote deployment</audio>