@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "ROOT=%CD%"
set "BACKEND=%ROOT%\backend\jal_saheli"
set "VENV=%BACKEND%\.venv"
set "VENV_PY=%VENV%\Scripts\python.exe"

echo ========================================
echo   GeoWise - Starting Backend + Frontend
echo ========================================
echo.

if not exist "%BACKEND%\app\main.py" (
    echo ERROR: Backend not found at:
    echo   %BACKEND%
    echo Make sure you run run.bat from the GeoWise repository root.
    exit /b 1
)

REM --- Backend setup ---
where python >nul 2>&1
if errorlevel 1 (
    where py >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Python not found. Install Python 3.11+ and try again.
        exit /b 1
    )
    set "PYTHON=py -3"
) else (
    set "PYTHON=python"
)

if not exist "%VENV_PY%" (
    echo Creating Python virtual environment...
    %PYTHON% -m venv "%VENV%"
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        exit /b 1
    )
)

echo Installing backend dependencies...
"%VENV_PY%" -m pip install -q -r "%BACKEND%\requirements-dev.txt"
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies.
    exit /b 1
)

if not exist "%BACKEND%\.env" (
    echo Creating backend .env from .env.example...
    copy /Y "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
)

echo Starting backend on http://localhost:8000 ...
start "GeoWise Backend" /D "%BACKEND%" cmd /k start_dev.bat

REM --- Frontend setup ---
if not exist "%ROOT%\node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies.
        exit /b 1
    )
)

echo Starting frontend on http://localhost:5173 ...
start "GeoWise Frontend" /D "%ROOT%" cmd /k npm run dev

echo.
echo Backend:  http://localhost:8000/api/health
echo Frontend: http://localhost:5173
echo.
echo Close the "GeoWise Backend" and "GeoWise Frontend" windows to stop the servers.
echo.
endlocal
