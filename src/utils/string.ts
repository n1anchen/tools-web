import { ElMessage } from 'element-plus';
import clipboard3 from 'vue-clipboard3'
import { secureRandomInt } from '@/utils/random'

/**
 * 转义特殊字符
 * str: string: 需处理的字符串
 * reg: string: 需转义的特殊字符
 * 
 * @param reg 
 */
export function transferred(str: string, reg: string = "`~!@#$^&*()=|{}':;',\\[\\].<>/?~！@#￥……&*（）;—|【】‘；：”“'。，、？") {
    let pattern = new RegExp("[" + reg + "]");
    let res = '';
    Array.from(str).forEach((char: any) => {
      res += char.replace(pattern, `\\${char}`);
    });
    return res;
}

/**
 * 复制文本
 * @param resStr 文本内容
 * @returns 
 */
export async function copy(resStr: string) {
  try {
    //check
    if (resStr == '') {
      ElMessage({
        message: "无可复制内容",
        type: "warning",
        duration: 1500
      })
      return false
    }
    //copy
    const {toClipboard} = clipboard3()
    await toClipboard(resStr)
    ElMessage({
      message: "复制成功",
      type: "success",
      duration: 1500
    })
    return true
  } catch {
    ElMessage({
      message: "复制失败",
      type: "error",
      duration: 1500
    })
    return false
  }
}

/**
 * 按指定字符生成随机字符串(场景：生成随机密码)
 * 
 * @param char 
 * @param length 
 * @returns 
 */
export function genRandomStrByChars(chars: string, length: number): string {
  if (!chars.length || !Number.isInteger(length) || length < 1) return ''
  let password = '';  
  for (let i = 0; i < length; i++) {  
    const randomIndex = secureRandomInt(0, chars.length - 1)
    password += chars[randomIndex];  
  }  
  return password;  
}

/**
 * 数字转中文
 * @param num 
 * @returns 
 */
export function numberToChinese(num: number): string {
  if (!Number.isSafeInteger(num) || num < 0 || num > 9_999_999_999_999) {
    ElMessage({
      message: "请输入不超过 13 位的非负整数",
      type: "error",
      duration: 1500
    })
    return ''
  }
  if (num === 0) return '零'

  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const smallUnits = ['', '拾', '佰', '仟']
  const groupUnits = ['', '万', '亿', '万亿']

  const convertGroup = (value: number) => {
    let result = ''
    let pendingZero = false

    for (let position = 3; position >= 0; position -= 1) {
      const divisor = 10 ** position
      const digit = Math.floor(value / divisor) % 10
      if (digit === 0) {
        if (result) pendingZero = true
        continue
      }
      if (pendingZero) result += digits[0]
      result += digits[digit] + smallUnits[position]
      pendingZero = false
    }
    return result
  }

  const groups: number[] = []
  let remaining = num
  while (remaining > 0) {
    groups.push(remaining % 10_000)
    remaining = Math.floor(remaining / 10_000)
  }

  let result = ''
  let skippedGroup = false
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]
    if (group === 0) {
      if (result) skippedGroup = true
      continue
    }
    if (result && (skippedGroup || group < 1000)) result += digits[0]
    result += convertGroup(group) + groupUnits[index]
    skippedGroup = false
  }
  return result
}

//rtrim: 删除右侧指定字符， 默认删除空格
export function rtrim(str, char = ' ') {
    return str.replace(new RegExp('\\'+char+'+$', 'g'), '');
}

const StringUtils = {
  transferred,
  copy,
  genRandomStrByChars,
  numberToChinese,
  rtrim,
}

export default StringUtils
