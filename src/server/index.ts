import { Hono } from "hono";
import { initDB } from "./db";
import { initUploads } from "./uploads";
import { ensureSeed } from "./domain/seed";
import api from "./routes";

type Env = { Bindings: { DB: D1Database; UPLOADS: R2Bucket } };

const app = new Hono<Env>();

app.use("*", async (c, next) => {
  initDB(c.env);
  if (c.env.UPLOADS) initUploads(c.env.UPLOADS);
  await ensureSeed();
  await next();
});

app.route("/", api);

export default app;
