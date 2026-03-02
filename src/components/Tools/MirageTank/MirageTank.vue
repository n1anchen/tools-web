<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import { Upload, Picture } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { loadImageFromFile, getImageData, resizeCover, adjustContrast, toGray, drawToCanvas } from './imageUtils'
import { prismDecode, prismEncode } from './mirage'
import type { DecodeMethod } from './mirage'

const info = reactive({
  title: "光棱坦克工厂",
})

// ─── Vue 组件逻辑 ─────────────────────────────────────────────────────────
const activeTab = ref<'decode' | 'encode'>('decode')

// ── 显形（解码）状态 ──
const decodeCanvasRef = ref<HTMLCanvasElement | null>(null)
const decodePreviewRef = ref<HTMLCanvasElement | null>(null)
const decodeSrcData = ref<ImageData | null>(null)
const decodeResultData = ref<ImageData | null>(null)
const decodeLoading = ref(false)

const decodeConfig = reactive({
  lowerThreshold: 0,
  higherThreshold: 24,
  method: 'ltavg' as DecodeMethod,
  contrast: 0,
})

const onDecodeImageChange = async (file: UploadFile) => {
  if (!file.raw) return
  decodeLoading.value = true
  try {
    const img = await loadImageFromFile(file.raw)
    const imgData = getImageData(img)
    decodeSrcData.value = imgData
    // 先在预览 canvas 上展示原图
    await nextTick()
    if (decodePreviewRef.value) drawToCanvas(decodePreviewRef.value, imgData)
    runDecode()
  } finally {
    decodeLoading.value = false
  }
}

function runDecode() {
  if (!decodeSrcData.value) return
  let result = prismDecode(
    decodeSrcData.value,
    decodeConfig.lowerThreshold,
    decodeConfig.higherThreshold,
    decodeConfig.method
  )
  if (decodeConfig.contrast !== 0) {
    result = adjustContrast(decodeConfig.contrast, result)
  }
  decodeResultData.value = result
  if (decodeCanvasRef.value) drawToCanvas(decodeCanvasRef.value, result)
}

watch(decodeConfig, runDecode, { deep: true })

function downloadDecode() {
  if (!decodeCanvasRef.value) return
  const link = document.createElement('a')
  link.download = 'mirage_decoded.png'
  link.href = decodeCanvasRef.value.toDataURL('image/png')
  link.click()
}

// ── 制作（编码）状态 ──
const encodeCanvasRef = ref<HTMLCanvasElement | null>(null)
const innerImg = ref<HTMLImageElement | null>(null)
const coverImg = ref<HTMLImageElement | null>(null)
const innerPreviewRef = ref<HTMLCanvasElement | null>(null)
const coverPreviewRef = ref<HTMLCanvasElement | null>(null)
const encodeLoading = ref(false)

const encodeConfig = reactive({
  innerThreshold: 24,
  innerContrast: 0,
  coverThreshold: 42,
  coverContrast: 0,
  slope: 1,
  gap: 1,
  isRow: true,
  isReverse: false,
  isCoverGray: false,
  isInnerGray: false,
})

const onInnerImageChange = async (file: UploadFile) => {
  if (!file.raw) return
  encodeLoading.value = true
  try {
    innerImg.value = await loadImageFromFile(file.raw)
    await nextTick()
    if (innerPreviewRef.value) {
      drawToCanvas(innerPreviewRef.value, getImageData(innerImg.value))
    }
    runEncode()
  } finally {
    encodeLoading.value = false
  }
}

const onCoverImageChange = async (file: UploadFile) => {
  if (!file.raw) return
  encodeLoading.value = true
  try {
    coverImg.value = await loadImageFromFile(file.raw)
    await nextTick()
    if (coverPreviewRef.value) {
      drawToCanvas(coverPreviewRef.value, getImageData(coverImg.value))
    }
    runEncode()
  } finally {
    encodeLoading.value = false
  }
}

function runEncode() {
  if (!innerImg.value || !coverImg.value) return
  encodeLoading.value = true
  try {
    let innerData = getImageData(innerImg.value)
    let coverData = getImageData(coverImg.value)

    if (encodeConfig.isInnerGray) innerData = toGray(innerData)
    if (encodeConfig.isCoverGray) coverData = toGray(coverData)
    if (encodeConfig.innerContrast !== 0) innerData = adjustContrast(encodeConfig.innerContrast, innerData)
    if (encodeConfig.coverContrast !== 0) coverData = adjustContrast(encodeConfig.coverContrast, coverData)

    // 将封面图缩放到与隐藏图同尺寸
    coverData = resizeCover(coverData, innerData.width, innerData.height)

    const result = prismEncode(
      innerData, coverData,
      encodeConfig.innerThreshold,
      encodeConfig.coverThreshold,
      encodeConfig.slope,
      encodeConfig.gap,
      encodeConfig.isRow,
      encodeConfig.isReverse
    )
    if (encodeCanvasRef.value) drawToCanvas(encodeCanvasRef.value, result)
  } finally {
    encodeLoading.value = false
  }
}

watch(encodeConfig, runEncode, { deep: true })

function downloadEncode() {
  if (!encodeCanvasRef.value) return
  const link = document.createElement('a')
  link.download = 'mirage_tank.png'
  link.href = encodeCanvasRef.value.toDataURL('image/png')
  link.click()
}
</script>

<template>
    <div>
        <DetailHeader :title="info.title"></DetailHeader>
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col mt-3 flex-1">
            <!-- Tab 切换 -->
            <el-tabs v-model="activeTab" class="mb-4">
            <el-tab-pane label="显形（解码）" name="decode" />
            <el-tab-pane label="制作（编码）" name="encode" />
            </el-tabs>

            <!-- ── 显形（解码）面板 ── -->
            <div v-if="activeTab === 'decode'">
            <el-alert class="mb-4" type="info" :closable="false" show-icon>
                上传一张「光棱坦克」图片，调整阈值即可显现隐藏图像。
            </el-alert>

            <el-row :gutter="20">
                <!-- 左侧：上传与参数 -->
                <el-col :xs="24" :md="12">
                <div class="space-y-4">
                    <el-upload
                    drag
                    :show-file-list="false"
                    accept="image/*"
                    :auto-upload="false"
                    :on-change="onDecodeImageChange"
                    class="compact-upload"
                    >
                    <template #default>
                        <canvas
                        v-if="decodeSrcData"
                        ref="decodePreviewRef"
                        class="block max-w-full mx-auto rounded"
                        style="max-height: 220px;"
                        />
                        <div v-else class="flex flex-col items-center justify-center py-6 text-gray-400">
                        <el-icon class="text-3xl mb-1"><Upload /></el-icon>
                        <div class="text-sm">点击或拖拽上传图片</div>
                        </div>
                    </template>
                    </el-upload>

                    <div class="space-y-3 mt-4">
                    <div>
                        <div class="flex justify-between text-sm mb-1">
                        <span>亮部阈值下限</span>
                        <span class="text-blue-500">{{ decodeConfig.lowerThreshold }}</span>
                        </div>
                        <el-slider v-model="decodeConfig.lowerThreshold" :min="0" :max="255" :step="1" />
                    </div>
                    <div>
                        <div class="flex justify-between text-sm mb-1">
                        <span>亮部阈值上限</span>
                        <span class="text-blue-500">{{ decodeConfig.higherThreshold }}</span>
                        </div>
                        <el-slider v-model="decodeConfig.higherThreshold" :min="0" :max="255" :step="1" />
                    </div>
                    <div>
                        <div class="text-sm mb-1">暗部处理方式</div>
                        <el-select v-model="decodeConfig.method" class="w-full">
                        <el-option label="填黑（black）" value="black" />
                        <el-option label="填白（white）" value="white" />
                        <el-option label="透明（transparent）" value="transparent" />
                        <el-option label="周边平均（ltavg，推荐）" value="ltavg" />
                        </el-select>
                    </div>
                    </div>
                </div>
                </el-col>

                <!-- 右侧：结果 + 对比度 -->
                <el-col :xs="24" :md="12">
                <div class="space-y-3">
                    <div
                    class="flex items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"
                    style="min-height: 260px;"
                    >
                    <canvas
                        v-show="decodeResultData"
                        ref="decodeCanvasRef"
                        class="max-w-full rounded"
                        style="max-height: 460px;"
                    />
                    <span v-if="!decodeResultData" class="text-gray-400 text-sm">上传图片后显示结果</span>
                    </div>
                    <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span>对比度</span>
                        <span class="text-blue-500">{{ decodeConfig.contrast }}</span>
                    </div>
                    <el-slider
                        v-model="decodeConfig.contrast"
                        :min="-255" :max="255" :step="5"
                    />
                    </div>
                </div>

                <el-button
                    type="primary"
                    class="w-full"
                    :disabled="!decodeResultData"
                    @click="downloadDecode"
                >
                    下载结果
                </el-button>
                </el-col>
            </el-row>
            </div>

            <!-- ── 制作（编码）面板 ── -->
            <div v-if="activeTab === 'encode'">
                <el-alert class="mb-4" type="info" :closable="false" show-icon>
                    上传「隐藏图」（白底下显现）和「表面图」（深色背景下显现），合成一张光棱坦克图片。
                </el-alert>

                <el-row :gutter="16">
                    <!-- ① 隐藏图配置卡 -->
                    <el-col :xs="24" :md="12" class="mb-4">
                    <div class="encode-card">
                        <div class="text-sm font-semibold mb-3">隐藏图设置</div>
                        <div class="flex gap-3 items-start">
                        <!-- 图片预览 -->
                        <el-upload
                            drag
                            :show-file-list="false"
                            accept="image/*"
                            :auto-upload="false"
                            :on-change="onInnerImageChange"
                            class="encode-img-upload"
                        >
                            <template #default>
                            <canvas
                                v-if="innerImg"
                                ref="innerPreviewRef"
                                class="block max-w-full mx-auto rounded"
                                style="max-height: 160px;"
                            />
                            <div v-else class="encode-img-placeholder">
                                <el-icon class="text-2xl"><Picture /></el-icon>
                                <div class="text-xs mt-1 text-gray-400">上传/拖拽图片</div>
                            </div>
                            </template>
                        </el-upload>
                        <!-- 参数 -->
                        <div class="flex-1 space-y-3 min-w-0">
                            <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span>1. 色阶端点</span>
                                <span class="text-blue-500">{{ encodeConfig.innerThreshold }}</span>
                            </div>
                            <el-slider v-model="encodeConfig.innerThreshold" :min="0" :max="255" :step="1" size="small" />
                            </div>
                            <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span>2. 对比度</span>
                                <span class="text-blue-500">{{ encodeConfig.innerContrast }}</span>
                            </div>
                            <el-slider v-model="encodeConfig.innerContrast" :min="-255" :max="255" :step="5" size="small" />
                            <div class="text-right">
                                <el-link class="text-xs" @click="encodeConfig.innerContrast = 0">重置对比度</el-link>
                            </div>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                            <span>3. 是否变灰：</span>
                            <el-switch v-model="encodeConfig.isInnerGray" size="small" />
                            </div>
                        </div>
                        </div>
                    </div>
                    </el-col>

                    <!-- ② 表面图配置卡 -->
                    <el-col :xs="24" :md="12" class="mb-4">
                    <div class="encode-card">
                        <div class="text-sm font-semibold mb-3">表面图设置</div>
                        <div class="flex gap-3 items-start">
                        <!-- 图片预览 -->
                        <el-upload
                            drag
                            :show-file-list="false"
                            accept="image/*"
                            :auto-upload="false"
                            :on-change="onCoverImageChange"
                            class="encode-img-upload"
                        >
                            <template #default>
                            <canvas
                                v-if="coverImg"
                                ref="coverPreviewRef"
                                class="block max-w-full mx-auto rounded"
                                style="max-height: 160px;"
                            />
                            <div v-else class="encode-img-placeholder">
                                <el-icon class="text-2xl"><Picture /></el-icon>
                                <div class="text-xs mt-1 text-gray-400">上传/拖拽图片</div>
                            </div>
                            </template>
                        </el-upload>
                        <!-- 参数 -->
                        <div class="flex-1 space-y-3 min-w-0">
                            <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span>1. 色阶端点</span>
                                <span class="text-blue-500">{{ encodeConfig.coverThreshold }}</span>
                            </div>
                            <el-slider v-model="encodeConfig.coverThreshold" :min="0" :max="255" :step="1" size="small" />
                            </div>
                            <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span>2. 对比度</span>
                                <span class="text-blue-500">{{ encodeConfig.coverContrast }}</span>
                            </div>
                            <el-slider v-model="encodeConfig.coverContrast" :min="-255" :max="255" :step="5" size="small" />
                            <div class="text-right">
                                <el-link class="text-xs" @click="encodeConfig.coverContrast = 0">重置对比度</el-link>
                            </div>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                            <span>3. 是否变灰：</span>
                            <el-switch v-model="encodeConfig.isCoverGray" size="small" />
                            </div>
                        </div>
                        </div>
                    </div>
                    </el-col>

                    <!-- ③ 合成结果 -->
                    <el-col :xs="24" :md="12" class="mb-4">
                    <div
                        class="flex items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"
                        style="min-height: 220px;"
                    >
                        <canvas
                        v-show="innerImg && coverImg"
                        ref="encodeCanvasRef"
                        class="max-w-full rounded"
                        style="max-height: 340px;"
                        />
                        <span v-if="!innerImg || !coverImg" class="text-gray-400 text-sm">上传两张图片后自动合成</span>
                    </div>
                    </el-col>

                    <!-- ④ 混合模式操作区 -->
                    <el-col :xs="24" :md="12" class="mb-4">
                    <div class="encode-card h-full flex flex-col justify-between">
                        <div>
                        <div class="text-sm font-semibold mb-3">设置混合模式</div>
                        <div class="space-y-3">
                            <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span>交错间隔 gap</span>
                                <span class="text-blue-500">{{ encodeConfig.gap }}</span>
                            </div>
                            <el-slider v-model="encodeConfig.gap" :min="1" :max="8" :step="1" size="small" />
                            </div>
                            <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span>交错斜率 slope</span>
                                <span class="text-blue-500">{{ encodeConfig.slope }}</span>
                            </div>
                            <el-slider v-model="encodeConfig.slope" :min="0" :max="4" :step="0.5" size="small" />
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                            <span>是否反向：</span>
                            <el-switch v-model="encodeConfig.isReverse" size="small" />
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                            <span>按行交错：</span>
                            <el-switch v-model="encodeConfig.isRow" size="small" />
                            </div>
                        </div>
                        </div>
                        <el-button
                        type="primary"
                        class="w-full mt-4"
                        :disabled="!innerImg || !coverImg"
                        @click="downloadEncode"
                        >
                        下载合成图
                        </el-button>
                    </div>
                    </el-col>
                </el-row>
            </div>
        </div>
        <!-- desc -->
        <ToolDetail title="简介">
        <div class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <el-text>将两张图片混合成一张光棱坦克图：白色背景下显现隐藏图，深色背景下显现表面图，支持解码还原</el-text>
            <el-text class="mt-2">原理：基于亮度阈值的像素级混合，暗部像素根据设定方式处理，亮部像素按比例叠加隐藏图和表面图</el-text>
            <el-text class="mt-2">适用场景：制作/解密光棱坦克图片，或其他类似的基于亮度阈值的隐写图像</el-text>
            <el-text class="mt-2">注意：本项目仅做辅助, 并非此类坦克的唯一解！</el-text>
            <br/><el-text class="mt-2">参考项目：<el-link href="https://github.com/TankFactory/Mirage_Decode" target="_blank">TankFactory/Mirage_Decode</el-link></el-text>
        </div> 
        </ToolDetail>
    </div>
</template>

<style scoped>

.compact-upload :deep(.el-upload-dragger) {
  padding: 12px;
  height: auto;
}
.compact-upload :deep(.el-upload-dragger .el-icon--upload) {
  margin: 0 0 4px 0;
  font-size: 28px;
}

/* 编码面板卡片 */
.encode-card {
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 16px;
  background: var(--el-fill-color-blank);
  height: 100%;
  box-sizing: border-box;
}

/* 编码面板图片上传区域（正方形，固定宽度） */
.encode-img-upload {
  flex-shrink: 0;
  width: 140px;
}
.encode-img-upload :deep(.el-upload),
.encode-img-upload :deep(.el-upload-dragger) {
  width: 140px;
  height: 140px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.encode-img-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-placeholder);
}
</style>
