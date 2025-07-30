#!/usr/bin/env bun --bun ${PWD}/.claude/commands/cld/complete.ts "<agent-name>" <card-id> "<message>"

# CLOUDIOS Complete Task

Moves a task card to the Review column after completion.

Usage: `/cld:complete "<agent-name>" <card-id> "<message>"`

Where:
- `<agent-name>` is your agent name from `/cld:register`
- `<card-id>` is the ID of the card to complete
- `<message>` is an optional completion message/feedback

This command will:
1. Read `.claude/cloudios/agents/names/${name}.json` to get your session context
2. Move the specified card to the configured Review column (default: "Review")
3. Add any provided message as completion feedback
4. Clean up the kanban card file

## Examples

```bash
# Basic completion
bun --bun .claude/commands/cld/complete.ts MyAgent 123

# With completion message
bun --bun .claude/commands/cld/complete.ts MyAgent 123 "Implemented the feature as requested"
```

## Notes

- The card must be assigned to your session to complete it
- The Review column name is configurable per board
- Completion feedback is recorded in the card's activity history
- The kanban card file is automatically cleaned up after completion

Remember: Always include a `<summary>` tag in your responses!