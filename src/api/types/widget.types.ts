/** Ответ GET /smart-city/api/v1/widgets/{uuid} */
export interface WidgetByUUIDResponse {
    widgetUUID: string;
    widgetType: string;
    widgetName: string;
    widgetPayload: string;
    widgetRefreshTime: string;
    widgetRefreshPeriodSeconds: number;
    widgetContentList: {
        widgetContentCode?: string;
        widgetContentFileType: string;
        widgetContentFileUUID: string;
    }[];
    widgetSettingList: { widgetSettingType: string }[];
    created: string;
    updated: string;
}

/** Ответ GET .../widgets/{uuid}/view (как в админском превью) */
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
