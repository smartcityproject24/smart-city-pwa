<script lang="ts">
    import { onMount, onDestroy, getContext } from "svelte";
    import { setContext } from "svelte";
    import type { Snippet } from "svelte";
    import { logger, initLoggingAutoSend, initLogger } from "./logger";
    import { initLogStorage } from "./log-storage";
    import type { LoggingContext } from "./types";
    import type { Options } from "../types";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const options = getContext<Options>("options");

    const loggingConfig = options?.logging || {};

    initLogStorage({
        dbName: loggingConfig.dbName || "smart-city-logs",
        dbVersion: loggingConfig.dbVersion || 1,
        storeName: loggingConfig.storeName || "logs",
    });

    initLogger({
        sentLogsCleanupAgeHours: loggingConfig.sentLogsCleanupAgeHours || 6,
        sentLogsCleanupIntervalHours:
            loggingConfig.sentLogsCleanupIntervalHours || 24,
        logSendIntervalSeconds: loggingConfig.logSendIntervalSeconds || 30,
    });

    let cleanup: (() => void) | null = null;

    onMount(() => {
        cleanup = initLoggingAutoSend();
    });

    onDestroy(() => {
        cleanup?.();
    });

    setContext<LoggingContext>("logging", {
        logger,
    });
</script>

{@render children?.()}
