<script lang="ts">
    import { getContext } from "svelte";
    import type { LanguageContext, PageContext } from "@core";
    import { ArrowLeft } from "lucide-svelte";

    const { translate } = getContext<LanguageContext>("language");
    const { goToPage } = getContext<PageContext>("page");

    const handleGoHome = () => {
        goToPage("login");
    };
</script>

<div class="not-found">
    <div class="not-found-content">
        <div class="error-code">404</div>
        <h1 class="error-title">{$translate("page_not_found")}</h1>
        <p class="error-description">
            {$translate("page_not_found_description")}
        </p>
        <button class="back-button" onclick={handleGoHome}>
            <ArrowLeft size={20} />
            <span>{$translate("go_to_login")}</span>
        </button>
    </div>
</div>

<style lang="scss">
    @use "styles/colors" as colors;
    @use "styles/typography" as typo;
    
    .not-found {
        width: 100%;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: clamp(20px, 3vw, 40px);
        background-color: colors.$color-background-primary;
    }
    
    .not-found-content {
        text-align: center;
        max-width: 600px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: clamp(16px, 2vw, 32px);
    }
    
    .error-code {
        font-size: clamp(80px, 12vw, 150px);
        font-weight: 800;
        line-height: 1;
        color: colors.$color-primary;
        text-shadow: 0 0 clamp(20px, 3vw, 40px) rgba(243, 74, 35, 0.3);
        letter-spacing: clamp(-4px, -0.5vw, -8px);
        margin-bottom: clamp(8px, 1vw, 16px);
    }
    
    .error-title {
        @include typo.medium-text;
        font-size: clamp(24px, 3vw, 42px);
        font-weight: 700;
        color: colors.$color-text-primary;
        margin: 0;
        letter-spacing: clamp(0.5px, 0.1vw, 1px);
    }
    
    .error-description {
        @include typo.base-text;
        font-size: clamp(14px, 1.5vw, 20px);
        color: colors.$color-text-secondary;
        line-height: 1.6;
        margin: 0;
        max-width: 500px;
    }
    
    .back-button {
        @include typo.button-text;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(8px, 1vw, 12px);
        padding: clamp(12px, 1.2vw, 18px) clamp(24px, 2.5vw, 36px);
        background-color: colors.$color-primary;
        color: colors.$color-text-inverse;
        border: none;
        border-radius: clamp(8px, 0.8vw, 12px);
        cursor: pointer;
        transition: 
            background-color 200ms ease,
            transform 200ms ease,
            box-shadow 200ms ease;
        font-weight: 600;
        box-shadow: 0 clamp(4px, 0.5vw, 8px) colors.$color-shadow-md;
        margin-top: clamp(8px, 1vw, 16px);
        
        &:hover {
            background-color: colors.$color-primary-hover;
            transform: translateY(-2px);
            box-shadow: 0 clamp(6px, 0.8vw, 12px) colors.$color-shadow-lg;
        }
        
        &:active {
            background-color: colors.$color-primary-active;
            transform: translateY(0);
        }
        
        :global(svg) {
            flex-shrink: 0;
        }
    }
    
    @media (max-width: 600px) {
        .not-found-content {
            gap: clamp(12px, 2vw, 24px);
        }
        
        .error-code {
            font-size: clamp(60px, 15vw, 120px);
        }
    }
</style>
