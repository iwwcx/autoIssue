import { createApp } from "./app";
import { bootstrapDatabase } from "./config/bootstrap";
import { env } from "./config/env";
import { startScheduler } from "./config/scheduler";

bootstrapDatabase();

const app = createApp();

app.listen(env.port, () => {
  startScheduler();
  console.log(`[server] ${env.appName} listening on http://localhost:${env.port}`);
});
