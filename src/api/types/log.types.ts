/**
 * Типы для API логирования
 */

export enum DashboardLogEventType {
    LOGIN = "LOGIN",
    VIDEO_START = "VIDEO_START",
    VIDEO_ERROR = "ERROR",
    WIDGET_START = "WIDGET_START",
}

export interface CreateDashboardLogRequest {
    logEventType: DashboardLogEventType;
    contentUUID?: string | null;
    fileUUID?: string | null;
    logContentShowDate?: string | null;
    logEventTime?: string | null;
    logPayload: string;
    screenUUID?: string | null;
}

export interface CreateDashboardLogResponse {
    success: boolean;
    logId?: string;
}
