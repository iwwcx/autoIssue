<template>
  <el-card class="page-card">
    <template #header>
      <div class="toolbar">
        <span style="font-weight: 700">数据分析</span>
        <el-button @click="load">刷新</el-button>
      </div>
    </template>

    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="6" v-for="item in cards" :key="item.label">
        <el-card class="metric-card" shadow="never">
          <div style="color: #6a7790">{{ item.label }}</div>
          <div style="font-size: 30px; font-weight: 700; margin-top: 12px">{{ item.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-table :data="data.platformStats" stripe>
      <el-table-column prop="platform" label="平台" width="120" />
      <el-table-column prop="postCount" label="发文数" width="100" />
      <el-table-column prop="readCount" label="阅读量" width="120" />
      <el-table-column prop="likeCount" label="点赞量" width="100" />
      <el-table-column prop="commentCount" label="评论量" width="100" />
      <el-table-column prop="shareCount" label="转发量" width="100" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import { api } from "../../api/modules";

const data = reactive({
  counters: {
    hotspotCount: 0,
    draftCount: 0,
    accountCount: 0,
    publishSuccessCount: 0
  },
  platformStats: [] as Array<Record<string, unknown>>
});

const cards = computed(() => [
  { label: "热点数", value: data.counters.hotspotCount },
  { label: "稿件数", value: data.counters.draftCount },
  { label: "账号数", value: data.counters.accountCount },
  { label: "成功发布", value: data.counters.publishSuccessCount }
]);

async function load() {
  const response = await api.getAnalytics();
  Object.assign(data, response.data);
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
