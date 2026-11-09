@echo off
setlocal
cd /d "%~dp0"
set "PATHPILOT_OPEN_BROWSER=1"

python server.py

if errorlevel 1 (
    echo PathPilot could not start. Check the message above.
    pause
)
