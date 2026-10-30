@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ is required. Install it from https://nodejs.org
  pause
  exit /b 1
)
start "" "http://127.0.0.1:4173"
node server.mjs
pause
