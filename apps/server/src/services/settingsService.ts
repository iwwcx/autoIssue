import { db } from "../config/database";
import { env } from "../config/env";
import { createId } from "../shared/text";
import { parseJson, toJson } from "../shared/json";
import type { CrawlConfig, GenerationConfig } from "../types";

type SettingKey = "crawlConfig" | "generationConfig" | "lastCrawlAt";

const now = () => new Date().toISOString();

const defaultCrawlConfig: CrawlConfig = {
  autoCrawl: true,
  frequencyMinutes: 20,
  enabledPlatforms: ["sixty_seconds", "netease", "google_news"],
  keywords: ["AI", "科技", "财经"],
  blockedWords: ["\u5e7f\u544a", "\u62bd\u5956", "\u5e26\u8d27\u8fd4\u5229"],
  blockedAccounts: [],
  withinHours: 1,
  maxPerPlatform: 30
};

const defaultGenerationConfig: GenerationConfig = {
  defaultLengthMode: "medium",
  autoDetectIssues: true,
  autoEstimateOriginality: true
};

export function seedDefaultSettings(): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
    VALUES (@key, @value, @updatedAt)
  `);

  insert.run({
    key: "crawlConfig",
    value: toJson(defaultCrawlConfig),
    updatedAt: now()
  });
  insert.run({
    key: "generationConfig",
    value: toJson(defaultGenerationConfig),
    updatedAt: now()
  });
  insert.run({
    key: "lastCrawlAt",
    value: toJson({ value: null, id: createId("lastcrawl") }),
    updatedAt: now()
  });
}

export function getSetting<T>(key: SettingKey, fallback: T): T {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return parseJson<T>(row?.value, fallback);
}

export function setSetting(key: SettingKey, value: unknown): void {
  db.prepare(`
    INSERT INTO app_settings (key, value, updatedAt)
    VALUES (@key, @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updatedAt = excluded.updatedAt
  `).run({
    key,
    value: toJson(value),
    updatedAt: now()
  });
}

export function getCrawlConfig(): CrawlConfig {
  const saved = getSetting<CrawlConfig>("crawlConfig", defaultCrawlConfig);
  const merged = {
    ...defaultCrawlConfig,
    ...saved
  };
  const builtInNewsPlatforms = new Set(["sixty_seconds", "netease", "google_news", "gnews", "newsapi", "juhe_news", "alapi_toutiao", "newsdata", "the_news_api"]);
  const availablePlatforms = (merged.enabledPlatforms || []).filter((platform) => builtInNewsPlatforms.has(platform));
  const enabledPlatforms =
    env.newsProvider === "mock" || availablePlatforms.length >= 2
      ? (merged.enabledPlatforms || defaultCrawlConfig.enabledPlatforms)
      : defaultCrawlConfig.enabledPlatforms;

  return {
    ...merged,
    enabledPlatforms,
    maxPerPlatform: Math.min(30, Math.max(5, Number(merged.maxPerPlatform || defaultCrawlConfig.maxPerPlatform)))
  };
}

export function updateCrawlConfig(payload: Partial<CrawlConfig>): CrawlConfig {
  const next = { ...getCrawlConfig(), ...payload };
  next.maxPerPlatform = Math.min(30, Math.max(5, Number(next.maxPerPlatform || 5)));
  setSetting("crawlConfig", next);
  return next;
}

export function getGenerationConfig(): GenerationConfig {
  return getSetting<GenerationConfig>("generationConfig", defaultGenerationConfig);
}

export function updateGenerationConfig(payload: Partial<GenerationConfig>): GenerationConfig {
  const next = { ...getGenerationConfig(), ...payload };
  setSetting("generationConfig", next);
  return next;
}

export function getLastCrawlAt(): string | null {
  const data = getSetting<{ value: string | null }>("lastCrawlAt", { value: null });
  return data.value;
}

export function setLastCrawlAt(value: string): void {
  setSetting("lastCrawlAt", { value });
}






