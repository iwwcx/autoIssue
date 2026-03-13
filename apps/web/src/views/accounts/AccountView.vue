<template>
  <div>
    <el-card class="page-card">
      <template #header>
        <div class="toolbar">
          <span style="font-weight: 700">发布账号管理</span>
          <el-button type="primary" @click="openCreate">新增账号</el-button>
        </div>
      </template>

      <el-table :data="accounts" stripe empty-text="暂无账号数据">
        <el-table-column label="平台" width="130">
          <template #default="scope">
            <el-tag :class="platformTagClass(scope.row.platform)" class="soft-tag" effect="light">
              {{ platformLabel(scope.row.platform) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="accountName" label="账号名" width="180" />
        <el-table-column prop="accountAlias" label="备注别名" width="180" />
        <el-table-column label="状态" width="110">
          <template #default="scope">
            <el-tag :class="accountStatusTagClass(scope.row.status)" class="soft-tag" effect="light">
              {{ accountStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="credentialPreview" label="凭证预览" min-width="260" show-overflow-tooltip />
        <el-table-column label="操作" width="260">
          <template #default="scope">
            <el-space>
              <el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button>
              <el-button link @click="check(scope.row.id)">检测</el-button>
              <el-button link type="danger" @click="remove(scope.row.id)">删除</el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="visible" :title="form.id ? '编辑账号' : '新增账号'" width="680px">
      <el-form label-width="100px">
        <el-form-item label="平台">
          <el-select v-model="form.platform" placeholder="请选择平台" style="width: 100%">
            <el-option v-for="item in appStore.publishPlatforms" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号名">
          <el-input v-model="form.accountName" placeholder="输入账号名称" />
        </el-form-item>
        <el-form-item label="显示别名">
          <el-input v-model="form.accountAlias" placeholder="输入便于识别的别名" />
        </el-form-item>
        <el-form-item label="凭证内容">
          <el-input v-model="form.credentialText" type="textarea" :rows="8" placeholder='例如：{"cookie":"xxx","token":"xxx"}' />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="3" placeholder="补充说明这个账号的用途" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../../api/modules";
import { useAppStore } from "../../stores/app";
import {
  accountStatusLabel,
  accountStatusTagClass,
  platformLabel,
  platformTagClass
} from "../../shared/display";

const appStore = useAppStore();
const accounts = ref<Array<Record<string, any>>>([]);
const visible = ref(false);
const form = reactive({
  id: "",
  platform: "netease",
  accountName: "",
  accountAlias: "",
  credentialText: '{"cookie":"demo-cookie"}',
  note: ""
});

async function load() {
  const response = await api.getAccounts();
  accounts.value = response.data;
}

function openCreate() {
  Object.assign(form, {
    id: "",
    platform: "netease",
    accountName: "",
    accountAlias: "",
    credentialText: '{"cookie":"demo-cookie"}',
    note: ""
  });
  visible.value = true;
}

function openEdit(row: Record<string, any>) {
  Object.assign(form, {
    id: row.id,
    platform: row.platform,
    accountName: row.accountName,
    accountAlias: row.accountAlias,
    credentialText: row.credentialPreview || '{"cookie":"demo-cookie"}',
    note: row.note || ""
  });
  visible.value = true;
}

async function save() {
  let credential: Record<string, unknown> = {};
  try {
    credential = JSON.parse(form.credentialText || "{}");
  } catch {
    ElMessage.error("凭证内容格式不正确");
    return;
  }

  const payload = {
    platform: form.platform,
    accountName: form.accountName,
    accountAlias: form.accountAlias,
    credential,
    note: form.note
  };

  if (form.id) {
    await api.updateAccount(form.id, payload);
  } else {
    await api.createAccount(payload);
  }

  ElMessage.success("账号已保存");
  visible.value = false;
  await load();
}

async function check(id: string) {
  await api.checkAccount(id);
  ElMessage.success("已完成账号检测");
  await load();
}

async function remove(id: string) {
  await ElMessageBox.confirm("确认删除该账号吗？", "提示", { type: "warning" });
  await api.deleteAccount(id);
  ElMessage.success("已删除");
  await load();
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
.status-processed { color: #047857; background: rgba(52, 211, 153, 0.18); }
.status-ignored { color: #6b7280; background: rgba(156, 163, 175, 0.18); }
.status-failed { color: #b91c1c; background: rgba(252, 165, 165, 0.22); }
</style>
