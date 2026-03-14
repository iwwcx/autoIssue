<template>
  <div v-if="draft.id" class="editor-page">
    <el-row :gutter="16" class="editor-layout">
      <el-col :span="15" class="editor-left-col">
        <el-card class="page-card editor-card">
          <template #header>
            <div class="editor-header">
              <span>{{ texts.editorTitle }}</span>
              <el-space wrap>
                <el-select v-model="draft.styleId" style="width: 180px">
                  <el-option v-for="item in styles" :key="item.id" :label="item.name" :value="item.id" />
                </el-select>
                <el-select v-model="draftLengthMode" style="width: 140px">
                  <el-option :label="texts.simpleMode" value="simple" />
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
              <el-form-item :label="texts.style">
                <el-select v-model="draft.styleId" style="width: 220px">
                  <el-option v-for="item in styles" :key="item.id" :label="item.name" :value="item.id" />
                </el-select>
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
                  <el-option :label="texts.simpleMode" value="simple" />
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
const styles = ref<Array<Record<string, any>>>([]);
const draftLengthMode = ref("medium");

const texts = {
  editorTitle: "稿件编辑",
  refreshVersions: "刷新版本",
  saveDraft: "保存稿件",
  regenerate: "不喜欢，重新生成",
  title: "标题",
  summary: "摘要",
  coverImage: "封面图",
  style: "生成风格",
  titleOptions: "标题备选",
  lengthMode: "稿件篇幅",
  simpleMode: "简单内容",
  mediumMode: "中等内容",
  detailedMode: "详细内容",
  content: "正文",
  status: "状态",
  draftStatus: "草稿",
  readyStatus: "可发布",
  publishedStatus: "已发布",
  qualityTips: "质量提示",
  originality: "原创度估算：",
  noIssue: "暂未发现明显问题",
  preview: "图文预览",
  versions: "版本记录",
  versionPrefix: "第",
  versionSuffix: "版"
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

async function loadStyles() {
  const response = await api.getStyles();
  styles.value = response.data;
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
    styleId: draft.styleId,
    lengthMode: draftLengthMode.value
  });
  ElMessage.success("稿件已保存");
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
  ElMessage.success("已按新的篇幅和风格重新生成");
  await loadVersions();
}

onMounted(async () => {
  await Promise.all([load(), loadStyles(), loadVersions()]);
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
