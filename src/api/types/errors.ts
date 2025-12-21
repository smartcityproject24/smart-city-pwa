/**
 * Типы ошибок API (соответствуют бэкенду)
 */
export enum ApiErrorType {
    AUTH_REQUIRED = "AuthRequired",
    AUTH_FAILED = "AuthenticationFailed",
    PERMISSION_DENIED = "PermissionDenied",
    VALIDATION = "Validation",
    INTERNAL = "Internal",
    BAD_REQUEST = "BadRequest",
    NOT_FOUND = "NotFound",
}

/**
 * Детализированное сообщение об ошибке
 */
export interface DetailedMessage {
    type: string;
    message: string;
    fieldName?: string;
    developerMessage?: string;
}

/**
 * Структура ответа об ошибке от API
 */
export interface ApiErrorResponse {
    code: number;
    message: string | null;
    error: ApiErrorType | string;
    detailedMessages: DetailedMessage[];
    debugInfo?: unknown;
}

/**
 * Класс ошибки API
 */
export class ApiError extends Error {
    readonly code: number;
    readonly errorType: ApiErrorType | string;
    readonly detailedMessages: DetailedMessage[];
    readonly debugInfo?: unknown;

    constructor(response: ApiErrorResponse) {
        super(response.message || response.error || "API Error");
        this.name = "ApiError";
        this.code = response.code;
        this.errorType = response.error;
        this.detailedMessages = response.detailedMessages || [];
        this.debugInfo = response.debugInfo;
    }

    isAuthRequired(): boolean {
        return this.errorType === ApiErrorType.AUTH_REQUIRED;
    }

    isAuthFailed(): boolean {
        return this.errorType === ApiErrorType.AUTH_FAILED;
    }

    isPermissionDenied(): boolean {
        return this.errorType === ApiErrorType.PERMISSION_DENIED;
    }

    isValidation(): boolean {
        return this.errorType === ApiErrorType.VALIDATION;
    }

    isInternal(): boolean {
        return this.errorType === ApiErrorType.INTERNAL;
    }

    isBadRequest(): boolean {
        return this.errorType === ApiErrorType.BAD_REQUEST;
    }

    isNotFound(): boolean {
        return this.errorType === ApiErrorType.NOT_FOUND;
    }

    /**
     * Получить сообщения для конкретного поля
     */
    getFieldMessages(fieldName: string): string[] {
        return this.detailedMessages
            .filter((msg) => msg.fieldName === fieldName)
            .map((msg) => msg.message);
    }
}

