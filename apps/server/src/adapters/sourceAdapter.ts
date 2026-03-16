import { env } from "../config/env";
import { mockPlatformData } from "../data/mockPlatformData";
import { containsKeyword, normalizeKeywordText, pickDistinct } from "../shared/text";
import type { HotspotInput, SourcePlatform } from "../types";

export interface SourceAdapter {
  platform: SourcePlatform;
  fetchTrending(params: {
    keywords: string[];
    blockedAccounts: string[];
    blockedWords: string[];
    withinHours: number;
    limit: number;
    seed?: number;
  }): Promise<HotspotInput[]>;
  searchRelated(keyword: string, limit?: number): Promise<HotspotInput[]>;
}

interface RealNewsItem {
  title: string;
  summary: string;
  content: string;
  publishTime: string;
  accountName: string;
  accountId?: string;
  coverImage?: string;
  url?: string;
  tags: string[];
  raw?: Record<string, unknown>;
}

function hashText(input: string): number {
  return input.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function shuffleWithSeed<T>(list: T[], seed: number, getKey: (item: T) => string): T[] {
  return [...list].sort((left, right) => {
    const leftValue = (hashText(getKey(left)) + seed) % 997;
    const rightValue = (hashText(getKey(right)) + seed) % 997;
    return leftValue - rightValue;
  });
}

function decodeHtmlEntities(input: string): string {
  let output = input;
  const namedEntities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&ldquo;": "“",
    "&rdquo;": "”",
    "&lsquo;": "‘",
    "&rsquo;": "’",
    "&mdash;": "-",
    "&hellip;": "..."
  };

  for (let index = 0; index < 3; index += 1) {
    const previous = output;
    Object.entries(namedEntities).forEach(([entity, value]) => {
      output = output.replaceAll(entity, value);
    });
    output = output.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
    output = output.replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
    if (output === previous) {
      break;
    }
  }

  return output;
}

function stripHtml(input: string): string {
  const decoded = decodeHtmlEntities(input || "");
  return decoded
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(?:href|target|style|class|id|rel|src|color)\s*=\s*["'][^"']*["']/gi, " ")
    .replace(/&[a-zA-Z0-9#]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeDate(input?: string): string {
  const date = input ? new Date(input) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toNumberFromText(input: string, seed = 0): number {
  const normalized = normalizeKeywordText(input);
  const base = normalized.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) + seed;
  return Math.max(80, (base % 8000) + 500);
}

function classifyTopicType(text: string): string {
  const normalized = normalizeKeywordText(text);
  const categoryMap: Array<{ label: string; words: string[] }> = [
    { label: "AI", words: ["ai", "大模型", "人工智能", "模型", "智能体", "chatgpt"] },
    { label: "科技", words: ["科技", "芯片", "手机", "互联网", "软件", "硬件", "数码"] },
    { label: "财经", words: ["财经", "金融", "股市", "融资", "基金", "投资", "经济"] },
    { label: "教育", words: ["教育", "高校", "学生", "考试", "校园", "培训"] },
    { label: "健康", words: ["健康", "医疗", "医院", "药", "疾病", "养生"] },
    { label: "汽车", words: ["汽车", "车企", "新能源车", "智驾", "电动车"] },
    { label: "房产", words: ["房产", "楼市", "住房", "地产", "租房"] },
    { label: "文旅", words: ["旅游", "酒店", "景区", "出行", "演出", "文旅"] },
    { label: "游戏", words: ["游戏", "电竞", "网游", "主机", "steam"] },
    { label: "娱乐", words: ["娱乐", "明星", "综艺", "电影", "电视剧", "演唱会"] },
    { label: "体育", words: ["体育", "足球", "篮球", "比赛", "联赛", "奥运"] },
    { label: "社会", words: ["社会", "热点", "警方", "通报", "事件"] },
    { label: "国际", words: ["国际", "全球", "海外", "美国", "欧洲", "日韩"] },
    { label: "民生", words: ["民生", "就业", "消费", "物价", "通勤", "生活"] }
  ];

  const matched = categoryMap.find((item) => item.words.some((word) => normalized.includes(normalizeKeywordText(word))));
  return matched?.label || "社会";
}

function buildQuery(keywords: string[]): string {
  const cleaned = keywords.map((item) => item.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(" ") : "中国 热点新闻";
}

function buildTags(text: string, keywords: string[], accountName: string): string[] {
  const baseTags = keywords.map((item) => item.trim()).filter(Boolean);
  const category = classifyTopicType(text);
  return pickDistinct([category, accountName, ...baseTags].filter(Boolean), (item) => item).slice(0, 6);
}

function toHotspotInput(platform: SourcePlatform, item: RealNewsItem): HotspotInput {
  const text = `${item.title} ${item.summary} ${item.content} ${item.tags.join(" ")}`;
  return {
    platform,
    topicType: classifyTopicType(text),
    title: item.title,
    content: item.content || item.summary || item.title,
    summary: item.summary || item.content || item.title,
    publishTime: safeDate(item.publishTime),
    accountName: item.accountName || "实时新闻源",
    accountId: item.accountId,
    coverImage: item.coverImage,
    media: item.coverImage ? [item.coverImage] : [],
    tags: item.tags,
    likeCount: toNumberFromText(text, 17),
    commentCount: toNumberFromText(text, 37),
    shareCount: toNumberFromText(text, 53),
    raw: item.raw || {}
  };
}

async function requestJson(url: string, headers?: Record<string, string>): Promise<any> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "media-news-automation/1.0",
      ...(headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`实时源请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function requestText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      "User-Agent": "media-news-automation/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`RSS 请求失败: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function normalizeArray(payload: any, paths: string[]): any[] {
  for (const path of paths) {
    const value = path.split(".").reduce<any>((result, key) => (result == null ? undefined : result[key]), payload);
    if (Array.isArray(value)) {
      return value;
    }
  }
  return Array.isArray(payload) ? payload : [];
}

function parseRssItems(xml: string, providerName: string, keywords: string[]): RealNewsItem[] {
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g));
  return items.map((matched) => {
    const block = matched[1];
    const title = stripHtml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || providerName).replace(/\s+-\s+[^-]+$/, "");
    const link = stripHtml(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
    const description = stripHtml(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "");
    const publishTime = stripHtml(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || new Date().toUTCString());
    const source = stripHtml(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || providerName);
    const fullText = `${title} ${description}`;
    return {
      title,
      summary: description || title,
      content: description || title,
      publishTime,
      accountName: source,
      accountId: link || undefined,
      coverImage: undefined,
      url: link,
      tags: buildTags(fullText, keywords, source),
      raw: { link, source, provider: providerName }
    };
  });
}

function resolveJuheType(keywords: string[]): string {
  const text = normalizeKeywordText(keywords.join(" "));
  const mapping: Array<{ type: string; words: string[] }> = [
    { type: "keji", words: ["ai", "科技", "芯片", "手机", "互联网", "数码"] },
    { type: "caijing", words: ["财经", "金融", "股市", "经济", "投资"] },
    { type: "yule", words: ["娱乐", "明星", "综艺", "电影", "电视剧"] },
    { type: "tiyu", words: ["体育", "足球", "篮球", "比赛"] },
    { type: "guoji", words: ["国际", "海外", "全球", "美国"] },
    { type: "guonei", words: ["国内", "民生", "社会", "教育", "健康"] },
    { type: "qiche", words: ["汽车", "新能源车", "智驾"] },
    { type: "youxi", words: ["游戏", "电竞"] }
  ];
  return mapping.find((item) => item.words.some((word) => text.includes(normalizeKeywordText(word))))?.type || "top";
}

function resolveAlapiType(keywords: string[]): string {
  const text = normalizeKeywordText(keywords.join(" "));
  const mapping: Array<{ type: string; words: string[] }> = [
    { type: "keji", words: ["ai", "科技", "芯片", "手机", "互联网"] },
    { type: "caijing", words: ["财经", "金融", "经济", "投资"] },
    { type: "yule", words: ["娱乐", "明星", "综艺", "电影"] },
    { type: "tiyu", words: ["体育", "足球", "篮球"] },
    { type: "guoji", words: ["国际", "海外", "全球"] },
    { type: "guonei", words: ["社会", "民生", "教育", "健康"] }
  ];
  return mapping.find((item) => item.words.some((word) => text.includes(normalizeKeywordText(word))))?.type || "top";
}

async function fetchGoogleNewsRss(keywords: string[], limit: number): Promise<RealNewsItem[]> {
  const query = buildQuery(keywords);
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(env.googleNewsLanguage)}&gl=${encodeURIComponent(env.googleNewsRegion)}&ceid=${encodeURIComponent(env.googleNewsCeid)}`;
  const xml = await requestText(url);
  return parseRssItems(xml, "Google News", keywords).slice(0, limit);
}

async function fetchNeteaseRss(keywords: string[], limit: number): Promise<RealNewsItem[]> {
  const xml = await requestText("https://news.163.com/special/00011K6L/rss_newstop.xml");
  return parseRssItems(xml, "网易新闻", keywords).slice(0, limit);
}

async function fetchFromGNews(keywords: string[], limit: number): Promise<RealNewsItem[]> {
  if (!env.gnewsApiKey) {
    throw new Error("gnews 源未配置 GNEWS_API_KEY");
  }

  const query = buildQuery(keywords);
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=zh&country=cn&max=${Math.min(limit, 10)}&apikey=${encodeURIComponent(env.gnewsApiKey)}`;
  const data = await requestJson(url);
  return normalizeArray(data, ["articles"]).map((item: any) => {
    const sourceName = String(item?.source?.name || "GNews");
    const title = String(item?.title || "实时新闻");
    const description = String(item?.description || "");
    const content = stripHtml(String(item?.content || description || title));
    return {
      title,
      summary: description || content || title,
      content,
      publishTime: String(item?.publishedAt || new Date().toISOString()),
      accountName: sourceName,
      accountId: item?.url ? String(item.url) : undefined,
      coverImage: item?.image ? String(item.image) : undefined,
      url: item?.url ? String(item.url) : undefined,
      tags: buildTags(`${title} ${description} ${content}`, keywords, sourceName),
      raw: { ...item, provider: "GNews" }
    };
  });
}

async function fetchFromNewsApi(keywords: string[], limit: number): Promise<RealNewsItem[]> {
  if (!env.newsApiKey) {
    throw new Error("newsapi 源未配置 NEWSAPI_KEY");
  }

  const query = buildQuery(keywords);
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=zh&pageSize=${Math.min(limit, 20)}&sortBy=publishedAt&apiKey=${encodeURIComponent(env.newsApiKey)}`;
  const data = await requestJson(url);
  return normalizeArray(data, ["articles"]).map((item: any) => {
    const sourceName = String(item?.source?.name || "NewsAPI");
    const title = String(item?.title || "实时新闻");
    const description = String(item?.description || "");
    const content = stripHtml(String(item?.content || description || title));
    return {
      title,
      summary: description || content || title,
      content,
      publishTime: String(item?.publishedAt || new Date().toISOString()),
      accountName: sourceName,
      accountId: item?.url ? String(item.url) : undefined,
      coverImage: item?.urlToImage ? String(item.urlToImage) : undefined,
      url: item?.url ? String(item.url) : undefined,
      tags: buildTags(`${title} ${description} ${content}`, keywords, sourceName),
      raw: { ...item, provider: "NewsAPI" }
    };
  });
}

async function fetchFromJuhe(keywords: string[], limit: number): Promise<RealNewsItem[]> {
  if (!env.juheApiKey) {
    throw new Error("聚合数据源未配置 JUHE_API_KEY");
  }

  const url = new URL(env.juheNewsApiUrl);
  url.searchParams.set("key", env.juheApiKey);
  url.searchParams.set("type", resolveJuheType(keywords));
  const data = await requestJson(url.toString());
  const items = normalizeArray(data, ["result.data", "data"]);
  return items.slice(0, limit).map((item: any) => {
    const title = String(item?.title || "聚合新闻");
    const sourceName = String(item?.author_name || item?.author || item?.category || "聚合数据");
    const summary = stripHtml(String(item?.summary || item?.title || ""));
    const coverImage = item?.thumbnail_pic_s || item?.thumbnail_pic_s02 || item?.thumbnail_pic_s03;
    return {
      title,
      summary: summary || title,
      content: summary || title,
      publishTime: String(item?.date || new Date().toISOString()),
      accountName: sourceName,
      accountId: item?.uniquekey ? String(item.uniquekey) : item?.url ? String(item.url) : undefined,
      coverImage: coverImage ? String(coverImage) : undefined,
      url: item?.url ? String(item.url) : undefined,
      tags: buildTags(`${title} ${item?.category || ""}`, keywords, sourceName),
      raw: { ...item, provider: "聚合数据" }
    };
  });
}

async function fetchFromAlapi(keywords: string[], limit: number): Promise<RealNewsItem[]> {
  if (!env.alapiToken) {
    throw new Error("ALAPI 源未配置 ALAPI_TOKEN");
  }

  const url = new URL(env.alapiToutiaoUrl);
  url.searchParams.set("token", env.alapiToken);
  url.searchParams.set("type", resolveAlapiType(keywords));
  const data = await requestJson(url.toString());
  const items = normalizeArray(data, ["data", "data.data", "data.list", "list"]);
  return items.slice(0, limit).map((item: any) => {
    const title = String(item?.title || "ALAPI 头条");
    const sourceName = String(item?.source || item?.author || item?.author_name || "ALAPI");
    const summary = stripHtml(String(item?.digest || item?.summary || item?.description || title));
    const coverImage = item?.thumbnail_pic_s || item?.cover || item?.image;
    return {
      title,
      summary,
      content: summary,
      publishTime: String(item?.ptime || item?.time || item?.date || new Date().toISOString()),
      accountName: sourceName,
      accountId: item?.docid ? String(item.docid) : item?.url ? String(item.url) : undefined,
      coverImage: coverImage ? String(coverImage) : undefined,
      url: item?.url ? String(item.url) : undefined,
      tags: buildTags(`${title} ${summary}`, keywords, sourceName),
      raw: { ...item, provider: "ALAPI" }
    };
  });
}

async function fetchFromNewsData(keywords: string[], limit: number): Promise<RealNewsItem[]> {
  if (!env.newsDataApiKey) {
    throw new Error("NewsData 源未配置 NEWSDATA_API_KEY");
  }

  const url = new URL(env.newsDataApiUrl);
  url.searchParams.set("apikey", env.newsDataApiKey);
  url.searchParams.set("language", "zh");
  url.searchParams.set("country", "cn");
  url.searchParams.set("size", String(Math.min(limit, 10)));
  if (keywords.length) {
    url.searchParams.set("q", buildQuery(keywords));
  }
  const data = await requestJson(url.toString());
  return normalizeArray(data, ["results"]).slice(0, limit).map((item: any) => {
    const sourceName = String(item?.source_name || item?.source_id || "NewsData");
    const title = String(item?.title || "NewsData 新闻");
    const description = String(item?.description || item?.content || "");
    return {
      title,
      summary: description || title,
      content: stripHtml(String(item?.content || description || title)),
      publishTime: String(item?.pubDate || item?.published_at || new Date().toISOString()),
      accountName: sourceName,
      accountId: item?.article_id ? String(item.article_id) : item?.link ? String(item.link) : undefined,
      coverImage: item?.image_url ? String(item.image_url) : undefined,
      url: item?.link ? String(item.link) : undefined,
      tags: buildTags(`${title} ${(item?.category || []).join(" ")} ${description}`, keywords, sourceName),
      raw: { ...item, provider: "NewsData.io" }
    };
  });
}

async function fetchFromTheNewsApi(keywords: string[], limit: number): Promise<RealNewsItem[]> {
  if (!env.theNewsApiToken) {
    throw new Error("TheNewsAPI 源未配置 THE_NEWS_API_TOKEN");
  }

  const url = new URL(env.theNewsApiUrl);
  url.searchParams.set("api_token", env.theNewsApiToken);
  url.searchParams.set("locale", "cn");
  url.searchParams.set("language", "zh");
  url.searchParams.set("limit", String(Math.min(limit, 10)));
  if (keywords.length) {
    url.searchParams.set("search", buildQuery(keywords));
  }
  const data = await requestJson(url.toString());
  return normalizeArray(data, ["data"]).slice(0, limit).map((item: any) => {
    const sourceName = String(item?.source || item?.source_name || "TheNewsAPI");
    const title = String(item?.title || "TheNewsAPI 新闻");
    const description = String(item?.description || item?.snippet || "");
    return {
      title,
      summary: description || title,
      content: stripHtml(String(item?.snippet || item?.description || title)),
      publishTime: String(item?.published_at || new Date().toISOString()),
      accountName: sourceName,
      accountId: item?.uuid ? String(item.uuid) : item?.url ? String(item.url) : undefined,
      coverImage: item?.image_url ? String(item.image_url) : undefined,
      url: item?.url ? String(item.url) : undefined,
      tags: buildTags(`${title} ${(item?.categories || []).join(" ")} ${description}`, keywords, sourceName),
      raw: { ...item, provider: "TheNewsAPI" }
    };
  });
}

function toSixtySecondsItems(payload: any, keywords: string[]): RealNewsItem[] {
  const list = normalizeArray(payload, ["data.news", "news", "data.data", "data.list"]);
  const image = payload?.data?.image || payload?.image;
  const publishTime = payload?.data?.date || payload?.date || new Date().toISOString();
  const normalized = list.map((item: any, index: number) => {
    const text = typeof item === "string" ? item : String(item?.title || item?.content || item?.text || `热点 ${index + 1}`);
    return {
      title: text,
      summary: text,
      content: text,
      publishTime,
      accountName: "60s API",
      accountId: `${safeDate(publishTime)}_${index}`,
      coverImage: image ? String(image) : undefined,
      url: undefined,
      tags: buildTags(text, keywords, "60s API"),
      raw: { item, provider: "60s API" }
    };
  });

  return keywords.length ? normalized.filter((item) => containsKeyword(`${item.title} ${item.summary}`, keywords)) : normalized;
}

async function fetchFromSixtySeconds(keywords: string[], limit: number): Promise<RealNewsItem[]> {
  try {
    const data = await requestJson(env.sixtySecondsApiUrl);
    const items = toSixtySecondsItems(data, keywords);
    if (items.length > 0) {
      return items.slice(0, limit);
    }
  } catch (error) {
    console.warn("[60s-primary-failed]", error);
  }

  const today = new Date().toISOString().slice(0, 10);
  const fallbackUrl = `${env.sixtySecondsStaticUrl.replace(/\/$/, "")}/60s/${today}.json`;
  const data = await requestJson(fallbackUrl);
  return toSixtySecondsItems(data, keywords).slice(0, limit);
}

function getCustomSourceConfig(platform: SourcePlatform) {
  const upper = platform.toUpperCase();
  return {
    url: String(process.env[`SOURCE_URL_${upper}`] || "").trim(),
    token: String(process.env[`SOURCE_TOKEN_${upper}`] || "").trim(),
    authHeader: String(process.env[`SOURCE_AUTH_HEADER_${upper}`] || "Authorization").trim()
  };
}

function normalizeCustomItems(platform: SourcePlatform, payload: any, keywords: string[]): RealNewsItem[] {
  const sourceName = platform === "toutiao" ? "今日头条接口" : `${platform} 自定义接口`;
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item: any) => {
    const title = String(item?.title || item?.headline || sourceName);
    const summary = String(item?.summary || item?.description || item?.content || title);
    const content = stripHtml(String(item?.content || item?.description || summary));
    const accountName = String(item?.accountName || item?.source || item?.author || sourceName);
    return {
      title,
      summary,
      content,
      publishTime: String(item?.publishTime || item?.publishedAt || item?.pubDate || new Date().toISOString()),
      accountName,
      accountId: item?.id ? String(item.id) : item?.url ? String(item.url) : undefined,
      coverImage: item?.coverImage ? String(item.coverImage) : item?.image ? String(item.image) : undefined,
      url: item?.url ? String(item.url) : undefined,
      tags: buildTags(`${title} ${summary} ${content}`, keywords, accountName),
      raw: { ...item, provider: sourceName }
    };
  });
}

async function fetchFromCustomSource(platform: SourcePlatform, keywords: string[], limit: number): Promise<RealNewsItem[]> {
  const config = getCustomSourceConfig(platform);
  if (!config.url) {
    throw new Error(`${platform} 未配置真实接口，请设置 SOURCE_URL_${platform.toUpperCase()}`);
  }

  const query = buildQuery(keywords);
  const url = new URL(config.url);
  if (!url.searchParams.has("q")) {
    url.searchParams.set("q", query);
  }
  if (!url.searchParams.has("limit")) {
    url.searchParams.set("limit", String(limit));
  }

  const headers: Record<string, string> = {};
  if (config.token) {
    headers[config.authHeader] = config.authHeader.toLowerCase() === "authorization" ? `Bearer ${config.token}` : config.token;
  }

  const data = await requestJson(url.toString(), headers);
  return normalizeCustomItems(platform, data, keywords).slice(0, limit);
}

class MockSourceAdapter implements SourceAdapter {
  constructor(public readonly platform: SourcePlatform) {}

  async fetchTrending(params: {
    keywords: string[];
    blockedAccounts: string[];
    blockedWords: string[];
    withinHours: number;
    limit: number;
    seed?: number;
  }): Promise<HotspotInput[]> {
    const now = Date.now();
    const seed = params.seed || Date.now();
    const sourceItems = mockPlatformData[this.platform] || [];
    const filtered = sourceItems.filter((item) => {
      const ageHours = (now - new Date(item.publishTime).getTime()) / 1000 / 60 / 60;
      const text = `${item.title} ${item.summary} ${item.content} ${item.tags.join(" ")}`;
      return (
        ageHours <= params.withinHours &&
        (!params.keywords.length || containsKeyword(text, params.keywords)) &&
        !params.blockedAccounts.includes(item.accountName) &&
        !params.blockedWords.some((word) => text.includes(word))
      );
    });

    return shuffleWithSeed(filtered, seed, (item) => `${item.platform}_${item.title}_${item.accountName}`).slice(0, params.limit);
  }

  async searchRelated(keyword: string, limit = 6): Promise<HotspotInput[]> {
    const related = Object.values(mockPlatformData)
      .flat()
      .filter(Boolean)
      .filter((item) => containsKeyword(`${item.title} ${item.summary} ${item.content}`, [keyword]));
    return pickDistinct(related, (item) => `${item.platform}_${item.title}`).slice(0, limit);
  }
}

abstract class BaseRealSourceAdapter implements SourceAdapter {
  constructor(public readonly platform: SourcePlatform) {}

  abstract getItems(keywords: string[], limit: number): Promise<RealNewsItem[]>;

  async fetchTrending(params: {
    keywords: string[];
    blockedAccounts: string[];
    blockedWords: string[];
    withinHours: number;
    limit: number;
    seed?: number;
  }): Promise<HotspotInput[]> {
    const now = Date.now();
    const items = await this.getItems(params.keywords, Math.max(params.limit * 4, 20));
    const normalized = items
      .map((item) => toHotspotInput(this.platform, item))
      .filter((item) => {
        const text = `${item.title} ${item.summary} ${item.content} ${item.tags.join(" ")}`;
        return !params.blockedAccounts.includes(item.accountName) && !params.blockedWords.some((word) => text.includes(word));
      });

    const recent = normalized.filter((item) => {
      const ageHours = (now - new Date(item.publishTime).getTime()) / 1000 / 60 / 60;
      return ageHours <= params.withinHours;
    });

    const ordered = recent.length >= params.limit ? recent : [...recent, ...normalized.filter((item) => !recent.includes(item))];
    return pickDistinct(ordered, (item) => `${item.platform}_${item.title}_${item.accountName}`).slice(0, params.limit);
  }

  async searchRelated(keyword: string, limit = 6): Promise<HotspotInput[]> {
    const items = await this.getItems([keyword], Math.max(limit, 6));
    return pickDistinct(
      items.map((item) => toHotspotInput(this.platform, item)),
      (item) => `${item.platform}_${item.title}`
    ).slice(0, limit);
  }
}

class GoogleNewsSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchGoogleNewsRss(keywords, limit);
  }
}

class NeteaseSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchNeteaseRss(keywords, limit);
  }
}

class GNewsSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchFromGNews(keywords, limit);
  }
}

class NewsApiSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchFromNewsApi(keywords, limit);
  }
}

class JuheNewsSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchFromJuhe(keywords, limit);
  }
}

class AlapiToutiaoSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchFromAlapi(keywords, limit);
  }
}

class NewsDataSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchFromNewsData(keywords, limit);
  }
}

class TheNewsApiSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchFromTheNewsApi(keywords, limit);
  }
}

class SixtySecondsSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchFromSixtySeconds(keywords, limit);
  }
}

class CustomJsonSourceAdapter extends BaseRealSourceAdapter {
  async getItems(keywords: string[], limit: number): Promise<RealNewsItem[]> {
    return fetchFromCustomSource(this.platform, keywords, limit);
  }
}

function createSourceAdapter(platform: SourcePlatform): SourceAdapter {
  if (env.newsProvider.toLowerCase() === "mock") {
    return new MockSourceAdapter(platform);
  }

  switch (platform) {
    case "netease":
      return new NeteaseSourceAdapter(platform);
    case "google_news":
      return new GoogleNewsSourceAdapter(platform);
    case "gnews":
      return new GNewsSourceAdapter(platform);
    case "newsapi":
      return new NewsApiSourceAdapter(platform);
    case "juhe_news":
      return new JuheNewsSourceAdapter(platform);
    case "alapi_toutiao":
      return new AlapiToutiaoSourceAdapter(platform);
    case "newsdata":
      return new NewsDataSourceAdapter(platform);
    case "the_news_api":
      return new TheNewsApiSourceAdapter(platform);
    case "sixty_seconds":
      return new SixtySecondsSourceAdapter(platform);
    case "toutiao":
    case "baidu":
    case "weixin":
    case "weibo":
    case "douyin":
    case "xiaohongshu":
      return new CustomJsonSourceAdapter(platform);
    default:
      return new SixtySecondsSourceAdapter("sixty_seconds");
  }
}

export const sourceRegistry: Record<SourcePlatform, SourceAdapter> = {
  douyin: createSourceAdapter("douyin"),
  xiaohongshu: createSourceAdapter("xiaohongshu"),
  weibo: createSourceAdapter("weibo"),
  weixin: createSourceAdapter("weixin"),
  baidu: createSourceAdapter("baidu"),
  toutiao: createSourceAdapter("toutiao"),
  netease: createSourceAdapter("netease"),
  google_news: createSourceAdapter("google_news"),
  gnews: createSourceAdapter("gnews"),
  newsapi: createSourceAdapter("newsapi"),
  juhe_news: createSourceAdapter("juhe_news"),
  alapi_toutiao: createSourceAdapter("alapi_toutiao"),
  newsdata: createSourceAdapter("newsdata"),
  the_news_api: createSourceAdapter("the_news_api"),
  sixty_seconds: createSourceAdapter("sixty_seconds")
};

