import type { Schedule } from "./types";

/**
 * Подготавливает строку времени для корректного парсинга с учетом временной зоны
 * Если временная зона не указана (нет offset типа +06:00), используется время Бишкека (UTC+6) по умолчанию
 * Если строка содержит 'Z' (UTC), заменяет на '+06:00' (Бишкек), так как сервер отправляет время Бишкека с меткой Z
 * Если offset уже указан, возвращает строку без изменений
 * @param timeString - Время в формате ISO (например: "2025-12-10T00:00:00.000Z" или "2025-12-10T00:00:00.000+06:00" или "2025-12-10T00:00:00.000")
 * @returns Строка времени с правильным offset для дальнейшего парсинга через Date.parse()
 */
function convertToServerDateTime(timeString: string): string {
    const hasTimezone = /[+-]\d{2}:?\d{0,2}$/.test(timeString);

    return hasTimezone ? timeString : timeString.replace(/[Zz]$/, "+06:00");
}

/**
 * Парсит JSON строку scheduleValue в объект Schedule
 * Применяет convertServerTimeToLocal к датам для добавления правильного offset (Бишкек +06:00 по умолчанию)
 * Результирующие строки дат содержат offset и могут быть корректно распарсены через Date.parse()
 * для получения UTC timestamp, который автоматически учитывает локальную временную зону машины
 * @param scheduleValue - JSON строка с расписанием (например: '{"startDateTime":"2025-12-10T00:00:00.000Z","endDateTime":"2025-12-10T06:00:00.000Z","opacity":50}')
 * @returns Объект Schedule с датами, содержащими правильный offset, или null, если парсинг не удался
 */
export function parseSchedule(scheduleValue: string | null | undefined): Schedule | null {
    if (!scheduleValue || typeof scheduleValue !== "string") {
        return null;
    }

    try {
        const parsed = JSON.parse(scheduleValue);

        if (
            typeof parsed.startDateTime === "string" &&
            typeof parsed.endDateTime === "string" &&
            typeof parsed.opacity === "number"
        ) {
            return {
                startDateTime: convertToServerDateTime(parsed.startDateTime),
                endDateTime: convertToServerDateTime(parsed.endDateTime),
                opacity: parsed.opacity
            };
        }

        return null;
    } catch (error) {
        console.error("[parseSchedule] Failed to parse schedule:", error);
        return null;
    }
}

/**
 * Сортирует настройки SCHEDULE_DARK по дате начала по возрастанию
 * Использует Date.parse() для получения UTC timestamp из строк с offset,
 * что позволяет корректно сравнивать времена независимо от локальной временной зоны
 * @param settings - Массив настроек
 * @returns Отсортированный массив настроек
 */
export function sortScheduleSettings(settings?: Record<string, string>[]): Record<string, string>[] | undefined {
    if (!settings || settings.length === 0) {
        return settings;
    }

    const sorted = [...settings];

    sorted.sort((a, b) => {
        if (a.settingType === "SCHEDULE_DARK" && b.settingType === "SCHEDULE_DARK") {
            const scheduleA = parseSchedule(a.settingValue);
            const scheduleB = parseSchedule(b.settingValue);

            if (!scheduleA) return 1;
            if (!scheduleB) return -1;

            const timestampA = Date.parse(scheduleA.startDateTime);
            const timestampB = Date.parse(scheduleB.startDateTime);

            return timestampA - timestampB;
        }

        if (a.settingType === "SCHEDULE_DARK") return -1;
        if (b.settingType === "SCHEDULE_DARK") return 1;

        return 0;
    });

    return sorted;
}

/**
 * Проверяет, активно ли расписание в данный момент
 * Сравнение происходит в UTC timestamp:
 * - schedule.startDateTime и schedule.endDateTime содержат offset (например, +06:00)
 * - Date.parse() автоматически конвертирует строку с offset в UTC timestamp
 * - new Date().getTime() возвращает текущий момент в UTC timestamp
 * - Оба timestamp'а в UTC, поэтому сравнение корректно учитывает локальную временную зону машины
 * @param schedule - Объект расписания с датами, содержащими offset
 * @returns true, если текущее время попадает в диапазон расписания, false - иначе
 */
export function isScheduleActive(schedule: Schedule): boolean {
    const now = new Date();

    const startTimestamp = Date.parse(schedule.startDateTime);
    const endTimestamp = Date.parse(schedule.endDateTime);
    const nowTimestamp = now.getTime();
    return nowTimestamp >= startTimestamp && nowTimestamp <= endTimestamp;
}

/**
 * Получает активное расписание из списка settings
 * Проверяет каждое расписание типа SCHEDULE_DARK через isScheduleActive()
 * Если несколько расписаний активны одновременно, возвращается первое найденное
 * @param settings - Массив настроек, из которого нужно найти активное расписание
 * @returns Первое активное расписание или null, если активных расписаний нет
 */
export function getActiveSchedule(
    settings?: Record<string, string>[]
): Schedule | null {
    if (!settings || settings.length === 0) {
        return null;
    }

    for (const setting of settings) {
        if (setting.settingType === "SCHEDULE_DARK" && setting.settingValue) {
            const schedule = parseSchedule(setting.settingValue);
            if (schedule && isScheduleActive(schedule)) {
                return schedule;
            }
        }
    }

    return null;
}
