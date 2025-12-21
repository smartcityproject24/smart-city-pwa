import type { RegisterSWOptions } from 'virtual:pwa-register';
import { setupPWAUpdates } from './updates';
import type { PWAUpdateConfig } from './types';

/**
 * Конфигурация регистрации Service Worker для PWA
 * 
 * @param updateConfig - Конфигурация автоматических обновлений
 * @returns Опции для регистрации Service Worker
 */
export function createPWARegisterOptions(
	updateConfig: PWAUpdateConfig = {}
): RegisterSWOptions {
	const { autoReload = true } = updateConfig;

	return {
		immediate: true,
		onNeedRefresh() {
			if (autoReload) {
				window.location.reload();
			} else {
				console.log('[PWA] New content available, please refresh.');
			}
		},
		onOfflineReady() {
			console.log('[PWA] App ready to work offline');
		},
		onRegistered(registration) {
			setupPWAUpdates(registration, updateConfig);
		},
	};
}

