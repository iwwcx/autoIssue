export type SourcePlatform =
  | "douyin"
  | "xiaohongshu"
  | "weibo"
  | "weixin"
  | "baidu"
  | "toutiao"
  | "netease"
  | "google_news"
  | "gnews"
  | "newsapi"
  | "juhe_news"
  | "alapi_toutiao"
  | "newsdata"
  | "the_news_api"
  | "sixty_seconds";

export type PublishPlatform =
  | "netease"
  | "sohu"
  | "xiaohongshu"
  | "sina"
  | "weixin"
  | "baijiahao"
  | "pengpai";

export type PlatformCode = SourcePlatform | PublishPlatform;

export type HotspotStatus = "pending" | "processed" | "ignored";
export type DraftStatus = "draft" | "ready" | "published";
export type DraftLengthMode = "simple" | "medium" | "detailed";
export type DraftGenerationSource = "qwen" | "template_fallback";
export type PublishStatus = "pending" | "running" | "success" | "failed";
export type AccountStatus = "normal" | "abnormal" | "unchecked";

export interface CrawlConfig {
  autoCrawl: boolean;
  frequencyMinutes: number;
  enabledPlatforms: SourcePlatform[];
  keywords: string[];
  blockedWords: string[];
  blockedAccounts: string[];
  withinHours: number;
  maxPerPlatform: number;
}

export interface GenerationConfig {
  defaultStyleId?: string;
  defaultLengthMode?: DraftLengthMode;
  autoDetectIssues: boolean;
  autoEstimateOriginality: boolean;
}

export interface HotspotInput {
  platform: SourcePlatform;
  topicType: string;
  title: string;
  content: string;
  summary: string;
  publishTime: string;
  accountName: string;
  accountId?: string;
  coverImage?: string;
  media: string[];
  tags: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  raw?: Record<string, unknown>;
}

export interface HotspotRecord extends HotspotInput {
  id: string;
  fingerprint: string;
  captureTime: string;
  heatScore: number;
  qualityScore: number;
  status: HotspotStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AggregationRecord {
  id: string;
  hotspotId: string;
  searchKeyword: string;
  summary: string;
  coreFacts: string[];
  relatedImages: string[];
  relatedSources: Array<{
    platform: SourcePlatform;
    title: string;
    summary: string;
    accountName: string;
    publishTime: string;
    tags: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  toneWords: string[];
  openingTemplate: string;
  structureTemplate: string;
  closingTemplate: string;
  opinionTemplate: string;
  signature: string;
  sceneTags: string[];
  isDefault: number;
  createdAt: string;
  updatedAt: string;
}

export interface DraftImageBlock {
  type: "cover" | "inline";
  url: string;
  caption: string;
  position: number;
}

export interface DraftRecord {
  id: string;
  hotspotId: string;
  styleId: string;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  images: DraftImageBlock[];
  titleOptions: string[];
  lengthMode: DraftLengthMode;
  generationSource: DraftGenerationSource;
  status: DraftStatus;
  originalityScore: number;
  errorReport: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DraftVersionRecord {
  id: string;
  draftId: string;
  versionNo: number;
  title: string;
  content: string;
  images: DraftImageBlock[];
  operatorName: string;
  createdAt: string;
}

export interface PublishAccountRecord {
  id: string;
  platform: PublishPlatform;
  accountName: string;
  accountAlias: string;
  encryptedCredential: string;
  credentialPreview: string;
  status: AccountStatus;
  lastCheckAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishTargetRecord {
  id: string;
  jobId: string;
  platform: PublishPlatform;
  accountId: string;
  status: PublishStatus;
  resultMessage?: string;
  externalPostId?: string;
  publishedAt?: string;
  readCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  raw?: Record<string, unknown>;
}

export interface PublishJobRecord {
  id: string;
  draftId: string;
  mode: "immediate" | "scheduled";
  scheduledAt: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}







