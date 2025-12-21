/**
 * Утилиты для мониторинга состояния сети
 */

/**
 * Проверяет, есть ли подключение к интернету
 */
export function isOnline(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }
    return navigator.onLine;
}

/**
 * Подписывается на изменения состояния сети
 * @param callback - функция, вызываемая при изменении состояния
 * @returns функция для отписки
 */
export function onNetworkChange(
    callback: (isOnline: boolean) => void
): () => void {
    if (typeof window === "undefined") {
        return () => {};
    }

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
    };
}

