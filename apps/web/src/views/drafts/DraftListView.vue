<template>
  <el-card class="page-card">
    <template #header>
      <div style="font-weight: 700">稿件列表</div>
    </template>

    <el-table :data="drafts" stripe>
      <el-table-column prop="title" label="标题" min-width="300" />
      <el-table-column prop="status" label="状态" width="100" />
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

const router = useRouter();
const drafts = ref<Array<Record<string, unknown>>>([]);

async function load() {
  const response = await api.getDrafts();
  drafts.value = response.data;
}

onMounted(load);
</script>
