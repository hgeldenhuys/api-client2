import { CLOUDIOS } from "@lib/cloudios/helpers/cloudios-helper";
import {
  type AgentInfoContext,
  type HookInputEvent,
  isBashToolInputEvent,
  isHookPostToolUseEvent,
} from "@lib/cloudios/types";

const { debugTx, success, error, writeAgentSession, readAgentSession, paths } =
  CLOUDIOS;

// Types for dependency injection (testing)
export interface ApiClient {
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

// Default fetch implementation
const defaultApiClient: ApiClient = {
  fetch: (url: string, options?: RequestInit) => fetch(url, options),
};

// API response types
interface ApiSuccessResponse {
  success: true;
  message: string;
  agent: {
    id: number;
    session_id: string;
    agent_name: string;
    agent_role: string;
    repo_name: string;
    project_path: string;
    registered_at: string;
    last_seen: string;
  };
  agent_script_checksum?: string;
  agent_script_url?: string;
}

interface ApiErrorResponse {
  error: string;
  details?: string;
}

async function registerAgentWithServer(
  agentData: AgentInfoContext,
  apiClient: ApiClient = defaultApiClient,
): Promise<ApiSuccessResponse> {
  const serverUrl = `${paths().CLOUDIOS_URL}/api/identify`;

  try {
    const response = await apiClient.fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "CLOUDIOS-Hook/1.0",
      },
      body: JSON.stringify(agentData),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse;
      throw new Error(
        `API Error ${response.status}: ${errorData.error || "Unknown error"}`,
      );
    }

    return (await response.json()) as ApiSuccessResponse;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Failed to register agent with server: ${errorMessage}`);
  }
}

export async function main(
  event: HookInputEvent,
  apiClient: ApiClient = defaultApiClient,
) {
  const debug = debugTx("register-session-id");
  debug(`Event:`, event);

  if (
    isHookPostToolUseEvent(event) &&
    // We still check if the matcher wasn't configured properly. It should be ".*cld:register.*"
    event.tool_input.command?.includes("cld/register.ts")
  ) {
    debug("Registering agent...");
    const nameRegex = /cld\/register\.ts\s+(\w+)/;
    const agentName = nameRegex.exec(event.tool_input.command)?.[1];
    debug("Agent Name:", agentName);

    if (!agentName) {
      error(
        "❌ Agent name required. Use: `bun --bun .claude/commands/cld/register.ts <agent_name>`",
      );
      return;
    }

    try {
      // Step 1: Create local session association
      writeAgentSession(agentName, event.session_id);
      const session = readAgentSession(agentName);
      debug("Local session created:", session);

      // Step 2: Register agent with CLOUDIOS server
      const apiResponse = await registerAgentWithServer(session, apiClient);
      debug("Server registration completed:", apiResponse);

      // Step 3: Return success with enhanced data
      success({
        ...session,
        server_registration: {
          success: true,
          agent_id: apiResponse.agent.id,
          registered_at: apiResponse.agent.registered_at,
          message: apiResponse.message,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      error(`❌ Registration failed: ${errorMessage}`);

      // Still return the local session data even if server registration fails
      try {
        const session = readAgentSession(agentName);
        success({
          ...session,
          server_registration: {
            success: false,
            error: errorMessage,
          },
        });
      } catch (readErr) {
        // If we can't even read the session, something is very wrong
        error(
          `❌ Critical error: Failed to read agent session after registration failure: ${(readErr as Error).message}`,
        );
      }
    }
  }
}
