export type RewardedAdPlacement = 'extraSummon' | 'revive' | 'universalShard';
export type InterstitialAdPlacement = 'result';
export type BannerAdPlacement = 'home';

export const AD_UNIT_IDS = {
  rewarded: {
    extraSummon: '',
    revive: '',
    universalShard: '',
  } satisfies Record<RewardedAdPlacement, string>,
  interstitial: {
    result: '',
  } satisfies Record<InterstitialAdPlacement, string>,
  banner: {
    home: '',
  } satisfies Record<BannerAdPlacement, string>,
};
