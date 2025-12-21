<script lang="ts">
    import AuthMiddleware from "./AuthMiddleware.svelte";
    import ApiMiddleware from "./ApiMiddleware.svelte";
    import DashboardMiddleware from "./DashboardMiddleware.svelte";
</script>

<ApiMiddleware>
    <AuthMiddleware>
        <DashboardMiddleware>
            <slot />
        </DashboardMiddleware>
    </AuthMiddleware>
</ApiMiddleware>