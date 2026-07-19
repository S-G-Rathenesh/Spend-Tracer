@echo off
echo Starting SpendGuard...

:: Bypass Windows MAX_PATH limit by mounting a virtual drive
subst Z: "%~dp0" >nul 2>&1
Z:

:: Start the Metro bundler in a new command window
start "Metro Bundler" cmd /c "npm start -- --reset-cache"

:: Wait a few seconds to let Metro start before running android
timeout /t 5 /nobreak >nul

:: Run the Android build
echo Starting Android app...
npm run android
