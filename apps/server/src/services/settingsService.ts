import { db } from "../config/database";
import { createId } from "../shared/text";
import { parseJson, toJson } from "../shared/json";
import type { CrawlConfig, GenerationConfig } from "../types";

type SettingKey = "crawlConfig" | "generationConfig" | "lastCrawlAt";

const now = () => new Date().toISOString();

const defaultCrawlConfig: CrawlConfig = {
  autoCrawl: true,
  frequencyMinutes: 20,
  enabledPlatforms: ["douyin", "xiaohongshu", "weibo"],
  keywords: ["\u6c11\u751f", "\u79d1\u6280", "\u5a31\u4e50"],
  blockedWords: ["\u5e7f\u544a", "\u62bd\u5956", "\u5e26\u8d27\u8fd4\u5229"],
  blockedAccounts: [],
  withinHours: 1,
  maxPerPlatform: 20
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
  return {
    ...defaultCrawlConfig,
    ...saved,
    maxPerPlatform: Math.min(20, Math.max(5, Number(saved.maxPerPlatform || defaultCrawlConfig.maxPerPlatform)))
  };
}

export function updateCrawlConfig(payload: Partial<CrawlConfig>): CrawlConfig {
  const next = { ...getCrawlConfig(), ...payload };
  next.maxPerPlatform = Math.min(20, Math.max(5, Number(next.maxPerPlatform || 5)));
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