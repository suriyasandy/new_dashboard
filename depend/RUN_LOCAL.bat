@echo off
echo ===============================================
echo GFX Dashboard - Local Development (No Replit)
echo ===============================================
echo.

echo Checking Node.js...
node -v
echo.

echo Starting Local Server (No External Dependencies)
echo URL: http://localhost:5001
echo.
echo To build frontend: npm run build
echo To stop server: Ctrl+C
echo.

node server-standalone.cjs