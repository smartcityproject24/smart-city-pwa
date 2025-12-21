/**
 * Настройка автоматических обновлений PWA без всплывающих окон
 * 
 * @param registration - Регистрация Service Worker
 * @param config - Конфигурация обновлений
 */
export function setupPWAUpdates(
	registration: ServiceWorkerRegistration | undefined,
	config: { checkInterval?: number } = {}
): void {
	if (!registration) return;

	const checkInterval = config.checkInterval || 5 * 60 * 1000;

	const checkForUpdates = async () => {
		if (!registration) return;

		try {
			await registration.update();
		} catch (error) {
			console.error('[PWA] Update check failed:', error);
		}
	};

	window.addEventListener('focus', checkForUpdates);

	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) {
			checkForUpdates();
		}
	});

	window.addEventListener('appinstalled', checkForUpdates);

	const intervalId = setInterval(() => {
		if (!document.hidden) {
			checkForUpdates();
		}
	}, checkInterval);

	window.addEventListener('beforeunload', () => {
		clearInterval(intervalId);
	});
}

