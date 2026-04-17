/** Ответ GET .../widgets/{uuid}/view */
export interface WidgetViewResponse {
    widgetUUID: string;
    widgetType: string;
    widgetPayload: string;
    widgetRefreshTime: string;
    widgetRefreshPeriodSeconds: number;
    widgetContentFileType: string;
    widgetContentFileUUID: string;
}

export type ResolvedLibraryWidget = {
    html: string;
    durationSec: number;
    fileUUID: string | null;
    fileType: string;
};
