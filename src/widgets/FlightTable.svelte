<script lang="ts">
    import type { FlightData } from "./flightUtils";
    import { getStatusColor, getAirlineLogo, handleImageError } from "./flightUtils";

    interface Props {
        items: FlightData[];
        headers: {
            Logo: string;
            Flight: string;
            Airport: string;
            "Sheduled date": string;
            "Sheduled time": string;
            Status: string;
            "Actual time": string;
        };
        tableClass?: string;
    }

    let { items, headers, tableClass = "flight-table" }: Props = $props();
</script>

<table class={tableClass}>
    <thead>
        <tr>
            <th style="width: 10%;">{headers.Logo}</th>
            <th style="width: 12%;">{headers.Flight}</th>
            <th style="width: 22%;">{headers.Airport}</th>
            <th style="width: 13%;">{headers["Sheduled date"]}</th>
            <th style="width: 13%;">{headers["Sheduled time"]}</th>
            <th style="width: 13%;">{headers.Status}</th>
            <th style="width: 17%;">{headers["Actual time"]}</th>
        </tr>
    </thead>
    <tbody>
        {#each items as item}
            {@const logoUrl = getAirlineLogo(item.Flight)}
            <tr>
                <td style="text-align: center; padding: 4px;">
                    {#if logoUrl}
                        <img 
                            src={logoUrl} 
                            alt="Airline logo" 
                            style="max-width: 60px; max-height: 40px; object-fit: contain;"
                            onerror={handleImageError}
                        />
                    {:else}
                        <span style="color: {getStatusColor(item.Status || '')}">-</span>
                    {/if}
                </td>
                <td style="color: {getStatusColor(item.Status || '')}">
                    {item.Flight}
                </td>
                <td style="color: {getStatusColor(item.Status || '')}">
                    {item.Airport}
                </td>
                <td style="color: {getStatusColor(item.Status || '')}">
                    {item["Sheduled date"]}
                </td>
                <td style="color: {getStatusColor(item.Status || '')}">
                    {item["Sheduled time"]}
                </td>
                <td style="color: {getStatusColor(item.Status || '')}">
                    {item.Status || "-"}
                </td>
                <td style="color: {getStatusColor(item.Status || '')}">
                    {item["Actual time"] || "-"}
                </td>
            </tr>
        {/each}
    </tbody>
</table>

<style lang="scss">
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
            background: #fff;
            color: #0f1941;
        }

        th {
            text-align: left;
            font-weight: 600;
            font-size: 20px;
            word-break: break-word;
            padding: 8px 4px;
        }

        td {
            color: #fff;
            font-weight: 500;
            padding-bottom: 1rem;
        }

        tbody tr:nth-child(even) {
            background-color: #0f1628;
        }
    }
</style>
