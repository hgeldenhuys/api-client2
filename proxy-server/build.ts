#!/usr/bin/env bun

/**
 * Build script for creating cross-platform executables of the API Client CORS Proxy Server
 * 
 * This script uses Bun's built-in compilation features to create standalone executables
 * for Windows, macOS, and Linux platforms.
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// Build configuration
const BUILD_CONFIG = {
  entrypoint: "./proxy-server.ts",
  outDir: "./dist",
  name: "api-client-proxy",
  
  // Target platforms
  targets: [
    // Windows
    { platform: "bun-windows-x64", output: "api-client-proxy-windows.exe", description: "Windows x64" },
    { platform: "bun-windows-x64-baseline", output: "api-client-proxy-windows-baseline.exe", description: "Windows x64 (Legacy CPUs)" },
    
    // macOS
    { platform: "bun-darwin-x64", output: "api-client-proxy-macos-intel", description: "macOS Intel" },
    { platform: "bun-darwin-arm64", output: "api-client-proxy-macos-arm", description: "macOS Apple Silicon" },
    
    // Linux
    { platform: "bun-linux-x64", output: "api-client-proxy-linux-x64", description: "Linux x64" },
    { platform: "bun-linux-x64-baseline", output: "api-client-proxy-linux-x64-baseline", description: "Linux x64 (Legacy CPUs)" },
    { platform: "bun-linux-arm64", output: "api-client-proxy-linux-arm64", description: "Linux ARM64" },
  ]
};

// Build metadata
const getBuildMetadata = async () => {
  try {
    const version = await $`git describe --tags --always`.text();
    const gitCommit = await $`git rev-parse HEAD`.text();
    const buildTime = new Date().toISOString();
    
    return {
      version: version.trim() || "1.0.0",
      commit: gitCommit.trim().substring(0, 8),
      buildTime
    };
  } catch {
    // Fallback if git is not available
    return {
      version: "1.0.0",
      commit: "unknown",
      buildTime: new Date().toISOString()
    };
  }
};

// Build a single target
async function buildTarget(target: typeof BUILD_CONFIG.targets[0], metadata: Awaited<ReturnType<typeof getBuildMetadata>>) {
  const outputPath = join(BUILD_CONFIG.outDir, target.output);
  
  console.log(`\n🔨 Building ${target.description}...`);
  console.log(`   Target: ${target.platform}`);
  console.log(`   Output: ${outputPath}`);
  
  try {
    // Build command with metadata injection
    const buildArgs = [
      "build",
      "--compile",
      "--target", target.platform,
      "--outfile", outputPath,
      "--minify",
      "--sourcemap",
      `--define`, `BUILD_VERSION='"${metadata.version}"'`,
      `--define`, `BUILD_COMMIT='"${metadata.commit}"'`,
      `--define`, `BUILD_TIME='"${metadata.buildTime}"'`,
      BUILD_CONFIG.entrypoint
    ];
    
    await $`bun ${buildArgs}`;
    
    // Get file size
    const stats = Bun.file(outputPath);
    const size = await stats.size;
    const sizeMB = (size / 1024 / 1024).toFixed(2);
    
    console.log(`   ✅ Success! Size: ${sizeMB} MB`);
    
    return { success: true, platform: target.platform, output: target.output, size: sizeMB };
  } catch (error) {
    console.error(`   ❌ Failed to build ${target.description}:`, error);
    return { success: false, platform: target.platform, error: error };
  }
}

// Main build function
async function build() {
  console.log("🚀 API Client CORS Proxy Server - Cross-Platform Build");
  console.log("======================================================\n");
  
  // Get build metadata
  const metadata = await getBuildMetadata();
  console.log("📋 Build Information:");
  console.log(`   Version: ${metadata.version}`);
  console.log(`   Commit: ${metadata.commit}`);
  console.log(`   Build Time: ${metadata.buildTime}`);
  
  // Create output directory
  if (!existsSync(BUILD_CONFIG.outDir)) {
    mkdirSync(BUILD_CONFIG.outDir, { recursive: true });
  }
  
  // Check if we're building on the current platform or cross-compiling
  const currentPlatform = process.platform;
  const currentArch = process.arch;
  console.log(`\n💻 Building from: ${currentPlatform} ${currentArch}`);
  
  // Build all targets or specific ones based on arguments
  const args = process.argv.slice(2);
  let targetsToBuild = BUILD_CONFIG.targets;
  
  if (args.length > 0) {
    // Filter targets based on command line arguments
    targetsToBuild = BUILD_CONFIG.targets.filter(target => 
      args.some(arg => target.platform.includes(arg) || target.output.includes(arg))
    );
    
    if (targetsToBuild.length === 0) {
      console.error("\n❌ No matching targets found for:", args.join(", "));
      console.log("\nAvailable targets:");
      BUILD_CONFIG.targets.forEach(t => {
        console.log(`  - ${t.platform} (${t.description})`);
      });
      process.exit(1);
    }
  }
  
  console.log(`\n🎯 Building ${targetsToBuild.length} target(s)...`);
  
  // Build all targets
  const results = [];
  for (const target of targetsToBuild) {
    const result = await buildTarget(target, metadata);
    results.push(result);
  }
  
  // Summary
  console.log("\n📊 Build Summary");
  console.log("================");
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`\n✅ Successfully built ${successful.length} executable(s):\n`);
    successful.forEach(r => {
      console.log(`   - ${r.output} (${r.size} MB)`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed to build ${failed.length} executable(s):\n`);
    failed.forEach(r => {
      console.log(`   - ${r.platform}`);
    });
  }
  
  // Create a README in the dist folder
  if (successful.length > 0) {
    const readmeContent = `# API Client CORS Proxy Server - Prebuilt Binaries

## Build Information
- Version: ${metadata.version}
- Commit: ${metadata.commit}
- Built: ${metadata.buildTime}

## Available Binaries

${successful.map(r => {
  const target = BUILD_CONFIG.targets.find(t => t.output === r.output);
  return `### ${target?.description}
- File: \`${r.output}\`
- Size: ${r.size} MB
- Platform: ${target?.platform}`;
}).join('\n\n')}

## Usage

1. Download the appropriate binary for your platform
2. Make it executable (Linux/macOS): \`chmod +x api-client-proxy-*\`
3. Run it: \`./api-client-proxy-*\`

## Command Line Options

\`\`\`
-p, --port <port>      Port to listen on (default: 9090)
-h, --host <host>      Host to bind to (default: 0.0.0.0)
--origin <origin>      CORS origin(s) to allow (default: *)
-u, --username <user>  Basic auth username
--password <pass>      Basic auth password
-v, --verbose          Enable verbose logging
--ssl <mode>           SSL verification: default, ignore, strict
--help                 Show help message
\`\`\`

## Examples

\`\`\`bash
# Basic usage
./api-client-proxy-linux-x64

# With custom port
./api-client-proxy-windows.exe -p 8888

# With authentication
./api-client-proxy-macos-arm -u admin --password secret -v
\`\`\`
`;
    
    await Bun.write(join(BUILD_CONFIG.outDir, "README.md"), readmeContent);
    console.log(`\n📄 Created README.md in ${BUILD_CONFIG.outDir}`);
  }
  
  console.log("\n✨ Build complete!");
  
  // Exit with error if any builds failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

// Helper to build only for current platform
async function buildCurrent() {
  const platform = process.platform;
  const arch = process.arch;
  
  let bunTarget: string;
  if (platform === "darwin") {
    bunTarget = arch === "arm64" ? "bun-darwin-arm64" : "bun-darwin-x64";
  } else if (platform === "linux") {
    bunTarget = arch === "arm64" ? "bun-linux-arm64" : "bun-linux-x64";
  } else if (platform === "win32") {
    bunTarget = "bun-windows-x64";
  } else {
    console.error(`Unsupported platform: ${platform} ${arch}`);
    process.exit(1);
  }
  
  const target = BUILD_CONFIG.targets.find(t => t.platform === bunTarget);
  if (!target) {
    console.error(`No target configuration found for ${bunTarget}`);
    process.exit(1);
  }
  
  console.log(`🎯 Building for current platform only: ${target.description}`);
  
  const metadata = await getBuildMetadata();
  const result = await buildTarget(target, metadata);
  
  if (result.success) {
    console.log(`\n✅ Build successful! Output: ${join(BUILD_CONFIG.outDir, target.output)}`);
  } else {
    console.error("\n❌ Build failed!");
    process.exit(1);
  }
}

// Run the build
if (import.meta.main) {
  // Check for special flags
  if (process.argv.includes("--current")) {
    await buildCurrent();
  } else if (process.argv.includes("--help")) {
    console.log(`
API Client CORS Proxy Server - Build Script

Usage: bun build.ts [options] [targets]

Options:
  --current    Build only for the current platform
  --help       Show this help message

Targets:
  You can specify platform names or output filenames to build specific targets.
  If no targets are specified, all platforms will be built.

Examples:
  bun build.ts                    # Build all platforms
  bun build.ts --current          # Build for current platform only
  bun build.ts windows            # Build all Windows targets
  bun build.ts darwin arm64       # Build macOS ARM64
  bun build.ts linux-x64          # Build Linux x64

Available platforms:
${BUILD_CONFIG.targets.map(t => `  - ${t.platform} (${t.description})`).join('\n')}
`);
  } else {
    await build();
  }
}