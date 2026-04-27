<script setup lang="ts">
import { reactive } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'

const title = 'IP 计算器'

// ===== 工具函数 =====
function ipToNum(ip: string): number {
  const parts = ip.split('.')
  return (((+parts[0] << 24) | (+parts[1] << 16) | (+parts[2] << 8) | +parts[3]) >>> 0)
}

function numToIp(num: number): string {
  return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join('.')
}

function prefixToMaskNum(prefix: number): number {
  return prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0)
}

function validateIp(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every(p => /^\d+$/.test(p) && +p >= 0 && +p <= 255)
}

function numToHex8(num: number): string {
  return '0x' + num.toString(16).padStart(8, '0').toUpperCase()
}

// ===== CIDR / 子网计算 =====
interface CidrResult {
  mask: string
  maskHex: string
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  usableHosts: number
  totalHosts: number
  ipClass: string
}

const cidr = reactive({
  ip: '192.168.1.0',
  prefix: 24,
  result: null as CidrResult | null,
  error: '',
})

function calcCidr() {
  cidr.error = ''
  if (!validateIp(cidr.ip)) {
    cidr.error = 'IP 地址格式不正确'
    cidr.result = null
    return
  }
  const prefix = cidr.prefix
  const maskNum = prefixToMaskNum(prefix)
  const ipNum = ipToNum(cidr.ip)
  const networkNum = (ipNum & maskNum) >>> 0
  const wildcardNum = (~maskNum) >>> 0
  const broadcastNum = (networkNum | wildcardNum) >>> 0
  const totalHosts = Math.pow(2, 32 - prefix)
  const usableHosts = prefix === 32 ? 1 : prefix === 31 ? 2 : totalHosts - 2
  const firstHost = prefix >= 31 ? numToIp(networkNum) : numToIp(networkNum + 1)
  const lastHost = prefix >= 31 ? numToIp(broadcastNum) : numToIp(broadcastNum - 1)
  const firstOctet = (networkNum >>> 24) & 0xff
  const ipClass =
    firstOctet < 128 ? 'A 类' :
    firstOctet < 192 ? 'B 类' :
    firstOctet < 224 ? 'C 类' :
    firstOctet < 240 ? 'D 类（多播）' : 'E 类（保留）'

  cidr.result = {
    mask: numToIp(maskNum),
    maskHex: numToHex8(maskNum),
    network: numToIp(networkNum),
    broadcast: numToIp(broadcastNum),
    firstHost,
    lastHost,
    usableHosts,
    totalHosts,
    ipClass,
  }
}

// ===== IP 进制转换 =====
const conv = reactive({
  decimal: '192.168.1.1',
  binary: '',
  hex: '',
  error: '',
})

function decToBin(ip: string) {
  return ip.split('.').map(p => (+p).toString(2).padStart(8, '0')).join('.')
}
function decToHex(ip: string) {
  return ip.split('.').map(p => (+p).toString(16).padStart(2, '0').toUpperCase()).join('.')
}

function fromDecimal() {
  conv.error = ''
  if (!validateIp(conv.decimal)) { conv.error = '十进制 IP 格式不正确'; return }
  conv.binary = decToBin(conv.decimal)
  conv.hex = decToHex(conv.decimal)
}

function fromBinary() {
  conv.error = ''
  const parts = conv.binary.split('.')
  if (parts.length !== 4 || !parts.every(p => /^[01]{8}$/.test(p))) {
    conv.error = '格式不正确，示例：11000000.10101000.00000001.00000001'
    return
  }
  conv.decimal = parts.map(p => parseInt(p, 2).toString()).join('.')
  conv.hex = decToHex(conv.decimal)
}

function fromHex() {
  conv.error = ''
  const parts = conv.hex.split('.')
  if (parts.length !== 4 || !parts.every(p => /^[0-9a-fA-F]{1,2}$/.test(p))) {
    conv.error = '格式不正确，示例：C0.A8.01.01'
    return
  }
  conv.decimal = parts.map(p => parseInt(p, 16).toString()).join('.')
  conv.binary = decToBin(conv.decimal)
}

// ===== 子网掩码换算 =====
const maskCalc = reactive({
  prefix: 24,
  decimal: '255.255.255.0',
  hex: '0xFFFFFF00',
  binary: '',
  error: '',
})

function calcMaskFromPrefix() {
  maskCalc.error = ''
  const maskNum = prefixToMaskNum(maskCalc.prefix)
  maskCalc.decimal = numToIp(maskNum)
  maskCalc.hex = numToHex8(maskNum)
  maskCalc.binary = numToIp(maskNum).split('.').map(p => (+p).toString(2).padStart(8, '0')).join('.')
}

function calcPrefixFromMask() {
  maskCalc.error = ''
  if (!validateIp(maskCalc.decimal)) { maskCalc.error = '子网掩码格式不正确'; return }
  const maskNum = ipToNum(maskCalc.decimal)
  const inv = (~maskNum) >>> 0
  if (inv !== 0 && (inv & (inv + 1)) !== 0) { maskCalc.error = '不是有效的连续子网掩码'; return }
  let prefix = 0
  let tmp = maskNum
  while (tmp & 0x80000000) { prefix++; tmp = (tmp << 1) >>> 0 }
  maskCalc.prefix = prefix
  maskCalc.hex = numToHex8(maskNum)
  maskCalc.binary = maskCalc.decimal.split('.').map(p => (+p).toString(2).padStart(8, '0')).join('.')
}

// 初始化
calcCidr()
fromDecimal()
calcMaskFromPrefix()
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <el-tabs model-value="cidr">

        <!-- ===== Tab 1: CIDR / 子网计算 ===== -->
        <el-tab-pane label="CIDR / 子网计算" name="cidr">
          <div class="space-y-4">
            <div class="flex flex-wrap items-end gap-3">
              <div>
                <div class="text-sm text-slate-500 dark:text-slate-400 mb-1">IP 地址</div>
                <el-input
                  v-model="cidr.ip"
                  placeholder="192.168.1.0"
                  style="width: 180px"
                  @keyup.enter="calcCidr"
                />
              </div>
              <div>
                <div class="text-sm text-slate-500 dark:text-slate-400 mb-1">前缀长度</div>
                <div class="flex items-center gap-1">
                  <span class="text-slate-400 dark:text-slate-500 font-semibold">/</span>
                  <el-input-number
                    v-model="cidr.prefix"
                    :min="0"
                    :max="32"
                    controls-position="right"
                    style="width: 90px"
                  />
                </div>
              </div>
              <el-button type="primary" @click="calcCidr">计算</el-button>
            </div>

            <el-alert v-if="cidr.error" :title="cidr.error" type="error" show-icon :closable="false" />

            <el-descriptions v-if="cidr.result" :column="2" border>
              <el-descriptions-item label="IP 类型">{{ cidr.result.ipClass }}</el-descriptions-item>
              <el-descriptions-item label="子网掩码">
                <span class="font-mono">{{ cidr.result.mask }}</span>
                <el-button link type="primary" size="small" class="ml-2" @click="copy(cidr.result!.mask)">复制</el-button>
              </el-descriptions-item>
              <el-descriptions-item label="网络地址">
                <span class="font-mono">{{ cidr.result.network }}</span>
                <el-button link type="primary" size="small" class="ml-2" @click="copy(cidr.result!.network)">复制</el-button>
              </el-descriptions-item>
              <el-descriptions-item label="广播地址">
                <span class="font-mono">{{ cidr.result.broadcast }}</span>
                <el-button link type="primary" size="small" class="ml-2" @click="copy(cidr.result!.broadcast)">复制</el-button>
              </el-descriptions-item>
              <el-descriptions-item label="第一个可用 IP">
                <span class="font-mono">{{ cidr.result.firstHost }}</span>
                <el-button link type="primary" size="small" class="ml-2" @click="copy(cidr.result!.firstHost)">复制</el-button>
              </el-descriptions-item>
              <el-descriptions-item label="最后可用 IP">
                <span class="font-mono">{{ cidr.result.lastHost }}</span>
                <el-button link type="primary" size="small" class="ml-2" @click="copy(cidr.result!.lastHost)">复制</el-button>
              </el-descriptions-item>
              <el-descriptions-item label="可用主机数">{{ cidr.result.usableHosts.toLocaleString() }}</el-descriptions-item>
              <el-descriptions-item label="地址总数">{{ cidr.result.totalHosts.toLocaleString() }}</el-descriptions-item>
              <el-descriptions-item label="掩码（十六进制）" :span="2">
                <span class="font-mono">{{ cidr.result.maskHex }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>

        <!-- ===== Tab 2: IP 进制转换 ===== -->
        <el-tab-pane label="IP 进制转换" name="conv">
          <div class="space-y-4">
            <div>
              <div class="text-sm text-slate-500 dark:text-slate-400 mb-1">十进制</div>
              <div class="flex gap-2">
                <el-input v-model="conv.decimal" placeholder="192.168.1.1" @keyup.enter="fromDecimal" />
                <el-button type="primary" @click="fromDecimal">转换</el-button>
              </div>
            </div>
            <div>
              <div class="text-sm text-slate-500 dark:text-slate-400 mb-1">二进制</div>
              <div class="flex gap-2">
                <el-input v-model="conv.binary" placeholder="11000000.10101000.00000001.00000001" @keyup.enter="fromBinary" />
                <el-button @click="fromBinary">转换</el-button>
              </div>
            </div>
            <div>
              <div class="text-sm text-slate-500 dark:text-slate-400 mb-1">十六进制</div>
              <div class="flex gap-2">
                <el-input v-model="conv.hex" placeholder="C0.A8.01.01" @keyup.enter="fromHex" />
                <el-button @click="fromHex">转换</el-button>
              </div>
            </div>
            <el-alert v-if="conv.error" :title="conv.error" type="error" show-icon :closable="false" />
          </div>
        </el-tab-pane>

        <!-- ===== Tab 3: 子网掩码换算 ===== -->
        <el-tab-pane label="子网掩码换算" name="mask">
          <div class="space-y-4">
            <div class="flex flex-wrap items-end gap-3">
              <div>
                <div class="text-sm text-slate-500 dark:text-slate-400 mb-1">前缀长度</div>
                <div class="flex items-center gap-1">
                  <span class="text-slate-400 dark:text-slate-500 font-semibold">/</span>
                  <el-input-number
                    v-model="maskCalc.prefix"
                    :min="0"
                    :max="32"
                    controls-position="right"
                    style="width: 90px"
                  />
                </div>
              </div>
              <el-button @click="calcMaskFromPrefix">位数 → 掩码</el-button>
            </div>
            <div class="flex flex-wrap items-end gap-3">
              <div>
                <div class="text-sm text-slate-500 dark:text-slate-400 mb-1">十进制掩码</div>
                <el-input
                  v-model="maskCalc.decimal"
                  placeholder="255.255.255.0"
                  style="width: 180px"
                  @keyup.enter="calcPrefixFromMask"
                />
              </div>
              <el-button @click="calcPrefixFromMask">掩码 → 位数</el-button>
            </div>

            <el-alert v-if="maskCalc.error" :title="maskCalc.error" type="error" show-icon :closable="false" />

            <el-descriptions :column="1" border>
              <el-descriptions-item label="前缀长度">/{{ maskCalc.prefix }}</el-descriptions-item>
              <el-descriptions-item label="十进制掩码">
                <span class="font-mono">{{ maskCalc.decimal }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="十六进制掩码">
                <span class="font-mono">{{ maskCalc.hex }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="二进制掩码">
                <span class="font-mono text-sm break-all">{{ maskCalc.binary }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>

      </el-tabs>
    </div>

    <ToolDetail title="使用说明">
      <el-text>
        提供三个功能模块：<br />
        <strong>CIDR/子网计算</strong>：输入 IP 地址和前缀长度（如 /24），自动输出子网掩码、网络地址、广播地址、首尾可用 IP 及主机数量；<br />
        <strong>IP 进制转换</strong>：在十进制、二进制、十六进制三种格式间任意互转，点击对应行的"转换"按钮即可；<br />
        <strong>子网掩码换算</strong>：前缀长度（/n）与十进制子网掩码双向互换，同时展示十六进制和二进制形式。
      </el-text>
    </ToolDetail>
  </div>
</template>

