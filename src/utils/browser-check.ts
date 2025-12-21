/**
 * Проверка поддержки браузера
 */

export function checkBrowserSupport(): boolean {
	if (typeof navigator === 'undefined') return true;

	const ua = navigator.userAgent;

	const chromeMatch = ua.match(/Chrome\/(\d+)/);
	if (chromeMatch && !ua.match(/Edg|OPR/)) {
		return parseInt(chromeMatch[1], 10) >= 100;
	}

	if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
		const safariMatch = ua.match(/Version\/(\d+)/);
		if (safariMatch) {
			return parseInt(safariMatch[1], 10) >= 15;
		}
	}

	const firefoxMatch = ua.match(/Firefox\/(\d+)/);
	if (firefoxMatch) {
		return parseInt(firefoxMatch[1], 10) >= 100;
	}

	const edgeMatch = ua.match(/Edg\/(\d+)/);
	if (edgeMatch) {
		return parseInt(edgeMatch[1], 10) >= 100;
	}

	return true;
}

export function showUnsupportedBrowserMessage(): void {
	const appElement = document.getElementById('app');
	if (appElement) {
		appElement.innerHTML = `
			<div style="
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				background: #161616;
				color: #F2F2F3;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
				padding: 20px;
				text-align: center;
			">
				<div>
					<h1 style="color: #F34A23; margin-bottom: 16px;">Браузер не поддерживается</h1>
					<p style="margin-bottom: 8px;">Ваш браузер слишком старый.</p>
					<p style="color: #999;">Требуется: Chrome 100+, Safari 15+, Firefox 100+ или Edge 100+</p>
				</div>
			</div>
		`;
	}
}

