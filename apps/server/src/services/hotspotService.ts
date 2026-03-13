import { db } from "../config/database";
import { sourceRegistry } from "../adapters/sourceAdapter";
import { calculateHeatScore, calculateQualityScore } from "../shared/heat";
import { parseJson, toJson } from "../shared/json";
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

function persistHotspot(item: HotspotInput): HotspotRecord {
  const timestamp = now();
  const fingerprint = buildFingerprint(item);
  const heatScore = calculateHeatScore(item);
  const qualityScore = calculateQualityScore({
    content: item.content,
    tags: item.tags,
    blockedWords: getCrawlConfig().blockedWords
  });
  const existing = db.prepare("SELECT id, createdAt FROM hotspots WHERE fingerprint = ?").get(fingerprint) as
    | { id: string; createdAt: string }
    | undefined;

  const hotspot: HotspotRecord = {
    id: existing?.id || createId("hot"),
    fingerprint,
    ...item,
    captureTime: timestamp,
    heatScore,
    qualityScore,
    status: "pending",
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

export async function crawlHotspots(): Promise<{
  inserted: number;
  updatedAt: string;
  items: HotspotRecord[];
}> {
  const config = getCrawlConfig();
  const items: HotspotRecord[] = [];

  for (const platform of config.enabledPlatforms) {
    const adapter = sourceRegistry[platform];
    const fetched = await adapter.fetchTrending({
      keywords: config.keywords,
      blockedAccounts: config.blockedAccounts,
      blockedWords: config.blockedWords,
      withinHours: config.withinHours,
      limit: config.maxPerPlatform
    });
    fetched.forEach((item) => items.push(persistHotspot(item)));
  }

  const updatedAt = now();
  setLastCrawlAt(updatedAt);
  return {
    inserted: items.length,
    updatedAt,
    items: items.sort((a, b) => b.heatScore - a.heatScore)
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
  const pageSize = Number(query.pageSize || 10);
  const rows = db.prepare("SELECT * FROM hotspots ORDER BY heatScore DESC, publishTime DESC").all() as Record<
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
    throw new Error("热点不存在");
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
    throw new Error("热点不存在");
  }

  const existing = getAggregationByHotspotId(hotspotId);
  const searchKeywords = pickDistinct([hotspot.title, ...hotspot.tags].filter(Boolean), (item) => item).slice(0, 4);
  const related = await Promise.all(
    searchKeywords.flatMap((keyword) => Object.values(sourceRegistry).map((adapter) => adapter.searchRelated(keyword, 5)))
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
    .slice(0, 5);

  const relatedImages = pickDistinct(
    [hotspot.coverImage, ...hotspot.media, ...merged.flatMap((item) => [item.coverImage, ...item.media])]
      .filter(Boolean) as string[],
    (item) => item
  ).slice(0, 8);

  const relatedSources = merged.slice(0, 8).map((item) => ({
    platform: item.platform,
    title: item.title,
    summary: item.summary,
    accountName: item.accountName,
    publishTime: item.publishTime,
    tags: item.tags
  }));

  const summary = makeParagraphs([
    `围绕“${hotspot.title}”，系统用 ${searchKeywords.join(" / ")} 作为搜索词，从 ${new Set([hotspot.platform, ...relatedSources.map((item) => item.platform)]).size} 个平台汇总到了多条相关信息。`,
    coreFacts.length
      ? `当前最核心的几个信息点包括：${coreFacts.map((item, index) => `${index + 1}.${item}`).join(" ")}`
      : "暂未发现足够多的补充信息，建议后续人工追加权威信源。"
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
