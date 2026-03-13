<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col :span="6" v-for="item in metrics" :key="item.label">
        <el-card class="metric-card page-card">
          <div class="metric-label">{{ item.label }}</div>
          <div class="metric-value">{{ item.value }}</div>
          <div class="metric-desc">{{ item.desc }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <el-card class="page-card">
          <template #header>
            <div class="card-header">当前高热热点</div>
          </template>
          <el-table :data="overview.topHotspots" stripe>
            <el-table-column prop="title" label="标题" min-width="240" />
            <el-table-column prop="platform" label="平台" width="120" />
            <el-table-column prop="heatScore" label="热度" width="120" />
            <el-table-column prop="status" label="状态" width="120" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="page-card">
          <template #header>
            <div class="card-header">平台效果汇总</div>
          </template>
          <el-table :data="overview.platformStats" stripe>
            <el-table-column prop="platform" label="平台" width="120" />
            <el-table-column prop="postCount" label="发文数" width="100" />
            <el-table-column prop="readCount" label="阅读" width="120" />
            <el-table-column prop="likeCount" label="点赞" width="100" />
            <el-table-column prop="shareCount" label="转发" width="100" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import { api } from "../../api/modules";

const overview = reactive({
  counters: {
    hotspotCount: 0,
    draftCount: 0,
    accountCount: 0,
    publishSuccessCount: 0
  },
  topHotspots: [] as Array<Record<string, unknown>>,
  platformStats: [] as Array<Record<string, unknown>>
});

const metrics = computed(() => [
  {
    label: "热点总数",
    value: overview.counters.hotspotCount,
    desc: "系统已抓取并入库的热点数量"
  },
  {
    label: "稿件总数",
    value: overview.counters.draftCount,
    desc: "自动生成与人工编辑后的稿件"
  },
  {
    label: "已接账号",
    value: overview.counters.accountCount,
    desc: "当前后台管理的发布账号总量"
  },
  {
    label: "发布成功",
    value: overview.counters.publishSuccessCount,
    desc: "累计模拟发布成功的目标数"
  }
]);

async function load() {
  const response = await api.getDashboard();
  Object.assign(overview, response.data);
}

onMounted(load);
</script>

<style scoped>
.metric-label {
  font-size: 14px;
  color: #6a7790;
}

.metric-value {
  font-size: 34px;
  font-weight: 700;
  margin-top: 12px;
  color: #132743;
}

.metric-desc {
  font-size: 12px;
  color: #7e8ca5;
  margin-top: 8px;
}

.card-header {
  font-weight: 700;
}
</style>
