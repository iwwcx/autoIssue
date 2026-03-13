<template>
  <el-container style="min-height: 100vh">
    <el-aside width="260px" class="sidebar">
      <div class="brand">
        <div class="brand-badge">AI</div>
        <div>
          <div class="brand-title">自媒体新闻引擎</div>
          <div class="brand-subtitle">热点抓取与多平台发布</div>
        </div>
      </div>

      <el-menu router :default-active="route.path" class="menu">
        <el-menu-item index="/dashboard">仪表盘</el-menu-item>
        <el-menu-item index="/hotspots">热点中心</el-menu-item>
        <el-menu-item index="/drafts">稿件中心</el-menu-item>
        <el-menu-item index="/accounts">账号管理</el-menu-item>
        <el-menu-item index="/publish">发布记录</el-menu-item>
        <el-menu-item index="/analytics">数据分析</el-menu-item>
        <el-menu-item index="/settings">系统设置</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div>
          <div class="header-title">自媒体新闻自动生成与发布后台</div>
          <div class="header-subtitle">把抓取、汇总、写稿、发稿串成一条自动化流水线</div>
        </div>
      </el-header>

      <el-main class="main-area">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";

const route = useRoute();
</script>

<style scoped>
.sidebar {
  padding: 20px 16px;
  background: linear-gradient(180deg, #10203d 0%, #1b3460 100%);
  color: white;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 8px 18px;
}

.brand-badge {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-weight: 700;
  background: linear-gradient(135deg, #ffb266 0%, #ff7b54 100%);
  color: #18243a;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
}

.brand-subtitle {
  font-size: 12px;
  opacity: 0.75;
  margin-top: 4px;
}

.menu {
  background: transparent;
  border-right: none;
}

.menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.88);
  border-radius: 12px;
  margin-bottom: 6px;
}

.menu :deep(.el-menu-item.is-active) {
  color: #132642;
  background: #ffce8f;
}

.header {
  display: flex;
  align-items: center;
  padding: 24px 28px 8px;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
}

.header-subtitle {
  font-size: 13px;
  color: #5d6c86;
  margin-top: 6px;
}

.main-area {
  padding: 20px 28px 28px;
}
</style>
