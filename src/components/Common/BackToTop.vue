<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ChevronUp } from '@vicons/tabler'

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
      class="fixed z-[999] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-none bg-[linear-gradient(135deg,#3b82f6,#2563eb)] shadow-[0_4px_14px_rgba(59,130,246,0.45)] outline-none transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(59,130,246,0.55)] active:translate-y-0 active:scale-[0.93] active:shadow-[0_2px_8px_rgba(59,130,246,0.35)]"
      :style="{ right: `${right}px`, bottom: `${bottom}px` }"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <el-icon :size="18" color="white"><ChevronUp /></el-icon>
    </button>
  </Transition>
</template>

<style scoped>
/* 进入 / 离开动画（Vue Transition 钩子类） */
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
