@echo off
cd /d "%~dp0"
echo Forest preview: http://127.0.0.1:5178/
call npm.cmd run dev
pause
