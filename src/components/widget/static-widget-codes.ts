import type { Block } from "@core";

/** Виджеты с собственной Svelte-реализацией в PWA (рейсы и т.д.) */
export const STATIC_WIDGET_CODES = new Set([
    "FLIGHTS_DEPARTURE",
    "FLIGHTS_ARRIVAL",
]);

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStaticWidgetBlock(b: Block): boolean {
    return (
        String(b.type).toUpperCase() === "WIDGET" &&
        typeof b.code === "string" &&
        STATIC_WIDGET_CODES.has(b.code)
    );
}

/**
 * UUID инстанса виджета из конструктора для GET .../widgets/{uuid}/view
 * — при code === null / пусто API кладёт идентификатор в uuid или payload.widgetUUID
 * — code как UUID тоже допускаем (некоторые сборки)
 */
export function resolveWidgetUuidFromBlock(b: Block): string | null {
    if (String(b.type).toUpperCase() !== "WIDGET") return null;
    if (isStaticWidgetBlock(b)) return null;

    const fromPayload =
        typeof b.payload?.widgetUUID === "string"
            ? b.payload.widgetUUID.trim()
            : "";
    const fromUuid = typeof b.uuid === "string" ? b.uuid.trim() : "";
    const fromCode =
        typeof b.code === "string" && b.code.trim().length > 0
            ? b.code.trim()
            : "";

    for (const id of [fromPayload, fromUuid]) {
        if (id.length >= 8) return id;
    }
    if (fromCode.length >= 8 && UUID_RE.test(fromCode) && !STATIC_WIDGET_CODES.has(fromCode)) {
        return fromCode;
    }
    return null;
}

/** Обходит дерево blocks (вложенные screen → blocks и т.д.) */
export function getLibraryWidgetUuidFromBlocks(blocks: Block[]): string | null {
    const visit = (list: Block[] | undefined): string | null => {
        if (!list?.length) return null;
        for (const b of list) {
            const id = resolveWidgetUuidFromBlock(b);
            if (id) return id;
            const nested = visit(b.blocks);
            if (nested) return nested;
        }
        return null;
    };
    return visit(blocks);
}
