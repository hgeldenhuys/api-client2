import type { HookInputEvent, SendEventEvent } from "@lib/cloudios/types";
import { AgentUtils } from "./agent-utils";
import { DebugUtils } from "./debug-utils";
import { KanbanUtils } from "./kanban-utils";
import { ProcessUtils } from "./process-utils";
import { ProjectUtils } from "./project-utils";
import { ContextUtils } from "./context-utils";

// ====================
// MAIN CLOUDIOS EXPORT
// ====================
export const CLOUDIOS = {
  ...ProjectUtils,
  ...AgentUtils,
  ...DebugUtils,
  ...ProcessUtils,
  ...KanbanUtils,
  ...ContextUtils,
  splitSendEvent: (sendEvent: SendEventEvent) => {
    const { timestamp, agent_name, ...rest } = sendEvent;
    const event = rest as HookInputEvent;
    return { event, timestamp, agent_name };
  },
};

export default { ...CLOUDIOS };
