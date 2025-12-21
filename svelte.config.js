import { sveltePreprocess } from 'svelte-preprocess';

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
const config = {
	preprocess: sveltePreprocess({
		scss: {
			includePaths: ['src'],
			prependData: `@use "styles/mixins" as *;`,
		},
	}),
};

export default config;
