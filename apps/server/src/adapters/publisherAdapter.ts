import { decryptObject } from "../shared/crypto";
import { createId } from "../shared/text";
import type {
  DraftRecord,
  PublishAccountRecord,
  PublishPlatform
} from "../types";

export interface PublishResult {
  status: "success" | "failed";
  message: string;
  externalPostId?: string;
}

export interface AccountCheckResult {
  status: "normal" | "abnormal";
  message: string;
}

export interface PublisherAdapter {
  platform: PublishPlatform;
  publish(draft: DraftRecord, account: PublishAccountRecord): Promise<PublishResult>;
  checkAccount(account: PublishAccountRecord): Promise<AccountCheckResult>;
  refreshMetrics(target: {
    readCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
  }): Promise<{
    readCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
  }>;
}

class MockPublisherAdapter implements PublisherAdapter {
  constructor(public readonly platform: PublishPlatform) {}

  async publish(draft: DraftRecord, account: PublishAccountRecord): Promise<PublishResult> {
    const credential = decryptObject<Record<string, unknown>>(account.encryptedCredential);
    const hasAnyCredential = Object.keys(credential).length > 0;

    if (!hasAnyCredential) {
      return {
        status: "failed",
        message: `${this.platform} 账号缺少凭证信息，无法发布。`
      };
    }

    return {
      status: "success",
      message: `${draft.title} 已通过 ${account.accountAlias} 提交到 ${this.platform} 模拟发布通道。`,
      externalPostId: createId(this.platform)
    };
  }

  async checkAccount(account: PublishAccountRecord): Promise<AccountCheckResult> {
    const credential = decryptObject<Record<string, unknown>>(account.encryptedCredential);
    if (Object.keys(credential).length > 0) {
      return {
        status: "normal",
        message: `${account.accountAlias} 凭证结构存在，当前按可用账号处理。`
      };
    }

    return {
      status: "abnormal",
      message: `${account.accountAlias} 未配置任何凭证字段。`
    };
  }

  async refreshMetrics(target: {
    readCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
  }): Promise<{
    readCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
  }> {
    return {
      readCount: target.readCount + Math.floor(Math.random() * 800 + 120),
      likeCount: target.likeCount + Math.floor(Math.random() * 80 + 12),
      commentCount: target.commentCount + Math.floor(Math.random() * 20 + 2),
      shareCount: target.shareCount + Math.floor(Math.random() * 10 + 1)
    };
  }
}

export const publisherRegistry: Record<PublishPlatform, PublisherAdapter> = {
  netease: new MockPublisherAdapter("netease"),
  sohu: new MockPublisherAdapter("sohu"),
  xiaohongshu: new MockPublisherAdapter("xiaohongshu"),
  sina: new MockPublisherAdapter("sina"),
  weixin: new MockPublisherAdapter("weixin"),
  baijiahao: new MockPublisherAdapter("baijiahao"),
  pengpai: new MockPublisherAdapter("pengpai")
};
