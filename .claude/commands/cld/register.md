# Register - CLOUDIOS Agent Registration

Register a new agent in the CLOUDIOS ecosystem with comprehensive system detection and flexible configuration.

## Synopsis

```bash
bun --bun --bun .claude/commands/cld/register.ts <agent_name> [key=value...]
```

## Description

The `/register` command creates a new CLOUDIOS agent with local metadata storage. It automatically detects system information (IP address, username) and allows customization of agent characteristics through optional key=value parameters.

The agent information is stored in `.claude/cloudios/agents/names/{agent_name}.json` and can be used by the CLOUDIOS system for agent identification and session management.

## Arguments

### Required

- **`agent_name`** - The name identifier for the agent (must not contain `=` or start with `-`)

### Optional Key=Value Parameters

- **`role=<role>`** - Agent role (default: "developer")
  - Examples: `developer`, `devops`, `qa`, `designer`, `architect`
- **`gender=<gender>`** - Agent gender identity (default: "male")
  - Examples: `male`, `female`, `nonbinary`
- **`theme=<description>`** - Session theme or specialization (optional)
  - Examples: `"CI/CD Pipeline Expert"`, `"React Development"`, `"Test Automation"`

## Examples

### Basic Registration
```bash
# Register with defaults (role=developer, gender=male)
bun --bun .claude/commands/cld/register.ts MyAgent
```

### Custom Role and Gender
If the gender was not specified, try to deduce it from the agent name if possible.
```bash
# DevOps engineer
bun --bun .claude/commands/cld/register.ts Jenkins role=devops gender=female

# QA specialist
bun --bun .claude/commands/cld/register.ts TestBot role=qa gender=nonbinary
```

### Full Configuration
```bash
# Complete customization with theme
bun --bun .claude/commands/cld/register.ts DevExpert \
  role=architect \
  gender=female \
  theme="Senior Full-Stack Developer & System Designer"
```

### Complex Themes
```bash
# Themes can contain spaces and special characters
bun --bun .claude/commands/cld/register.ts PipelineBot \
  role=devops \
  theme="CI/CD Pipeline Management & Infrastructure Automation"
```

## Generated Metadata

The command creates an `AgentInfo` object with the following structure:

```json
{
  "agent_name": "MyAgent",
  "agent_role": "developer",
  "repo_name": "project-name",
  "project_path": "/path/to/project",
  "preferred_voice": "default",
  "setup_timestamp": "2024-01-01T12:00:00.000Z",
  "ip_address": "192.168.1.100",
  "username": "johndoe",
  "gender": "male",
  "theme": "Optional theme description"
}
```

## System Detection

### IP Address Detection (Multiple Fallbacks)
1. **External IP**: DNS query via OpenDNS (`myip.opendns.com`)
2. **Local Network**: First non-internal IPv4 interface
3. **Localhost**: `127.0.0.1` as final fallback

### Username Detection (Priority Order)
1. `$USER` environment variable
2. `$USERNAME` environment variable  
3. `$LOGNAME` environment variable
4. `os.userInfo().username`
5. `"unknown"` as fallback

## File Storage

- **Location**: `.claude/cloudios/agents/names/{agent_name}.json`
- **Format**: Pretty-printed JSON with 2-space indentation
- **Directories**: Auto-creates `.claude/cloudios/agents/names/` if needed

## Error Handling

- **Missing agent name**: Returns error and exits
- **IP detection failure**: Falls back through multiple methods
- **Username detection failure**: Uses `"unknown"`
- **File system errors**: Propagated from `CLOUDIOS.writeAgentInfo()`

## Integration

This command integrates with the broader CLOUDIOS ecosystem:

- **Agent Management**: Part of `.claude/cloudios/agents/` system
- **Session Linking**: Prepares agent for session association
- **Server Registration**: Local metadata used for server sync
- **Voice Integration**: Sets up voice preferences

## Notes

- Agent names must be unique within the project
- Existing agent files will be overwritten
- The `theme` field is conditionally included (only if provided)
- All arguments ignore order except for the agent name (first non-flag argument)
- Flags like `--verbose`, `-f` are ignored but don't cause errors
- Read all the `docs/notes*.md` files for additional wisdom if any files exist

## Error handling

Example: 
```json
{
    "stopReason": "❌ Registration failed: Failed to register agent with server: API Error 409: Agent name \"Wilson\" is already in use by another active agent (session: 62175f90...)",
    "suppressOutput": false,
    "continue": false
  }
```
When you get an error like this, tell the user to try a different agent name or check if the agent is already registered.