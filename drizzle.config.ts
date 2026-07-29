import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL_MIGRATOR?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  throw new Error("DATABASE_URL_MIGRATOR or DATABASE_URL is required for drizzle-kit");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./packages/db/src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
