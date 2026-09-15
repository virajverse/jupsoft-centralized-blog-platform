@echo off
title Redis Server (Port 6379)
echo ===================================================
echo   Starting Jupsoft Redis Server on Port 6379...
echo ===================================================
"%LOCALAPPDATA%\Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\Redis-8.10.1-Windows-x64-msys2\redis-server.exe" --port 6379
pause
