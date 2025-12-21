import type { Writable, Readable } from "svelte/store";

export type BrightnessContext = {
    isCustomBrightness: Writable<boolean>;
    customBrightness: Writable<number>;
    opacity: Readable<number>;
    currentTime: Readable<number>;
    scheduleSettings: Writable<Record<string, string>[]>;
    setCustomBrightness: (value: number) => void;
    setIsCustomBrightness: (value: boolean) => void;
};

