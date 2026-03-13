import { Router } from "express";
import { z } from "zod";
import { getDashboardOverview } from "../services/analyticsService";
import {
  checkAccountStatus,
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount
} from "../services/accountService";
import {
  generateDraft,
  getDraftById,
  listDraftVersions,
  listDrafts,
  updateDraft
} from "../services/draftService";
import {
  aggregateHotspot,
  crawlHotspots,
  deleteHotspot,
  getHotspotById,
  listHotspots,
  updateHotspotStatus
} from "../services/hotspotService";
import {
  createPublishJob,
  executeJob,
  listPublishRecords,
  refreshPublishMetrics
} from "../services/publishService";
import {
  getCrawlConfig,
  getGenerationConfig,
  updateCrawlConfig,
  updateGenerationConfig
} from "../services/settingsService";
import { createStyle, listStyles, updateStyle } from "../services/styleService";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ success: true, message: "server is running" });
});

apiRouter.get("/dashboard/overview", (_req, res) => {
  res.json({ success: true, data: getDashboardOverview() });
});

apiRouter.get("/settings/crawl", (_req, res) => {
  res.json({ success: true, data: getCrawlConfig() });
});

apiRouter.put("/settings/crawl", (req, res) => {
  res.json({ success: true, data: updateCrawlConfig(req.body) });
});

apiRouter.get("/settings/generation", (_req, res) => {
  res.json({ success: true, data: getGenerationConfig() });
});

apiRouter.put("/settings/generation", (req, res) => {
  res.json({ success: true, data: updateGenerationConfig(req.body) });
});

apiRouter.post("/crawler/run", async (_req, res, next) => {
  try {
    res.json({ success: true, data: await crawlHotspots() });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/hotspots", (req, res) => {
  res.json({
    success: true,
    data: listHotspots({
      platform: req.query.platform as string,
      keyword: req.query.keyword as string,
      status: req.query.status as string,
      topicType: req.query.topicType as string,
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 10)
    })
  });
});

apiRouter.get("/hotspots/:id", (req, res) => {
  res.json({ success: true, data: getHotspotById(req.params.id) });
});

apiRouter.post("/hotspots/:id/status", (req, res) => {
  res.json({ success: true, data: updateHotspotStatus(req.params.id, req.body.status) });
});

apiRouter.delete("/hotspots/:id", (req, res) => {
  deleteHotspot(req.params.id);
  res.json({ success: true });
});

apiRouter.post("/hotspots/:id/aggregate", async (req, res, next) => {
  try {
    res.json({ success: true, data: await aggregateHotspot(req.params.id) });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/styles", (_req, res) => {
  res.json({ success: true, data: listStyles() });
});

apiRouter.post("/styles", (req, res) => {
  res.json({ success: true, data: createStyle(req.body) });
});

apiRouter.put("/styles/:id", (req, res) => {
  res.json({ success: true, data: updateStyle(req.params.id, req.body) });
});

apiRouter.get("/drafts", (_req, res) => {
  res.json({ success: true, data: listDrafts() });
});

apiRouter.get("/drafts/:id", (req, res) => {
  res.json({ success: true, data: getDraftById(req.params.id) });
});

apiRouter.post("/drafts/generate", async (req, res, next) => {
  try {
    res.json({ success: true, data: await generateDraft(req.body) });
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/drafts/:id", (req, res) => {
  res.json({ success: true, data: updateDraft(req.params.id, req.body, "admin") });
});

apiRouter.get("/drafts/:id/versions", (req, res) => {
  res.json({ success: true, data: listDraftVersions(req.params.id) });
});

apiRouter.get("/accounts", (_req, res) => {
  res.json({ success: true, data: listAccounts() });
});

apiRouter.post("/accounts", (req, res) => {
  res.json({ success: true, data: createAccount(req.body) });
});

apiRouter.put("/accounts/:id", (req, res) => {
  res.json({ success: true, data: updateAccount(req.params.id, req.body) });
});

apiRouter.delete("/accounts/:id", (req, res) => {
  deleteAccount(req.params.id);
  res.json({ success: true });
});

apiRouter.post("/accounts/:id/check", async (req, res, next) => {
  try {
    res.json({ success: true, data: await checkAccountStatus(req.params.id) });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/publish/records", (_req, res) => {
  res.json({ success: true, data: listPublishRecords() });
});

apiRouter.post("/publish/jobs", async (req, res, next) => {
  try {
    const schema = z.object({
      draftId: z.string(),
      scheduledAt: z.string().optional(),
      targets: z.array(
        z.object({
          platform: z.enum(["netease", "sohu", "xiaohongshu", "sina", "weixin", "baijiahao", "pengpai"]),
          accountId: z.string()
        })
      )
    });
    const payload = schema.parse(req.body);
    res.json({ success: true, data: await createPublishJob(payload) });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/publish/jobs/:id/execute", async (req, res, next) => {
  try {
    res.json({ success: true, data: await executeJob(req.params.id) });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/publish/metrics/refresh", async (_req, res, next) => {
  try {
    await refreshPublishMetrics();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/analytics/overview", (_req, res) => {
  res.json({ success: true, data: getDashboardOverview() });
});
