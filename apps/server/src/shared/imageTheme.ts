import { pickDistinct } from "./text";

interface ImageInput {
  title: string;
  summary?: string;
  topicType?: string;
  coverImage?: string;
  media?: string[];
}

const fallbackImages = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80"
];

const topicFallbackMap: Record<string, string[]> = {
  "\u79d1\u6280": [
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80"
  ],
  "\u6c11\u751f": [
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
  ],
  "\u5a31\u4e50": [
    "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80"
  ]
};

const ruleMap: Array<{ keywords: string[]; images: string[] }> = [
  {
    keywords: ["AI", "\u4eba\u5de5\u667a\u80fd", "\u5927\u6a21\u578b", "\u529e\u516c", "\u641c\u7d22", "\u7b97\u529b", "\u77e5\u8bc6\u5e93"],
    images: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    keywords: ["\u6625\u62db", "\u5c31\u4e1a", "\u5c97\u4f4d", "\u62db\u8058", "\u804c\u573a", "\u7075\u6d3b\u5c31\u4e1a"],
    images: [
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    keywords: ["\u7535\u5f71", "\u70ed\u64ad\u5267", "\u5927\u7ed3\u5c40", "\u9996\u6620", "\u53e3\u7891", "\u5f71\u89c6", "\u77ed\u5267"],
    images: [
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    keywords: ["\u6f14\u5531\u4f1a", "\u97f3\u4e50", "\u7efc\u827a", "\u5609\u5bbe", "\u8def\u900f", "\u6f14\u51fa"],
    images: [
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    keywords: ["\u6625\u88c5", "\u7a7f\u642d", "\u670d\u88c5", "\u673a\u573a\u7a7f\u642d", "\u8f7b\u8fd0\u52a8"],
    images: [
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    keywords: ["\u65c5\u6e38", "\u5468\u8fb9\u6e38", "\u9152\u5e97", "\u51fa\u884c", "\u672c\u5730\u751f\u6d3b"],
    images: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    keywords: ["\u5496\u5561", "\u5c0f\u57ce\u5e02", "\u63a2\u5e97", "\u5468\u672b", "\u5e02\u96c6"],
    images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    keywords: ["\u9910\u996e", "\u591c\u95f4\u6d88\u8d39", "\u591c\u7ecf\u6d4e", "\u95e8\u5e97", "\u5546\u5708"],
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    keywords: ["\u624b\u673a", "\u667a\u80fd\u773c\u955c", "\u786c\u4ef6", "\u53ef\u7a7f\u6234"],
    images: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
    ]
  }
];

export function getRelevantImageCandidates(input: ImageInput, limit = 6): string[] {
  const text = `${input.title} ${input.summary || ""}`.toLowerCase();
  const matchedImages = ruleMap
    .filter((rule) => rule.keywords.some((keyword) => text.includes(String(keyword).toLowerCase())))
    .flatMap((rule) => rule.images);

  const sourceImages = [...(input.media || []), input.coverImage].filter(Boolean) as string[];
  const topicImages = topicFallbackMap[input.topicType || ""] || [];

  return pickDistinct([...matchedImages, ...sourceImages, ...topicImages, ...fallbackImages], (item) => item).slice(0, limit);
}