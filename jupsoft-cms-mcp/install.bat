@echo off
setlocal
title Jupsoft CMS MCP - Setup
echo ========================================================
echo   🚀 Jupsoft CMS MCP Server - Setup
echo   Super Admin Control Suite for AI Agents
echo ========================================================

if "%VENV%"=="" (
  if exist "%~dp0..\..\.venv" (
    set "VENV=%~dp0..\..\.venv"
  ) else if exist "%~dp0.venv" (
    set "VENV=%~dp0.venv"
  ) else (
    set "VENV=.venv"
  )
)
set "PYTHONPATH=%~dp0src"

echo [1/2] Installing dependencies into %VENV%...
if exist "%VENV%\Scripts\activate.bat" (
  call "%VENV%\Scripts\activate.bat"
  pip install -r "%~dp0requirements.txt" -q
  pip install -e "%~dp0." -q
) else (
  echo Virtual environment not found at %VENV%. Installing with active python...
  pip install -r "%~dp0requirements.txt" -q
  pip install -e "%~dp0." -q
)

echo [2/2] Done!
echo.
echo ========================================================
echo   ✅ Jupsoft CMS MCP setup completed!
echo.
echo   To test the MCP server directly (STDIO mode):
echo     python -m jupsoft_cms.server
echo ========================================================
pause
