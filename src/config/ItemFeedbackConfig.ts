import { ItemId } from '../types';

export interface ItemFeedbackConfig {
  color: number;
  label: string;
  radiusScale: number;
}

export const ITEM_FEEDBACK_CONFIGS: Record<ItemId, ItemFeedbackConfig> = {
  [ItemId.AXE]: { color: 0xf0b34a, label: '破石', radiusScale: 0.58 },
  [ItemId.ELIXIR]: { color: 0xe85d75, label: '升级', radiusScale: 0.7 },
  [ItemId.UNIVERSAL_SHARD]: { color: 0x9a7bff, label: '补碎片', radiusScale: 0.66 },
  [ItemId.HEADBAND]: { color: 0xf3cf54, label: '减速', radiusScale: 1.05 },
  [ItemId.VASE]: { color: 0x67d8d0, label: '护心', radiusScale: 0.9 },
};
