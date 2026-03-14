<template>
  <div>
    <el-card class="page-card" shadow="never">
      <el-form :inline="true" :model="filters">
        <el-form-item :label="texts.platform">
          <el-select v-model="filters.platform" clearable :placeholder="texts.allPlatform" style="width: 140px">
            <el-option :label="platformLabelMap.douyin" value="douyin" />
            <el-option :label="platformLabelMap.xiaohongshu" value="xiaohongshu" />
            <el-option :label="platformLabelMap.weibo" value="weibo" />
          </el-select>
        </el-form-item>
        <el-form-item :label="texts.topicType">
          <el-select v-model="filters.topicType" clearable :placeholder="texts.allType" style="width: 160px">
            <el-option v-for="item in topicOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item :label="texts.keyword">
          <el-input v-model="filters.keyword" :placeholder="texts.keywordPlaceholder" style="width: 240px" />
        </el-form-item>
        <el-form-item :label="texts.style">
          <el-select v-model="selectedStyleId" clearable :placeholder="texts.defaultStyle" style="width: 180px">
            <el-option v-for="item in styles" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="texts.lengthMode">
          <el-select v-model="draftLengthMode" style="width: 140px">
            <el-option :label="texts.simpleMode" value="simple" />
            <el-option :label="texts.mediumMode" value="medium" />
            <el-option :label="texts.detailedMode" value="detailed" />
          </el-select>
        </el-form-item>
        <el-form-item :label="texts.crawlCount">
          <el-input-number v-model="crawlLimit" :min="1" :max="30" style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button @click="load">刷新列表</el-button>
          <el-button type="primary" @click="runCrawler">{{ texts.runCrawler }}</el-button>
        </el-form-item>
      </el-form>
      <div class="toolbar-tip">抓取条件会直接决定这次抓回来的新闻，不再对结果列表做额外二次筛选。</div>
    </el-card>

    <el-card class="page-card" style="margin-top: 16px">
      <el-table :data="tableData.list" stripe>
        <el-table-column prop="title" :label="texts.hotTitle" min-width="300" />
        <el-table-column :label="texts.platform" width="130">
          <template #default="scope">
            <el-tag :class="platformTagClass(scope.row.platform)" class="soft-tag" effect="light">
              {{ platformLabel(scope.row.platform) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="topicType" :label="texts.topicType" width="120" />
        <el-table-column prop="accountName" :label="texts.accountName" width="150" />
        <el-table-column prop="heatScore" :label="texts.heat" width="110" />
        <el-table-column :label="texts.status" width="120">
          <template #default="scope">
            <el-tag :class="statusTagClass(scope.row.status)" class="soft-tag" effect="light">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="texts.actions" width="360" fixed="right">
          <template #default="scope">
            <el-space wrap>
              <el-button size="small" @click="aggregate(scope.row)">{{ texts.aggregate }}</el-button>
              <el-button size="small" type="primary" @click="generate(scope.row.id)">{{ texts.generate }}</el-button>
              <el-button size="small" @click="mark(scope.row.id, 'processed')">{{ texts.markProcessed }}</el-button>
              <el-button size="small" type="danger" @click="remove(scope.row.id)">{{ texts.remove }}</el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="tableData.total"
          :page-size="filters.pageSize"
          v-model:current-page="filters.page"
          @current-change="load"
        />
      </div>
    </el-card>

    <el-drawer v-model="aggregationVisible" size="42%" destroy-on-close>
      <template #header>
        <div class="drawer-title">{{ texts.aggregateResult }}</div>
      </template>

      <div v-if="aggregationData" class="aggregation-panel">
        <div class="aggregation-topic">{{ aggregationTopic.title }}</div>
        <div class="aggregation-meta">
          <el-tag :class="platformTagClass(aggregationTopic.platform)" class="soft-tag" effect="light">
            {{ platformLabel(aggregationTopic.platform) }}
          </el-tag>
          <span>{{ aggregationTopic.accountName }}</span>
          <span>{{ aggregationTopic.topicType }}</span>
        </div>

        <el-card shadow="never" class="aggregation-card">
          <template #header>
            <div class="section-title">{{ texts.aggregateSummary }}</div>
          </template>
          <div class="aggregation-summary">{{ aggregationData.summary }}</div>
        </el-card>

        <el-card shadow="never" class="aggregation-card">
          <template #header>
            <div class="section-title">{{ texts.coreFacts }}</div>
          </template>
          <ol class="fact-list">
            <li v-for="item in aggregationData.coreFacts || []" :key="item">{{ item }}</li>
          </ol>
        </el-card>

        <el-card shadow="never" class="aggregation-card">
          <template #header>
            <div class="section-title">{{ texts.relatedSources }}</div>
          </template>
          <div v-if="aggregationData.relatedSources?.length" class="source-list">
            <div v-for="(item, index) in aggregationData.relatedSources" :key="index" class="source-item">
              <div class="source-head">
                <el-tag :class="platformTagClass(item.platform)" class="soft-tag" effect="light">
                  {{ platformLabel(item.platform) }}
                </el-tag>
                <span class="source-title">{{ item.title }}</span>
              </div>
              <div class="source-summary">{{ item.summary }}</div>
              <div class="source-meta">{{ texts.sourceAccount }}{{ item.accountName }} · {{ texts.publishTime }}{{ item.publishTime }}</div>
            </div>
          </div>
          <el-empty v-else :description="texts.emptySources" />
        </el-card>

        <el-card shadow="never" class="aggregation-card">
          <template #header>
            <div class="section-title">{{ texts.relatedImages }}</div>
          </template>
          <div v-if="aggregationData.relatedImages?.length" class="image-grid">
            <img v-for="item in aggregationData.relatedImages" :key="item" :src="item" class="aggregation-image" />
          </div>
          <el-empty v-else :description="texts.emptyImages" />
        </el-card>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import { api } from "../../api/modules";

const router = useRouter();
const selectedStyleId = ref("");
const draftLengthMode = ref("medium");
const crawlLimit = ref(8);
const styles = ref<Array<Record<string, any>>>([]);
const aggregationVisible = ref(false);
const aggregationData = ref<Record<string, any> | null>(null);
const aggregationTopic = reactive({
  title: "",
  platform: "",
  accountName: "",
  topicType: ""
});
const filters = reactive({
  platform: "",
  topicType: "",
  keyword: "",
  page: 1,
  pageSize: 20
});
const tableData = reactive({
  total: 0,
  list: [] as Array<Record<string, any>>
});

const topicOptions = ["AI", "科技", "财经", "民生", "教育", "健康", "汽车", "房产", "文旅", "游戏", "娱乐", "体育", "社会", "国际"];

const texts = {
  platform: "平台",
  allPlatform: "全部平台",
  topicType: "分类",
  allType: "全部分类",
  status: "状态",
  keyword: "关键词",
  keywordPlaceholder: "输入想抓取的新闻关键词，比如 AI、教育、汽车",
  style: "生成风格",
  defaultStyle: "使用默认风格",
  lengthMode: "稿件篇幅",
  simpleMode: "简单内容",
  mediumMode: "中等内容",
  detailedMode: "详细内容",
  crawlCount: "本次抓取",
  runCrawler: "立即抓取",
  hotTitle: "热点标题",
  accountName: "发布账号",
  heat: "热度",
  actions: "操作",
  aggregate: "汇总",
  generate: "生成稿件",
  markProcessed: "标已处理",
  remove: "删除",
  aggregateResult: "热点汇总结果",
  aggregateSummary: "汇总说明",
  coreFacts: "核心信息点",
  relatedSources: "跨平台补充来源",
  sourceAccount: "来源账号：",
  publishTime: "发布时间：",
  emptySources: "暂时没有补充来源",
  relatedImages: "可用配图",
  emptyImages: "暂时没有可用图片"
};

const platformLabelMap: Record<string, string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  weibo: "微博"
};

const statusLabelMap: Record<string, string> = {
  pending: "待处理",
  processed: "已处理",
  ignored: "已忽略"
};

function platformLabel(platform: string) {
  return platformLabelMap[platform] || platform || "未知平台";
}

function statusLabel(status: string) {
  return statusLabelMap[status] || status || "未知状态";
}

function platformTagClass(platform: string) {
  return {
    douyin: "tag-douyin",
    xiaohongshu: "tag-xiaohongshu",
    weibo: "tag-weibo"
  }[platform] || "tag-default";
}

function statusTagClass(status: string) {
  return {
    pending: "status-pending",
    processed: "status-processed",
    ignored: "status-ignored"
  }[status] || "tag-default";
}

async function load() {
  const response = await api.getHotspots({ page: filters.page, pageSize: filters.pageSize });
  Object.assign(tableData, response.data);
}

async function loadStyles() {
  const response = await api.getStyles();
  styles.value = response.data;
}

async function runCrawler() {
  const response = await api.runCrawler({
    limit: Number(crawlLimit.value || 8),
    platform: filters.platform || undefined,
    keyword: filters.keyword || undefined,
    topicType: filters.topicType || undefined
  });
  ElMessage.success(`抓取完成，本次处理 ${response.data.inserted || 0} 条热点`);
  filters.page = 1;
  await load();
}

async function aggregate(row: Record<string, any>) {
  const response = await api.aggregateHotspot(row.id);
  aggregationData.value = response.data;
  Object.assign(aggregationTopic, {
    title: row.title,
    platform: row.platform,
    accountName: row.accountName,
    topicType: row.topicType
  });
  aggregationVisible.value = true;
}

async function generate(id: string) {
  const response = await api.generateDraft({
    hotspotId: id,
    styleId: selectedStyleId.value || undefined,
    lengthMode: draftLengthMode.value
  });
  ElMessage.success("图文稿件已生成");
  router.push(`/drafts/${response.data.id}`);
}

async function mark(id: string, status: string) {
  await api.updateHotspotStatus(id, status);
  ElMessage.success("状态已更新");
  await load();
}

async function remove(id: string) {
  await ElMessageBox.confirm("确认删除这条热点吗？", "提示", { type: "warning" });
  await api.deleteHotspot(id);
  ElMessage.success("已删除");
  await load();
}

onMounted(async () => {
  await Promise.all([load(), loadStyles()]);
});
</script>

<style scoped>
.toolbar-tip {
  margin-top: 8px;
  color: #7b8aa4;
  font-size: 13px;
}

.pagination {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.soft-tag {
  border: none;
  border-radius: 999px;
  padding: 0 10px;
  font-weight: 600;
}

.tag-douyin {
  color: #0f172a;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(34, 211, 238, 0.24));
}

.tag-xiaohongshu {
  color: #9f1239;
  background: linear-gradient(135deg, rgba(251, 113, 133, 0.18), rgba(244, 114, 182, 0.22));
}

.tag-weibo {
  color: #9a3412;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 146, 60, 0.24));
}

.status-pending {
  color: #1d4ed8;
  background: rgba(96, 165, 250, 0.18);
}

.status-processed {
  color: #047857;
  background: rgba(52, 211, 153, 0.18);
}

.status-ignored {
  color: #6b7280;
  background: rgba(156, 163, 175, 0.18);
}

.tag-default {
  color: #475569;
  background: rgba(148, 163, 184, 0.18);
}

.drawer-title {
  font-size: 22px;
  font-weight: 700;
  color: #16233b;
}

.aggregation-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.aggregation-topic {
  font-size: 24px;
  line-height: 1.5;
  font-weight: 700;
  color: #16233b;
}

.aggregation-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #62738f;
  flex-wrap: wrap;
}

.aggregation-card {
  border-radius: 18px;
}

.section-title {
  font-weight: 700;
}

.aggregation-summary {
  line-height: 1.9;
  color: #31405d;
}

.fact-list {
  margin: 0;
  padding-left: 18px;
  color: #31405d;
  line-height: 1.9;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.source-item {
  padding: 14px;
  border-radius: 16px;
  background: #f7f9fd;
}

.source-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.source-title {
  font-weight: 700;
  color: #1f2d46;
}

.source-summary {
  color: #31405d;
  line-height: 1.8;
}

.source-meta {
  margin-top: 8px;
  color: #7b8aa4;
  font-size: 13px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.aggregation-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: 16px;
  display: block;
}
</style>
