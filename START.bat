@echo off
chcp 65001 >nul 2>nul
setlocal
title Montage Templates - قوالب مونتاج
cd /d "%~dp0"

echo.
echo   ============================================
echo      قوالب مونتاج - التشغيل المحلي
echo   ============================================
echo.

REM ملفات .cmd لا يمنعها إعداد PowerShell الأمني، بخلاف npm.ps1
where node >nul 2>nul
if errorlevel 1 goto nonode
where npm.cmd >nul 2>nul
if errorlevel 1 goto nonode

if exist "node_modules" goto havedeps
echo   [1/3] تثبيت الاعتماديات... قد يأخذ دقيقة أو دقيقتين
echo.
call npm.cmd install
if errorlevel 1 goto failed
goto built

:havedeps
echo   [1/3] الاعتماديات موجودة - تخطي

:built
echo.
echo   [2/3] بناء الواجهة...
call npm.cmd run build
if errorlevel 1 goto failed

echo.
echo   [3/3] تشغيل الخادم...
echo.
echo   ============================================
echo      OPEN:   http://localhost:5174
echo   ============================================
echo.
echo   سيفتح المتصفح تلقائيا بعد ثوان.
echo   لو ظهرت صفحة خطأ فانتظر ثانيتين ثم حدثها (F5).
echo   للإيقاف: أغلق هذه النافذة.
echo.

start "" /min cmd /c "timeout /t 5 >nul & start "" http://localhost:5174"
call npm.cmd start
goto done

:nonode
echo   [!] Node.js غير مثبت على الجهاز.
echo.
echo       حمله من:  https://nodejs.org
echo       اختر النسخة LTS، ثبتها، ثم شغل هذا الملف من جديد.
echo.
pause
exit /b 1

:failed
echo.
echo   [!] فشلت إحدى الخطوات. انسخ الرسالة أعلاه وأرسلها لي.
echo.
pause
exit /b 1

:done
echo.
echo   توقف الخادم.
pause
