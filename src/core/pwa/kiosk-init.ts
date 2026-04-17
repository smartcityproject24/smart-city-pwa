/**
 * Модуль инициализации kiosk-режима для PWA
 * Отвечает за автоматический fullscreen режим
 */

import { isStandalone } from './platform-detection';
import { requestFullscreen, startFullscreenKeeper, getFullscreenPreferred, setFullscreenPreferred } from './fullscreen';
import type { KioskInitConfig } from './types';

const DEFAULT_CONFIG: Required<KioskInitConfig> = {
	autoFullscreen: true,
	forceFullscreenOnAndroid: true,
	fullscreenReturnDelay: 1500,
	fullscreenInBrowser: true,
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

	const shouldFullscreen = finalConfig.autoFullscreen && (
		isStandalone() || finalConfig.fullscreenInBrowser
	);
	if (shouldFullscreen) {
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
 * Инициализирует автоматический fullscreen при запуске (standalone или по ссылке в браузере).
 *
 * @param forceOnAndroid - Принудительно возвращать fullscreen на Android
 * @param returnDelay - Задержка перед возвратом в fullscreen (мс)
 */
function initAutoFullscreen(
	forceOnAndroid: boolean,
	returnDelay: number
): () => void {
	let fullscreenRequested = false;

	const tryRequestFullscreen = async (): Promise<boolean> => {
		if (fullscreenRequested) {
			return true;
		}
		try {
			await requestFullscreen();
			fullscreenRequested = true;
			setFullscreenPreferred(true);
			return true;
		} catch (error) {
			console.warn('[initKioskMode] Не удалось запросить fullscreen:', error);
			return false;
		}
	};

	// Если до перезагрузки был fullscreen — пробуем включить сразу (иногда браузер разрешает после восстановления вкладки)
	if (getFullscreenPreferred()) {
		void tryRequestFullscreen();
	}

	requestAnimationFrame(() => {
		void tryRequestFullscreen().then((ok) => {
			if (!ok) {
				setTimeout(() => void tryRequestFullscreen(), 300);
			}
		});
	});

	const handleFirstInteraction = (): void => {
		if (!fullscreenRequested) {
			void tryRequestFullscreen();
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

