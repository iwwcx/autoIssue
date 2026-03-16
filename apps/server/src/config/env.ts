import path from "node:path";

export const env = {
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), "storage", "app.db"),
  appName: "Media News Automation Admin",
  newsProvider: String(process.env.NEWS_PROVIDER || "real"),
  newsApiKey: String(process.env.NEWSAPI_KEY || ""),
  gnewsApiKey: String(process.env.GNEWS_API_KEY || ""),
  juheApiKey: String(process.env.JUHE_API_KEY || ""),
  juheNewsApiUrl: String(process.env.JUHE_NEWS_API_URL || "http://v.juhe.cn/toutiao/index"),
  alapiToken: String(process.env.ALAPI_TOKEN || ""),
  alapiToutiaoUrl: String(process.env.ALAPI_TOUTIAO_URL || "https://v3.alapi.cn/api/new/toutiao"),
  newsDataApiKey: String(process.env.NEWSDATA_API_KEY || ""),
  newsDataApiUrl: String(process.env.NEWSDATA_API_URL || "https://newsdata.io/api/1/latest"),
  theNewsApiToken: String(process.env.THE_NEWS_API_TOKEN || ""),
  theNewsApiUrl: String(process.env.THE_NEWS_API_URL || "https://api.thenewsapi.com/v1/news/top"),
  sixtySecondsApiUrl: String(process.env.SIXTY_SECONDS_API_URL || "https://60s.viki.moe/v2/60s"),
  sixtySecondsStaticUrl: String(process.env.SIXTY_SECONDS_STATIC_URL || "https://60s-static.viki.moe"),
  googleNewsLanguage: String(process.env.GOOGLE_NEWS_LANGUAGE || "zh-CN"),
  googleNewsRegion: String(process.env.GOOGLE_NEWS_REGION || "CN"),
  googleNewsCeid: String(process.env.GOOGLE_NEWS_CEID || "CN:zh-Hans"),
  qwenApiKey: String(process.env.QWEN_API_KEY || ""),
  qwenBaseUrl: String(process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1"),
  qwenModel: String(process.env.QWEN_MODEL || "qwen3-32b")
};

