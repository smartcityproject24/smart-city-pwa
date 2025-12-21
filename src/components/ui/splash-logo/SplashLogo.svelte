<div class="empty-solution-container">
    <div class="badge-content">
        <div class="badge-text">SMART CITY</div>
    </div>
</div>

<style lang="scss">
    @use "styles/colors" as colors;

    $primary-glow-30: rgba(243, 74, 35, 0.3);
    $primary-glow-50: rgba(243, 74, 35, 0.5);

    .empty-solution-container {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: clamp(24px, 3vw, 48px);
    }

    .badge-content {
        position: relative;
        z-index: 1;
    }

    .badge-text {
        font-size: clamp(32px, 4vw, 64px);
        font-weight: 800;
        letter-spacing: clamp(4px, 0.5vw, 8px);
        background: linear-gradient(
            135deg,
            colors.$color-text-primary 0%,
            colors.$color-primary 50%,
            colors.$color-text-primary 100%
        );
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s ease-in-out infinite;
        text-shadow: 0 0 clamp(20px, 2.5vw, 40px) $primary-glow-50;
        text-align: center;
    }

    @keyframes shimmer {
        0%,
        100% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
    }
</style>
