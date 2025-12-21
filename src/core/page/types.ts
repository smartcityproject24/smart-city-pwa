import type { Writable } from "svelte/store";

export type BlockType = 
    | "SOLUTION" 
    | "SCREEN" 
    | "WIDGET" 
    | "header" 
    | "body" 
    | "login_form" 
    | "select_language" 
    | "interface"
    | "not_found"
    | "control_panel"
    | "empty_solution";

export interface Block {
    uuid?: string;
    name?: string;
    type: BlockType;
    code?: string;
    width?: number;
    height?: number;
    positionX?: number;
    positionY?: number;
    playlistUUID?: string;
    payload?: Record<string, any>;
    blocks?: Block[];
}

export interface Schedule {
    startDateTime: string;
    endDateTime: string;
    opacity: number;
}

export interface PageInfo {
    dashboardUUID?: string;
    dashboardName?: string;
    dashboardType?: string;
    solutionName?: string;
    solutionWidth?: number;
    solutionHeight?: number;
    blocks: Block[];
}

export type PageContext = {
    pageInfo: Writable<PageInfo | null>;
    currentPage: Writable<string | null>;
    previousPage: Writable<string | null>;
    goToPage: (page: string) => void;
    goToPreviousPage: () => void;
    isPageInfoEqual: (oldInfo: PageInfo | null, newInfo: PageInfo) => boolean;
    parseSchedule: (scheduleValue: string | null | undefined) => Schedule | null;
    sortScheduleSettings: (settings?: Record<string, string>[]) => Record<string, string>[] | undefined;
    isScheduleActive: (schedule: Schedule) => boolean;
    getActiveSchedule: (settings?: Record<string, string>[]) => Schedule | null;
};

