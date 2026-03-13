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
          <el-select v-model="filters.topicType" clearable :placeholder="texts.allType" style="width: 140px">
            <el-option :label="texts.tech" :value="texts.tech" />
            <el-option :label="texts.life" :value="texts.life" />
            <el-option :label="texts.ent" :value="texts.ent" />
          </el-select>
        </el-form-item>
        <el-form-item :label="texts.status">
          <el-select v-model="filters.status" clearable :placeholder="texts.allStatus" style="width: 140px">
            <el-option :label="statusLabelMap.pending" value="pending" />
            <el-option :label="statusLabelMap.processed" value="processed" />
            <el-option :label="statusLabelMap.ignored" value="ignored" />
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
            <el-option :label="texts.mediumMode" value="medium" />
            <el-option :label="texts.detailedMode" value="detailed" />
          </el-select>
        </el-form-item>
        <el-form-item :label="texts.crawlCount">
          <el-input-number v-model="crawlLimit" :min="1" :max="20" style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">{{ texts.filter }}</el-button>
          <el-button @click="runCrawler">{{ texts.runCrawler }}</el-button>
        </el-form-item>
      </el-form>
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
        <el-table-column prop="topicType" :label="texts.topicType" width="100" />
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
              <div class="source-meta">{{ texts.sourceAccount }}{{ item.accountName }} ｜ {{ texts.publishTime }}{{ item.publishTime }}</div>
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
const crawlLimit = ref(5);
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
  status: "",
  keyword: "",
  page: 1,
  pageSize: 20
});
const tableData = reactive({
  total: 0,
  list: [] as Array<Record<string, any>>
});

const texts = {
  platform: "\u5e73\u53f0",
  allPlatform: "\u5168\u90e8\u5e73\u53f0",
  topicType: "\u5206\u7c7b",
  allType: "\u5168\u90e8\u5206\u7c7b",
  status: "\u72b6\u6001",
  allStatus: "\u5168\u90e8\u72b6\u6001",
  keyword: "\u5173\u952e\u8bcd",
  keywordPlaceholder: "\u8f93\u5165\u6807\u9898\u3001\u6b63\u6587\u6216\u6807\u7b7e\u5173\u952e\u8bcd",
  style: "\u751f\u6210\u98ce\u683c",
  defaultStyle: "\u4f7f\u7528\u9ed8\u8ba4\u98ce\u683c",
  lengthMode: "\u7a3f\u4ef6\u7bc7\u5e45",
  mediumMode: "\u4e2d\u7b49\u5185\u5bb9",
  detailedMode: "\u8be6\u7ec6\u5185\u5bb9",
  crawlCount: "\u672c\u6b21\u6293\u53d6",
  filter: "\u7b5b\u9009",
  runCrawler: "\u7acb\u5373\u6293\u53d6",
  hotTitle: "\u70ed\u70b9\u6807\u9898",
  accountName: "\u53d1\u5e03\u8d26\u53f7",
  heat: "\u70ed\u5ea6",
  actions: "\u64cd\u4f5c",
  aggregate: "\u6c47\u603b",
  generate: "\u751f\u6210\u7a3f\u4ef6",
  markProcessed: "\u6807\u5df2\u5904\u7406",
  remove: "\u5220\u9664",
  aggregateResult: "\u70ed\u70b9\u6c47\u603b\u7ed3\u679c",
  aggregateSummary: "\u6c47\u603b\u8bf4\u660e",
  coreFacts: "\u6838\u5fc3\u4fe1\u606f\u70b9",
  relatedSources: "\u8de8\u5e73\u53f0\u8865\u5145\u6765\u6e90",
  sourceAccount: "\u6765\u6e90\u8d26\u53f7\uff1a",
  publishTime: "\u53d1\u5e03\u65f6\u95f4\uff1a",
  emptySources: "\u6682\u65f6\u6ca1\u6709\u8865\u5145\u6765\u6e90",
  relatedImages: "\u53ef\u7528\u914d\u56fe",
  emptyImages: "\u6682\u65f6\u6ca1\u6709\u53ef\u7528\u56fe\u7247",
  tech: "\u79d1\u6280",
  life: "\u6c11\u751f",
  ent: "\u5a31\u4e50"
};

const platformLabelMap: Record<string, string> = {
  douyin: "\u6296\u97f3",
  xiaohongshu: "\u5c0f\u7ea2\u4e66",
  weibo: "\u5fae\u535a"
};

const statusLabelMap: Record<string, string> = {
  pending: "\u5f85\u5904\u7406",
  processed: "\u5df2\u5904\u7406",
  ignored: "\u5df2\u5ffd\u7565"
};

function platformLabel(platform: string) {
  return platformLabelMap[platform] || platform || "\u672a\u77e5\u5e73\u53f0";
}

function statusLabel(status: string) {
  return statusLabelMap[status] || status || "\u672a\u77e5\u72b6\u6001";
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
  const response = await api.getHotspots(filters);
  Object.assign(tableData, response.data);
}

async function loadStyles() {
  const response = await api.getStyles();
  styles.value = response.data;
}

async function runCrawler() {
  const response = await api.runCrawler({
    limit: Number(crawlLimit.value || 5),
    platform: filters.platform || undefined
  });
  ElMessage.success(`\u6293\u53d6\u5b8c\u6210\uff0c\u672c\u6b21\u5904\u7406 ${response.data.inserted || 0} \u6761\u70ed\u70b9`);
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
  ElMessage.success("\u56fe\u6587\u7a3f\u4ef6\u5df2\u751f\u6210");
  router.push(`/drafts/${response.data.id}`);
}

async function mark(id: string, status: string) {
  await api.updateHotspotStatus(id, status);
  ElMessage.success("\u72b6\u6001\u5df2\u66f4\u65b0");
  await load();
}

async function remove(id: string) {
  await ElMessageBox.confirm("\u786e\u8ba4\u5220\u9664\u8fd9\u6761\u70ed\u70b9\u5417\uff1f", "\u63d0\u793a", { type: "warning" });
  await api.deleteHotspot(id);
  ElMessage.success("\u5df2\u5220\u9664");
  await load();
}

onMounted(async () => {
  await Promise.all([load(), loadStyles()]);
});
</script>

<style scoped>
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