/**
 * Типы для API логирования
 */

export enum DashboardLogEventType {
    LOGIN = 'LOGIN',
    VIDEO_START = 'VIDEO_START',
    VIDEO_ERROR = 'VIDEO_ERROR',
}

export interface CreateDashboardLogRequest {
    logEventType: DashboardLogEventType;
    contentUUID?: string | null;
    fileUUID?: string | null;
    logContentShowDate?: string | null;
    logPayload: string;
}

export interface CreateDashboardLogResponse {
    success: boolean;
    logId?: string;
}

