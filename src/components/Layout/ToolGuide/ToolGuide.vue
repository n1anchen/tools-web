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
  <section class="tool-guide">
    <header>
      <div>
        <span>{{ props.eyebrow }}</span>
        <h3>{{ props.title }}</h3>
      </div>
      <p>{{ props.description }}</p>
    </header>
    <div class="guide-content"><slot /></div>
  </section>
</template>

<style scoped>
.tool-guide{overflow:hidden;margin-top:14px;border:1px solid #dce6f1;border-radius:22px;background:#fff;box-shadow:0 10px 28px rgba(51,65,85,.05)}
.tool-guide>header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:20px 22px;border-bottom:1px solid #e4ebf2;background:linear-gradient(135deg,#f6f9fd,#fbf8ff)}
.tool-guide header span{font-size:12px;font-weight:800;letter-spacing:.14em;color:#5076a7}.tool-guide h3{margin:4px 0 0;font-size:20px;color:#263247}.tool-guide header p{max-width:480px;margin:0;font-size:13px;line-height:1.7;color:#718096;text-align:right}.guide-content{padding:20px 22px}
.dark .tool-guide{border-color:#334155;background:#111b2b}.dark .tool-guide>header{border-color:#334155;background:linear-gradient(135deg,#172033,#211b31)}.dark .tool-guide h3{color:#e7edf6}.dark .tool-guide header p{color:#9facbd}
@media(max-width:640px){.tool-guide>header{align-items:flex-start;flex-direction:column;gap:7px;padding:17px 16px}.tool-guide header p{text-align:left}.guide-content{padding:16px}}
</style>
