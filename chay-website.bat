@echo off
chcp 65001 >nul
echo ========================================================
echo   KHOI CHAY HE THONG QUAN LY XE VA GIAO VIEN SONG TIEN
echo ========================================================
echo.
echo [1/2] Dang khoi chay Backend API Server (Port 5000)...
start "Song Tien Backend API (Port 5000)" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 2 /nobreak >nul

echo [2/2] Dang khoi chay Giao dien Website React (Port 5173)...
start "Song Tien Website Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul
echo Dang mo trinh duyet tai http://localhost:5173 ...
start http://localhost:5173
