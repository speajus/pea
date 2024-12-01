import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { context, peaKey } from '@speajus/pea';
export const dbKey = peaKey('db');
// You can specify any property from the libsql connection options
context.register(dbKey, drizzle, { connection: { url: process.env.DB_FILE_NAME! } });
