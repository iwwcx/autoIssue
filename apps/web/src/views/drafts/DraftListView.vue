<template>
  <el-card class="page-card" v-loading="listLoading">
    <template #header>
      <div class="draft-list-header">
        <div class="header-title">
          <el-icon><Document /></el-icon>
          <span>稿件列表</span>
        </div>
        <el-space>
          <el-button type="danger" plain :disabled="!selectedIds.length" :loading="batchDeleting" @click="batchRemove">
            <el-icon><Delete /></el-icon>
            <span>批量删除</span>
          </el-button>
          <el-button :loading="listLoading" @click="load">
            <el-icon><RefreshRight /></el-icon>
            <span>刷新</span>
          </el-button>
        </el-space>
      </div>
    </template>

    <el-table :data="drafts" stripe empty-text="暂无稿件数据" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" />
      <el-table-column prop="title" label="标题" min-width="300" />
      <el-table-column label="状态" width="110">
        <template #default="scope">
          <el-tag :class="draftStatusTagClass(scope.row.status)" class="soft-tag" effect="light">
            {{ draftStatusLabel(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="生成来源" width="140">
        <template #default="scope">
          <el-tag :class="draftGenerationSourceTagClass(scope.row.generationSource)" class="soft-tag" effect="light">
            {{ draftGenerationSourceLabel(scope.row.generationSource) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="原创度估算" width="150">
        <template #default="scope">
          <div class="score-cell">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ scope.row.originalityScore }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="190">
        <template #default="scope">
          {{ formatDateTime(scope.row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="scope">
          <el-space>
            <el-button type="primary" link @click="router.push(`/drafts/${scope.row.id}`)">编辑</el-button>
            <el-button type="danger" link :loading="removingId === String(scope.row.id)" @click="removeOne(String(scope.row.id))">删除</el-button>
          </el-space>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Document, RefreshRight, TrendCharts } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { api } from "../../api/modules";
import { draftGenerationSourceLabel, draftGenerationSourceTagClass, draftStatusLabel, draftStatusTagClass, formatDateTime } from "../../shared/display";

const router = useRouter();
const drafts = ref<Array<Record<string, unknown>>>([]);
const selectedIds = ref<string[]>([]);
const listLoading = ref(false);
const batchDeleting = ref(false);
const removingId = ref("");

async function load() {
  listLoading.value = true;
  try {
    const response = await api.getDrafts();
    drafts.value = response.data;
  } finally {
    listLoading.value = false;
  }
}

function handleSelectionChange(rows: Array<Record<string, unknown>>) {
  selectedIds.value = rows.map((item) => String(item.id));
}

async function removeOne(id: string) {
  await ElMessageBox.confirm("确认删除这篇稿件吗？", "提示", { type: "warning" });
  removingId.value = id;
  try {
    await api.deleteDraft(id);
    ElMessage.success("稿件已删除");
    await load();
  } finally {
    removingId.value = "";
  }
}

async function batchRemove() {
  await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 篇稿件吗？`, "提示", { type: "warning" });
  batchDeleting.value = true;
  try {
    await api.batchDeleteDrafts(selectedIds.value);
    selectedIds.value = [];
    ElMessage.success("已批量删除稿件");
    await load();
  } finally {
    batchDeleting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.draft-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.score-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  font-weight: 600;
}

.soft-tag {
  border: none;
  border-radius: 999px;
  padding: 0 10px;
  font-weight: 600;
}

.status-pending { color: #1d4ed8; background: rgba(96, 165, 250, 0.18); }
.status-processed { color: #047857; background: rgba(52, 211, 153, 0.18); }
.status-ignored { color: #6b7280; background: rgba(156, 163, 175, 0.18); }
.tag-default { color: #475569; background: rgba(148, 163, 184, 0.18); }
</style>


