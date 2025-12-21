/**
 * Windows kiosk installation script content
 * This script creates a desktop shortcut and adds it to Windows startup
 * @param appUrl - The URL of the PWA application (origin only, no pathname)
 */
export function getInstallKioskScript(appUrl?: string): string {
    const url = appUrl || 'https://smart-city-kiosk.netlify.app';

    const kioskArgs = '--kiosk --app=%APP_URL% --disable-features=PasswordLeakDetection,PasswordManagerOnboarding,TranslateUI,Translate --disable-notifications --disable-infobars --disable-save-password-bubble --disable-translate --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --disable-prompt-on-repost --disable-hang-monitor --disable-client-side-phishing-detection --disable-component-update --disable-background-networking --disable-sync --disable-default-apps --noerrdialogs --disable-breakpad --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows';

    return `@echo off
        REM Check if running as administrator
        net session >nul 2>&1
        if %errorLevel% == 0 (
            goto :admin_ok
        )
        
        REM Request administrator rights
        echo Requesting administrator rights...
        powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
        exit /b

        :admin_ok
        setlocal enabledelayedexpansion

        echo Installing Smart City PWA in kiosk mode...
        echo Running as administrator...
        echo.

        set "APP_URL=${url}"
        set "BROWSER_PATH="
        set "BROWSER_NAME="

        REM Check Chrome
        if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
            set "BROWSER_PATH=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
            set "BROWSER_NAME=Chrome"
            goto :browser_found
        )

        if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
            set "BROWSER_PATH=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
            set "BROWSER_NAME=Chrome"
            goto :browser_found
        )

        echo ERROR: Chrome not found!
        pause
        exit /b 1

        :browser_found
        echo Found: %BROWSER_NAME%
        echo.

        REM Disable Windows update notifications and system notifications
        echo Configuring Windows notifications...
        REM Disable Windows Update notifications via registry
        reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v "NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK" /t REG_DWORD /d 0 /f >nul 2>&1
        reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v "NOC_GLOBAL_SETTING_ALLOW_CRITICAL_TOASTS_ABOVE_LOCK" /t REG_DWORD /d 0 /f >nul 2>&1

        REM Disable Windows Update restart notifications
        reg add "HKLM\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings" /v "UxOption" /t REG_DWORD /d 1 /f >nul 2>&1

        REM Disable Action Center notifications
        powershell -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications' -Name 'ToastEnabled' -Value 0 -ErrorAction SilentlyContinue" >nul 2>&1

        REM Disable Windows Update automatic restarts
        reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v "NoAutoRebootWithLoggedOnUsers" /t REG_DWORD /d 1 /f >nul 2>&1
        reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v "AUOptions" /t REG_DWORD /d 2 /f >nul 2>&1

        echo Windows notifications configured.
        echo.

        echo Configuring Chrome translation settings...
        reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v "TranslateEnabled" /t REG_DWORD /d 0 /f >nul 2>&1
        reg add "HKCU\\Software\\Policies\\Google\\Chrome" /v "TranslateEnabled" /t REG_DWORD /d 0 /f >nul 2>&1
        echo Chrome translation disabled.
        echo.

        set "DESKTOP_PATH=%USERPROFILE%\\Desktop"
        set "SHORTCUT_NAME=Smart City.lnk"
        set "SHORTCUT_PATH=%DESKTOP_PATH%\\%SHORTCUT_NAME%"
        
        echo Creating desktop shortcut...
        powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%BROWSER_PATH%'; $Shortcut.Arguments = '${kioskArgs}'; $Shortcut.WorkingDirectory = '%USERPROFILE%'; $Shortcut.Description = 'Smart City'; $Shortcut.IconLocation = '%SystemRoot%\\System32\\imageres.dll,42'; $Shortcut.Save(); Write-Host 'Shortcut created'"

        if errorlevel 1 (
            echo ERROR: Failed to create shortcut!
            pause
            exit /b 1
        )

        set "STARTUP_PATH=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
        set "STARTUP_SHORTCUT=%STARTUP_PATH%\\%SHORTCUT_NAME%"

        echo Adding to startup...
        if not exist "%STARTUP_PATH%" mkdir "%STARTUP_PATH%"

        powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%STARTUP_SHORTCUT%'); $Shortcut.TargetPath = '%BROWSER_PATH%'; $Shortcut.Arguments = '${kioskArgs}'; $Shortcut.WorkingDirectory = '%USERPROFILE%'; $Shortcut.Description = 'Smart City (Startup)'; $Shortcut.IconLocation = '%SystemRoot%\\System32\\imageres.dll,42'; $Shortcut.Save(); Write-Host 'Startup shortcut created'"

        if errorlevel 1 (
            echo ERROR: Failed to add to startup!
            pause
            exit /b 1
        )

        echo.
        echo Installation completed!
        echo.
        echo Desktop shortcut and startup entry created with full kiosk mode.
        echo Windows update notifications have been disabled.
        echo.
        echo Exit kiosk mode: Alt+F4 or Ctrl+Alt+Del
        echo.
    pause`;
}

export const installKioskScript = getInstallKioskScript();

