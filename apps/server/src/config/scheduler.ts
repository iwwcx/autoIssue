import cron from "node-cron";
import { crawlHotspots } from "../services/hotspotService";
import { getCrawlConfig, getLastCrawlAt } from "../services/settingsService";
import { refreshPublishMetrics, runDueJobs } from "../services/publishService";

function shouldRunCrawler(): boolean {
  const config = getCrawlConfig();
  if (!config.autoCrawl) {
    return false;
  }

  const last = getLastCrawlAt();
  if (!last) {
    return true;
  }

  const diffMinutes = (Date.now() - new Date(last).getTime()) / 1000 / 60;
  return diffMinutes >= config.frequencyMinutes;
}

export function startScheduler(): void {
  cron.schedule("* * * * *", async () => {
    try {
      if (shouldRunCrawler()) {
        await crawlHotspots();
      }
      await runDueJobs();
      await refreshPublishMetrics();
    } catch (error) {
      console.error("[scheduler]", error);
    }
  });
}
