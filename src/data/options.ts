import type { Options } from "@core/types";

const options: Options = {
    defaultPage: "dashboard",
    defaultLanguage: "ru",
    languageStorageKey: "LANGUAGE_KEY",
    supportedLanguages: ["en", "ru", "kg"],
    logging: {
        dbName: "smart-city-logs",
        dbVersion: 2,
        storeName: "logs",
        sentLogsCleanupAgeHours: 1 / 60,
        sentLogsCleanupIntervalHours: 1 / 60,
        logSendIntervalSeconds: 60,
    },
    kiosk: {
        autoFullscreen: true,
        forceFullscreenOnAndroid: true,
        fullscreenReturnDelay: 1500,
    },
    pwa: {
        update: {
            checkInterval: 2 * 60 * 1000, // 5 минут
            autoReload: true,
        },
    },
};

export default options;
