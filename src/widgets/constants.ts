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
    },
    ru: {
        Flight: "Рейс",
        Airport: "Аэропорт",
        "Sheduled date": "Запланированная дата",
        "Sheduled time": "Запланированное время",
        Status: "Статус",
        "Actual time": "Фактическое время",
    },
    kg: {
        Flight: "Учуу",
        Airport: "Аэропорт",
        "Sheduled date": "Пландаштырылган кун",
        "Sheduled time": "Пландаштырылган убакыт",
        Status: "Статус",
        "Actual time": "Чыныгы убакыт",
    },
};

export { headerTitleTranslate, tableHeadersTranslate, FlightStatus };
