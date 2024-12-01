import { ExpressAuth, ExpressAuthConfig, getSession } from "@auth/express"
import express, { Express } from "express"
import '@speajus/pea/dist/async';
import { context, pea } from "@speajus/pea";
import { sessionPeaKey } from "./pea";
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { drizzle } from "drizzle-orm/libsql";

class ExpressAuthConfigClass implements ExpressAuthConfig {
    constructor(public providers = [], public adapter = pea(DrizzleAdapter)) { }
}

const app: Express = express();

const requestScoped = context.scoped(sessionPeaKey);

context.register(DrizzleAdapter, pea(drizzle));

// If app is served through a proxy, trust the proxy to allow HTTPS protocol to be detected
// https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', true)

app.use(
    "/auth/*",
    ExpressAuth(pea(ExpressAuthConfigClass))
);

app.use("/*", async (req, res, next) => {
    console.log('here')
    requestScoped(await getSession(req, pea(ExpressAuthConfigClass)));
    next();
});

export default app;