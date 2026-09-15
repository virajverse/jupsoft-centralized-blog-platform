@echo off
setlocal
title Jupsoft CMS MCP - Setup
echo ========================================================
echo   🚀 Jupsoft CMS MCP Server - Setup
echo   Super Admin Control Suite for AI Agents
echo ========================================================

set VENV=d:\Company work\.venv
set PYTHONPATH=d:\Company work\jupsoft-centralized-blog-platform\jupsoft-cms-mcp\src

echo [1/2] Installing dependencies into shared .venv...
call "%VENV%\Scripts\activate.bat"
pip install -r "%~dp0requirements.txt" -q
pip install -e "%~dp0." -q

echo [2/2] Done!
echo.
echo ========================================================
echo   ✅ Jupsoft CMS MCP installed successfully!
echo.
echo   To test the MCP server directly (STDIO mode):
echo     "%VENV%\Scripts\python.exe" -m jupsoft_cms.server
echo.
echo   The mcp_config.json is pre-configured for Antigravity IDE.
echo   Add it in IDE Settings → MCP Servers → Import Config
echo ========================================================
pause
