@echo off
title Windows Firewall Port fuer Handy freigeben
echo ========================================================
echo   PORT 8080 FUER HANDY IM WLAN FREIGEBEN...
echo ========================================================
echo.
netsh advfirewall firewall add rule name="Gentlemen Darts Port 8080" dir=in action=allow protocol=TCP localport=8080 profile=any
echo.
echo ========================================================
echo   FERTIG! Druecke eine Taste zum Schliessen.
echo ========================================================
pause
