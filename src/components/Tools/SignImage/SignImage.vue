<script setup lang="ts">
import { onBeforeUnmount, ref, reactive } from "vue"
import  SignImageCore  from './SignImageCore.vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { UploadProps, UploadInstance, UploadRawFile, genFileId } from 'element-plus'
import { autoDown } from '@/utils/file'
import { Jh_getTimeStamp } from '@/utils/time'
import { ElMessage } from 'element-plus'

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

// 图片处理
const info = reactive({
  title:"在线编辑图片",
  //图片地址
  previewsImgUrl:"/pwa-512x512.png",
  //获取处理完的图片
  getNewImg:(url: string) => {
    //下载
    autoDown(url, Jh_getTimeStamp() + '.png')
  },
  //用于刷新组件视图
  cKey: 1,  
})

//使用 upload ref
const upload = ref<UploadInstance>()
//使用 SignImageCore ref
const refSignImageCore = ref<any>()
let uploadedImageUrl: string | null = null

//上传文件发生变化
const uploadChange: UploadProps['onChange'] = (file) => {
  if (!file.raw || !ALLOWED_IMAGE_TYPES.has(file.raw.type)) {
    ElMessage.error('仅支持 PNG、JPEG、WebP 或 GIF 图片')
    upload.value?.clearFiles()
    return
  }
  if (file.raw.size > MAX_IMAGE_BYTES) {
    ElMessage.error('图片不能超过 20 MB')
    upload.value?.clearFiles()
    return
  }
  if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl)
  //UploadFile转换url
  uploadedImageUrl = URL.createObjectURL(file.raw)
  info.previewsImgUrl = uploadedImageUrl
  // 更新组件
  info.cKey++
}

//钩子 - 文件上传超出限制
const uploadExceed: UploadProps['onExceed'] = (files) => {
  upload.value!.clearFiles()
  const file = files[0] as UploadRawFile
  file.uid = genFileId()
  upload.value!.handleStart(file)
}

//保存图片
const saveImg = () => {
  refSignImageCore.value!.save()
}

onBeforeUnmount(() => {
  if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl)
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <div class="flex flex-col mb-3 h-[38rem] p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div class="mb-3 flex flex-row-reverse">
        <!-- save -->
        <el-button type="primary" class="ml-2" @click="saveImg">保存</el-button>
        <!-- upload -->
        <el-upload
          ref="upload"
          :limit="1"
          @exceed="uploadExceed"
          accept="image/png,image/jpeg,image/webp,image/gif"
          @change="uploadChange"
          :auto-upload="false"
          :show-file-list="false"
        >
          <template #trigger>
            <el-button type="primary">选择图片</el-button>
          </template>
        </el-upload>
      </div>
      <!-- 图片处理框 -->
      <SignImageCore 
        ref="refSignImageCore"
        :key="info.cKey"
        :dialogVisible.sync="true" 
        :title="info.title"
        :imgUrl="info.previewsImgUrl"
        @getNewImg="info.getNewImg"
      ></SignImageCore>
    </div>

    <!-- desc -->
    <ToolDetail title="描述">
      <el-text>
        在线图片裁剪，图片标注，图片滤镜，图片画笔、图片旋转、图片文字、图片尺寸调整等操作
      </el-text> 
    </ToolDetail>

  </div>
</template>

<style scoped>
</style>
