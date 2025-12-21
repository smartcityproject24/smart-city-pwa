export { createPWARegisterOptions } from './registration';
export { setupPWAUpdates } from './updates';
export { initKioskMode } from './kiosk-init';
export { clearFilesCache, clearAllApiCache } from './cache';
export {
    isAndroid,
    isStandalone,
    getPlatformType,
} from './platform-detection';
export {
    isFullscreenSupported,
    isFullscreen,
    getFullscreenElement,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    onFullscreenChange,
    startFullscreenKeeper,
} from './fullscreen';
export type {
    PWAUpdateConfig,
    RegisterSWOptions,
    KioskInitConfig,
    PlatformDetectionContext,
} from './types';

