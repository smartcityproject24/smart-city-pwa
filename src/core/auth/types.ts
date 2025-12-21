import type { Writable, Readable } from "svelte/store";

export type TokenData = {
    accessToken?: string;
    refreshToken?: string;
    dashboardUUID?: string;
    userUUID?: string;
    expiresSeconds?: number;
};

export type AuthContext = {
    access: Writable<string>;
    refresh: Writable<string>;
    expiresAt: Writable<number>;
    isAuthenticated: Readable<boolean>;
    isTokenExpired: Readable<boolean>;
    setTokens: (accessToken: string, refreshToken: string, expiresSeconds?: number) => void;
    clearTokens: () => Promise<void>;
    getAccessToken: () => string;
};

