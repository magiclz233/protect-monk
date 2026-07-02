/**
 * 英雄数值配置表 - 14名英雄（7普通 + 7核心）
 */
import { HeroRarity, HeroStats, Faction } from '../types';

export interface HeroConfigItem {
  heroId: string;
  name: string;
  rarity: HeroRarity;
  faction: Faction;
  shardsNeeded: number;
  maxLevel: number;
  baseHp: number;
  baseAttack: number;
  attackRange: number;
  attackSpeed: number;
  role: string;
  passive: string;
  description: string;
  unlockChapter?: number;
}

export const HERO_CONFIGS: HeroConfigItem[] = [
  // ========== 核心英雄（3碎片，最高15级） ==========
  { heroId: 'sunwukong', name: '孙悟空', rarity: HeroRarity.CORE, faction: Faction.SHITU,
    shardsNeeded: 3, maxLevel: 15,
    baseHp: 450, baseAttack: 60, attackRange: 1, attackSpeed: 1.5,
    role: '近战爆发', passive: '对BOSS伤害+50%，攻击有30%概率暴击',
    description: '齐天大圣，火力全开', unlockChapter: 1 },
  { heroId: 'guanyin', name: '观音菩萨', rarity: HeroRarity.CORE, faction: Faction.XIANFO,
    shardsNeeded: 3, maxLevel: 15,
    baseHp: 400, baseAttack: 20, attackRange: 2, attackSpeed: 0.8,
    role: '治疗辅助', passive: '周围2格友军每秒回复5%最大血量，在场享受光环经验',
    description: '普度众生，庇护四方' },
  { heroId: 'niumowang', name: '牛魔王', rarity: HeroRarity.CORE, faction: Faction.YAOWANG,
    shardsNeeded: 3, maxLevel: 15,
    baseHp: 700, baseAttack: 40, attackRange: 1, attackSpeed: 0.9,
    role: '狂暴坦克', passive: '血量低于30%时，自身伤害翻倍',
    description: '上古妖王，不死不休' },
  { heroId: 'honghaier', name: '红孩儿', rarity: HeroRarity.CORE, faction: Faction.YAOWANG,
    shardsNeeded: 3, maxLevel: 15,
    baseHp: 380, baseAttack: 55, attackRange: 3, attackSpeed: 1.0,
    role: '法术群攻', passive: '攻击造成小范围溅射灼烧伤害',
    description: '三昧真火，焚尽一切' },
  { heroId: 'erlangshen', name: '二郎神', rarity: HeroRarity.CORE, faction: Faction.XIANFO,
    shardsNeeded: 3, maxLevel: 15,
    baseHp: 400, baseAttack: 65, attackRange: 5, attackSpeed: 0.7,
    role: '远程狙击', passive: '优先攻击血量最高的敌人，对其伤害+40%',
    description: '天眼所至，箭无虚发' },
  { heroId: 'nezha', name: '哪吒', rarity: HeroRarity.CORE, faction: Faction.XIANFO,
    shardsNeeded: 3, maxLevel: 15,
    baseHp: 420, baseAttack: 50, attackRange: 3, attackSpeed: 1.2,
    role: '多目标输出', passive: '同时锁定攻击3个敌人',
    description: '三头六臂，乾坤一掷' },
  { heroId: 'taishanglaojun', name: '太上老君', rarity: HeroRarity.CORE, faction: Faction.XIANFO,
    shardsNeeded: 3, maxLevel: 15,
    baseHp: 350, baseAttack: 45, attackRange: 4, attackSpeed: 0.9,
    role: '持续输出', passive: '攻击附带灼烧效果，3秒内持续掉血',
    description: '丹炉之焰，绵延不绝' },
  // ========== 普通英雄（2碎片，最高10级） ==========
  { heroId: 'zhubajie', name: '猪八戒', rarity: HeroRarity.NORMAL, faction: Faction.SHITU,
    shardsNeeded: 2, maxLevel: 10,
    baseHp: 500, baseAttack: 25, attackRange: 1, attackSpeed: 0.8,
    role: '近战肉盾', passive: '高血量，强制吸引周围妖怪仇恨，被攻击也算助攻',
    description: '天蓬元帅，铜墙铁壁', unlockChapter: 2 },
  { heroId: 'shawujing', name: '沙悟净', rarity: HeroRarity.NORMAL, faction: Faction.SHITU,
    shardsNeeded: 2, maxLevel: 10,
    baseHp: 380, baseAttack: 30, attackRange: 2, attackSpeed: 0.9,
    role: '中距控制', passive: '攻击附带30%减速，自身免伤+20%',
    description: '卷帘大将，稳如磐石', unlockChapter: 3 },
  { heroId: 'bailongma', name: '白龙马', rarity: HeroRarity.NORMAL, faction: Faction.SHITU,
    shardsNeeded: 2, maxLevel: 10,
    baseHp: 300, baseAttack: 35, attackRange: 4, attackSpeed: 1.25,
    role: '远程穿透', passive: '攻击可穿透3个敌人，攻速提升25%',
    description: '龙马精神，贯纵连横', unlockChapter: 4 },
  { heroId: 'heixiongjing', name: '黑熊精', rarity: HeroRarity.NORMAL, faction: Faction.YAOWANG,
    shardsNeeded: 2, maxLevel: 10,
    baseHp: 550, baseAttack: 20, attackRange: 1, attackSpeed: 0.7,
    role: '物理肉盾', passive: '高物防，反弹25%受到的物理伤害',
    description: '皮糙肉厚，以彼之道' },
  { heroId: 'baigufuren', name: '白骨夫人', rarity: HeroRarity.NORMAL, faction: Faction.YAOWANG,
    shardsNeeded: 2, maxLevel: 10,
    baseHp: 250, baseAttack: 40, attackRange: 3, attackSpeed: 1.0,
    role: '召唤输出', passive: '每隔15秒召唤1个分身作战，分身拥有本体30%属性',
    description: '虚实莫测，以一化三' },
  { heroId: 'zhizhujing', name: '蜘蛛精', rarity: HeroRarity.NORMAL, faction: Faction.YAOWANG,
    shardsNeeded: 2, maxLevel: 10,
    baseHp: 300, baseAttack: 28, attackRange: 3, attackSpeed: 1.0,
    role: '范围减速', passive: '自身3格范围内，敌人移速降低40%',
    description: '天罗地网，寸步难行' },
  { heroId: 'tuotatianwang', name: '托塔天王', rarity: HeroRarity.NORMAL, faction: Faction.XIANFO,
    shardsNeeded: 2, maxLevel: 10,
    baseHp: 350, baseAttack: 32, attackRange: 3, attackSpeed: 0.85,
    role: '群体控制', passive: '攻击有15%概率定身敌人1.5秒',
    description: '托塔之力，定身乾坤' },
];

export function getHeroConfig(heroId: string): HeroConfigItem | undefined {
  return HERO_CONFIGS.find(h => h.heroId === heroId);
}

export function getHeroesByRarity(rarity: HeroRarity): HeroConfigItem[] {
  return HERO_CONFIGS.filter(h => h.rarity === rarity);
}

export function getUnlockedHeroes(currentChapter: number): HeroConfigItem[] {
  return HERO_CONFIGS.filter(h => !h.unlockChapter || h.unlockChapter <= currentChapter);
}

export function toHeroStats(config: HeroConfigItem): HeroStats {
  return {
    heroId: config.heroId, name: config.name, rarity: config.rarity,
    shardsNeeded: config.shardsNeeded, maxLevel: config.maxLevel,
    baseHp: config.baseHp, baseAttack: config.baseAttack,
    attackRange: config.attackRange, attackSpeed: config.attackSpeed,
    description: config.passive,
  };
}
