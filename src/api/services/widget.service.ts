import { apiRequest } from "../client";
import { API_CONFIG } from "../config";
import type { WidgetViewResponse, ResolvedLibraryWidget } from "../types/widget.types";

function normalizeFileType(t: string): string {
    return (t || "").split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Данные для показа виджета из конструктора: только GET .../widgets/{uuid}/view.
 */
export const widgetService = {
    async resolveForPlayback(widgetUUID: string): Promise<ResolvedLibraryWidget> {
        const viewUrl = API_CONFIG.endpoints.widgets.getViewByUUID(widgetUUID);
        const v = await apiRequest<WidgetViewResponse>(viewUrl);
        const normalizedFileType = normalizeFileType(v.widgetContentFileType ?? "");
        return {
            html: String(v.widgetPayload ?? "").trim(),
            durationSec:
                v.widgetRefreshPeriodSeconds > 0
                    ? v.widgetRefreshPeriodSeconds
                    : 10,
            fileUUID: v.widgetContentFileUUID || null,
            fileType: normalizedFileType,
        };
    },
};
