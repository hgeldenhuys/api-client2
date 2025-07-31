import React from "react";
import { ApiClientConfig, BugReport } from "~/types/config";
import {
  Github,
  ExternalLink,
  Mail,
  MessageSquare,
  GitBranch,
} from "lucide-react";

/**
 * Example configuration for the default API Client setup
 */
export const defaultConfig: ApiClientConfig = {
  branding: {
    logoLink: "/",
  },
  repository: {
    label: "View on GitHub",
    url: "https://github.com/api-client/docs",
    icon: <Github className="h-4 w-4 mr-2" />,
  },
  support: {
    label: "Contact Support",
    email: "support@api-client.dev",
  },
  community: {
    label: "Community Forum",
    url: "https://community.api-client.com",
  },
  bugReporting: {
    enabled: true,
    onSubmitBug: (bugReport: BugReport) => {
      console.log("Feedback Submitted:", JSON.stringify(bugReport, null, 2));
    },
  },
};

/**
 * Example configuration for a custom-branded API Client
 */
export const customBrandedConfig: ApiClientConfig = {
  branding: {
    logo: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">AC</span>
        </div>
        <span className="font-semibold text-lg">Acme API Client</span>
      </div>
    ),
    logoLink: "https://acme.com",
  },
  repository: {
    label: "View Source",
    url: "https://gitlab.acme.com/api-tools/client",
    icon: <GitBranch className="h-4 w-4 mr-2" />,
  },
  support: {
    label: "Get Help",
    url: "https://support.acme.com/api-client",
  },
  community: {
    label: "Developer Community",
    url: "https://developers.acme.com/community",
  },
  bugReporting: {
    enabled: true,
    onSubmitBug: async (bugReport: BugReport) => {
      // Send to custom bug tracking system
      try {
        const response = await fetch("https://api.acme.com/bugs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.ACME_API_TOKEN,
          },
          body: JSON.stringify({
            title: bugReport.title,
            description: bugReport.description,
            steps: bugReport.stepsToReproduce,
            expected: bugReport.expectedResult,
            actual: bugReport.actualResult,
            environment: bugReport.systemInfo,
            source: "api-client",
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Bug report created:", result.id);
        } else {
          throw new Error("Failed to submit bug report");
        }
      } catch (error) {
        console.error("Bug report submission error:", error);
      }
    },
  },
};

/**
 * Example configuration for an open-source project
 */
export const openSourceConfig: ApiClientConfig = {
  branding: {
    logo: (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-xs">OS</span>
        </div>
        <span className="font-medium">Open API</span>
      </div>
    ),
    logoLink: "https://openapi.example.com",
  },
  repository: {
    label: "Contribute on GitHub",
    url: "https://github.com/openapi/client",
    icon: <Github className="h-4 w-4 mr-2" />,
  },
  support: {
    label: "Community Support",
    url: "https://github.com/openapi/client/discussions",
  },
  community: {
    label: "Discord Chat",
    url: "https://discord.gg/openapi",
  },
  bugReporting: {
    enabled: true,
    onSubmitBug: (bugReport: BugReport) => {
      // Format for GitHub issue creation
      const issueBody = `
**Bug Description**
${bugReport.description}

**Steps to Reproduce**
${bugReport.stepsToReproduce}

**Expected Result**
${bugReport.expectedResult}

**Actual Result**
${bugReport.actualResult}

**System Information**
- User Agent: ${bugReport.systemInfo.userAgent}
- Viewport: ${bugReport.systemInfo.viewport.width}x${bugReport.systemInfo.viewport.height}
- URL: ${bugReport.systemInfo.url}
- Timestamp: ${bugReport.systemInfo.timestamp}
      `.trim();

      const githubUrl = `https://github.com/openapi/client/issues/new?title=${encodeURIComponent(bugReport.title)}&body=${encodeURIComponent(issueBody)}`;
      window.open(githubUrl, "_blank");
    },
  },
};

/**
 * Example configuration with minimal settings (bug reporting disabled)
 */
export const minimalConfig: ApiClientConfig = {
  branding: {},
  repository: {
    label: "Documentation",
    url: "https://docs.example.com",
    icon: <ExternalLink className="h-4 w-4 mr-2" />,
  },
  support: {
    label: "Email Support",
    email: "help@example.com",
  },
  community: {
    label: "Help Center",
    url: "https://help.example.com",
  },
  bugReporting: {
    enabled: false,
  },
};

/**
 * Example configuration for enterprise use
 */
export const enterpriseConfig: ApiClientConfig = {
  branding: {
    logo: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">ENT</span>
        </div>
        <span className="font-semibold">Enterprise API Hub</span>
      </div>
    ),
    logoLink: "https://enterprise.example.com/api-hub",
  },
  repository: {
    label: "Internal Wiki",
    url: "https://wiki.enterprise.example.com/api-client",
    icon: <ExternalLink className="h-4 w-4 mr-2" />,
  },
  support: {
    label: "IT Helpdesk",
    url: "https://helpdesk.enterprise.example.com",
  },
  community: {
    label: "Developer Portal",
    url: "https://developers.enterprise.example.com",
  },
  bugReporting: {
    enabled: true,
    onSubmitBug: async (bugReport: BugReport) => {
      // Send to enterprise ticketing system
      try {
        await fetch("/api/internal/tickets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": "internal-api-key",
          },
          body: JSON.stringify({
            type: "bug_report",
            severity: "medium",
            component: "api-client",
            title: bugReport.title,
            description: bugReport.description,
            reproduction_steps: bugReport.stepsToReproduce,
            expected_behavior: bugReport.expectedResult,
            actual_behavior: bugReport.actualResult,
            system_info: bugReport.systemInfo,
            reporter: "api-client-user",
          }),
        });

        console.log("Internal ticket created successfully");
      } catch (error) {
        console.error("Failed to create internal ticket:", error);
      }
    },
  },
};
