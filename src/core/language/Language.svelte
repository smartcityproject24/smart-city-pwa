<script lang="ts">
    import { getContext, setContext } from "svelte";
    import { writable, derived, readable, type Readable } from "svelte/store";
    import type { Options } from "../types";
    import type { Translations, LanguageContext } from "./types";

    const translations = getContext<Translations>("translations") || {};
    const options = getContext<Options>("options") || {};

    const STORAGE_KEY = options.languageStorageKey || "language";
    const supportedLanguages = options?.supportedLanguages || ["ru"];
    const defaultLanguage = options?.defaultLanguage || "ru";

    let initialLanguage = defaultLanguage;

    if (typeof window !== "undefined") {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && supportedLanguages.includes(saved))
                initialLanguage = saved;
        } catch (e) {}
    }

    const languageInternal = writable<string>(initialLanguage);
    
    const language: Readable<string> = readable(initialLanguage, (set) => {
        const unsubscribe = languageInternal.subscribe(set);
        return unsubscribe;
    });

    if (typeof window !== "undefined") {
        document.documentElement.lang = initialLanguage;

        languageInternal.subscribe((lang) => {
            if (lang && supportedLanguages.includes(lang)) {
                document.documentElement.lang = lang;
            }
        });
    }

    const changeLanguage = (lang: string) => {
        if (!lang) return;

        if (!supportedLanguages.includes(lang)) {
            console.warn("Unsupported language: ", lang);
            return;
        }

        languageInternal.set(lang);

        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY, lang);
            } catch (e) {}
        }
    };

    const translate = derived(language, ($language) => {
        return (
            keyOrObj:
                | string
                | { key: string; params?: Record<string, string | number> },
            params: Record<string, string | number> = {},
        ) => {
            let key = keyOrObj as string;
            let p = params;
            if (keyOrObj && typeof keyOrObj === "object") {
                key = keyOrObj.key;
                p = keyOrObj.params || {};
            }

            const str = translations?.[key]?.[$language] ?? key;
            return String(str).replace(/\{(\w+)\}/g, (_, name) =>
                p && p[name] !== undefined ? String(p[name]) : `{${name}}`,
            );
        };
    });

    setContext<LanguageContext>("language", {
        language,
        changeLanguage,
        translate,
        supportedLanguages,
    });
</script>

<slot />

