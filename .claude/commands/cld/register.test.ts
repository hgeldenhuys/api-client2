import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { AgentInfo } from "@lib/cloudios/types";

// Mock the CLOUDIOS helper
const mockWriteAgentInfo = mock<(info: AgentInfo) => void>(() => {});

const mockPaths = mock(() => ({
  PROJECT_NAME: "test-project",
  PROJECT_PATH: "/test/path",
}));
const mockError = mock(() => {});
const mockDebug = mock(() => {});

// Mock the entire CLOUDIOS object
mock.module("../../cloudios/lib/cloudios-helper", () => ({
  CLOUDIOS: {
    writeAgentInfo: mockWriteAgentInfo,
    paths: mockPaths,
    error: mockError,
    debug: mockDebug,
  },
}));

// Mock DNS resolver
const mockDNSResolver = {
  setServers: mock(() => {}),
  resolve4: mock(() => Promise.resolve(["192.168.1.100"])),
};

mock.module("node:dns", () => ({
  promises: {
    Resolver: mock(() => mockDNSResolver),
  },
}));

// Mock os module completely
const mockNetworkInterfaces = mock(() => ({
  eth0: [
    {
      family: "IPv4",
      internal: false,
      address: "192.168.1.50",
    },
  ],
}));

const mockUserInfo = mock(() => ({ username: "testuser" }));

mock.module("node:os", () => ({
  networkInterfaces: mockNetworkInterfaces,
  userInfo: mockUserInfo,
}));

// Mock process.env and process.argv
const originalArgv = process.argv;
const originalEnv = process.env;

// Mock fetch for voices API
const mockFetch = mock((url: string) => {
  if (url === "http://localhost:4000/api/voices") {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          voices: [
            { name: "Alice", gender: "female", is_starred: true },
            { name: "Bob", gender: "male", is_starred: true },
            { name: "Charlie", gender: "male", is_starred: true },
            { name: "Diana", gender: "female", is_starred: true },
            { name: "Eve", gender: "female", is_starred: false },
          ],
        }),
    });
  }
  return Promise.reject(new Error("Unknown URL"));
});

// @ts-ignore
globalThis.fetch = mockFetch;

// Mock Math.random to make voice selection predictable
const originalRandom = Math.random;
function mockRandom(value: number) {
  Math.random = () => value;
  return () => {
    Math.random = originalRandom;
  };
}

function mockDate() {
  const mockDate = new Date("2024-01-01T12:00:00.000Z");
  const originalDate = Date;
  globalThis.Date = class extends Date {
    constructor(...args: never[]) {
      if (args.length > 0) {
        super(...(args as []));
      } else {
        super(mockDate.getTime());
      }
    }
    static now() {
      return mockDate.getTime();
    }
    toISOString() {
      return mockDate.toISOString();
    }
  } as never;
  return originalDate;
}

describe("register.ts", () => {
  beforeEach(() => {
    // Reset all mocks
    mockWriteAgentInfo.mockClear();
    mockPaths.mockClear();
    mockError.mockClear();
    mockDebug.mockClear();
    mockDNSResolver.setServers.mockClear();
    mockDNSResolver.resolve4.mockClear();
    mockNetworkInterfaces.mockClear();
    mockUserInfo.mockClear();
    mockFetch.mockClear();

    // Reset process.env
    process.env = {
      ...originalEnv,
      USER: "testuser",
    } as unknown as typeof process.env;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  describe("parseKeyValueArgs", () => {
    it("should parse key=value arguments correctly", async () => {
      process.argv = [
        "node",
        "register.ts",
        "TestAgent",
        "role=designer",
        "gender=female",
      ];

      // Import the script to test the function
      const { parseKeyValueArgs } = await import("./register");

      const result = parseKeyValueArgs([
        "role=designer",
        "gender=female",
        "theme=AI Development",
      ]);

      expect(result).toEqual({
        role: "designer",
        gender: "female",
        theme: "AI Development",
      });
    });

    it("should handle values with equals signs", async () => {
      const { parseKeyValueArgs } = await import("./register");

      const result = parseKeyValueArgs(["theme=AI=Machine Learning"]);

      expect(result).toEqual({
        theme: "AI=Machine Learning",
      });
    });

    it("should return empty object for no key=value args", async () => {
      const { parseKeyValueArgs } = await import("./register");

      const result = parseKeyValueArgs(["TestAgent", "--verbose"]);

      expect(result).toEqual({});
    });
  });

  describe("getIPAddress", () => {
    it("should get external IP via DNS", async () => {
      mockDNSResolver.resolve4.mockResolvedValueOnce(["203.0.113.1"]);

      const { getIPAddress } = await import("./register");
      const ip = await getIPAddress();

      expect(ip).toBe("203.0.113.1");
      expect(mockDNSResolver.setServers).toHaveBeenCalledWith([
        "208.67.222.222",
        "208.67.220.220",
      ]);
    });

    it("should fallback to local network IP when DNS fails", async () => {
      mockDNSResolver.resolve4.mockRejectedValueOnce(new Error("DNS failed"));
      mockNetworkInterfaces.mockReturnValueOnce({
        eth0: [
          {
            family: "IPv4",
            internal: false,
            address: "192.168.1.50",
          },
        ],
      });

      const { getIPAddress } = await import("./register");
      const ip = await getIPAddress();

      expect(ip).toBe("192.168.1.50");
    });

    it("should fallback to localhost when all methods fail", async () => {
      mockDNSResolver.resolve4.mockRejectedValueOnce(new Error("DNS failed"));
      mockNetworkInterfaces.mockReturnValueOnce({} as never);

      const { getIPAddress } = await import("./register");
      const ip = await getIPAddress();

      expect(ip).toBe("127.0.0.1");
    });
  });

  describe("getUsername", () => {
    it("should get username from USER env var", async () => {
      process.env.USER = "johndoe";

      const { getUsername } = await import("./register");
      const username = getUsername();

      expect(username).toBe("johndoe");
    });

    it("should fallback to USERNAME env var", async () => {
      delete process.env.USER;
      process.env.USERNAME = "janedoe";

      const { getUsername } = await import("./register");
      const username = getUsername();

      expect(username).toBe("janedoe");
    });

    it("should fallback to os.userInfo() when env vars not available", async () => {
      delete process.env.USER;
      delete process.env.USERNAME;
      delete process.env.LOGNAME;

      const { getUsername } = await import("./register");
      const username = getUsername();

      expect(username).toBe("testuser");
    });
  });

  describe("register function", () => {
    it("should register agent with default values", async () => {
      process.argv = ["node", "register.ts", "TestAgent"];

      // Mock Date.now for the consistent timestamp
      const originalDate = mockDate();
      // Mock Math.random to select first voice (Bob for male)
      const restoreRandom = mockRandom(0);

      const { register } = await import("./register");
      const result = await register();

      expect(result).toBe(true);
      expect(mockWriteAgentInfo).toHaveBeenCalledWith({
        agent_name: "TestAgent",
        agent_role: "developer",
        repo_name: "test-project",
        project_path: "/test/path",
        preferred_voice: "Bob",
        setup_timestamp: "2024-01-01T12:00:00.000Z",
        ip_address: "192.168.1.100",
        username: "testuser",
        gender: "male",
      });

      // Restore Date and Math.random
      globalThis.Date = originalDate;
      restoreRandom();
    });

    it("should register agent with custom arguments", async () => {
      process.argv = [
        "node",
        "register.ts",
        "CustomAgent",
        "role=designer",
        "gender=female",
        "theme=AI Development",
      ];

      const originalDate = mockDate();
      // Mock Math.random to select first female voice (Alice)
      const restoreRandom = mockRandom(0);

      const { register } = await import("./register");
      const result = await register();

      expect(result).toBe(true);
      expect(mockWriteAgentInfo).toHaveBeenCalledWith({
        agent_name: "CustomAgent",
        agent_role: "designer",
        repo_name: "test-project",
        project_path: "/test/path",
        preferred_voice: "Alice",
        setup_timestamp: "2024-01-01T12:00:00.000Z",
        ip_address: "192.168.1.100",
        username: "testuser",
        gender: "female",
        theme: "AI Development",
      });

      globalThis.Date = originalDate;
      restoreRandom();
    });

    it("should not include theme when not provided", async () => {
      process.argv = ["node", "register.ts", "TestAgent", "role=architect"];

      const originalDate = mockDate();
      const restoreRandom = mockRandom(0);

      const { register } = await import("./register");
      const result = await register();

      expect(result).toBe(true);
      const calledWith = mockWriteAgentInfo.mock.calls[0][0];
      expect(calledWith).not.toHaveProperty("theme");
      expect(calledWith.agent_role).toBe("architect");

      globalThis.Date = originalDate;
      restoreRandom();
    });

    it("should return false and call error when agent name is missing", async () => {
      process.argv = ["node", "register.ts"];

      const { register } = await import("./register");
      const result = await register();

      expect(result).toBe(false);
      expect(mockError).toHaveBeenCalledWith("❌ Missing agent name");
      expect(mockWriteAgentInfo).not.toHaveBeenCalled();
    });

    it("should ignore non key=value arguments", async () => {
      process.argv = [
        "node",
        "register.ts",
        "TestAgent",
        "--verbose",
        "-f",
        "role=tester",
      ];

      const originalDate = mockDate();
      const restoreRandom = mockRandom(0);

      const { register } = await import("./register");
      const result = await register();

      expect(result).toBe(true);
      const calledWith = mockWriteAgentInfo.mock.calls[0][0];
      expect(calledWith.agent_role).toBe("tester");

      globalThis.Date = originalDate;
      restoreRandom();
    });

    it("should handle DevOps engineer combination", async () => {
      process.argv = [
        "node",
        "register.ts",
        "Jenkins",
        "role=devops",
        "gender=female",
        "theme=CI/CD Pipeline Management",
      ];

      const originalDate = mockDate();
      // Mock Math.random to select first female voice (Alice)
      const restoreRandom = mockRandom(0);

      const { register } = await import("./register");
      const result = await register();

      expect(result).toBe(true);
      expect(mockWriteAgentInfo).toHaveBeenCalledWith({
        agent_name: "Jenkins",
        agent_role: "devops",
        repo_name: "test-project",
        project_path: "/test/path",
        preferred_voice: "Alice",
        setup_timestamp: "2024-01-01T12:00:00.000Z",
        ip_address: "192.168.1.100",
        username: "testuser",
        gender: "female",
        theme: "CI/CD Pipeline Management",
      });

      globalThis.Date = originalDate;
      restoreRandom();
    });

    it("should handle QA tester combination", async () => {
      process.argv = [
        "node",
        "register.ts",
        "QualityBot",
        "role=qa",
        "theme=Test Automation & Bug Detection",
      ];

      const originalDate = mockDate();

      const { register } = await import("./register");
      const result = await register();

      expect(result).toBe(true);
      const calledWith = mockWriteAgentInfo.mock.calls[0][0];
      expect(calledWith.agent_name).toBe("QualityBot");
      expect(calledWith.agent_role).toBe("qa");
      expect(calledWith.gender).toBe("male"); // default
      expect(calledWith.theme).toBe("Test Automation & Bug Detection");

      globalThis.Date = originalDate;
    });
  });
});
