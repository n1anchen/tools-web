<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'
import { removeAllParams } from '@/utils/url'

const title = '短链接解析'

// 云函数 API 地址（通过环境变量配置）
const apiBase = import.meta.env.VITE_UNSHORTEN_API as string | undefined
const isConfigured = computed(() => !!apiBase)

// 表单状态
const inputUrl = ref('')
const enableFollow = ref(false)
const maxHops = ref(5)
const loading = ref(false)

// 结果状态
const resultVisible = ref(false)
const finalUrl = ref('')
const chain = ref<string[]>([])

const resolve = async () => {
  if (!inputUrl.value.trim()) {
    ElMessage.warning('请输入短链接')
    return
  }

  // 简单的 URL 格式校验
  try {
    const u = new URL(inputUrl.value.trim())
    if (!['http:', 'https:'].includes(u.protocol)) {
      throw new Error()
    }
  } catch {
    ElMessage.error('请输入合法的 http/https 链接')
    return
  }

  loading.value = true
  resultVisible.value = false

  try {
    const params = new URLSearchParams({
      url: inputUrl.value.trim(),
      follow: String(enableFollow.value),
      maxHops: String(maxHops.value),
    })

    const resp = await fetch(`${apiBase}?${params.toString()}`)
    const data = await resp.json()

    if (!resp.ok) {
      throw new Error(data.error || `请求失败 (${resp.status})`)
    }

    // 清理最终 URL 的所有参数
    finalUrl.value = removeAllParams(data.finalUrl)
    chain.value = data.chain || []
    resultVisible.value = true
  } catch (err: any) {
    ElMessage.error(err.message || '解析失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const copyResult = () => {
  copy(finalUrl.value)
}

const clear = () => {
  inputUrl.value = ''
  resultVisible.value = false
  finalUrl.value = ''
  chain.value = []
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <!-- 未配置提示 -->
    <el-alert
      v-if="!isConfigured"
      title="功能未启用"
      type="warning"
      :closable="false"
      show-icon
      class="mb-4"
      description="短链接解析需要配置云函数接口地址，请在环境变量中设置 VITE_UNSHORTEN_API 后重新构建。"
    />

    <!-- 输入区 -->
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div class="flex gap-2">
        <el-input
          v-model="inputUrl"
          :disabled="!isConfigured"
          placeholder="输入短链接，如 https://t.cn/xxxxxx"
          size="large"
          clearable
          @keyup.enter="resolve"
          class="flex-1"
        />
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          :disabled="!isConfigured || !inputUrl.trim()"
          @click="resolve"
        >
          解析
        </el-button>
        <el-button
          size="large"
          :disabled="!isConfigured"
          @click="clear"
        >
          清空
        </el-button>
      </div>

      <!-- 多跳追踪开关 -->
      <div class="mt-4 flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <el-switch
            v-model="enableFollow"
            :disabled="!isConfigured"
            active-text="多跳追踪"
            inactive-text="单跳模式"
          />
          <el-tooltip content="开启后追踪完整跳转链路，关闭则只获取第一跳目标地址" placement="top">
            <el-icon class="text-slate-400 cursor-help"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>

        <Transition name="fade">
          <div v-if="enableFollow" class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>最大跳数</span>
            <el-slider
              v-model="maxHops"
              :min="2"
              :max="10"
              :step="1"
              :show-tooltip="true"
              :disabled="!isConfigured"
              style="width: 120px"
            />
            <span class="w-4 text-center font-medium text-slate-700 dark:text-slate-300">{{ maxHops }}</span>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 结果区 -->
    <Transition name="slide-up">
      <div
        v-if="resultVisible"
        class="mt-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
      >
        <div class="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">解析结果</div>

        <!-- 最终链接 -->
        <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
          <div class="flex-1 min-w-0">
            <a
              :href="finalUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 dark:text-blue-400 hover:underline break-all text-sm font-medium"
            >
              {{ finalUrl }}
            </a>
          </div>
          <div class="flex flex-row gap-1 flex-shrink-0">
            <el-button
              type="primary"
              plain
              size="small"
              style="width: 56px"
              @click="copyResult"
            >
              复制
            </el-button>
            <el-button
              type="success"
              plain
              size="small"
              style="width: 56px; margin-left: 0"
              tag="a"
              :href="finalUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              访问
            </el-button>
          </div>
        </div>

        <!-- 跳转链路（始终展示，只要 chain 有内容） -->
        <div v-if="chain.length > 0" class="mt-4">
          <div class="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
            跳转链路（共 {{ chain.length }} 条）
          </div>
          <el-timeline style="padding-left: 0; margin-top: 0;">
            <el-timeline-item
              v-for="(hop, index) in chain"
              :key="index"
              :type="index === chain.length - 1 ? 'primary' : 'info'"
              :hollow="index !== chain.length - 1"
              size="normal"
            >
              <span class="text-xs text-slate-600 dark:text-slate-300 break-all leading-5">{{ hop }}</span>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </Transition>

    <!-- 描述区 -->
    <ToolDetail title="描述">
      <el-text>
        输入短链接，自动追踪 HTTP 重定向，获取完整的原始链接，并移除所有 URL 参数（包含跟踪参数）。
        支持多跳追踪模式，可查看完整跳转链路。
      </el-text>
    </ToolDetail>
  </div>
</template>

<script lang="ts">
import { InfoFilled } from '@element-plus/icons-vue'
export default { components: { InfoFilled } }
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: all 0.25s ease-out;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
</style>
