<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader title="CRON表达式生成与解析"></DetailHeader>

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <h3 class="text-lg font-semibold mb-4 dark:text-slate-200">生成器</h3>
      <el-form label-width="100px">
        <el-form-item label="执行周期">
          <el-select v-model="cronType" placeholder="请选择" @change="generateCron">
            <el-option label="每分钟" value="everyMinute"></el-option>
            <el-option label="每小时" value="everyHour"></el-option>
            <el-option label="每天" value="everyDay"></el-option>
            <el-option label="每周" value="everyWeek"></el-option>
            <el-option label="每月" value="everyMonth"></el-option>
            <el-option label="N秒" value="everyNSeconds"></el-option>
            <el-option label="N分钟" value="everyNMinutes"></el-option>
            <el-option label="N小时" value="everyNHours"></el-option>
            <el-option label="N天" value="everyNDays"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item v-if="cronType === 'everyHour'" label="分钟">
          <el-input-number v-model="minute" :min="0" :max="59" @change="generateCron"></el-input-number>
        </el-form-item>

        <el-form-item v-if="cronType === 'everyDay'" label="时间">
          <el-time-picker v-model="time" format="HH:mm" @change="generateCron"></el-time-picker>
        </el-form-item>

        <el-form-item v-if="cronType === 'everyWeek'" label="星期">
          <el-select v-model="dayOfWeek" placeholder="请选择" @change="generateCron">
            <el-option v-for="day in weekDays" :key="day.value" :label="day.label" :value="day.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="cronType === 'everyWeek'" label="时间">
          <el-time-picker v-model="time" format="HH:mm" @change="generateCron"></el-time-picker>
        </el-form-item>

        <el-form-item v-if="cronType === 'everyMonth'" label="日期">
          <el-input-number v-model="dayOfMonth" :min="1" :max="31" @change="generateCron"></el-input-number>
        </el-form-item>
        <el-form-item v-if="cronType === 'everyMonth'" label="时间">
          <el-time-picker v-model="time" format="HH:mm" @change="generateCron"></el-time-picker>
        </el-form-item>

        <el-form-item v-if="cronType === 'everyNSeconds'" label="秒">
          <el-input-number v-model="nSeconds" :min="1" :max="59" @change="generateCron"></el-input-number>
        </el-form-item>

        <el-form-item v-if="cronType === 'everyNMinutes'" label="分钟">
          <el-input-number v-model="nMinutes" :min="1" :max="59" @change="generateCron"></el-input-number>
        </el-form-item>

        <el-form-item v-if="cronType === 'everyNHours'" label="小时">
          <el-input-number v-model="nHours" :min="1" :max="23" @change="generateCron"></el-input-number>
        </el-form-item>
        <el-form-item v-if="cronType === 'everyNHours'" label="分钟">
          <el-input-number v-model="minute" :min="0" :max="59" @change="generateCron"></el-input-number>
        </el-form-item>

        <el-form-item v-if="cronType === 'everyNDays'" label="天">
          <el-input-number v-model="nDays" :min="1" :max="31" @change="generateCron"></el-input-number>
        </el-form-item>
        <el-form-item v-if="cronType === 'everyNDays'" label="时间">
          <el-time-picker v-model="time" format="HH:mm" @change="generateCron"></el-time-picker>
        </el-form-item>

        <el-form-item label="CRON表达式">
          <el-input v-model="generatedCron" readonly>
            <template #append>
              <el-button @click="copyToClipboard(generatedCron)">复制</el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <el-divider></el-divider>

      <h3 class="text-lg font-semibold mb-4 mt-4">解析器</h3>
      <el-form>
        <el-form-item label="CRON表达式">
          <el-input v-model="cronToParse" placeholder="请输入CRON表达式"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="parseCron">解析</el-button>
        </el-form-item>
      </el-form>
      <div v-if="isValid !== null">
        <p class="mb-2">
          <strong>表达式是否有效: </strong>
          <el-tag :type="isValid ? 'success' : 'danger'">{{ isValid ? '有效' : '无效' }}</el-tag>
        </p>
      </div>
      <div v-if="parsedResult">
        <p><strong>解析结果:</strong> {{ parsedResult.chineseDesc }}（{{ parsedResult.description }}）</p>
        <p><strong>接下来5次执行时间:</strong></p>
        <el-timeline style="padding-left: 0; margin-top: 10px;">
          <el-timeline-item
            v-for="(date, index) in parsedResult.nextDates"
            :key="index"
            :timestamp="date"
          >
          </el-timeline-item>
        </el-timeline>
      </div>
      <div v-if="parseError">
        <p class="text-red-500" style="white-space: pre-wrap;">{{ parseError }}</p>
      </div>
    </div>

    <!-- desc -->
		<ToolDetail title="描述">
			<el-text>
				CRON表达式生成与解析工具，支持常用的CRON表达式，同时也支持自定义的CRON表达式。<br>
        同时使用了cron-parser和cron-chinese来解析，方便互相参照。<br>
        除了会解析CRON表达式，还会根据表达式含义列出后5次执行时间。
			</el-text> 
		</ToolDetail>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue';
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus';
import cronstrue from 'cronstrue/i18n';
import 'cronstrue/locales/zh_CN';
import { CronExpressionParser } from 'cron-parser';
import { copy } from '@/utils/string';
import { humanizeCronInChinese } from 'cron-chinese';



// Generator
const cronType = ref('everyMinute');
const minute = ref(0);
const time = ref(new Date(2000, 1, 1, 0, 0, 0));
const dayOfWeek = ref(1);
const dayOfMonth = ref(1);
const nSeconds = ref(1);
const nMinutes = ref(1);
const nHours = ref(1);
const nDays = ref(1);
const generatedCron = ref('* * * * *');

const weekDays = [
  { label: '星期一', value: 1 },
  { label: '星期二', value: 2 },
  { label: '星期三', value: 3 },
  { label: '星期四', value: 4 },
  { label: '星期五', value: 5 },
  { label: '星期六', value: 6 },
  { label: '星期日', value: 0 },
];

const generateCron = () => {
  const hour = time.value.getHours();
  const min = time.value.getMinutes();
  switch (cronType.value) {
    case 'everyMinute':
      generatedCron.value = '* * * * *';
      break;
    case 'everyHour':
      generatedCron.value = `${minute.value} * * * *`;
      break;
    case 'everyDay':
      generatedCron.value = `${min} ${hour} * * *`;
      break;
    case 'everyWeek':
      generatedCron.value = `${min} ${hour} * * ${dayOfWeek.value}`;
      break;
    case 'everyMonth':
      generatedCron.value = `${min} ${hour} ${dayOfMonth.value} * *`;
      break;
    case 'everyNSeconds':
      generatedCron.value = `*/${nSeconds.value} * * * * *`;
      break;
    case 'everyNMinutes':
      generatedCron.value = `*/${nMinutes.value} * * * *`;
      break;
    case 'everyNHours':
      generatedCron.value = `${minute.value} */${nHours.value} * * *`;
      break;
    case 'everyNDays':
      generatedCron.value = `${min} ${hour} */${nDays.value} * *`;
      break;
  }
};

const copyToClipboard = (text: string) => {
  copy(text);
  ElMessage.success('已复制到剪贴板');
};


// Parser
const cronToParse = ref('');
const parsedResult = ref<{ description: string; chineseDesc: string; nextDates: string[] } | null>(null);
const parseError = ref('');
const isValid = ref<boolean | null>(null);

const parseCron = () => {
  if (!cronToParse.value) {
    parseError.value = '请输入CRON表达式';
    parsedResult.value = null;
    isValid.value = null;
    return;
  }
  try {
    const description = cronstrue.toString(cronToParse.value, { locale: 'zh_CN' });
    const chineseDesc = humanizeCronInChinese(cronToParse.value);
    const interval = CronExpressionParser.parse(cronToParse.value);
    const nextDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      nextDates.push(interval.next().toDate().toLocaleString());
    }
    parsedResult.value = {
      description,
      chineseDesc,
      nextDates,
    };
    parseError.value = '';
    isValid.value = true;
  } catch (e: any) {
    let finalError = '无效的CRON表达式: ' + e;
    try {
      const chineseResult = humanizeCronInChinese(cronToParse.value);
      console.log('chineseResult:', chineseResult);
      if (typeof chineseResult === 'string') {
        finalError = `${chineseResult.replace('undefined', '?')}\n${finalError}`;
      }
    } catch (chineseLibError: any) {
      finalError = `${chineseLibError}\n${finalError}`;
    }
    parseError.value = finalError;
    parsedResult.value = null;
    isValid.value = false;
  }
};

generateCron();
</script>

<style scoped>
</style>
