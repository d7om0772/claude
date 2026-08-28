@echo off
chcp 65001 >nul 2>nul
setlocal
title Montage Templates
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode
where npm.cmd >nul 2>nul
if errorlevel 1 goto nonode

node "src\cli\start.js"
if errorlevel 1 goto failed
goto done

:nonode
echo.
echo   [!] Node.js غير مثبت على الجهاز.
echo.
echo       حمله من:  https://nodejs.org
echo       اختر النسخة LTS، ثبتها، ثم شغل هذا الملف من جديد.
echo.
pause
exit /b 1

:failed
echo.
echo   [!] فشلت إحدى الخطوات. الملف start-log.txt بجانب هذا الملف - أرسله لي.
echo.
pause
exit /b 1

:done
echo.
pause
