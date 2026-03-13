<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<style>
:root {
  color-scheme: light;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  background: #f4f7fb;
  color: #16233b;
}

html,
body,
#app {
  height: 100%;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(65, 117, 255, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #eef3fb 100%);
}

#app {
  height: 100vh;
  overflow: hidden;
}

.page-card {
  border-radius: 18px;
  border: 1px solid rgba(21, 53, 107, 0.08);
  box-shadow: 0 16px 42px rgba(26, 55, 110, 0.08);
}

.metric-card {
  border-radius: 18px;
  overflow: hidden;
}
</style>