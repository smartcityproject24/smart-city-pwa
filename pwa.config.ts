import type { VitePWAOptions } from 'vite-plugin-pwa';

export const pwaConfig: Partial<VitePWAOptions> = {
	registerType: 'autoUpdate',
	includeAssets: [
		'favicons/favicon.ico',
		'favicons/favicon-16x16.png',
		'favicons/favicon-32x32.png',
		'favicons/favicon-96x96.png',
		'favicons/apple-touch-icon.png',
		'favicons/android-chrome-192x192.png',
		'favicons/android-chrome-512x512.png',
		'fonts/**/*.ttf'
	],
	manifest: {
		name: 'Smart City',
		short_name: 'Smart City',
		description: 'Smart City Dashboard',
		theme_color: '#1D1D1D',
		background_color: '#161616',
		display: 'fullscreen',
		display_override: ['fullscreen', 'standalone'], // Test auto fullscreen
		orientation: 'any',
		scope: '/',
		start_url: '/',
		icons: [
			{
				src: 'favicons/android-chrome-192x192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'any maskable'
			},
			{
				src: 'favicons/android-chrome-512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'any maskable'
			}
		]
	},
	workbox: {
		globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
		navigationPreload: false,
		navigateFallback: '/index.html',
		navigateFallbackDenylist: [
			/^https:\/\/.*rgb\.kg.*/i,
			/^https:\/\/.*\/smart-city\/api\/.*/i
		],
		skipWaiting: true,
		clientsClaim: true,
		runtimeCaching: [
			{
				urlPattern: /^https:\/\/.*rgb\.kg.*\/smart-city\/api\/v1\/dashboards\/.*\/solutions/i,
				handler: 'NetworkFirst',
				options: {
					cacheName: 'api-dashboards',
					expiration: {
						maxEntries: 10,
						maxAgeSeconds: 60 * 60 * 24 * 30
					},
					cacheableResponse: {
						statuses: [0, 200]
					},
					networkTimeoutSeconds: 10
				}
			},
			{
				urlPattern: /^https:\/\/.*rgb\.kg.*\/smart-city\/api\/v1\/playlists\/.*\/contents/i,
				handler: 'NetworkFirst',
				options: {
					cacheName: 'api-playlists',
					expiration: {
						maxEntries: 50,
						maxAgeSeconds: 60 * 60 * 24 * 30
					},
					cacheableResponse: {
						statuses: [0, 200]
					},
					networkTimeoutSeconds: 10
				}
			},
			{
				urlPattern: /^https:\/\/.*rgb\.kg.*\/smart-city\/api\/v1\/files\/.*\/dashboard/i,
				handler: 'NetworkFirst',
				options: {
					cacheName: 'api-files',
					expiration: {
						maxEntries: 100,
						maxAgeSeconds: 60 * 60 * 24 * 30
					},
					cacheableResponse: {
						statuses: [0, 200]
					},
					networkTimeoutSeconds: 30
				}
			}
		]
	},
	devOptions: {
		enabled: true,
		type: 'module'
	}
};
