import type { Component } from "svelte";

// Общие типы для core

export type Route = {
    code: string;
    auth: boolean;
    page: string;
    before?: string[];
};

export type Options = {
    defaultPage: string;
    defaultLanguage: string;
    languageStorageKey: string;
    supportedLanguages: string[];
    logging?: {
        dbName?: string;
        dbVersion?: number;
        storeName?: string;
        sentLogsCleanupAgeHours?: number;
        sentLogsCleanupIntervalHours?: number;
        logSendIntervalSeconds?: number;
    };
    kiosk?: {
        autoFullscreen?: boolean;
        forceFullscreenOnAndroid?: boolean;
        fullscreenReturnDelay?: number;
    };
    pwa?: {
        update?: import("./pwa/types").PWAUpdateConfig;
    };
};

export type ComponentsContext = {
    [key: string]: Component<any>;
};

export type PagesContext = {
    [key: string]: Component<any>;
};

export type ApiReadyContext = {
    isReady: import("svelte/store").Readable<boolean>;
};

// Реэкспорт типов из модулей
export type { AuthContext, TokenData } from "./auth/types";
export type { UserContext } from "./user/types";
export type { URLContext } from "./url/types";
export type { RouteStore } from "./routes/types";
export type { BlockType, Block, Schedule, PageInfo, PageContext } from "./page/types";
export type { TranslationKey, Translations, LanguageContext } from "./language/types";
export type { BrightnessContext } from "./brightness/types";
