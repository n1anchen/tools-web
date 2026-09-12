import type { AnimationRect } from '@/utils/animationStudio'

export type AnimationSourceKind = 'image' | 'zip' | 'sprite'
export type AnimationFormat = 'gif' | 'png' | 'apng'
export type PreviewScale = 'fit' | 1 | 2 | 4 | 8
export type PreviewBackground = 'transparent' | 'white' | 'black' | 'gray' | 'custom'

export interface AnimationImageSource {
  id: string
  kind: AnimationSourceKind
  name: string
  blob: Blob
  url: string
  image: HTMLImageElement
  width: number
  height: number
}

export interface AnimationFrameItem {
  id: string
  sourceId: string
  groupId?: string
  name: string
  sourceRect: AnimationRect
  durationMs: number
  row?: number
  column?: number
}

export interface SpriteGroup {
  id: string
  sourceId: string
  name: string
  frameIds: string[]
  cropRect: AnimationRect
  cellWidth: number
  cellHeight: number
}

export interface SpriteDialogValue {
  groupId?: string
  sourceId?: string
  file?: File
  name: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  cropRect: AnimationRect
  cellWidth: number
  cellHeight: number
}

export interface RenderOptions {
  width: number
  height: number
  includeBackground: boolean
  backgroundColor: string
}
