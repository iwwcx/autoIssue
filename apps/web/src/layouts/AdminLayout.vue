<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="sidebar-inner">
        <div class="brand">
          <div class="brand-badge">AI</div>
          <div>
            <div class="brand-title">{{ texts.brandTitle }}</div>
            <div class="brand-subtitle">{{ texts.brandSubtitle }}</div>
          </div>
        </div>

        <el-menu router :default-active="route.path" class="menu">
          <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
            {{ item.label }}
          </el-menu-item>
        </el-menu>
      </div>
    </aside>

    <section class="workspace">
      <header class="header">
        <div>
          <div class="header-title">{{ texts.headerTitle }}</div>
          <div class="header-subtitle">{{ texts.headerSubtitle }}</div>
        </div>
      </header>

      <main class="main-area">
        <RouterView />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";

const route = useRoute();

const texts = {
  brandTitle: "\u81ea\u5a92\u4f53\u65b0\u95fb\u5f15\u64ce",
  brandSubtitle: "\u70ed\u70b9\u6293\u53d6\u4e0e\u591a\u5e73\u53f0\u53d1\u5e03",
  headerTitle: "\u81ea\u5a92\u4f53\u65b0\u95fb\u81ea\u52a8\u751f\u6210\u4e0e\u53d1\u5e03\u540e\u53f0",
  headerSubtitle: "\u628a\u6293\u53d6\u3001\u6c47\u603b\u3001\u5199\u7a3f\u3001\u53d1\u7a3f\u4e32\u6210\u4e00\u6761\u81ea\u52a8\u5316\u6d41\u6c34\u7ebf"
};

const menuItems = [
  { path: "/dashboard", label: "\u4eea\u8868\u76d8" },
  { path: "/hotspots", label: "\u70ed\u70b9\u4e2d\u5fc3" },
  { path: "/drafts", label: "\u7a3f\u4ef6\u4e2d\u5fc3" },
  { path: "/accounts", label: "\u8d26\u53f7\u7ba1\u7406" },
  { path: "/publish", label: "\u53d1\u5e03\u8bb0\u5f55" },
  { path: "/analytics", label: "\u6570\u636e\u5206\u6790" },
  { path: "/settings", label: "\u7cfb\u7edf\u8bbe\u7f6e" }
];
</script>

<style scoped>
.admin-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  flex: 0 0 260px;
  height: 100vh;
  background: linear-gradient(180deg, #10203d 0%, #1b3460 100%);
  color: white;
  box-shadow: 12px 0 32px rgba(13, 31, 63, 0.16);
}

.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 20px 16px;
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
  flex: 1;
  background: transparent;
  border-right: none;
}

.menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.88);
  border-radius: 12px;
  margin-bottom: 6px;
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.menu :deep(.el-menu-item:hover) {
  background: rgba(122, 164, 255, 0.28);
  color: #ffffff;
}

.menu :deep(.el-menu-item.is-active) {
  color: #132642;
  background: #ffce8f;
}

.menu :deep(.el-menu-item.is-active:hover) {
  background: #ffd59d;
  color: #132642;
  transform: none;
}

.workspace {
  flex: 1;
  min-width: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  padding: 24px 28px 8px;
  background: transparent;
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
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 28px 28px;
}

@media (max-width: 1200px) {
  .sidebar {
    width: 228px;
    flex-basis: 228px;
  }

  .header {
    padding: 20px 22px 8px;
  }

  .main-area {
    padding: 18px 22px 24px;
  }
}
</style>