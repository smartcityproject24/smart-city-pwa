/**
 * Модуль инициализации kiosk-режима для PWA
 * Отвечает за автоматический fullscreen режим
 */

import { isStandalone } from './platform-detection';
import { requestFullscreen, startFullscreenKeeper } from './fullscreen';
import type { KioskInitConfig } from './types';

const DEFAULT_CONFIG: Required<KioskInitConfig> = {
	autoFullscreen: true,
	forceFullscreenOnAndroid: true,
	fullscreenReturnDelay: 1500,
};

/**
 * Инициализирует kiosk-режим для PWA
 * 
 * @param config - Конфигурация инициализации
 * @returns Функция для очистки (отмены подписок)
 */
export function initKioskMode(config: KioskInitConfig = {}): () => void {
	if (typeof window === 'undefined') {
		return () => { };
	}

	const finalConfig = { ...DEFAULT_CONFIG, ...config };
	const cleanupFunctions: Array<() => void> = [];

	if (finalConfig.autoFullscreen && isStandalone()) {
		const cleanup = initAutoFullscreen(
			finalConfig.forceFullscreenOnAndroid,
			finalConfig.fullscreenReturnDelay
		);
		cleanupFunctions.push(cleanup);
	}

	return () => {
		cleanupFunctions.forEach(cleanup => cleanup());
	};
}

/**
 * Инициализирует автоматический fullscreen при запуске в standalone режиме
 * 
 * @param forceOnAndroid - Принудительно возвращать fullscreen на Android
 * @param returnDelay - Задержка перед возвратом в fullscreen (мс)
 * @returns Функция для очистки
 */
function initAutoFullscreen(
	forceOnAndroid: boolean,
	returnDelay: number
): () => void {
	let fullscreenRequested = false;
	let userInteracted = false;

	const requestFullscreenAfterInteraction = async (): Promise<void> => {
		if (fullscreenRequested || !isStandalone()) {
			return;
		}

		try {
			await requestFullscreen();
			fullscreenRequested = true;
		} catch (error) {
			console.warn('[initKioskMode] Не удалось запросить fullscreen:', error);
		}
	};

	const handleFirstInteraction = (): void => {
		if (!userInteracted) {
			userInteracted = true;
			requestFullscreenAfterInteraction();
		}
	};

	const interactionEvents: Array<keyof DocumentEventMap> = ['click', 'touchstart', 'keydown'];

	interactionEvents.forEach(eventType => {
		document.addEventListener(eventType, handleFirstInteraction, { once: true });
	});

	const cleanupFullscreenKeeper = startFullscreenKeeper(forceOnAndroid, returnDelay);

	return () => {
		interactionEvents.forEach(eventType => {
			document.removeEventListener(eventType, handleFirstInteraction);
		});
		cleanupFullscreenKeeper();
	};
}

