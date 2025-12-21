import { API_CONFIG } from "@api/config";
import { ApiError, type ApiErrorResponse } from "../types/errors";
import type {
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
} from "../types/auth.types";

/**
 * Сервис для работы с авторизацией
 * 
 * Примечание: refreshTokens использует прямой fetch вместо apiRequest,
 * так как вызывается до инициализации API клиента и не требует авторизации
 */
export const authService = {
    async loginWithPassword(
        dashboardCode: string,
        dashboardPassword: string
    ): Promise<LoginResponse> {
        const url = API_CONFIG.endpoints.auth.login;
        const request: LoginRequest = { dashboardCode, dashboardPassword };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            try {
                const contentType = response.headers.get("content-type");
                if (contentType?.includes("application/json")) {
                    const data = await response.json();
                    if (data.code !== undefined && data.error !== undefined) {
                        throw new ApiError(data as ApiErrorResponse);
                    }
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    throw error;
                }
            }
            
            throw new ApiError({
                code: response.status,
                message: null,
                error: "Unknown",
                detailedMessages: [],
            });
        }

        return response.json();
    },

    async refreshTokens(refreshToken: string): Promise<RefreshTokenResponse> {
        const url = API_CONFIG.endpoints.auth.refresh;
        const request: RefreshTokenRequest = { refreshToken };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            try {
                const contentType = response.headers.get("content-type");
                if (contentType?.includes("application/json")) {
                    const data = await response.json();
                    if (data.code !== undefined && data.error !== undefined) {
                        throw new ApiError(data as ApiErrorResponse);
                    }
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    throw error;
                }
            }
            
            throw new ApiError({
                code: response.status,
                message: null,
                error: "Unknown",
                detailedMessages: [],
            });
        }

        return response.json();
    },
};

