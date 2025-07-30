# CLOUDIOS Agent Registration Workflow

## Overview

The CLOUDIOS agent registration system is a two-phase process that creates agents and links them to Claude Code sessions. This document describes the complete workflow from initial registration to session association.

## Full Registration Workflow

### Phase 1: Agent Registration (`/cld:register`)

```bash
/cld:register <Name> [role=<role>] [gender=<gender>] [theme=<theme>]
```

**Process:**
1. **Command Execution**: User runs `/cld:register Ben gender=male`
2. **Argument Parsing**: The register command parses:
   - Required: `agent_name` (first non-flag, non-key=value argument)
   - Optional: `role` (default: "developer")
   - Optional: `gender` (default: "male") 
   - Optional: `theme` (conditional field)
3. **System Detection**: Automatically detects:
   - IP Address (external IP via DNS → local network IP → localhost fallback)
   - Username (USER env → USERNAME env → LOGNAME env → os.userInfo() → "unknown")
   - Project metadata (repo name, project path)
4. **Agent Creation**: Creates `.claude/cloudios/agents/names/{agent_name}.json` with:
   ```json
   {
     "agent_name": "Ben",
     "agent_role": "developer", 
     "repo_name": "cloudios",
     "project_path": "/Users/hgeldenhuys/WebstormProjects/cloudios",
     "preferred_voice": "default",
     "setup_timestamp": "2025-07-22T00:41:42.942Z",
     "ip_address": "70.29.178.247",
     "username": "hgeldenhuys",
     "gender": "male"
   }
   ```

### Phase 2: Session Association (PostToolUse Hook)

**Trigger Pattern:** `/cld\/register\.ts\s+(\w+)/`

**Process:**
1. **Hook Activation**: PostToolUse hook monitors all bash commands
2. **Pattern Matching**: Detects commands containing `cld/register.ts` 
3. **Agent Name Extraction**: Uses regex to extract agent name from command
4. **Session Linking**: 
   - Calls `writeAgentSession(agentName, sessionId)` 
   - Creates `.claude/cloudios/agents/links/{session_id}` containing agent name
   - Updates agent metadata with `session_id` field
5. **Confirmation**: Returns complete agent session data

## File Structure Created

### Agent Metadata
```
.claude/cloudios/agents/names/{agent_name}.json
```
Contains the complete `AgentInfo` object with system detection results.

### Session Link  
```
.claude/cloudios/agents/links/{session_id}
```
Contains simple text file with agent name for session-to-agent lookup.

### Updated Agent Context
After session association, the agent metadata includes `session_id`:
```json
{
  "agent_name": "Ben",
  "agent_role": "developer",
  "repo_name": "cloudios", 
  "project_path": "/Users/hgeldenhuys/WebstormProjects/cloudios",
  "preferred_voice": "default",
  "setup_timestamp": "2025-07-22T00:41:42.942Z",
  "ip_address": "70.29.178.247",
  "username": "hgeldenhuys",
  "gender": "male",
  "session_id": "42fa85f4-66cb-47a4-819f-185217dc3402"
}
```

## Hook Implementation Details

### Pattern Recognition
The hook uses a regex pattern to detect register commands:
```typescript
const nameRegex = /cld\/register\.ts\s+(\w+)/;
```

This matches:
- `bun --bun .claude/commands/cld/register.ts AgentName`
- `.claude/commands/cld/register.ts AgentName role=developer`
- `node .claude/commands/cld/register.ts AgentName gender=female`

### Error Handling
- **Missing Agent Name**: Returns error message with usage instructions
- **Non-Bash Tools**: Ignores events from other tools (edit, read, etc.)
- **Non-Register Commands**: Ignores bash commands not containing `cld/register.ts`
- **Invalid Events**: Ignores non-PostToolUse events

### Integration Points

1. **CLOUDIOS Helper Functions**:
   - `writeAgentSession()`: Creates session link file
   - `readAgentSession()`: Retrieves complete agent context
   - `debugTx()`: Provides event-specific debugging

2. **Type Safety**:
   - Uses `isHookPostToolUseEvent()` type guard
   - Returns `AgentInfoContext` type with session_id

3. **Event Flow**:
   ```
   User Command → Bash Tool → PostToolUse Event → Hook Processing → Session Association
   ```

## Command Variations Supported

The hook supports multiple command execution patterns:

```bash
# Standard bun execution
bun --bun .claude/commands/cld/register.ts MyAgent

# Simple bun
bun .claude/commands/cld/register.ts MyAgent role=qa

# Direct execution
.claude/commands/cld/register.ts MyAgent gender=female

# Node execution
node .claude/commands/cld/register.ts MyAgent theme="DevOps Expert"
```

## Usage Examples

### Basic Registration
```bash
/cld:register SimpleBot
# Creates agent with defaults: role=developer, gender=male
```

### Custom Configuration
```bash
/cld:register QualityBot role=qa gender=female theme="Test Automation Expert"
# Creates agent with custom role, gender, and theme
```

### DevOps Specialist
```bash
/cld:register PipelineBot role=devops theme="CI/CD Pipeline Management"
# Creates specialized DevOps agent
```

## Integration with CLOUDIOS Ecosystem

The registration workflow integrates with:

1. **Agent Management System**: Provides agent metadata for identification
2. **Session Tracking**: Links agents to specific Claude Code sessions  
3. **Voice Integration**: Sets up voice preferences for agent interactions
4. **Project Context**: Associates agents with specific repositories and paths
5. **Future Enhancements**: Prepares foundation for agent-specific configurations

## Troubleshooting

### Common Issues

1. **Agent Name Not Extracted**: 
   - Verify agent name contains only word characters (`\w+`)
   - Ensure proper spacing after `register.ts`

2. **Hook Not Triggered**:
   - Confirm hook matcher pattern is configured as `.*cld:register.*`
   - Verify bash command contains `cld/register.ts`

3. **Session Not Associated**:
   - Check `.claude/cloudios/agents/links/` directory creation
   - Verify `writeAgentSession()` permissions

### Debug Information

The hook provides extensive debugging through:
- Event-specific debug logging via `debugTx()`
- Agent name extraction logging
- Success/error status reporting

## Security Considerations

- Agent names are limited to word characters only (`\w+`)
- No execution of user-provided code
- File system operations use helper functions with proper error handling
- Input validation prevents command injection