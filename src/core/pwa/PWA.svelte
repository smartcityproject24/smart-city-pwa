<script lang="ts">
    import { onMount, onDestroy, getContext, setContext } from "svelte";
    import type { Snippet } from "svelte";
    import { registerSW } from "virtual:pwa-register";
    import { createPWARegisterOptions } from "./registration";
    import { initKioskMode } from "./kiosk-init";
    import type { Options } from "../types";
    import type { PlatformDetectionContext } from "./types";
    import { getPlatformType } from "./platform-detection";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const options = getContext<Options>("options");

    let kioskCleanup: (() => void) | null = null;

    setContext<PlatformDetectionContext>("platform", {
        platform: getPlatformType(),
    });

    onMount(() => {
        if ("serviceWorker" in navigator) {
            const pwaUpdateConfig = options?.pwa?.update || {};
            const pwaRegisterOptions = createPWARegisterOptions(pwaUpdateConfig);
            registerSW(pwaRegisterOptions);

            // Если страница загружена без контроля SW (первый визит или сброс кеша),
            // перезагружаем один раз после активации — чтобы SW перехватывал навигацию офлайн.
            if (!navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(() => {
                    window.location.reload();
                });
            }
        }

        const kioskConfig = options?.kiosk || {};
        kioskCleanup = initKioskMode(kioskConfig);
    });

    onDestroy(() => {
        kioskCleanup?.();
    });
</script>

{@render children?.()}
