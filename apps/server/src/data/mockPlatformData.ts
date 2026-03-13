import type { HotspotInput, SourcePlatform } from "../types";

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export const mockPlatformData: Record<SourcePlatform, HotspotInput[]> = {
  douyin: [
    {
      platform: "douyin",
      topicType: "科技",
      title: "国产 AI 办公助手上线，打工人效率再被刷新",
      content:
        "多家企业开始将国产 AI 办公助手接入客服、表格分析和内容总结场景，用户最关注的是准确率、成本和是否真的能替代重复劳动。",
      summary: "国产 AI 工具成为近期讨论热点，企业端落地节奏明显加快。",
      publishTime: minutesAgo(18),
      accountName: "科技观察站",
      accountId: "dy-tech-01",
      coverImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      media: [
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80"
      ],
      tags: ["AI", "办公", "科技热点"],
      likeCount: 16300,
      commentCount: 2460,
      shareCount: 980
    },
    {
      platform: "douyin",
      topicType: "民生",
      title: "多地气温大幅回升，春装消费开始提前启动",
      content:
        "气温连续回暖带动商场和电商平台春装销量上涨，不少消费者已经从羽绒服切换到轻薄外套和运动单品。",
      summary: "天气变化带动春装和出行消费，是典型民生类热议话题。",
      publishTime: minutesAgo(32),
      accountName: "城市民生日报",
      accountId: "dy-life-02",
      coverImage: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
      media: [
        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80"
      ],
      tags: ["气温", "消费", "民生"],
      likeCount: 8900,
      commentCount: 1200,
      shareCount: 310
    }
  ],
  xiaohongshu: [
    {
      platform: "xiaohongshu",
      topicType: "娱乐",
      title: "新综艺路透冲上热榜，观众最关心嘉宾化学反应",
      content:
        "综艺节目尚未正式开播，但路透片段已经在社交平台引发热议，不少网友围绕嘉宾互动、节目剪辑和播出时间展开讨论。",
      summary: "娱乐类内容传播速度快，适合快速生成观点型稿件。",
      publishTime: minutesAgo(26),
      accountName: "娱乐小分队",
      accountId: "xhs-ent-01",
      coverImage: "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1200&q=80",
      media: [
        "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80"
      ],
      tags: ["综艺", "娱乐", "路透"],
      likeCount: 12400,
      commentCount: 3800,
      shareCount: 1200
    },
    {
      platform: "xiaohongshu",
      topicType: "科技",
      title: "年轻人开始讨论 AI 搜索替代传统搜索入口",
      content:
        "在内容消费和信息检索场景里，越来越多用户开始尝试 AI 搜索，讨论重点集中在答案整合、时效性和是否会减少打开多个 App 的次数。",
      summary: "AI 搜索和内容入口迁移，是近期跨平台共同热点。",
      publishTime: minutesAgo(12),
      accountName: "数码研究所",
      accountId: "xhs-tech-02",
      coverImage: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80",
      media: [
        "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80"
      ],
      tags: ["AI搜索", "互联网", "效率工具"],
      likeCount: 10600,
      commentCount: 1820,
      shareCount: 760
    }
  ],
  weibo: [
    {
      platform: "weibo",
      topicType: "科技",
      title: "AI 搜索入口正在重构内容分发逻辑",
      content:
        "业内人士认为，AI 搜索和摘要式问答正在改变传统信息流分发模式，内容平台和搜索平台之间的关系也会随之调整。",
      summary: "科技行业从业者更关注内容分发和流量入口变化。",
      publishTime: minutesAgo(20),
      accountName: "互联网评论员",
      accountId: "wb-tech-01",
      coverImage: "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80",
      media: [
        "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80"
      ],
      tags: ["AI", "搜索", "分发"],
      likeCount: 9400,
      commentCount: 1540,
      shareCount: 620
    },
    {
      platform: "weibo",
      topicType: "民生",
      title: "春招开启后，灵活就业岗位热度持续升温",
      content:
        "多地春招活动启动后，灵活就业、远程协作和技能型岗位成为讨论重点，就业选择呈现出更加多样化的趋势。",
      summary: "与就业有关的话题具备明显的民生关注度和讨论基础。",
      publishTime: minutesAgo(38),
      accountName: "职场观测",
      accountId: "wb-job-02",
      coverImage: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      media: [
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
      ],
      tags: ["春招", "就业", "民生"],
      likeCount: 8200,
      commentCount: 2300,
      shareCount: 520
    }
  ],
  weixin: [],
  baidu: [],
  toutiao: []
};
