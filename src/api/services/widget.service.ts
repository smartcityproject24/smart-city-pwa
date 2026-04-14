import { apiRequest } from "../client";
import { API_CONFIG } from "../config";
import { ApiError } from "../types/errors";
import type {
    WidgetByUUIDResponse,
    WidgetViewResponse,
    ResolvedLibraryWidget,
} from "../types/widget.types";

const LOG = "[WidgetAPI]";

/** Полное тело в консоли + при огромном HTML — дубликат с обрезкой для копипаста */
function logResponseBody(url: string, label: string, body: unknown) {
    console.info(`${LOG} response ${label}`, { url, body });
    if (
        body &&
        typeof body === "object" &&
        "widgetPayload" in body &&
        typeof (body as { widgetPayload?: unknown }).widgetPayload === "string"
    ) {
        const raw = (body as { widgetPayload: string }).widgetPayload;
        const max = 24_000;
        if (raw.length > max) {
            console.info(`${LOG} response ${label} widgetPayload (truncated)`, {
                url,
                length: raw.length,
                head: raw.slice(0, max),
                tailNote: `…ещё ${raw.length - max} символов; полный объект в логе выше`,
            });
        }
    }
}

function logApiError(context: string, err: unknown) {
    if (err instanceof ApiError) {
        console.warn(`${LOG} ${context} (ApiError)`, {
            code: err.code,
            message: err.message,
            errorType: err.errorType,
            detailedMessages: err.detailedMessages,
            debugInfo: err.debugInfo,
        });
    } else {
        console.warn(`${LOG} ${context}`, err);
    }
}

function normalizeFileType(t: string): string {
    return (t || "").split(".").pop()?.toLowerCase() ?? "";
}

function fromFullResponse(data: WidgetByUUIDResponse): ResolvedLibraryWidget {
    const html = String(data.widgetPayload ?? "").trim();
    const durationSec =
        data.widgetRefreshPeriodSeconds > 0
            ? data.widgetRefreshPeriodSeconds
            : 10;
    const first = data.widgetContentList?.[0];
    return {
        html,
        durationSec,
        fileUUID: first?.widgetContentFileUUID ?? null,
        fileType: normalizeFileType(first?.widgetContentFileType ?? ""),
    };
}

function logResolved(source: string, widgetUUID: string, r: ResolvedLibraryWidget) {
    console.info(`${LOG} ${source} OK`, {
        widgetUUID,
        source,
        durationSec: r.durationSec,
        htmlChars: r.html.length,
        fileUUID: r.fileUUID,
        fileType: r.fileType || "(none)",
    });
}

/**
 * Данные для показа виджета из конструктора (как в редакторе решений).
 * Сначала пробуем /view, затем полный GET и нормализация.
 */
export const widgetService = {
    async resolveForPlayback(widgetUUID: string): Promise<ResolvedLibraryWidget> {
        const viewUrl = API_CONFIG.endpoints.widgets.getViewByUUID(widgetUUID);
        console.info(`${LOG} request`, { step: "GET /widgets/{uuid}/view", url: viewUrl, widgetUUID });
        try {
            const v = await apiRequest<WidgetViewResponse>(viewUrl);
            logResponseBody(viewUrl, "(view)", v);
            const resolved: ResolvedLibraryWidget = {
                html: String(v.widgetPayload ?? "").trim(),
                durationSec:
                    v.widgetRefreshPeriodSeconds > 0
                        ? v.widgetRefreshPeriodSeconds
                        : 10,
                fileUUID: v.widgetContentFileUUID || null,
                fileType: normalizeFileType(v.widgetContentFileType ?? ""),
            };
            logResolved("view", widgetUUID, resolved);
            return resolved;
        } catch (viewErr) {
            logApiError("GET /view failed → fallback", viewErr);
            console.warn(`${LOG} GET /view failed → fallback GET /widgets/{uuid}`, {
                widgetUUID,
                url: viewUrl,
                error:
                    viewErr instanceof Error ? viewErr.message : String(viewErr),
            });
            const fullUrl = API_CONFIG.endpoints.widgets.getByUUID(widgetUUID);
            console.info(`${LOG} request`, { step: "GET /widgets/{uuid}", url: fullUrl, widgetUUID });
            try {
                const data = await apiRequest<WidgetByUUIDResponse>(fullUrl);
                logResponseBody(fullUrl, "(full)", data);
                const resolved = fromFullResponse(data);
                logResolved("full", widgetUUID, resolved);
                return resolved;
            } catch (fullErr) {
                logApiError("GET full widget failed", fullErr);
                console.error(`${LOG} GET full widget failed`, {
                    widgetUUID,
                    url: fullUrl,
                    error:
                        fullErr instanceof Error ? fullErr.message : String(fullErr),
                });
                throw fullErr;
            }
        }
    },
};
