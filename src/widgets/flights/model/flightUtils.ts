import { extractAirlineCode, AIRLINE_LOGO_PATHS, FlightStatus, AIRLINE_IMAGE_FILES } from "./constants";

export interface FlightData {
    Flight: string;
    Status: string;
    Airport: string;
    Regularity: string;
    "Actual date": string;
    "Actual time": string;
    "Sheduled date": string;
    "Sheduled time": string;
}

export function getStatusColor(status: string): string {
    if (!status) return "#fff";
    const cleanStatus = status.trim();
    const color = FlightStatus[cleanStatus];
    return color || "#fff";
}

const logoUrlCache = new Map<string, string | null>();

export function getAirlineLogo(flightNumber: string): string | null {
    if (logoUrlCache.has(flightNumber)) {
        return logoUrlCache.get(flightNumber) ?? null;
    }

    const airlineCode = extractAirlineCode(flightNumber);
    if (!airlineCode || !AIRLINE_LOGO_PATHS[airlineCode]) {
        logoUrlCache.set(flightNumber, null);
        return null;
    }

    const folderPath = AIRLINE_LOGO_PATHS[airlineCode];
    const fileName = AIRLINE_IMAGE_FILES[airlineCode] || `${folderPath.split("/").pop()}.jpg`;

    const imagePath = `/${folderPath}/${fileName}`;

    logoUrlCache.set(flightNumber, imagePath);
    return imagePath;
}

export function handleImageError(e: Event) {
    const target = e.target as HTMLImageElement;
    if (target) {
        target.style.display = 'none';
    }
}
