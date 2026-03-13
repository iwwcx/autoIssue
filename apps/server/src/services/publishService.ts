import { db } from "../config/database";
import { publisherRegistry } from "../adapters/publisherAdapter";
import { parseJson, toJson } from "../shared/json";
import { createId } from "../shared/text";
import { getAccountById } from "./accountService";
import { getDraftById, updateDraft } from "./draftService";
import type { PublishJobRecord, PublishPlatform, PublishStatus, PublishTargetRecord } from "../types";

const now = () => new Date().toISOString();

function mapJob(row: Record<string, unknown>): PublishJobRecord {
  return {
    id: String(row.id),
    draftId: String(row.draftId),
    mode: row.mode as PublishJobRecord["mode"],
    scheduledAt: String(row.scheduledAt),
    status: row.status as PublishStatus,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

function mapTarget(row: Record<string, unknown>): PublishTargetRecord {
  return {
    id: String(row.id),
    jobId: String(row.jobId),
    platform: row.platform as PublishPlatform,
    accountId: String(row.accountId),
    status: row.status as PublishStatus,
    resultMessage: row.resultMessage ? String(row.resultMessage) : undefined,
    externalPostId: row.externalPostId ? String(row.externalPostId) : undefined,
    publishedAt: row.publishedAt ? String(row.publishedAt) : undefined,
    readCount: Number(row.readCount),
    likeCount: Number(row.likeCount),
    commentCount: Number(row.commentCount),
    shareCount: Number(row.shareCount),
    raw: parseJson<Record<string, unknown>>(String(row.rawJson || "{}"), {})
  };
}

export function listPublishRecords(): Array<
  PublishJobRecord & {
    draftTitle: string;
    targets: PublishTargetRecord[];
  }
> {
  const jobs = db.prepare("SELECT * FROM publish_jobs ORDER BY createdAt DESC").all() as Record<string, unknown>[];
  return jobs.map((row) => {
    const job = mapJob(row);
    const draft = getDraftById(job.draftId);
    return {
      ...job,
      draftTitle: draft?.title || "未知稿件",
      targets: listTargetsByJobId(job.id)
    };
  });
}

export function listTargetsByJobId(jobId: string): PublishTargetRecord[] {
  const rows = db
    .prepare("SELECT * FROM publish_targets WHERE jobId = ? ORDER BY rowid ASC")
    .all(jobId) as Record<string, unknown>[];
  return rows.map(mapTarget);
}

export function getPublishJob(id: string): PublishJobRecord | undefined {
  const row = db.prepare("SELECT * FROM publish_jobs WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? mapJob(row) : undefined;
}

export async function createPublishJob(payload: {
  draftId: string;
  scheduledAt?: string;
  targets: Array<{ platform: PublishPlatform; accountId: string }>;
}): Promise<PublishJobRecord> {
  const draft = getDraftById(payload.draftId);
  if (!draft) {
    throw new Error("稿件不存在");
  }

  const scheduledAt = payload.scheduledAt || now();
  const isImmediate = new Date(scheduledAt).getTime() <= Date.now();

  const job: PublishJobRecord = {
    id: createId("job"),
    draftId: payload.draftId,
    mode: isImmediate ? "immediate" : "scheduled",
    scheduledAt,
    status: "pending",
    createdAt: now(),
    updatedAt: now()
  };

  db.prepare(`
    INSERT INTO publish_jobs (id, draftId, mode, scheduledAt, status, createdAt, updatedAt)
    VALUES (@id, @draftId, @mode, @scheduledAt, @status, @createdAt, @updatedAt)
  `).run(job);

  const insertTarget = db.prepare(`
    INSERT INTO publish_targets (
      id, jobId, platform, accountId, status, resultMessage, externalPostId,
      publishedAt, readCount, likeCount, commentCount, shareCount, rawJson
    ) VALUES (
      @id, @jobId, @platform, @accountId, @status, @resultMessage, @externalPostId,
      @publishedAt, @readCount, @likeCount, @commentCount, @shareCount, @rawJson
    )
  `);

  payload.targets.forEach((target) => {
    insertTarget.run({
      id: createId("target"),
      jobId: job.id,
      platform: target.platform,
      accountId: target.accountId,
      status: "pending",
      resultMessage: null,
      externalPostId: null,
      publishedAt: null,
      readCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      rawJson: toJson({})
    });
  });

  if (isImmediate) {
    await executeJob(job.id);
  }

  return getPublishJob(job.id)!;
}

export async function executeJob(jobId: string): Promise<PublishJobRecord> {
  const job = getPublishJob(jobId);
  if (!job) {
    throw new Error("发布任务不存在");
  }

  db.prepare("UPDATE publish_jobs SET status = ?, updatedAt = ? WHERE id = ?").run("running", now(), jobId);
  const targets = listTargetsByJobId(jobId);
  const draft = getDraftById(job.draftId);
  if (!draft) {
    throw new Error("稿件不存在");
  }

  let allSuccess = true;
  for (const target of targets) {
    const account = getAccountById(target.accountId);
    if (!account) {
      db.prepare(`
        UPDATE publish_targets SET status = ?, resultMessage = ? WHERE id = ?
      `).run("failed", "账号不存在", target.id);
      allSuccess = false;
      continue;
    }

    const adapter = publisherRegistry[target.platform];
    const result = await adapter.publish(draft, account);
    db.prepare(`
      UPDATE publish_targets SET
        status = @status,
        resultMessage = @resultMessage,
        externalPostId = @externalPostId,
        publishedAt = @publishedAt,
        rawJson = @rawJson
      WHERE id = @id
    `).run({
      id: target.id,
      status: result.status,
      resultMessage: result.message,
      externalPostId: result.externalPostId || null,
      publishedAt: result.status === "success" ? now() : null,
      rawJson: toJson(result)
    });

    if (result.status !== "success") {
      allSuccess = false;
    }
  }

  db.prepare("UPDATE publish_jobs SET status = ?, updatedAt = ? WHERE id = ?").run(
    allSuccess ? "success" : "failed",
    now(),
    jobId
  );

  if (allSuccess) {
    updateDraft(draft.id, { status: "published" }, "system-publisher");
  }

  return getPublishJob(jobId)!;
}

export async function runDueJobs(): Promise<void> {
  const rows = db
    .prepare("SELECT * FROM publish_jobs WHERE status = 'pending' AND scheduledAt <= ?")
    .all(now()) as Record<string, unknown>[];

  for (const row of rows) {
    await executeJob(String(row.id));
  }
}

export async function refreshPublishMetrics(): Promise<void> {
  const successful = db
    .prepare("SELECT * FROM publish_targets WHERE status = 'success'")
    .all() as Record<string, unknown>[];

  for (const row of successful) {
    const target = mapTarget(row);
    const adapter = publisherRegistry[target.platform];
    const metrics = await adapter.refreshMetrics(target);
    db.prepare(`
      UPDATE publish_targets SET
        readCount = @readCount,
        likeCount = @likeCount,
        commentCount = @commentCount,
        shareCount = @shareCount
      WHERE id = @id
    `).run({
      id: target.id,
      ...metrics
    });
  }
}
