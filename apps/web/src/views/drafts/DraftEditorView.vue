<template>
  <div v-if="draft.id" class="editor-page">
    <el-row :gutter="16" class="editor-layout">
      <el-col :span="15" class="editor-left-col">
        <el-card class="page-card editor-card">
          <template #header>
            <div class="editor-header">
              <span>{{ texts.editorTitle }}</span>
              <el-space wrap>
                <el-select v-model="draftLengthMode" style="width: 140px">
                  <el-option :label="texts.mediumMode" value="medium" />
                  <el-option :label="texts.detailedMode" value="detailed" />
                </el-select>
                <el-button @click="regenerate">{{ texts.regenerate }}</el-button>
                <el-button @click="loadVersions">{{ texts.refreshVersions }}</el-button>
                <el-button type="primary" @click="save">{{ texts.saveDraft }}</el-button>
              </el-space>
            </div>
          </template>

          <div class="editor-form-wrap">
            <el-form label-width="100px">
              <el-form-item :label="texts.title">
                <el-input v-model="draft.title" />
              </el-form-item>
              <el-form-item :label="texts.summary">
                <el-input v-model="draft.summary" type="textarea" :rows="3" />
              </el-form-item>
              <el-form-item :label="texts.coverImage">
                <el-input v-model="draft.coverImage" />
              </el-form-item>
              <el-form-item :label="texts.titleOptions">
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
              <el-form-item :label="texts.lengthMode">
                <el-select v-model="draftLengthMode" style="width: 180px">
                  <el-option :label="texts.mediumMode" value="medium" />
                  <el-option :label="texts.detailedMode" value="detailed" />
                </el-select>
              </el-form-item>
              <el-form-item :label="texts.content">
                <el-input v-model="draft.content" type="textarea" :rows="22" />
              </el-form-item>
              <el-form-item :label="texts.status">
                <el-select v-model="draft.status" style="width: 180px">
                  <el-option :label="texts.draftStatus" value="draft" />
                  <el-option :label="texts.readyStatus" value="ready" />
                  <el-option :label="texts.publishedStatus" value="published" />
                </el-select>
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </el-col>

      <el-col :span="9" class="editor-right-col">
        <div class="right-panel-scroll">
          <el-card class="page-card" style="margin-bottom: 16px">
            <template #header>
              <div style="font-weight: 700">{{ texts.qualityTips }}</div>
            </template>
            <div style="margin-bottom: 12px">{{ texts.originality }}<strong>{{ draft.originalityScore }}</strong></div>
            <el-empty v-if="!draft.errorReport?.length" :description="texts.noIssue" />
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

          <el-card class="page-card" style="margin-bottom: 16px">
            <template #header>
              <div style="font-weight: 700">{{ texts.preview }}</div>
            </template>
            <div class="article-preview">
              <h2 class="preview-title">{{ draft.title }}</h2>
              <p class="preview-summary">{{ draft.summary }}</p>
              <div v-for="(block, index) in previewBlocks" :key="index">
                <img v-if="block.type === 'image'" :src="block.value" class="preview-image" />
                <p v-else class="preview-paragraph">{{ block.value }}</p>
              </div>
            </div>
          </el-card>

          <el-card class="page-card">
            <template #header>
              <div style="font-weight: 700">{{ texts.versions }}</div>
            </template>
            <el-timeline>
              <el-timeline-item
                v-for="version in versions"
                :key="version.id"
                :timestamp="String(version.createdAt)"
              >
                {{ texts.versionPrefix }} {{ version.versionNo }} {{ texts.versionSuffix }} - {{ version.operatorName }}
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { api } from "../../api/modules";

const route = useRoute();
const draft = reactive<Record<string, any>>({});
const versions = ref<Array<Record<string, unknown>>>([]);
const draftLengthMode = ref("medium");

const texts = {
  editorTitle: "\u7a3f\u4ef6\u7f16\u8f91",
  refreshVersions: "\u5237\u65b0\u7248\u672c",
  saveDraft: "\u4fdd\u5b58\u7a3f\u4ef6",
  regenerate: "\u4e0d\u559c\u6b22\uff0c\u91cd\u65b0\u751f\u6210",
  title: "\u6807\u9898",
  summary: "\u6458\u8981",
  coverImage: "\u5c01\u9762\u56fe",
  titleOptions: "\u6807\u9898\u5907\u9009",
  lengthMode: "\u7a3f\u4ef6\u7bc7\u5e45",
  mediumMode: "\u4e2d\u7b49\u5185\u5bb9",
  detailedMode: "\u8be6\u7ec6\u5185\u5bb9",
  content: "\u6b63\u6587",
  status: "\u72b6\u6001",
  draftStatus: "\u8349\u7a3f",
  readyStatus: "\u53ef\u53d1\u5e03",
  publishedStatus: "\u5df2\u53d1\u5e03",
  qualityTips: "\u8d28\u91cf\u63d0\u793a",
  originality: "\u539f\u521b\u5ea6\u4f30\u7b97\uff1a",
  noIssue: "\u6682\u672a\u53d1\u73b0\u660e\u663e\u95ee\u9898",
  preview: "\u56fe\u6587\u9884\u89c8",
  versions: "\u7248\u672c\u8bb0\u5f55",
  versionPrefix: "\u7b2c",
  versionSuffix: "\u7248"
};

const previewBlocks = computed(() => {
  const content = String(draft.content || "");
  return content
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const matched = item.match(/^!\[[^\]]*\]\((.+)\)$/);
      if (matched) {
        return { type: "image", value: matched[1] };
      }
      return { type: "paragraph", value: item };
    });
});

async function load() {
  const response = await api.getDraft(String(route.params.id));
  Object.assign(draft, response.data || {});
  draftLengthMode.value = response.data?.lengthMode || "medium";
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
    images: draft.images,
    titleOptions: draft.titleOptions,
    lengthMode: draftLengthMode.value
  });
  ElMessage.success("\u7a3f\u4ef6\u5df2\u4fdd\u5b58");
  await load();
  await loadVersions();
}

async function regenerate() {
  const response = await api.regenerateDraft(String(route.params.id), {
    styleId: draft.styleId,
    lengthMode: draftLengthMode.value
  });
  Object.assign(draft, response.data || {});
  draftLengthMode.value = response.data?.lengthMode || draftLengthMode.value;
  ElMessage.success("\u5df2\u6309\u65b0\u7684\u7bc7\u5e45\u548c\u5185\u5bb9\u91cd\u65b0\u751f\u6210");
  await loadVersions();
}

onMounted(async () => {
  await load();
  await loadVersions();
});
</script>

<style scoped>
.editor-page {
  height: calc(100vh - 132px);
}

.editor-layout {
  height: 100%;
  align-items: flex-start;
}

.editor-left-col {
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100%;
}

.editor-card {
  height: 100%;
}

.editor-form-wrap {
  height: calc(100vh - 250px);
  overflow-y: auto;
  padding-right: 8px;
}

.editor-right-col {
  height: 100%;
}

.right-panel-scroll {
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
}

.article-preview {
  padding-right: 4px;
}

.preview-title {
  margin: 0 0 10px;
  font-size: 26px;
  line-height: 1.4;
  color: #16233b;
}

.preview-summary {
  margin: 0 0 18px;
  color: #60708d;
  line-height: 1.8;
}

.preview-paragraph {
  margin: 0 0 16px;
  line-height: 1.95;
  color: #2c3b55;
  font-size: 15px;
}

.preview-image {
  width: 100%;
  display: block;
  border-radius: 16px;
  margin: 0 0 18px;
  object-fit: cover;
}
</style>