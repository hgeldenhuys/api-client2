# Serena Project Activation
IMPORTANT: Always activate the Serena project at the start of each conversation:
- Use: "Activate the cloudios project with Serena" as your first action
- This ensures proper code navigation and editing capabilities

---

# React Router 7 Migration - Context7 Documentation

## Date: 2025-01-29

### Libraries Used:
- **React Router 7**: `/remix-run/react-router` 
  - Trust Score: 7.5
  - Code Snippets: 849 examples
  - Last Context7 check: 2025-01-29

### Key Migration Points from Context7:

1. **Import Changes**:
   - From: `@remix-run/react` → To: `react-router`
   - From: `@remix-run/node` → To: `react-router` 
   - From: `@remix-run/dev` → To: `@react-router/dev/vite`

2. **Function Replacements**:
   - `json()` → `data()`
   - `RemixBrowser` → `HydratedRouter`
   - `RemixServer` → `ServerRouter`
   - `vitePlugin as remix` → `reactRouter`

3. **Entry Points**:
   - Client: Use `HydratedRouter` from `react-router/dom`
   - Server: Use `ServerRouter` from `react-router`

4. **TypeScript Config**:
   - Update types from `@remix-run/node` to `@react-router/node`

### Migration Completed:
All @remix-run imports have been successfully replaced with React Router 7 equivalents across 29 files including components, routes, and configuration files.

### Smooth Theme Switching Without Page Reloads

#### Best Practices for Theme Switching (Context7 Research - 2025-01-29):

1. **Using useFetcher for Non-Navigation Form Submissions**:
   - Use `useFetcher` instead of `<Form>` to prevent page navigation
   - Perfect for toggling theme state without affecting browser history
   - Example pattern:
   ```tsx
   const fetcher = useFetcher();
   <fetcher.Form method="post">
     <button name="theme" value={isDark ? "light" : "dark"}>
       Toggle Theme
     </button>
   </fetcher.Form>
   ```

2. **Optimistic UI Updates**:
   - Immediately update UI using `fetcher.formData` before server response
   - Check pending form data to show expected state:
   ```tsx
   let currentTheme = loaderData.theme;
   if (fetcher.formData?.has("theme")) {
     currentTheme = fetcher.formData.get("theme");
   }
   ```

3. **Cookie-Based Theme Persistence**:
   - Store theme preference in cookies for server-side rendering
   - Parse cookies in loader, serialize in action:
   ```tsx
   // In action
   const cookie = await themePref.parse(request.headers.get("Cookie")) || {};
   cookie.theme = formData.get("theme");
   return redirect("/", {
     headers: { "Set-Cookie": await themePref.serialize(cookie) }
   });
   ```

4. **Avoiding Hydration Issues**:
   - Use `clientLoader.hydrate = true` if theme needs client-side detection
   - Provide `HydrateFallback` component for SSR consistency
   - Ensure server and client render the same initial theme

5. **Client-Side Theme Application**:
   - Apply theme class to document root immediately
   - Use CSS variables or class-based theming
   - Prevent flash of incorrect theme with inline script in `<head>`

6. **Key Benefits of useFetcher Approach**:
   - No page navigation or history entries
   - Isolated pending states per fetcher
   - Can handle multiple theme toggles if needed
   - Works seamlessly with SSR and hydration

---

# Cloudios CLI Agent Documentation

The Cloudios CLI agent is a critical component of the CLOUDIOS ecosystem. Full documentation is available at:

- **User Guide**: `.claude/scripts/cloudios/README.md` - Installation, usage, and troubleshooting
- **Technical Implementation**: `.claude/scripts/cloudios/IMPLEMENTATION.md` - Architecture, code flow, and development details

## Quick Reference

### Installation
```bash
curl -o cloudios-agent http://localhost:4000/api/cloudios-agent && chmod +x cloudios-agent && ./cloudios-agent
```

### Key Points
- Cloudios is a PROJECT SERVICE, not a Claude agent
- Automatically sets up CLOUDIOS integration on first run
- Provides audio streaming for task summaries
- Self-contained with embedded audio playback
- Dynamic server URL injection at download time

### File Structure
```
.claude/scripts/cloudios/
├── cloudios-agent.ts      # Main unified script
├── deploy-template.ts     # Template deployment
├── README.md             # User documentation
└── IMPLEMENTATION.md     # Technical documentation
```

### Task Execution Guidelines
- Always include an <audio>audio version of the prompt, short summary</audio>

### CRITICAL: Audio Playback Architecture
**AUDIO PLAYS IN HERMES (TERMINAL), NOT IN BROWSER!**

#### How Audio Actually Works:
1. **Stop Hook** captures Claude's <audio> tags from responses
2. **Server** generates audio files and broadcasts SSE events
3. **Hermes CLI** (running in project terminal) receives SSE and plays audio
4. **Browser** shows audio in queue but CANNOT auto-play due to browser policies

#### Common Audio Issues:
1. **"Audio not playing"** - Check if hermes is running in the project: `./hermes`
2. **SSE Parsing** - Hermes expects `data.data` structure from SSE events:
   - SSE sends: `{type: "audio_update", data: {type: "audio_ready", message: {...}}}`
   - Hermes handleAudioUpdate receives: `{type: "audio_ready", message: {...}}`
3. **Browser autoplay** - Expected behavior! Browsers block autoplay. Use hermes instead.

#### Last Fixed: 2025-01-23
- Fixed hermes SSE parsing: Changed `handleAudioUpdate(data)` to `handleAudioUpdate(data.data)`
- Fixed handleAudioUpdate to access data directly instead of `data.payload`

---

# Audio Summaries for CLOUDIOS Integration

When completing any task or responding to queries, ALWAYS include an audio summary at the very end of your response using the following format:

```
<audio>Brief, natural language summary of what was accomplished, suitable for text-to-speech</audio>
```

## Audio Tag Guidelines:
- **Length**: 1-2 sentences maximum
- **Language**: Natural, conversational tone
- **Content**: Focus on WHAT was done, not HOW
- **Avoid**: Technical jargon, code snippets, file paths, markdown formatting
- **Purpose**: This will be read aloud by text-to-speech

## Examples:
- <audio>I've fixed the syntax error in the audio generation service and the server is now running smoothly.</audio>
- <audio>I've updated the dashboard to show real-time updates. The agent activity feed will now refresh automatically as events occur.</audio>
- <audio>I've added markdown stripping to prevent the voice from reading formatting characters like asterisks.</audio>
- <audio>I found three instances of the deprecated function and updated them all to use the new API.</audio>

## Audio Hook Configuration:
The project uses a Stop hook configured in `.claude/settings.json` that:
1. **Executes from project root**: Uses `${PWD}` to ensure proper working directory
2. **Detects project name**: Reads `package.json` name field or falls back to folder name
3. **Matches hermes filtering**: Both hook and hermes use identical project name logic
4. **Handles audio extraction**: Parses `<audio>` tags and sends to CLOUDIOS queue

### Critical Requirements:
- **Project name consistency**: Hook and hermes MUST use same project identification method
- **Working directory**: Hook runs from `${PWD}` (project root) for proper package.json reading
- **Queue coordination**: Audio sent to CLOUDIOS queue for hermes consumption via SSE

## Important:
- Place the audio tag at the END of your response
- Keep it concise and user-friendly
- If multiple tasks were completed, summarize the main achievement
- Use present perfect tense ("I've completed...") for clarity

# Claude HOOKS
Use 