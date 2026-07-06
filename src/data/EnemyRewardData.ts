import { EnemyType } from '../types';

export function getKillPeachReward(enemyType: EnemyType): number {
  switch (enemyType) {
    case EnemyType.NORMAL:
      return 3;
    case EnemyType.ELITE:
      return 12;
    case EnemyType.BOSS:
      return 45;
    default:
      return 3;
  }
}
