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
          <el-table :data="overview.topHotspots" stripe empty-text="暂无热点数据">
            <el-table-column prop="title" label="标题" min-width="240" />
            <el-table-column label="平台" width="120">
              <template #default="scope">
                <el-tag :class="platformTagClass(scope.row.platform)" class="soft-tag" effect="light">
                  {{ platformLabel(scope.row.platform) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="heatScore" label="热度" width="120" />
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag :class="hotspotStatusTagClass(scope.row.status)" class="soft-tag" effect="light">
                  {{ hotspotStatusLabel(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="page-card">
          <template #header>
            <div class="card-header">平台效果汇总</div>
          </template>
          <el-table :data="overview.platformStats" stripe empty-text="暂无发布统计数据">
            <el-table-column label="平台" width="130">
              <template #default="scope">
                <el-tag :class="platformTagClass(scope.row.platform)" class="soft-tag" effect="light">
                  {{ platformLabel(scope.row.platform) }}
                </el-tag>
              </template>
            </el-table-column>
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
import {
  hotspotStatusLabel,
  hotspotStatusTagClass,
  platformLabel,
  platformTagClass
} from "../../shared/display";

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
    desc: "累计发布成功的目标数"
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
.status-pending { color: #1d4ed8; background: rgba(96, 165, 250, 0.18); }
.status-processed { color: #047857; background: rgba(52, 211, 153, 0.18); }
.status-ignored { color: #6b7280; background: rgba(156, 163, 175, 0.18); }
.status-running { color: #7c3aed; background: rgba(196, 181, 253, 0.22); }
.status-failed { color: #b91c1c; background: rgba(252, 165, 165, 0.22); }
</style>
