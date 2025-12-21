<script lang="ts">
    import { getContext } from "svelte";
    import type {
        AuthContext,
        UserContext,
        PageContext,
        LanguageContext,
        BrightnessContext,
        LoggingContext,
    } from "@core";
    import { fly } from "svelte/transition";
    import { slide } from "@/utils/transitions";
    import { SelectLanguage } from "@components/select-language";
    import ControlPanelButton from "./ControlPanelButton.svelte";
    import { X } from "lucide-svelte";
    import { PWAInstall } from "@components/ui/pwa-install";
    import { toFormatTimeWithSeconds } from "@/utils/date-time-conveter";

    const { translate } = getContext<LanguageContext>("language");
    const { clearTokens, access } = getContext<AuthContext>("auth");
    const { clearUserData, dashboardUUID } = getContext<UserContext>("user");
    const { goToPage, pageInfo, parseSchedule, isScheduleActive } =
        getContext<PageContext>("page");
    const {
        isCustomBrightness,
        customBrightness,
        setCustomBrightness,
        setIsCustomBrightness,
        currentTime,
        scheduleSettings,
    } = getContext<BrightnessContext>("brightness");
    const { logger } = getContext<LoggingContext>("logging");

    let isOpen = $state(false);

    const onTogglePanel = () => (isOpen = !isOpen);

    const schedulesWithActivity = $derived.by(() => {
        if (!$scheduleSettings || $scheduleSettings.length === 0) return [];

        void $currentTime;

        type ScheduleItem = {
            setting: Record<string, string>;
            schedule: NonNullable<ReturnType<typeof parseSchedule>>;
            isActive: boolean;
        };

        const result: ScheduleItem[] = [];

        void $currentTime;

        for (const setting of $scheduleSettings) {
            if (setting.settingType === "SCHEDULE_DARK") {
                const schedule = parseSchedule(setting.settingValue);
                if (schedule) {
                    const isActive = isScheduleActive(schedule);
                    result.push({ setting, schedule, isActive });
                }
            }
        }

        return result;
    });

    const handleLogout = async () => {
        const currentDashboardUUID = $dashboardUUID;
        const hasAccessToken = $access && $access.trim() !== "";

        if (currentDashboardUUID && hasAccessToken) {
            try {
                await logger.sendAllPendingLogs();
            } catch (error) {
                console.error(
                    "[ControlPanel] Failed to send/delete logs before logout:",
                    error,
                );
            }
        }

        await clearTokens();
        clearUserData();
        goToPage("login");
        isOpen = false;
    };
</script>

<ControlPanelButton {isOpen} onToggle={onTogglePanel} />

{#if isOpen}
    <div class="control-panel" transition:slide={{ duration: 300 }}>
        <div class="panel-header">
            <h2>{$translate("control_panel")}</h2>
            <button
                class="close-button"
                onclick={onTogglePanel}
                aria-label="Close panel"
            >
                <X size={24} />
            </button>
        </div>
        <div class="panel-content">
            <div class="control-section">
                <h3>{$translate("language")}:</h3>
                <SelectLanguage />
            </div>
            <div class="control-section">
                <h3>{$translate("dashboard_name")}:</h3>
                <div class="schedule-item">
                    <p>{$pageInfo?.dashboardName || "-"}</p>
                </div>
                <h3>{$translate("solution")}:</h3>
                {#if $pageInfo?.solutionName || $pageInfo?.solutionHeight || $pageInfo?.solutionWidth}
                    <div class="schedule-item">
                        {#if $pageInfo?.solutionName}
                            <p>{$pageInfo?.solutionName}</p>
                        {/if}
                        {#if $pageInfo?.solutionWidth}
                            <p>
                                {$translate("width")}: {$pageInfo?.solutionWidth}
                                px
                            </p>
                        {/if}
                        {#if $pageInfo?.solutionHeight}
                            <p>
                                {$translate("height")}: {$pageInfo?.solutionHeight}
                                px
                            </p>
                        {/if}
                    </div>
                {:else}
                    <div class="schedule-item">
                        <p>{$translate("solution_not_set")}</p>
                    </div>
                {/if}
                <div class="control-section">
                    <div class="brightness-control">
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                checked={$isCustomBrightness}
                                onchange={(e) =>
                                    setIsCustomBrightness(
                                        (e.target as HTMLInputElement).checked,
                                    )}
                                class="brightness-checkbox"
                            />
                            <span>{$translate("brightness")}</span>
                        </label>
                        <div
                            class="brightness-slider-wrapper"
                            style="--brightness-value: {$customBrightness}%"
                            class:disabled={!$isCustomBrightness}
                        >
                            <div class="brightness-slider-header">
                                <label for="brightness-slider">
                                    {$translate("value")}:
                                </label>
                                <span class="brightness-value-display">
                                    {$customBrightness}%
                                </span>
                            </div>
                            <div class="brightness-slider-container">
                                <div class="brightness-slider-progress"></div>
                                <input
                                    id="brightness-slider"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={$customBrightness}
                                    step="1"
                                    oninput={(e) => {
                                        const value = Number(
                                            (e.target as HTMLInputElement)
                                                .value,
                                        );
                                        if (!isNaN(value)) {
                                            setCustomBrightness(value);
                                        }
                                    }}
                                    class="brightness-slider"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {#if schedulesWithActivity.length > 0 || ($scheduleSettings && $scheduleSettings.length > 0)}
                    <div>
                        <h3>{$translate("schedule")}:</h3>
                        {#each schedulesWithActivity as { setting, schedule, isActive }}
                            {#key setting.settingValue}
                                <div
                                    class="schedule-item"
                                    class:active={isActive &&
                                        !$isCustomBrightness}
                                    in:fly={{ duration: 500 }}
                                    out:fly={{ duration: 500 }}
                                    class:disabled={$isCustomBrightness}
                                >
                                    <div class="schedule-details">
                                        <p>
                                            <span>
                                                {$translate("brightness")}:
                                            </span>
                                            {schedule.opacity}%
                                        </p>
                                        <p>
                                            <span>
                                                {$translate("start")}:
                                            </span>
                                            {toFormatTimeWithSeconds(schedule.startDateTime)}
                                        </p>
                                        <p>
                                            <span>
                                                {$translate("end")}:
                                            </span>
                                            {toFormatTimeWithSeconds(schedule.endDateTime)}
                                        </p>
                                    </div>
                                </div>
                            {/key}
                        {/each}
                        {#if $scheduleSettings}
                            {#each $scheduleSettings as setting}
                                {#if setting.settingType !== "SCHEDULE_DARK"}
                                    <p
                                        class="schedule-error"
                                        in:fly={{ duration: 500 }}
                                        out:fly={{ duration: 500 }}
                                    >
                                        {setting.settingValue}
                                    </p>
                                {/if}
                            {/each}
                        {/if}
                    </div>
                {/if}
            </div>
            <div class="control-section">
                <PWAInstall />
            </div>
            <div class="control-section">
                <button class="logout-button" onclick={handleLogout}>
                    {$translate("logout")}
                </button>
            </div>
        </div>
    </div>
{/if}

<style lang="scss">
    @use "styles/colors" as colors;
    @use "styles/mixins" as mixins;
    @use "styles/typography" as typo;

    .control-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: clamp(280px, 25vw, 400px);
        max-width: 100%;
        // height: 100vh;
        height: 100dvh;
        background-color: rgba(29, 29, 29, 0.9);
        backdrop-filter: blur(clamp(8px, 1vw, 12px));
        -webkit-backdrop-filter: blur(clamp(8px, 1vw, 12px));
        box-shadow: -2px 0 clamp(8px, 1vw, 16px) colors.$color-shadow-md;
        z-index: 999;
        display: flex;
        flex-direction: column;
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: clamp(16px, 1.5vw, 24px);
        border-bottom: 1px solid colors.$color-border;
        // background-color: rgba(29, 29, 29, 0.9);
        // backdrop-filter: blur(clamp(8px, 1vw, 12px));
        // -webkit-backdrop-filter: blur(clamp(8px, 1vw, 12px));

        h2 {
            @include typo.large-screen-medium;
            letter-spacing: typo.$letter-spacing-medium;
            font-weight: 700;
            margin: 0;
            color: colors.$color-text-primary;
        }
    }

    .close-button {
        background: none;
        border: none;
        @include typo.medium-text;
        cursor: pointer;
        color: colors.$color-text-secondary;
        padding: 0;
        width: clamp(28px, 3vw, 36px);
        height: clamp(28px, 3vw, 36px);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 120ms ease;

        &:hover {
            color: colors.$color-text-primary;
        }

        :global(svg) {
            width: 100%;
            height: 100%;
        }
    }

    .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: clamp(16px, 1.5vw, 24px);

        &::-webkit-scrollbar {
            width: clamp(8px, 0.8vw, 12px);
        }

        &::-webkit-scrollbar-track {
            background: colors.$color-background-secondary;
            border-radius: clamp(4px, 0.4vw, 6px);
        }

        &::-webkit-scrollbar-thumb {
            background: colors.$color-border;
            border-radius: clamp(4px, 0.4vw, 6px);
            transition: background 150ms ease;

            &:hover {
                background: colors.$color-border-hover;
            }
        }

        &::-webkit-scrollbar-thumb:active {
            background: colors.$color-primary;
        }

        scrollbar-width: thin;
        scrollbar-color: colors.$color-border colors.$color-background-secondary;
    }

    .control-section {
        margin-bottom: clamp(20px, 2.5vw, 32px);

        h3 {
            @include typo.base-text;
            font-weight: 600;
            margin: 0 0 clamp(12px, 1.5vw, 18px) 0;
            // color: colors.$color-text-secondary;
        }

        :global(.select-language) {
            width: 100%;
        }

        :global(.select-language select) {
            @include typo.select-text;
            width: 100%;
            padding: clamp(8px, 0.8vw, 12px);
            border: 1px solid colors.$color-border;
            border-radius: clamp(6px, 0.6vw, 8px);
            background-color: colors.$color-background-tertiary;
            color: colors.$color-text-primary;
            cursor: pointer;
            transition:
                border-color 120ms ease,
                background-color 120ms ease;

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
        }
    }

    .brightness-control {
        display: flex;
        flex-direction: column;
        gap: clamp(12px, 1.5vw, 18px);
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: clamp(8px, 1vw, 12px);
        cursor: pointer;
        @include typo.base-text;
        color: colors.$color-text-primary;
        user-select: none;

        &:hover {
            color: colors.$color-text-inverse;
        }
    }

    .brightness-checkbox {
        width: clamp(20px, 2.5vw, 24px);
        height: clamp(20px, 2.5vw, 24px);
        cursor: pointer;
        accent-color: colors.$color-primary;
        border: clamp(2px, 0.3vw, 3px) solid colors.$color-border;
        border-radius: clamp(4px, 0.5vw, 6px);
        background-color: colors.$color-background-tertiary;
        appearance: none;
        -webkit-appearance: none;
        position: relative;
        transition:
            background-color 120ms ease,
            border-color 120ms ease,
            box-shadow 120ms ease;
        margin: 0;
        padding: 0;

        &:hover {
            border-color: colors.$color-border-hover;
            background-color: colors.$color-background-quaternary;
        }

        &:checked {
            background-color: colors.$color-primary;
            border-color: colors.$color-primary;

            &::after {
                content: "";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(45deg);
                width: clamp(4px, 0.5vw, 5px);
                height: clamp(8px, 1vw, 9px);
                border: solid colors.$color-text-inverse;
                border-width: 0 clamp(1.5px, 0.2vw, 2px)
                    clamp(1.5px, 0.2vw, 2px) 0;
            }

            &:hover {
                background-color: colors.$color-primary-hover;
                border-color: colors.$color-primary-hover;
            }
        }
    }

    .brightness-slider-wrapper {
        display: flex;
        flex-direction: column;
        gap: clamp(12px, 1.5vw, 18px);
        padding: clamp(12px, 1.5vw, 18px);
        background-color: colors.$color-background-tertiary;
        border-radius: clamp(6px, 0.6vw, 8px);
        border: 1px solid colors.$color-border;
        transition: opacity 300ms ease;

        &.disabled {
            opacity: 0.5;
            pointer-events: none;
        }
    }

    .brightness-slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        label {
            @include typo.base-text;
            color: colors.$color-text-primary;
        }
    }

    .brightness-slider {
        cursor: pointer;
    }

    .brightness-value-display {
        @include typo.base-text;
        font-weight: 600;
        min-width: clamp(45px, 6vw, 55px);
        text-align: right;
    }

    .brightness-slider-container {
        position: relative;
        width: 100%;
        height: clamp(20px, 2.5vw, 28px);
        display: flex;
        align-items: center;
    }

    .schedule-item {
        margin-bottom: clamp(16px, 2vw, 24px);
        padding: clamp(12px, 1.5vw, 18px);
        background-color: colors.$color-background-tertiary;
        border-radius: clamp(6px, 0.6vw, 8px);
        border: 1px solid colors.$color-border;
        transition:
            border-color 120ms ease,
            background-color 120ms ease,
            opacity 300ms ease;

        &.active {
            border-color: colors.$color-primary;
            background-color: rgba(colors.$color-primary, 0.1);
        }

        &.disabled {
            opacity: 0.5;
        }
    }

    .schedule-details {
        display: flex;
        flex-direction: column;
        gap: clamp(6px, 0.8vw, 10px);

        p {
            @include typo.base-text;
            margin: 0;
            color: colors.$color-text-secondary;

            span {
                font-weight: 600;
                color: colors.$color-text-primary;
                margin-right: clamp(8px, 1vw, 12px);
            }
        }
    }

    .schedule-error {
        @include typo.base-text;
        color: colors.$color-error;
        margin: 0;
        padding: clamp(8px, 1vw, 12px);
        background-color: colors.$color-background-tertiary;
        border-radius: clamp(4px, 0.5vw, 6px);
    }

    .logout-button {
        width: 100%;
        padding: clamp(10px, 1vw, 16px);
        background-color: colors.$color-error;
        color: colors.$color-text-inverse;
        border: none;
        border-radius: clamp(6px, 0.6vw, 8px);
        @include typo.button-text;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 120ms ease;

        &:hover {
            background-color: colors.$color-primary-hover;
        }
    }

    // Медиа-запросы для адаптивности
    @media (max-width: 600px) {
        .control-panel {
            width: clamp(250px, 80vw, 320px);
        }
    }

    @media (min-width: 2000px) {
        .control-panel {
            width: clamp(350px, 20vw, 450px);
        }

        .panel-header h2 {
            @include typo.large-screen-medium;
        }
    }
</style>
