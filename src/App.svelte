<script lang="ts">
    import { Core } from "@core";
	import { Middleware } from "@middleware";
	import { Page } from "@components/page";
	import pages from "@pages";
	import components from "@components";

	import {
		options,
		routes,
		icons,
		info,
		translations,
	} from "@data";
</script>

<Core
	{pages}
	{components}
	{options}
	{routes}
	{icons}
	{info}
	{translations}
>
	<main>
		<Middleware>
			<Page />
		</Middleware>
	</main>
</Core>

<style lang="scss" global>
	@use "styles/fonts";
	@use "styles/colors" as colors;
	
	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}
	
	body {
		display: flex;
		flex-direction: column;
		padding: 0;
		margin: 0;
		width: 100%;
		height: 100%;
		min-height: -webkit-fill-available;
		min-width: 100vw;
		background-color: colors.$color-background-primary;
		color: colors.$color-text-primary;

		-webkit-tap-highlight-color: transparent;

		overflow: hidden;
		touch-action: none;
	}
	main {
		display: block;
		padding: 0;
		margin: 0 auto;
		width: 100%;
		height: 100vh;
		z-index: 0;
		position: relative;
		overflow: hidden;
		background-color: colors.$color-background-primary;
	}
	input {
		border: 0;
		border-radius: 0;
		width: 100%;
		outline: 0;
		margin: 0;
	}
	textarea {
		margin: 0;
		width: 100%;
	}
	select {
		border: 0;
		border-radius: 0;
		width: 100%;
		outline: 0;
		margin: 0;
	}
	label {
		width: 100%;
	}
	button {
		border: 0;
		border-radius: 0;
		padding: 0;
		flex-shrink: 0;
		cursor: pointer;
		margin: 0;
	}
</style>
