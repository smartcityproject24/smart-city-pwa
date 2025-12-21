<script lang="ts">
    import { getContext } from "svelte";
    import type { LanguageContext } from "@core";
    import { getInstallKioskScript } from "@/utils/install-kiosk-script";
    import { slide } from "@/utils/transitions";

    const { translate } = getContext<LanguageContext>("language");

    interface Props {
        showWindowsInstructions: boolean;
        showInstructions: boolean;
        onClose?: () => void;
    }

    let {
        showWindowsInstructions,
        showInstructions,
        onClose,
    }: Props = $props();
   

    function handleDismiss() {
        showInstructions = false;
        showWindowsInstructions = false;
        onClose?.();
    }

    function downloadScript() {
        const appUrl = window.location.origin;
        const scriptContent = getInstallKioskScript(appUrl);

        const blob = new Blob([scriptContent], {
            type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "install-kiosk.bat";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
</script>

{#if showInstructions && showWindowsInstructions}
    <div
        class="windows-instructions-overlay"
        transition:slide={{ duration: 300 }}
    >
        <div class="windows-instructions-modal">
            <div class="windows-instructions-header">
                <h2>{$translate("windows_kiosk_title")}</h2>
                <button class="close-button" onclick={handleDismiss}>×</button>
            </div>

            <div class="windows-instructions-content">
                <div class="instruction-section">
                    <h3>{$translate("windows_kiosk_auto_setup_title")}</h3>
                    <ol>
                        <li>
                            <strong>{$translate("windows_kiosk_step1")}</strong>
                        </li>
                        <li>
                            <strong>{$translate("windows_kiosk_step2")}</strong>
                            <ul>
                                <li>
                                    {$translate("windows_kiosk_step2_detail")}
                                </li>
                            </ul>
                        </li>
                        <li>
                            <strong>{$translate("windows_kiosk_step3")}</strong>
                            <ul>
                                <li>
                                    {$translate("windows_kiosk_step3_item1")}
                                </li>
                                <li>
                                    {$translate("windows_kiosk_step3_item2")}
                                </li>
                                <li>
                                    {$translate("windows_kiosk_step3_item3")}
                                </li>
                            </ul>
                        </li>
                        <li>
                            <strong>{$translate("windows_kiosk_step4")}</strong>
                        </li>
                        <li>
                            <strong>{$translate("windows_kiosk_step5")}</strong>
                        </li>
                    </ol>
                </div>

                <div class="instruction-section">
                    <h3>{$translate("windows_kiosk_what_is_title")}</h3>
                    <p>
                        {$translate("windows_kiosk_what_is_description")}
                    </p>
                </div>

                <div class="instruction-section">
                    <h3>{$translate("windows_kiosk_exit_title")}</h3>
                    <ul>
                        <li>
                            <strong
                                >{$translate(
                                    "windows_kiosk_exit_alt_f4",
                                )}</strong
                            >
                        </li>
                        <li>
                            <strong
                                >{$translate(
                                    "windows_kiosk_exit_ctrl_alt_del",
                                )}</strong
                            >
                        </li>
                    </ul>
                </div>

                <div class="instruction-section">
                    <h3>{$translate("windows_kiosk_important_title")}</h3>
                    <ul>
                        <li>{$translate("windows_kiosk_important_script")}</li>
                        <li>{$translate("windows_kiosk_important_url")}</li>
                        <li>
                            {$translate("windows_kiosk_important_custom_url")}
                        </li>
                    </ul>
                </div>
            </div>

            <div class="windows-instructions-footer">
                <button class="download-button" onclick={downloadScript}>
                    {$translate("kiosk_download_button")}
                </button>
                <button class="dismiss-button" onclick={handleDismiss}>
                    {$translate("windows_kiosk_dismiss")}
                </button>
            </div>
        </div>
    </div>
{/if}

<style lang="scss">
    @use "styles/colors" as colors;

    .windows-instructions-overlay {
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

    .windows-instructions-modal {
        background: colors.$color-background-secondary;
        border-radius: 8px;
        max-width: 700px;
        max-height: 90vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px colors.$color-shadow-lg;
    }

    .windows-instructions-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid colors.$color-border;
    }

    .windows-instructions-header h2 {
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

    .windows-instructions-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
    }

    .instruction-section {
        margin-bottom: 24px;
    }

    .instruction-section:last-child {
        margin-bottom: 0;
    }

    .instruction-section h3 {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: colors.$color-text-primary;
    }

    .instruction-section p {
        font-size: 14px;
        line-height: 1.6;
        margin: 0 0 12px 0;
        color: colors.$color-text-secondary;
    }

    .instruction-section ol,
    .instruction-section ul {
        margin: 0;
        padding-left: 24px;
        color: colors.$color-text-secondary;
    }

    .instruction-section li {
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 8px;
    }

    .instruction-section li:last-child {
        margin-bottom: 0;
    }

    .windows-instructions-footer {
        padding: 20px 24px;
        border-top: 1px solid colors.$color-border;
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
    }

    .download-button,
    .dismiss-button {
        padding: 12px 24px;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
    }

    .download-button {
        background: colors.$color-info;
        color: colors.$color-text-inverse;
    }

    .download-button:hover {
        background: rgba(colors.$color-info, 0.9);
    }

    .download-button:active {
        background: rgba(colors.$color-info, 0.8);
    }

    .dismiss-button {
        background: colors.$color-success;
        color: colors.$color-text-inverse;
    }

    .dismiss-button:hover {
        background: rgba(colors.$color-success, 0.9);
    }

    .dismiss-button:active {
        background: rgba(colors.$color-success, 0.8);
    }

    @media (max-width: 768px) {
        .windows-instructions-modal {
            max-height: 95vh;
        }

        .windows-instructions-header h2 {
            font-size: 20px;
        }

        .instruction-section h3 {
            font-size: 16px;
        }

        .windows-instructions-footer {
            flex-direction: column;
        }

        .download-button,
        .dismiss-button {
            width: 100%;
        }
    }
</style>
