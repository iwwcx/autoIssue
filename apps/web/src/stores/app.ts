import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    sourcePlatforms: [
      { label: "抖音", value: "douyin" },
      { label: "小红书", value: "xiaohongshu" },
      { label: "微博", value: "weibo" }
    ],
    publishPlatforms: [
      { label: "网易新闻", value: "netease" },
      { label: "搜狐新闻", value: "sohu" },
      { label: "小红书", value: "xiaohongshu" },
      { label: "新浪新闻", value: "sina" },
      { label: "微信公众号", value: "weixin" },
      { label: "百家号", value: "baijiahao" }
    ]
  })
});
