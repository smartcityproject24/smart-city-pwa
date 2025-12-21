<script lang="ts">
	import { setContext } from "svelte";
	import type { Snippet } from "svelte";
	import type {
		PagesContext,
		ComponentsContext,
		Options,
		Route,
	} from "../types";
	import type { PageInfo } from "../page/types";
	import type { Translations } from "../language/types";
	
	interface Props {
		pages?: PagesContext;
		components?: ComponentsContext;
		options?: Options;
		routes?: Record<string, Route>;
		icons?: any;
		info?: Record<string, PageInfo>;
		translations?: Translations;
		children?: Snippet;
	}

	let {
		pages = {},
		components = {},
		options = {} as Options,
		routes = {},
		icons = {},
		info = {},
		translations = {},
		children,
	}: Props = $props();

	setContext<PagesContext>("pages", pages);
	setContext<ComponentsContext>("components", components);
	setContext<Options>("options", options);
	setContext<Record<string, Route>>("routes", routes);
	setContext<any>("icons", icons);
	setContext<Record<string, PageInfo>>("info", info);
	setContext<Translations>("translations", translations);
</script>

{@render children?.()}

