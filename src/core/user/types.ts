import type { Writable } from "svelte/store";

export type UserContext = {
    userUUID: Writable<string>;
    dashboardUUID: Writable<string>;
    setUserData: (userUUID: string, dashboardUUID: string) => void;
    clearUserData: () => void;
};

