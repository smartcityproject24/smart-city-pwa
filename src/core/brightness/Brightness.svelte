<script lang="ts">
    import { getContext, setContext } from "svelte";
    import { writable, derived } from "svelte/store";
    import type { BrightnessContext } from "./types";
    import type { PageContext } from "../page/types";
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const { getActiveSchedule, parseSchedule } =
        getContext<PageContext>("page");

    const IS_CUSTOM_BRIGHTNESS_KEY = "is_custom_brightness";
    const CUSTOM_BRIGHTNESS_KEY = "custom_brightness";

    const isCustomBrightness = writable<boolean>(
        typeof window !== "undefined"
            ? localStorage.getItem(IS_CUSTOM_BRIGHTNESS_KEY) === "true"
            : false,
    );

    const customBrightness = writable<number>(
        typeof window !== "undefined"
            ? Number(localStorage.getItem(CUSTOM_BRIGHTNESS_KEY)) || 100
            : 100,
    );

    const currentTimeStore = writable(Date.now());

    const scheduleSettings = writable<Record<string, string>[]>([]);

    const nextScheduleChange = derived(
        [scheduleSettings, currentTimeStore],
        ([$scheduleSettings, $currentTime]) => {
            if (!$scheduleSettings || $scheduleSettings.length === 0)
                return null;

            const now = $currentTime;
            const timestamps: number[] = [];

            for (const setting of $scheduleSettings) {
                if (setting.settingType === "SCHEDULE_DARK") {
                    const schedule = parseSchedule(setting.settingValue);
                    if (schedule) {
                        const startTimestamp = Date.parse(
                            schedule.startDateTime,
                        );
                        const endTimestamp = Date.parse(schedule.endDateTime);

                        if (startTimestamp > now)
                            timestamps.push(startTimestamp);
                        if (endTimestamp > now) timestamps.push(endTimestamp);
                    }
                }
            }

            return timestamps.length > 0 ? Math.min(...timestamps) : null;
        },
    );

    $effect(() => {
        const nextChange = $nextScheduleChange;
        const currentTime = $currentTimeStore;

        const _ = $scheduleSettings;

        const now = Date.now();
        if (now !== currentTime) {
            currentTimeStore.set(now);
        }

        if (nextChange === null) return;

        const delay = nextChange - now;
        if (delay <= 0) {
            currentTimeStore.set(Date.now());
            return;
        }

        const timeout = setTimeout(() => {
            currentTimeStore.set(Date.now());
        }, delay);

        return () => {
            clearTimeout(timeout);
        };
    });

    const opacity = derived(
        [
            isCustomBrightness,
            customBrightness,
            scheduleSettings,
            currentTimeStore,
        ],
        ([
            $isCustomBrightness,
            $customBrightness,
            $scheduleSettings,
            $currentTime,
        ]) => {
            void $currentTime;

            if ($isCustomBrightness) {
                return $customBrightness / 100;
            }
            const schedule = getActiveSchedule($scheduleSettings);
            return schedule ? schedule.opacity / 100 : 1;
        },
    );

    if (typeof window !== "undefined") {
        isCustomBrightness.subscribe((value) => {
            localStorage.setItem(IS_CUSTOM_BRIGHTNESS_KEY, String(value));
        });

        customBrightness.subscribe((value) => {
            localStorage.setItem(CUSTOM_BRIGHTNESS_KEY, String(value));
        });
    }

    const setCustomBrightness = (value: number) => {
        customBrightness.set(value);
    };

    const setIsCustomBrightness = (value: boolean) => {
        isCustomBrightness.set(value);
    };

    setContext<BrightnessContext>("brightness", {
        isCustomBrightness,
        customBrightness,
        opacity,
        currentTime: currentTimeStore,
        scheduleSettings,
        setCustomBrightness,
        setIsCustomBrightness,
    });
</script>

{@render children?.()}
