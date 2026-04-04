<script lang="ts">
    import AuthMiddleware from "./AuthMiddleware.svelte";
    import ApiMiddleware from "./ApiMiddleware.svelte";
    import DashboardMiddleware from "./DashboardMiddleware.svelte";
    import OfflineMiddleware from "./OfflineMiddleware.svelte";
</script>

<ApiMiddleware>
    <AuthMiddleware>
        <OfflineMiddleware>
            <DashboardMiddleware>
                <slot />
            </DashboardMiddleware>
        </OfflineMiddleware>
    </AuthMiddleware>
</ApiMiddleware>