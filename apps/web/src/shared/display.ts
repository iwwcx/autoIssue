export const platformLabelMap: Record<string, string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  weibo: "微博",
  netease: "网易新闻",
  sohu: "搜狐新闻",
  sina: "新浪新闻",
  weixin: "微信公众号",
  baijiahao: "百家号",
  pengpai: "澎湃号"
};

export const hotspotStatusLabelMap: Record<string, string> = {
  pending: "待处理",
  processed: "已处理",
  ignored: "已忽略"
};

export const accountStatusLabelMap: Record<string, string> = {
  normal: "正常",
  abnormal: "异常",
  unchecked: "未检测"
};

export const draftStatusLabelMap: Record<string, string> = {
  draft: "草稿",
  ready: "可发布",
  published: "已发布"
};

export const publishStatusLabelMap: Record<string, string> = {
  pending: "待执行",
  running: "执行中",
  success: "成功",
  failed: "失败"
};

export const publishModeLabelMap: Record<string, string> = {
  immediate: "立即发布",
  scheduled: "定时发布"
};

export function platformLabel(value?: string) {
  if (!value) return "未知平台";
  return platformLabelMap[value] || value;
}

export function hotspotStatusLabel(value?: string) {
  if (!value) return "未知状态";
  return hotspotStatusLabelMap[value] || value;
}

export function accountStatusLabel(value?: string) {
  if (!value) return "未知状态";
  return accountStatusLabelMap[value] || value;
}

export function draftStatusLabel(value?: string) {
  if (!value) return "未知状态";
  return draftStatusLabelMap[value] || value;
}

export function publishStatusLabel(value?: string) {
  if (!value) return "未知状态";
  return publishStatusLabelMap[value] || value;
}

export function publishModeLabel(value?: string) {
  if (!value) return "未知模式";
  return publishModeLabelMap[value] || value;
}

export function platformTagClass(value?: string) {
  return {
    douyin: "tag-douyin",
    xiaohongshu: "tag-xiaohongshu",
    weibo: "tag-weibo",
    netease: "tag-netease",
    sohu: "tag-sohu",
    sina: "tag-sina",
    weixin: "tag-weixin",
    baijiahao: "tag-baijiahao",
    pengpai: "tag-pengpai"
  }[value || ""] || "tag-default";
}

export function hotspotStatusTagClass(value?: string) {
  return {
    pending: "status-pending",
    processed: "status-processed",
    ignored: "status-ignored"
  }[value || ""] || "tag-default";
}

export function accountStatusTagClass(value?: string) {
  return {
    normal: "status-processed",
    abnormal: "status-failed",
    unchecked: "status-ignored"
  }[value || ""] || "tag-default";
}

export function draftStatusTagClass(value?: string) {
  return {
    draft: "status-ignored",
    ready: "status-pending",
    published: "status-processed"
  }[value || ""] || "tag-default";
}

export function publishStatusTagClass(value?: string) {
  return {
    pending: "status-pending",
    running: "status-running",
    success: "status-processed",
    failed: "status-failed"
  }[value || ""] || "tag-default";
}
