import { loader } from "@monaco-editor/react";

// Configure Monaco to use local assets instead of CDN
// Only load monaco-editor on the client side to avoid SSR issues
if (typeof window !== "undefined") {
  // Use direct Monaco import to bundle it locally instead of CDN
  // This approach bundles Monaco Editor directly into the application
  import("monaco-editor").then((monaco) => {
    // Configure loader to use the imported monaco instance
    loader.config({ monaco });
  }).catch((error) => {
    console.error("Failed to load Monaco Editor:", error);
    // Fallback to CDN if local import fails
    console.log("Falling back to CDN...");
  });
}
