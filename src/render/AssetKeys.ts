/**
 * 纹理键映射 — 将游戏内实体 ID 映射到中文素材文件名（不含扩展名）
 * Phaser 的 load.image('key', 'path') 中，key 可以用任意字符串
 * 这里统一用中文名作为 texture key，文件名也相同
 */
import { EnemyType, SoldierRank, SoldierType } from '../types';

// ─── 小兵类型 → 中文名 ───
const SOLDIER_TYPE_NAMES: Record<SoldierType, string> = {
  [SoldierType.MONKEY]: '灵猴兵',
  [SoldierType.SOLDIER]: '天兵甲士',
  [SoldierType.RIDER]: '妖王骑',
  [SoldierType.ARCHER]: '道法弓手',
};

// ─── 英雄 ID → 中文名 ───
const HERO_NAMES: Record<string, string> = {
  sunwukong: '孙悟空',
  zhubajie: '猪八戒',
  shawujing: '沙悟净',
  bailongma: '白龙马',
  guanyin: '观音菩萨',
  honghaier: '红孩儿',
  nezha: '哪吒',
  niumowang: '牛魔王',
  erlangshen: '二郎神',
  taishanglaojun: '太上老君',
  heixiongjing: '黑熊精',
  baigufuren: '白骨夫人',
  zhizhujing: '蜘蛛精',
  tuotatianwang: '托塔天王',
};

// ─── 敌人 ID → 中文名 ───
const ENEMY_NAMES: Record<string, string> = {
  xiaoyao_1: '小妖喽啰',
  xiaoyao_2: '骷髅妖',
  xiaoyao_3: '蝙蝠妖',
  xiaoyao_4: '巡山妖',
  xiaoyao_5: '水妖',
  xiaoyao_6: '虾兵',
  xiaoyao_7: '蟹将',
  xiaoyao_8: '火妖',
  xiaoyao_9: '熔岩怪',
  xiaoyao_10: '狮驼小妖',
  elite_huangfeng: '黄风怪',
  elite_huli: '狐狸精',
  elite_kuangtou: '象兵',
  elite_dapeng: '大鹏鹰',
  boss_heixiongjing: '黑熊精',
  boss_jinjiao: '金角大王',
  boss_honghaier: '红孩儿',
  boss_baigufuren: '白骨夫人',
  boss_qingshi: '青狮',
  boss_baixiang: '白象',
  boss_dapengjinchi: '大鹏金翅雕',
};

// ─── 道具 ID → 中文名 ───
const ITEM_NAMES: Record<string, string> = {
  kaishanfu: '开山斧',
  jiuzhuanxiandan: '九转仙丹',
  tongyongsuipian: '通用碎片',
  jinguzhou: '紧箍咒',
  yujingping: '玉净瓶',
};

// ─── 法宝 ID → 中文名 ───
const ARTIFACT_NAMES: Record<string, string> = {
  kaishanfu: '开山斧',
  huishanfu: '回山符',
  yangzhiganlu: '杨枝甘露',
  jinguzhou: '紧箍咒',
  kulounianzhu: '骷髅念珠',
  zhaoyaojing: '照妖镜',
  bihuozhao: '避火罩',
  bajiaoshan: '芭蕉扇',
  laoyuanjia: '老鼋甲',
  ganlujinglu: '甘露净露',
  jingangzhuo: '金刚琢',
  jinlanjiasha: '锦斓袈裟',
};

// ─── UI 图标 ───
const UI_ICON_NAMES: Record<string, string> = {
  peach: '仙桃',
  hp: '血量',
  wave: '波次',
  kill: '击杀',
  pause: '暂停',
  star: '星级',
  sweep: '扫荡',
  ad_reward: '广告奖励',
  spirit: '灵蕴',
  faction_shitu: '阵营_师徒',
  faction_xianfo: '阵营_仙佛',
  faction_yaowang: '阵营_妖王',
  bg_battle_forest: '战斗背景_森林',
  bg_journey_map: '关卡地图背景',
};

// ═══════════════════════════════════
// 纹理键生成函数
// ═══════════════════════════════════

/** 小兵静态纹理键 */
export function soldierKey(type: SoldierType, rank: SoldierRank): string {
  const name = SOLDIER_TYPE_NAMES[type];
  if (!name) throw new Error(`未知小兵类型: ${type}`);
  return `${name}_${rank}阶`;
}

/** 英雄静态纹理键 */
export function heroKey(heroId: string, stage: number = 1): string {
  const name = HERO_NAMES[heroId];
  if (!name) throw new Error(`未知英雄ID: ${heroId}`);
  return `${name}_${stage}阶`;
}

/** 英雄碎片纹理键 */
export function heroShardKey(heroId: string): string {
  const name = HERO_NAMES[heroId];
  if (!name) throw new Error(`未知英雄ID: ${heroId}`);
  return `碎片_${name}`;
}

/** 唐僧纹理键 */
export const MONK_KEY = '唐僧';

/** 敌人静态纹理键 */
export function enemyKey(enemyId: string): string {
  const name = ENEMY_NAMES[enemyId];
  if (!name) throw new Error(`未知敌人ID: ${enemyId}`);
  return name;
}

/** 道具纹理键 */
export function itemKey(itemId: string): string {
  const name = ITEM_NAMES[itemId];
  if (!name) throw new Error(`未知道具ID: ${itemId}`);
  return name;
}

/** 法宝纹理键 */
export function artifactKey(artifactId: string): string {
  const name = ARTIFACT_NAMES[artifactId];
  if (!name) throw new Error(`未知法宝ID: ${artifactId}`);
  return name;
}

/** UI 图标纹理键 */
export function uiIconKey(iconName: string): string {
  const name = UI_ICON_NAMES[iconName];
  if (!name) throw new Error(`未知UI图标: ${iconName}`);
  return name;
}

// ═══════════════════════════════════
// 预加载列表（给 preload() 用）
// ═══════════════════════════════════

export interface AssetEntry {
  key: string;
  path: string;
}

/** 生成所有需要预加载的静态素材列表 */
export function getAllStaticAssets(): AssetEntry[] {
  const list: AssetEntry[] = [];

  // 小兵：4类 × 5阶
  for (const type of Object.values(SoldierType)) {
    for (let rank = 1; rank <= 5; rank++) {
      const key = soldierKey(type as SoldierType, rank as SoldierRank);
      list.push({ key, path: `assets/soldiers/${key}.png` });
    }
  }

  // 英雄（当前 stage_1）：只包含已生成图片的7个
  const generatedHeroes = ['sunwukong', 'zhubajie', 'shawujing', 'bailongma', 'guanyin', 'honghaier', 'nezha'];
  for (const heroId of generatedHeroes) {
    const key = heroKey(heroId);
    list.push({ key, path: `assets/heroes/${key}.png` });
  }

  // 英雄碎片
  const allHeroes = [
    'sunwukong', 'zhubajie', 'shawujing', 'bailongma', 'guanyin', 'honghaier', 'nezha',
    'niumowang', 'erlangshen', 'taishanglaojun', 'heixiongjing', 'baigufuren', 'zhizhujing', 'tuotatianwang',
  ];
  for (const heroId of allHeroes) {
    const key = heroShardKey(heroId);
    list.push({ key, path: `assets/heroes/${key}.png` });
  }

  // 唐僧
  list.push({ key: MONK_KEY, path: `assets/heroes/${MONK_KEY}.png` });

  // 敌人
  const enemies = [
    'xiaoyao_1', 'xiaoyao_2', 'xiaoyao_3', 'xiaoyao_4', 'xiaoyao_5',
    'xiaoyao_6', 'xiaoyao_7', 'xiaoyao_8', 'xiaoyao_9', 'xiaoyao_10',
    'elite_huangfeng', 'elite_huli', 'elite_kuangtou', 'elite_dapeng',
    'boss_heixiongjing', 'boss_jinjiao', 'boss_honghaier', 'boss_baigufuren',
    'boss_qingshi', 'boss_baixiang', 'boss_dapengjinchi',
  ];
  for (const enemyId of enemies) {
    const key = enemyKey(enemyId);
    list.push({ key, path: `assets/enemies/${key}.png` });
  }

  // 道具
  for (const itemId of Object.keys(ITEM_NAMES)) {
    const key = itemKey(itemId);
    list.push({ key, path: `assets/items/${key}.png` });
  }

  // 法宝
  for (const artifactId of Object.keys(ARTIFACT_NAMES)) {
    const key = artifactKey(artifactId);
    list.push({ key, path: `assets/artifacts/${key}.png` });
  }

  // UI 图标
  for (const iconName of Object.keys(UI_ICON_NAMES)) {
    const key = uiIconKey(iconName);
    list.push({ key, path: `assets/ui/${key}.png` });
  }

  return list;
}
