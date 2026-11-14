@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Для запуска нужен Node.js 22 или новее: https://nodejs.org/
  pause
  exit /b 1
)
if exist "local\server.mjs" (
  node local\server.mjs
) else (
  node server.mjs
)
pause
