<script lang="ts">
    import { getContext } from "svelte";
    import { fade } from "svelte/transition";

    import type { LanguageContext } from "@core";
    import { ApiError } from "@api/types/errors";

    interface Props {
        error: ApiError;
        onRetry?: () => void;
        fullscreen?: boolean;
    }

    let { error, onRetry, fullscreen = false }: Props = $props();

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
        {#if shouldShowRetry && onRetry}
            <button class="retry-button" type="button" onclick={onRetry}>
                {$translate("retry")}
            </button>
        {/if}
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
</style>
