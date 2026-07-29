import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "dotenv/config";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

async function main() {
  const url = process.env.DATABASE_URL_MIGRATOR ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set DATABASE_URL_MIGRATOR (preferred) or DATABASE_URL");
  }

  // Direct connection preferred for DDL; prepare irrelevant for migrations
  const sql = postgres(url, { max: 1, prepare: false });

  try {
    await sql`
      create table if not exists schema_migrations (
        id text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `;

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const id = file;
      const body = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const checksum = createHash("sha256").update(body).digest("hex");

      const existing = await sql<
        { id: string; checksum: string }[]
      >`select id, checksum from schema_migrations where id = ${id}`;

      if (existing[0]) {
        if (existing[0].checksum !== checksum) {
          throw new Error(
            `Migration ${id} was modified after apply (checksum mismatch). Add a new migration instead.`,
          );
        }
        console.log(`skip  ${id}`);
        continue;
      }

      console.log(`apply ${id}`);
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`
          insert into schema_migrations (id, checksum)
          values (${id}, ${checksum})
        `;
      });
    }

    console.log("Migrations complete.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
