import { ExpressAuth, getSession } from "@auth/express"
import express, { Express } from "express"
import '@speajus/pea/async';
import { context, pea } from "@speajus/pea";
import { sessionPeaKey } from "./pea";
import { ExpressAuthConfigClass } from "./auth.config";


const app: Express = express();

const requestScoped = context.scoped(sessionPeaKey);




// If app is served through a proxy, trust the proxy to allow HTTPS protocol to be detected
// https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', true)


app.use(
    "/auth/*",
    ExpressAuth(pea(ExpressAuthConfigClass))
)

app.use("/*", async (req, res, next) => {
    const session = await getSession(req, pea(ExpressAuthConfigClass))
    if (!session?.user) {
        return res.redirect('/auth/signin');
    }

    requestScoped(next, session);
});

export default app;