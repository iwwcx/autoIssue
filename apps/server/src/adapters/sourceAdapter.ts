import { mockPlatformData } from "../data/mockPlatformData";
import { containsKeyword, pickDistinct } from "../shared/text";
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
    const filtered = mockPlatformData[this.platform].filter((item) => {
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
      .filter((item) => containsKeyword(`${item.title} ${item.summary} ${item.content}`, [keyword]));
    return pickDistinct(related, (item) => `${item.platform}_${item.title}`).slice(0, limit);
  }
}

export const sourceRegistry: Record<SourcePlatform, SourceAdapter> = {
  douyin: new MockSourceAdapter("douyin"),
  xiaohongshu: new MockSourceAdapter("xiaohongshu"),
  weibo: new MockSourceAdapter("weibo"),
  weixin: new MockSourceAdapter("weixin"),
  baidu: new MockSourceAdapter("baidu"),
  toutiao: new MockSourceAdapter("toutiao")
};
