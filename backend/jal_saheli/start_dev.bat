@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "VENV_PY=%CD%\.venv\Scripts\python.exe"

if not exist "app\main.py" (
    echo ERROR: Run this from backend\jal_saheli
    exit /b 1
)

if not exist "%VENV_PY%" (
    echo ERROR: Virtual environment missing. Run run.bat from the repo root first.
    exit /b 1
)

if not defined DATABASE_URL (
    set "DATABASE_URL=sqlite+aiosqlite:///./geowise_dev.db"
)

echo Working directory: %CD%
echo Starting uvicorn app.main:app on http://0.0.0.0:8000 ...
"%VENV_PY%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
endlocal
