export interface IpClassification {
  label: string
  description: string
  scope: 'private' | 'public' | 'special'
  legacyClass: string
}

export interface CidrResult {
  inputIp: string
  prefix: number
  cidr: string
  mask: string
  wildcardMask: string
  maskHex: string
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  usableHosts: number
  totalHosts: number
  classification: IpClassification
  binary: string
  integer: number
  networkNumber: number
  broadcastNumber: number
}

export interface SubnetPreview {
  index: number
  cidr: string
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  usableHosts: number
}

export function isValidIpv4(ip: string) {
  const parts = ip.trim().split('.')
  return parts.length === 4
    && parts.every(part => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
}

export function ipToNumber(ip: string) {
  if (!isValidIpv4(ip)) throw new Error('IP 地址格式不正确')
  return ip.split('.').reduce((value, part) => value * 256 + Number(part), 0)
}

export function numberToIp(value: number) {
  const normalized = Math.max(0, Math.min(0xffffffff, Math.floor(value)))
  return [
    Math.floor(normalized / 0x1000000) % 256,
    Math.floor(normalized / 0x10000) % 256,
    Math.floor(normalized / 0x100) % 256,
    normalized % 256,
  ].join('.')
}

export function prefixToMaskNumber(prefix: number) {
  assertPrefix(prefix)
  return prefix === 0 ? 0 : 0x100000000 - 2 ** (32 - prefix)
}

export function maskToPrefix(mask: string) {
  const maskNumber = ipToNumber(mask)
  const binary = maskNumber.toString(2).padStart(32, '0')
  if (!/^1*0*$/.test(binary)) throw new Error('不是有效的连续子网掩码')
  return binary.indexOf('0') === -1 ? 32 : binary.indexOf('0')
}

export function toBinaryIpv4(ip: string) {
  return ip.split('.').map(part => Number(part).toString(2).padStart(8, '0')).join('.')
}

export function toHexIpv4(ip: string) {
  return ip.split('.').map(part => Number(part).toString(16).padStart(2, '0').toUpperCase()).join('.')
}

export function maskNumberToHex(maskNumber: number) {
  return `0x${maskNumber.toString(16).padStart(8, '0').toUpperCase()}`
}

export function calculateCidr(ip: string, prefix: number): CidrResult {
  const normalizedIp = ip.trim()
  const ipNumber = ipToNumber(normalizedIp)
  assertPrefix(prefix)

  const blockSize = 2 ** (32 - prefix)
  const networkNumber = Math.floor(ipNumber / blockSize) * blockSize
  const broadcastNumber = networkNumber + blockSize - 1
  const maskNumber = prefixToMaskNumber(prefix)
  const totalHosts = blockSize
  const usableHosts = prefix === 32 ? 1 : prefix === 31 ? 2 : Math.max(0, totalHosts - 2)

  return {
    inputIp: normalizedIp,
    prefix,
    cidr: `${numberToIp(networkNumber)}/${prefix}`,
    mask: numberToIp(maskNumber),
    wildcardMask: numberToIp(0xffffffff - maskNumber),
    maskHex: maskNumberToHex(maskNumber),
    network: numberToIp(networkNumber),
    broadcast: numberToIp(broadcastNumber),
    firstHost: numberToIp(prefix >= 31 ? networkNumber : networkNumber + 1),
    lastHost: numberToIp(prefix >= 31 ? broadcastNumber : broadcastNumber - 1),
    usableHosts,
    totalHosts,
    classification: classifyIpv4(ipNumber),
    binary: toBinaryIpv4(normalizedIp),
    integer: ipNumber,
    networkNumber,
    broadcastNumber,
  }
}

export function splitSubnet(result: CidrResult, newPrefix: number, previewLimit = 12) {
  assertPrefix(newPrefix)
  if (newPrefix < result.prefix) throw new Error('新前缀不能小于当前网络前缀')

  const subnetCount = 2 ** (newPrefix - result.prefix)
  const subnetSize = 2 ** (32 - newPrefix)
  const usablePerSubnet = newPrefix === 32 ? 1 : newPrefix === 31 ? 2 : Math.max(0, subnetSize - 2)
  const previewCount = Math.min(subnetCount, previewLimit)
  const subnets: SubnetPreview[] = []

  for (let index = 0; index < previewCount; index += 1) {
    const networkNumber = result.networkNumber + index * subnetSize
    const broadcastNumber = networkNumber + subnetSize - 1
    subnets.push({
      index: index + 1,
      cidr: `${numberToIp(networkNumber)}/${newPrefix}`,
      network: numberToIp(networkNumber),
      broadcast: numberToIp(broadcastNumber),
      firstHost: numberToIp(newPrefix >= 31 ? networkNumber : networkNumber + 1),
      lastHost: numberToIp(newPrefix >= 31 ? broadcastNumber : broadcastNumber - 1),
      usableHosts: usablePerSubnet,
    })
  }

  return { subnetCount, subnetSize, usablePerSubnet, subnets, truncated: subnetCount > previewCount }
}

export function classifyIpv4(ipNumber: number): IpClassification {
  const inRange = (base: string, prefix: number) => {
    const size = 2 ** (32 - prefix)
    const start = ipToNumber(base)
    return ipNumber >= start && ipNumber < start + size
  }
  const firstOctet = Math.floor(ipNumber / 0x1000000)
  const legacyClass = firstOctet < 128
    ? 'A 类'
    : firstOctet < 192
      ? 'B 类'
      : firstOctet < 224
        ? 'C 类'
        : firstOctet < 240
          ? 'D 类'
          : 'E 类'

  const special = (label: string, description: string): IpClassification => ({
    label,
    description,
    scope: 'special',
    legacyClass,
  })

  if (ipNumber === 0) return special('未指定地址', '0.0.0.0，仅用于表示未指定或默认路由')
  if (ipNumber === 0xffffffff) return special('受限广播', '255.255.255.255，仅在本地网络广播')
  if (inRange('10.0.0.0', 8) || inRange('172.16.0.0', 12) || inRange('192.168.0.0', 16)) {
    return { label: '私有网络', description: 'RFC 1918 内网地址，不在公网直接路由', scope: 'private', legacyClass }
  }
  if (inRange('127.0.0.0', 8)) return special('环回地址', '用于本机通信，常见地址为 127.0.0.1')
  if (inRange('169.254.0.0', 16)) return special('链路本地', '自动配置地址，只在当前链路有效')
  if (inRange('100.64.0.0', 10)) return special('运营商级 NAT', 'RFC 6598 共享地址空间')
  if (inRange('192.0.2.0', 24) || inRange('198.51.100.0', 24) || inRange('203.0.113.0', 24)) {
    return special('文档示例地址', '保留用于文档和示例，不应出现在公网')
  }
  if (inRange('198.18.0.0', 15)) return special('基准测试地址', '保留用于网络设备性能测试')
  if (inRange('224.0.0.0', 4)) return special('多播地址', '用于一对多组播通信')
  if (inRange('240.0.0.0', 4) || inRange('0.0.0.0', 8)) return special('保留地址', 'IETF 保留或具有特殊用途')

  return { label: '公网地址', description: '可在互联网中路由，实际可达性取决于网络配置', scope: 'public', legacyClass }
}

function assertPrefix(prefix: number) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('前缀长度必须是 0 到 32 的整数')
  }
}
