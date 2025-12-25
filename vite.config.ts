// vite.config.ts
// @ts-nocheck

import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import svelteConfig from './svelte.config.js';
import { pwaConfig } from './pwa.config.ts';

// Конфигурация HTTPS
const getHttpsConfig = () => {
    if (!env.HTTPS_ENABLED || env.HTTPS_ENABLED === 'false') return false;

    const keyPath = env.SSL_KEY_PATH || 'ssl/RGB.KG.key';
    const certPath = env.SSL_CERT_PATH || 'ssl/RGB_KG.crt';

    try {
        return {
            key: fs.readFileSync(path.resolve(__dirname, keyPath)),
            cert: fs.readFileSync(path.resolve(__dirname, certPath)),
            ca: env.SSL_CA_PATH ? fs.readFileSync(path.resolve(__dirname, env.SSL_CA_PATH)) : undefined
        };
    } catch (error) {
        console.warn('HTSS certificates not found, falling back to HTTP');
        return false;
    }
};

export default defineConfig({

	plugins: [
		svelte(svelteConfig),
		VitePWA(pwaConfig)
	],
	build: {
		target: 'es2021',
		minify: 'esbuild',
		sourcemap: false,
		chunkSizeWarningLimit: 1000
	},
	resolve: {
		dedupe: ["svelte"],
		alias: {
			'@components': path.resolve(__dirname, 'src/components'),
			'@core': path.resolve(__dirname, 'src/core'),
			'@data': path.resolve(__dirname, 'src/data'),
			'@middleware': path.resolve(__dirname, 'src/middleware'),
			'@pages': path.resolve(__dirname, 'src/pages'),
			'@api': path.resolve(__dirname, 'src/api'),
			'@': path.resolve(__dirname, 'src')
		}
	},
    server: {
        port: 16026
    },
    preview: {
        port: 16026,
        https: getHttpsConfig(),
        host: true,
        allowedHosts: [
            'localhost',
            '127.0.0.1',
            'rgb.kg'
        ],
    },
});
