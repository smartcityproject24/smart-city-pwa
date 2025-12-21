<script>
    import { getContext } from 'svelte';

    import { BlockRenderer } from '@components/block-renderer';
    
    const { goToPreviousPage, previousPage } = getContext('page');
    const { getTranslation, changeLanguage } = getContext("language");
    
    export let blocks;
</script>

<div class="not-found">
    <BlockRenderer {blocks} />
</div>

<style lang="scss">
    .not-found {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>