# 接口概览

基础前缀：`/api`

## 系统与仪表盘

- `GET /health`：健康检查
- `GET /dashboard/overview`：仪表盘总览
- `GET /analytics/overview`：统计分析数据

## 抓取设置

- `GET /settings/crawl`：获取抓取配置
- `PUT /settings/crawl`：更新抓取配置
- `GET /settings/generation`：获取生成配置
- `PUT /settings/generation`：更新生成配置

## 热点模块

- `POST /crawler/run`：手动执行一次抓取
- `GET /hotspots`：分页查询热点
- `GET /hotspots/:id`：查询单条热点
- `POST /hotspots/:id/status`：更新热点状态
- `DELETE /hotspots/:id`：删除热点
- `POST /hotspots/:id/aggregate`：汇总单条热点的跨平台信息

### `GET /hotspots` 常用参数

- `platform`
- `topicType`
- `status`
- `keyword`
- `page`
- `pageSize`

## 风格模板

- `GET /styles`：查询风格模板
- `POST /styles`：新增风格模板
- `PUT /styles/:id`：更新风格模板

## 稿件模块

- `GET /drafts`：查询稿件列表
- `GET /drafts/:id`：查询稿件详情
- `POST /drafts/generate`：根据热点生成稿件
- `PUT /drafts/:id`：更新稿件
- `GET /drafts/:id/versions`：查询稿件历史版本

### `POST /drafts/generate` 请求体示例

```json
{
  "hotspotId": "hot_xxx",
  "styleId": "style_sharp"
}
```

## 账号管理

- `GET /accounts`：查询账号列表
- `POST /accounts`：新增账号
- `PUT /accounts/:id`：更新账号
- `DELETE /accounts/:id`：删除账号
- `POST /accounts/:id/check`：检测账号状态

### `POST /accounts` 请求体示例

```json
{
  "platform": "netease",
  "accountName": "news-main",
  "accountAlias": "网易主号",
  "credential": {
    "cookie": "demo-cookie",
    "token": "demo-token"
  },
  "note": "主运营账号"
}
```

## 发布模块

- `GET /publish/records`：查询发布记录
- `POST /publish/jobs`：创建发布任务
- `POST /publish/jobs/:id/execute`：手动执行发布任务
- `POST /publish/metrics/refresh`：刷新发布统计

### `POST /publish/jobs` 请求体示例

```json
{
  "draftId": "draft_xxx",
  "scheduledAt": "2026-03-13T12:30:00Z",
  "targets": [
    {
      "platform": "netease",
      "accountId": "account_xxx"
    },
    {
      "platform": "sohu",
      "accountId": "account_yyy"
    }
  ]
}
```

## 返回结构

当前接口统一返回：

```json
{
  "success": true,
  "data": {}
}
```

失败时：

```json
{
  "success": false,
  "message": "错误信息"
}
```
