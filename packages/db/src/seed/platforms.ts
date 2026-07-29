import { createHash } from "node:crypto";
import { PLATFORM_CONFIG } from "@wolf/platforms";

import { withSystem } from "../tenant";

export const PLATFORMS = PLATFORM_CONFIG;

function hashConfig(config: unknown): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

/** Idempotent platform upsert from the server-owned platform registry. */
export async function seedPlatforms(): Promise<number> {
  return withSystem("seed platforms registry", async (tx) => {
    let touched = 0;
    for (const config of PLATFORMS) {
      const nextHash = hashConfig(config);
      const existing = await tx<
        {
          id: string;
          config: unknown;
          config_version: number;
        }[]
      >`
        select id, config, config_version
        from platform
        where slug = ${config.slug}
        limit 1
      `;

      const row = existing[0];
      if (!row) {
        await tx`
          insert into platform (slug, name, config, config_version)
          values (${config.slug}, ${config.name}, ${tx.json(config)}, 1)
        `;
        touched += 1;
        continue;
      }

      const previousHash = hashConfig(row.config);
      if (previousHash === nextHash) continue;

      await tx`
        update platform
        set
          name = ${config.name},
          config = ${tx.json(config)},
          config_version = ${row.config_version + 1}
        where slug = ${config.slug}
      `;
      touched += 1;
    }
    return touched;
  });
}
