<template>
  <el-switch
    v-model="isDark"
    inline-prompt
    active-text="Dark"
    inactive-text="Light"
  />
</template>

<script setup lang="ts">
import { useSettingStore } from '@/store/modules/setting'
import { storeToRefs } from 'pinia'

const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)
</script>
