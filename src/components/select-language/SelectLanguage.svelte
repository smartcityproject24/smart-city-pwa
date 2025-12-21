<script lang="ts">
    import { getContext } from "svelte";
    import type { LanguageContext } from "@core";

    const { changeLanguage, language, translate, supportedLanguages } =
        getContext<LanguageContext>("language");

    const onLanguageChange = (e: Event) => {
        const target = e.target as HTMLSelectElement;
        if (target) {
            changeLanguage(target.value);
        }
    };
</script>

<div class="select-language">
    <label for="lang-select">{$translate("language")}</label>
    <select id="lang-select" value={$language} onchange={onLanguageChange}>
        {#each supportedLanguages as supportedLanguage}
            <option value={supportedLanguage}
                >{$translate(supportedLanguage)}</option
            >
        {/each}
    </select>
</div>

<style lang="scss">
    @use "styles/typography" as typo;
    @use "styles/colors" as colors;
    @use "styles/mixins" as mixins;

    .select-language {
        width: clamp(100px, 12vw, 200px);
        min-width: 100px;
    }

    .select-language label {
        display: none;
    }

    .select-language select {
        @include typo.select-text;
        width: 100%;
        padding: clamp(8px, 0.8vw, 14px) clamp(14px, 1.5vw, 24px);
        border: solid colors.$color-border;
        border-width: clamp(2px, 0.2vw, 3px);
        border-radius: clamp(6px, 0.6vw, 10px);
        background-color: colors.$color-background-tertiary;
        color: colors.$color-text-primary;
        cursor: pointer;
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
    }

    /* Для больших экранов (≥2000px) */
    @media (min-width: 2000px) {
        .select-language {
            width: clamp(150px, 15vw, 250px);
        }

        .select-language select {
            @include typo.large-screen-input;
            padding: clamp(12px, 1vw, 18px) clamp(18px, 1.8vw, 28px);
        }
    }
</style>
