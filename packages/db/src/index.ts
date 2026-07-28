import { env } from "@wolf/config";
import { drizzle } from "drizzle-orm/neon-http";

export const db = drizzle(env.DATABASE_URL);
export * from "./schema";
