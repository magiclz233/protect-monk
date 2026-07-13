/**
 * 怪物数值配置表（西游九章主题对齐版）
 * - 普通小妖：按三组主题分配（山林/水域/火焰 + 亡骨/蛛虫/兽妖）
 * - 精英妖怪：按章节主题分配
 * - BOSS 妖怪：每章 1 个，严格对应西游原著章节
 */
import { EnemyConfig, EnemyType } from '../types';

export const ENEMY_CONFIGS: EnemyConfig[] = [
  // ═══ 普通小妖（10 种，按主题分组） ═══
  // — 山林组（Ch1 五行山）—
  { enemyId: 'xiaoyao_1', name: '山精', type: EnemyType.NORMAL, hp: 30, attack: 5, speed: 0.4, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_2', name: '虎妖', type: EnemyType.NORMAL, hp: 45, attack: 7, speed: 0.45, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  // — 亡骨组（Ch3 白虎岭）—
  { enemyId: 'xiaoyao_3', name: '骷髅妖', type: EnemyType.NORMAL, hp: 40, attack: 6, speed: 0.5, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_4', name: '白骨兵', type: EnemyType.NORMAL, hp: 50, attack: 7, speed: 0.4, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  // — 水域组（Ch2 流沙河 / Ch6 通天河）—
  { enemyId: 'xiaoyao_5', name: '水妖', type: EnemyType.NORMAL, hp: 45, attack: 5, speed: 0.5, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_6', name: '虾兵', type: EnemyType.NORMAL, hp: 55, attack: 6, speed: 0.45, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_7', name: '蟹将', type: EnemyType.NORMAL, hp: 65, attack: 8, speed: 0.35, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  // — 火焰组（Ch4 号山 / Ch5 火焰山）—
  { enemyId: 'xiaoyao_8', name: '火妖', type: EnemyType.NORMAL, hp: 50, attack: 10, speed: 0.45, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_9', name: '熔岩怪', type: EnemyType.NORMAL, hp: 80, attack: 8, speed: 0.3, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  // — 兽妖组（Ch8 狮驼岭）—
  { enemyId: 'xiaoyao_10', name: '狮驼小妖', type: EnemyType.NORMAL, hp: 70, attack: 9, speed: 0.4, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },

  // ═══ 精英妖怪（9 种，每章 1 个，对应章节主题） ═══
  // Ch1 五行山 — 虎先锋（黄风岭虎怪，敏捷型）
  { enemyId: 'elite_huwei', name: '虎先锋', type: EnemyType.ELITE, hp: 280, attack: 16, speed: 0.5, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['dodge'] },
  // Ch2 流沙河 — 黄风怪（沙尘眩晕）
  { enemyId: 'elite_huangfeng', name: '黄风怪', type: EnemyType.ELITE, hp: 300, attack: 15, speed: 0.4, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['stun_attack'] },
  // Ch3 白虎岭 — 狐狸精（白骨精部下，闪避型）
  { enemyId: 'elite_huli', name: '狐狸精', type: EnemyType.ELITE, hp: 240, attack: 18, speed: 0.55, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['dodge'] },
  // Ch4 号山 — 火云童（红孩儿部下，火焰践踏）
  { enemyId: 'elite_huoyun', name: '火云童', type: EnemyType.ELITE, hp: 320, attack: 19, speed: 0.45, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['trample'] },
  // Ch5 火焰山 — 玉面狐（牛魔王之妾，速度光环）
  { enemyId: 'elite_yumian', name: '玉面狐', type: EnemyType.ELITE, hp: 260, attack: 17, speed: 0.6, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['speed_aura'] },
  // Ch6 通天河 — 老鼋（通天河巨龟，防御型）
  { enemyId: 'elite_laoyuan', name: '老鼋', type: EnemyType.ELITE, hp: 500, attack: 14, speed: 0.25, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['damage_resist'] },
  // Ch7 盘丝洞 — 蛛妖（蛛网眩晕）
  { enemyId: 'elite_zhuyu', name: '蛛妖', type: EnemyType.ELITE, hp: 270, attack: 20, speed: 0.5, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['stun_attack'] },
  // Ch8 狮驼岭 — 象兵（白象部下，践踏型）
  { enemyId: 'elite_kuangtou', name: '象兵', type: EnemyType.ELITE, hp: 520, attack: 20, speed: 0.25, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['trample'] },
  // Ch9 灵山 — 大鹏鹰（大鹏部下，速度光环）
  { enemyId: 'elite_dapeng', name: '大鹏鹰', type: EnemyType.ELITE, hp: 300, attack: 22, speed: 0.7, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['speed_aura'] },

  // ═══ BOSS 妖怪（9 种，每章 1 个，严格对应西游原著） ═══
  // Ch1 五行山 — 黑熊精（观音院，早期妖怪）
  { enemyId: 'boss_heixiongjing', name: '黑熊精', type: EnemyType.BOSS, hp: 900, attack: 25, speed: 0.3, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['damage_reflect', 'hp_regen'] },
  // Ch2 流沙河 — 灵感大王（金鱼精，水系）
  { enemyId: 'boss_linggan', name: '灵感大王', type: EnemyType.BOSS, hp: 950, attack: 28, speed: 0.35, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['water_freezing', 'tidal_wave'] },
  // Ch3 白虎岭 — 白骨夫人（三打白骨精）
  { enemyId: 'boss_baigufuren', name: '白骨夫人', type: EnemyType.BOSS, hp: 850, attack: 28, speed: 0.35, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['summon_minions', 'transform'] },
  // Ch4 号山 — 红孩儿（火云洞，三昧真火）
  { enemyId: 'boss_honghaier', name: '红孩儿', type: EnemyType.BOSS, hp: 1000, attack: 35, speed: 0.4, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['burn_aura', 'fireball'] },
  // Ch5 火焰山 — 铁扇公主（芭蕉洞，罗刹女）
  { enemyId: 'boss_tieshan', name: '铁扇公主', type: EnemyType.BOSS, hp: 1050, attack: 30, speed: 0.35, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['wind_knockback', 'fire_tornado'] },
  // Ch6 通天河 — 金角大王（平顶山莲花洞，宝器）
  { enemyId: 'boss_jinjiao', name: '金角大王', type: EnemyType.BOSS, hp: 1100, attack: 32, speed: 0.35, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['absorb_unit', 'damage_aura'] },
  // Ch7 盘丝洞 — 百眼魔君（黄花观，蜈蚣精）
  { enemyId: 'boss_baiyan', name: '百眼魔君', type: EnemyType.BOSS, hp: 950, attack: 33, speed: 0.38, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['poison_aura', 'thousand_eyes'] },
  // Ch8 狮驼岭 — 大鹏金翅雕（狮驼三魔之首）
  { enemyId: 'boss_dapengjinchi', name: '大鹏金翅雕', type: EnemyType.BOSS, hp: 1400, attack: 45, speed: 0.5, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['flight_speed', 'wind_slash'] },
  // Ch9 灵山 — 黄眉怪（小雷音寺，假佛）
  { enemyId: 'boss_huangmei', name: '黄眉怪', type: EnemyType.BOSS, hp: 1600, attack: 48, speed: 0.33, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['golden_capture', 'fake_buddha'] },
];

export function getEnemyConfig(enemyId: string): EnemyConfig | undefined {
  return ENEMY_CONFIGS.find(e => e.enemyId === enemyId);
}

export function getEnemiesByType(type: EnemyType): EnemyConfig[] {
  return ENEMY_CONFIGS.filter(e => e.type === type);
}
