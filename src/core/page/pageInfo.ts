import type { PageInfo } from "./types";

/**
 * Глубоко сравнивает два объекта PageInfo
 * @param oldInfo - Старые данные
 * @param newInfo - Новые данные
 * @returns true, если данные идентичны, false - если изменились
 */
export function isPageInfoEqual(oldInfo: PageInfo | null, newInfo: PageInfo): boolean {
    if (!oldInfo) {
        return false;
    }

    if (
        oldInfo.dashboardUUID !== newInfo.dashboardUUID ||
        oldInfo.dashboardName !== newInfo.dashboardName ||
        oldInfo.dashboardType !== newInfo.dashboardType
    ) {
        return false;
    }

    if (!areBlocksEqual(oldInfo.blocks, newInfo.blocks)) {
        return false;
    }

    return true;
}

/**
 * Глубоко сравнивает массивы Block
 */
function areBlocksEqual(oldBlocks: PageInfo["blocks"], newBlocks: PageInfo["blocks"]): boolean {
    if (oldBlocks === newBlocks) return true;
    if (!oldBlocks || !newBlocks) return oldBlocks === newBlocks;
    if (oldBlocks.length !== newBlocks.length) return false;

    try {
        return JSON.stringify(oldBlocks) === JSON.stringify(newBlocks);
    } catch {
        return false;
    }
}
