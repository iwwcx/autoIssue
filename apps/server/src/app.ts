import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", apiRouter);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[api-error]", error);
    const message = error instanceof Error ? error.message : "服务内部错误";
    res.status(500).json({
      success: false,
      message
    });
  });

  return app;
}
