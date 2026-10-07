/**
 * Demo data for trying out the system: `npm run db:demo` adds it,
 * `npm run db:demo -- --remove` removes it again. Everything is flagged is_demo
 * and shown with a "Demo" label in the admin.
 */
import "./env";
import { openDatabase } from "../src/server/db/client";
import { removeDemoData, seedDemoData } from "../src/server/db/seed";

async function main() {
  const handle = openDatabase();
  try {
    if (process.argv.includes("--remove")) {
      await removeDemoData(handle.db);
      console.log("• Demodata verwijderd");
    } else {
      const result = await seedDemoData(handle.db);
      console.log(`• Demodata toegevoegd: ${result.customers} klanten, ${result.appointments} afspraken`);
    }
  } finally {
    await handle.close();
  }
}

main().catch((error) => {
  console.error("✗ Mislukt:", error);
  process.exit(1);
});
