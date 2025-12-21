import type { Writable } from "svelte/store";
import type { Route } from "../types";

export type RouteStore = {
    currentRoute: Writable<Route | null>;
    navigate: (route: string) => void;
};

