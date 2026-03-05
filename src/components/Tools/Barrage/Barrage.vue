<script setup lang="ts">
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import vueDanmaku from 'vue-danmaku'  //https://www.npmjs.com/package/vue-danmaku

// 屏幕方向：landscape=横屏，portrait=竖屏
type Orientation = 'landscape' | 'portrait'

// 根据方向计算初始字号：短边 × 80% 取整
const calcDefaultTextSize = (orientation: Orientation) => {
  const shortEdge = orientation === 'landscape' ? window.innerHeight : window.innerWidth
  return Math.round(shortEdge * 0.8)
}

const info = reactive({
  title: "手持弹幕",
  content: '在线工具箱',
  barrage: [] as string[],
  speed: 200,
  textSize: 0, // 由 onMounted 根据屏幕方向初始化
  textColor: '#FFFFFF',
  bgColor: '#000000',
  channels: 1, // 轨道数量
  isPlay: false,
  // 手动锁定方向，auto 表示跟随页面长宽比自动判断
  orientationLock: 'auto' as 'auto' | Orientation,
})

const danmakuFullRef = ref<InstanceType<typeof vueDanmaku> | null>(null)

// 当前实际屏幕方向（由 resize 监听更新）
const screenOrientation = ref<Orientation>(
  window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait'
)

// 最终生效的方向：auto 时跟随屏幕比例，否则使用手动设置
const activeOrientation = computed<Orientation>(() =>
  info.orientationLock === 'auto' ? screenOrientation.value : info.orientationLock
)

// 弹幕文字样式：垂直居中，高度撑满容器
const danmuTextStyle = computed(() => {
  // 横屏容器高 = 100vh，竖屏旋转后视觉高 = 100vw（对应容器的 height: 100vw）
  const containerHeight = activeOrientation.value === 'landscape' ? '100vh' : '100vw'
  return {
    color: info.textColor,
    fontSize: info.textSize + 'px',
    height: containerHeight,
    display: 'flex',
    alignItems: 'center',
    lineHeight: '1',
  }
})

// 根据方向决定容器旋转角度与尺寸
// 竖屏模式：顺时针旋转 90°，让弹幕在视觉上从上往下滚动（适合手持竖屏观看）
const danmakuWrapStyle = computed(() => {
  const base = {
    zIndex: 99,
    position: 'fixed' as const,
    backgroundColor: info.bgColor,
    visibility: info.isPlay ? 'visible' as const : 'hidden' as const,
  }
  if (activeOrientation.value === 'landscape') {
    return {
      ...base,
      top: '0px',
      left: '0px',
      width: '100vw',
      height: '100vh',
      transform: 'none',
      transformOrigin: 'center center',
    }
  } else {
    // 竖屏：宽高对调后顺时针旋转 90°
    // 容器左上角定位在 (0, 0)，旋转原点取容器左上角
    // rotate(90deg) 后容器向右偏出屏幕，用 translateY(-100%) 往上拉回即可覆盖全屏
    // 即：transform: rotate(90deg) translateY(-100%)  （先旋转再沿新 Y 轴平移）
    return {
      ...base,
      top: '0px',
      left: '0px',
      width: '100vh',
      height: '100vw',
      transform: 'rotate(90deg) translateY(-100%)',
      transformOrigin: 'top left',
    }
  }
})

// 全屏播放 / 双击退出全屏并暂停
const fullScreenPlay = () => {
  if (info.isPlay) {
    danmakuFullRef.value?.stop()
    info.isPlay = false
  } else {
    info.barrage = [info.content]
    info.isPlay = true
    // 等待样式生效后再启动
    setTimeout(() => {
      danmakuFullRef.value?.resize()
      danmakuFullRef.value?.play()
    }, 50)
  }
}

// 颜色变化时同步背景色（通过 computed 样式已响应，无需额外操作，但保留供 el-color-picker @change 调用）
const onBgColorChange = () => {}

// 监听窗口尺寸变化，更新屏幕方向，并在未播放时重置默认字号
const updateOrientation = () => {
  const newOrientation: Orientation = window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait'
  screenOrientation.value = newOrientation
  if (info.isPlay) {
    danmakuFullRef.value?.resize()
  } else {
    info.textSize = calcDefaultTextSize(activeOrientation.value)
  }
}

onMounted(() => {
  info.textSize = calcDefaultTextSize(activeOrientation.value)
  window.addEventListener('resize', updateOrientation)
})
onUnmounted(() => window.removeEventListener('resize', updateOrientation))
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <!-- 全屏弹幕容器 -->
    <vue-danmaku
      ref="danmakuFullRef"
      v-model:danmus="info.barrage"
      loop
      :autoplay="false"
      :speeds="info.speed"
      :channels="info.channels"
      :style="danmakuWrapStyle"
      @dblclick="fullScreenPlay"
    >
      <!-- 弹幕 slot，新版使用 #danmu -->
      <template #danmu="{ danmu }">
        <div :style="danmuTextStyle">
          <span>{{ danmu }}</span>
        </div>
      </template>
    </vue-danmaku>

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div class="flex mb-2">
        <el-text class="w-20 dark:text-slate-200">弹幕内容:</el-text>
        <div class="w-72"><el-input v-model="info.content" type="textarea" :rows="3"></el-input></div>
      </div>

      <div class="flex mb-2">
        <el-text class="w-20 dark:text-slate-200">播放速度:</el-text>
        <div class="w-72 ml-2"><el-slider v-model="info.speed" :min="1" :max="500"/></div>
      </div>

      <div class="flex mb-2 items-center gap-2">
        <el-text class="w-20 dark:text-slate-200">文字大小:</el-text>
        <div class="w-60"><el-slider v-model="info.textSize" :min="12" :max="1000"/></div>
        <el-text size="small" class="dark:text-slate-300">{{ info.textSize }}px</el-text>
      </div>

      <div class="flex mb-2">
        <el-text class="w-20 dark:text-slate-200">文字颜色:</el-text>
        <div><el-color-picker v-model="info.textColor" size="large"/></div>
      </div>

      <div class="flex mb-2">
        <el-text class="w-20 dark:text-slate-200">背景颜色:</el-text>
        <div><el-color-picker v-model="info.bgColor" size="large" @change="onBgColorChange"/></div>
      </div>

      <div class="flex mb-2 items-center gap-3">
        <el-text class="w-20 dark:text-slate-200">播放方向:</el-text>
        <el-radio-group v-model="info.orientationLock" size="small">
          <el-radio-button value="auto">自动</el-radio-button>
          <el-radio-button value="landscape">横屏</el-radio-button>
          <el-radio-button value="portrait">竖屏</el-radio-button>
        </el-radio-group>
        <el-text v-if="info.orientationLock === 'auto'" type="info" size="small">
          (当前检测：{{ activeOrientation === 'landscape' ? '横屏' : '竖屏' }})
        </el-text>
      </div>

      <div>
        <el-button @click="fullScreenPlay" type="primary" class="mr-3">{{ info.isPlay == false ? '播放' : '暂停'}}</el-button>
        <el-text class="dark:text-slate-200">双击可退出弹幕</el-text>
      </div>
    </div>

    <!-- desc -->
    <ToolDetail title="描述">
      <el-text>
        手持弹幕是一种新型的互动沟通工具，可以方便地为各种户外活动、演出嘉年华等活动增加趣味性和互动性。手持弹幕具有轻便、易携带、易操作等优点，可以让每个参与者都变成活动的一部分。同时，手持弹幕还可以通过预先编写的文本、表情等形式，表达参与者的情感和想法，实现沟通互动。在社交媒体时代，手持弹幕的使用也带来了更广泛的社交效应，增加了活动的互动性和传播度。无论是举办方还是参与者，手持弹幕都是一个非常有价值的互动工具。
      </el-text>
    </ToolDetail>

  </div>
</template>
