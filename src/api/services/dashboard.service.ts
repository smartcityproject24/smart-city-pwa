import { apiRequest } from "../client";
import { API_CONFIG } from "../config";
import type { SettingsResponse, SolutionResponse } from "../types/dashboard.types";

/**
 * Сервис для работы с dashboard API
 */
export const dashboardService = {
    /**
     * Получает solutions для указанного dashboard
     */
    async getSolutions(dashboardUUID: string): Promise<SolutionResponse> {
        const url = API_CONFIG.endpoints.dashboards.getSolution(dashboardUUID);
        return apiRequest<SolutionResponse>(url);
    },

    async getSettings(dashboardUUID: string): Promise<SettingsResponse> {
        const url = API_CONFIG.endpoints.dashboards.getSettings(dashboardUUID);
        return apiRequest<SettingsResponse>(url);
    },
};
