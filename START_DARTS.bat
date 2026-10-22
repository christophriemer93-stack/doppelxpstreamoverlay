@echo off
title The Gentlemen Darts Club - Server
cd /d "%~dp0"
echo ========================================================
echo   ❖ THE GENTLEMEN DARTS CLUB - SERVER AKTIV ❖
echo ========================================================
echo.
echo Dein PC laeuft im Netzwerk unter: 192.168.2.181
echo.
echo 1. HANDY-LINK (Im Smartphone-Browser oeffnen):
echo    http://192.168.2.181:8080/darts_controller.html
echo.
echo 2. OBS OVERLAY (In OBS als Browserquelle eintragen):
echo    http://localhost:8080/darts_overlay.html
echo.
echo ========================================================
echo   Server laeuft stabil... Lass dieses Fenster einfach offen!
echo ========================================================
echo.

if exist "C:\Users\chris\AppData\Local\Python\bin\python.exe" (
    "C:\Users\chris\AppData\Local\Python\bin\python.exe" server.py
) else (
    python server.py
)

if errorlevel 1 (
    echo.
    echo Server beendet oder Fehler aufgetreten.
    pause
)
