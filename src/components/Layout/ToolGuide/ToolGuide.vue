<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  eyebrow?: string
  description?: string
}>(), {
  title: '使用指南',
  eyebrow: 'GUIDE & NOTES',
  description: '了解推荐流程、输出规则和使用边界。',
})
</script>

<template>
  <section class="mt-3.5 overflow-hidden rounded-[22px] border border-[#dce6f1] bg-white shadow-[0_10px_28px_rgba(51,65,85,0.05)] dark:border-[#334155] dark:bg-[#111b2b]">
    <header class="flex items-end justify-between gap-6 border-b border-[#e4ebf2] bg-[linear-gradient(135deg,#f6f9fd,#fbf8ff)] px-[22px] py-5 dark:border-[#334155] dark:bg-[linear-gradient(135deg,#172033,#211b31)] [@media(max-width:640px)]:flex-col [@media(max-width:640px)]:items-start [@media(max-width:640px)]:gap-[7px] [@media(max-width:640px)]:px-4 [@media(max-width:640px)]:py-[17px]">
      <div>
        <span class="text-xs font-extrabold tracking-[0.14em] text-[#5076a7]">{{ props.eyebrow }}</span>
        <h3 class="mt-1 text-xl text-[#263247] dark:text-[#e7edf6]">{{ props.title }}</h3>
      </div>
      <p class="m-0 max-w-[480px] text-right text-[13px] leading-[1.7] text-[#718096] dark:text-[#9facbd] [@media(max-width:640px)]:text-left">{{ props.description }}</p>
    </header>
    <div class="px-[22px] py-5 [@media(max-width:640px)]:p-4"><slot /></div>
  </section>
</template>
