import { createApp } from "@clawnify/app";
import { initUploads } from "./uploads";
import { ensureSeed } from "./domain/seed";
import api from "./routes";

type Env = { Bindings: { DB: D1Database; UPLOADS: R2Bucket } };

const app = createApp<Env>({
  title: "Open Kitchen",
  version: "1.0.0",
  description:
    "Restaurant & central-kitchen back-of-house — recipes, food cost, inventory, production, compliance.",
});

app.use("*", async (c, next) => {
  if (c.env.UPLOADS) initUploads(c.env.UPLOADS);
  await ensureSeed();
  await next();
});

app.route("/", api);

export default app;
