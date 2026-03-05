/**
 * 编码器注册中心
 *
 * 如需新增语言，只需：
 *   1. 新建 encoders/xxx.ts，实现并导出默认 Encoder 对象
 *   2. 在此处 import 并追加到 encoders 数组
 */
import plain from './plain'
import foYue from './foYue'
import ruShiWoWen from './ruShiWoWen'
import base64 from './base64'
import md5 from './md5'

export const encoders = [plain, foYue, ruShiWoWen, base64, md5]

export type { Encoder } from './types'
