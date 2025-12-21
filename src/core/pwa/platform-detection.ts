/**
 * Утилиты для определения платформы и режима PWA
 * Используется для определения Android, мобильных устройств и standalone режима
 */

/**
 * Проверяет, является ли текущая платформа Android
 * @returns true, если устройство работает на Android
 */
export function isAndroid(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    const androidPattern = /android/i;
    if (androidPattern.test(userAgent)) {
        return true;
    }

    if (/Chrome/i.test(userAgent) && /Mobile/i.test(userAgent)) {
        if (androidPattern.test(userAgent)) {
            return true;
        }
    }

    if (navigator.platform) {
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('android') || platform.includes('linux')) {
            if ('ontouchstart' in window && window.innerWidth <= 768) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Проверяет, запущено ли приложение в standalone режиме (установленное PWA)
 * @returns true, если приложение запущено в standalone режиме
 */
export function isStandalone(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    if (window.matchMedia) {
        const standaloneQuery = window.matchMedia('(display-mode: standalone)');
        if (standaloneQuery.matches) {
            return true;
        }
    }

    if ((navigator as any).standalone === true) {
        return true;
    }

    if (window.matchMedia) {
        const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
        if (fullscreenQuery.matches) {
            return true;
        }
    }

    if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) {
        return true;
    }

    return false;
}

/**
 * Определяет тип платформы
 * @returns тип платформы: "android" | "windows" | "ios" | "macos" | "linux" | "unknown"
 */
export function getPlatformType(): "android" | "windows" | "ios" | "macos" | "linux" | "unknown" {
    if (typeof window === 'undefined') {
        return 'unknown';
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';

    // Android
    if (/android/i.test(userAgent)) {
        return 'android';
    }

    // iOS
    if (/iphone|ipad|ipod/i.test(userAgent)) {
        return 'ios';
    }

    // Windows
    if (/windows/i.test(userAgent)) {
        return 'windows';
    }

    // macOS
    if (/macintosh|mac os x/i.test(userAgent)) {
        return 'macos';
    }

    // Linux
    if (/linux/i.test(userAgent)) {
        return 'linux';
    }

    return 'unknown';
}

