const FlightStatus: Record<string, string> = {
    "ОТПРАВЛЕН": "#56ce6a",
    "DEPARTED": "#56ce6a",
    "УЧУП КЕТТИ": "#56ce6a",
    "ПРИЗЕМЛИЛСЯ": "#56ce6a",
    "ARRIVED": "#56ce6a",
    "КЕЛИП КОНДУ": "#56ce6a",

    "ОТМЕНЕН": "red",
    "CANCELED": "red",
    "ЖОККО ЧЫГАРЫЛДЫ": "red",

    "ЗАДЕРЖАН": "yellow",
    "DELAYED": "yellow",
    "КАРМАЛУУДА": "yellow",

    "РЕГИСТРАЦИЯ": "blue",
    "КАТТОО": "blue",
    "CHECK-IN": "blue",
};

const headerTitleTranslate = {
    ru: {
        departure: "Вылет",
        arrival: "Прилет",
    },
    en: {
        departure: "Departure",
        arrival: "Arrival",
    },
    kg: {
        departure: "Кетүү",
        arrival: "Келүү",
    },
};

const tableHeadersTranslate = {
    en: {
        Flight: "Flight",
        Airport: "Airport",
        "Sheduled date": "Sheduled date",
        "Sheduled time": "Sheduled time",
        Status: "Status",
        "Actual time": "Actual time",
        Logo: "",
    },
    ru: {
        Flight: "Рейс",
        Airport: "Аэропорт",
        "Sheduled date": "Запланированная дата",
        "Sheduled time": "Запланированное время",
        Status: "Статус",
        "Actual time": "Фактическое время",
        Logo: "",
    },
    kg: {
        Flight: "Учуу",
        Airport: "Аэропорт",
        "Sheduled date": "Пландаштырылган кун",
        "Sheduled time": "Пландаштырылган убакыт",
        Status: "Статус",
        "Actual time": "Чыныгы убакыт",
        Logo: "",
    },
};
const AIRLINES = {
    YK: 'АвиаТрафик Компани (Avia Traffic Company)',
    U6: 'Уральские Авиалинии (Ural Airlines)',
    KC: 'Эйр Астана (Air Astana)',
    S7: 'С7 Сибирь (S7 Airlines)',
    SU: 'Аэрофлот - Российские авиалинии (Aeroflot Russian Airlines)',
    J2: 'Azerbaijan Airlines (АЗАЛ)',
    MN: 'Asman Airlines',
    XY: 'Uzbekistan Airways',
    FZ: 'Flydubai (Флайдубай)',
    TK: 'Turkish Airlines',
    VF: 'турецкой бюджетной авиакомпании Ajet',
    CZ: 'China Southern Airlines',
    PC: 'турецкой бюджетной авиакомпании Pegasus Airlines',
    N4: 'Nordwind Airlines',
    TW: "южнокорейской бюджетной авиакомпании T'way Air (Ти вэй Эйр)",
    GJ: 'Eurofly (Италия) Meridiana',
    SZ: 'таджикской авиакомпании Somon Air (Сомон Эйр)',
    IQ: 'казахстанской авиакомпании Qazaq Air',
    RSX: 'Red Sea Airlines (RSX/4S) (Египет)',
    ANK: '(ANK) Aero Nomad Airlines',
    KA: '(KA) Aero Nomad Airlines',
    K1: 'Sky Fru (K1)',
    K9: 'TezJet Airlines',
    HR: 'Hahn Air',
    G9: 'Air Arabia',
    HY: 'Uzbekistan Airways (Узбекские авиалинии)',
    J9: 'Jazeera Airways (Джазира Эйрвэйз)',
    FV: 'Авиакомпания «Россия»',
    C6: 'Centrum Air',
  
};

// Mapping from airline codes to their folder names in assets (served from /public/airlines/Логотипы)
const AIRLINE_LOGO_PATHS: Record<string, string> = {
    YK: 'airlines/Логотипы/Avia Traffic',
    U6: 'airlines/Логотипы/Ural airline',
    KC: 'airlines/Логотипы/Airastana',
    S7: 'airlines/Логотипы/S7 airline',
    SU: 'airlines/Логотипы/Аэрофлот',
    J2: 'airlines/Логотипы/Azerbajan airlines',
    MN: 'airlines/Логотипы/Asman Airlines',
    XY: 'airlines/Логотипы/Uzbekistan Airways',
    FZ: 'airlines/Логотипы/Flydubai',
    TK: 'airlines/Логотипы/Turkish Airlines',
    VF: 'airlines/Логотипы/A jet',
    CZ: 'airlines/Логотипы/Chinasouthern',
    PC: 'airlines/Логотипы/Pegasus',
    N4: 'airlines/Логотипы/Nordwind airline',
    TW: 'airlines/Логотипы/T Way',
    GJ: 'airlines/Логотипы/GJ (ZHEJIANG LOONGAIR AIRLINES)',
    SZ: 'airlines/Логотипы/SZ (SOMON AIR)',
    IQ: 'airlines/Логотипы/qazaq air',
    RSX: 'airlines/Логотипы/red sea',
    ANK: 'airlines/Логотипы/Аэрономад',
    KA: 'airlines/Логотипы/Аэрономад',
    K1: 'airlines/Логотипы/Sky fru',
    K9: 'airlines/Логотипы/Tez jet',
    HR: 'airlines/Логотипы/Air arabia', // placeholder until Hahn Air logo is added
    G9: 'airlines/Логотипы/Air arabia',
    HY: 'airlines/Логотипы/Uzbekistan Airways',
    J9: 'airlines/Логотипы/Jazzera',
    FV: 'airlines/Логотипы/Rossiya',
    C6: 'airlines/Логотипы/Air arabia', // placeholder until Centrum Air logo is added
};

export const AIRLINE_IMAGE_FILES: Record<string, string> = {
    YK: 'aviatraffic.jpg',
    U6: 'Ural airline.jpg',
    KC: 'Airastana.jpg',
    S7: 'S7 airline.jpg',
    SU: 'Аэрофлот.JPG',
    J2: 'Azerbajan airlines.jpg',
    MN: 'Asman Airlines.jpg',
    XY: 'Uzbekistan Airways.JPG',
    FZ: 'flydubai.jpg',
    TK: 'Turkish Airlines.jpg',
    VF: 'A jet.jpg',
    CZ: 'Chinasouthern.jpg',
    PC: 'Pegasus.jpg',
    N4: 'Nordwind airline.jpg',
    TW: 'T way.jpg',
    GJ: 'gjt.jpg',
    SZ: 'szt.jpg',
    IQ: 'qazt (2).jpg',
    RSX: 'st1.jpg',
    ANK: 'Аэрономад.jpg',
    KA: 'Аэрономад.jpg',
    K1: 'Sky fru.jpg',
    K9: 'tzt (1).jpg',
    HR: 'Air arabia.jpg', // Placeholder - update when Hahn Air logo is added
    G9: 'Air arabia.jpg',
    HY: 'Uzbekistan Airways.JPG',
    J9: 'J9st (1).jpg',
    FV: 'Rossiya.JPG',
    C6: 'Air arabia.jpg', // Placeholder - update when Centrum Air logo is added
};

/**
 * Extracts airline code from flight number
 * Examples: "YK123" -> "YK", "U6-456" -> "U6", "KC789" -> "KC"
 */
function extractAirlineCode(flightNumber: string): string | null {
    if (!flightNumber) return null;
    
    // Remove whitespace and convert to uppercase
    const cleaned = flightNumber.trim().toUpperCase();
    
    // Try to match airline codes from AIRLINES keys
    // Match 2-3 letter codes at the start, optionally followed by dash or space
    const airlineKeys = Object.keys(AIRLINES);
    
    // Sort by length (longest first) to match longer codes like "RSX" before shorter ones
    const sortedKeys = airlineKeys.sort((a, b) => b.length - a.length);
    
    for (const code of sortedKeys) {
        // Check if flight number starts with the airline code
        // Allow for optional dash or space after the code
        const pattern = new RegExp(`^${code}(?:[-\\s]|\\d)`, 'i');
        if (pattern.test(cleaned)) {
            return code;
        }
    }
    
    return null;
}

/**
 * Gets the logo path for an airline code
 * Returns a path that can be used with Vite's asset handling
 */
function getAirlineLogoPath(airlineCode: string | null): string | null {
    if (!airlineCode || !AIRLINE_LOGO_PATHS[airlineCode]) {
        return null;
    }
    
    const basePath = AIRLINE_LOGO_PATHS[airlineCode];
    // Return path relative to src/data/assets
    // The component will use this with Vite's asset handling
    return `/src/data/assets/${basePath}`;
}

/**
 * Gets the airline logo URL for a flight number
 * Returns null if no matching airline is found
 */
function getFlightLogo(flightNumber: string): string | null {
    const airlineCode = extractAirlineCode(flightNumber);
    if (!airlineCode) return null;
    
    const basePath = getAirlineLogoPath(airlineCode);
    if (!basePath) return null;
    
    // Try to find the first image file in the directory
    // Common patterns: folder name without spaces, lowercase, etc.
    // We'll use a helper that tries common file name patterns
    return basePath;
}

export { 
    headerTitleTranslate, 
    tableHeadersTranslate, 
    FlightStatus, 
    AIRLINES,
    extractAirlineCode,
    getAirlineLogoPath,
    AIRLINE_LOGO_PATHS
};
