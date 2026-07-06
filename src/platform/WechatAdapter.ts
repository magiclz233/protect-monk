type WechatSystemInfo = {
  windowWidth?: number;
  windowHeight?: number;
  pixelRatio?: number;
  platform?: string;
};

interface WechatRuntimeApi {
  createCanvas?: () => HTMLCanvasElement;
  createImage?: () => HTMLImageElement;
  getSystemInfoSync?: () => WechatSystemInfo;
  onShow?: (callback: () => void) => void;
  onHide?: (callback: () => void) => void;
  onTouchStart?: (callback: EventListener) => void;
  onTouchMove?: (callback: EventListener) => void;
  onTouchEnd?: (callback: EventListener) => void;
  offTouchStart?: (callback: EventListener) => void;
  offTouchMove?: (callback: EventListener) => void;
  offTouchEnd?: (callback: EventListener) => void;
}

type RuntimeGlobal = typeof globalThis & {
  wx?: WechatRuntimeApi;
  canvas?: HTMLCanvasElement;
  GameGlobal?: Record<string, unknown>;
  __guardMonkCanvas?: HTMLCanvasElement;
};

let wechatCanvas: HTMLCanvasElement | null = null;

export function isWechatMiniGame(): boolean {
  const wxApi = (globalThis as RuntimeGlobal).wx;
  return !!wxApi && typeof wxApi.createCanvas === 'function';
}

export function getWechatCanvas(): HTMLCanvasElement | undefined {
  return wechatCanvas ?? undefined;
}

export function bootstrapWechatRuntime(): void {
  if (!isWechatMiniGame()) return;

  const runtime = globalThis as RuntimeGlobal;
  const wxApi = runtime.wx!;
  const systemInfo = getSystemInfo(wxApi);
  const canvas = runtime.__guardMonkCanvas ?? wxApi.createCanvas!();
  runtime.__guardMonkCanvas = canvas;
  runtime.canvas = canvas;
  wechatCanvas = canvas;

  const win = ensureWindow(runtime, canvas, systemInfo);
  const runtimeRecord = runtime as unknown as Record<string, unknown>;
  runtimeRecord.window = win;
  runtimeRecord.document = runtimeRecord.document ?? createDocumentShim(canvas, win);

  ensureAnimationFrame(runtime, win);
  ensureImageConstructor(runtime, win, wxApi);
  bindTouchEvents(canvas, wxApi);
}

function getSystemInfo(wxApi: WechatRuntimeApi): Required<WechatSystemInfo> {
  const fallback = { windowWidth: 750, windowHeight: 1334, pixelRatio: 1, platform: 'wechat' };
  if (typeof wxApi.getSystemInfoSync !== 'function') return fallback;

  try {
    return { ...fallback, ...wxApi.getSystemInfoSync() };
  } catch {
    return fallback;
  }
}

function ensureWindow(
  runtime: RuntimeGlobal,
  canvas: HTMLCanvasElement,
  systemInfo: Required<WechatSystemInfo>,
): Record<string, unknown> {
  const runtimeRecord = runtime as unknown as Record<string, unknown>;
  const win = (runtimeRecord.window as Record<string, unknown> | undefined)
    ?? runtime.GameGlobal
    ?? runtimeRecord;
  win.window = win;
  win.self = win;
  win.top = win;
  win.parent = win;
  win.canvas = canvas;
  win.innerWidth = systemInfo.windowWidth;
  win.innerHeight = systemInfo.windowHeight;
  win.devicePixelRatio = systemInfo.pixelRatio;
  win.screen = win.screen ?? {
    width: systemInfo.windowWidth,
    height: systemInfo.windowHeight,
    availWidth: systemInfo.windowWidth,
    availHeight: systemInfo.windowHeight,
  };
  win.navigator = win.navigator ?? {
    userAgent: `Mozilla/5.0 (${systemInfo.platform}) AppleWebKit/537.36 MiniGame GuardMonk`,
    platform: systemInfo.platform,
    maxTouchPoints: 10,
  };
  win.location = win.location ?? { href: 'game.js', protocol: 'https:', host: 'wechat-mini-game' };
  win.addEventListener = win.addEventListener ?? (() => undefined);
  win.removeEventListener = win.removeEventListener ?? (() => undefined);
  return win;
}

function createDocumentShim(
  canvas: HTMLCanvasElement,
  win: Record<string, unknown>,
): Record<string, unknown> {
  const elementStyle: Record<string, string> = {};
  const body = {
    style: elementStyle,
    clientWidth: win.innerWidth,
    clientHeight: win.innerHeight,
    appendChild: () => undefined,
    removeChild: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };

  return {
    readyState: 'complete',
    hidden: false,
    visibilityState: 'visible',
    body,
    documentElement: {
      style: elementStyle,
      clientWidth: win.innerWidth,
      clientHeight: win.innerHeight,
    },
    createElement: (tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') return canvas;
      return {
        style: {},
        tagName,
        appendChild: () => undefined,
        removeChild: () => undefined,
        setAttribute: () => undefined,
        getContext: () => null,
      };
    },
    getElementById: () => canvas,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    fonts: { ready: Promise.resolve(), add: () => undefined },
  };
}

function ensureAnimationFrame(runtime: RuntimeGlobal, win: Record<string, unknown>): void {
  const target = runtime as unknown as Record<string, unknown>;
  const raf = target.requestAnimationFrame ?? ((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
  });
  const caf = target.cancelAnimationFrame ?? ((handle: number) => clearTimeout(handle));

  target.requestAnimationFrame = raf;
  target.cancelAnimationFrame = caf;
  win.requestAnimationFrame = win.requestAnimationFrame ?? raf;
  win.cancelAnimationFrame = win.cancelAnimationFrame ?? caf;
  win.performance = win.performance ?? {
    now: () => Date.now(),
  };
}

function ensureImageConstructor(
  runtime: RuntimeGlobal,
  win: Record<string, unknown>,
  wxApi: WechatRuntimeApi,
): void {
  const target = runtime as unknown as Record<string, unknown>;
  if (!target.Image && typeof wxApi.createImage === 'function') {
    target.Image = wxApi.createImage;
  }
  if (!win.Image && target.Image) {
    win.Image = target.Image;
  }
}

function bindTouchEvents(canvas: HTMLCanvasElement, wxApi: WechatRuntimeApi): void {
  const eventMap: Record<string, { on?: (callback: EventListener) => void; off?: (callback: EventListener) => void }> = {
    touchstart: { on: wxApi.onTouchStart, off: wxApi.offTouchStart },
    touchmove: { on: wxApi.onTouchMove, off: wxApi.offTouchMove },
    touchend: { on: wxApi.onTouchEnd, off: wxApi.offTouchEnd },
  };

  const canvasWithEvents = canvas as HTMLCanvasElement & {
    addEventListener?: (type: string, listener: EventListener) => void;
    removeEventListener?: (type: string, listener: EventListener) => void;
  };

  canvasWithEvents.addEventListener = (type: string, listener: EventListener) => {
    eventMap[type]?.on?.(listener);
  };
  canvasWithEvents.removeEventListener = (type: string, listener: EventListener) => {
    eventMap[type]?.off?.(listener);
  };
}

bootstrapWechatRuntime();
