import { db } from "../config/database";
import { publisherRegistry } from "../adapters/publisherAdapter";
import { encryptObject } from "../shared/crypto";
import { createId } from "../shared/text";
import type { PublishAccountRecord, PublishPlatform } from "../types";

const now = () => new Date().toISOString();

function mapAccount(row: Record<string, unknown>): PublishAccountRecord {
  return {
    id: String(row.id),
    platform: row.platform as PublishPlatform,
    accountName: String(row.accountName),
    accountAlias: String(row.accountAlias),
    encryptedCredential: String(row.encryptedCredential),
    credentialPreview: String(row.credentialPreview),
    status: row.status as PublishAccountRecord["status"],
    lastCheckAt: row.lastCheckAt ? String(row.lastCheckAt) : undefined,
    note: row.note ? String(row.note) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

export function listAccounts(): PublishAccountRecord[] {
  const rows = db
    .prepare("SELECT * FROM publish_accounts ORDER BY updatedAt DESC")
    .all() as Record<string, unknown>[];
  return rows.map(mapAccount);
}

export function getAccountById(id: string): PublishAccountRecord | undefined {
  const row = db
    .prepare("SELECT * FROM publish_accounts WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapAccount(row) : undefined;
}

export function createAccount(payload: {
  platform: PublishPlatform;
  accountName: string;
  accountAlias: string;
  credential: Record<string, unknown>;
  note?: string;
}): PublishAccountRecord {
  const account: PublishAccountRecord = {
    id: createId("account"),
    platform: payload.platform,
    accountName: payload.accountName,
    accountAlias: payload.accountAlias,
    encryptedCredential: encryptObject(payload.credential),
    credentialPreview: JSON.stringify(payload.credential, null, 2),
    status: "unchecked",
    note: payload.note,
    createdAt: now(),
    updatedAt: now()
  };

  db.prepare(`
    INSERT INTO publish_accounts (
      id, platform, accountName, accountAlias, encryptedCredential, credentialPreview,
      status, lastCheckAt, note, createdAt, updatedAt
    ) VALUES (
      @id, @platform, @accountName, @accountAlias, @encryptedCredential, @credentialPreview,
      @status, @lastCheckAt, @note, @createdAt, @updatedAt
    )
  `).run({
    ...account,
    lastCheckAt: null
  });

  return account;
}

export function updateAccount(
  id: string,
  payload: Partial<{
    accountName: string;
    accountAlias: string;
    credential: Record<string, unknown>;
    note: string;
  }>
): PublishAccountRecord {
  const current = getAccountById(id);
  if (!current) {
    throw new Error("账号不存在");
  }

  const next: PublishAccountRecord = {
    ...current,
    accountName: payload.accountName || current.accountName,
    accountAlias: payload.accountAlias || current.accountAlias,
    encryptedCredential: payload.credential ? encryptObject(payload.credential) : current.encryptedCredential,
    credentialPreview: payload.credential
      ? JSON.stringify(payload.credential, null, 2)
      : current.credentialPreview,
    note: payload.note ?? current.note,
    updatedAt: now()
  };

  db.prepare(`
    UPDATE publish_accounts SET
      accountName = @accountName,
      accountAlias = @accountAlias,
      encryptedCredential = @encryptedCredential,
      credentialPreview = @credentialPreview,
      note = @note,
      updatedAt = @updatedAt
    WHERE id = @id
  `).run(next);

  return next;
}

export function deleteAccount(id: string): void {
  db.prepare("DELETE FROM publish_accounts WHERE id = ?").run(id);
}

export async function checkAccountStatus(id: string): Promise<PublishAccountRecord> {
  const account = getAccountById(id);
  if (!account) {
    throw new Error("账号不存在");
  }

  const adapter = publisherRegistry[account.platform];
  const result = await adapter.checkAccount(account);
  db.prepare(`
    UPDATE publish_accounts SET
      status = @status,
      lastCheckAt = @lastCheckAt,
      note = @note,
      updatedAt = @updatedAt
    WHERE id = @id
  `).run({
    id: account.id,
    status: result.status,
    lastCheckAt: now(),
    note: `${account.note || ""}\n[检查结果] ${result.message}`.trim(),
    updatedAt: now()
  });

  return getAccountById(id)!;
}
