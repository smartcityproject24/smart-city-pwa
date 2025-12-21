import type { RegisterSWOptions } from 'virtual:pwa-register';

/**
 * Типы для PWA функциональности
 */

export interface PWAUpdateConfig {
	/**
	 * Интервал проверки обновлений в миллисекундах (по умолчанию 5 минут)
	 */
	checkInterval?: number;

	/**
	 * Автоматически перезагружать страницу при обнаружении обновления
	 */
	autoReload?: boolean;
}

/**
 * Конфигурация инициализации kiosk-режима
 */
export interface KioskInitConfig {
	/**
	 * Включить автоматический fullscreen при запуске в standalone режиме
	 * @default true
	 */
	autoFullscreen?: boolean;

	/**
	 * Включить принудительный возврат fullscreen на Android
	 * @default true
	 */
	forceFullscreenOnAndroid?: boolean;

	/**
	 * Задержка перед возвратом в fullscreen на Android (в миллисекундах)
	 * @default 1500
	 */
	fullscreenReturnDelay?: number;
}

/**
 * Контекст для определения платформы
 */
export type PlatformDetectionContext = {
    platform: "android" | "windows" | "ios" | "macos" | "linux" | "unknown";
};

export type { RegisterSWOptions };

