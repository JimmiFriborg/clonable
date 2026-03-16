import { defineConfig, devices } from "@playwright/test";

const PORT = 4010;
const baseURL = `http://127.0.0.1:${PORT}`;
const runId = process.env.PLAYWRIGHT_RUN_ID ?? `${Date.now()}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html"], ["line"]] : "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "node .next/standalone/server.js",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      HOSTNAME: "127.0.0.1",
      PORT: `${PORT}`,
      CLONABLE_DB_PATH: `./.tmp/e2e/${runId}/clonable.e2e.db`,
      CLONABLE_PROJECTS_ROOT: `./.tmp/e2e/${runId}/projects`,
      CLONABLE_DEPLOYMENT_MODE: "hosted",
      CLONABLE_ALLOW_LOCAL_EXECUTION: "false",
      CLONABLE_SITE_URL: baseURL,
      CLONABLE_PLANNER_USE_FIXTURE: "true",
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      GEMINI_API_KEY: "",
      OPENCLAW_BASE_URL: "",
      OPENCLAW_API_KEY: "",
      OPENCLAW_DEFAULT_BOT_ID: "mvp-guide",
      CLONABLE_APPWRITE_ENDPOINT: "",
      CLONABLE_APPWRITE_PROJECT_ID: "",
      CLONABLE_APPWRITE_API_KEY: "",
      CLONABLE_APPWRITE_DATABASE_ID: "",
      NEXT_PUBLIC_APPWRITE_ENDPOINT: "",
      NEXT_PUBLIC_APPWRITE_PROJECT_ID: "",
      NEXT_PUBLIC_CLONABLE_SITE_URL: baseURL,
    },
  },
});
