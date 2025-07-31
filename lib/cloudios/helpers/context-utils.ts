import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

export interface PromptContext {
  prompt_id: string;
  session_id: string;
  timestamp: number;
  prompt?: string;
}

export const ContextUtils = {
  /**
   * Get the path to the context.json file
   * Now session-specific to support multiple agents in one project
   */
  getContextPath(cwd?: string, session_id?: string): string {
    const basePath = cwd || process.cwd();
    const claudeDir = path.join(basePath, ".claude", "cloudios");
    // If session_id is provided, create a session-specific context file
    const filename = session_id ? `context-${session_id}.json` : "context.json";
    return path.join(claudeDir, filename);
  },

  /**
   * Ensure the cloudios directory exists
   */
  ensureCloudiosDir(cwd?: string): void {
    const basePath = cwd || process.cwd();
    const claudeDir = path.join(basePath, ".claude", "cloudios");
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }
  },

  /**
   * Create a new prompt context when UserPromptSubmit is triggered
   */
  createPromptContext(session_id: string, prompt?: string, cwd?: string): PromptContext {
    const context: PromptContext = {
      prompt_id: randomUUID(),
      session_id,
      timestamp: Date.now(),
      prompt
    };

    // Ensure directory exists
    ContextUtils.ensureCloudiosDir(cwd);

    // Write context to session-specific file
    const contextPath = ContextUtils.getContextPath(cwd, session_id);
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));

    return context;
  },

  /**
   * Read the current prompt context for a specific session
   */
  readPromptContext(cwd?: string, session_id?: string): PromptContext | null {
    const contextPath = ContextUtils.getContextPath(cwd, session_id);
    
    if (!fs.existsSync(contextPath)) {
      // Try legacy non-session-specific file if session-specific doesn't exist
      if (session_id) {
        const legacyPath = ContextUtils.getContextPath(cwd);
        if (fs.existsSync(legacyPath)) {
          try {
            const content = fs.readFileSync(legacyPath, "utf-8");
            const context = JSON.parse(content) as PromptContext;
            // Only use if it matches the requested session
            if (context.session_id === session_id) {
              return context;
            }
          } catch (e) {
            // Ignore legacy file errors
          }
        }
      }
      return null;
    }

    try {
      const content = fs.readFileSync(contextPath, "utf-8");
      return JSON.parse(content) as PromptContext;
    } catch (e) {
      console.error("Failed to read context file:", e);
      return null;
    }
  },

  /**
   * Clear the prompt context (optional - for cleanup)
   */
  clearPromptContext(cwd?: string): void {
    const contextPath = ContextUtils.getContextPath(cwd);
    
    if (fs.existsSync(contextPath)) {
      fs.unlinkSync(contextPath);
    }
  },

  /**
   * Check if the current context is stale (older than 24 hours)
   */
  isContextStale(context: PromptContext): boolean {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return Date.now() - context.timestamp > twentyFourHours;
  }
};