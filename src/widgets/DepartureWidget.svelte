<script lang="ts">
    import { onMount } from "svelte";

    const DURATION_SEC = 5;

    interface Props {
        onFinished?: () => void;
    }

    let { onFinished }: Props = $props();

    onMount(() => {
        const id = setTimeout(() => {
            onFinished?.();
        }, DURATION_SEC * 1000);
        return () => clearTimeout(id);
    });
</script>

<div class="departure-widget">
    <h3>Departures</h3>
    <p>Showing flights departing (mock · {DURATION_SEC}s)</p>
</div>

<style lang="scss">
    .departure-widget {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        min-height: 120px;
    }
    h3 {
        margin: 0 0 0.5rem;
    }
    p {
        margin: 0;
        opacity: 0.8;
    }
</style>
