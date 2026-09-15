@echo off
title Jupsoft - 3 Client Testing Websites (Ports 5001, 5002, 5003)
echo ================================================================
echo  Starting 3 HTML/CSS/JS Client Websites for Jupsoft Blog CMS
echo ================================================================
echo  - Site 1: Jupsoft Cloud ERP (http://localhost:5001)
echo  - Site 2: DigifyNext Growth (http://localhost:5002)
echo  - Site 3: School ERP Platform (http://localhost:5003)
echo ================================================================
cd /d "%~dp0"
node test-sites/server.js
pause
