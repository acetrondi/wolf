import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

/** Starter smoke-test table — replaced by tenancy schema in Phase 1. */
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});
