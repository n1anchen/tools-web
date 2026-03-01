<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { AngleUp } from '@vicons/fa'

const props = withDefaults(defineProps<{
  threshold?: number
  right?: number
  bottom?: number
}>(), {
  threshold: 200,
  right: 20,
  bottom: 60,
})

const visible = ref(false)

const onScroll = () => {
  visible.value = window.scrollY >= props.threshold
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <Transition name="back-to-top">
    <button
      v-show="visible"
      class="back-to-top-btn"
      :style="{ right: `${right}px`, bottom: `${bottom}px` }"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <el-icon :size="18" color="white"><AngleUp /></el-icon>
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top-btn {
  position: fixed;
  z-index: 999;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}

.back-to-top-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.55);
}

.back-to-top-btn:active {
  transform: translateY(0) scale(0.93);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
}

/* 进入 / 离开动画 */
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.85);
}
</style>
