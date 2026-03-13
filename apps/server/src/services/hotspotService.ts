import { db } from "../config/database";
import { sourceRegistry } from "../adapters/sourceAdapter";
import { calculateHeatScore, calculateQualityScore } from "../shared/heat";
import { parseJson, toJson } from "../shared/json";
import { getRelevantImageCandidates } from "../shared/imageTheme";
import {
  containsKeyword,
  createFingerprint,
  createId,
  makeParagraphs,
  pickDistinct
} from "../shared/text";
import { getCrawlConfig, setLastCrawlAt } from "./settingsService";
import type {
  AggregationRecord,
  HotspotInput,
  HotspotRecord,
  HotspotStatus,
  SourcePlatform
} from "../types";

const now = () => new Date().toISOString();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function mapHotspot(row: Record<string, unknown>): HotspotRecord {
  return {
    id: String(row.id),
    fingerprint: String(row.fingerprint),
    platform: row.platform as SourcePlatform,
    topicType: String(row.topicType),
    title: String(row.title),
    content: String(row.content),
    summary: String(row.summary),
    publishTime: String(row.publishTime),
    accountName: String(row.accountName),
    accountId: row.accountId ? String(row.accountId) : undefined,
    coverImage: row.coverImage ? String(row.coverImage) : undefined,
    media: parseJson<string[]>(String(row.mediaJson), []),
    tags: parseJson<string[]>(String(row.tagsJson), []),
    likeCount: Number(row.likeCount),
    commentCount: Number(row.commentCount),
    shareCount: Number(row.shareCount),
    captureTime: String(row.captureTime),
    heatScore: Number(row.heatScore),
    qualityScore: Number(row.qualityScore),
    status: row.status as HotspotStatus,
    raw: parseJson<Record<string, unknown>>(String(row.rawJson || "{}"), {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

function mapAggregation(row: Record<string, unknown>): AggregationRecord {
  return {
    id: String(row.id),
    hotspotId: String(row.hotspotId),
    searchKeyword: String(row.searchKeyword),
    summary: String(row.summary),
    coreFacts: parseJson<string[]>(String(row.coreFactsJson), []),
    relatedImages: parseJson<string[]>(String(row.relatedImagesJson), []),
    relatedSources: parseJson<AggregationRecord["relatedSources"]>(String(row.relatedSourcesJson), []),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

function buildFingerprint(item: HotspotInput): string {
  return createFingerprint([item.platform, item.title, item.accountName, item.publishTime]);
}

function sortCandidates(items: HotspotInput[], seed: number): HotspotInput[] {
  return [...items].sort((left, right) => {
    const leftValue = (left.likeCount + left.commentCount * 3 + left.shareCount * 4 + seed + left.title.length * 13) % 997;
    const rightValue = (right.likeCount + right.commentCount * 3 + right.shareCount * 4 + seed + right.title.length * 13) % 997;
    return rightValue - leftValue;
  });
}

function persistHotspot(item: HotspotInput): HotspotRecord {
  const timestamp = now();
  const fingerprint = buildFingerprint(item);
  const heatScore = calculateHeatScore(item);
  const qualityScore = calculateQualityScore({
    content: item.content,
    tags: item.tags,
    blockedWords: getCrawlConfig().blockedWords
  });
  const existing = db.prepare("SELECT id, createdAt, status FROM hotspots WHERE fingerprint = ?").get(fingerprint) as
    | { id: string; createdAt: string; status: HotspotStatus }
    | undefined;

  const hotspot: HotspotRecord = {
    id: existing?.id || createId("hot"),
    fingerprint,
    ...item,
    captureTime: timestamp,
    heatScore,
    qualityScore,
    status: existing?.status || "pending",
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp
  };

  db.prepare(`
    INSERT INTO hotspots (
      id, fingerprint, platform, topicType, title, content, summary, publishTime,
      accountName, accountId, coverImage, mediaJson, tagsJson, likeCount, commentCount,
      shareCount, captureTime, heatScore, qualityScore, status, rawJson, createdAt, updatedAt
    ) VALUES (
      @id, @fingerprint, @platform, @topicType, @title, @content, @summary, @publishTime,
      @accountName, @accountId, @coverImage, @mediaJson, @tagsJson, @likeCount, @commentCount,
      @shareCount, @captureTime, @heatScore, @qualityScore, @status, @rawJson, @createdAt, @updatedAt
    )
    ON CONFLICT(fingerprint) DO UPDATE SET
      topicType = excluded.topicType,
      content = excluded.content,
      summary = excluded.summary,
      coverImage = excluded.coverImage,
      mediaJson = excluded.mediaJson,
      tagsJson = excluded.tagsJson,
      likeCount = excluded.likeCount,
      commentCount = excluded.commentCount,
      shareCount = excluded.shareCount,
      captureTime = excluded.captureTime,
      heatScore = excluded.heatScore,
      qualityScore = excluded.qualityScore,
      updatedAt = excluded.updatedAt
  `).run({
    ...hotspot,
    mediaJson: toJson(hotspot.media),
    tagsJson: toJson(hotspot.tags),
    rawJson: toJson(hotspot.raw || {})
  });

  return hotspot;
}

export async function crawlHotspots(options?: { limit?: number; platform?: string; replaceExisting?: boolean }): Promise<{
  inserted: number;
  updatedAt: string;
  items: HotspotRecord[];
}> {
  const config = getCrawlConfig();
  const requestedLimit = clamp(Number(options?.limit || 5), 1, 20);
  const platforms = options?.platform ? [options.platform as SourcePlatform] : config.enabledPlatforms;
  const seed = Date.now() % 1000;
  const candidates: HotspotInput[] = [];

  for (const [index, platform] of platforms.entries()) {
    const adapter = sourceRegistry[platform];
    if (!adapter) {
      continue;
    }

    const fetched = await adapter.fetchTrending({
      keywords: config.keywords,
      blockedAccounts: config.blockedAccounts,
      blockedWords: config.blockedWords,
      withinHours: config.withinHours,
      limit: Math.min(20, Math.max(requestedLimit * 2, 6)),
      seed: seed + index * 29
    });
    fetched.forEach((item) => candidates.push(item));
  }

  const selected = pickDistinct(sortCandidates(candidates, seed), (item) => `${item.platform}_${item.title}_${item.accountName}`).slice(0, requestedLimit);

  if (options?.replaceExisting) {
    db.prepare("DELETE FROM hotspot_aggregations").run();
    db.prepare("DELETE FROM hotspots").run();
  }

  const items = selected.map((item) => persistHotspot(item)).sort((left, right) => {
    return new Date(right.captureTime).getTime() - new Date(left.captureTime).getTime() || right.heatScore - left.heatScore;
  });

  const updatedAt = now();
  setLastCrawlAt(updatedAt);
  return {
    inserted: items.length,
    updatedAt,
    items
  };
}

export function listHotspots(query: {
  platform?: string;
  keyword?: string;
  status?: string;
  topicType?: string;
  page?: number;
  pageSize?: number;
}): {
  total: number;
  list: HotspotRecord[];
} {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  const rows = db.prepare("SELECT * FROM hotspots ORDER BY captureTime DESC, heatScore DESC, publishTime DESC").all() as Record<
    string,
    unknown
  >[];
  const filtered = rows.map(mapHotspot).filter((item) => {
    const text = `${item.title} ${item.summary} ${item.content} ${item.tags.join(" ")}`;
    return (
      (!query.platform || item.platform === query.platform) &&
      (!query.status || item.status === query.status) &&
      (!query.topicType || item.topicType === query.topicType) &&
      (!query.keyword || containsKeyword(text, [query.keyword]))
    );
  });

  const start = (page - 1) * pageSize;
  return {
    total: filtered.length,
    list: filtered.slice(start, start + pageSize)
  };
}

export function getHotspotById(id: string): HotspotRecord | undefined {
  const row = db.prepare("SELECT * FROM hotspots WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? mapHotspot(row) : undefined;
}

export function updateHotspotStatus(id: string, status: HotspotStatus): HotspotRecord {
  db.prepare("UPDATE hotspots SET status = ?, updatedAt = ? WHERE id = ?").run(status, now(), id);
  const hotspot = getHotspotById(id);
  if (!hotspot) {
    throw new Error("\u70ed\u70b9\u4e0d\u5b58\u5728");
  }
  return hotspot;
}

export function deleteHotspot(id: string): void {
  db.prepare("DELETE FROM hotspots WHERE id = ?").run(id);
  db.prepare("DELETE FROM hotspot_aggregations WHERE hotspotId = ?").run(id);
}

export function getAggregationByHotspotId(hotspotId: string): AggregationRecord | undefined {
  const row = db
    .prepare("SELECT * FROM hotspot_aggregations WHERE hotspotId = ?")
    .get(hotspotId) as Record<string, unknown> | undefined;
  return row ? mapAggregation(row) : undefined;
}

export async function aggregateHotspot(hotspotId: string): Promise<AggregationRecord> {
  const hotspot = getHotspotById(hotspotId);
  if (!hotspot) {
    throw new Error("\u70ed\u70b9\u4e0d\u5b58\u5728");
  }

  const existing = getAggregationByHotspotId(hotspotId);
  const searchKeywords = pickDistinct([hotspot.title, ...hotspot.tags].filter(Boolean), (item) => item).slice(0, 4);
  const enabledPlatforms = getCrawlConfig().enabledPlatforms;
  const related = await Promise.all(
    searchKeywords.flatMap((keyword) =>
      enabledPlatforms.map((platform) => sourceRegistry[platform].searchRelated(keyword, 6))
    )
  );
  const merged = pickDistinct(
    related.flat().filter((item) => item.title !== hotspot.title || item.platform !== hotspot.platform),
    (item) => `${item.platform}_${item.title}`
  );

  const coreFacts = pickDistinct(
    [hotspot, ...merged].map((item) => item.summary),
    (item) => item
  )
    .filter(Boolean)
    .slice(0, 6);

  const relatedImages = getRelevantImageCandidates(
    {
      title: hotspot.title,
      summary: `${hotspot.summary} ${coreFacts.join(" ")}`,
      topicType: hotspot.topicType,
      coverImage: hotspot.coverImage,
      media: hotspot.media
    },
    6
  );

  const relatedSources = merged.slice(0, 10).map((item) => ({
    platform: item.platform,
    title: item.title,
    summary: item.summary,
    accountName: item.accountName,
    publishTime: item.publishTime,
    tags: item.tags
  }));

  const summary = makeParagraphs([
    `\u56f4\u7ed5\u201c${hotspot.title}\u201d\uff0c\u7cfb\u7edf\u6309\u7167\u5f53\u524d\u5df2\u542f\u7528\u7684\u5e73\u53f0\u505a\u4e86\u4e8c\u6b21\u6c47\u603b\uff0c\u6838\u5fc3\u641c\u7d22\u8bcd\u5305\u62ec\uff1a${searchKeywords.join("\u3001")}\u3002`,
    coreFacts.length
      ? `\u7efc\u5408\u591a\u5e73\u53f0\u5185\u5bb9\u540e\uff0c\u76ee\u524d\u6700\u503c\u5f97\u63d0\u70bc\u7684\u91cd\u70b9\u662f\uff1a${coreFacts.map((item, index) => `${index + 1}.${item}`).join(" ")}`
      : "\u6682\u672a\u53d1\u73b0\u8db3\u591f\u591a\u7684\u8865\u5145\u4fe1\u606f\uff0c\u5efa\u8bae\u540e\u7eed\u4eba\u5de5\u8ffd\u52a0\u6743\u5a01\u4fe1\u6e90\u3002"
  ]);

  const aggregation: AggregationRecord = {
    id: existing?.id || createId("agg"),
    hotspotId,
    searchKeyword: searchKeywords.join(" | "),
    summary,
    coreFacts,
    relatedImages,
    relatedSources,
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  };

  db.prepare(`
    INSERT INTO hotspot_aggregations (
      id, hotspotId, searchKeyword, summary, coreFactsJson, relatedImagesJson,
      relatedSourcesJson, createdAt, updatedAt
    ) VALUES (
      @id, @hotspotId, @searchKeyword, @summary, @coreFactsJson, @relatedImagesJson,
      @relatedSourcesJson, @createdAt, @updatedAt
    )
    ON CONFLICT(hotspotId) DO UPDATE SET
      searchKeyword = excluded.searchKeyword,
      summary = excluded.summary,
      coreFactsJson = excluded.coreFactsJson,
      relatedImagesJson = excluded.relatedImagesJson,
      relatedSourcesJson = excluded.relatedSourcesJson,
      updatedAt = excluded.updatedAt
  `).run({
    ...aggregation,
    coreFactsJson: toJson(aggregation.coreFacts),
    relatedImagesJson: toJson(aggregation.relatedImages),
    relatedSourcesJson: toJson(aggregation.relatedSources)
  });

  return aggregation;
}