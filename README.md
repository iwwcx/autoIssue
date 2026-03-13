# 自媒体新闻自动生成与多平台发布系统

这是一个从零搭建的前后端分离项目，目标是把“热点抓取 -> 信息汇总 -> 稿件生成 -> 多平台发布 -> 数据统计”串成一条完整链路。

技术选型：

- 前端：Vue 3 + Vite + TypeScript + Pinia + Element Plus
- 后端：Node.js + Express + TypeScript + SQLite
- 数据库：本地 SQLite，适合单机开发和早期上线

目录说明：

- `apps/server`：后端服务、数据库、定时任务、平台适配器
- `apps/web`：Vue 3 管理后台
- `docs/backend-guide.md`：后端小白友好文档
- `docs/api-overview.md`：主要接口清单

说明：

- 真实平台抓取与自动发文接口，很多都需要官方合作资质、白名单或企业认证，本项目先把统一架构、页面、数据库和可扩展适配器做好。
- 当前代码内置了“模拟抓取 + 模拟发布”能力，便于你先把系统跑起来、走通流程。
- 后续接入真实平台时，重点改 `apps/server/src/adapters` 目录即可。

快速开始请先看：

- `docs/backend-guide.md`
- `docs/api-overview.md`
