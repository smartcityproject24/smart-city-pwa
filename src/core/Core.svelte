<script lang="ts">
	import Data from "./data/Data.svelte";
	import URL from "./url/URL.svelte";
	import Components from "./components/Components.svelte";
	import Routes from "./routes/Routes.svelte";
	import Language from "./language/Language.svelte";
	import Icon from "./icon/Icon.svelte";
	import Auth from "./auth/Auth.svelte";
	import User from "./user/User.svelte";
	import Info from "./info/Info.svelte";
    import Page from "./page/Page.svelte";
	import Brightness from "./brightness/Brightness.svelte";
	import Logging from "./logging/Logging.svelte";
	import PWA from "./pwa/PWA.svelte";
	import type { Snippet } from "svelte";

	import type {
		PagesContext,
		ComponentsContext,
		Options,
		Route,
	} from "./types";
	import type { PageInfo } from "./page/types";
	import type { Translations } from "./language/types";

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
</script>

<URL>
	<Data
		{pages}
		{components}
		{options}
		{routes}
		{icons}
		{info}
		{translations}
	>
		<Auth>
			<User>
				<Info>
					<Components>
						<Routes>
							<Language>
								<Icon>
									<Page>
										<Brightness>
											<Logging>
												<PWA>
													{@render children?.()}
												</PWA>
											</Logging>
										</Brightness>
									</Page>
								</Icon>
							</Language>
						</Routes>
					</Components>
				</Info>
			</User>
		</Auth>
	</Data>
</URL>
