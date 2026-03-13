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

    <el-table :data="data.platformStats" stripe empty-text="暂无分析数据">
      <el-table-column label="平台" width="130">
        <template #default="scope">
          <el-tag :class="platformTagClass(scope.row.platform)" class="soft-tag" effect="light">
            {{ platformLabel(scope.row.platform) }}
          </el-tag>
        </template>
      </el-table-column>
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
import { platformLabel, platformTagClass } from "../../shared/display";

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

.soft-tag {
  border: none;
  border-radius: 999px;
  padding: 0 10px;
  font-weight: 600;
}

.tag-douyin { color: #0f172a; background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(34, 211, 238, 0.24)); }
.tag-xiaohongshu { color: #9f1239; background: linear-gradient(135deg, rgba(251, 113, 133, 0.18), rgba(244, 114, 182, 0.22)); }
.tag-weibo { color: #9a3412; background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 146, 60, 0.24)); }
.tag-netease { color: #1d4ed8; background: rgba(96, 165, 250, 0.18); }
.tag-sohu { color: #065f46; background: rgba(110, 231, 183, 0.22); }
.tag-sina { color: #b45309; background: rgba(253, 230, 138, 0.3); }
.tag-weixin { color: #166534; background: rgba(134, 239, 172, 0.26); }
.tag-baijiahao { color: #7c3aed; background: rgba(196, 181, 253, 0.24); }
.tag-pengpai { color: #0f766e; background: rgba(153, 246, 228, 0.22); }
.tag-default { color: #475569; background: rgba(148, 163, 184, 0.18); }
</style>
