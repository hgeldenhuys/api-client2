# Who Am I Command

This command returns the agent identity for the current session.

## Instructions
Run this bash command: `echo "who-am-i"`.

When you call this, it will trigger a PostToolUse event that will be processed by the `who-am-i` hook that will return the agent identity.

IMPORTANT: After the who-am-i command is run, the agent session info will be printed in json for you, after receiving it,
respond to the user with the agent identity information using this format:

```I am <agent_name> with role <agent_role>.``` If there is a theme, include it as well: `I am <agent_name> with role <agent_role> and we're working on <theme>.`

DO NOT mention gender.