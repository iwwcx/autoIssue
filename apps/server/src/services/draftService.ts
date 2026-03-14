import { db } from "../config/database";
import { getRelevantImageCandidates } from "../shared/imageTheme";
import { parseJson, toJson } from "../shared/json";
import {
  createId,
  detectIssues,
  estimateOriginality,
  interpolate,
  makeParagraphs,
  pickDistinct
} from "../shared/text";
import { getCrawlConfig, getGenerationConfig } from "./settingsService";
import { aggregateHotspot, getAggregationByHotspotId, getHotspotById } from "./hotspotService";
import { getDefaultStyle, getStyleById } from "./styleService";
import type {
  DraftImageBlock,
  DraftLengthMode,
  DraftRecord,
  DraftStatus,
  DraftVersionRecord,
  StyleTemplate
} from "../types";

const now = () => new Date().toISOString();

const platformLabelMap: Record<string, string> = {
  douyin: "\u6296\u97f3",
  xiaohongshu: "\u5c0f\u7ea2\u4e66",
  weibo: "\u5fae\u535a",
  weixin: "\u5fae\u4fe1\u516c\u4f17\u53f7",
  baidu: "\u767e\u5ea6\u70ed\u641c",
  toutiao: "\u4eca\u65e5\u5934\u6761"
};

const imageCaptions = [
  "\u5c01\u9762\u914d\u56fe",
  "\u6838\u5fc3\u4fe1\u606f\u914d\u56fe",
  "\u884c\u4e1a\u5ef6\u4f38\u914d\u56fe",
  "\u89c2\u70b9\u8865\u5145\u914d\u56fe"
];

function normalizeLengthMode(lengthMode?: string): DraftLengthMode {
  if (lengthMode === "simple") {
    return "simple";
  }
  if (lengthMode === "detailed") {
    return "detailed";
  }
  return "medium";
}

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
    lengthMode: normalizeLengthMode(String(row.lengthMode || "medium")),
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

function platformLabel(platform: string): string {
  return platformLabelMap[platform] || platform;
}

function buildTitleOptions(title: string, topicType: string, lengthMode: DraftLengthMode): string[] {
  if (lengthMode === "simple") {
    return [
      `${title}，重点其实就这几点`,
      `${topicType}速看：${title}`,
      `${title}，一文看懂核心信息`,
      `${title}背后，到底发生了什么`
    ];
  }

  const common = [
    `${title}\uff0c\u4e3a\u4ec0\u4e48\u8fd9\u6b21\u4f1a\u6301\u7eed\u51b2\u4e0a\u70ed\u699c`,
    `${topicType}\u70ed\u70b9\u8ffd\u8e2a\uff1a${title}`,
    `\u591a\u5e73\u53f0\u90fd\u5728\u8ba8\u8bba ${title}\uff0c\u6700\u503c\u5f97\u770b\u7684\u662f\u4ec0\u4e48`,
    `${title}\u80cc\u540e\uff0c\u771f\u6b63\u8ba9\u4eba\u5173\u5fc3\u7684\u4e0d\u53ea\u662f\u70ed\u5ea6`,
    `\u4ece\u300c${title}\u300d\u51fa\u53d1\uff0c\u4e00\u7bc7\u770b\u61c2\u4e8b\u4ef6\u5168\u8c8c`
  ];

  if (lengthMode === "detailed") {
    return [
      `${title}\u6301\u7eed\u53d1\u9175\uff0c\u8fd9\u4ef6\u4e8b\u4e3a\u4ec0\u4e48\u503c\u5f97\u8be6\u7ec6\u804a\u4e00\u804a`,
      `${title}\u70ed\u5ea6\u8e7f\u9ad8\u4e4b\u540e\uff0c\u771f\u6b63\u7684\u91cd\u70b9\u5176\u5b9e\u5728\u8fd9\u91cc`,
      ...common.slice(0, 3)
    ].slice(0, 5);
  }

  return common;
}

function buildImages(input: {
  title: string;
  summary: string;
  topicType: string;
  coverImage?: string;
  hotspotMedia: string[];
  relatedImages: string[];
  lengthMode: DraftLengthMode;
}): DraftImageBlock[] {
  const limit = input.lengthMode === "simple" ? 2 : input.lengthMode === "detailed" ? 4 : 3;
  const urls = pickDistinct(
    [
      ...getRelevantImageCandidates(
        {
          title: input.title,
          summary: `${input.summary} ${input.topicType}`,
          topicType: input.topicType,
          coverImage: input.coverImage,
          media: [...input.hotspotMedia, ...input.relatedImages]
        },
        8
      ),
      ...input.relatedImages,
      ...input.hotspotMedia,
      input.coverImage
    ].filter(Boolean) as string[],
    (item) => item
  ).slice(0, limit);

  return urls.map((url, index) => ({
    type: index === 0 ? "cover" : "inline",
    url,
    caption: imageCaptions[index] || `\u914d\u56fe ${index + 1}`,
    position: index
  }));
}

function buildImageMarkdown(images: DraftImageBlock[], index: number): string {
  const image = images[index];
  if (!image) {
    return "";
  }
  return `![${image.caption}](${image.url})`;
}

function buildSourceSummary(relatedSources: Array<{ platform: string; title: string; summary: string }>, lengthMode: DraftLengthMode): string[] {
  const limit = lengthMode === "simple" ? 2 : lengthMode === "detailed" ? 5 : 3;
  return relatedSources.slice(0, limit).map((item) => {
    return `${platformLabel(item.platform)}\u7aef\u91cd\u70b9\u5728\u201c${item.title}\u201d\uff0c\u6838\u5fc3\u8ba8\u8bba\u96c6\u4e2d\u5728\uff1a${item.summary}`;
  });
}

function buildCoreFacts(coreFacts: string[], lengthMode: DraftLengthMode): string {
  const limit = lengthMode === "simple" ? 2 : lengthMode === "detailed" ? 5 : 3;
  return coreFacts
    .slice(0, limit)
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");
}

function buildContent(style: StyleTemplate, input: {
  title: string;
  summary: string;
  topicType: string;
  accountName: string;
  aggregationSummary: string;
  coreFacts: string[];
  relatedSources: Array<{
    platform: string;
    title: string;
    summary: string;
  }>;
  images: DraftImageBlock[];
  lengthMode: DraftLengthMode;
  referenceSummary?: string;
}): string {
  const opening = interpolate(style.openingTemplate, {
    title: input.title,
    topicType: input.topicType,
    summary: input.summary,
    signature: style.signature
  });

  const image1 = buildImageMarkdown(input.images, 0);
  const image2 = buildImageMarkdown(input.images, 1);
  const image3 = buildImageMarkdown(input.images, 2);
  const image4 = buildImageMarkdown(input.images, 3);
  const factList = buildCoreFacts(input.coreFacts, input.lengthMode);
  const sourceSummary = buildSourceSummary(input.relatedSources, input.lengthMode).join("\n");
  const referenceLead = input.referenceSummary
    ? `\u7ed3\u5408\u73b0\u6709\u8349\u7a3f\u91cc\u5df2\u7ecf\u63d0\u5230\u7684\u5173\u6ce8\u70b9\uff0c\u8fd9\u6b21\u91cd\u65b0\u751f\u6210\u4f1a\u66f4\u5f3a\u8c03\u201c${input.referenceSummary}\u201d\u8fd9\u6761\u4e3b\u7ebf\u3002`
    : "";

  if (input.lengthMode === "simple") {
    return makeParagraphs([
      opening,
      `${input.summary}${referenceLead}`,
      image1,
      `先看重点：\n${factList}`,
      `再看平台上的补充讨论：\n${sourceSummary}`,
      image2,
      `我的判断是：${style.opinionTemplate}`,
      interpolate(style.closingTemplate, {
        title: input.title,
        topicType: input.topicType,
        summary: input.summary,
        signature: style.signature
      })
    ]);
  }
  if (input.lengthMode === "detailed") {
    return makeParagraphs([
      opening,
      `\u8fd9\u6761\u70ed\u70b9\u4e4b\u6240\u4ee5\u80fd\u5728\u77ed\u65f6\u95f4\u5185\u88ab\u53cd\u590d\u8ba8\u8bba\uff0c\u5173\u952e\u4e0d\u53ea\u5728\u4e8e\u201c${input.title}\u201d\u8fd9\u4e2a\u6807\u9898\u8db3\u591f\u5438\u775b\uff0c\u66f4\u5728\u4e8e\u5b83\u8fde\u63a5\u5230\u4e86\u66f4\u591a\u771f\u5b9e\u95ee\u9898\u3002\u4ece\u8d26\u53f7\u4f20\u64ad\u8282\u594f\u5230\u8bc4\u8bba\u533a\u53cd\u9988\uff0c\u8fd9\u4e2a\u8bdd\u9898\u5df2\u7ecf\u4e0d\u662f\u5355\u70b9\u70ed\u641c\uff0c\u800c\u662f\u5177\u6709\u6301\u7eed\u53d1\u9175\u80fd\u529b\u7684\u7efc\u5408\u70ed\u70b9\u3002`,
      referenceLead,
      image1,
      `\u4e00\u3001\u5148\u628a\u4e8b\u4ef6\u8bb2\u6e05\u695a\n${input.summary}\n\u5355\u770b\u8868\u9762\u4fe1\u606f\uff0c\u5b83\u50cf\u662f\u4e00\u6761\u70ed\u5ea6\u8d70\u9ad8\u7684\u65b0\u95fb\uff1b\u4f46\u7ed3\u5408\u5f53\u524d\u5e73\u53f0\u53cd\u9988\u53bb\u770b\uff0c\u5927\u5bb6\u771f\u6b63\u60f3\u641e\u660e\u767d\u7684\uff0c\u5176\u5b9e\u662f\u8fd9\u4ef6\u4e8b\u672a\u6765\u8fd8\u4f1a\u5f80\u54ea\u91cc\u8d70\u3002`,
      `\u4e8c\u3001\u628a\u591a\u5e73\u53f0\u4fe1\u606f\u62fc\u5728\u4e00\u8d77\u770b\n${input.aggregationSummary}\n\u8fd9\u4e00\u6b65\u6700\u91cd\u8981\u7684\u610f\u4e49\uff0c\u662f\u907f\u514d\u53ea\u770b\u5355\u4e00\u5e73\u53f0\u7684\u7247\u6bb5\u4fe1\u606f\u3002\u6709\u7684\u5e73\u53f0\u66f4\u504f\u5411\u8bdd\u9898\u70ed\u5ea6\uff0c\u6709\u7684\u5e73\u53f0\u66f4\u504f\u5411\u7528\u6237\u60c5\u7eea\uff0c\u8fd8\u6709\u7684\u5e73\u53f0\u4f1a\u8865\u5145\u884c\u4e1a\u89c6\u89d2\u3002`,
      image2,
      `\u4e09\u3001\u76ee\u524d\u6700\u503c\u5f97\u5173\u6ce8\u7684\u51e0\u4e2a\u91cd\u70b9\n${factList}\n\u8fd9\u4e9b\u91cd\u70b9\u62c6\u5f00\u540e\u53ef\u4ee5\u53d1\u73b0\uff0c\u8ba8\u8bba\u91cd\u5fc3\u5df2\u7ecf\u4ece\u201c\u53d1\u751f\u4e86\u4ec0\u4e48\u201d\uff0c\u5ef6\u4f38\u5230\u201c\u4e3a\u4ec0\u4e48\u4f1a\u53d1\u751f\u201d\u3001\u201c\u4f1a\u5f71\u54cd\u8c01\u201d\u4ee5\u53ca\u201c\u540e\u7eed\u600e\u4e48\u770b\u201d\u3002`,
      `\u56db\u3001\u4e0d\u540c\u5e73\u53f0\u5230\u5e95\u5728\u8c08\u4ec0\u4e48\n${sourceSummary}\n\u628a\u8fd9\u4e9b\u58f0\u97f3\u653e\u5728\u4e00\u8d77\u770b\uff0c\u5f88\u5bb9\u6613\u53d1\u73b0\uff0c\u5e73\u53f0\u867d\u7136\u8868\u8fbe\u65b9\u5f0f\u4e0d\u540c\uff0c\u4f46\u5173\u6ce8\u7684\u57fa\u672c\u90fd\u662f\u4e00\u4ef6\u4e8b\uff1a\u8fd9\u80a1\u53d8\u5316\u4f1a\u4e0d\u4f1a\u771f\u7684\u6539\u53d8\u81ea\u5df1\u3002`,
      image3,
      `\u4e94\u3001\u5bf9\u666e\u901a\u4eba\u548c\u4ece\u4e1a\u8005\u5206\u522b\u610f\u5473\u7740\u4ec0\u4e48\n\u5982\u679c\u4f60\u662f\u666e\u901a\u7528\u6237\uff0c\u8fd9\u6761\u70ed\u70b9\u503c\u5f97\u770b\u7684\u5730\u65b9\u5728\u4e8e\uff0c\u5b83\u53ef\u80fd\u4f1a\u5f71\u54cd\u4f60\u65e5\u5e38\u83b7\u53d6\u4fe1\u606f\u3001\u505a\u9009\u62e9\u6216\u8005\u82b1\u94b1\u7684\u65b9\u5f0f\uff1b\u5982\u679c\u4f60\u662f${input.topicType}\u76f8\u5173\u4ece\u4e1a\u8005\uff0c\u5b83\u66f4\u50cf\u4e00\u4e2a\u63d0\u9192\uff0c\u63d0\u9192\u5927\u5bb6\u65b0\u7684\u7ade\u4e89\u8981\u7d20\u6b63\u5728\u6210\u578b\u3002`,
      image4,
      `\u516d\u3001\u6211\u7684\u5224\u65ad\n${style.opinionTemplate}\n\u6211\u66f4\u503e\u5411\u4e8e\u8ba4\u4e3a\uff0c\u8fd9\u6761\u70ed\u70b9\u4e0d\u4f1a\u53ea\u505c\u5728\u4e00\u6b21\u70ed\u699c\u66dd\u5149\u3002\u53ea\u8981\u76f8\u5173\u8bdd\u9898\u8fd8\u80fd\u7ee7\u7eed\u548c\u73b0\u5b9e\u95ee\u9898\u53d1\u751f\u8fde\u63a5\uff0c\u5b83\u5c31\u4ecd\u7136\u4f1a\u88ab\u53cd\u590d\u62ff\u51fa\u6765\u8ba8\u8bba\u3002`,
      interpolate(style.closingTemplate, {
        title: input.title,
        topicType: input.topicType,
        summary: input.summary,
        signature: style.signature
      })
    ]);
  }

  return makeParagraphs([
    opening,
    `\u8fd9\u6761\u70ed\u70b9\u4e4b\u6240\u4ee5\u4f1a\u5feb\u901f\u51b2\u9ad8\uff0c\u4e0d\u53ea\u662f\u6807\u9898\u5438\u775b\uff0c\u66f4\u662f\u56e0\u4e3a\u5b83\u51fb\u4e2d\u4e86\u5f53\u4e0b\u7528\u6237\u6700\u5728\u610f\u7684\u90a3\u4e9b\u60c5\u7eea\u548c\u95ee\u9898\u3002${referenceLead}`,
    image1,
    `\u4e00\u3001\u8fd9\u4ef6\u4e8b\u4e3a\u4ec0\u4e48\u80fd\u5237\u5c4f\n${input.summary}\n\u4ece\u4f20\u64ad\u89d2\u5ea6\u770b\uff0c\u5b83\u65e2\u6709\u8bdd\u9898\u5ea6\uff0c\u4e5f\u6709\u5f88\u5f3a\u7684\u73b0\u5b9e\u8fde\u63a5\u70b9\u3002`,
    `\u4e8c\u3001\u591a\u5e73\u53f0\u62fc\u5728\u4e00\u8d77\u540e\uff0c\u771f\u6b63\u91cd\u70b9\u662f\u4ec0\u4e48\n${factList}\n\u8fd9\u4e9b\u4fe1\u606f\u653e\u5728\u4e00\u8d77\u770b\uff0c\u57fa\u672c\u80fd\u770b\u51fa\u8fd9\u6761\u70ed\u70b9\u4e0d\u4f1a\u53ea\u505c\u7559\u5728\u8868\u9762\u8ba8\u8bba\u3002`,
    image2,
    `\u4e09\u3001\u8fd9\u4ef6\u4e8b\u5bf9\u8c01\u6700\u6709\u5f71\u54cd\n${sourceSummary}\n\u4e0d\u540c\u5e73\u53f0\u7684\u89c6\u89d2\u5408\u5728\u4e00\u8d77\uff0c\u521a\u597d\u80fd\u628a\u201c\u70ed\u5ea6\u201d\u548c\u201c\u4ef7\u503c\u201d\u5206\u5f00\u6765\u770b\u3002`,
    image3,
    `\u56db\u3001\u6211\u7684\u89c2\u70b9\n${style.opinionTemplate}\n\u5bf9\u81ea\u5a92\u4f53\u6765\u8bf4\uff0c\u8fd9\u7c7b\u70ed\u70b9\u6700\u9002\u5408\u7684\u5199\u6cd5\u4e0d\u662f\u53ea\u590d\u8ff0\u4e8b\u4ef6\uff0c\u800c\u662f\u628a\u5176\u80cc\u540e\u7684\u771f\u5b9e\u95ee\u9898\u8bb2\u6e05\u695a\u3002`,
    interpolate(style.closingTemplate, {
      title: input.title,
      topicType: input.topicType,
      summary: input.summary,
      signature: style.signature
    })
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

function createDraftPayload(input: {
  hotspotId: string;
  styleId?: string;
  lengthMode?: string;
  referenceSummary?: string;
  currentStatus?: DraftStatus;
}) {
  const hotspot = getHotspotById(input.hotspotId);
  if (!hotspot) {
    throw new Error("\u70ed\u70b9\u4e0d\u5b58\u5728");
  }

  const aggregation = getAggregationByHotspotId(input.hotspotId);
  return Promise.resolve(aggregation || aggregateHotspot(input.hotspotId)).then((resolvedAggregation) => {
    const style = input.styleId ? getStyleById(input.styleId) || getDefaultStyle() : getDefaultStyle();
    const lengthMode = normalizeLengthMode(input.lengthMode || getGenerationConfig().defaultLengthMode);
    const titleOptions = buildTitleOptions(hotspot.title, hotspot.topicType, lengthMode);
    const summaryBase = input.referenceSummary || hotspot.summary;
    const summary =
      lengthMode === "detailed"
        ? `${summaryBase} \u7ed3\u5408\u5df2\u542f\u7528\u5e73\u53f0\u7684\u8865\u5145\u4fe1\u606f\u6765\u770b\uff0c\u8fd9\u6761\u70ed\u70b9\u5df2\u7ecf\u4ece\u5355\u4e00\u4e8b\u4ef6\u5ef6\u4f38\u5230\u66f4\u5e7f\u7684\u884c\u4e1a\u3001\u7528\u6237\u548c\u4f20\u64ad\u5f71\u54cd\u3002`
        : `${summaryBase} \u7efc\u5408\u76f8\u5173\u5e73\u53f0\u4fe1\u606f\u540e\uff0c\u8fd9\u6761\u8bdd\u9898\u7684\u5173\u6ce8\u70b9\u4e0d\u53ea\u5728\u70ed\u5ea6\uff0c\u8fd8\u5728\u5b83\u53ef\u80fd\u5e26\u6765\u7684\u5b9e\u9645\u53d8\u5316\u3002`;
    const images = buildImages({
      title: hotspot.title,
      summary,
      topicType: hotspot.topicType,
      coverImage: hotspot.coverImage,
      hotspotMedia: hotspot.media,
      relatedImages: resolvedAggregation.relatedImages,
      lengthMode
    });
    const content = buildContent(style, {
      title: hotspot.title,
      summary,
      topicType: hotspot.topicType,
      accountName: hotspot.accountName,
      aggregationSummary: resolvedAggregation.summary,
      coreFacts: resolvedAggregation.coreFacts,
      relatedSources: resolvedAggregation.relatedSources.map((item) => ({
        platform: item.platform,
        title: item.title,
        summary: item.summary
      })),
      images,
      lengthMode,
      referenceSummary: input.referenceSummary
    });

    return {
      hotspot,
      style,
      lengthMode,
      titleOptions,
      images,
      summary,
      content,
      status: input.currentStatus || "draft"
    };
  });
}

export async function generateDraft(payload: { hotspotId: string; styleId?: string; lengthMode?: string }): Promise<DraftRecord> {
  const generated = await createDraftPayload(payload);
  const generationConfig = getGenerationConfig();
  const originalityScore = generationConfig.autoEstimateOriginality ? estimateOriginality(generated.content) : 0;
  const errorReport = generationConfig.autoDetectIssues
    ? detectIssues(generated.content, getCrawlConfig().blockedWords)
    : [];

  const draft: DraftRecord = {
    id: createId("draft"),
    hotspotId: payload.hotspotId,
    styleId: generated.style.id,
    title: generated.titleOptions[0],
    summary: generated.summary,
    content: generated.content,
    coverImage: generated.images[0]?.url || generated.hotspot.coverImage,
    images: generated.images,
    titleOptions: generated.titleOptions,
    lengthMode: generated.lengthMode,
    status: "draft",
    originalityScore,
    errorReport,
    createdAt: now(),
    updatedAt: now()
  };

  db.prepare(`
    INSERT INTO drafts (
      id, hotspotId, styleId, title, summary, content, coverImage, imagesJson,
      titleOptionsJson, lengthMode, status, originalityScore, errorReportJson, createdAt, updatedAt
    ) VALUES (
      @id, @hotspotId, @styleId, @title, @summary, @content, @coverImage, @imagesJson,
      @titleOptionsJson, @lengthMode, @status, @originalityScore, @errorReportJson, @createdAt, @updatedAt
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

export async function regenerateDraft(
  id: string,
  payload: { styleId?: string; lengthMode?: string } = {}
): Promise<DraftRecord> {
  const current = getDraftById(id);
  if (!current) {
    throw new Error("\u7a3f\u4ef6\u4e0d\u5b58\u5728");
  }

  const referenceText = [current.summary, String(current.content || "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ")]
    .filter(Boolean)
    .join(" ");

  const generated = await createDraftPayload({
    hotspotId: current.hotspotId,
    styleId: payload.styleId || current.styleId,
    lengthMode: payload.lengthMode || current.lengthMode,
    referenceSummary: referenceText,
    currentStatus: current.status
  });

  const titleSeed = listDraftVersions(current.id).length;
  return updateDraft(
    id,
    {
      styleId: generated.style.id,
      title: generated.titleOptions[titleSeed % generated.titleOptions.length],
      summary: generated.summary,
      content: generated.content,
      coverImage: generated.images[0]?.url || generated.hotspot.coverImage,
      images: generated.images,
      titleOptions: generated.titleOptions,
      lengthMode: generated.lengthMode,
      status: current.status
    },
    "system-regenerate"
  );
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
  payload: Partial<Pick<DraftRecord, "title" | "summary" | "content" | "coverImage" | "images" | "status" | "styleId" | "titleOptions" | "lengthMode">>,
  operatorName = "admin"
): DraftRecord {
  const current = getDraftById(id);
  if (!current) {
    throw new Error("\u7a3f\u4ef6\u4e0d\u5b58\u5728");
  }

  const next: DraftRecord = {
    ...current,
    ...payload,
    originalityScore: estimateOriginality(payload.content || current.content),
    errorReport: detectIssues(payload.content || current.content, getCrawlConfig().blockedWords),
    updatedAt: now(),
    lengthMode: normalizeLengthMode(payload.lengthMode || current.lengthMode)
  };

  db.prepare(`
    UPDATE drafts SET
      styleId = @styleId,
      title = @title,
      summary = @summary,
      content = @content,
      coverImage = @coverImage,
      imagesJson = @imagesJson,
      titleOptionsJson = @titleOptionsJson,
      lengthMode = @lengthMode,
      status = @status,
      originalityScore = @originalityScore,
      errorReportJson = @errorReportJson,
      updatedAt = @updatedAt
    WHERE id = @id
  `).run({
    ...next,
    imagesJson: toJson(next.images),
    titleOptionsJson: toJson(next.titleOptions),
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

export function deleteDraft(id: string): void {
  db.prepare("DELETE FROM draft_versions WHERE draftId = ?").run(id);
  db.prepare("DELETE FROM drafts WHERE id = ?").run(id);
}

export function deleteDrafts(ids: string[]): number {
  const removeVersionStmt = db.prepare("DELETE FROM draft_versions WHERE draftId = ?");
  const removeDraftStmt = db.prepare("DELETE FROM drafts WHERE id = ?");
  const transaction = db.transaction((draftIds: string[]) => {
    let count = 0;
    draftIds.forEach((id) => {
      removeVersionStmt.run(id);
      const result = removeDraftStmt.run(id);
      count += Number(result.changes || 0);
    });
    return count;
  });
  return transaction(ids);
}



