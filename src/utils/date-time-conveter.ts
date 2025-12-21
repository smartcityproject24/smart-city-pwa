export function toFormatTimeWithSeconds(iso: string | undefined): string {
    const match = iso?.match(/\d{2}:\d{2}:\d{2}/);
    return match ? match[0] : "";
}