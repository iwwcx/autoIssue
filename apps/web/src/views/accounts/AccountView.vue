<template>
  <div>
    <el-card class="page-card">
      <template #header>
        <div class="toolbar">
          <span style="font-weight: 700">发布账号管理</span>
          <el-button type="primary" @click="openCreate">新增账号</el-button>
        </div>
      </template>

      <el-table :data="accounts" stripe>
        <el-table-column prop="platform" label="平台" width="120" />
        <el-table-column prop="accountName" label="账号名" width="180" />
        <el-table-column prop="accountAlias" label="备注别名" width="180" />
        <el-table-column prop="status" label="状态" width="100" />
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
          <el-select v-model="form.platform" style="width: 100%">
            <el-option v-for="item in appStore.publishPlatforms" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号名">
          <el-input v-model="form.accountName" />
        </el-form-item>
        <el-form-item label="显示别名">
          <el-input v-model="form.accountAlias" />
        </el-form-item>
        <el-form-item label="凭证 JSON">
          <el-input v-model="form.credentialText" type="textarea" :rows="8" placeholder='例如：{"cookie":"xxx","token":"xxx"}' />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="3" />
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
    ElMessage.error("凭证 JSON 格式不正确");
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
</style>
