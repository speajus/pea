import app from "./auth.route";
import * as ejs from "ejs";
import { pea } from "@speajus/pea";
import { sessionPeaKey } from "./pea";
import { env } from "@speajus/pea/env";

const port = app.get("port") ?? 3000;
const __dirname = new URL(".", import.meta.url).pathname;

app.set("view engine", "ejs");
app.engine("ejs", (ejs as any).__express);
app.set("views", __dirname + "/../views");
app.get("/", function (req, res) {
  res.render("index", { pea: pea(sessionPeaKey) });
});

// about page
app.listen(port, () => {
  console.log(
    `Server is running on port ${port}\n http://localhost:${port} using db ${env(
      "DATABASE_URL"
    )}`
  );
});
