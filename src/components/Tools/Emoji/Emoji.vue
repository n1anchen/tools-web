<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { copy } from '@/utils/string'


const categories = [
  { key: 'face', label: '表情脸部', icon: '😀' },
  { key: 'gesture', label: '手势肢体', icon: '👋' },
  { key: 'nature', label: '自然动物', icon: '🌿' },
  { key: 'food', label: '食物饮料', icon: '🍜' },
  { key: 'travel', label: '旅行地点', icon: '✈️' },
  { key: 'object', label: '物品符号', icon: '💡' },
  { key: 'symbol', label: '标志符号', icon: '✨' },
  { key: 'flag', label: '旗帜', icon: '🏳️' },
]

const emojiData: { emoji: string; name: string; category: string }[] = [
  // 表情脸部
  { emoji: '😀', name: '笑脸', category: 'face' }, { emoji: '😁', name: '咧嘴笑', category: 'face' },
  { emoji: '😂', name: '笑哭', category: 'face' }, { emoji: '🤣', name: '笑倒', category: 'face' },
  { emoji: '😃', name: '大笑', category: 'face' }, { emoji: '😄', name: '喜笑颜开', category: 'face' },
  { emoji: '😅', name: '苦笑', category: 'face' }, { emoji: '😆', name: '眯眼笑', category: 'face' },
  { emoji: '😉', name: '眨眼', category: 'face' }, { emoji: '😊', name: '微笑', category: 'face' },
  { emoji: '😋', name: '馋嘴', category: 'face' }, { emoji: '😎', name: '酷', category: 'face' },
  { emoji: '😍', name: '花痴', category: 'face' }, { emoji: '🥰', name: '心动', category: 'face' },
  { emoji: '😘', name: '飞吻', category: 'face' }, { emoji: '😗', name: '亲亲', category: 'face' },
  { emoji: '🙂', name: '淡淡的笑', category: 'face' }, { emoji: '🙃', name: '倒脸', category: 'face' },
  { emoji: '😐', name: '无表情', category: 'face' }, { emoji: '😑', name: '面无表情', category: 'face' },
  { emoji: '😶', name: '闭嘴', category: 'face' }, { emoji: '😏', name: '得意', category: 'face' },
  { emoji: '😒', name: '不满', category: 'face' }, { emoji: '🙄', name: '翻白眼', category: 'face' },
  { emoji: '😬', name: '龇牙咧嘴', category: 'face' }, { emoji: '🤥', name: '说谎', category: 'face' },
  { emoji: '😌', name: '如释重负', category: 'face' }, { emoji: '😔', name: '沉思', category: 'face' },
  { emoji: '😪', name: '困', category: 'face' }, { emoji: '🤤', name: '流口水', category: 'face' },
  { emoji: '😴', name: '睡觉', category: 'face' }, { emoji: '😷', name: '口罩', category: 'face' },
  { emoji: '🤒', name: '生病', category: 'face' }, { emoji: '🤕', name: '受伤', category: 'face' },
  { emoji: '🤢', name: '恶心', category: 'face' }, { emoji: '🤮', name: '呕吐', category: 'face' },
  { emoji: '🤧', name: '擤鼻涕', category: 'face' }, { emoji: '🥵', name: '热', category: 'face' },
  { emoji: '🥶', name: '冷', category: 'face' }, { emoji: '😵', name: '眩晕', category: 'face' },
  { emoji: '🤯', name: '爆头', category: 'face' }, { emoji: '🤠', name: '牛仔', category: 'face' },
  { emoji: '🥳', name: '派对', category: 'face' }, { emoji: '😎', name: '墨镜', category: 'face' },
  { emoji: '🤓', name: '书呆子', category: 'face' }, { emoji: '🧐', name: '单片眼镜', category: 'face' },
  { emoji: '😕', name: '困惑', category: 'face' }, { emoji: '😟', name: '担心', category: 'face' },
  { emoji: '🙁', name: '轻微不满', category: 'face' }, { emoji: '☹️', name: '皱眉', category: 'face' },
  { emoji: '😮', name: '惊讶张嘴', category: 'face' }, { emoji: '😯', name: '惊讶闭嘴', category: 'face' },
  { emoji: '😲', name: '震惊', category: 'face' }, { emoji: '😳', name: '脸红', category: 'face' },
  { emoji: '🥺', name: '恳求', category: 'face' }, { emoji: '😦', name: '皱眉张嘴', category: 'face' },
  { emoji: '😧', name: '苦恼', category: 'face' }, { emoji: '😨', name: '恐惧', category: 'face' },
  { emoji: '😰', name: '冷汗', category: 'face' }, { emoji: '😥', name: '轻微哭泣', category: 'face' },
  { emoji: '😢', name: '哭泣', category: 'face' }, { emoji: '😭', name: '嚎啕大哭', category: 'face' },
  { emoji: '😱', name: '尖叫', category: 'face' }, { emoji: '😖', name: '不舒服', category: 'face' },
  { emoji: '😣', name: '坚持', category: 'face' }, { emoji: '😞', name: '失望', category: 'face' },
  { emoji: '😓', name: '汗水', category: 'face' }, { emoji: '😩', name: '疲惫', category: 'face' },
  { emoji: '😫', name: '精疲力竭', category: 'face' }, { emoji: '🥱', name: '打哈欠', category: 'face' },
  { emoji: '😤', name: '愤怒鼻烟', category: 'face' }, { emoji: '😡', name: '生气', category: 'face' },
  { emoji: '😠', name: '愤怒', category: 'face' }, { emoji: '🤬', name: '爆粗', category: 'face' },
  { emoji: '😈', name: '微笑恶魔', category: 'face' }, { emoji: '👿', name: '愤怒恶魔', category: 'face' },
  { emoji: '💀', name: '骷髅', category: 'face' }, { emoji: '☠️', name: '骷髅交叉骨', category: 'face' },
  { emoji: '💩', name: '大便', category: 'face' }, { emoji: '🤡', name: '小丑', category: 'face' },
  { emoji: '👹', name: '鬼', category: 'face' }, { emoji: '👺', name: '哥斑鬼', category: 'face' },
  { emoji: '👻', name: '幽灵', category: 'face' }, { emoji: '👾', name: '外星怪', category: 'face' },
  { emoji: '🤖', name: '机器人', category: 'face' }, { emoji: '😺', name: '猫笑脸', category: 'face' },
  { emoji: '😸', name: '猫露齿笑', category: 'face' }, { emoji: '😻', name: '猫爱心眼', category: 'face' },
  // 手势肢体
  { emoji: '👋', name: '挥手', category: 'gesture' }, { emoji: '🤚', name: '举手', category: 'gesture' },
  { emoji: '🖐️', name: '张开手', category: 'gesture' }, { emoji: '✋', name: '停', category: 'gesture' },
  { emoji: '🖖', name: '瓦肯手礼', category: 'gesture' }, { emoji: '👌', name: 'OK', category: 'gesture' },
  { emoji: '🤌', name: '指尖捏合', category: 'gesture' }, { emoji: '✌️', name: '胜利', category: 'gesture' },
  { emoji: '🤞', name: '交叉手指', category: 'gesture' }, { emoji: '🤟', name: '爱你手势', category: 'gesture' },
  { emoji: '🤘', name: '摇滚', category: 'gesture' }, { emoji: '🤙', name: '打电话', category: 'gesture' },
  { emoji: '👈', name: '向左指', category: 'gesture' }, { emoji: '👉', name: '向右指', category: 'gesture' },
  { emoji: '👆', name: '向上指', category: 'gesture' }, { emoji: '👇', name: '向下指', category: 'gesture' },
  { emoji: '☝️', name: '食指向上', category: 'gesture' }, { emoji: '👍', name: '点赞', category: 'gesture' },
  { emoji: '👎', name: '踩', category: 'gesture' }, { emoji: '✊', name: '拳头', category: 'gesture' },
  { emoji: '👊', name: '出拳', category: 'gesture' }, { emoji: '🤛', name: '左拳', category: 'gesture' },
  { emoji: '🤜', name: '右拳', category: 'gesture' }, { emoji: '👏', name: '鼓掌', category: 'gesture' },
  { emoji: '🙌', name: '举手欢呼', category: 'gesture' }, { emoji: '👐', name: '双手张开', category: 'gesture' },
  { emoji: '🤲', name: '合掌', category: 'gesture' }, { emoji: '🙏', name: '祈祷', category: 'gesture' },
  { emoji: '✍️', name: '写字', category: 'gesture' }, { emoji: '💅', name: '涂指甲', category: 'gesture' },
  { emoji: '🤳', name: '自拍', category: 'gesture' }, { emoji: '💪', name: '肌肉', category: 'gesture' },
  { emoji: '🦵', name: '腿', category: 'gesture' }, { emoji: '🦶', name: '脚', category: 'gesture' },
  { emoji: '👂', name: '耳朵', category: 'gesture' }, { emoji: '👃', name: '鼻子', category: 'gesture' },
  { emoji: '🧠', name: '大脑', category: 'gesture' }, { emoji: '🦷', name: '牙齿', category: 'gesture' },
  { emoji: '👀', name: '眼睛', category: 'gesture' }, { emoji: '👁️', name: '眼', category: 'gesture' },
  { emoji: '👅', name: '舌头', category: 'gesture' }, { emoji: '👄', name: '嘴唇', category: 'gesture' },
  // 自然动物
  { emoji: '🐶', name: '狗', category: 'nature' }, { emoji: '🐱', name: '猫', category: 'nature' },
  { emoji: '🐭', name: '老鼠', category: 'nature' }, { emoji: '🐹', name: '仓鼠', category: 'nature' },
  { emoji: '🐰', name: '兔子', category: 'nature' }, { emoji: '🦊', name: '狐狸', category: 'nature' },
  { emoji: '🐻', name: '熊', category: 'nature' }, { emoji: '🐼', name: '熊猫', category: 'nature' },
  { emoji: '🐨', name: '考拉', category: 'nature' }, { emoji: '🐯', name: '老虎', category: 'nature' },
  { emoji: '🦁', name: '狮子', category: 'nature' }, { emoji: '🐮', name: '奶牛', category: 'nature' },
  { emoji: '🐷', name: '猪', category: 'nature' }, { emoji: '🐸', name: '青蛙', category: 'nature' },
  { emoji: '🐵', name: '猴子', category: 'nature' }, { emoji: '🐔', name: '鸡', category: 'nature' },
  { emoji: '🐧', name: '企鹅', category: 'nature' }, { emoji: '🐦', name: '鸟', category: 'nature' },
  { emoji: '🦆', name: '鸭子', category: 'nature' }, { emoji: '🦅', name: '鹰', category: 'nature' },
  { emoji: '🦉', name: '猫头鹰', category: 'nature' }, { emoji: '🦇', name: '蝙蝠', category: 'nature' },
  { emoji: '🐺', name: '狼', category: 'nature' }, { emoji: '🐗', name: '野猪', category: 'nature' },
  { emoji: '🐴', name: '马', category: 'nature' }, { emoji: '🦄', name: '独角兽', category: 'nature' },
  { emoji: '🐝', name: '蜜蜂', category: 'nature' }, { emoji: '🦋', name: '蝴蝶', category: 'nature' },
  { emoji: '🐌', name: '蜗牛', category: 'nature' }, { emoji: '🐛', name: '毛虫', category: 'nature' },
  { emoji: '🐞', name: '瓢虫', category: 'nature' }, { emoji: '🐜', name: '蚂蚁', category: 'nature' },
  { emoji: '🦟', name: '蚊子', category: 'nature' }, { emoji: '🦗', name: '蟑螂', category: 'nature' },
  { emoji: '🕷️', name: '蜘蛛', category: 'nature' }, { emoji: '🦂', name: '蝎子', category: 'nature' },
  { emoji: '🐢', name: '乌龟', category: 'nature' }, { emoji: '🐍', name: '蛇', category: 'nature' },
  { emoji: '🦎', name: '蜥蜴', category: 'nature' }, { emoji: '🦖', name: '恐龙', category: 'nature' },
  { emoji: '🐙', name: '章鱼', category: 'nature' }, { emoji: '🦑', name: '鱿鱼', category: 'nature' },
  { emoji: '🦐', name: '虾', category: 'nature' }, { emoji: '🦀', name: '螃蟹', category: 'nature' },
  { emoji: '🐡', name: '河豚', category: 'nature' }, { emoji: '🐠', name: '热带鱼', category: 'nature' },
  { emoji: '🐟', name: '鱼', category: 'nature' }, { emoji: '🐬', name: '海豚', category: 'nature' },
  { emoji: '🐳', name: '鲸鱼', category: 'nature' }, { emoji: '🦈', name: '鲨鱼', category: 'nature' },
  { emoji: '🌸', name: '樱花', category: 'nature' }, { emoji: '🌹', name: '玫瑰', category: 'nature' },
  { emoji: '🌺', name: '芙蓉花', category: 'nature' }, { emoji: '🌻', name: '向日葵', category: 'nature' },
  { emoji: '🌼', name: '雏菊', category: 'nature' }, { emoji: '🌷', name: '郁金香', category: 'nature' },
  { emoji: '🌱', name: '幼苗', category: 'nature' }, { emoji: '🌲', name: '常青树', category: 'nature' },
  { emoji: '🌳', name: '落叶树', category: 'nature' }, { emoji: '🍀', name: '四叶草', category: 'nature' },
  { emoji: '🍁', name: '枫叶', category: 'nature' }, { emoji: '🌊', name: '海浪', category: 'nature' },
  { emoji: '🌈', name: '彩虹', category: 'nature' }, { emoji: '⛅', name: '晴间多云', category: 'nature' },
  { emoji: '🌧️', name: '下雨', category: 'nature' }, { emoji: '⛈️', name: '雷暴', category: 'nature' },
  { emoji: '❄️', name: '雪花', category: 'nature' }, { emoji: '☃️', name: '雪人', category: 'nature' },
  { emoji: '🔥', name: '火', category: 'nature' }, { emoji: '💧', name: '水滴', category: 'nature' },
  // 食物饮料
  { emoji: '🍎', name: '苹果', category: 'food' }, { emoji: '🍊', name: '橘子', category: 'food' },
  { emoji: '🍋', name: '柠檬', category: 'food' }, { emoji: '🍇', name: '葡萄', category: 'food' },
  { emoji: '🍓', name: '草莓', category: 'food' }, { emoji: '🫐', name: '蓝莓', category: 'food' },
  { emoji: '🍒', name: '樱桃', category: 'food' }, { emoji: '🍑', name: '桃子', category: 'food' },
  { emoji: '🥭', name: '芒果', category: 'food' }, { emoji: '🍍', name: '菠萝', category: 'food' },
  { emoji: '🍌', name: '香蕉', category: 'food' }, { emoji: '🍉', name: '西瓜', category: 'food' },
  { emoji: '🍈', name: '甜瓜', category: 'food' }, { emoji: '🍏', name: '青苹果', category: 'food' },
  { emoji: '🥑', name: '牛油果', category: 'food' }, { emoji: '🍆', name: '茄子', category: 'food' },
  { emoji: '🥦', name: '花椰菜', category: 'food' }, { emoji: '🌽', name: '玉米', category: 'food' },
  { emoji: '🌶️', name: '辣椒', category: 'food' }, { emoji: '🧄', name: '大蒜', category: 'food' },
  { emoji: '🧅', name: '洋葱', category: 'food' }, { emoji: '🥕', name: '胡萝卜', category: 'food' },
  { emoji: '🍞', name: '面包', category: 'food' }, { emoji: '🥐', name: '可颂', category: 'food' },
  { emoji: '🥨', name: '椒盐饼', category: 'food' }, { emoji: '🥞', name: '煎饼', category: 'food' },
  { emoji: '🧇', name: '华夫饼', category: 'food' }, { emoji: '🍳', name: '煎蛋', category: 'food' },
  { emoji: '🥚', name: '鸡蛋', category: 'food' }, { emoji: '🧈', name: '黄油', category: 'food' },
  { emoji: '🥓', name: '培根', category: 'food' }, { emoji: '🍔', name: '汉堡', category: 'food' },
  { emoji: '🍟', name: '薯条', category: 'food' }, { emoji: '🌭', name: '热狗', category: 'food' },
  { emoji: '🌮', name: '墨西哥卷饼', category: 'food' }, { emoji: '🌯', name: '卷饼', category: 'food' },
  { emoji: '🍕', name: '披萨', category: 'food' }, { emoji: '🍝', name: '意面', category: 'food' },
  { emoji: '🍜', name: '拉面', category: 'food' }, { emoji: '🍲', name: '火锅', category: 'food' },
  { emoji: '🍛', name: '咖喱', category: 'food' }, { emoji: '🍣', name: '寿司', category: 'food' },
  { emoji: '🍱', name: '便当', category: 'food' }, { emoji: '🍦', name: '软冰淇淋', category: 'food' },
  { emoji: '🍧', name: '刨冰', category: 'food' }, { emoji: '🍨', name: '冰淇淋', category: 'food' },
  { emoji: '🍩', name: '甜甜圈', category: 'food' }, { emoji: '🍪', name: '饼干', category: 'food' },
  { emoji: '🎂', name: '生日蛋糕', category: 'food' }, { emoji: '🍰', name: '蛋糕', category: 'food' },
  { emoji: '🧁', name: '纸杯蛋糕', category: 'food' }, { emoji: '🍫', name: '巧克力', category: 'food' },
  { emoji: '🍬', name: '糖果', category: 'food' }, { emoji: '🍭', name: '棒棒糖', category: 'food' },
  { emoji: '☕', name: '咖啡', category: 'food' }, { emoji: '🍵', name: '茶', category: 'food' },
  { emoji: '🧃', name: '果汁', category: 'food' }, { emoji: '🥤', name: '饮料', category: 'food' },
  { emoji: '🍺', name: '啤酒', category: 'food' }, { emoji: '🍻', name: '干杯', category: 'food' },
  { emoji: '🥂', name: '香槟', category: 'food' }, { emoji: '🍷', name: '红酒', category: 'food' },
  // 旅行地点
  { emoji: '🚗', name: '汽车', category: 'travel' }, { emoji: '🚕', name: '出租车', category: 'travel' },
  { emoji: '🚙', name: '越野车', category: 'travel' }, { emoji: '🚌', name: '公交车', category: 'travel' },
  { emoji: '🚎', name: '无轨电车', category: 'travel' }, { emoji: '🚐', name: '小客车', category: 'travel' },
  { emoji: '🚑', name: '救护车', category: 'travel' }, { emoji: '🚒', name: '消防车', category: 'travel' },
  { emoji: '🚓', name: '警车', category: 'travel' }, { emoji: '🚃', name: '火车厢', category: 'travel' },
  { emoji: '🚋', name: '电车', category: 'travel' }, { emoji: '🚞', name: '山地列车', category: 'travel' },
  { emoji: '🚝', name: '单轨铁路', category: 'travel' }, { emoji: '🚄', name: '高铁', category: 'travel' },
  { emoji: '✈️', name: '飞机', category: 'travel' }, { emoji: '🚀', name: '火箭', category: 'travel' },
  { emoji: '🛸', name: '飞碟', category: 'travel' }, { emoji: '🚁', name: '直升机', category: 'travel' },
  { emoji: '⛵', name: '帆船', category: 'travel' }, { emoji: '🚢', name: '轮船', category: 'travel' },
  { emoji: '⚓', name: '锚', category: 'travel' }, { emoji: '🏠', name: '房子', category: 'travel' },
  { emoji: '🏡', name: '别墅', category: 'travel' }, { emoji: '🏢', name: '办公楼', category: 'travel' },
  { emoji: '🏦', name: '银行', category: 'travel' }, { emoji: '🏨', name: '酒店', category: 'travel' },
  { emoji: '🏩', name: '情人旅馆', category: 'travel' }, { emoji: '🏪', name: '便利店', category: 'travel' },
  { emoji: '🏫', name: '学校', category: 'travel' }, { emoji: '🏭', name: '工厂', category: 'travel' },
  { emoji: '🗼', name: '东京铁塔', category: 'travel' }, { emoji: '🗽', name: '自由女神', category: 'travel' },
  { emoji: '⛩️', name: '神社', category: 'travel' }, { emoji: '🌁', name: '大桥', category: 'travel' },
  { emoji: '🌃', name: '星夜', category: 'travel' }, { emoji: '🌆', name: '黄昏城市', category: 'travel' },
  { emoji: '🌇', name: '日落城市', category: 'travel' }, { emoji: '🌉', name: '夜晚大桥', category: 'travel' },
  { emoji: '🎠', name: '旋转木马', category: 'travel' }, { emoji: '🎡', name: '摩天轮', category: 'travel' },
  { emoji: '🏖️', name: '海滩', category: 'travel' }, { emoji: '🏝️', name: '小岛', category: 'travel' },
  { emoji: '⛰️', name: '山', category: 'travel' }, { emoji: '🗻', name: '富士山', category: 'travel' },
  // 物品符号
  { emoji: '⌚', name: '手表', category: 'object' }, { emoji: '📱', name: '手机', category: 'object' },
  { emoji: '💻', name: '电脑', category: 'object' }, { emoji: '🖥️', name: '台式机', category: 'object' },
  { emoji: '⌨️', name: '键盘', category: 'object' }, { emoji: '🖱️', name: '鼠标', category: 'object' },
  { emoji: '📷', name: '相机', category: 'object' }, { emoji: '📸', name: '相机闪光', category: 'object' },
  { emoji: '📺', name: '电视', category: 'object' }, { emoji: '📻', name: '收音机', category: 'object' },
  { emoji: '🎙️', name: '麦克风', category: 'object' }, { emoji: '🎧', name: '耳机', category: 'object' },
  { emoji: '📞', name: '电话', category: 'object' }, { emoji: '🔋', name: '电池', category: 'object' },
  { emoji: '🔌', name: '插头', category: 'object' }, { emoji: '💡', name: '灯泡', category: 'object' },
  { emoji: '🔦', name: '手电筒', category: 'object' }, { emoji: '🕯️', name: '蜡烛', category: 'object' },
  { emoji: '📚', name: '书', category: 'object' }, { emoji: '📖', name: '开书', category: 'object' },
  { emoji: '📝', name: '备忘录', category: 'object' }, { emoji: '✏️', name: '铅笔', category: 'object' },
  { emoji: '🖊️', name: '钢笔', category: 'object' }, { emoji: '📌', name: '图钉', category: 'object' },
  { emoji: '📎', name: '回形针', category: 'object' }, { emoji: '✂️', name: '剪刀', category: 'object' },
  { emoji: '🗑️', name: '垃圾桶', category: 'object' }, { emoji: '🔒', name: '锁', category: 'object' },
  { emoji: '🔑', name: '钥匙', category: 'object' }, { emoji: '🔨', name: '锤子', category: 'object' },
  { emoji: '🪛', name: '螺丝刀', category: 'object' }, { emoji: '⚙️', name: '齿轮', category: 'object' },
  { emoji: '🧲', name: '磁铁', category: 'object' }, { emoji: '🧪', name: '试管', category: 'object' },
  { emoji: '🧬', name: 'DNA', category: 'object' }, { emoji: '💊', name: '药丸', category: 'object' },
  { emoji: '🩺', name: '听诊器', category: 'object' }, { emoji: '💉', name: '注射器', category: 'object' },
  { emoji: '🎁', name: '礼物', category: 'object' }, { emoji: '🎀', name: '蝴蝶结', category: 'object' },
  { emoji: '🏆', name: '奖杯', category: 'object' }, { emoji: '🥇', name: '金牌', category: 'object' },
  { emoji: '🎮', name: '游戏手柄', category: 'object' }, { emoji: '🎲', name: '骰子', category: 'object' },
  { emoji: '♟️', name: '棋子', category: 'object' }, { emoji: '🎯', name: '靶心', category: 'object' },
  { emoji: '🎸', name: '吉他', category: 'object' }, { emoji: '🎹', name: '钢琴', category: 'object' },
  { emoji: '🎺', name: '小号', category: 'object' }, { emoji: '🥁', name: '鼓', category: 'object' },
  // 标志符号
  { emoji: '❤️', name: '红心', category: 'symbol' }, { emoji: '🧡', name: '橙心', category: 'symbol' },
  { emoji: '💛', name: '黄心', category: 'symbol' }, { emoji: '💚', name: '绿心', category: 'symbol' },
  { emoji: '💙', name: '蓝心', category: 'symbol' }, { emoji: '💜', name: '紫心', category: 'symbol' },
  { emoji: '🖤', name: '黑心', category: 'symbol' }, { emoji: '🤍', name: '白心', category: 'symbol' },
  { emoji: '🤎', name: '棕心', category: 'symbol' }, { emoji: '💔', name: '心碎', category: 'symbol' },
  { emoji: '❣️', name: '感叹号心', category: 'symbol' }, { emoji: '💕', name: '双心', category: 'symbol' },
  { emoji: '💞', name: '旋转心', category: 'symbol' }, { emoji: '💓', name: '心跳', category: 'symbol' },
  { emoji: '💗', name: '粉色心', category: 'symbol' }, { emoji: '💖', name: '闪亮心', category: 'symbol' },
  { emoji: '💘', name: '丘比特心', category: 'symbol' }, { emoji: '💝', name: '礼盒心', category: 'symbol' },
  { emoji: '⭐', name: '星', category: 'symbol' }, { emoji: '🌟', name: '闪亮星', category: 'symbol' },
  { emoji: '✨', name: '星光', category: 'symbol' }, { emoji: '💫', name: '旋转星', category: 'symbol' },
  { emoji: '⚡', name: '闪电', category: 'symbol' }, { emoji: '💥', name: '爆炸', category: 'symbol' },
  { emoji: '🌀', name: '旋涡', category: 'symbol' }, { emoji: '🎵', name: '音符', category: 'symbol' },
  { emoji: '🎶', name: '音乐', category: 'symbol' }, { emoji: '💯', name: '100分', category: 'symbol' },
  { emoji: '🔴', name: '红圆', category: 'symbol' }, { emoji: '🟠', name: '橙圆', category: 'symbol' },
  { emoji: '🟡', name: '黄圆', category: 'symbol' }, { emoji: '🟢', name: '绿圆', category: 'symbol' },
  { emoji: '🔵', name: '蓝圆', category: 'symbol' }, { emoji: '🟣', name: '紫圆', category: 'symbol' },
  { emoji: '⚫', name: '黑圆', category: 'symbol' }, { emoji: '⚪', name: '白圆', category: 'symbol' },
  { emoji: '🔶', name: '橙菱', category: 'symbol' }, { emoji: '🔷', name: '蓝菱', category: 'symbol' },
  { emoji: '✅', name: '复选框', category: 'symbol' }, { emoji: '❌', name: '叉号', category: 'symbol' },
  { emoji: '❓', name: '问号', category: 'symbol' }, { emoji: '❗', name: '感叹号', category: 'symbol' },
  { emoji: '🔞', name: '禁止未成年', category: 'symbol' }, { emoji: '🚫', name: '禁止', category: 'symbol' },
  { emoji: '✔️', name: '勾', category: 'symbol' }, { emoji: '🔝', name: '顶部', category: 'symbol' },
  { emoji: '🆗', name: 'OK', category: 'symbol' }, { emoji: '🆕', name: '新', category: 'symbol' },
  // 旗帜
  { emoji: '🏳️', name: '白旗', category: 'flag' }, { emoji: '🏴', name: '黑旗', category: 'flag' },
  { emoji: '🏁', name: '方格旗', category: 'flag' }, { emoji: '🚩', name: '红旗', category: 'flag' },
  { emoji: '🏳️‍🌈', name: '彩虹旗', category: 'flag' }, { emoji: '🇨🇳', name: '中国', category: 'flag' },
  { emoji: '🇺🇸', name: '美国', category: 'flag' }, { emoji: '🇯🇵', name: '日本', category: 'flag' },
  { emoji: '🇰🇷', name: '韩国', category: 'flag' }, { emoji: '🇬🇧', name: '英国', category: 'flag' },
  { emoji: '🇩🇪', name: '德国', category: 'flag' }, { emoji: '🇫🇷', name: '法国', category: 'flag' },
  { emoji: '🇷🇺', name: '俄罗斯', category: 'flag' }, { emoji: '🇧🇷', name: '巴西', category: 'flag' },
  { emoji: '🇨🇦', name: '加拿大', category: 'flag' }, { emoji: '🇦🇺', name: '澳大利亚', category: 'flag' },
]

const searchText = ref('')
const activeCategory = ref('all')
const viewMode = ref<'all' | 'favorites' | 'recent'>('all')
const favorites = ref<string[]>([])
const recent = ref<string[]>([])
const FAVORITES_KEY = 'emoji-tool-favorites'
const RECENT_KEY = 'emoji-tool-recent'

const categoryLabels = Object.fromEntries(categories.map(category => [category.key, category.label]))
const categoryCounts = computed(() => Object.fromEntries(categories.map(category => [category.key, emojiData.filter(item => item.category === category.key).length])))

function emojiCode(emoji: string) {
  return Array.from(emoji).map(char => `U+${char.codePointAt(0)?.toString(16).toUpperCase()}`).join(' ')
}

function persist() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value))
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value))
  } catch { /* 浏览器禁用存储时仍可在本次会话使用 */ }
}

function setViewMode(mode: 'all' | 'favorites' | 'recent') {
  viewMode.value = mode
  activeCategory.value = 'all'
}

function selectCategory(key: string) {
  viewMode.value = 'all'
  activeCategory.value = key
}

function toggleFavorite(emoji: string) {
  favorites.value = favorites.value.includes(emoji)
    ? favorites.value.filter(item => item !== emoji)
    : [emoji, ...favorites.value].slice(0, 100)
  persist()
}

async function copyEmoji(emoji: string) {
  if (!await copy(emoji)) return
  recent.value = [emoji, ...recent.value.filter(item => item !== emoji)].slice(0, 24)
  persist()
}

const filtered = computed(() => {
  let list = [...emojiData]
  if (viewMode.value === 'favorites') list = list.filter(item => favorites.value.includes(item.emoji))
  if (viewMode.value === 'recent') {
    const order = new Map(recent.value.map((emoji, index) => [emoji, index]))
    list = list.filter(item => order.has(item.emoji)).sort((left, right) => (order.get(left.emoji) ?? 99) - (order.get(right.emoji) ?? 99))
  }
  if (activeCategory.value !== 'all') list = list.filter(item => item.category === activeCategory.value)
  const query = searchText.value.trim().toLocaleLowerCase('zh-CN')
  if (query) {
    const terms = query.split(/\s+/)
    list = list.filter(item => {
      const haystack = `${item.emoji} ${item.name} ${categoryLabels[item.category]} ${emojiCode(item.emoji)}`.toLocaleLowerCase('zh-CN')
      return terms.every(term => haystack.includes(term))
    })
  }
  return list
})

onMounted(() => {
  try {
    const savedFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
    const savedRecent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    if (Array.isArray(savedFavorites)) favorites.value = savedFavorites.filter(item => typeof item === 'string').slice(0, 100)
    if (Array.isArray(savedRecent)) recent.value = savedRecent.filter(item => typeof item === 'string').slice(0, 24)
  } catch { /* 忽略损坏的历史数据 */ }
})
</script>

<template>
  <div class="emoji-page flex flex-col mt-3 flex-1">
    <ToolHero summary="找到表情，收藏起来，点一下就复制">
      <template #metrics>
        <MetricsBar :items="[{ label: '收录表情', value: emojiData.length }, { label: '我的收藏', value: favorites.length }, { label: '最近使用', value: recent.length }]" />
      </template>
    </ToolHero>

    <section class="browser-card">
      <div class="search-row">
        <label><span>搜索 Emoji</span><div class="search-box"><span>⌕</span><input v-model="searchText" placeholder="例如：笑、爱心、U+1F44D" aria-label="搜索 Emoji"></div></label>
        <div class="view-tabs" aria-label="Emoji 查看范围">
          <button type="button" :class="{ active: viewMode === 'all' }" @click="setViewMode('all')">全部 <span>{{ emojiData.length }}</span></button>
          <button type="button" :class="{ active: viewMode === 'favorites' }" @click="setViewMode('favorites')">★ 收藏 <span>{{ favorites.length }}</span></button>
          <button type="button" :class="{ active: viewMode === 'recent' }" @click="setViewMode('recent')">↺ 最近 <span>{{ recent.length }}</span></button>
        </div>
      </div>

      <nav class="category-rail" aria-label="Emoji 分类">
        <button type="button" :class="{ active: activeCategory === 'all' && viewMode === 'all' }" @click="selectCategory('all')"><span>🧭</span><strong>全部分类</strong><em>{{ emojiData.length }}</em></button>
        <button v-for="category in categories" :key="category.key" type="button" :class="{ active: activeCategory === category.key && viewMode === 'all' }" @click="selectCategory(category.key)"><span>{{ category.icon }}</span><strong>{{ category.label }}</strong><em>{{ categoryCounts[category.key] }}</em></button>
      </nav>

      <div v-if="recent.length && viewMode === 'all' && !searchText" class="recent-strip">
        <header><div><strong>最近使用</strong><span>点击可再次复制</span></div><button type="button" @click="setViewMode('recent')">查看全部</button></header>
        <div><button v-for="emoji in recent.slice(0, 12)" :key="emoji" type="button" :aria-label="`复制最近使用的 ${emoji}`" @click="copyEmoji(emoji)">{{ emoji }}</button></div>
      </div>

      <div class="result-heading"><div><span class="eyebrow">{{ viewMode === 'favorites' ? 'FAVORITES' : viewMode === 'recent' ? 'RECENT' : 'BROWSE' }}</span><h3>{{ viewMode === 'favorites' ? '我的收藏' : viewMode === 'recent' ? '最近使用' : activeCategory === 'all' ? '全部 Emoji' : categoryLabels[activeCategory] }}</h3></div><p>找到 {{ filtered.length }} 个结果 · 点击卡片复制，点击星标收藏</p></div>

      <div v-if="filtered.length" class="emoji-grid">
        <article v-for="(item, index) in filtered" :key="`${item.emoji}-${item.category}-${index}`" :class="{ favorite: favorites.includes(item.emoji) }">
          <button type="button" class="favorite-button" :aria-label="favorites.includes(item.emoji) ? `取消收藏 ${item.name}` : `收藏 ${item.name}`" @click="toggleFavorite(item.emoji)">{{ favorites.includes(item.emoji) ? '★' : '☆' }}</button>
          <button type="button" class="emoji-button" :aria-label="`复制 ${item.name} ${item.emoji}`" @click="copyEmoji(item.emoji)"><span>{{ item.emoji }}</span><strong>{{ item.name }}</strong><small>{{ emojiCode(item.emoji) }}</small></button>
        </article>
      </div>
      <div v-else class="empty-state"><span>{{ viewMode === 'favorites' ? '☆' : '⌕' }}</span><strong>{{ viewMode === 'favorites' ? '还没有收藏 Emoji' : '没有找到匹配结果' }}</strong><p>{{ viewMode === 'favorites' ? '浏览表情时点击右上角星标，常用 Emoji 会更容易找到。' : '尝试更短的中文关键词、切换全部分类，或搜索 Unicode 编码。' }}</p><button v-if="searchText || viewMode !== 'all'" type="button" @click="searchText = ''; setViewMode('all')">查看全部 Emoji</button></div>
    </section>

    <ToolGuide title="搜索、收藏与隐私说明">
      <div class="detail-grid"><article><strong>多维搜索</strong><p>支持中文名称、Emoji 字符、分类名称和 Unicode 编码；空格分隔的多个关键词需同时匹配。</p></article><article><strong>收藏与最近使用</strong><p>收藏最多保留 100 个，最近使用保留 24 个；两者均存放在当前浏览器的本地存储中。</p></article><article><strong>一键复制</strong><p>点击表情卡片即可复制，并自动进入最近使用。不同系统的 Emoji 字形可能略有差异。</p></article></div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.emoji-page{--accent:#f97316;gap:18px}.browser-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.055)}.eyebrow{display:block;color:var(--accent);font-size:12px;font-weight:900;letter-spacing:.12em}.browser-card{padding:22px}.search-row{display:grid;grid-template-columns:minmax(280px,1fr) auto;gap:14px;align-items:end}.search-row label>span{display:block;margin-bottom:6px;color:#475569;font-size:12px;font-weight:850}.search-box{display:flex;height:44px;align-items:center;gap:8px;padding:0 12px;border:1px solid #dbe3ef;border-radius:12px;background:#f8fafc}.search-box>span{color:#94a3b8;font-size:22px}.search-box input{width:100%;border:0;outline:0;background:transparent;color:#1e293b;font-size:14px}.view-tabs{display:flex;gap:6px;padding:5px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.view-tabs button{min-height:34px;padding:0 11px;border:1px solid transparent;border-radius:8px;background:transparent;color:#64748b;font-size:12px;font-weight:800;cursor:pointer}.view-tabs button span{margin-left:4px;color:#94a3b8}.view-tabs button.active{border-color:#fed7aa;background:#fff;color:#c2410c;box-shadow:0 3px 10px rgba(249,115,22,.1)}.category-rail{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:7px;margin-top:14px;overflow-x:auto}.category-rail button{position:relative;min-width:86px;padding:11px 7px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#64748b;text-align:center;cursor:pointer}.category-rail button>span,.category-rail button>strong{display:block}.category-rail button>span{font-size:23px}.category-rail button>strong{margin-top:5px;font-size:12px}.category-rail button>em{position:absolute;top:6px;right:7px;color:#94a3b8;font-size:10px;font-style:normal}.category-rail button.active{border-color:#fdba74;background:#fff7ed;color:#c2410c;box-shadow:0 4px 12px rgba(249,115,22,.1)}.recent-strip{margin-top:14px;padding:12px;border:1px solid #ffedd5;border-radius:14px;background:#fffaf5}.recent-strip header{display:flex;align-items:center;justify-content:space-between}.recent-strip header strong,.recent-strip header span{display:block}.recent-strip header strong{color:#9a3412;font-size:13px}.recent-strip header span{margin-top:2px;color:#94a3b8;font-size:12px}.recent-strip header button{border:0;background:transparent;color:#ea580c;font-size:12px;font-weight:850;cursor:pointer}.recent-strip>div{display:flex;gap:7px;margin-top:9px;overflow-x:auto}.recent-strip>div button{width:42px;height:42px;flex:none;border:1px solid #fed7aa;border-radius:10px;background:#fff;font-size:23px;cursor:pointer}.result-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:20px 0 11px}.result-heading h3{margin:4px 0 0;color:#0f172a;font-size:19px}.result-heading p{margin:0;color:#64748b;font-size:12px}.emoji-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}.emoji-grid article{position:relative;min-width:0;overflow:hidden;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc;transition:.16s}.emoji-grid article:hover{border-color:#fdba74;background:#fff7ed;transform:translateY(-2px);box-shadow:0 8px 18px rgba(249,115,22,.1)}.emoji-grid article.favorite{border-color:#fed7aa}.favorite-button{position:absolute;z-index:1;top:5px;right:6px;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#f59e0b;font-size:18px;cursor:pointer}.emoji-button{display:flex;width:100%;min-height:112px;align-items:center;justify-content:center;flex-direction:column;padding:13px 7px 9px;border:0;background:transparent;cursor:pointer}.emoji-button>span{font-size:34px;line-height:1.2}.emoji-button strong{display:block;width:100%;overflow:hidden;margin-top:7px;color:#334155;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.emoji-button small{display:block;width:100%;overflow:hidden;margin-top:3px;color:#94a3b8;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.empty-state{display:flex;min-height:330px;align-items:center;justify-content:center;flex-direction:column;border:1px dashed #fed7aa;border-radius:16px;background:#fffaf5;text-align:center}.empty-state>span{color:#fdba74;font-size:48px}.empty-state strong{margin-top:8px;color:#9a3412;font-size:16px}.empty-state p{max-width:440px;margin:7px 20px 0;color:#64748b;font-size:13px;line-height:1.7}.empty-state button{margin-top:13px;padding:9px 13px;border:0;border-radius:9px;background:#f97316;color:#fff;font-size:12px;font-weight:850;cursor:pointer}.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.detail-grid article{padding:14px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}.detail-grid strong{color:#334155;font-size:13px}.detail-grid p{margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.7}:global(html.dark .browser-card){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .search-row label>span),:global(html.dark .result-heading h3),:global(html.dark .emoji-button strong),:global(html.dark .detail-grid strong){color:#f1f5f9}:global(html.dark .result-heading p),:global(html.dark .emoji-button small),:global(html.dark .detail-grid p),:global(html.dark .empty-state p),:global(html.dark .recent-strip header span){color:#94a3b8}:global(html.dark .search-box),:global(html.dark .view-tabs),:global(html.dark .category-rail button),:global(html.dark .emoji-grid article),:global(html.dark .detail-grid article){border-color:#334155;background:#172033}:global(html.dark .search-box input){color:#e2e8f0}:global(html.dark .view-tabs button.active){border-color:#9a3412;background:#431407;color:#fdba74}:global(html.dark .category-rail button.active),:global(html.dark .emoji-grid article:hover){border-color:#9a3412;background:#431407;color:#fdba74}:global(html.dark .recent-strip),:global(html.dark .empty-state){border-color:#7c2d12;background:#2a160e}:global(html.dark .recent-strip>div button){border-color:#7c2d12;background:#431407}:global(html.dark .recent-strip header strong),:global(html.dark .empty-state strong){color:#fdba74}@media(max-width:1050px){.category-rail{grid-template-columns:repeat(9,96px)}.search-row{grid-template-columns:1fr}.view-tabs{width:max-content}}@media(max-width:720px){.emoji-page{gap:12px}.browser-card{border-radius:16px}.browser-card{padding:15px}.view-tabs{width:100%}.view-tabs button{flex:1;padding-inline:6px}.result-heading{align-items:flex-start;flex-direction:column}.emoji-grid{grid-template-columns:repeat(auto-fill,minmax(92px,1fr))}.detail-grid{grid-template-columns:1fr}}@media(max-width:430px){.view-tabs button span{display:none}.emoji-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.emoji-button{min-height:106px}.emoji-button>span{font-size:30px}}</style>
