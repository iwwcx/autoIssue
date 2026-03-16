import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "./env";

const storageDir = path.dirname(env.dbPath);
fs.mkdirSync(storageDir, { recursive: true });

export const db = new Database(env.dbPath);

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hotspots (
      id TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL,
      topicType TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT NOT NULL,
      publishTime TEXT NOT NULL,
      accountName TEXT NOT NULL,
      accountId TEXT,
      coverImage TEXT,
      mediaJson TEXT NOT NULL,
      tagsJson TEXT NOT NULL,
      likeCount INTEGER NOT NULL DEFAULT 0,
      commentCount INTEGER NOT NULL DEFAULT 0,
      shareCount INTEGER NOT NULL DEFAULT 0,
      captureTime TEXT NOT NULL,
      heatScore REAL NOT NULL DEFAULT 0,
      qualityScore REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      rawJson TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hotspot_aggregations (
      id TEXT PRIMARY KEY,
      hotspotId TEXT NOT NULL UNIQUE,
      searchKeyword TEXT NOT NULL,
      summary TEXT NOT NULL,
      coreFactsJson TEXT NOT NULL,
      relatedImagesJson TEXT NOT NULL,
      relatedSourcesJson TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS styles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      toneWordsJson TEXT NOT NULL,
      openingTemplate TEXT NOT NULL,
      structureTemplate TEXT NOT NULL,
      closingTemplate TEXT NOT NULL,
      opinionTemplate TEXT NOT NULL,
      signature TEXT NOT NULL,
      sceneTagsJson TEXT NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      hotspotId TEXT NOT NULL,
      styleId TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      coverImage TEXT,
      imagesJson TEXT NOT NULL,
      titleOptionsJson TEXT NOT NULL,
      lengthMode TEXT NOT NULL DEFAULT 'medium',
      generationSource TEXT NOT NULL DEFAULT 'template_fallback',
      status TEXT NOT NULL DEFAULT 'draft',
      originalityScore REAL NOT NULL DEFAULT 0,
      errorReportJson TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS draft_versions (
      id TEXT PRIMARY KEY,
      draftId TEXT NOT NULL,
      versionNo INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      imagesJson TEXT NOT NULL,
      operatorName TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publish_accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      accountName TEXT NOT NULL,
      accountAlias TEXT NOT NULL,
      encryptedCredential TEXT NOT NULL,
      credentialPreview TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unchecked',
      lastCheckAt TEXT,
      note TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publish_jobs (
      id TEXT PRIMARY KEY,
      draftId TEXT NOT NULL,
      mode TEXT NOT NULL,
      scheduledAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publish_targets (
      id TEXT PRIMARY KEY,
      jobId TEXT NOT NULL,
      platform TEXT NOT NULL,
      accountId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      resultMessage TEXT,
      externalPostId TEXT,
      publishedAt TEXT,
      readCount INTEGER NOT NULL DEFAULT 0,
      likeCount INTEGER NOT NULL DEFAULT 0,
      commentCount INTEGER NOT NULL DEFAULT 0,
      shareCount INTEGER NOT NULL DEFAULT 0,
      rawJson TEXT
    );
  `);

  const draftColumns = db.prepare("PRAGMA table_info(drafts)").all() as Array<{ name: string }>;
  if (!draftColumns.some((column) => column.name === "lengthMode")) {
    db.exec("ALTER TABLE drafts ADD COLUMN lengthMode TEXT NOT NULL DEFAULT 'medium'");
  }
  if (!draftColumns.some((column) => column.name === "generationSource")) {
    db.exec("ALTER TABLE drafts ADD COLUMN generationSource TEXT NOT NULL DEFAULT 'template_fallback'");
  }
}
