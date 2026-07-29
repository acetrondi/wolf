import "dotenv/config";

import { closeDbClients } from "../tenant";
import { seedDemoOrg } from "./demo";
import { seedPlatforms } from "./platforms";

async function main() {
  const platformsTouched = await seedPlatforms();
  const demo = await seedDemoOrg();
  console.log("platforms upserted/changed:", platformsTouched);
  console.log("demo org:", demo);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDbClients();
  });
