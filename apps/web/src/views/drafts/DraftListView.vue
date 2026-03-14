<template>
  <el-card class="page-card">
    <template #header>
      <div class="draft-list-header">
        <div style="font-weight: 700">稿件列表</div>
        <el-space>
          <el-button type="danger" plain :disabled="!selectedIds.length" @click="batchRemove">批量删除</el-button>
          <el-button @click="load">刷新</el-button>
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
      <el-table-column prop="originalityScore" label="原创度估算" width="130" />
      <el-table-column prop="updatedAt" label="更新时间" width="180" />
      <el-table-column label="操作" width="220">
        <template #default="scope">
          <el-space>
            <el-button type="primary" link @click="router.push(`/drafts/${scope.row.id}`)">编辑</el-button>
            <el-button type="danger" link @click="removeOne(String(scope.row.id))">删除</el-button>
          </el-space>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import { api } from "../../api/modules";
import { draftStatusLabel, draftStatusTagClass } from "../../shared/display";

const router = useRouter();
const drafts = ref<Array<Record<string, unknown>>>([]);
const selectedIds = ref<string[]>([]);

async function load() {
  const response = await api.getDrafts();
  drafts.value = response.data;
}

function handleSelectionChange(rows: Array<Record<string, unknown>>) {
  selectedIds.value = rows.map((item) => String(item.id));
}

async function removeOne(id: string) {
  await ElMessageBox.confirm("确认删除这篇稿件吗？", "提示", { type: "warning" });
  await api.deleteDraft(id);
  ElMessage.success("稿件已删除");
  await load();
}

async function batchRemove() {
  await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 篇稿件吗？`, "提示", { type: "warning" });
  await api.batchDeleteDrafts(selectedIds.value);
  selectedIds.value = [];
  ElMessage.success("已批量删除稿件");
  await load();
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
