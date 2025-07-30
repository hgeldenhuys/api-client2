# API Client Configuration Guide

The API Client is now fully configurable! You can customize branding, repository links, support contacts, community links, and bug reporting functionality.

## Quick Start

To configure the API Client, wrap your application with the `ConfigProvider` and pass your configuration:

```tsx
import { ConfigProvider } from '~/components/ConfigProvider';
import { ApiClientConfig } from '~/types/config';

const myConfig: Partial<ApiClientConfig> = {
  branding: {
    logo: <YourLogo />,
    logoLink: 'https://yoursite.com',
  },
  repository: {
    label: 'View Source',
    url: 'https://github.com/yourorg/api-client',
  },
  support: {
    label: 'Get Help',
    email: 'support@yourcompany.com',
  },
};

function App() {
  return (
    <ConfigProvider config={myConfig}>
      {/* Your app content */}
    </ConfigProvider>
  );
}
```

## Configuration Options

### 1. Branding
Customize the logo and its link:

```tsx
branding: {
  logo: <YourCustomLogo />,  // React component for your logo
  logoLink: '/dashboard',    // URL when logo is clicked (default: '/')
}
```

### 2. Repository Link
Configure the "View on GitHub" button in documentation:

```tsx
repository: {
  label: 'View on GitLab',                           // Button text
  url: 'https://gitlab.com/yourorg/api-client',     // Repository URL
  icon: <GitlabIcon className="h-4 w-4 mr-2" />,   // Optional custom icon
}
```

### 3. Support Configuration
Set up support contact options:

```tsx
support: {
  label: 'Contact Support',           // Button text
  email: 'help@yourcompany.com',     // Opens mailto link
  // OR
  url: 'https://support.yoursite.com', // Opens support URL
}
```

### 4. Community Links
Configure community forum or chat links:

```tsx
community: {
  label: 'Discord Community',        // Button text
  url: 'https://discord.gg/yourorg', // Community URL
}
```

### 5. Bug Reporting
Enable/disable bug reporting and customize the submission handler:

```tsx
bugReporting: {
  enabled: true,                     // Show/hide the bug report tab
  onSubmitBug: async (bugReport) => {
    // Custom bug submission logic
    await fetch('/api/bugs', {
      method: 'POST',
      body: JSON.stringify(bugReport),
    });
  },
}
```

## Example Configurations

### GitHub-based Open Source Project
```tsx
import { Github } from 'lucide-react';

const openSourceConfig = {
  branding: {
    logo: <ProjectLogo />,
    logoLink: 'https://yourproject.dev',
  },
  repository: {
    label: 'Contribute on GitHub',
    url: 'https://github.com/yourorg/project',
    icon: <Github className="h-4 w-4 mr-2" />,
  },
  support: {
    label: 'Community Support',
    url: 'https://github.com/yourorg/project/discussions',
  },
  community: {
    label: 'Discord Chat',
    url: 'https://discord.gg/yourproject',
  },
  bugReporting: {
    enabled: true,
    onSubmitBug: (bugReport) => {
      // Redirect to GitHub issue creation
      const issueUrl = `https://github.com/yourorg/project/issues/new?title=${encodeURIComponent(bugReport.title)}&body=${encodeURIComponent(bugReport.description)}`;
      window.open(issueUrl, '_blank');
    },
  },
};
```

### Enterprise Configuration
```tsx
const enterpriseConfig = {
  branding: {
    logo: <CompanyLogo />,
    logoLink: 'https://intranet.company.com',
  },
  repository: {
    label: 'Internal Wiki',
    url: 'https://wiki.company.com/api-client',
  },
  support: {
    label: 'IT Helpdesk',
    url: 'https://helpdesk.company.com',
  },
  community: {
    label: 'Developer Portal',
    url: 'https://developers.company.com',
  },
  bugReporting: {
    enabled: true,
    onSubmitBug: async (bugReport) => {
      // Send to internal ticketing system
      await fetch('/api/internal/tickets', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + getInternalToken() },
        body: JSON.stringify({
          type: 'bug_report',
          title: bugReport.title,
          description: bugReport.description,
          // ... other fields
        }),
      });
    },
  },
};
```

## Bug Report Data Structure

When `onSubmitBug` is called, it receives a `BugReport` object with:

```typescript
interface BugReport {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  systemInfo: {
    userAgent: string;
    url: string;
    timestamp: string;
    viewport: { width: number; height: number };
  };
}
```

## Default Configuration

If no configuration is provided, the API Client uses these defaults:

- **Logo**: None (no logo displayed)
- **Repository**: "View on GitHub" → `https://github.com/api-client/docs`
- **Support**: "Contact Support" → `mailto:support@api-client.dev`
- **Community**: "Community Forum" → `https://community.api-client.com`
- **Bug Reporting**: Enabled, logs to console

## Features

### ✅ Configurable Elements
- [x] Logo with custom link
- [x] Repository link (GitHub, GitLab, etc.)
- [x] Support contact (email or URL)
- [x] Community forum link
- [x] Bug reporting system
- [x] Bug report tab (can be disabled)

### ✅ Bug Reporting Features
- [x] Comprehensive bug report form
- [x] System information auto-collection
- [x] Form validation
- [x] Custom submission handlers
- [x] Loading and success states

### ✅ Keyboard Shortcuts
- [x] ⌘1 - Collections
- [x] ⌘2 - Environments  
- [x] ⌘3 - Documentation
- [x] ⌘4 - Submit Bug (if enabled)

## Integration

The configuration system is designed to be:
- **Backward compatible** - works without any configuration
- **Type-safe** - full TypeScript support
- **Flexible** - partial configuration supported
- **Extensible** - easy to add new options

For more examples, see `app/utils/example-configs.tsx`.