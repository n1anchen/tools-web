import type { Encoder } from './types'

const plain: Encoder = {
  key: 'plain',
  label: '正常文本',
  prefix: '',
  encode: async (text) => text,
  decode: async (text) => text,
}

export default plain
