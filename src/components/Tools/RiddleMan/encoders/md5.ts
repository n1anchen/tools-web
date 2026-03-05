/**
 * MD5 编码器（只读 · 单向）
 * 使用 ts-md5 库（项目已有依赖）
 * readonly = true：仅支持明文 → MD5，不允许反向解码
 * singleLine = true：UI 渲染为单行输入框
 */
import type { Encoder } from './types'
import { Md5 } from 'ts-md5'

const md5: Encoder = {
  key: 'md5',
  label: 'MD5',
  prefix: '',
  readonly: true,
  singleLine: true,
  encode: async (plain) => (plain ? (Md5.hashStr(plain) as string) : ''),
  decode: async () => {
    throw new Error('MD5 不可逆，无法从哈希值还原明文')
  },
}

export default md5
