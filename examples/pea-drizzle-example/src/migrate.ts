#!/usr/bin/env tsx

import { migrate as dbMigrate } from "drizzle-orm/libsql/migrator";
import { drizzlePeaKey, register } from "./pea";
import { pea } from "@speajus/pea/context";
import { fileURLToPath } from "url";

register();

export async function migrate(
  db = pea(drizzlePeaKey),
  migrationsFolder = `${process.cwd()}/drizzle`
) {
  console.log("Running migrations from: %s", migrationsFolder);

  await dbMigrate(db, { migrationsFolder });

  console.log("Migrated successfully");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await migrate();
}
