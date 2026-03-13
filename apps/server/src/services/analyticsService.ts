import { db } from "../config/database";
import { listDrafts } from "./draftService";
import { listHotspots } from "./hotspotService";
import { listAccounts } from "./accountService";

export function getDashboardOverview(): {
  counters: {
    hotspotCount: number;
    draftCount: number;
    accountCount: number;
    publishSuccessCount: number;
  };
  topHotspots: Array<{
    id: string;
    title: string;
    platform: string;
    heatScore: number;
    status: string;
  }>;
  platformStats: Array<{
    platform: string;
    postCount: number;
    readCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
  }>;
} {
  const hotspotResult = listHotspots({ page: 1, pageSize: 999 });
  const drafts = listDrafts();
  const accounts = listAccounts();
  const publishRows = db.prepare(`
    SELECT platform,
           COUNT(*) AS postCount,
           SUM(readCount) AS readCount,
           SUM(likeCount) AS likeCount,
           SUM(commentCount) AS commentCount,
           SUM(shareCount) AS shareCount
    FROM publish_targets
    WHERE status = 'success'
    GROUP BY platform
    ORDER BY readCount DESC
  `).all() as Array<Record<string, unknown>>;

  const successCount = db
    .prepare("SELECT COUNT(*) AS count FROM publish_targets WHERE status = 'success'")
    .get() as { count: number };

  return {
    counters: {
      hotspotCount: hotspotResult.total,
      draftCount: drafts.length,
      accountCount: accounts.length,
      publishSuccessCount: successCount.count || 0
    },
    topHotspots: hotspotResult.list.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      platform: item.platform,
      heatScore: item.heatScore,
      status: item.status
    })),
    platformStats: publishRows.map((item) => ({
      platform: String(item.platform),
      postCount: Number(item.postCount || 0),
      readCount: Number(item.readCount || 0),
      likeCount: Number(item.likeCount || 0),
      commentCount: Number(item.commentCount || 0),
      shareCount: Number(item.shareCount || 0)
    }))
  };
}
