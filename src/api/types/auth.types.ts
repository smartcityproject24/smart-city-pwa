/**
 * Типы для API авторизации
 */

export interface LoginRequest {
    dashboardCode: string;
    dashboardPassword: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    userUUID?: string;
    dashboardUUID?: string;
    expiresSeconds?: number;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
    userUUID?: string;
    dashboardUUID?: string;
    expiresSeconds?: number;
}

