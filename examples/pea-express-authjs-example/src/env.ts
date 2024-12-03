import { config } from "dotenv";
const dirname = new URL('.', import.meta.url).pathname;

config({ path: `${dirname}/../.env.${process.env.NODE_ENV ?? 'local'}` });
