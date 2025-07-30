export type BoardDetails = {
  board_id: number;
  board_title: string;
  board_order: number;
  work_column_id: number;
  work_column_title: string;
  work_column_order: number;
  review_column_id: number;
  review_column_title: string;
  review_column_order: number;
};
export type ColumnDetails = {
  id: number;
  title: string;
  position: number;
  board_project_name?: string;
  color?: string;
  wip_limit?: number | null;
  created_at?: string;
  updated_at?: string;
};
export type AgentInfo = {
  agent_name: string;
  agent_role: string;
  repo_name: string;
  project_path: string;
  preferred_voice: string;
  setup_timestamp: string;
  transcript_path?: string;
  ip_address?: string;
  username?: string;
  gender?: string;
  theme?: string;
  claude_session_id?: string;
  claude_session_created?: string;
  claude_last_used?: string;
};
export type AgentInfoContext = AgentInfo & {
  session_id: string;
};

export interface KanbanCard {
  id: number;
  board_id: number;
  column_id: number;
  title: string;
  description?: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  column_name?: string;
}

export type HookEventType =
  | "PreToolUse"
  | "PostToolUse"
  | "Notification"
  | "Stop"
  | "SubagentStop"
  | "PreCompact"
  | "UserPromptSubmit";
export const HookEventTypeEnum = {
  PreToolUse: "PreToolUse",
  PostToolUse: "PostToolUse",
  Notification: "Notification",
  Stop: "Stop",
  SubagentStop: "SubagentStop",
  PreCompact: "PreCompact",
  UserPromptSubmit: "UserPromptSubmit",
};

export type HookBaseEvent = {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: HookEventType;
};

export type HookStopEvent = HookBaseEvent & {
  stop_hook_active: boolean;
  claude_last_message: string;
};
export type HookUserPromptSubmitEvent = HookBaseEvent & {
  prompt: string;
};
export type Todo = {
  content: string;
  status: "pending" | "completed" | "in_progress";
  priority: "high" | "medium" | "low";
  id: string;
};
export type TodoWriteToolInputEvent = HookBaseEvent & {
  tool_name: "TodoWrite";
  tool_input: { todos: Todo[] };
};
export type BashToolEvent = HookBaseEvent & {
  tool_name: "Bash";
  tool_input: {
    command: string;
    description: string;
  };
};
export type HookPreToolUseBaseEvent = BashToolEvent & {
  tool_name: string;
  tool_input: Record<string, any>;
};
export type HookPreToolUseEvent =
  | HookPreToolUseBaseEvent
  | TodoWriteToolInputEvent
  | BashToolEvent;
export type TodoWriteToolOutputEvent = TodoWriteToolInputEvent & {
  tool_name: "TodoWrite";
  tool_output: {
    oldTodos: Todo[];
    newTodos: Todo[];
  };
};
export type BashToolOutputEvent = BashToolEvent & {
  tool_output: {
    command: string;
    description: string;
    output: string;
    error?: string;
  };
};
export type HookPostToolUseBaseEvent = HookPreToolUseBaseEvent & {
  tool_name: string;
  tool_output: Record<string, any>;
};
export type HookPostToolUseEvent =
  | HookPostToolUseBaseEvent
  | TodoWriteToolOutputEvent
  | BashToolOutputEvent;
export type HookNotificationEvent = HookBaseEvent & {
  message: string;
};
export type HookSubagentStopEvent = HookBaseEvent & {
  stop_hook_active: boolean;
  claude_last_message: string;
};
export type HookPreCompactEvent = HookBaseEvent & {
  trigger: "manual" | "auto";
  custom_instructions: string;
};
export type HookInputEvent =
  | HookStopEvent
  | HookUserPromptSubmitEvent
  | HookPreToolUseEvent
  | HookPostToolUseEvent
  | HookNotificationEvent
  | HookSubagentStopEvent
  | HookPreCompactEvent;

export function isHookStopEvent(event: HookInputEvent): event is HookStopEvent {
  return event.hook_event_name === HookEventTypeEnum.Stop;
}
export function isHookUserPromptSubmitEvent(
  event: HookInputEvent,
): event is HookUserPromptSubmitEvent {
  return event.hook_event_name === HookEventTypeEnum.UserPromptSubmit;
}
export function isHookPreToolUseEvent(
  event: HookInputEvent,
): event is HookPreToolUseEvent {
  return event.hook_event_name === HookEventTypeEnum.PreToolUse;
}
export function isHookPostToolUseEvent(
  event: HookInputEvent,
): event is HookPostToolUseBaseEvent {
  return event.hook_event_name === HookEventTypeEnum.PostToolUse;
}
export function isHookNotificationEvent(
  event: HookInputEvent,
): event is HookNotificationEvent {
  return event.hook_event_name === HookEventTypeEnum.Notification;
}
export function isHookSubagentStopEvent(
  event: HookInputEvent,
): event is HookSubagentStopEvent {
  return event.hook_event_name === HookEventTypeEnum.SubagentStop;
}
export function isTodoWriteToolInputEvent(
  event: HookInputEvent,
): event is TodoWriteToolInputEvent {
  return (
    isHookPreToolUseEvent(event) &&
    event.tool_name === "TodoWrite" &&
    "tool_input" in event &&
    "todos" in event.tool_input
  );
}
export function isBashToolInputEvent(
  event: HookInputEvent,
): event is BashToolEvent {
  return (
    isHookPreToolUseEvent(event) &&
    event.tool_name === "Bash" &&
    "tool_input" in event &&
    "command" in event.tool_input
  );
}
export type JsonLine = {
  parentUuid: string;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch: string;
  message: {
    id: string;
    type: string;
    role: string;
    model: string;
    content: {
      type: string;
      text: string;
    }[];
    stop_reason: string | null;
    stop_sequence: number | null;
    usage: {
      input_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
      output_tokens: number;
      service_tier: string;
    };
  };
  requestId: string;
  type: string;
  uuid: string;
  timestamp: string;
};

export type CloudiosConfig = {
  lastSync: string;
  version: string;
  setupComplete: boolean;
  serverUrl: string;
  projectName: string;
};

export type SendEventEvent = HookInputEvent & {
  timestamp: number;
  agent_name: string;
};
