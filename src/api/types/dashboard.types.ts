import type { Block } from "@core/types";

/**
 * Ответ от API для получения solutions dashboard
 */
export interface SolutionResponse {
    dashboardUUID: string;
    dashboardName: string;
    dashboardType: string;
    settings?: Record<string, string>[];
    solution: Block;
}

