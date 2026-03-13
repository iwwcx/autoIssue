import crypto from "node:crypto";

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function createFingerprint(parts: string[]): string {
  return crypto.createHash("sha1").update(parts.join("|")).digest("hex");
}

export function interpolate(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, value);
  }, template);
}

export function normalizeKeywordText(input: string): string {
  return input
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function containsKeyword(text: string, keywords: string[]): boolean {
  if (!keywords.length) {
    return true;
  }

  const normalized = normalizeKeywordText(text);
  return keywords.some((keyword) => normalized.includes(normalizeKeywordText(keyword)));
}

export function pickDistinct<T>(list: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function makeParagraphs(lines: string[]): string {
  return lines.filter(Boolean).join("\n\n");
}

export function estimateOriginality(content: string): number {
  const sentenceCount = content.split(/[。！？!?]/).filter(Boolean).length || 1;
  const uniqueChars = new Set(content.replace(/\s+/g, "").split("")).size;
  const score = Math.min(98, Math.max(72, Math.round(uniqueChars / sentenceCount)));
  return score;
}

export function detectIssues(content: string, blockedWords: string[]): string[] {
  const issues: string[] = [];

  if (content.length < 180) {
    issues.push("稿件字数偏少，建议补充背景和细节。");
  }

  if (!/[。！？!?]$/.test(content.trim())) {
    issues.push("结尾缺少明显收束句，建议补一段结语。");
  }

  const hitBlocked = blockedWords.find((word) => content.includes(word));
  if (hitBlocked) {
    issues.push(`检测到敏感或屏蔽词：${hitBlocked}，建议手动确认。`);
  }

  return issues;
}
