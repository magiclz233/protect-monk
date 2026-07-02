/**
 * 怪物数值配置表
 * - 普通小妖：10种
 * - 精英妖怪：4种（带1个特性）
 * - BOSS妖怪：7种（带2个特性）
 */
import { EnemyConfig, EnemyType } from '../types';

export const ENEMY_CONFIGS: EnemyConfig[] = [
  // ========== 普通小妖 ==========
  { enemyId: 'xiaoyao_1', name: '小妖喽啰', type: EnemyType.NORMAL, hp: 30, attack: 5, speed: 0.4, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_2', name: '骷髅妖', type: EnemyType.NORMAL, hp: 40, attack: 6, speed: 0.45, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_3', name: '蝙蝠妖', type: EnemyType.NORMAL, hp: 25, attack: 4, speed: 0.6, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_4', name: '巡山妖', type: EnemyType.NORMAL, hp: 50, attack: 7, speed: 0.35, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_5', name: '水妖', type: EnemyType.NORMAL, hp: 45, attack: 5, speed: 0.5, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_6', name: '虾兵', type: EnemyType.NORMAL, hp: 55, attack: 6, speed: 0.4, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_7', name: '蟹将', type: EnemyType.NORMAL, hp: 60, attack: 8, speed: 0.35, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_8', name: '火妖', type: EnemyType.NORMAL, hp: 50, attack: 10, speed: 0.45, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_9', name: '熔岩怪', type: EnemyType.NORMAL, hp: 80, attack: 8, speed: 0.3, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  { enemyId: 'xiaoyao_10', name: '狮驼小妖', type: EnemyType.NORMAL, hp: 70, attack: 9, speed: 0.4, killExp: 5, assistExp: 2, auraExp: 1, abilities: [] },
  // ========== 精英 ==========
  { enemyId: 'elite_huangfeng', name: '黄风怪', type: EnemyType.ELITE, hp: 200, attack: 15, speed: 0.4, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['stun_attack'] },
  { enemyId: 'elite_huli', name: '狐狸精', type: EnemyType.ELITE, hp: 150, attack: 18, speed: 0.55, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['dodge'] },
  { enemyId: 'elite_kuangtou', name: '象兵', type: EnemyType.ELITE, hp: 350, attack: 20, speed: 0.25, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['trample'] },
  { enemyId: 'elite_dapeng', name: '大鹏鸟', type: EnemyType.ELITE, hp: 180, attack: 22, speed: 0.7, killExp: 25, assistExp: 10, auraExp: 5, abilities: ['speed_aura'] },
  // ========== BOSS ==========
  { enemyId: 'boss_heixiongjing', name: '黑熊精', type: EnemyType.BOSS, hp: 500, attack: 25, speed: 0.3, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['damage_reflect', 'hp_regen'] },
  { enemyId: 'boss_jinjiao', name: '金角大王', type: EnemyType.BOSS, hp: 600, attack: 30, speed: 0.35, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['absorb_unit', 'damage_aura'] },
  { enemyId: 'boss_honghaier', name: '红孩儿', type: EnemyType.BOSS, hp: 550, attack: 35, speed: 0.4, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['burn_aura', 'fireball'] },
  { enemyId: 'boss_baigufuren', name: '白骨夫人', type: EnemyType.BOSS, hp: 450, attack: 28, speed: 0.35, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['summon_minions', 'transform'] },
  { enemyId: 'boss_qingshi', name: '青狮', type: EnemyType.BOSS, hp: 700, attack: 40, speed: 0.3, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['fear_roar', 'charge'] },
  { enemyId: 'boss_baixiang', name: '白象', type: EnemyType.BOSS, hp: 800, attack: 35, speed: 0.25, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['trample_aoe', 'damage_resist'] },
  { enemyId: 'boss_dapengjinchi', name: '大鹏金翅雕', type: EnemyType.BOSS, hp: 900, attack: 50, speed: 0.5, killExp: 100, assistExp: 40, auraExp: 20, abilities: ['flight_speed', 'wind_slash'] },
];

export function getEnemyConfig(enemyId: string): EnemyConfig | undefined {
  return ENEMY_CONFIGS.find(e => e.enemyId === enemyId);
}

export function getEnemiesByType(type: EnemyType): EnemyConfig[] {
  return ENEMY_CONFIGS.filter(e => e.type === type);
}
