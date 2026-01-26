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

// Get status color based on FlightStatus
export function getStatusColor(status: string): string {
    if (!status) return "#fff";
    const cleanStatus = status.trim();
    const color = FlightStatus[cleanStatus];
    return color || "#fff";
}

// Get airline logo URL for a flight number
export function getAirlineLogo(flightNumber: string): string | null {
    const airlineCode = extractAirlineCode(flightNumber);
    if (!airlineCode || !AIRLINE_LOGO_PATHS[airlineCode]) {
        return null;
    }
    
    const folderPath = AIRLINE_LOGO_PATHS[airlineCode];
    const fileName = AIRLINE_IMAGE_FILES[airlineCode] || `${folderPath.split('/').pop()}.jpg`;
    const fullPath = `../data/assets/${folderPath}/${fileName}`;
    
    try {
        // Use dynamic import with Vite's asset handling
        const imagePath = new URL(fullPath, import.meta.url).href;
        return imagePath;
    } catch (e) {
        return null;
    }
}

// Handle image load error
export function handleImageError(e: Event) {
    const target = e.target as HTMLImageElement;
    if (target) {
        target.style.display = 'none';
    }
}
