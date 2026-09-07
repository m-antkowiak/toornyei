import { createRouter, createWebHistory } from 'vue-router'
import FightView from '../views/FightView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'fight',
      component: FightView,
    },
  ],
})

export default router
