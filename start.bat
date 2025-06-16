@echo off
echo ==========================================
echo    GAMERCHAT - Demarrage du serveur
echo ==========================================
echo.

echo Installation des dependances...
call npm install

echo.
echo Demarrage du serveur sur le port 3001...
echo Acces a l'application: http://localhost:3001
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

node server.js

pause
