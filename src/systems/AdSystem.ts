import {
  AD_UNIT_IDS,
  BannerAdPlacement,
  InterstitialAdPlacement,
  RewardedAdPlacement,
} from '../config/AdConfig';
import { isWechatMiniGame } from '../platform/WechatAdapter';

interface WechatAdEvent {
  isEnded?: boolean;
}

interface WechatRewardedVideoAd {
  load: () => Promise<void>;
  show: () => Promise<void>;
  onClose: (handler: (res: WechatAdEvent) => void) => void;
  offClose?: (handler: (res: WechatAdEvent) => void) => void;
  onError: (handler: (err: unknown) => void) => void;
  offError?: (handler: (err: unknown) => void) => void;
}

interface WechatInterstitialAd {
  load?: () => Promise<void>;
  show: () => Promise<void>;
  onError?: (handler: (err: unknown) => void) => void;
}

interface WechatBannerAd {
  show: () => Promise<void>;
  hide: () => void;
  destroy: () => void;
}

interface WechatAdApi {
  createRewardedVideoAd?: (options: { adUnitId: string }) => WechatRewardedVideoAd;
  createInterstitialAd?: (options: { adUnitId: string }) => WechatInterstitialAd;
  createBannerAd?: (options: {
    adUnitId: string;
    style: { left: number; top: number; width: number };
  }) => WechatBannerAd;
  getSystemInfoSync?: () => { windowWidth?: number; windowHeight?: number };
}

export class AdSystem {
  private static _instance: AdSystem;

  static getInstance(): AdSystem {
    if (!this._instance) this._instance = new AdSystem();
    return this._instance;
  }

  private readonly _rewardedAds = new Map<RewardedAdPlacement, WechatRewardedVideoAd>();
  private readonly _interstitialAds = new Map<InterstitialAdPlacement, WechatInterstitialAd>();
  private readonly _bannerAds = new Map<BannerAdPlacement, WechatBannerAd>();

  hasRewardedVideo(placement: RewardedAdPlacement): boolean {
    const wxApi = this._getWxApi();
    return !!AD_UNIT_IDS.rewarded[placement] && !!wxApi?.createRewardedVideoAd;
  }

  async showRewardedVideo(placement: RewardedAdPlacement): Promise<boolean> {
    if (!this.hasRewardedVideo(placement)) return false;
    const ad = this._getRewardedAd(placement);
    if (!ad) return false;

    return new Promise(resolve => {
      let settled = false;
      const finish = (ok: boolean): void => {
        if (settled) return;
        settled = true;
        ad.offClose?.(onClose);
        ad.offError?.(onError);
        resolve(ok);
      };
      const onClose = (res: WechatAdEvent): void => finish(res?.isEnded !== false);
      const onError = (): void => finish(false);

      ad.onClose(onClose);
      ad.onError(onError);
      ad.load()
        .then(() => ad.show())
        .catch(() => finish(false));
    });
  }

  async showInterstitial(placement: InterstitialAdPlacement): Promise<boolean> {
    const ad = this._getInterstitialAd(placement);
    if (!ad) return false;

    try {
      await ad.load?.();
      await ad.show();
      return true;
    } catch {
      return false;
    }
  }

  async showBanner(placement: BannerAdPlacement): Promise<boolean> {
    const ad = this._getBannerAd(placement);
    if (!ad) return false;

    try {
      await ad.show();
      return true;
    } catch {
      return false;
    }
  }

  hideBanner(placement?: BannerAdPlacement): void {
    if (placement) {
      this._bannerAds.get(placement)?.hide();
      return;
    }

    this._bannerAds.forEach(ad => ad.hide());
  }

  private _getRewardedAd(placement: RewardedAdPlacement): WechatRewardedVideoAd | null {
    const wxApi = this._getWxApi();
    const adUnitId = AD_UNIT_IDS.rewarded[placement];
    if (!wxApi?.createRewardedVideoAd || !adUnitId) return null;

    const cached = this._rewardedAds.get(placement);
    if (cached) return cached;

    const ad = wxApi.createRewardedVideoAd({ adUnitId });
    this._rewardedAds.set(placement, ad);
    return ad;
  }

  private _getInterstitialAd(placement: InterstitialAdPlacement): WechatInterstitialAd | null {
    const wxApi = this._getWxApi();
    const adUnitId = AD_UNIT_IDS.interstitial[placement];
    if (!wxApi?.createInterstitialAd || !adUnitId) return null;

    const cached = this._interstitialAds.get(placement);
    if (cached) return cached;

    const ad = wxApi.createInterstitialAd({ adUnitId });
    ad.onError?.(() => undefined);
    this._interstitialAds.set(placement, ad);
    return ad;
  }

  private _getBannerAd(placement: BannerAdPlacement): WechatBannerAd | null {
    const wxApi = this._getWxApi();
    const adUnitId = AD_UNIT_IDS.banner[placement];
    if (!wxApi?.createBannerAd || !adUnitId) return null;

    const cached = this._bannerAds.get(placement);
    if (cached) return cached;

    const systemInfo = this._getSystemInfo(wxApi);
    const width = Math.min(360, systemInfo.windowWidth);
    const ad = wxApi.createBannerAd({
      adUnitId,
      style: {
        left: (systemInfo.windowWidth - width) / 2,
        top: Math.max(0, systemInfo.windowHeight - 90),
        width,
      },
    });
    this._bannerAds.set(placement, ad);
    return ad;
  }

  private _getSystemInfo(wxApi: WechatAdApi): { windowWidth: number; windowHeight: number } {
    try {
      const info = wxApi.getSystemInfoSync?.();
      return {
        windowWidth: info?.windowWidth ?? 750,
        windowHeight: info?.windowHeight ?? 1334,
      };
    } catch {
      return { windowWidth: 750, windowHeight: 1334 };
    }
  }

  private _getWxApi(): WechatAdApi | null {
    if (!isWechatMiniGame()) return null;
    return (globalThis as { wx?: WechatAdApi }).wx ?? null;
  }
}
