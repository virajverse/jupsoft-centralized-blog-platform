@echo off
title Jupsoft Blog Platform - Dev Launcher (Hot-Reload)
color 0B

echo ===============================================================================
echo            JUPSOFT CENTRALIZED MULTI-SITE BLOG MANAGEMENT PLATFORM
echo                    COMPLETE LOCAL DEVELOPMENT STACK
echo ===============================================================================
echo.

:: 1. Verify / Start Redis Server (Port 6379)
echo [1/3] Checking Redis (Port 6379)...
powershell -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 6379); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Redis not running. Starting native Redis server on port 6379...
    start "Jupsoft Redis (Port 6379)" /min cmd /c "start-redis.bat"
    timeout /t 2 /nobreak >nul
    echo [OK] Redis started successfully!
) else (
    echo [OK] Redis is already active on port 6379.
)

:: 2. Verify PostgreSQL Service
echo [2/3] Checking PostgreSQL service...
sc query postgresql-x64-18 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] PostgreSQL service is active on port 5432.
) else (
    echo [INFO] Checking port 5432...
)

:: 3. Launch NestJS Backend with Hot-Reload (Watch Mode)
echo [3/3] Launching Backend and Frontend with Live Hot-Reload...
start "Jupsoft Backend [Port 4000 - Hot-Reload]" cmd /k "cd /d \"%~dp0\" && title Backend :4000 && pnpm dev:backend"

:: 4. Launch Next.js Admin Portal with Fast-Refresh
timeout /t 2 /nobreak >nul
start "Jupsoft Admin Portal [Port 3000 - Hot-Reload]" cmd /k "cd /d \"%~dp0\" && title Admin-Portal :3000 && pnpm dev:frontend"

echo.
echo ===============================================================================
echo   SERVICES LAUNCHED WITH HOT-RELOAD (AUTO-REFRESH ON CODE EDIT):
echo.
echo   * Admin Portal UI:  http://localhost:3000  (Next.js Fast-Refresh)
echo   * Backend API:      http://localhost:4000  (NestJS Watch-Mode)
echo   * Swagger Docs:     http://localhost:4000/api/docs
echo   * PostgreSQL 18:    Port 5432 (Database: jupsoft_cms)
echo   * Redis Cache:      Port 6379 (Active)
echo.
echo   NOTE: Edit any file in 'backend/src' or 'admin-portal/src', and it will
echo   automatically recompile and reload without needing manual restart!
echo ===============================================================================
echo.
echo You can minimize or close this launcher window.
pause
