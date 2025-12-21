import { authService } from "@api/services/auth.service";
import { ApiError, type ApiErrorResponse } from "./types/errors";

interface ApiClientConfig {
    getAccessToken: () => string;
    getRefreshToken: () => string;
    setTokens: (access: string, refresh: string, expires?: number) => void;
    clearTokens: () => Promise<void>;
    clearUserData: () => void;
}

let config: ApiClientConfig | null = null;
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

export function initApiClient(clientConfig: ApiClientConfig) {
    config = clientConfig;
}

export function isApiClientReady(): boolean {
    return config !== null;
}

async function handleTokenRefresh(): Promise<void> {
    if (!config) throw new Error("API client not initialized");

    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const refreshToken = config!.getRefreshToken();
            if (!refreshToken) {
                throw new Error("No refresh token");
            }

            const data = await authService.refreshTokens(refreshToken);
            config!.setTokens(data.accessToken, data.refreshToken, data.expiresSeconds);
        } catch (error) {
            await config!.clearTokens();
            config!.clearUserData();
            throw error;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export async function apiRequest<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    if (!config) {
        throw new Error("API client not initialized. Call initApiClient() first");
    }

    const token = config.getAccessToken();

    const requestOptions: RequestInit = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };

    let response = await fetch(url, {
        ...requestOptions,
        redirect: "follow",
    });

    if (response.status === 401 && !isRefreshing) {
        try {
            await handleTokenRefresh();

            const newToken = config.getAccessToken();
            const retryOptions: RequestInit = {
                ...requestOptions,
                headers: {
                    ...requestOptions.headers,
                    Authorization: `Bearer ${newToken}`,
                },
            };

            response = await fetch(url, retryOptions);
        } catch (error) {
            throw new Error("Authentication failed");
        }
    }

    if (!response.ok) {
        throw await parseErrorResponse(response);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
        return response.json();
    }

    return (await response.text()) as T;
}

export async function apiRequestRaw(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    if (!config) {
        throw new Error("API client not initialized");
    }

    const token = config.getAccessToken();

    const requestOptions: RequestInit = {
        ...options,
        headers: {
            ...options.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };

    let response = await fetch(url, {
        ...requestOptions,
        redirect: "follow",
    });

    if (response.status === 401 && !isRefreshing) {
        try {
            await handleTokenRefresh();

            const newToken = config.getAccessToken();
            const retryOptions: RequestInit = {
                ...requestOptions,
                headers: {
                    ...requestOptions.headers,
                    Authorization: `Bearer ${newToken}`,
                },
            };

            response = await fetch(url, retryOptions);
        } catch (error) {
            throw new Error("Authentication failed");
        }
    }

    return response;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
    try {
        const contentType = response.headers.get("content-type");

        if (contentType?.includes("application/json")) {
            const data = await response.json();

            if (data.code !== undefined && data.error !== undefined) {
                return new ApiError(data as ApiErrorResponse);
            }
        }

        const text = await response.text();
        return new ApiError({
            code: response.status,
            message: text || response.statusText || null,
            error: "Unknown",
            detailedMessages: [],
        });
    } catch {
        return new ApiError({
            code: response.status,
            message: response.statusText || null,
            error: "Unknown",
            detailedMessages: [],
        });
    }
}
