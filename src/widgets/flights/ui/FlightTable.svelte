<script lang="ts">
    import type { FlightData } from "../model/flightUtils";
    import { getStatusColor, getAirlineLogo, handleImageError } from "../model/flightUtils";

    interface Props {
        items: FlightData[];
        headers: {
            Logo: string;
            Flight: string;
            Airport: string;
            "Sheduled date": string;
            "Actual date": string;
            "Sheduled time": string;
            "Actual time": string;
            Status: string;
        };
        tableClass?: string;
        /** Widget title (e.g. "Arrivals" / "Departures") – when set, header is shown above the table */
        title?: string;
        /** Formatted current time string */
        currentTime?: string;
        /** Slide counter (e.g. "1/5") */
        slideCounter?: string;
    }

    let { items, headers, tableClass = "flight-table", title, currentTime, slideCounter }: Props = $props();

    const showHeader = title != null || currentTime != null || slideCounter != null;
</script>

<div class="flight-table-wrapper">
    {#if showHeader}
        <div class="header">
            {#if title != null}
                <h3 class="widget-title">{title}</h3>
            {/if}
            <div class="header-info">
                {#if currentTime != null}
                    <div class="current-time">{currentTime}</div>
                {/if}
                {#if currentTime != null && slideCounter != null}
                    <div class="separator"></div>
                {/if}
                {#if slideCounter != null}
                    <div class="slide-counter">{slideCounter}</div>
                {/if}
            </div>
        </div>
    {/if}
    <table class={tableClass}>
    <thead>
        <tr>
            <th style="width: 5%;">{headers.Logo.toUpperCase()}</th>
            <th style="width: 10%;">{headers.Flight.toUpperCase()}</th>
            <th style="width: 16%;">{headers.Airport.toUpperCase()}</th>
            <th style="width: 13%;">{headers["Sheduled date"].toUpperCase()}</th>
            <th style="width: 13%;">{headers["Actual date"].toUpperCase()}</th>
            <th style="width: 13%;">{headers["Sheduled time"].toUpperCase()}</th>
            <th style="width: 13%;">{headers["Actual time"].toUpperCase()}</th>
            <th style="width: 17%;">{headers.Status.toUpperCase()}</th>
        </tr>
    </thead>
    <tbody>
        {#each items as item}
            {@const logoUrl = getAirlineLogo(item.Flight)}
            <tr>
                <td style="text-align: center; padding: 4px; min-width: 60px;">
                    {#if logoUrl}
                        <img 
                            src={logoUrl} 
                            alt="Airline logo" 
                            style="max-width: 64px; max-height: 26px; object-fit: contain; display: block; margin: 0 auto;"
                            onerror={handleImageError}
                            loading="eager"
                        />
                    {:else}
                        <span>-</span>
                    {/if}
                </td>
                <td>
                    {item.Flight}
                </td>
                <td>
                    {item.Airport}
                </td>
                <td>
                    {item["Sheduled date"]}
                </td>
                <td>
                    {item["Actual date"] || "-"}
                </td>
                <td>
                    {item["Sheduled time"]}
                </td>
                <td>
                    {item["Actual time"] || "-"}
                </td>
                <td  style="color: {getStatusColor(item.Status || '')}">
                    {item.Status || "-"}
                </td>
            </tr>
        {/each}
    </tbody>
</table>
</div>

<style lang="scss">
    .flight-table-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-width: 0;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        padding: 1rem;
    }

    .header-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .separator {
        width: 1px;
        height: 2rem;
        background: #fff;
    }

    .widget-title {
        margin: 0;
        font-size: 42px;
        font-weight: 600;
    }

    .current-time {
        font-size: 42px;
        font-weight: 600;
        color: #fff;
        font-variant-numeric: tabular-nums;
    }

    .slide-counter {
        font-size: 42px;
        color: #fff;
        font-weight: 600;
    }

    :global(.flight-table),
    :global(.arrivals-table),
    :global(.departures-table) {
        width: 100%;
        border-collapse: collapse;
        font-size: 1rem;
        background: transparent;
        color: #fff;

        thead {
            background-color: transparent;
            top: 0;
            background: #98A4E0;
            color: #0f1941;
            margin-bottom: 7px;
        }

        th {
            text-align: left;
            font-weight: 600;
            font-size: 22px;
            word-break: break-word;
            padding: 16px 4px;
        }

        td {
            color: #fff;
            font-weight: 500;
            font-size: 24px;
            padding: 12px;
        }

        tbody tr:nth-child(even) {
            background-color: #0f1628;
        }
    }
</style>
