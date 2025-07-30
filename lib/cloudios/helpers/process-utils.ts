import type { HookInputEvent, JsonLine } from "../types";

export const ProcessUtils = {
  error: (stopReason: string, suppressOutput = false) => {
    Bun.stderr
      .write(
        `${JSON.stringify(
          {
            stopReason,
            suppressOutput,
            continue: false,
          },
          null,
          2,
        )}`,
      )
      .then();
    return process.exit(2);
  },
  block: (reason: string) => {
    Bun.stderr
      .write(
        `${JSON.stringify(
          {
            reason,
            decision: "block",
          },
          null,
          2,
        )}`,
      )
      .then();
    return process.exit(2);
  },
  approve: (reason: string) => {
    Bun.stderr
      .write(
        `${JSON.stringify(
          {
            reason,
            decision: "approve",
          },
          null,
          2,
        )}`,
      )
      .then();
    return process.exit(2);
  },
  success: (args: unknown) => {
    Bun.stdout.write(JSON.stringify(args, null, 2)).then();
    process.exit(0);
  },
  input: async () => {
    const inputText = await Bun.stdin.text();
    try {
      return JSON.parse(inputText) as HookInputEvent;
    } catch (error) {
      ProcessUtils.error(
        `Failed to parse JSON input: ${(error as Error).message}`,
      );
      process.exit(0);
    }
  },
  getClaudeLastMessage: async (event: HookInputEvent) => {
    const { stdout } = Bun.spawn(["tail", "-1", event.transcript_path], {
      stdout: "pipe",
    });
    try {
      const lastLine = (await new Response(stdout).json()) as JsonLine;
      return lastLine?.message?.content?.map((c) => c.text).join("") ?? "";
    } catch (error) {
      ProcessUtils.error(
        `Failed to parse last message: ${(error as Error).message}`,
      );
      return "";
    }
  },
};
