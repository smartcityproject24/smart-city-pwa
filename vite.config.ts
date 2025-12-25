// vite.config.ts
// @ts-nocheck

import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import svelteConfig from './svelte.config.js';
import { pwaConfig } from './pwa.config.ts';

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
    }
});
