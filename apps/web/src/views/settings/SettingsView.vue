<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card class="page-card">
          <template #header>
            <div style="font-weight: 700">抓取配置</div>
          </template>
          <el-form label-width="120px">
            <el-form-item label="自动抓取">
              <el-switch v-model="crawl.autoCrawl" />
            </el-form-item>
            <el-form-item label="抓取频率(分钟)">
              <el-input-number v-model="crawl.frequencyMinutes" :min="10" :max="60" />
            </el-form-item>
            <el-form-item label="时间范围(小时)">
              <el-input-number v-model="crawl.withinHours" :min="1" :max="12" />
            </el-form-item>
            <el-form-item label="单平台上限">
              <el-input-number v-model="crawl.maxPerPlatform" :min="5" :max="20" />
            </el-form-item>
            <el-form-item label="平台">
              <el-select v-model="crawl.enabledPlatforms" multiple style="width: 100%">
                <el-option label="抖音" value="douyin" />
                <el-option label="小红书" value="xiaohongshu" />
                <el-option label="微博" value="weibo" />
              </el-select>
            </el-form-item>
            <el-form-item label="关键词">
              <el-input v-model="crawlKeywordText" placeholder="用中文逗号分隔" />
            </el-form-item>
            <el-form-item label="屏蔽词">
              <el-input v-model="blockedWordText" placeholder="用中文逗号分隔" />
            </el-form-item>
            <el-form-item label="屏蔽账号">
              <el-input v-model="blockedAccountText" placeholder="用中文逗号分隔" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveCrawl">保存抓取配置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="page-card">
          <template #header>
            <div style="font-weight: 700">生成配置</div>
          </template>
          <el-form label-width="140px">
            <el-form-item label="自动检测问题">
              <el-switch v-model="generation.autoDetectIssues" />
            </el-form-item>
            <el-form-item label="估算原创度">
              <el-switch v-model="generation.autoEstimateOriginality" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveGeneration">保存生成配置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="page-card" style="margin-top: 16px">
      <template #header>
        <div class="toolbar">
          <span style="font-weight: 700">个人风格模板</span>
          <el-button type="primary" @click="openCreate">新增风格</el-button>
        </div>
      </template>
      <el-table :data="styles" stripe>
        <el-table-column prop="name" label="名称" width="140" />
        <el-table-column prop="description" label="说明" min-width="220" />
        <el-table-column prop="structureTemplate" label="结构" min-width="220" />
        <el-table-column prop="signature" label="署名" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="visible" :title="styleForm.id ? '编辑风格' : '新增风格'" width="760px">
      <el-form label-width="110px">
        <el-form-item label="名称"><el-input v-model="styleForm.name" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="styleForm.description" /></el-form-item>
        <el-form-item label="语气词"><el-input v-model="styleForm.toneWordsText" placeholder="逗号分隔" /></el-form-item>
        <el-form-item label="开头模板"><el-input v-model="styleForm.openingTemplate" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="段落结构"><el-input v-model="styleForm.structureTemplate" /></el-form-item>
        <el-form-item label="结尾模板"><el-input v-model="styleForm.closingTemplate" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="观点模板"><el-input v-model="styleForm.opinionTemplate" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="署名"><el-input v-model="styleForm.signature" /></el-form-item>
        <el-form-item label="适用场景"><el-input v-model="styleForm.sceneTagsText" placeholder="逗号分隔" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="saveStyle">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "../../api/modules";

const crawl = reactive<Record<string, any>>({
  autoCrawl: true,
  frequencyMinutes: 20,
  withinHours: 1,
  maxPerPlatform: 20,
  enabledPlatforms: [],
  keywords: [],
  blockedWords: [],
  blockedAccounts: []
});
const generation = reactive<Record<string, any>>({
  autoDetectIssues: true,
  autoEstimateOriginality: true
});
const styles = ref<Array<Record<string, any>>>([]);
const visible = ref(false);
const styleForm = reactive({
  id: "",
  name: "",
  description: "",
  toneWordsText: "",
  openingTemplate: "",
  structureTemplate: "",
  closingTemplate: "",
  opinionTemplate: "",
  signature: "",
  sceneTagsText: ""
});
const crawlKeywordText = ref("");
const blockedWordText = ref("");
const blockedAccountText = ref("");

function splitByComma(value: string) {
  return value.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
}

async function load() {
  const [crawlRes, generationRes, styleRes] = await Promise.all([
    api.getCrawlSettings(),
    api.getGenerationSettings(),
    api.getStyles()
  ]);
  Object.assign(crawl, crawlRes.data);
  Object.assign(generation, generationRes.data);
  styles.value = styleRes.data;
  crawlKeywordText.value = (crawl.keywords || []).join("，");
  blockedWordText.value = (crawl.blockedWords || []).join("，");
  blockedAccountText.value = (crawl.blockedAccounts || []).join("，");
}

async function saveCrawl() {
  await api.updateCrawlSettings({
    ...crawl,
    keywords: splitByComma(crawlKeywordText.value),
    blockedWords: splitByComma(blockedWordText.value),
    blockedAccounts: splitByComma(blockedAccountText.value)
  });
  ElMessage.success("抓取配置已保存");
}

async function saveGeneration() {
  await api.updateGenerationSettings(generation);
  ElMessage.success("生成配置已保存");
}

function openCreate() {
  Object.assign(styleForm, {
    id: "",
    name: "",
    description: "",
    toneWordsText: "",
    openingTemplate: "",
    structureTemplate: "",
    closingTemplate: "",
    opinionTemplate: "",
    signature: "",
    sceneTagsText: ""
  });
  visible.value = true;
}

function openEdit(row: Record<string, any>) {
  Object.assign(styleForm, {
    id: row.id,
    name: row.name,
    description: row.description,
    toneWordsText: (row.toneWords || []).join("，"),
    openingTemplate: row.openingTemplate,
    structureTemplate: row.structureTemplate,
    closingTemplate: row.closingTemplate,
    opinionTemplate: row.opinionTemplate,
    signature: row.signature,
    sceneTagsText: (row.sceneTags || []).join("，")
  });
  visible.value = true;
}

async function saveStyle() {
  const payload = {
    name: styleForm.name,
    description: styleForm.description,
    toneWords: splitByComma(styleForm.toneWordsText),
    openingTemplate: styleForm.openingTemplate,
    structureTemplate: styleForm.structureTemplate,
    closingTemplate: styleForm.closingTemplate,
    opinionTemplate: styleForm.opinionTemplate,
    signature: styleForm.signature,
    sceneTags: splitByComma(styleForm.sceneTagsText)
  };
  if (styleForm.id) {
    await api.updateStyle(styleForm.id, payload);
  } else {
    await api.createStyle(payload);
  }
  ElMessage.success("风格模板已保存");
  visible.value = false;
  await load();
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
