export function toFormatTimeWithSeconds(iso: string | undefined): string {
    const match = iso?.match(/\d{2}:\d{2}:\d{2}/);
    return match ? match[0] : "";
}

export function formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}