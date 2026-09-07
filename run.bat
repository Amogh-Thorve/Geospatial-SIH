@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend\jal_saheli"
set "VENV=%BACKEND%\.venv"

echo ========================================
echo   GeoWise - Starting Backend + Frontend
echo ========================================
echo.

REM --- Backend setup ---
where python >nul 2>&1
if errorlevel 1 (
    where py >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Python not found. Install Python 3.11+ and try again.
        exit /b 1
    )
    set "PYTHON=py"
) else (
    set "PYTHON=python"
)

if not exist "%VENV%\Scripts\activate.bat" (
    echo Creating Python virtual environment...
    %PYTHON% -m venv "%VENV%"
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        exit /b 1
    )
)

call "%VENV%\Scripts\activate.bat"
echo Installing backend dependencies...
pip install -q -r "%BACKEND%\requirements-dev.txt"
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies.
    exit /b 1
)

if not exist "%BACKEND%\.env" (
    echo Creating backend .env from .env.example...
    copy /Y "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
)

echo Starting backend on http://localhost:8000 ...
start "GeoWise Backend" cmd /k ""cd /d "%BACKEND%" && call "%VENV%\Scripts\activate.bat" && set DATABASE_URL=sqlite+aiosqlite:///./geowise_dev.db && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000""

REM --- Frontend setup ---
if not exist "%ROOT%node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies.
        exit /b 1
    )
)

echo Starting frontend on http://localhost:5173 ...
start "GeoWise Frontend" cmd /k ""cd /d "%ROOT%" && npm run dev""

echo.
echo Backend:  http://localhost:8000/api/health
echo Frontend: http://localhost:5173
echo.
echo Close the "GeoWise Backend" and "GeoWise Frontend" windows to stop the servers.
echo.
endlocal
