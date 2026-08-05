export type UnitCategoryId = 'length' | 'area' | 'mass' | 'time' | 'temperature' | 'pressure' | 'energy' | 'power'

export interface UnitDefinition {
  key: string
  name: string
  symbol: string
  system: string
  factor?: number
  toBase?: (value: number) => number
  fromBase?: (value: number) => number
}

interface UnitPreset {
  label: string
  value: number
  from: string
  to: string
}

interface UnitCategory {
  id: UnitCategoryId
  title: string
  shortTitle: string
  description: string
  baseName: string
  baseSymbol: string
  defaults: [string, string]
  units: UnitDefinition[]
  presets: UnitPreset[]
  notes: string[]
}

const scale = (key: string, name: string, symbol: string, factor: number, system: string): UnitDefinition => ({
  key, name, symbol, factor, system,
})

const temperature = (
  key: string,
  name: string,
  symbol: string,
  toBase: (value: number) => number,
  fromBase: (value: number) => number,
): UnitDefinition => ({ key, name, symbol, system: '温标', toBase, fromBase })

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length', title: '长度换算', shortTitle: '长度', description: '公制、市制、英制与航海长度',
    baseName: '米', baseSymbol: 'm', defaults: ['m', 'ft'],
    units: [
      scale('km', '千米', 'km', 1_000, '公制'), scale('m', '米', 'm', 1, '公制'), scale('dm', '分米', 'dm', .1, '公制'),
      scale('cm', '厘米', 'cm', .01, '公制'), scale('mm', '毫米', 'mm', .001, '公制'), scale('um', '微米', 'μm', 1e-6, '公制'), scale('nm', '纳米', 'nm', 1e-9, '公制'),
      scale('li', '里', '里', 500, '中国市制'), scale('zhang', '丈', '丈', 10 / 3, '中国市制'), scale('chi', '尺', '尺', 1 / 3, '中国市制'),
      scale('cun', '寸', '寸', 1 / 30, '中国市制'), scale('fen', '分', '分', 1 / 300, '中国市制'), scale('li_cn', '厘', '厘', 1 / 3_000, '中国市制'), scale('hao', '毫', '毫', 1 / 30_000, '中国市制'),
      scale('nmi', '海里', 'nmi', 1_852, '英美/航海'), scale('mi', '英里', 'mi', 1_609.344, '英美/航海'), scale('fur', '弗隆', 'fur', 201.168, '英美/航海'),
      scale('fm', '英寻', 'fm', 1.8288, '英美/航海'), scale('yd', '码', 'yd', .9144, '英美/航海'), scale('ft', '英尺', 'ft', .3048, '英美/航海'), scale('in', '英寸', 'in', .0254, '英美/航海'),
    ],
    presets: [
      { label: '1 公里 → 英里', value: 1, from: 'km', to: 'mi' }, { label: '1 米 → 英尺', value: 1, from: 'm', to: 'ft' },
      { label: '1 里 → 公里', value: 1, from: 'li', to: 'km' }, { label: '6 英尺 → 厘米', value: 6, from: 'ft', to: 'cm' },
    ],
    notes: ['1 英寸精确定义为 2.54 厘米。', '中国市制按现行定义：1 里 = 500 米，1 尺 = 1/3 米。'],
  },
  {
    id: 'area', title: '面积换算', shortTitle: '面积', description: '公制土地面积、市制与英美面积',
    baseName: '平方米', baseSymbol: 'm²', defaults: ['m2', 'ft2'],
    units: [
      scale('km2', '平方千米', 'km²', 1e6, '公制'), scale('ha', '公顷', 'ha', 10_000, '公制'), scale('m2', '平方米', 'm²', 1, '公制'),
      scale('dm2', '平方分米', 'dm²', .01, '公制'), scale('cm2', '平方厘米', 'cm²', 1e-4, '公制'), scale('mm2', '平方毫米', 'mm²', 1e-6, '公制'),
      scale('mu', '亩', '亩', 2_000 / 3, '中国市制'), scale('area_fen', '分（1/10亩）', '分', 200 / 3, '中国市制'), scale('area_li', '厘（1/100亩）', '厘', 20 / 3, '中国市制'), scale('area_hao', '毫（1/1000亩）', '毫', 2 / 3, '中国市制'),
      scale('nmi2', '平方海里', 'nmi²', 1_852 ** 2, '英美制'), scale('mi2', '平方英里', 'mi²', 1_609.344 ** 2, '英美制'), scale('acre', '英亩', 'acre', 4_046.8564224, '英美制'),
      scale('rod2', '平方竿', 'rd²', 25.29285264, '英美制'), scale('yd2', '平方码', 'yd²', .83612736, '英美制'), scale('ft2', '平方英尺', 'ft²', .09290304, '英美制'), scale('in2', '平方英寸', 'in²', .00064516, '英美制'),
    ],
    presets: [
      { label: '1 亩 → 平方米', value: 1, from: 'mu', to: 'm2' }, { label: '1 公顷 → 亩', value: 1, from: 'ha', to: 'mu' },
      { label: '100 ㎡ → 平方英尺', value: 100, from: 'm2', to: 'ft2' }, { label: '1 英亩 → 公顷', value: 1, from: 'acre', to: 'ha' },
    ],
    notes: ['1 公顷 = 10,000 平方米。', '1 亩按现行市制定为 2,000/3 平方米。'],
  },
  {
    id: 'mass', title: '重量换算', shortTitle: '重量', description: '公制质量、市制、常衡制与金衡制',
    baseName: '千克', baseSymbol: 'kg', defaults: ['kg', 'lb'],
    units: [
      scale('t', '吨', 't', 1_000, '公制'), scale('kg', '千克', 'kg', 1, '公制'), scale('g', '克', 'g', .001, '公制'), scale('mg', '毫克', 'mg', 1e-6, '公制'), scale('ug', '微克', 'μg', 1e-9, '公制'),
      scale('dan', '担', '担', 50, '中国市制'), scale('jin', '斤', '斤', .5, '中国市制'), scale('liang', '两', '两', .05, '中国市制'), scale('qian', '钱', '钱', .005, '中国市制'),
      scale('long_ton', '长吨', 'long tn', 1_016.0469088, '常衡制'), scale('cwt', '英担', 'cwt', 50.80234544, '常衡制'), scale('st', '英石', 'st', 6.35029318, '常衡制'),
      scale('lb', '磅', 'lb', .45359237, '常衡制'), scale('oz', '盎司', 'oz', .028349523125, '常衡制'), scale('dram', '打兰', 'dr', .0017718451953125, '常衡制'),
      scale('troy_lb', '金衡磅', 'lb t', .3732417216, '金衡制'), scale('troy_oz', '金衡盎司', 'oz t', .0311034768, '金衡制'), scale('dwt', '英钱', 'dwt', .00155517384, '金衡制'), scale('grain', '格令', 'gr', .00006479891, '金衡制'),
    ],
    presets: [
      { label: '1 公斤 → 磅', value: 1, from: 'kg', to: 'lb' }, { label: '1 斤 → 克', value: 1, from: 'jin', to: 'g' },
      { label: '150 磅 → 公斤', value: 150, from: 'lb', to: 'kg' }, { label: '1 金衡盎司 → 克', value: 1, from: 'troy_oz', to: 'g' },
    ],
    notes: ['日常“重量”换算按质量单位处理。', '常衡盎司与金衡盎司并不相同，贵金属通常使用金衡制。'],
  },
  {
    id: 'time', title: '时间换算', shortTitle: '时间', description: '从纳秒到平均公历年',
    baseName: '秒', baseSymbol: 's', defaults: ['h', 'min'],
    units: [
      scale('year', '平均公历年', 'yr', 31_556_952, '日历近似'), scale('month', '平均月', 'mo', 2_629_746, '日历近似'), scale('week', '周', 'wk', 604_800, '常用时间'), scale('fortnight', '两周', 'fn', 1_209_600, '常用时间'),
      scale('day', '日', 'd', 86_400, '常用时间'), scale('h', '小时', 'h', 3_600, '常用时间'), scale('min', '分钟', 'min', 60, '常用时间'), scale('s', '秒', 's', 1, '常用时间'),
      scale('ms', '毫秒', 'ms', 1e-3, '亚秒'), scale('us', '微秒', 'μs', 1e-6, '亚秒'), scale('ns', '纳秒', 'ns', 1e-9, '亚秒'),
    ],
    presets: [
      { label: '1 天 → 小时', value: 1, from: 'day', to: 'h' }, { label: '90 分钟 → 小时', value: 90, from: 'min', to: 'h' },
      { label: '1 周 → 秒', value: 1, from: 'week', to: 's' }, { label: '1 年 → 天', value: 1, from: 'year', to: 'day' },
    ],
    notes: ['日、周、小时等为固定时长。', '月和年采用平均公历值：1 年 = 365.2425 日，实际日历区间可能不同。'],
  },
  {
    id: 'temperature', title: '温度换算', shortTitle: '温度', description: '五种常用温标与绝对零度检查',
    baseName: '摄氏度', baseSymbol: '°C', defaults: ['c', 'f'],
    units: [
      temperature('c', '摄氏度', '°C', value => value, value => value),
      temperature('f', '华氏度', '°F', value => (value - 32) * 5 / 9, value => value * 9 / 5 + 32),
      temperature('k', '开尔文', 'K', value => value - 273.15, value => value + 273.15),
      temperature('re', '列氏度', '°Ré', value => value * 5 / 4, value => value * 4 / 5),
      temperature('r', '兰氏度', '°R', value => (value - 491.67) * 5 / 9, value => (value + 273.15) * 9 / 5),
    ],
    presets: [
      { label: '0°C → °F', value: 0, from: 'c', to: 'f' }, { label: '32°F → °C', value: 32, from: 'f', to: 'c' },
      { label: '273.15K → °C', value: 273.15, from: 'k', to: 'c' }, { label: '100°C → °F', value: 100, from: 'c', to: 'f' },
    ],
    notes: ['0°C = 32°F = 273.15K。', '低于 −273.15°C（绝对零度）的输入会被标记为物理上无效。'],
  },
  {
    id: 'pressure', title: '压力换算', shortTitle: '压力', description: '工程、气象与轮胎常用压力单位',
    baseName: '帕斯卡', baseSymbol: 'Pa', defaults: ['kpa', 'psi'],
    units: [
      scale('pa', '帕斯卡', 'Pa', 1, '国际单位'), scale('hpa', '百帕', 'hPa', 100, '国际单位'), scale('kpa', '千帕', 'kPa', 1_000, '国际单位'), scale('mpa', '兆帕', 'MPa', 1e6, '国际单位'),
      scale('bar', '巴', 'bar', 100_000, '工程常用'), scale('atm', '标准大气压', 'atm', 101_325, '工程常用'), scale('torr', '托', 'Torr', 101_325 / 760, '工程常用'),
      scale('mmhg', '毫米汞柱', 'mmHg', 133.322387415, '医学/气象'), scale('psi', '磅力/平方英寸', 'psi', 6_894.757293168, '英美制'), scale('kgfcm2', '公斤力/平方厘米', 'kgf/cm²', 98_066.5, '工程常用'),
    ],
    presets: [
      { label: '1 atm → kPa', value: 1, from: 'atm', to: 'kpa' }, { label: '2.5 bar → psi', value: 2.5, from: 'bar', to: 'psi' },
      { label: '760 mmHg → atm', value: 760, from: 'mmhg', to: 'atm' }, { label: '35 psi → kPa', value: 35, from: 'psi', to: 'kpa' },
    ],
    notes: ['标准大气压精确定义为 101,325 Pa。', 'Torr 与 mmHg 数值非常接近，但定义来源不同。'],
  },
  {
    id: 'energy', title: '能量换算', shortTitle: '能量', description: '电能、机械能、热量与电子伏特',
    baseName: '焦耳', baseSymbol: 'J', defaults: ['kwh', 'mj'],
    units: [
      scale('mwh_small', '毫瓦时', 'mWh', 3.6, '电能'), scale('wh', '瓦时', 'Wh', 3_600, '电能'), scale('kwh', '千瓦时', 'kWh', 3.6e6, '电能'), scale('mwh', '兆瓦时', 'MWh', 3.6e9, '电能'),
      scale('j', '焦耳', 'J', 1, '国际单位'), scale('kj', '千焦', 'kJ', 1_000, '国际单位'), scale('mj', '兆焦', 'MJ', 1e6, '国际单位'),
      scale('cal', '卡', 'cal', 4.184, '热量'), scale('kcal', '千卡', 'kcal', 4_184, '热量'), scale('btu', '英热单位', 'BTU', 1_055.05585262, '热量'), scale('ev', '电子伏特', 'eV', 1.602176634e-19, '微观能量'),
    ],
    presets: [
      { label: '1 kWh → MJ', value: 1, from: 'kwh', to: 'mj' }, { label: '500 kcal → kJ', value: 500, from: 'kcal', to: 'kj' },
      { label: '1 BTU → kJ', value: 1, from: 'btu', to: 'kj' }, { label: '1000 J → Wh', value: 1_000, from: 'j', to: 'wh' },
    ],
    notes: ['1 kWh = 3.6 MJ。', '食品营养中的“大卡”通常指 kcal（千卡）。'],
  },
  {
    id: 'power', title: '功率换算', shortTitle: '功率', description: '电功率、机械马力与热功率',
    baseName: '瓦特', baseSymbol: 'W', defaults: ['kw', 'hp'],
    units: [
      scale('mw_small', '毫瓦', 'mW', .001, '国际单位'), scale('w', '瓦特', 'W', 1, '国际单位'), scale('kw', '千瓦', 'kW', 1_000, '国际单位'), scale('mw', '兆瓦', 'MW', 1e6, '国际单位'), scale('gw', '吉瓦', 'GW', 1e9, '国际单位'),
      scale('hp', '机械马力', 'hp', 745.6998715822702, '马力'), scale('ps', '公制马力', 'PS', 735.49875, '马力'), scale('btuh', '英热单位/小时', 'BTU/h', .2930710701722222, '热功率'), scale('kcalh', '千卡/小时', 'kcal/h', 1.1622222222222223, '热功率'),
    ],
    presets: [
      { label: '1 hp → kW', value: 1, from: 'hp', to: 'kw' }, { label: '100 kW → hp', value: 100, from: 'kw', to: 'hp' },
      { label: '1 PS → W', value: 1, from: 'ps', to: 'w' }, { label: '12,000 BTU/h → kW', value: 12_000, from: 'btuh', to: 'kw' },
    ],
    notes: ['机械马力 hp 与公制马力 PS 数值不同。', '功率表示单位时间内转换或消耗的能量。'],
  },
]

const categoryMap = new Map(UNIT_CATEGORIES.map(category => [category.id, category]))

// 各分类对应的独立路由路径（用于同类工具快速切换 / 深链）
export const UNIT_CATEGORY_PATHS: Record<UnitCategoryId, string> = {
  length: 'length',
  area: 'area',
  mass: 'weight',
  time: 'time',
  temperature: 'temperature',
  pressure: 'pressure',
  energy: 'heat',
  power: 'power',
}

export function normalizeUnitCategory(value: unknown): UnitCategoryId {
  if (value === 'weight') return 'mass'
  if (value === 'heat') return 'energy'
  return categoryMap.has(value as UnitCategoryId) ? value as UnitCategoryId : 'length'
}

export function getUnitCategory(id: UnitCategoryId) {
  return categoryMap.get(id) ?? UNIT_CATEGORIES[0]
}

export function convertUnitValue(categoryId: UnitCategoryId, value: number, fromKey: string, toKey: string) {
  if (!Number.isFinite(value)) return Number.NaN
  const category = getUnitCategory(categoryId)
  const from = category.units.find(unit => unit.key === fromKey)
  const to = category.units.find(unit => unit.key === toKey)
  if (!from || !to) return Number.NaN
  const baseValue = from.toBase ? from.toBase(value) : value * (from.factor ?? 1)
  return to.fromBase ? to.fromBase(baseValue) : baseValue / (to.factor ?? 1)
}

export function convertAllUnits(categoryId: UnitCategoryId, value: number, fromKey: string) {
  const category = getUnitCategory(categoryId)
  return category.units.map(unit => ({
    ...unit,
    value: convertUnitValue(categoryId, value, fromKey, unit.key),
  }))
}

export function getBaseValue(categoryId: UnitCategoryId, value: number, fromKey: string) {
  const category = getUnitCategory(categoryId)
  const from = category.units.find(unit => unit.key === fromKey)
  if (!from || !Number.isFinite(value)) return Number.NaN
  return from.toBase ? from.toBase(value) : value * (from.factor ?? 1)
}

export function formatUnitValue(value: number, significantDigits = 10) {
  if (!Number.isFinite(value)) return '—'
  if (Object.is(value, -0) || value === 0) return '0'
  const absolute = Math.abs(value)
  if (absolute >= 1e15 || absolute < 1e-9) {
    return value.toExponential(Math.max(2, significantDigits - 1)).replace(/\.0+e/, 'e').replace(/(\.\d*?)0+e/, '$1e')
  }
  return new Intl.NumberFormat('zh-CN', {
    maximumSignificantDigits: significantDigits,
    useGrouping: true,
  }).format(value)
}

export function isBelowAbsoluteZero(categoryId: UnitCategoryId, value: number, fromKey: string) {
  return categoryId === 'temperature' && getBaseValue(categoryId, value, fromKey) < -273.15 - 1e-10
}
