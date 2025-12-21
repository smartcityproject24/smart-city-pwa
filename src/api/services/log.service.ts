import { apiRequest } from "../client";
import { API_CONFIG } from "../config";
import type {
    CreateDashboardLogRequest,
    CreateDashboardLogResponse,
} from "../types/log.types";

/**
 * Сервис для работы с логами dashboard API
 */
export const logService = {
    /**
     * Отправляет лог на бэкенд
     */
    async createLog(
        dashboardUUID: string,
        logData: CreateDashboardLogRequest
    ): Promise<CreateDashboardLogResponse> {        
        // Заглушка - возвращаем успешный ответ без отправки
        // return Promise.resolve({
        //     success: true,
        // });
        
        const url = API_CONFIG.endpoints.dashboards.createLog(dashboardUUID);
        return apiRequest<CreateDashboardLogResponse>(url, {
            method: "POST",
            body: JSON.stringify(logData),
        });
    },
};

