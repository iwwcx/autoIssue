export function calculateHeatScore(input: {
  likeCount: number;
  commentCount: number;
  shareCount: number;
  publishTime: string;
}): number {
  const publishTimestamp = new Date(input.publishTime).getTime();
  const minutesAgo = Math.max(1, (Date.now() - publishTimestamp) / 1000 / 60);
  const interactionScore =
    input.likeCount * 0.35 + input.commentCount * 0.4 + input.shareCount * 0.25;
  const freshnessBoost = Math.max(0.1, 120 / minutesAgo);
  return Number((interactionScore * freshnessBoost).toFixed(2));
}

export function calculateQualityScore(input: {
  content: string;
  tags: string[];
  blockedWords: string[];
}): number {
  const contentScore = Math.min(60, input.content.length / 10);
  const tagScore = Math.min(20, input.tags.length * 5);
  const penalty = input.blockedWords.some((word) => input.content.includes(word)) ? 40 : 0;
  return Math.max(0, Math.min(100, Math.round(contentScore + tagScore + 20 - penalty)));
}
