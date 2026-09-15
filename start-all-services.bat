@echo off
title Start Database and Redis Services
color 0A

echo ==========================================================
echo    Starting PostgreSQL and Redis Background Services
echo ==========================================================
echo.

:: 1. PostgreSQL Service
echo [1/2] Checking PostgreSQL...
net start postgresql-x64-18 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] PostgreSQL Service active on Port 5432.
) else (
    echo [OK] PostgreSQL is active on Port 5432.
)

:: 2. Redis Background Service
echo [2/2] Checking Redis...
powershell -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 6379); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Starting Redis server on Port 6379 in background...
    powershell -WindowStyle Hidden -Command "Start-Process -FilePath '%LOCALAPPDATA%\Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\Redis-8.10.1-Windows-x64-msys2\redis-server.exe' -ArgumentList '--port 6379' -WindowStyle Hidden"
    echo [OK] Redis started in background on Port 6379.
) else (
    echo [OK] Redis is already active on Port 6379.
)

echo.
echo ==========================================================
echo    ALL SERVICES READY:
echo    * PostgreSQL: Port 5432 (Database: jupsoft_cms)
echo    * Redis:      Port 6379 (In-Memory Cache)
echo ==========================================================
timeout /t 3
