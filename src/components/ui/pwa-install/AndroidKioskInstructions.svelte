<script lang="ts">
    import { getContext } from "svelte";
    import type { LanguageContext } from "@core";
    import type { PlatformDetectionContext } from "@core/pwa/types";
    import { slide } from "@/utils/transitions";

    const { translate } = getContext<LanguageContext>("language");
    const { platform: platformType } = getContext<PlatformDetectionContext>("platform");

    interface Props {
        showAndroidInstructions: boolean;
        showInstructions: boolean;
        onClose?: () => void;
    }

    let {
        showAndroidInstructions,
        showInstructions,
        onClose,
    }: Props = $props();

    let isAndroidDevice = $state(false);

    function handleDismiss() {
        showInstructions = false;
        onClose?.();
    }

    $effect(() => {
        isAndroidDevice = platformType === "android";
    });
</script>

{#if showInstructions && isAndroidDevice && showAndroidInstructions}
    <div
        class="android-instructions-overlay"
        transition:slide={{ duration: 300 }}
    >
        <div class="android-instructions-modal">
            <div class="android-instructions-header">
                <h2>{$translate("android_kiosk_title")}</h2>
                <button class="close-button" onclick={handleDismiss}>×</button>
            </div>

            <div class="android-instructions-content">
                <div class="instruction-section">
                    <h3>{$translate("android_kiosk_autostart_title")}</h3>
                    <p>{$translate("android_kiosk_autostart_description")}</p>

                    <div class="method">
                        <h4>{$translate("android_kiosk_method_a_title")}</h4>
                        <ol>
                            <li>
                                {$translate("android_kiosk_method_a_step1")}
                            </li>
                            <li>
                                {$translate("android_kiosk_method_a_step2")}
                            </li>
                            <li>
                                {$translate("android_kiosk_method_a_step3")}
                            </li>
                            <li>
                                {$translate("android_kiosk_method_a_step4")}
                            </li>
                        </ol>
                    </div>

                    <div class="method">
                        <h4>{$translate("android_kiosk_method_b_title")}</h4>
                        <ul>
                            <li>
                                <strong
                                    >{$translate(
                                        "android_kiosk_method_b_item1",
                                    )}</strong
                                >
                            </li>
                            <li>
                                <strong
                                    >{$translate(
                                        "android_kiosk_method_b_item2",
                                    )}</strong
                                >
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="instruction-section">
                    <h3>{$translate("android_kiosk_notifications_title")}</h3>
                    <p>
                        {$translate("android_kiosk_notifications_description")}
                    </p>

                    <div class="method">
                        <h4>
                            {$translate(
                                "android_kiosk_notifications_adb_title",
                            )}
                        </h4>
                        <pre><code
                                >adb shell appops set com.android.chrome POST_NOTIFICATION ignore
adb shell settings put global zen_mode 1</code
                            ></pre>
                    </div>

                    <div class="method">
                        <h4>
                            {$translate(
                                "android_kiosk_notifications_manual_title",
                            )}
                        </h4>
                        <ol>
                            <li>
                                {$translate(
                                    "android_kiosk_notifications_manual_step1",
                                )}
                            </li>
                            <li>
                                {$translate(
                                    "android_kiosk_notifications_manual_step2",
                                )}
                            </li>
                            <li>
                                {$translate(
                                    "android_kiosk_notifications_manual_step3",
                                )}
                            </li>
                        </ol>
                    </div>
                </div>

                <div class="instruction-section">
                    <h3>{$translate("android_kiosk_fullscreen_title")}</h3>
                    <p>{$translate("android_kiosk_fullscreen_description")}</p>
                    <p>
                        <strong
                            >{$translate(
                                "android_kiosk_fullscreen_important",
                            )}</strong
                        >
                    </p>
                </div>

                <div class="instruction-section">
                    <h3>{$translate("android_kiosk_additional_info")}</h3>
                    <p>
                        {$translate(
                            "android_kiosk_additional_info_description",
                        )}
                    </p>
                </div>
            </div>

            <div class="android-instructions-footer">
                <button class="dismiss-button" onclick={handleDismiss}>
                    {$translate("android_kiosk_dismiss")}
                </button>
            </div>
        </div>
    </div>
{/if}

<style lang="scss">
    @use "styles/colors" as colors;

    .android-instructions-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: colors.$color-shadow-lg;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        padding: 20px;
        backdrop-filter: blur(5px);
    }

    .android-instructions-modal {
        background: colors.$color-background-secondary;
        border-radius: 8px;
        max-width: 800px;
        max-height: 90vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px colors.$color-shadow-lg;
    }

    .android-instructions-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid colors.$color-border;
    }

    .android-instructions-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        color: colors.$color-text-primary;
    }

    .close-button {
        background: none;
        border: none;
        color: colors.$color-text-secondary;
        font-size: 32px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
    }

    .close-button:hover {
        color: colors.$color-text-primary;
    }

    .android-instructions-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
    }

    .instruction-section {
        margin-bottom: 32px;
    }

    .instruction-section:last-child {
        margin-bottom: 0;
    }

    .instruction-section h3 {
        font-size: 20px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: colors.$color-text-primary;
    }

    .instruction-section p {
        font-size: 14px;
        line-height: 1.6;
        margin: 0 0 16px 0;
        color: colors.$color-text-secondary;
    }

    .method {
        background: colors.$color-background-tertiary;
        border-radius: 4px;
        padding: 16px;
        margin-bottom: 16px;
    }

    .method:last-child {
        margin-bottom: 0;
    }

    .method h4 {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: colors.$color-text-primary;
    }

    .method ol,
    .method ul {
        margin: 0;
        padding-left: 24px;
        color: colors.$color-text-secondary;
    }

    .method li {
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 8px;
    }

    .method li:last-child {
        margin-bottom: 0;
    }

    .method code {
        background: colors.$color-background-quaternary;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: "Courier New", monospace;
        font-size: 13px;
        color: colors.$color-success;
    }

    .method pre {
        background: colors.$color-background-tertiary;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        margin: 12px 0 0 0;
    }

    .method pre code {
        background: none;
        padding: 0;
        color: colors.$color-text-primary;
    }

    .android-instructions-footer {
        padding: 20px 24px;
        border-top: 1px solid colors.$color-border;
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
    }

    .dismiss-button {
        padding: 12px 24px;
        background: colors.$color-success;
        color: colors.$color-text-inverse;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        width: 100%;
    }

    .dismiss-button:hover {
        background: rgba(colors.$color-success, 0.9);
    }

    .dismiss-button:active {
        background: rgba(colors.$color-success, 0.8);
    }

    @media (max-width: 768px) {
        .android-instructions-modal {
            max-height: 95vh;
        }

        .android-instructions-header h2 {
            font-size: 20px;
        }

        .instruction-section h3 {
            font-size: 18px;
        }
    }
</style>
