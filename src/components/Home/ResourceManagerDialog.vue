<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Download, Refresh } from '@element-plus/icons-vue'
import { Icon } from '@vicons/utils'
import { Hdd } from '@vicons/fa'
import {
  MANAGED_RESOURCE_GROUPS,
  cacheManagedResourceGroup,
  clearManagedResourceGroup,
  formatResourceBytes,
  getManagedResourceStatuses,
  type ManagedResourceId,
  type ManagedResourceStatus,
} from '@/utils/resourceManager'

const visible = defineModel<boolean>({ default: false })

const loading = ref(false)
const busyId = ref<ManagedResourceId | null>(null)
const statuses = ref<Partial<Record<ManagedResourceId, ManagedResourceStatus>>>({})

const resourceRows = computed(() => {
  return MANAGED_RESOURCE_GROUPS.map(group => ({
    group,
    status: statuses.value[group.id],
  }))
})

watch(visible, value => {
  if (value) refreshStatuses()
})

const refreshStatuses = async () => {
  loading.value = true
  try {
    statuses.value = await getManagedResourceStatuses()
  } catch {
    ElMessage.error('资源缓存状态读取失败')
  } finally {
    loading.value = false
  }
}

const toggleResource = async (id: ManagedResourceId, enabled: boolean) => {
  const group = MANAGED_RESOURCE_GROUPS.find(item => item.id === id)
  if (!group) return

  busyId.value = id
  try {
    if (enabled) {
      await cacheManagedResourceGroup(group)
      ElMessage.success(`${group.title}已缓存`)
    } else {
      await clearManagedResourceGroup(group)
      ElMessage.success(`${group.title}缓存已清理`)
    }
    await refreshStatuses()
  } catch {
    ElMessage.error(enabled ? `${group.title}缓存失败` : `${group.title}清理失败`)
  } finally {
    busyId.value = null
  }
}

const clearRuntimeCache = async (id: ManagedResourceId) => {
  const group = MANAGED_RESOURCE_GROUPS.find(item => item.id === id)
  if (!group) return

  busyId.value = id
  try {
    await clearManagedResourceGroup(group)
    ElMessage.success(`${group.title}已清理`)
    await refreshStatuses()
  } catch {
    ElMessage.error(`${group.title}清理失败`)
  } finally {
    busyId.value = null
  }
}

const progressPercentage = (status?: ManagedResourceStatus) => {
  if (!status?.totalCount) return status?.cachedCount ? 100 : 0
  return Math.round(status.cachedCount / status.totalCount * 100)
}

const statusText = (status?: ManagedResourceStatus) => {
  if (!status?.supported) return '当前浏览器不支持'
  if (status.complete) return '已完整缓存'
  if (status.partial) return '部分缓存'
  return '未缓存'
}

const statusTagType = (status?: ManagedResourceStatus) => {
  if (!status?.supported) return 'info'
  if (status.complete) return 'success'
  if (status.partial) return 'warning'
  return 'info'
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="min(720px, calc(100vw - 24px))"
    top="4vh"
    class="resource-manager-dialog"
  >
    <!-- 自定义标题：图标 + 主标题 + 副标题（与 PrivacyNotice 弹窗风格一致） -->
    <template #header>
      <div class="flex items-center gap-3 px-1">
        <span class="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-100 dark:bg-[color:color-mix(in_srgb,var(--c-primary-900)_40%,transparent)] text-primary-600 dark:text-primary-400 flex-shrink-0">
          <Icon size="17"><Hdd /></Icon>
        </span>
        <div>
          <p class="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">资源管理</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">管理离线缓存的大型可选资源</p>
        </div>
      </div>
    </template>

    <div class="flex flex-col gap-3" v-loading="loading">
      <div class="flex items-start justify-between gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3
                  dark:border-[color:color-mix(in_srgb,var(--c-primary-900)_70%,transparent)] dark:bg-[color:color-mix(in_srgb,var(--c-primary-900)_40%,transparent)]">
        <div>
          <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">离线资源缓存</div>
          <div class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            可将大型可选资源提前缓存到本机，也可以清理不常用资源释放空间。
          </div>
        </div>
        <el-button size="small" :icon="Refresh" :loading="loading" @click="refreshStatuses">
          刷新
        </el-button>
      </div>

      <div
        v-for="{ group, status } in resourceRows"
        :key="group.id"
        class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="flex flex-col gap-3 c-sm:flex-row c-sm:items-start c-sm:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ group.title }}</h3>
              <el-tag size="small" :type="statusTagType(status)">{{ statusText(status) }}</el-tag>
              <el-tag v-if="group.cacheable" size="small" type="info" effect="plain">
                {{ formatResourceBytes(status?.estimatedBytes || group.estimatedBytes || 0) }}
              </el-tag>
            </div>
            <p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {{ group.description }}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <template v-if="group.cacheable">
              <span class="text-xs text-slate-500 dark:text-slate-400">离线缓存</span>
              <el-switch
                :model-value="Boolean(status?.enabled)"
                :loading="busyId === group.id"
                :disabled="!status?.supported"
                width="52"
                @change="value => toggleResource(group.id, Boolean(value))"
              />
            </template>
            <el-button
              v-else
              size="small"
              :icon="Delete"
              :loading="busyId === group.id"
              :disabled="!status?.supported || !status?.cachedCount"
              @click="clearRuntimeCache(group.id)"
            >
              清理
            </el-button>
          </div>
        </div>

        <div class="mt-3 flex flex-col gap-2 c-sm:flex-row c-sm:items-center">
          <el-progress
            class="min-w-0 flex-1"
            :percentage="progressPercentage(status)"
            :stroke-width="8"
            :show-text="false"
          />
          <div class="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 c-sm:w-48">
            <span v-if="status?.totalCount">
              {{ status.cachedCount }} / {{ status.totalCount }} 项
            </span>
            <span v-else>
              {{ status?.cachedCount || 0 }} 项
            </span>
            <span>{{ formatResourceBytes(status?.estimatedCachedBytes || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between gap-3">
        <div class="hidden items-center gap-1 text-xs text-slate-400 dark:text-slate-500 c-sm:flex">
          <el-icon><Download /></el-icon>
          <span>运行时缓存可能会在访问相关工具后重新生成</span>
        </div>
        <el-button @click="visible = false">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
:deep(.resource-manager-dialog) {
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 8vh);
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

:deep(.resource-manager-dialog .el-dialog__body) {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

:deep(.resource-manager-dialog .el-dialog__footer) {
  flex-shrink: 0;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

@media (max-width: 640px) {
  :deep(.resource-manager-dialog) {
    max-height: calc(100dvh - 24px);
    margin-top: 12px !important;
  }

  :deep(.resource-manager-dialog .el-dialog__header) {
    padding: 14px 16px 8px;
  }

  :deep(.resource-manager-dialog .el-dialog__body) {
    padding: 12px;
  }

  :deep(.resource-manager-dialog .el-dialog__footer) {
    padding: 10px 12px 12px;
  }
}
</style>
