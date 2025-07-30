#!/usr/bin/env bun

import * as fs from "fs";
import * as path from "path";

const message = process.argv[2];
if (!message) process.exit(0);

// Extract audio content
const audioMatch = message.match(/<audio>([^<]+)<\/audio>/);
if (!audioMatch) process.exit(0);

const audioText = audioMatch[1];

// Get project name from package.json or folder name
let projectName = path.basename(process.cwd());
try {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    if (packageJson.name) {
      projectName = packageJson.name;
    }
  }
} catch (e) {
  // Use folder name as fallback
}

// Send to CLOUDIOS queue
try {
  const response = await fetch("http://localhost:4000/api/audio/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: audioText,
      projectName: projectName,
      timestamp: new Date().toISOString()
    })
  });

  if (!response.ok) {
    console.error("Failed to queue audio:", response.statusText);
  }
} catch (error) {
  console.error("Error sending audio to CLOUDIOS:", error);
}