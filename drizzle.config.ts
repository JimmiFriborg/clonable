import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/infrastructure/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.CLONABLE_DB_PATH ?? "./data/clonable.db",
  },
});
