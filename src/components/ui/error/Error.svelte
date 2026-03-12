<script lang="ts">
    import { getContext } from "svelte";
    import { fade } from "svelte/transition";

    import type { LanguageContext } from "@core";
    import { ApiError } from "@api/types/errors";

    interface Props {
        error: ApiError;
        onRetry?: () => void;
        onLogout?: () => void;
        fullscreen?: boolean;
    }

    let { error, onRetry, onLogout, fullscreen = false }: Props = $props();

    const { translate } = getContext<LanguageContext>("language");

    const shouldShowRetry = $derived(
        (error.isInternal() || error.errorType === "Unknown") && onRetry,
    );

    const errorMessage = $derived(
        error.message === "unknown_error"
            ? $translate("unknown_error")
            : error.message,
    );
</script>

<div class="error" class:fullscreen in:fade={{ duration: 300 }}>
    <div class="error-content">
        <h2>{$translate("error_loading_data")}</h2>
        <p class="error-message">{errorMessage}</p>
        <div class="error-actions">
            {#if shouldShowRetry && onRetry}
                <button class="retry-button" type="button" onclick={onRetry}>
                    {$translate("retry")}
                </button>
            {/if}
            {#if onLogout}
                <button class="logout-button" type="button" onclick={onLogout}>
                    {$translate("logout")}
                </button>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    @use "styles/colors" as colors;
    @use "styles/typography" as typo;

    .error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .error.fullscreen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: colors.$color-background-primary;
        z-index: 9999;
    }

    .error-content {
        text-align: center;
        color: colors.$color-text-primary;
        max-width: 400px;
        padding: 20px;
    }

    .error-content h2 {
        @include typo.medium-text;
        margin: 0 0 15px 0;
        color: colors.$color-text-primary;
    }

    .error-message {
        @include typo.base-text;
        margin: 0 0 20px 0;
        color: colors.$color-error;
    }

    .error-actions {
        display: flex;
        gap: clamp(8px, 0.8vw, 12px);
        justify-content: center;
        flex-wrap: wrap;
    }

    .retry-button {
        @include typo.button-text;
        padding: clamp(10px, 1vw, 14px) clamp(20px, 2vw, 28px);
        background: colors.$color-success;
        color: colors.$color-text-inverse;
        border: none;
        border-radius: clamp(6px, 0.6vw, 10px);
        cursor: pointer;
        transition: opacity 120ms ease;

        &:hover {
            opacity: 0.9;
        }

        &:active {
            opacity: 0.8;
        }
    }

    .logout-button {
        @include typo.button-text;
        padding: clamp(10px, 1vw, 14px) clamp(20px, 2vw, 28px);
        background: transparent;
        color: colors.$color-text-secondary;
        border: 1px solid colors.$color-border;
        border-radius: clamp(6px, 0.6vw, 10px);
        cursor: pointer;
        transition: opacity 120ms ease, border-color 120ms ease;

        &:hover {
            opacity: 0.9;
            border-color: colors.$color-text-secondary;
        }

        &:active {
            opacity: 0.8;
        }
    }
</style>
