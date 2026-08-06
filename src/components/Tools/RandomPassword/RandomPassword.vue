<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CircleCheck, CopyDocument, Key, Lock, RefreshRight, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import { estimatePasswordEntropy, generatePassword } from '@/utils/generators'
import { copy } from '@/utils/string'

const ambiguousCharacters = new Set(Array.from('O0oIl1|'))
const characterGroups = [
  { key: 'digits', label: '数字', sample: '0–9', chars: '0123456789' },
  { key: 'lowercase', label: '小写字母', sample: 'a–z', chars: 'abcdefghijklmnopqrstuvwxyz' },
  { key: 'uppercase', label: '大写字母', sample: 'A–Z', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { key: 'symbols', label: '特殊符号', sample: '!@#$', chars: '~!@#$%^&*()_+-=[]{};:,.?' },
]

const selectedGroups = ref(['digits', 'lowercase', 'uppercase'])
const excludeAmbiguous = ref(true)
const customCharacters = ref('')
const passwordLength = ref(16)
const passwordCount = ref(5)
const passwords = ref<string[]>([])

const activeCharacterSets = computed(() => {
  const sets = characterGroups
    .filter(group => selectedGroups.value.includes(group.key))
    .map(group => group.chars)
  if (customCharacters.value) sets.push(customCharacters.value)
  return sets
    .map(set => excludeAmbiguous.value
      ? Array.from(set).filter(char => !ambiguousCharacters.has(char)).join('')
      : set)
    .filter(Boolean)
})

const poolSize = computed(() => new Set(Array.from(activeCharacterSets.value.join(''))).size)
const entropy = computed(() => Math.round(estimatePasswordEntropy(poolSize.value, Number(passwordLength.value))))
const strength = computed(() => {
  if (entropy.value < 40) return { label: '偏弱', className: 'weak', hint: '建议增加长度或字符类型' }
  if (entropy.value < 60) return { label: '一般', className: 'medium', hint: '可用于低风险临时场景' }
  if (entropy.value < 80) return { label: '较强', className: 'strong', hint: '适合多数日常账户' }
  return { label: '很强', className: 'excellent', hint: '适合重要账户的独立密码' }
})
const strengthProgress = computed(() => Math.min(100, Math.round(entropy.value / 1.2)))

function toggleGroup(key: string) {
  selectedGroups.value = selectedGroups.value.includes(key)
    ? selectedGroups.value.filter(item => item !== key)
    : [...selectedGroups.value, key]
}

function generateAll() {
  const length = Number(passwordLength.value)
  const count = Number(passwordCount.value)
  if (!activeCharacterSets.value.length) {
    ElMessage.warning('请至少选择一种字符类型')
    return
  }
  if (!Number.isInteger(length) || length < activeCharacterSets.value.length || length > 100) {
    ElMessage.warning(`密码长度应为 ${activeCharacterSets.value.length}～100`)
    return
  }
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    ElMessage.warning('生成数量应为 1～100')
    return
  }

  passwords.value = Array.from({ length: count }, () => generatePassword(activeCharacterSets.value, length))
}

function copyAll() {
  copy(passwords.value.join('\n'))
}

onMounted(generateAll)
</script>

<template>
  <div class="password-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <div class="workspace-grid">
      <section class="settings-card">
        <SectionHeading :icon="Key" title="设置密码规则" description="每条密码都会至少包含一次所选字符类型" tone="violet" />

        <div class="field-label">字符组成</div>
        <div class="group-grid">
          <button
            v-for="group in characterGroups"
            :key="group.key"
            type="button"
            class="group-option"
            :class="{ active: selectedGroups.includes(group.key) }"
            :aria-pressed="selectedGroups.includes(group.key)"
            @click="toggleGroup(group.key)"
          >
            <span class="check-dot"><el-icon><CircleCheck /></el-icon></span>
            <strong>{{ group.label }}</strong>
            <small>{{ group.sample }}</small>
          </button>
        </div>

        <label class="custom-field">
          <span>自定义字符 <small>（可选，会作为独立字符组）</small></span>
          <el-input v-model="customCharacters" size="large" placeholder="例如：★☆中文" clearable />
        </label>

        <div class="range-grid">
          <label>
            <span>密码长度</span>
            <el-input-number v-model="passwordLength" :min="1" :max="100" controls-position="right" />
          </label>
          <label>
            <span>生成数量</span>
            <el-input-number v-model="passwordCount" :min="1" :max="100" controls-position="right" />
          </label>
        </div>

        <div class="switch-row">
          <div>
            <strong>排除易混淆字符</strong>
            <span>移除 O、0、I、l、1 等字符</span>
          </div>
          <el-switch v-model="excludeAmbiguous" />
        </div>

        <el-button type="primary" size="large" :icon="RefreshRight" class="generate-button" @click="generateAll">
          生成安全密码
        </el-button>
      </section>

      <aside class="strength-card">
        <div class="strength-icon"><el-icon><Lock /></el-icon></div>
        <span class="eyebrow">当前配置强度</span>
        <strong :class="strength.className">{{ strength.label }}</strong>
        <div class="strength-track"><i :class="strength.className" :style="{ width: `${strengthProgress}%` }" /></div>
        <p>{{ strength.hint }}</p>

        <div class="metric-list">
          <div><span>估算熵值</span><b>{{ entropy }} bits</b></div>
          <div><span>字符池</span><b>{{ poolSize }} 个</b></div>
          <div><span>覆盖字符组</span><b>{{ activeCharacterSets.length }} 组</b></div>
        </div>

        <div class="privacy-note">
          <el-icon><CircleCheck /></el-icon>
          <span>密码仅在本机浏览器中生成，不会上传。</span>
        </div>
      </aside>
    </div>

    <section class="result-card">
      <div class="result-header">
        <SectionHeading :icon="Lock" title="生成结果" :description="(passwords.length) + ' 条密码 · 点击任意一条即可复制'" tone="green" />
        <el-button :icon="CopyDocument" :disabled="!passwords.length" @click="copyAll">复制全部</el-button>
      </div>

      <div v-if="passwords.length" class="password-list">
        <button
          v-for="(password, index) in passwords"
          :key="`${password}-${index}`"
          type="button"
          class="password-item"
          title="复制这条密码"
          @click="copy(password)"
        >
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <code>{{ password }}</code>
          <el-icon><CopyDocument /></el-icon>
        </button>
      </div>
      <div v-else class="empty-state">
        <el-icon><WarningFilled /></el-icon>
        <span>调整规则后点击“生成安全密码”</span>
      </div>
    </section>

    <ToolGuide title="安全建议">
      <div class="advice-grid">
        <div><strong>重要账户使用独立密码</strong><span>不要在邮箱、支付和社交账户间重复使用同一密码。</span></div>
        <div><strong>优先增加长度</strong><span>在字符类型足够时，16 位以上的随机密码通常比短而复杂的密码更稳妥。</span></div>
        <div><strong>配合密码管理器</strong><span>妥善保存随机密码，并为支持的账户开启双重验证。</span></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.password-page { gap: 18px; }
.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(260px, .75fr); gap: 18px; }

.settings-card, .result-card { padding: 24px; }
.result-header, .switch-row {display: flex; align-items: center;}

.field-label { margin: 24px 0 10px; color: #334155; font-size: 13px; font-weight: 650; }
.group-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.group-option { position: relative; display: flex; min-height: 82px; flex-direction: column; justify-content: center; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px; color: #334155; background: #f8fafc; text-align: left; transition: .2s ease; }
.group-option:hover { border-color: #c4b5fd; transform: translateY(-1px); }
.group-option.active { border-color: #8b5cf6; background: #f5f3ff; box-shadow: inset 0 0 0 1px #8b5cf6; }
.group-option strong { font-size: 14px; }
.group-option small { margin-top: 5px; color: #94a3b8; font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
.check-dot { position: absolute; top: 9px; right: 10px; color: #cbd5e1; }
.active .check-dot { color: #7c3aed; }
.custom-field { display: block; margin-top: 18px; }
.custom-field > span, .range-grid label > span { display: block; margin-bottom: 8px; color: #334155; font-size: 13px; font-weight: 650; }
.custom-field small { color: #94a3b8; font-weight: 400; }
.range-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 16px; }
.range-grid :deep(.el-input-number) { width: 100%; }
.switch-row { justify-content: space-between; gap: 20px; margin-top: 18px; padding: 14px 16px; border-radius: 14px; background: #f8fafc; }
.switch-row strong, .switch-row span { display: block; }
.switch-row strong { color: #334155; font-size: 14px; }
.switch-row span { margin-top: 3px; color: #94a3b8; font-size: 12px; }
.generate-button { width: 100%; margin-top: 18px; }
.strength-card { display: flex; min-height: 100%; flex-direction: column; align-items: center; padding: 30px 24px; text-align: center; background: linear-gradient(155deg, #faf5ff, #fff 58%); }
.strength-icon { display: grid; width: 58px; height: 58px; place-items: center; border-radius: 18px; color: #7c3aed; background: #ede9fe; font-size: 27px; }
.eyebrow { margin-top: 18px; color: #64748b; font-size: 12px; letter-spacing: .08em; }
.strength-card > strong { margin-top: 5px; font-size: 30px; }
.weak { color: #dc2626; } .medium { color: #d97706; } .strong { color: #059669; } .excellent { color: #7c3aed; }
.strength-track { width: 100%; height: 7px; margin-top: 18px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.strength-track i { display: block; height: 100%; border-radius: inherit; background: currentColor; transition: width .25s ease; }
.strength-card > p { min-height: 38px; margin: 12px 0 0; color: #64748b; font-size: 13px; }
.metric-list { width: 100%; margin-top: 14px; border-top: 1px solid #e2e8f0; }
.metric-list div { display: flex; justify-content: space-between; padding: 12px 2px; border-bottom: 1px solid #eef2f7; color: #64748b; font-size: 13px; }
.metric-list b { color: #0f172a; }
.privacy-note { display: flex; align-items: flex-start; gap: 7px; margin-top: auto; padding-top: 18px; color: #059669; font-size: 12px; text-align: left; }
.privacy-note .el-icon { flex: 0 0 auto; margin-top: 2px; }
.result-header { justify-content: space-between; gap: 18px; }
.password-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 20px; }
.password-item { display: grid; grid-template-columns: 28px minmax(0, 1fr) 20px; align-items: center; gap: 10px; padding: 13px 14px; border: 1px solid #e2e8f0; border-radius: 13px; color: #64748b; background: #f8fafc; text-align: left; transition: .2s ease; }
.password-item:hover { border-color: #a78bfa; color: #7c3aed; background: #faf5ff; }
.password-item > span { color: #94a3b8; font-size: 11px; }
.password-item code { overflow: hidden; color: #1e293b; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.empty-state { display: flex; min-height: 130px; align-items: center; justify-content: center; gap: 8px; color: #94a3b8; }
.advice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.advice-grid div { padding: 14px; border-radius: 13px; background: #f8fafc; }
.advice-grid strong, .advice-grid span { display: block; }
.advice-grid strong { color: #334155; font-size: 13px; }
.advice-grid span { margin-top: 5px; color: #64748b; font-size: 12px; line-height: 1.65; }
:global(html.dark .password-page .settings-card), :global(html.dark .password-page .strength-card), :global(html.dark .password-page .result-card) { border-color: #334155; background: #1e293b; box-shadow: none; }
:global(html.dark .password-page .strength-card) { background: linear-gradient(155deg, rgba(88, 28, 135, .18), #1e293b 58%); }
:global(html.dark .password-page .custom-field > span), :global(html.dark .password-page .range-grid label > span), :global(html.dark .password-page .field-label), :global(html.dark .password-page .switch-row strong), :global(html.dark .password-page .metric-list b), :global(html.dark .password-page .password-item code), :global(html.dark .password-page .advice-grid strong) { color: #e2e8f0; }
:global(html.dark .password-page .group-option), :global(html.dark .password-page .switch-row), :global(html.dark .password-page .password-item), :global(html.dark .password-page .advice-grid div) { border-color: #334155; background: #0f172a; }
:global(html.dark .password-page .group-option) { color: #e2e8f0; }
:global(html.dark .password-page .group-option.active) { border-color: #8b5cf6; background: rgba(91, 33, 182, .18); }
:global(html.dark .password-page .metric-list), :global(html.dark .password-page .metric-list div) { border-color: #334155; }@media (max-width: 900px) { .workspace-grid { grid-template-columns: 1fr; } .strength-card { min-height: auto; } .privacy-note { margin-top: 12px; }}@media (max-width: 640px) { .settings-card, .result-card { padding: 18px; } .group-grid, .password-list, .range-grid, .advice-grid { grid-template-columns: 1fr; } .group-grid { grid-template-columns: repeat(2, 1fr); } .result-header { align-items: flex-start; }}</style>
