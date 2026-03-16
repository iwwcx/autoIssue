import { env } from "../config/env";
import type { DraftImageBlock, DraftLengthMode, StyleTemplate } from "../types";

export interface AiDraftInput {
  title: string;
  topicType: string;
  summary: string;
  accountName: string;
  aggregationSummary: string;
  coreFacts: string[];
  relatedSources: Array<{
    platform: string;
    title: string;
    summary: string;
  }>;
  style: StyleTemplate;
  lengthMode: DraftLengthMode;
  referenceSummary?: string;
  images?: DraftImageBlock[];
}

export interface AiDraftOutput {
  generationSource: "qwen";
  title: string;
  summary: string;
  titleOptions: string[];
  content: string;
}

function stripCodeFence(input: string): string {
  return input.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractJsonObject(input: string): string {
  const text = stripCodeFence(input);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI 返回结果中未找到 JSON 对象");
  }
  return text.slice(start, end + 1);
}

function cleanText(input?: string): string {
  return String(input || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-zA-Z0-9#]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanContent(input?: string): string {
  return String(input || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-zA-Z0-9#]+;/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function withImageMarkdown(content: string, images: DraftImageBlock[] = []): string {
  const paragraphs = content
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!images.length) {
    return paragraphs.join("\n\n");
  }

  const result: string[] = [];
  const firstImage = images[0];
  const secondImage = images[1];
  const splitIndex = paragraphs.length > 3 ? Math.ceil(paragraphs.length / 2) : 1;

  paragraphs.forEach((paragraph, index) => {
    result.push(paragraph);
    if (index === 0 && firstImage) {
      result.push(`![${firstImage.caption}](${firstImage.url})`);
    }
    if (index === splitIndex && secondImage) {
      result.push(`![${secondImage.caption}](${secondImage.url})`);
    }
  });

  if (!paragraphs.length && firstImage) {
    result.push(`![${firstImage.caption}](${firstImage.url})`);
  }

  return result.join("\n\n").trim();
}

function buildSystemPrompt() {
  return [
    "你是一名资深中文自媒体编辑，擅长把热点新闻整理成可直接发布的中文稿件。",
    "请严格输出 JSON，不要输出 Markdown 代码块，不要解释。",
    "JSON 结构必须为：{\"title\":string,\"summary\":string,\"titleOptions\":string[],\"content\":string}。",
    "要求：",
    "1. 全文使用简体中文。",
    "2. 不要输出 HTML 标签、XML、href、target、样式代码、转义实体。",
    "3. 不要编造事实，只能基于提供的材料重组表达。",
    "4. 标题备选输出 5 个，避免重复。",
    "5. 正文写成自然段，不要写提示词，不要自我说明。",
    "6. 行文要像成熟自媒体成稿，而不是模板拼接。"
  ].join("\n");
}

function buildUserPrompt(input: AiDraftInput) {
  const lengthGuide = {
    simple: "写成短稿，控制在 300 到 500 字，信息集中，节奏快。",
    medium: "写成标准稿，控制在 600 到 900 字，结构完整，可直接发布。",
    detailed: "写成长稿，控制在 1000 到 1500 字，信息充分，层次清晰。"
  }[input.lengthMode];

  const sourceLines = input.relatedSources.length
    ? input.relatedSources
        .slice(0, 6)
        .map((item, index) => `${index + 1}. 平台：${item.platform}；标题：${item.title}；摘要：${item.summary}`)
        .join("\n")
    : "暂无额外来源";

  const factLines = input.coreFacts.length
    ? input.coreFacts.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "暂无额外要点";

  return [
    `写作风格：${input.style.name}`,
    `风格说明：${input.style.description}`,
    `语气关键词：${input.style.toneWords.join("、") || "自然、清晰"}`,
    `篇幅要求：${lengthGuide}`,
    `热点标题：${input.title}`,
    `热点分类：${input.topicType}`,
    `来源账号：${input.accountName}`,
    `核心摘要：${input.summary}`,
    `跨平台汇总：${input.aggregationSummary}`,
    `核心信息点：\n${factLines}`,
    `补充来源：\n${sourceLines}`,
    `参考主线：${input.referenceSummary || "无"}`,
    "写作要求补充：开头直接切入事件，正文把事实、影响和判断讲清楚，结尾要有明确收束。"
  ].join("\n\n");
}

export function isAiDraftEnabled() {
  return Boolean(env.qwenApiKey && env.qwenModel && env.qwenBaseUrl);
}

export async function generateDraftWithAi(input: AiDraftInput): Promise<AiDraftOutput> {
  if (!isAiDraftEnabled()) {
    throw new Error("Qwen AI 未配置");
  }

  const response = await fetch(`${env.qwenBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.qwenApiKey}`
    },
    body: JSON.stringify({
      model: env.qwenModel,
      temperature: 0.7,
      max_tokens: input.lengthMode === "simple" ? 1200 : input.lengthMode === "detailed" ? 2600 : 1800,
      extra_body: {
        enable_thinking: false
      },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(input) }
      ]
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (!response.ok) {
    throw new Error(`Qwen 接口请求失败：${response.status}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error(data.error?.message || "Qwen 返回为空");
  }

  const parsed = JSON.parse(extractJsonObject(rawContent)) as Partial<AiDraftOutput>;
  const titleOptions = Array.isArray(parsed.titleOptions)
    ? parsed.titleOptions.map((item) => cleanText(String(item))).filter(Boolean).slice(0, 5)
    : [];

  const title = cleanText(parsed.title || input.title);
  const summary = cleanText(parsed.summary || input.summary);
  const content = withImageMarkdown(cleanContent(parsed.content || input.summary), input.images || []);

  return {
    title,
    summary,
    titleOptions: titleOptions.length ? titleOptions : [title],
    content
  };
}

