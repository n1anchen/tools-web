<script setup lang="ts">
import { ref, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'

const title = 'Emoji 大全'

const categories = [
  { key: 'face', label: '表情脸部' },
  { key: 'gesture', label: '手势肢体' },
  { key: 'nature', label: '自然动物' },
  { key: 'food', label: '食物饮料' },
  { key: 'travel', label: '旅行地点' },
  { key: 'object', label: '物品符号' },
  { key: 'symbol', label: '标志符号' },
  { key: 'flag', label: '旗帜' },
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

const filtered = computed(() => {
  let list = activeCategory.value === 'all' ? emojiData : emojiData.filter(e => e.category === activeCategory.value)
  if (searchText.value.trim())
    list = list.filter(e => e.name.includes(searchText.value.trim()) || e.emoji.includes(searchText.value.trim()))
  return list
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-3">
      <el-input v-model="searchText" placeholder="搜索 Emoji 名称..." clearable>
        <template #prefix><span class="text-slate-400">🔍</span></template>
      </el-input>
      <div class="flex flex-wrap gap-2">
        <el-button :type="activeCategory === 'all' ? 'primary' : ''" size="small" @click="activeCategory = 'all'">全部</el-button>
        <el-button
          v-for="c in categories" :key="c.key"
          :type="activeCategory === c.key ? 'primary' : ''"
          size="small"
          @click="activeCategory = c.key"
        >{{ c.label }}</el-button>
      </div>
      <p class="text-xs text-slate-400 dark:text-slate-500">共 {{ filtered.length }} 个，点击复制</p>
      <div class="grid gap-1" style="grid-template-columns: repeat(auto-fill, minmax(52px, 1fr))">
        <div
          v-for="e in filtered" :key="e.emoji"
          class="flex flex-col items-center p-1 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
          :title="e.name"
          @click="copy(e.emoji)"
        >
          <span class="text-2xl leading-none">{{ e.emoji }}</span>
          <span class="text-xs text-slate-400 mt-0.5 truncate w-full text-center" style="font-size:10px">{{ e.name }}</span>
        </div>
      </div>
    </div>
    <ToolDetail title="使用说明">
      <p>Emoji 大全，点击任意表情即可复制到剪贴板。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li>支持按分类筛选：脸部、手势、动物、食物、旅行、物品、符号、旗帜</li>
        <li>支持关键词搜索（中文名称）</li>
      </ul>
    </ToolDetail>
  </div>
</template>
