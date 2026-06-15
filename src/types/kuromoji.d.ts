declare module 'kuromoji' {
  export interface KuromojiToken {
    word_id: number
    word_type: string
    word_position: number
    surface_form: string
    pos: string
    pos_detail_1: string
    pos_detail_2: string
    pos_detail_3: string
    conjugated_type: string
    conjugated_form: string
    basic_form: string
    reading?: string
    pronunciation?: string
  }

  export interface Tokenizer {
    tokenize(text: string): KuromojiToken[]
  }

  export interface Builder {
    build(callback: (err: Error | null, tokenizer: Tokenizer) => void): void
  }

  export function builder(options: { dicPath: string }): Builder
}

declare module 'kuromoji/src/Tokenizer' {
  import type { KuromojiToken } from 'kuromoji'

  export default class Tokenizer {
    constructor(dictionary: unknown)
    tokenize(text: string): KuromojiToken[]
  }
}

declare module 'kuromoji/src/loader/DictionaryLoader' {
  export default class DictionaryLoader {
    constructor(dicPath: string)
    load(callback: (err: Error | null, dictionary: unknown) => void): void
    loadArrayBuffer(url: string, callback: (err: Error | null, buffer: ArrayBuffer | null) => void): void
  }
}

declare module 'zlibjs/bin/gunzip.min.js' {
  const zlib: {
    Zlib: {
      Gunzip: new (bytes: Uint8Array) => {
        decompress(): Uint8Array
      }
    }
  }

  export = zlib
}
