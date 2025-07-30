import React from 'react';

export interface BugReport {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  systemInfo: {
    userAgent: string;
    url: string;
    timestamp: string;
    viewport: {
      width: number;
      height: number;
    };
  };
}

export interface ApiClientConfig {
  branding: {
    logo?: React.ReactNode;
    logoLink?: string;
  };
  repository: {
    label: string;
    url: string;
    icon?: React.ReactNode;
  };
  support: {
    label: string;
    email?: string;
    url?: string;
  };
  community: {
    label: string;
    url: string;
  };
  bugReporting: {
    enabled: boolean;
    onSubmitBug?: (bugReport: BugReport) => void;
  };
}

export const DEFAULT_CONFIG: ApiClientConfig = {
  branding: {
    logoLink: '/',
  },
  repository: {
    label: 'View on GitHub',
    url: 'https://github.com/api-client/docs',
  },
  support: {
    label: 'Contact Support',
    email: 'support@api-client.dev',
  },
  community: {
    label: 'Community Forum',
    url: 'https://community.api-client.com',
  },
  bugReporting: {
    enabled: true,
    onSubmitBug: (bugReport: BugReport) => {
      console.log('Bug Report Submitted:', JSON.stringify(bugReport, null, 2));
    },
  },
};