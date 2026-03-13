<template>
  <div>
    <el-card class="page-card" shadow="never">
      <el-form :inline="true" :model="filters">
        <el-form-item label="平台">
          <el-select v-model="filters.platform" clearable style="width: 140px">
            <el-option label="抖音" value="douyin" />
            <el-option label="小红书" value="xiaohongshu" />
            <el-option label="微博" value="weibo" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.topicType" clearable style="width: 140px">
            <el-option label="科技" value="科技" />
            <el-option label="民生" value="民生" />
            <el-option label="娱乐" value="娱乐" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable style="width: 140px">
            <el-option label="待处理" value="pending" />
            <el-option label="已处理" value="processed" />
            <el-option label="忽略" value="ignored" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="标题、正文、标签" style="width: 220px" />
        </el-form-item>
        <el-form-item label="生成风格">
          <el-select v-model="selectedStyleId" clearable placeholder="默认风格" style="width: 180px">
            <el-option v-for="item in styles" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">筛选</el-button>
          <el-button @click="runCrawler">立即抓取</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-card" style="margin-top: 16px">
      <el-table :data="tableData.list" stripe>
        <el-table-column prop="title" label="热点标题" min-width="260" />
        <el-table-column prop="platform" label="平台" width="120" />
        <el-table-column prop="topicType" label="分类" width="100" />
        <el-table-column prop="accountName" label="发布账号" width="140" />
        <el-table-column prop="heatScore" label="热度" width="110" />
        <el-table-column prop="status" label="状态" width="110" />
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="scope">
            <el-space wrap>
              <el-button size="small" @click="aggregate(scope.row.id)">汇总</el-button>
              <el-button size="small" type="primary" @click="generate(scope.row.id)">生成稿件</el-button>
              <el-button size="small" @click="mark(scope.row.id, 'processed')">标已处理</el-button>
              <el-button size="small" type="danger" @click="remove(scope.row.id)">删除</el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="tableData.total"
          :page-size="filters.pageSize"
          v-model:current-page="filters.page"
          @current-change="load"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import { api } from "../../api/modules";

const router = useRouter();
const selectedStyleId = ref("");
const styles = ref<Array<Record<string, any>>>([]);
const filters = reactive({
  platform: "",
  topicType: "",
  status: "",
  keyword: "",
  page: 1,
  pageSize: 10
});
const tableData = reactive({
  total: 0,
  list: [] as Array<Record<string, unknown>>
});

async function load() {
  const response = await api.getHotspots(filters);
  Object.assign(tableData, response.data);
}

async function loadStyles() {
  const response = await api.getStyles();
  styles.value = response.data;
}

async function runCrawler() {
  await api.runCrawler();
  ElMessage.success("抓取完成");
  await load();
}

async function aggregate(id: string) {
  await api.aggregateHotspot(id);
  ElMessage.success("汇总完成");
}

async function generate(id: string) {
  const response = await api.generateDraft({ hotspotId: id, styleId: selectedStyleId.value || undefined });
  ElMessage.success("稿件已生成");
  router.push(`/drafts/${response.data.id}`);
}

async function mark(id: string, status: string) {
  await api.updateHotspotStatus(id, status);
  ElMessage.success("状态已更新");
  await load();
}

async function remove(id: string) {
  await ElMessageBox.confirm("确认删除这条热点吗？", "提示", { type: "warning" });
  await api.deleteHotspot(id);
  ElMessage.success("已删除");
  await load();
}

onMounted(async () => {
  await Promise.all([load(), loadStyles()]);
});
</script>

<style scoped>
.pagination {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}
</style>
