import type { Translations } from "@core/types";

const pwaTranslations: Translations = {
    pwa_install_description: {
        en: "For the best experience, install the app on your device",
        ru: "Для лучшего опыта установите приложение на ваше устройство",
        kg: "Эң жакшы тажрыйба үчүн, колдонмону түзүлмөңүзгө орнотуңуз"
    },
    pwa_install_button: {
        en: "Install",
        ru: "Установить",
        kg: "Орнотуу"
    },
    pwa_installed: {
        en: "PWA installed",
        ru: "PWA установлено",
        kg: "PWA орнотулду"
    },
    pwa_install_dismissed: {
        en: "PWA installation dismissed",
        ru: "Установка PWA отклонена",
        kg: "PWA орнотуу баш тартылды"
    },

    // Windows Kiosk Instructions
    windows_kiosk_title: {
        en: "Windows Kiosk Mode Setup",
        ru: "Настройка kiosk-режима на Windows",
        kg: "Windows kiosk-режимин орнотуу"
    },
    windows_kiosk_auto_setup_title: {
        en: "For automatic kiosk mode setup (requires Chrome installed):",
        ru: "Для автоматической настройки kiosk-режима (требуется установленный Chrome):",
        kg: "Автоматтык kiosk-режимди орнотуу үчүн (Chrome орнотулушу керек):"
    },
    windows_kiosk_step1: {
        en: "Download the installation script (button below)",
        ru: "Скачайте скрипт установки (кнопка ниже)",
        kg: "Орнотуу скриптинин жүктөп алыңыз (төмөнкү баскыч)"
    },
    windows_kiosk_step2: {
        en: "Run the install-kiosk.bat file as administrator",
        ru: "Запустите файл install-kiosk.bat от имени администратора",
        kg: "install-kiosk.bat файлын администратор катары иштетиңиз"
    },
    windows_kiosk_step2_detail: {
        en: "Right-click on the file → \"Run as administrator\"",
        ru: "Правый клик на файле → \"Запуск от имени администратора\"",
        kg: "Файлга оң баскыч → \"Администратор катары иштетүү\""
    },
    windows_kiosk_step3: {
        en: "The script will automatically:",
        ru: "Скрипт автоматически:",
        kg: "Скрипт автоматтык түрдө:"
    },
    windows_kiosk_step3_item1: {
        en: "Detect installed Chrome browser",
        ru: "Определит установленный браузер Chrome",
        kg: "Орнотулган Chrome браузерди тааныйт"
    },
    windows_kiosk_step3_item2: {
        en: "Create desktop shortcut (launches browser directly with app URL)",
        ru: "Создаст ярлык на рабочем столе (запускает браузер напрямую с URL приложения)",
        kg: "Жумуш тактасына жардамчыны түзөт (браузерди колдонмо URL менен түздөн-түз иштетет)"
    },
    windows_kiosk_step3_item3: {
        en: "Add shortcut to Windows startup",
        ru: "Добавит ярлык в автозапуск Windows",
        kg: "Windows автозапускка жардамчыны кошот"
    },
    windows_kiosk_step4: {
        en: "Wait for the script to complete installation",
        ru: "Дождитесь завершения установки скриптом",
        kg: "Скрипттин орнотууну бүтүрүшүн күтүңүз"
    },
    windows_kiosk_step5: {
        en: "Restart your computer - after reboot, the app will automatically launch in kiosk mode",
        ru: "Перезагрузите компьютер - после перезагрузки приложение будет автоматически запускаться в kiosk-режиме",
        kg: "Компьютерди кайра жүктөңүз - кайра жүктөгөндөн кийин, колдонмо автоматтык түрдө kiosk-режиминде иштейт"
    },
    windows_kiosk_what_is_title: {
        en: "What is kiosk mode?",
        ru: "Что такое kiosk-режим?",
        kg: "Kiosk-режим деген эмне?"
    },
    windows_kiosk_what_is_description: {
        en: "Kiosk mode is a fullscreen mode without browser interface elements (address bar, navigation buttons, etc.). The app will take up the entire screen and automatically launch when the computer starts.",
        ru: "Kiosk-режим - это полноэкранный режим без элементов интерфейса браузера (адресной строки, кнопок навигации и т.д.). Приложение будет занимать весь экран и автоматически запускаться при включении компьютера.",
        kg: "Kiosk-режим - бул браузер интерфейс элементтери жок толук экран режими (дарегинин тилкеси, навигация баскычтары ж.б.). Колдонмо бүт экранды ээлейт жана компьютер күйгүзүлгөндө автоматтык түрдө иштейт."
    },
    windows_kiosk_exit_title: {
        en: "Exiting kiosk mode:",
        ru: "Выход из kiosk-режима:",
        kg: "Kiosk-режимден чыгуу:"
    },
    // windows_kiosk_exit_ctrl_shift_q: {
    //     en: "Ctrl+Shift+Q - closes the app",
    //     ru: "Ctrl+Shift+Q - закрывает приложение",
    //     kg: "Ctrl+Shift+Q - колдонмону жабат"
    // },
    windows_kiosk_exit_alt_f4: {
        en: "Alt+F4 - standard window close",
        ru: "Alt+F4 - стандартное закрытие окна",
        kg: "Alt+F4 - стандарттык терезе жабуу"
    },
    windows_kiosk_exit_ctrl_alt_del: {
        en: "Ctrl+Alt+Del - opens task manager",
        ru: "Ctrl+Alt+Del - открывает диспетчер задач",
        kg: "Ctrl+Alt+Del - тапшырмалар менеджерин ачат"
    },
    windows_kiosk_important_title: {
        en: "Important:",
        ru: "Важно:",
        kg: "Маанилүү:"
    },
    windows_kiosk_important_script: {
        en: "The script requires administrator rights to create a shortcut in startup",
        ru: "Скрипт требует прав администратора для создания ярлыка в автозапуске",
        kg: "Скрипт автозапуска жардамчы түзүү үчүн администратор укуктарын талап кылат"
    },
    windows_kiosk_important_url: {
        en: "The script automatically uses the current website URL",
        ru: "Скрипт автоматически использует URL текущего сайта",
        kg: "Скрипт учурдагы сайттын URL-ин автоматтык түрдө колдонот"
    },
    windows_kiosk_important_custom_url: {
        en: "No need to install PWA - the script launches the browser directly with the app URL in kiosk mode",
        ru: "Не нужно устанавливать PWA - скрипт запускает браузер напрямую с URL приложения в kiosk-режиме",
        kg: "PWA орнотуунун кереги жок - скрипт браузерди колдонмо URL менен kiosk-режиминде түздөн-түз иштетет"
    },
    kiosk_download_button: {
        en: "📥 Download",
        ru: "📥 Скачать",
        kg: "📥 Жүктөп алуу"
    },
    windows_kiosk_dismiss: {
        en: "Got it",
        ru: "Понятно",
        kg: "Түшүндүм"
    },

    // Android Kiosk Instructions
    android_kiosk_title: {
        en: "Android Kiosk Mode Setup",
        ru: "Настройка kiosk-режима на Android",
        kg: "Android kiosk-режимин орнотуу"
    },
    android_kiosk_autostart_title: {
        en: "1. Auto-start on device boot",
        ru: "1. Автозапуск при включении устройства",
        kg: "1. Түзүлмө күйгүзүлгөндө автозапуск"
    },
    android_kiosk_autostart_description: {
        en: "To automatically launch the app when the device boots, use one of the following methods:",
        ru: "Для автоматического запуска приложения при включении устройства используйте один из способов:",
        kg: "Түзүлмө күйгүзүлгөндө колдонмону автоматтык түрдө иштетүү үчүн, төмөнкү ыкмалардын бирин колдонуңуз:"
    },
    android_kiosk_method_a_title: {
        en: "Method A: Via ADB (recommended)",
        ru: "Способ A: Через ADB (рекомендуется)",
        kg: "Ыкма A: ADB аркылуу (сунушталат)"
    },
    android_kiosk_method_a_step1: {
        en: "Enable USB debugging on device (Settings → Developer options → USB debugging)",
        ru: "Включите отладку по USB на устройстве (Настройки → Для разработчиков → Отладка по USB)",
        kg: "Түзүлмөдө USB аркылуу отладканы күйгүзүңүз (Жөндөөлөр → Өнүктүрүүчүлөр үчүн → USB аркылуу отладка)"
    },
    android_kiosk_method_a_step2: {
        en: "Connect device to computer",
        ru: "Подключите устройство к компьютеру",
        kg: "Түзүлмөнү компьютерге туташтырыңыз"
    },
    android_kiosk_method_a_step3: {
        en: "Run setup-android-kiosk.bat (Windows) or setup-android-kiosk.sh (Linux/Mac)",
        ru: "Запустите скрипт setup-android-kiosk.bat (Windows) или setup-android-kiosk.sh (Linux/Mac)",
        kg: "setup-android-kiosk.bat (Windows) же setup-android-kiosk.sh (Linux/Mac) скриптинин иштетиңиз"
    },
    android_kiosk_method_a_step4: {
        en: "The script will automatically configure auto-start",
        ru: "Скрипт автоматически настроит автозапуск",
        kg: "Скрипт автоматтык түрдө автозапустун орнотуу"
    },
    android_kiosk_method_b_title: {
        en: "Method B: Via special apps",
        ru: "Способ B: Через специальные приложения",
        kg: "Ыкма B: Атайын колдонмолор аркылуу"
    },
    android_kiosk_method_b_item1: {
        en: "Tasker or Automate - create a task that runs on system boot",
        ru: "Tasker или Automate - создайте задачу, которая запускается при загрузке системы",
        kg: "Tasker же Automate - система жүктөлгөндө иштетүүчү тапшырма түзүңүз"
    },
    android_kiosk_method_b_item2: {
        en: "Fully Kiosk Browser or Kiosk Browser Lockdown - full kiosk mode with auto-start",
        ru: "Fully Kiosk Browser или Kiosk Browser Lockdown - полноценный kiosk-режим с автозапуском",
        kg: "Fully Kiosk Browser же Kiosk Browser Lockdown - автозапустун менен толук kiosk-режим"
    },
    android_kiosk_notifications_title: {
        en: "2. Block system notifications",
        ru: "2. Блокировка системных уведомлений",
        kg: "2. Системалык эскертүүлөрдү бөгөттөө"
    },
    android_kiosk_notifications_description: {
        en: "To block Android notifications:",
        ru: "Для блокировки уведомлений Android:",
        kg: "Android эскертүүлөрдү бөгөттөө үчүн:"
    },
    android_kiosk_notifications_adb_title: {
        en: "Via ADB:",
        ru: "Через ADB:",
        kg: "ADB аркылуу:"
    },
    android_kiosk_notifications_manual_title: {
        en: "Manually:",
        ru: "Вручную:",
        kg: "Кол менен:"
    },
    android_kiosk_notifications_manual_step1: {
        en: "Open Settings → Sounds and notifications",
        ru: "Откройте Настройки → Звуки и уведомления",
        kg: "Жөндөөлөр → Үн жана эскертүүлөрдү ачыңыз"
    },
    android_kiosk_notifications_manual_step2: {
        en: "Enable \"Do not disturb\" mode",
        ru: "Включите режим \"Не беспокоить\"",
        kg: "\"Тынчсыздандырбоо\" режимин күйгүзүңүз"
    },
    android_kiosk_notifications_manual_step3: {
        en: "Or use Quick Settings (swipe down from top edge)",
        ru: "Или используйте Quick Settings (проведите вниз от верхнего края экрана)",
        kg: "Же Quick Settings колдонуңуз (экранын жогорку четинен ылдый тартыңыз)"
    },
    android_kiosk_fullscreen_title: {
        en: "3. Automatic fullscreen",
        ru: "3. Автоматический fullscreen",
        kg: "3. Автоматтык толук экран"
    },
    android_kiosk_fullscreen_description: {
        en: "The app automatically launches in fullscreen mode each time it opens.",
        ru: "Приложение автоматически запускается в fullscreen режиме при каждом открытии.",
        kg: "Колдонмо ар дайым ачылганда автоматтык түрдө толук экран режиминде иштейт."
    },
    android_kiosk_fullscreen_important: {
        en: "Important: If you exit fullscreen, the app will automatically return to fullscreen after 1-2 seconds. Fullscreen cannot be completely disabled.",
        ru: "Важно: Если вы выйдете из fullscreen, приложение автоматически вернет fullscreen через 1-2 секунды. Полностью отключить fullscreen нельзя.",
        kg: "Маанилүү: Эгер сиз толук экрандан чыксаңыз, колдонмо 1-2 секундадан кийин автоматтык түрдө толук экранга кайтат. Толук экранды толугу менен өчүрүү мүмкүн эмес."
    },
    android_kiosk_additional_info: {
        en: "Additional information",
        ru: "Дополнительная информация",
        kg: "Кошумча маалымат"
    },
    android_kiosk_additional_info_description: {
        en: "Detailed instructions and ADB commands are available in the KIOSK_SETUP_INSTRUCTIONS.md file",
        ru: "Подробные инструкции и ADB команды доступны в файле KIOSK_SETUP_INSTRUCTIONS.md",
        kg: "Деталдуу көрсөтмөлөр жана ADB буйруктары KIOSK_SETUP_INSTRUCTIONS.md файлында жеткиликтүү"
    },
    android_kiosk_dismiss: {
        en: "Got it",
        ru: "Понятно",
        kg: "Түшүндүм"
    }
};

export default pwaTranslations;

