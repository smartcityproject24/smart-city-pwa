import { apiRequest } from "../client";
import { API_CONFIG } from "../config";
import type { SolutionResponse } from "../types/dashboard.types";

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
};

