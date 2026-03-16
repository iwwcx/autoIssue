<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="10">
        <el-card class="page-card" v-loading="baseLoading">
          <template #header>
            <div class="header-title">
              <el-icon><Promotion /></el-icon>
              <span>创建发布任务</span>
            </div>
          </template>
          <el-form label-width="110px">
            <el-form-item label="选择稿件">
              <el-select v-model="form.draftId" placeholder="请选择稿件" style="width: 100%">
                <el-option v-for="item in drafts" :key="item.id" :label="item.title" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="发布时间">
              <el-date-picker
                v-model="form.scheduledAt"
                type="datetime"
                value-format="YYYY-MM-DDTHH:mm:ss"
                placeholder="为空则立即发布"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="发布目标">
              <div style="width: 100%">
                <div v-for="(target, index) in form.targets" :key="index" class="target-row">
                  <el-select v-model="target.platform" placeholder="选择平台" style="width: 40%">
                    <el-option v-for="item in appStore.publishPlatforms" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                  <el-select v-model="target.accountId" placeholder="选择账号" style="width: 45%">
                    <el-option
                      v-for="item in filteredAccounts(target.platform)"
                      :key="item.id"
                      :label="item.accountAlias"
                      :value="item.id"
                    />
                  </el-select>
                  <el-button text type="danger" @click="form.targets.splice(index, 1)">移除</el-button>
                </div>
                <el-button plain @click="form.targets.push({ platform: 'netease', accountId: '' })">新增目标</el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-space>
                <el-button type="primary" :loading="createLoading" @click="createJob">
                  <el-icon><CirclePlus /></el-icon>
                  <span>提交发布任务</span>
                </el-button>
                <el-button :loading="refreshLoading" @click="refreshMetrics">
                  <el-icon><RefreshRight /></el-icon>
                  <span>刷新数据</span>
                </el-button>
              </el-space>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card class="page-card" v-loading="baseLoading">
          <template #header>
            <div class="header-title">
              <el-icon><Tickets /></el-icon>
              <span>发布记录</span>
            </div>
          </template>
          <el-table :data="records" stripe empty-text="暂无发布记录">
            <el-table-column prop="draftTitle" label="稿件标题" min-width="220" />
            <el-table-column label="模式" width="110">
              <template #default="scope">
                <el-tag class="soft-tag status-running" effect="light">
                  {{ publishModeLabel(scope.row.mode) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-tag :class="publishStatusTagClass(scope.row.status)" class="soft-tag" effect="light">
                  {{ publishStatusLabel(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发布时间" width="190">
              <template #default="scope">
                {{ formatDateTime(scope.row.scheduledAt) }}
              </template>
            </el-table-column>
            <el-table-column label="目标结果" min-width="280">
              <template #default="scope">
                <div v-for="item in scope.row.targets" :key="item.id" class="target-result">
                  <el-space wrap>
                    <el-tag :class="platformTagClass(item.platform)" class="soft-tag" effect="light">{{ platformLabel(item.platform) }}</el-tag>
                    <el-tag :class="publishStatusTagClass(item.status)" class="soft-tag" effect="light">{{ publishStatusLabel(item.status) }}</el-tag>
                    <span class="target-message">{{ item.resultMessage || '等待执行结果' }}</span>
                  </el-space>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button link type="primary" :loading="executeLoadingId === String(scope.row.id)" @click="execute(scope.row.id)">立即执行</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { CirclePlus, Promotion, RefreshRight, Tickets } from "@element-plus/icons-vue";
import { api } from "../../api/modules";
import { useAppStore } from "../../stores/app";
import {
  formatDateTime,
  platformLabel,
  platformTagClass,
  publishModeLabel,
  publishStatusLabel,
  publishStatusTagClass
} from "../../shared/display";

const appStore = useAppStore();
const drafts = ref<Array<Record<string, any>>>([]);
const accounts = ref<Array<Record<string, any>>>([]);
const records = ref<Array<Record<string, any>>>([]);
const baseLoading = ref(false);
const createLoading = ref(false);
const refreshLoading = ref(false);
const executeLoadingId = ref("");
const form = reactive({
  draftId: "",
  scheduledAt: "",
  targets: [{ platform: "netease", accountId: "" }]
});

function filteredAccounts(platform: string) {
  return accounts.value.filter((item) => item.platform === platform);
}

async function loadBase() {
  baseLoading.value = true;
  try {
    const [draftRes, accountRes, recordRes] = await Promise.all([
      api.getDrafts(),
      api.getAccounts(),
      api.getPublishRecords()
    ]);
    drafts.value = draftRes.data;
    accounts.value = accountRes.data;
    records.value = recordRes.data;
  } finally {
    baseLoading.value = false;
  }
}

async function createJob() {
  if (!form.draftId) {
    ElMessage.warning("请先选择稿件");
    return;
  }

  const validTargets = form.targets.filter((item) => item.platform && item.accountId);
  if (!validTargets.length) {
    ElMessage.warning("请至少配置一个完整的发布目标");
    return;
  }

  createLoading.value = true;
  try {
    await api.createPublishJob({
      draftId: form.draftId,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      targets: validTargets
    });
    ElMessage.success("发布任务已创建");
    form.targets = [{ platform: "netease", accountId: "" }];
    form.scheduledAt = "";
    await loadBase();
  } finally {
    createLoading.value = false;
  }
}

async function execute(id: string) {
  executeLoadingId.value = String(id);
  try {
    await api.executeJob(id);
    ElMessage.success("任务已执行");
    await loadBase();
  } finally {
    executeLoadingId.value = "";
  }
}

async function refreshMetrics() {
  refreshLoading.value = true;
  try {
    await api.refreshMetrics();
    ElMessage.success("数据已刷新");
    await loadBase();
  } finally {
    refreshLoading.value = false;
  }
}

onMounted(loadBase);
</script>

<style scoped>
.header-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.target-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.target-result {
  margin-bottom: 8px;
}

.target-message {
  color: #51617b;
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

