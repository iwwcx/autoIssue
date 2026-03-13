import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "../layouts/AdminLayout.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AdminLayout,
      redirect: "/dashboard",
      children: [
        {
          path: "/dashboard",
          component: () => import("../views/dashboard/DashboardView.vue")
        },
        {
          path: "/hotspots",
          component: () => import("../views/hotspots/HotspotListView.vue")
        },
        {
          path: "/drafts",
          component: () => import("../views/drafts/DraftListView.vue")
        },
        {
          path: "/drafts/:id",
          component: () => import("../views/drafts/DraftEditorView.vue")
        },
        {
          path: "/accounts",
          component: () => import("../views/accounts/AccountView.vue")
        },
        {
          path: "/publish",
          component: () => import("../views/publish/PublishRecordView.vue")
        },
        {
          path: "/analytics",
          component: () => import("../views/analytics/AnalyticsView.vue")
        },
        {
          path: "/settings",
          component: () => import("../views/settings/SettingsView.vue")
        }
      ]
    }
  ]
});

export default router;
