<script lang="ts">
    import { onMount, onDestroy, getContext, setContext } from "svelte";
    import type { Snippet } from "svelte";
    import { initKioskMode } from "./kiosk-init";
    import { setupPWAUpdates } from "./updates";
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

    async function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) return;

        let registration: ServiceWorkerRegistration;
        try {
            registration = await navigator.serviceWorker.register("/sw.js", {
                updateViaCache: "none",
                scope: "/",
            });
            console.log("[PWA] SW зарегистрирован");
        } catch (e) {
            console.error("[PWA] SW регистрация не удалась:", e);
            return;
        }

        // Если SW уже ждёт активации (ожидает skipWaiting) — активируем немедленно
        const activateWaiting = (sw: ServiceWorker) => {
            sw.postMessage({ type: "SKIP_WAITING" });
        };

        if (registration.waiting) {
            activateWaiting(registration.waiting);
        }

        // Когда находится новая версия SW — сразу принудительно активируем
        registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
                if (installing.state === "installed") {
                    activateWaiting(installing);
                }
            });
        });

        // Если страница ещё не под контролем SW (первый визит / сброс кеша)
        // — ждём активации и делаем одну перезагрузку
        if (!navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => {
                    console.log("[PWA] SW взял контроль — перезагрузка");
                    window.location.reload();
                },
                { once: true }
            );
        }

        // Периодическая проверка обновлений
        const updateConfig = options?.pwa?.update || {};
        setupPWAUpdates(registration, updateConfig);
    }

    onMount(() => {
        registerServiceWorker();

        const kioskConfig = options?.kiosk || {};
        kioskCleanup = initKioskMode(kioskConfig);
    });

    onDestroy(() => {
        kioskCleanup?.();
    });
</script>

{@render children?.()}
