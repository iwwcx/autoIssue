<template>
  <div v-if="draft.id">
    <el-row :gutter="16">
      <el-col :span="16">
        <el-card class="page-card">
          <template #header>
            <div class="editor-header">
              <span>稿件编辑</span>
              <el-space>
                <el-button @click="loadVersions">刷新版本</el-button>
                <el-button type="primary" @click="save">保存稿件</el-button>
              </el-space>
            </div>
          </template>

          <el-form label-width="100px">
            <el-form-item label="标题">
              <el-input v-model="draft.title" />
            </el-form-item>
            <el-form-item label="摘要">
              <el-input v-model="draft.summary" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item label="封面图">
              <el-input v-model="draft.coverImage" />
            </el-form-item>
            <el-form-item label="标题备选">
              <el-space wrap>
                <el-tag
                  v-for="item in draft.titleOptions || []"
                  :key="item"
                  @click="draft.title = item"
                  style="cursor: pointer"
                >
                  {{ item }}
                </el-tag>
              </el-space>
            </el-form-item>
            <el-form-item label="正文">
              <el-input v-model="draft.content" type="textarea" :rows="18" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="draft.status" style="width: 180px">
                <el-option label="草稿" value="draft" />
                <el-option label="可发布" value="ready" />
                <el-option label="已发布" value="published" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="page-card" style="margin-bottom: 16px">
          <template #header>
            <div style="font-weight: 700">质量提示</div>
          </template>
          <div style="margin-bottom: 12px">原创度估算：<strong>{{ draft.originalityScore }}</strong></div>
          <el-empty v-if="!draft.errorReport?.length" description="暂未发现明显问题" />
          <el-alert
            v-for="item in draft.errorReport || []"
            :key="item"
            :title="item"
            type="warning"
            show-icon
            :closable="false"
            style="margin-bottom: 10px"
          />
        </el-card>

        <el-card class="page-card">
          <template #header>
            <div style="font-weight: 700">版本记录</div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="version in versions"
              :key="version.id"
              :timestamp="version.createdAt"
            >
              第 {{ version.versionNo }} 版 - {{ version.operatorName }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { api } from "../../api/modules";

const route = useRoute();
const draft = reactive<Record<string, any>>({});
const versions = ref<Array<Record<string, unknown>>>([]);

async function load() {
  const response = await api.getDraft(String(route.params.id));
  Object.assign(draft, response.data || {});
}

async function loadVersions() {
  const response = await api.getDraftVersions(String(route.params.id));
  versions.value = response.data;
}

async function save() {
  await api.updateDraft(String(route.params.id), {
    title: draft.title,
    summary: draft.summary,
    content: draft.content,
    coverImage: draft.coverImage,
    status: draft.status,
    images: draft.images
  });
  ElMessage.success("稿件已保存");
  await load();
  await loadVersions();
}

onMounted(async () => {
  await load();
  await loadVersions();
});
</script>

<style scoped>
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
}
</style>
