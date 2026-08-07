<script setup lang="ts">
import { Bug, Code, Info } from '@vicons/fa'
import { Icon } from '@vicons/utils'
import SectionHeading from '@/components/Common/SectionHeading.vue'
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <!-- 页头：仿 ToolHero 渐变 hero -->
    <section class="about-hero">
      <div class="about-hero-icon">
        <Icon size="22"><Info /></Icon>
      </div>
      <div class="about-hero-copy">
        <span class="about-eyebrow">ABOUT THIS TOOLBOX</span>
        <h1>关于工具箱</h1>
        <p>一款免费开源的轻量在线工具箱，包含开发、文本、媒体、图表、生活、查询等实用工具。</p>
      </div>
    </section>

    <!-- 内容卡片 -->
    <div class="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
      <div class="flex flex-col gap-9">
        <section>
          <SectionHeading :icon="Info" title="项目简介" description="关于 Tools-Web" />
          <p class="detail-copy mt-4">
            <el-link href="https://github.com/n1anchen/tools-web" target="_blank" type="primary">Tools-Web</el-link>
            是一款免费开源的轻量在线工具箱，包含开发、文本、媒体、图表、生活、查询等实用工具。如果对您有帮助，请将其分享给您的朋友，并且添加到收藏夹中！顺便再点个 ⭐️ 吧！
          </p>
        </section>

        <section>
          <SectionHeading :icon="Code" title="技术栈" description="构建这个项目所使用的技术" />
          <p class="detail-copy mt-4">
            主要基于 Vite + Vue + Element Plus + TypeScript + Tailwind CSS 开发，某些工具使用了第三方开源库，您可以在仓库的
            <el-link href="https://github.com/n1anchen/tools-web/blob/master/package.json" target="_blank" type="primary">package.json</el-link>
            文件中找到完整的列表。
          </p>
        </section>

        <section>
          <SectionHeading :icon="Bug" title="发现了 Bug？" description="帮助我们变得更好" tone="amber" />
          <p class="detail-copy mt-4">
            如果您发现了 Bug，或者某些功能未能按预期工作，请在 GitHub 仓库的
            <el-link href="https://github.com/n1anchen/tools-web/issues/new" target="_blank" type="primary">issues</el-link>
            中提交错误报告。
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  overflow: hidden;
  padding: 26px 28px;
  border: 1px solid #dbe5f1;
  border-radius: 22px;
  background: linear-gradient(135deg, #eef7ff 0%, #f6f2ff 58%, #fff8ee 100%);
  box-shadow: 0 12px 32px rgba(51, 65, 85, 0.06);
}
.about-hero::after {
  position: absolute;
  right: -70px;
  bottom: -90px;
  width: 230px;
  height: 230px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  content: '';
  filter: blur(4px);
}
.about-hero-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid rgba(151, 179, 214, 0.45);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.8);
  color: #3978f6;
  box-shadow: 0 5px 15px rgba(65, 105, 160, 0.1);
}
.about-hero-copy {
  position: relative;
  z-index: 1;
  min-width: 0;
}
.about-eyebrow {
  display: block;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #5076a7;
}
.about-hero h1 {
  margin: 6px 0 0;
  font-size: 26px;
  font-weight: 850;
  letter-spacing: -0.02em;
  color: #263247;
}
.about-hero p {
  max-width: 680px;
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: #64748b;
}
.dark .about-hero {
  border-color: #334155;
  background: linear-gradient(135deg, #172c40, #241d3b 60%, #302619);
}
.dark .about-hero::after {
  background: rgba(44, 56, 77, 0.28);
}
.dark .about-hero h1 {
  color: #e7edf6;
}
.dark .about-hero p {
  color: #a8b4c5;
}
.dark .about-hero-icon {
  border-color: #40516a;
  background: rgba(15, 23, 42, 0.55);
  color: #c5d2e2;
}
@media (max-width: 640px) {
  .about-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px 20px;
  }
}
</style>