<template>
  <el-card class="page-card">
    <template #header>
      <div style="font-weight: 700">稿件列表</div>
    </template>

    <el-table :data="drafts" stripe empty-text="暂无稿件数据">
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
      <el-table-column label="操作" width="180">
        <template #default="scope">
          <el-button type="primary" link @click="router.push(`/drafts/${scope.row.id}`)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../../api/modules";
import { draftStatusLabel, draftStatusTagClass } from "../../shared/display";

const router = useRouter();
const drafts = ref<Array<Record<string, unknown>>>([]);

async function load() {
  const response = await api.getDrafts();
  drafts.value = response.data;
}

onMounted(load);
</script>

<style scoped>
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
