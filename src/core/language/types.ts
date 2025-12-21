import type { Readable } from "svelte/store";

export type TranslationKey = string | {
    key: string;
    params?: Record<string, string | number>;
};

export type Translations = {
    [key: string]: {
        [language: string]: string;
    };
};

export type LanguageContext = {
    language: Readable<string>;
    changeLanguage: (lang: string) => void;
    translate: Readable<(keyOrObj: TranslationKey, params?: Record<string, string | number>) => string>;
    supportedLanguages: string[];
};

