@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Chua cai Node.js. Tai o https://nodejs.org roi chay lai file nay.
  echo.
  pause
  exit /b 1
)

start "" http://localhost:8080/phong-van.html
node phuc-vu.mjs 8080
pause
