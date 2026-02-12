<script lang="ts">
    import { cubicOut } from "svelte/easing";
    import { fly, fade } from "svelte/transition";
    import { BoardTypesEnum } from "./model/constants";
    import { petrolStationWidget } from "./GasStationWidget";

    interface BoardSetting {
        settingType: string;
        settingName: string;
        settingValue: string;
    }

    interface Props {
        boardType: BoardTypesEnum;
        settings: BoardSetting[];
        scale?: { x: number; y: number };
    }

    let { boardType, settings, scale }: Props = $props();

    const data = $derived(petrolStationWidget({ boardType, settings }));
    let animationKey = $state(0);

    $effect(() => {
        if (data) {
            animationKey = 1;
        }
    });

    const isPartnerNeft = $derived(
        [BoardTypesEnum.PARTNER_NEFT_STATION_DOUBLE, BoardTypesEnum.PARTNER_NEFT_STATION].includes(boardType)
    );

    const isPartnerNeftDouble = $derived(
        boardType === BoardTypesEnum.PARTNER_NEFT_STATION_DOUBLE
    );

    const isPetrolStation = $derived(
        [BoardTypesEnum.PETROL_STATION_DOUBLE, BoardTypesEnum.PETROL_STATION].includes(boardType)
    );
</script>

{#if isPartnerNeft}
    <div
        style:position="absolute"
        
        style:top="25%"
        style:left={isPartnerNeftDouble ? "0%" : "50%"}
        style:width={isPartnerNeftDouble ? "100%" : "50%"}
        style:height="58%"
    >
        {#each data || [] as value, index (value.settingType)}
            {#if animationKey > 0}
            <div
                in:fly={{ y: 40, duration: 600, delay: 1000 + index * 200, easing: cubicOut }}
                style:position="absolute"
                style:top={value.style.top}
                style:height={value.style.height}
                style:width="60%"
                style:display="flex"
                style:justify-content="flex-end"
                style:align-items="center"
            >
                <div in:fade={{ duration: 400, delay: 1000 + index * 200 }} style="width: 100%; height: 100%; display: flex; justify-content: flex-end; align-items: center;">
                    <span
                        style:font-family="digital-7, monospace"
                        style:font-size="60px"
                        style:color="#fff"
                        style:transform={scale ? `scale(${scale.x},${scale.y})` : "none"}
                    >
                        {value.price || "00.00"}
                    </span>
                </div>
            </div>
            {/if}
        {/each}
    </div>

{:else if isPetrolStation}
    <div
        style:position="absolute"
        style:top="31.6%"
        style:left="50%"
        style:width="72%"
        style:height="45%"
    >
        {#each data || [] as value, index (value.settingType)}
            {#if animationKey > 0}
            <div
                in:fly={{ y: 40, duration: 600, delay: 1000 + index * 200, easing: cubicOut }}
                style:position="absolute"
                style:top={value.style.top}
                style:height={value.style.height}
                style:width="60%"
                style:display="flex"
                style:align-items="center"
                style:background="black"
            >
                <div in:fade={{ duration: 400, delay: 1000 + index * 200 }} style="width: 100%; height: 100%; display: flex; align-items: center; padding-left: 20px;">
                    <span
                        style:font-family="digital-7, monospace"
                        style:font-size="60px"
                        style:text-align="left"
                        style:color="#fff"
                        style:transform={scale ? `scale(${scale.x},${scale.y})` : "none"}
                    >
                        {value.price}
                    </span>
                </div>
            </div>
            {/if}
        {/each}
    </div>
{/if}
