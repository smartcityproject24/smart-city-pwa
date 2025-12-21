/**
 * Утилиты для работы с Fullscreen API
 * Поддерживает различные префиксы браузеров для совместимости
 */

import { isAndroid } from './platform-detection';

/**
 * Проверяет, поддерживается ли Fullscreen API в браузере
 */
export function isFullscreenSupported(): boolean {
    return !!(
        document.fullscreenEnabled ||
        // @ts-ignore - для старых браузеров
        document.webkitFullscreenEnabled ||
        // @ts-ignore - для старых браузеров
        document.mozFullScreenEnabled ||
        // @ts-ignore - для старых браузеров
        document.msFullscreenEnabled
    );
}

/**
 * Проверяет, находится ли страница в полноэкранном режиме
 */
export function isFullscreen(): boolean {
    return !!(
        document.fullscreenElement ||
        // @ts-ignore - для старых браузеров
        document.webkitFullscreenElement ||
        // @ts-ignore - для старых браузеров
        document.mozFullScreenElement ||
        // @ts-ignore - для старых браузеров
        document.msFullscreenElement
    );
}

/**
 * Получает элемент, находящийся в полноэкранном режиме, или null
 */
export function getFullscreenElement(): Element | null {
    return (
        document.fullscreenElement ||
        // @ts-ignore - для старых браузеров
        document.webkitFullscreenElement ||
        // @ts-ignore - для старых браузеров
        document.mozFullScreenElement ||
        // @ts-ignore - для старых браузеров
        document.msFullscreenElement ||
        null
    );
}

/**
 * Включает полноэкранный режим для указанного элемента или для document.documentElement
 * @param element - Элемент для полноэкранного режима (по умолчанию весь документ)
 * @returns Promise, который резолвится при успешном входе в fullscreen
 */
export async function requestFullscreen(
    element: HTMLElement = document.documentElement
): Promise<void> {
    if (!isFullscreenSupported()) {
        throw new Error("Fullscreen API не поддерживается в данном браузере");
    }

    if (isFullscreen()) {
        return;
    }

    try {
        if (element.requestFullscreen) {
            await element.requestFullscreen();
            return;
        }

        // WebKit (Chrome, Safari)
        // @ts-ignore - для старых браузеров
        if (element.webkitRequestFullscreen) {
            // @ts-ignore
            await element.webkitRequestFullscreen();
            return;
        }

        // Mozilla Firefox
        // @ts-ignore - для старых браузеров
        if (element.mozRequestFullScreen) {
            // @ts-ignore
            await element.mozRequestFullScreen();
            return;
        }

        // Microsoft Edge (старая версия)
        // @ts-ignore - для старых браузеров
        if (element.msRequestFullscreen) {
            // @ts-ignore
            await element.msRequestFullscreen();
            return;
        }

        throw new Error("Не удалось найти поддерживаемый метод requestFullscreen");
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Неизвестная ошибка при входе в полноэкранный режим";
        console.error("[requestFullscreen]", errorMessage, error);
        throw error;
    }
}

/**
 * Выходит из полноэкранного режима
 * @returns Promise, который резолвится при успешном выходе из fullscreen
 */
export async function exitFullscreen(): Promise<void> {
    if (!isFullscreen()) {
        return;
    }

    try {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
            return;
        }

        // WebKit (Chrome, Safari)
        // @ts-ignore - для старых браузеров
        if (document.webkitExitFullscreen) {
            // @ts-ignore
            await document.webkitExitFullscreen();
            return;
        }

        // Mozilla Firefox
        // @ts-ignore - для старых браузеров
        if (document.mozCancelFullScreen) {
            // @ts-ignore
            await document.mozCancelFullScreen();
            return;
        }

        // Microsoft Edge (старая версия)
        // @ts-ignore - для старых браузеров
        if (document.msExitFullscreen) {
            // @ts-ignore
            await document.msExitFullscreen();
            return;
        }

        throw new Error("Не удалось найти поддерживаемый метод exitFullscreen");
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Неизвестная ошибка при выходе из полноэкранного режима";
        console.error("[exitFullscreen]", errorMessage, error);
        throw error;
    }
}

/**
 * Переключает полноэкранный режим (включает, если выключен, и наоборот)
 * @param element - Элемент для полноэкранного режима (по умолчанию весь документ)
 * @returns Promise, который резолвится при успешном переключении
 */
export async function toggleFullscreen(
    element: HTMLElement = document.documentElement
): Promise<void> {
    if (isFullscreen()) {
        await exitFullscreen();
    } else {
        await requestFullscreen(element);
    }
}

/**
 * Подписывается на изменения полноэкранного режима
 * @param callback - Функция, вызываемая при изменении состояния fullscreen
 * @returns Функция для отмены подписки
 */
export function onFullscreenChange(
    callback: (isFullscreen: boolean) => void
): () => void {
    const handleFullscreenChange = () => {
        callback(isFullscreen());
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener(
            "webkitfullscreenchange",
            handleFullscreenChange
        );
        document.removeEventListener(
            "mozfullscreenchange",
            handleFullscreenChange
        );
        document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
}

/**
 * Начинает отслеживание и поддержание fullscreen режима
 * На Android принудительно возвращает fullscreen, если пользователь вышел
 * @param forceOnAndroid - Принудительно возвращать fullscreen на Android (по умолчанию true)
 * @param returnDelay - Задержка перед возвратом в fullscreen в миллисекундах (по умолчанию 1500)
 * @returns Функция для остановки отслеживания
 */
export function startFullscreenKeeper(
    forceOnAndroid: boolean = true,
    returnDelay: number = 1500
): () => void {
    if (typeof window === 'undefined') {
        return () => { };
    }

    let returnTimeout: ReturnType<typeof setTimeout> | null = null;
    let isHandling = false;

    const handleFullscreenChange = () => {
        const currentlyFullscreen = isFullscreen();

        if (!currentlyFullscreen) {
            if (forceOnAndroid && isAndroid()) {
                if (returnTimeout) {
                    clearTimeout(returnTimeout);
                }

                returnTimeout = setTimeout(() => {
                    if (!isFullscreen() && !isHandling) {
                        isHandling = true;
                        requestFullscreen()
                            .then(() => {
                                isHandling = false;
                            })
                            .catch((error) => {
                                console.warn('[startFullscreenKeeper] Не удалось вернуть fullscreen:', error);
                                isHandling = false;
                            });
                    }
                }, returnDelay);
            }
        } else {
            if (returnTimeout) {
                clearTimeout(returnTimeout);
                returnTimeout = null;
            }
        }
    };

    const unsubscribe = onFullscreenChange(handleFullscreenChange);

    return () => {
        if (returnTimeout) {
            clearTimeout(returnTimeout);
            returnTimeout = null;
        }
        unsubscribe();
    };
}

