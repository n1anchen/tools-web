import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateCidr,
  classifyIpv4,
  ipToNumber,
  maskToPrefix,
  splitSubnet,
} from '../src/utils/ipCalc.ts'

test('CIDR 计算返回网络边界、反掩码和主机范围', () => {
  const result = calculateCidr('192.168.1.34', 24)
  assert.equal(result.cidr, '192.168.1.0/24')
  assert.equal(result.mask, '255.255.255.0')
  assert.equal(result.wildcardMask, '0.0.0.255')
  assert.equal(result.broadcast, '192.168.1.255')
  assert.equal(result.firstHost, '192.168.1.1')
  assert.equal(result.lastHost, '192.168.1.254')
  assert.equal(result.usableHosts, 254)
})

test('/31 与 /32 使用点对点和单主机语义', () => {
  const pointToPoint = calculateCidr('10.0.0.5', 31)
  assert.equal(pointToPoint.network, '10.0.0.4')
  assert.equal(pointToPoint.broadcast, '10.0.0.5')
  assert.equal(pointToPoint.usableHosts, 2)

  const hostRoute = calculateCidr('10.0.0.5', 32)
  assert.equal(hostRoute.firstHost, '10.0.0.5')
  assert.equal(hostRoute.lastHost, '10.0.0.5')
  assert.equal(hostRoute.usableHosts, 1)
})

test('地址分类覆盖私网、公网和特殊用途地址', () => {
  assert.equal(classifyIpv4(ipToNumber('172.16.8.1')).scope, 'private')
  assert.equal(classifyIpv4(ipToNumber('8.8.8.8')).scope, 'public')
  assert.equal(classifyIpv4(ipToNumber('127.0.0.1')).label, '环回地址')
  assert.equal(classifyIpv4(ipToNumber('203.0.113.5')).label, '文档示例地址')
})

test('子网规划会按新前缀连续拆分并限制预览数量', () => {
  const source = calculateCidr('10.0.0.8', 24)
  const plan = splitSubnet(source, 26, 3)
  assert.equal(plan.subnetCount, 4)
  assert.equal(plan.subnetSize, 64)
  assert.equal(plan.usablePerSubnet, 62)
  assert.equal(plan.subnets[0].cidr, '10.0.0.0/26')
  assert.equal(plan.subnets[1].cidr, '10.0.0.64/26')
  assert.equal(plan.truncated, true)
})

test('掩码反算只接受连续的 1 位', () => {
  assert.equal(maskToPrefix('255.255.252.0'), 22)
  assert.throws(() => maskToPrefix('255.0.255.0'), /连续子网掩码/)
})
