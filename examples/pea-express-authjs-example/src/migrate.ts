import './env';
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzlePeaKey } from "./db";
import { pea } from "@speajus/pea/context";

export async function main() {
    const db = pea(drizzlePeaKey)
    console.log('Running migrations')

    await migrate(db, { migrationsFolder: "drizzle" });

    console.log('Migrated successfully')

}

// if (typeof import.meta.resolve === 'function') {
//     main().catch((e) => {
//         console.error('Migration failed')
//         console.error(e)
//         process.exit(1)
//     });
// }