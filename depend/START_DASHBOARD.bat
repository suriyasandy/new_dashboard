@echo off
echo ===============================================
echo Starting GFX Dashboard - Windows
echo ===============================================
echo.

REM Set environment for Windows
set NODE_ENV=development

echo Starting server on http://localhost:5000
echo Press Ctrl+C to stop
echo.

tsx server/index.ts