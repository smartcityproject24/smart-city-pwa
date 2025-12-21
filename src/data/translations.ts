import type { Translations } from "@core/types";
import pwaTranslations from "./translations/pwa";

const translations: Translations = {
    dashboard: {
        en: "Dashboard",
        ru: "Панель управления",
        kg: "Башкаруу панели"
    },
    login: {
        en: "Login",
        ru: "Вход",
        kg: "Кирүү"
    },
    not_found: {
        en: "Page Not Found",
        ru: "Страница не найдена",
        kg: "Бет табылган жок"
    },
    language: {
        en: "Language",
        ru: "Язык",
        kg: "Тил"
    },
    en: {
        en: "English",
        ru: "English",
        kg: "English"
    },
    kg: {
        en: "Кыргызча",
        ru: "Кыргызча",
        kg: "Кыргызча"
    },
    ru: {
        en: "Русский",
        ru: "Русский",
        kg: "Русский"
    },
    code: {
        en: "Code",
        ru: "Код",
        kg: "Код"
    },
    enter: {
        en: "Enter",
        ru: "Войти",
        kg: "Кирүү"
    },
    password: {
        en: "Password",
        ru: "Пароль",
        kg: "Сырсөз"
    },
    required_field: {
        en: "This field is required",
        ru: "Обязательное поле",
        kg: "Бул талаа милдеттүү"
    },
    max_length: {
        en: "Maximum length is {max} characters",
        ru: "Максимальная длина {max} символов",
        kg: "Максималдуу узундук — {max} белгиден"
    },
    password_requirements: {
        en: "Password must contain at least one lowercase letter, one uppercase letter, one number and one special character",
        ru: "Пароль должен содержать минимум одну строчную букву, одну заглавную букву, одну цифру и один специальный символ",
        kg: "Сырсөз кеминде бир кичинекей тамга, бир чоң тамга, бир цифра жана бир атайын белги камтышы керек"
    },
    password_too_short: {
        en: "Password must be at least {min} characters",
        ru: "Пароль должен быть не короче {min} символов",
        kg: "Сырсөз кеминде {min} белгиден болушу керек"
    },
    auth_failed: {
        en: "Authentication failed",
        ru: "Ошибка авторизации",
        kg: "Авторизация катасы"
    },
    network_error: {
        en: "Network error",
        ru: "Ошибка сети",
        kg: "Тармак катасы"
    },
    control_panel: {
        en: "Control Panel",
        ru: "Панель управления",
        kg: "Башкаруу панели"
    },
    logout: {
        en: "Logout",
        ru: "Выйти",
        kg: "Чыгуу"
    },
    page_not_found: {
        en: "Page Not Found",
        ru: "Страница не найдена",
        kg: "Бет табылган жок"
    },
    page_not_found_description: {
        en: "The page you are looking for does not exist or has been moved.",
        ru: "Страница, которую вы ищете, не существует или была перемещена.",
        kg: "Бет табылган жок"
    },
    go_to_login: {
        en: "Go to Login",
        ru: "Перейти к входу",
        kg: "Кирүүге өтүү"
    },
    loading_data: {
        en: "Loading data...",
        ru: "Загрузка данных...",
        kg: "Маалыматтар жүктөлүүдө..."
    },
    error_loading_data: {
        en: "Error loading data",
        ru: "Ошибка загрузки данных",
        kg: "Маалыматтарды жүктөө катасы"
    },
    retry: {
        en: "Retry",
        ru: "Повторить",
        kg: "Кайталоо"
    },
    unknown_error: {
        en: "An unknown error occurred",
        ru: "Произошла неизвестная ошибка",
        kg: "Белгисиз ката жүрдү"
    },
    dashboard_name: {
        en: "Dashboard Name",
        ru: "Название панели",
        kg: "Панельдин аты"
    },
    schedule: {
        en: "Schedule",
        ru: "Расписание",
        kg: "График"
    },
    start: {
        en: "Start",
        ru: "Начало",
        kg: "Башталуу"
    },
    end: {
        en: "End",
        ru: "Окончание",
        kg: "Бүтүү"
    },
    brightness: {
        en: "Brightness",
        ru: "Яркость",
        kg: "Жарыктык"
    },
    value: {
        en: "Value",
        ru: "Значение",
        kg: "Маани"
    },
    loading_playlist: {
        en: "Loading playlist...",
        ru: "Загрузка плейлиста...",
        kg: "Плейлист жүктөлүүдө..."
    },
    error_loading_playlist: {
        en: "Error loading playlist",
        ru: "Ошибка загрузки плейлиста",
        kg: "Плейлистти жүктөө катасы"
    },
    solution: {
        en: "Solution",
        ru: "Решение",
        kg: "Шолөө"
    },
    solution_name: {
        en: "Name",
        ru: "Имя",
        kg: "Аты"
    },
    solution_size: {
        en: "Size",
        ru: "Размер",
        kg: "Өлчөм"
    },
    solution_not_set: {
        en: "Solution is not set",
        ru: "Решение отсутствует",
        kg: "Шолөө табылган жок"
    },
    width: {
        en: "Width",
        ru: "Ширина",
        kg: "Кенди"
    },
    height: {
        en: "Height",
        ru: "Высота",
        kg: "Баалуулук"
    },
    ...pwaTranslations
};

export default translations;
