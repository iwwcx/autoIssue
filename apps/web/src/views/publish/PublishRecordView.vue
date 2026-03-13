<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="10">
        <el-card class="page-card">
          <template #header>
            <div style="font-weight: 700">创建发布任务</div>
          </template>
          <el-form label-width="110px">
            <el-form-item label="选择稿件">
              <el-select v-model="form.draftId" style="width: 100%">
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
                  <el-select v-model="target.platform" placeholder="平台" style="width: 40%">
                    <el-option v-for="item in appStore.publishPlatforms" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                  <el-select v-model="target.accountId" placeholder="账号" style="width: 45%">
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
                <el-button type="primary" @click="createJob">提交发布任务</el-button>
                <el-button @click="refreshMetrics">刷新数据</el-button>
              </el-space>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card class="page-card">
          <template #header>
            <div style="font-weight: 700">发布记录</div>
          </template>
          <el-table :data="records" stripe>
            <el-table-column prop="draftTitle" label="稿件标题" min-width="240" />
            <el-table-column prop="mode" label="模式" width="100" />
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column prop="scheduledAt" label="发布时间" width="180" />
            <el-table-column label="目标结果" min-width="240">
              <template #default="scope">
                <div v-for="item in scope.row.targets" :key="item.id" class="target-result">
                  {{ item.platform }} / {{ item.status }} / {{ item.resultMessage }}
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button link type="primary" @click="execute(scope.row.id)">立即执行</el-button>
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
import { api } from "../../api/modules";
import { useAppStore } from "../../stores/app";

const appStore = useAppStore();
const drafts = ref<Array<Record<string, any>>>([]);
const accounts = ref<Array<Record<string, any>>>([]);
const records = ref<Array<Record<string, any>>>([]);
const form = reactive({
  draftId: "",
  scheduledAt: "",
  targets: [{ platform: "netease", accountId: "" }]
});

function filteredAccounts(platform: string) {
  return accounts.value.filter((item) => item.platform === platform);
}

async function loadBase() {
  const [draftRes, accountRes, recordRes] = await Promise.all([
    api.getDrafts(),
    api.getAccounts(),
    api.getPublishRecords()
  ]);
  drafts.value = draftRes.data;
  accounts.value = accountRes.data;
  records.value = recordRes.data;
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

  await api.createPublishJob({
    draftId: form.draftId,
    scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
    targets: validTargets
  });
  ElMessage.success("发布任务已创建");
  form.targets = [{ platform: "netease", accountId: "" }];
  form.scheduledAt = "";
  await loadBase();
}

async function execute(id: string) {
  await api.executeJob(id);
  ElMessage.success("任务已执行");
  await loadBase();
}

async function refreshMetrics() {
  await api.refreshMetrics();
  ElMessage.success("数据已刷新");
  await loadBase();
}

onMounted(loadBase);
</script>

<style scoped>
.target-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.target-result {
  margin-bottom: 6px;
  color: #51617b;
}
</style>

