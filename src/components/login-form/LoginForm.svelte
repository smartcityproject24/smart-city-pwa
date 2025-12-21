<script lang="ts">
    import { getContext } from "svelte";
    import { authService } from "@api/services/auth.service";
    import { Eye, EyeOff } from "lucide-svelte";
    import { Loader } from "@components/ui/loader";
    import type { LanguageContext, TranslationKey } from "@core";
    import type { AuthContext } from "@core";
    import type { UserContext } from "@core";
    import type { RouteStore } from "@core";
    import type { LoggingContext } from "@core";
    import { fade } from "svelte/transition";

    interface Props {
        onSubmit?: (data: { code: string }) => void;
    }

    interface ErrorKeys {
        code: TranslationKey[];
        password: TranslationKey[];
    }

    let { onSubmit }: Props = $props();

    const { translate } = getContext<LanguageContext>("language");
    const { setTokens } = getContext<AuthContext>("auth");
    const { setUserData } = getContext<UserContext>("user");
    const { navigate } = getContext<RouteStore>("routeStore");
    const { logger } = getContext<LoggingContext>("logging");

    const MAX_LENGTH = 255;
    const PASSWORD_MIN_LENGTH = 8;
    const PASSWORD_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;

    let showPassword = $state(false);
    let code = $state("");
    let password = $state("");
    let errorKeys = $state<ErrorKeys>({ code: [], password: [] });
    let authError = $state("");
    let isLoading = $state(false);

    const clearError = (field: "code" | "password") => {
        if (field === "code") errorKeys.code = [];
        if (field === "password") errorKeys.password = [];
        authError = "";
    };

    const submit = async (e: SubmitEvent) => {
        e.preventDefault();
        errorKeys.code = [];
        errorKeys.password = [];
        authError = "";

        const codeTrim = code.trim();

        if (!codeTrim) errorKeys.code.push("required_field");
        if (codeTrim.length > MAX_LENGTH)
            errorKeys.code.push({
                key: "max_length",
                params: { max: MAX_LENGTH },
            });

        if (!password) errorKeys.password.push("required_field");
        if (password.length < PASSWORD_MIN_LENGTH)
            errorKeys.password.push({
                key: "password_too_short",
                params: { min: PASSWORD_MIN_LENGTH },
            });
        if (password.length > MAX_LENGTH)
            errorKeys.password.push({
                key: "max_length",
                params: { max: MAX_LENGTH },
            });
        // if (!PASSWORD_REGEX.test(password))
        //     errorKeys.password.push("password_requirements");

        if (errorKeys.code.length || errorKeys.password.length) return;

        if (!navigator.onLine) {
            authError = "network_error";
            return;
        }

        isLoading = true;
        try {
            const data = await authService.loginWithPassword(
                codeTrim,
                password,
            );

            setTokens(data.accessToken, data.refreshToken, data.expiresSeconds);

            if (data.userUUID && data.dashboardUUID) {
                setUserData(data.userUUID, data.dashboardUUID);

                try {
                    logger.logLogin(data.dashboardUUID, {
                        dashboardCode: codeTrim,
                    });
                } catch (error) {
                    console.error("[LoginForm] Failed to log login:", error);
                }
            }

            onSubmit?.({ code: codeTrim });
            code = "";
            password = "";

            navigate("dashboard");
        } catch (e) {
            authError = (e as Error).message || "auth_failed";
        } finally {
            isLoading = false;
        }
    };
</script>

<form
    class="login-form"
    onsubmit={submit}
    aria-label="Login form"
    autocomplete="on"
    method="post"
    action="#"
>
    {#if isLoading}
        <div class="loader-overlay">
            <Loader />
        </div>
    {/if}

    <div class="field">
        <label for="code" class:field-error={errorKeys?.code?.length > 0}>
            {$translate("code")}
        </label>
        <input
            id="code"
            type="text"
            inputmode="text"
            bind:value={code}
            autocomplete="username"
            name="username"
            maxlength="255"
            class:error={errorKeys.code.length > 0}
            aria-invalid={errorKeys.code.length > 0}
            aria-describedby={errorKeys.code.length ? "code-error" : null}
            oninput={() => clearError("code")}
        />
        {#if errorKeys.code.length}
            <div
                id="code-error"
                class="error"
                role="alert"
                transition:fade={{ duration: 300 }}
            >
                {#each errorKeys.code as e}
                    <div>{$translate(e)}</div>
                {/each}
            </div>
        {/if}
    </div>

    <div class="field">
        <label
            for="password"
            class:field-error={errorKeys?.password?.length > 0}
        >
            {$translate("password")}
        </label>
        <div class="password-wrapper">
            <input
                id="password"
                type={showPassword ? "text" : "password"}
                bind:value={password}
                autocomplete={showPassword ? "off" : "current-password"}
                name="current-password"
                spellcheck="false"
                data-lpignore="true"
                data-form-type="password"
                maxlength="255"
                class:error={errorKeys.password.length > 0}
                aria-invalid={errorKeys.password.length > 0}
                aria-describedby={errorKeys.password.length
                    ? "password-error"
                    : null}
                oninput={() => clearError("password")}
                style="flex:1"
            />
            <button
                class="toggle-password"
                type="button"
                tabindex="-1"
                aria-label={showPassword
                    ? $translate("hide_password")
                    : $translate("show_password")}
                onclick={() => (showPassword = !showPassword)}
            >
                {#if showPassword}
                    <EyeOff />
                {:else}
                    <Eye />
                {/if}
            </button>
        </div>
        {#if errorKeys.password.length}
            <div
                id="password-error"
                class="error"
                role="alert"
                transition:fade={{ duration: 300 }}
            >
                {#each errorKeys.password as e}
                    <div>{$translate(e)}</div>
                {/each}
            </div>
        {/if}
    </div>

    {#if authError}
        <div
            class="error error-general"
            role="alert"
            transition:fade={{ duration: 300 }}
        >
            {$translate(authError)}
        </div>
    {/if}

    <div class="actions">
        <button type="submit" disabled={isLoading}>
            {#if isLoading}
                {$translate("loading_data")}
            {:else}
                {$translate("enter")}
            {/if}
        </button>
    </div>
</form>

<style lang="scss">
    @use "styles/typography" as typo;
    @use "styles/colors" as colors;
    @use "styles/mixins" as mixins;

    .login-form {
        width: clamp(calc(100vw - 40px), 35vw, 600px);
        max-width: calc(50vw - 20px);
        padding: clamp(16px, 1.5vw, 32px);
        background: colors.$color-background-secondary;
        border: 1px solid colors.$color-border;
        border-radius: clamp(8px, 0.8vw, 16px);
        box-shadow: 0 clamp(4px, 0.5vw, 12px) clamp(12px, 1.5vw, 24px)
            colors.$color-shadow-lg;
        display: flex;
        flex-direction: column;
        gap: clamp(10px, 3vw, 40px);
        box-sizing: border-box;
        position: relative;
        transition: all 300ms ease;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: clamp(4px, 0.5vw, 8px);
    }

    .field label {
        @include typo.label-text;
        color: colors.$color-text-primary;
        transition: color 120ms ease-in-out;
    }

    .field-error {
        color: colors.$color-error !important;
    }

    .field input {
        @include typo.input-text;
        padding: clamp(8px, 0.8vw, 14px) clamp(10px, 1vw, 16px);
        border: solid colors.$color-border;
        border-width: clamp(2px, 0.2vw, 3px);
        border-radius: clamp(6px, 0.6vw, 10px);
        color: colors.$color-text-primary;
        background-color: colors.$color-background-tertiary;
        transition:
            border-color 120ms ease,
            box-shadow 120ms ease,
            background-color 120ms ease;
        box-sizing: border-box;

        &:hover {
            border-color: colors.$color-border-hover;
            background-color: colors.$color-background-quaternary;
        }

        @include mixins.isHoverable {
            &:focus {
                outline: none;
                border-color: colors.$color-text-inverse;
                background-color: colors.$color-background-quaternary;
                box-shadow: 0 0 0 clamp(2px, 0.3vw, 4px)
                    rgba(255, 255, 255, 0.2);
            }
        }

        &:-webkit-autofill,
        &:-webkit-autofill:hover,
        &:-webkit-autofill:focus,
        &:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px colors.$color-background-tertiary
                inset !important;
            -webkit-text-fill-color: colors.$color-text-primary !important;
            caret-color: colors.$color-text-primary;
            transition: background-color 5000s ease-in-out 0s;
        }

        &:autofill,
        &:autofill:hover,
        &:autofill:focus {
            background-color: colors.$color-background-tertiary !important;
            color: colors.$color-text-primary !important;
            box-shadow: 0 0 0 30px colors.$color-background-tertiary inset !important;
        }
    }

    .field input.error {
        border-color: colors.$color-border-error;
        border-width: clamp(2px, 0.2vw, 3px);
        box-shadow: 0 0 0 clamp(2px, 0.3vw, 4px) colors.$color-error-light;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        margin-top: clamp(4px, 0.5vw, 8px);
    }

    .actions button {
        @include typo.button-text;
        padding: clamp(8px, 0.8vw, 16px) clamp(14px, 1.5vw, 24px);
        border: none;
        background: colors.$color-primary;
        color: colors.$color-text-inverse;
        border-radius: clamp(6px, 0.6vw, 10px);
        cursor: pointer;
        transition: background-color 120ms ease;
        font-weight: 600;
        width: 100%;

        &:hover:not(:disabled) {
            background: colors.$color-primary-hover;
        }

        &:active:not(:disabled) {
            background: colors.$color-primary-active;
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    }

    .loader-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(22, 22, 22, 0.9);
        border-radius: clamp(8px, 0.8vw, 16px);
        z-index: 10;
    }

    .error {
        @include typo.error-text;
        color: colors.$color-error;
        margin-top: clamp(4px, 0.5vw, 8px);
        line-height: 1.4;
    }

    .error-general {
        text-align: center;
    }

    .toggle-password {
        padding: clamp(4px, 0.4vw, 8px) clamp(6px, 0.6vw, 10px);

        background-color: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: colors.$color-text-inverse;
        transition:
            color 120ms ease,
            opacity 120ms ease;
        position: absolute;
        right: clamp(6px, 0.6vw, 12px);

        top: 50%;
        transform: translateY(-50%);
        z-index: 1;

        &:hover {
            color: colors.$color-text-inverse;
            opacity: 0.8;
        }

        &:focus-visible {
            outline: 2px solid colors.$color-text-inverse;
            outline-offset: 2px;
            border-radius: 4px;
        }
    }

    .password-wrapper {
        display: flex;
        align-items: center;
        position: relative;
        width: 100%;
    }

    .toggle-password :global(svg) {
        width: clamp(18px, 1.5vw, 24px);
        height: clamp(18px, 1.5vw, 24px);
    }

    @media (max-width: 600px) {
        .login-form {
            width: calc(100vw - 24px);
            padding: clamp(14px, 3vw, 20px);
            max-width: calc(90vw - 40px);
        }
    }

    // Планшеты и средние экраны
    @media (min-width: 601px) and (max-width: 1024px) {
        .login-form {
            width: clamp(400px, 45vw, 550px);
            max-width: calc(60vw - 20px);
        }
    }

    // Десктопы (средние)
    @media (min-width: 1025px) and (max-width: 1999px) {
        .login-form {
            width: clamp(450px, 40vw, 650px);
            max-width: calc(30vw - 20px);
        }
    }

    // Большие экраны (≥2000px)
    @media (min-width: 2000px) {
        .login-form {
            width: clamp(500px, 35vw, 750px);
            max-width: calc(50vw - 20px);
            padding: clamp(24px, 1.5vw, 40px);
        }

        .field label {
            @include typo.large-screen-label;
        }

        .field input {
            @include typo.large-screen-input;
            padding: clamp(12px, 1vw, 18px) clamp(14px, 1.2vw, 20px);
        }

        .actions button {
            @include typo.large-screen-button;
            padding: clamp(12px, 1vw, 20px) clamp(18px, 1.8vw, 28px);
        }
    }

    // Высокие экраны (портретная ориентация или высокие мониторы)
    @media (min-height: 1200px) {
        .login-form {
            gap: clamp(15px, 2vh, 50px);
        }
    }
</style>
