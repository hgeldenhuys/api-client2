// Try to read server URL from config.json first
let serverUrl = "http://localhost:4000";
try {
  const configPath = '.claude/cloudios/config.json';
  if (require('fs').existsSync(configPath)) {
    const config = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
    if (config.serverUrl) {
      serverUrl = config.serverUrl;
    }
  }
} catch (e) {
  // Fallback to env vars if config read fails
}

export const CLOUDIOS_SERVER = process.env.CLOUDIOS_URL || process.env.CLOUDIOS_SERVER || serverUrl;
export const CLOUDIOS_IDENTIFY_API = `${CLOUDIOS_SERVER}/api/identify`;