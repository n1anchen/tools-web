export interface Encoder {
  /** 唯一标识，作为 state.values 的 key */
  key: string
  /** 显示名称 */
  label: string
  /** 编码结果的前缀（含分隔符），解码时自动剥离 */
  prefix: string
  /** true = 只读单向（如 MD5），UI 禁止从此框触发同步，输入框设为只读 */
  readonly?: boolean
  /** true = 使用单行输入框而非多行 textarea */
  singleLine?: boolean
  encode: (plain: string) => Promise<string>
  decode: (encoded: string) => Promise<string>
}
