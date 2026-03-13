import path from "node:path";

export const env = {
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), "storage", "app.db"),
  appName: "Media News Automation Admin"
};
