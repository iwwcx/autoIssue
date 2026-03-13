import { db } from "../config/database";
import { parseJson, toJson } from "../shared/json";
import {
  createId,
  detectIssues,
  estimateOriginality,
  interpolate,
  makeParagraphs
} from "../shared/text";
import { getCrawlConfig, getGenerationConfig } from "./settingsService";
import { aggregateHotspot, getAggregationByHotspotId, getHotspotById } from "./hotspotService";
import { getDefaultStyle, getStyleById } from "./styleService";
import type {
  DraftImageBlock,
  DraftRecord,
  DraftStatus,
  DraftVersionRecord,
  StyleTemplate
} from "../types";

const now = () => new Date().toISOString();

function mapDraft(row: Record<string, unknown>): DraftRecord {
  return {
    id: String(row.id),
    hotspotId: String(row.hotspotId),
    styleId: String(row.styleId),
    title: String(row.title),
    summary: String(row.summary),
    content: String(row.content),
    coverImage: row.coverImage ? String(row.coverImage) : undefined,
    images: parseJson<DraftImageBlock[]>(String(row.imagesJson), []),
    titleOptions: parseJson<string[]>(String(row.titleOptionsJson), []),
    status: row.status as DraftStatus,
    originalityScore: Number(row.originalityScore),
    errorReport: parseJson<string[]>(String(row.errorReportJson), []),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

function mapVersion(row: Record<string, unknown>): DraftVersionRecord {
  return {
    id: String(row.id),
    draftId: String(row.draftId),
    versionNo: Number(row.versionNo),
    title: String(row.title),
    content: String(row.content),
    images: parseJson<DraftImageBlock[]>(String(row.imagesJson), []),
    operatorName: String(row.operatorName),
    createdAt: String(row.createdAt)
  };
}

function buildTitleOptions(title: string, topicType: string): string[] {
  return [
    `刚刚热起来的“${title}”，到底透露了什么信号？`,
    `${topicType}热点追踪：${title}`,
    `多平台都在讨论 ${title}，背后原因并不简单`,
    `关于“${title}”，你最该关注的 3 个信息点`,
    `${title} 继续发酵，普通人最关心的问题是什么`
  ];
}

function buildImages(coverImage: string | undefined, relatedImages: string[]): DraftImageBlock[] {
  const images = [coverImage, ...relatedImages].filter(Boolean) as string[];
  return images.slice(0, 4).map((url, index) => ({
    type: index === 0 ? "cover" : "inline",
    url,
    caption: index === 0 ? "封面图" : `配图 ${index}`,
    position: index
  }));
}

function buildContent(style: StyleTemplate, input: {
  title: string;
  summary: string;
  topicType: string;
  aggregationSummary: string;
  relatedSources: Array<{
    platform: string;
    title: string;
    summary: string;
  }>;
}): string {
  const opening = interpolate(style.openingTemplate, {
    title: input.title,
    topicType: input.topicType,
    summary: input.summary,
    signature: style.signature
  });

  const platformParagraphs = input.relatedSources.length
    ? input.relatedSources.map((item) => {
        return `从 ${item.platform} 平台补充的信息来看，"${item.title}" 主要提到了：${item.summary}`;
      })
    : ["当前跨平台补充信息还不算多，建议后续优先补充权威来源和一手信息。"];

  const analysis = `综合现有信息，这个热点的核心价值在于：第一，它具备持续讨论度；第二，它和 ${input.topicType} 领域的实际问题强相关；第三，它很适合延展出“背景 + 观点 + 提醒”的内容结构。`;
  const opinion = style.opinionTemplate;
  const closing = interpolate(style.closingTemplate, {
    title: input.title,
    topicType: input.topicType,
    summary: input.summary,
    signature: style.signature
  });

  return makeParagraphs([
    opening,
    `先做一个总述：${input.summary}`,
    input.aggregationSummary,
    ...platformParagraphs,
    analysis,
    `个人观点：${opinion}`,
    closing
  ]);
}

function saveVersion(draft: DraftRecord, operatorName: string): void {
  const currentMax = db
    .prepare("SELECT MAX(versionNo) AS versionNo FROM draft_versions WHERE draftId = ?")
    .get(draft.id) as { versionNo: number | null };
  const versionNo = (currentMax?.versionNo || 0) + 1;

  db.prepare(`
    INSERT INTO draft_versions (
      id, draftId, versionNo, title, content, imagesJson, operatorName, createdAt
    ) VALUES (
      @id, @draftId, @versionNo, @title, @content, @imagesJson, @operatorName, @createdAt
    )
  `).run({
    id: createId("version"),
    draftId: draft.id,
    versionNo,
    title: draft.title,
    content: draft.content,
    imagesJson: toJson(draft.images),
    operatorName,
    createdAt: now()
  });
}

export async function generateDraft(payload: { hotspotId: string; styleId?: string }): Promise<DraftRecord> {
  const hotspot = getHotspotById(payload.hotspotId);
  if (!hotspot) {
    throw new Error("热点不存在");
  }

  const aggregation = getAggregationByHotspotId(payload.hotspotId) || (await aggregateHotspot(payload.hotspotId));
  const style = payload.styleId ? getStyleById(payload.styleId) || getDefaultStyle() : getDefaultStyle();
  const titleOptions = buildTitleOptions(hotspot.title, hotspot.topicType);
  const images = buildImages(hotspot.coverImage, aggregation.relatedImages);
  const content = buildContent(style, {
    title: hotspot.title,
    summary: hotspot.summary,
    topicType: hotspot.topicType,
    aggregationSummary: aggregation.summary,
    relatedSources: aggregation.relatedSources.map((item) => ({
      platform: item.platform,
      title: item.title,
      summary: item.summary
    }))
  });
  const generationConfig = getGenerationConfig();
  const originalityScore = generationConfig.autoEstimateOriginality ? estimateOriginality(content) : 0;
  const errorReport = generationConfig.autoDetectIssues
    ? detectIssues(content, getCrawlConfig().blockedWords)
    : [];

  const draft: DraftRecord = {
    id: createId("draft"),
    hotspotId: hotspot.id,
    styleId: style.id,
    title: titleOptions[0],
    summary: hotspot.summary,
    content,
    coverImage: hotspot.coverImage,
    images,
    titleOptions,
    status: "draft",
    originalityScore,
    errorReport,
    createdAt: now(),
    updatedAt: now()
  };

  db.prepare(`
    INSERT INTO drafts (
      id, hotspotId, styleId, title, summary, content, coverImage, imagesJson,
      titleOptionsJson, status, originalityScore, errorReportJson, createdAt, updatedAt
    ) VALUES (
      @id, @hotspotId, @styleId, @title, @summary, @content, @coverImage, @imagesJson,
      @titleOptionsJson, @status, @originalityScore, @errorReportJson, @createdAt, @updatedAt
    )
  `).run({
    ...draft,
    imagesJson: toJson(draft.images),
    titleOptionsJson: toJson(draft.titleOptions),
    errorReportJson: toJson(draft.errorReport)
  });

  saveVersion(draft, "system");
  return draft;
}

export function listDrafts(): DraftRecord[] {
  const rows = db.prepare("SELECT * FROM drafts ORDER BY updatedAt DESC").all() as Record<string, unknown>[];
  return rows.map(mapDraft);
}

export function getDraftById(id: string): DraftRecord | undefined {
  const row = db.prepare("SELECT * FROM drafts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? mapDraft(row) : undefined;
}

export function updateDraft(
  id: string,
  payload: Partial<Pick<DraftRecord, "title" | "summary" | "content" | "coverImage" | "images" | "status">>,
  operatorName = "admin"
): DraftRecord {
  const current = getDraftById(id);
  if (!current) {
    throw new Error("稿件不存在");
  }

  const next: DraftRecord = {
    ...current,
    ...payload,
    originalityScore: estimateOriginality(payload.content || current.content),
    errorReport: detectIssues(payload.content || current.content, getCrawlConfig().blockedWords),
    updatedAt: now()
  };

  db.prepare(`
    UPDATE drafts SET
      title = @title,
      summary = @summary,
      content = @content,
      coverImage = @coverImage,
      imagesJson = @imagesJson,
      status = @status,
      originalityScore = @originalityScore,
      errorReportJson = @errorReportJson,
      updatedAt = @updatedAt
    WHERE id = @id
  `).run({
    ...next,
    imagesJson: toJson(next.images),
    errorReportJson: toJson(next.errorReport)
  });

  saveVersion(next, operatorName);
  return next;
}

export function listDraftVersions(draftId: string): DraftVersionRecord[] {
  const rows = db
    .prepare("SELECT * FROM draft_versions WHERE draftId = ? ORDER BY versionNo DESC")
    .all(draftId) as Record<string, unknown>[];
  return rows.map(mapVersion);
}
